# Fase 14 — Home 2.0

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 14.

Estado: **completada técnicamente**.

## Objetivo

Home deja de ser otra superficie con fórmulas propias y pasa a ser un **read model** construido sobre los selectors ya estabilizados en Reports 2.0, Budgets 2.0, Goals 2.0, Planned Occurrences e Investments 1.0.

Debe responder rápido:

```text
¿Cuánto tengo?
¿Cuánto debo?
¿Cuánto puedo gastar?
¿Qué viene próximamente?
¿Hay algo que requiera atención?
```

## Read model

El contrato vive en:

```text
src/domain/home.ts
```

Selector:

```ts
selectHomeReadModel()
```

Home no vuelve a calcular:

- patrimonio;
- liquidez;
- deuda;
- progreso de presupuestos;
- progreso de metas;
- fechas de ocurrencias;
- rendimiento de inversiones.

En cambio compone salidas de:

- `selectReportsSnapshot`;
- `getBudgetStatusDetails`;
- `groupUpcomingOccurrences`;
- `goalFundingSchedule`;
- `investmentProjection`.

### Posición

La posición financiera llega desde el mismo selector compartido con Reportes:

```text
getReportSnapshot(currentPeriod, today)
```

Home presenta:

- Disponible líquido;
- Inversiones registradas;
- Deuda real de tarjetas;
- Patrimonio neto.

No existe una segunda fórmula de patrimonio en `SummaryTab`.

## Cinco módulos máximos

Home 2.0 utiliza exactamente estos cinco módulos:

```text
position
budget
upcoming
goals
investments
```

Jerarquía visible por defecto:

1. Posición financiera
2. Presupuesto disponible
3. Próximos pagos
4. Metas relevantes
5. Inversiones

Se retiraron del Home principal:

- Movimientos recientes;
- Preferencia de ahorro sugerido.

El historial real sigue en **Movimientos**. La preferencia de ahorro se movió a **Ajustes → Finanzas**.

## Atención

El read model expone un contador compacto de elementos que requieren atención.

Cuenta únicamente señales ya derivadas por contratos existentes:

- ocurrencias vencidas;
- presupuestos excedidos;
- metas activas con fecha vencida;
- inversiones activas cuya fecha de vencimiento ya llegó.

No introduce un nuevo sistema de alertas persistente.

## Personalización local

Contrato:

```text
src/lib/home-preferences.ts
src/hooks/use-home-preferences.ts
```

Clave local:

```text
glitchbudget_home_preferences_v1
```

Permite:

- show/hide;
- reorder;
- default opening section;
- restablecer valores por defecto.

Las preferencias:

- viven solo en `localStorage`;
- no entran en Dexie;
- no entran en JSON backup;
- nunca alteran fórmulas ni datos financieros;
- se normalizan si el contenido local está incompleto o corrupto;
- nunca permiten ocultar todos los módulos a la vez.

Al elegir una sección inicial, Home enfoca ese módulo al abrirse. Si el módulo se oculta, la preferencia se corrige automáticamente a una sección visible.

La acción “Borrar todos los datos” elimina también esta preferencia local y devuelve Home a su configuración inicial.

## Módulos

### Position

Responde “¿Cuánto tengo?” y “¿Cuánto debo?”.

Incluye:

- disponible líquido;
- inversiones registradas;
- deuda;
- patrimonio neto.

### Budget

Responde “¿Cuánto puedo gastar?”.

Resume los presupuestos mensuales configurados del período actual usando sus estados canónicos:

- límite;
- gastado;
- restante;
- estado;
- cantidad excedida / cerca del límite.

La edición sigue en Plan → Presupuestos.

### Upcoming

Responde “¿Qué viene próximamente?”.

Muestra hasta tres ocurrencias pendientes ordenadas por prioridad:

```text
overdue → today → tomorrow → next 7 days
```

Confirmar y omitir siguen usando los servicios existentes de Planned Occurrences.

### Goals

Muestra hasta dos metas activas priorizadas por fecha límite.

Usa el progreso derivado de aportes y el aporte mensual requerido del Period Engine.

### Investments

Muestra:

- valor registrado real total;
- cantidad de inversiones activas;
- próximos vencimientos;
- días restantes / vencimiento alcanzado.

Las proyecciones futuras no se suman al patrimonio.

## Persistencia

Fase 14 no cambia:

```text
Dexie v14
JSON v10
```

No añade tablas, migraciones ni campos financieros.

Solo añade una preferencia visual local fuera del backup.

## Invariantes

1. Home consume el selector financiero compartido con Reports.
2. `SummaryTab` no importa `selectPosition` ni crea otra fórmula de Net Worth.
3. Existen como máximo cinco módulos principales.
4. Ocultar/reordenar módulos no cambia cálculos.
5. El historial real no vuelve a Home.
6. La preferencia de ahorro sigue disponible, pero fuera del Home.
7. Las inversiones estimadas no entran en patrimonio.
8. Home no se convierte en una superficie de análisis histórico.
9. No se añaden primitivas de red.
10. Persistencia financiera permanece en Dexie v14 / JSON v10.

## Pruebas específicas

`tests/phase-14-home.test.ts` cubre:

- composición del read model;
- posición, presupuesto, próximos, metas e inversiones;
- contador de atención;
- reparación de preferencias locales inválidas;
- imposibilidad de ocultar todos los módulos;
- reordenamiento con módulos visibles/ocultos;
- cinco módulos exactos;
- ausencia de Movimientos recientes;
- ausencia de la preferencia de ahorro en Home;
- consumo del selector compartido de Reports;
- ausencia de imports directos de fórmulas del ledger;
- traslado de ahorro sugerido a Ajustes;
- limpieza de preferencias en reset total.

La regresión histórica de Fase 7.5 fue actualizada para reconocer que Fase 14 sustituye el antiguo bloque de Movimientos recientes por Inversiones y permite reordenamiento local.

## Gate técnico

GitHub Actions `Quality checks` run `36468191021` verificó:

- **292/292 pruebas**, 0 fallos;
- typecheck: aprobado;
- lint con cero warnings: aprobado;
- guard local-only: aprobado;
- build de producción: aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Fuera de alcance

No pertenecen a Fase 14:

- nuevas fórmulas financieras;
- analytics históricos nuevos;
- metadata de transacciones;
- labels;
- Must / Need / Want;
- nuevos filtros de movimientos.

Esos puntos comienzan en **Fase 15 — Transaction Metadata + filtros**.

**Fase 15 no se inicia automáticamente.**
