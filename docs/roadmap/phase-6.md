# Fase 6 — Period Engine

Fecha: 2026-09-26. Alcance: exclusivamente Fase 6 sobre `phase-6-period-engine`. Base: cierre de Fase 5 mergeado en `ca86a99`. `main` no se modifica durante esta fase y seguirá congelado hasta completar Fase 7.

## Resultado

La aplicación deja de depender del mes calendario como fuente de verdad para las métricas, presupuestos y comparaciones nuevas. El período financiero se resuelve desde fechas reales mediante un motor puro.

La configuración nueva es:

```ts
periodStartDay?: number // 1..31; ausencia = 1
```

Día 1 mantiene meses calendario. Un inicio en día 25 interpreta el período `2026-09` como:

```text
2026-08-25 .. 2026-09-24
```

El identificador `YYYY-MM` sigue existiendo como ID estable del período y conserva compatibilidad con los presupuestos persistidos.

## Motor puro

Nuevo `src/domain/periods.ts`:

- `DateRange { start, end }`
- `PeriodRange { id, start, end }`
- `normalizePeriodStartDay`
- `periodForId`
- `periodContaining`
- `previousComparablePeriod`
- `nextPeriod`
- `contains`
- `shiftPeriodId`

No lee reloj, React, Dexie, navegador ni red. El calendario gregoriano y el ajuste de días 29–31 se calculan sin `Date` dentro del dominio.

Los días que no existen en un mes se ajustan al último día válido. Ejemplo con día 31: febrero puede iniciar el período el 28/29 y el siguiente rango continúa sin huecos ni solapamientos.

## Métricas

`src/domain/metrics.ts` incorpora selectores por rango:

- `recordedExpenseForPeriod`
- `recordedCategoriesForPeriod`
- `selectPeriodMetrics`
- `selectCategorySpendingForPeriod`

Los wrappers mensuales anteriores se conservan como compatibilidad de mes calendario, pero los consumidores migrados de esta fase usan rangos.

`Income.month` y `Expense.month` continúan persistidos para compatibilidad; no son la fuente de verdad de los cálculos por período. Una fecha real dentro del rango cuenta aunque el campo `month` histórico sea incorrecto.

## Presupuestos y política de exceso

`Plan.month` conserva el nombre físico por compatibilidad, pero se interpreta como ID del período.

La validación de exceso:

1. resuelve el período que contiene la fecha del gasto;
2. busca el presupuesto por `[period.id + categoryId]`;
3. calcula el gasto de la categoría dentro de `period.start..period.end`;
4. aplica `allow | warn | block`.

La huella de confirmación incluye ID, inicio y fin del período para que una confirmación anterior no pueda reutilizarse con otro rango.

## Rollover

`rollBudgetsIntoMonth` mantiene el nombre de API por compatibilidad, pero opera por períodos financieros.

El período anterior se obtiene con `previousComparablePeriod`. El gasto que determina sobrante/déficit se filtra por fecha real dentro del rango anterior.

Prueba de integración: con inicio 25, el rollover a `2026-10` usa `2026-08-25..2026-09-24`; un gasto del 25 de septiembre pertenece al período siguiente y no reduce el rollover anterior.

## Contexto y UI mínima

FinanceContext expone:

```ts
periodStartDay
currentPeriod
setPeriodStartDay(day)
```

y sus funciones activas de totales, categorías, gasto por tipo, estado de presupuestos, promedios y transferencias entre presupuestos resuelven el período mediante el motor.

El encabezado permite elegir un día 1..31 y muestra el rango real. “Este mes” pasa a “Período actual”. Reportes compara períodos equivalentes mediante `previousComparablePeriod`, no aritmética manual de meses.

Resumen, Planificación, estado de presupuesto, transferencias y gráfico de resultado usan vocabulario de período cuando corresponde. No se realizó el rediseño de Fase 7.5.

El logro histórico de tres períodos también usa `previousComparablePeriod`; su UX/copy antiguo se conserva para 7.5.

## Backups

JSON permanece en v6: no hubo cambio estructural de tablas ni necesidad de incrementar Dexie.

- si `periodStartDay` está configurado, se exporta y restaura;
- valores fuera de 1..31 se rechazan antes de reemplazar datos;
- backups v6/legacy donde el campo no existe permanecen válidos y no se modifican artificialmente durante un round-trip;
- en ejecución, ausencia del campo equivale a día 1.

No se modifican los stores ni índices; Dexie continúa en v10.

## Modelos persistidos

Se mantienen deliberadamente por compatibilidad:

- `Period`: marcador persistido legacy; no define los rangos financieros.
- `Income.month` / `Expense.month`: campos legacy/compatibilidad.
- `Plan.month`: nombre físico conservado, semánticamente ID de período.

No se ejecutó una migración destructiva ni se reescribió historial.

## Pruebas

La suite cubre:

- día 1 = mes calendario;
- gate día 25: 25 del mes anterior → 24 del mes seleccionado;
- límites inclusivos;
- período anterior y siguiente;
- febrero, leap years y días 29–31;
- fechas inválidas;
- métricas basadas en fecha y no en `month`;
- categorías y gasto por período;
- política de presupuesto para rango personalizado;
- integración de `saveExpense` con presupuesto 25→24;
- rollover 25→24;
- round-trip del día inicial;
- rechazo atómico de día inicial inválido;
- compatibilidad de backups sin el nuevo campo;
- todas las invariantes financieras, categorías, actual/planned, migraciones y local-only de fases anteriores.

## Gate técnico

GitHub Actions sobre `241b10e`:

- `npm run check`: aprobado;
- **142 pruebas aprobadas, 0 fallidas**;
- TypeScript: aprobado;
- ESLint: aprobado con máximo 0 warnings;
- guard local-only: aprobado;
- `npm run build`: aprobado;
- exportación estática y verificación offline: aprobadas;
- manifiesto offline: 42 recursos.

Los avisos deprecados de dependencias/Actions del runner no provienen de errores del código de la fase y no afectan el gate.

No se realizó un smoke test manual de navegador desconectado desde este entorno. El service worker/local-only y la exportación estática continúan cubiertos automáticamente; la prueba física final permanece como gate de release.

## Límites y siguientes fases

No se implementó:

- `PlannedOccurrence`;
- scheduler semanal/quincenal;
- confirmación pending/confirmed/skipped;
- Budgets 2.0;
- Goals 2.0;
- rediseño UX 7.5.

El motor de períodos queda listo para que Fase 7 genere ocurrencias y agrupe planificación sin volver a asumir meses calendario.

Fase 6 cerrada en la rama dedicada. Fase 7 no iniciada.
