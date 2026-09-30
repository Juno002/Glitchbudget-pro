# Fase 20.5 — Plan Prisma

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 20.

Estado: **completada / Gate 20.5 aprobado**.

Referencia visual: `Juno002/Prisma@dc4310040f42cefd74cf41bad75152902e549c24`.

## Objetivo

Migrar visualmente Plan al lenguaje Prisma sin reconstruir semántica financiera o de planificación dentro de React.

```text
Plan Prisma
  ├─ Presupuestos → selectors/read models existentes
  ├─ Metas → goal read models existentes
  └─ Planificados → planned-payment read model existente
```

No se importó lógica financiera, persistencia ni datos demo desde el repositorio Prisma.

## Navegación

Plan conserva exactamente tres conceptos:

- Presupuestos;
- Metas;
- Planificados.

No se creó una pestaña principal nueva para recurrencias, suscripciones, aportes o períodos.

## Presupuestos

Migrado visualmente:

- resumen mensual;
- tipos de período semanal / mensual / anual / único;
- navegación entre períodos;
- rangos guardados;
- creación de presupuesto;
- edición de límite;
- reasignación entre categorías;
- progreso, remaining y status;
- categorías sin presupuesto.

La UI continúa consumiendo:

- `getBudgetStatusDetails(...)`;
- `selectBudgetCategoryGroups(...)`;
- `useBudgetPeriod()`;
- `budgetPeriodContaining`;
- `savedBudgetRanges`;
- `previousBudgetPeriod`;
- `nextBudgetPeriod`.

Las mutaciones continúan usando:

- `updateAllBudgets`;
- `prepareBudgetPeriod`;
- `transferBetweenBudgets`.

La barra de progreso transforma el porcentaje derivado en representación visual; no recalcula la semántica financiera.

## Metas

Migrado visualmente:

- listado de metas;
- progreso;
- fecha límite;
- remaining;
- aporte requerido;
- aporte planificado;
- aporte manual;
- creación;
- edición;
- eliminación;
- estado completada / plazo vencido / en progreso.

La UI consume:

- `goalManagerReadModel`;
- `goalDraftFundingSchedule`;
- `goalWouldComplete`.

Las mutaciones existentes permanecen:

- `addGoal`;
- `updateGoal`;
- `deleteGoal`;
- `contributeToGoal`.

Los aportes continúan siendo reservas de planificación y no movimientos de efectivo.

## Planificados

Migrado visualmente:

- ocurrencias pendientes;
- grupos Vencidos / Hoy / Mañana / Próximos 7 días / Después;
- estados pending / confirmed / skipped / overdue;
- confirmar;
- omitir;
- actividad reciente resuelta;
- navegación al movimiento confirmado;
- reglas recurrentes;
- alta de regla;
- pausa / reactivación;
- weekly / biweekly / monthly;
- cuenta predeterminada;
- override de cuenta al confirmar.

La UI consume exclusivamente:

- `selectPlannedPaymentsManagerReadModel`;
- `PlannedOccurrenceDisplayStatus`;
- estado persistido de cada occurrence ya producido por el motor.

Las mutaciones permanecen:

- `addRecurringRule`;
- `updateRecurringRule`;
- `confirmPlannedOccurrenceItem`;
- `skipPlannedOccurrenceItem`.

Solo confirmar una ocurrencia crea un ingreso o gasto real.

## Arquitectura

No se añadió:

- Dexie directo en Plan;
- acceso IndexedDB nuevo en UI;
- cálculo nuevo de remaining;
- cálculo nuevo de status;
- cálculo nuevo de required contribution;
- cálculo nuevo de overdue;
- motor de recurrencias en componentes;
- runtime remoto;
- tráfico financiero de red;
- datos financieros hardcoded de Prisma.

## Browser E2E

El smoke E2E valida en Chrome/Chromium real:

1. shell desktop/móvil;
2. Home Prisma;
3. compositor y Movimientos Prisma;
4. creación real de ingreso/gasto;
5. entrada a Plan;
6. shell Plan Prisma;
7. Presupuestos Prisma + controles de período;
8. Metas Prisma;
9. Planificados Prisma;
10. service worker;
11. recarga offline;
12. fallo ante requests HTTP(S) externos.

El harness activa los tabs Radix mediante semántica `role="tab"`, evitando depender de un click DOM genérico.

## Gate 20.5

```text
489/489 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36661934533 ✅
```

E2E:

```text
responsive shell
+ Prisma Home
+ Prisma Movimientos/composer
+ Prisma Plan
+ movement mutation
+ navigation
+ offline reload
✅
```

## Persistencia

Sin cambios:

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

No hubo migración de schema ni cambio de formato de backup.

## Riesgos / límites

- Reportes conserva su capa visual anterior hasta 20.6.
- Inversiones y el barrido final de superficies secundarias permanecen para 20.7.
- El branding visible sigue siendo GlitchBudget Pro hasta 20.7.
- `serious` sigue intacto como tema legado.

Siguiente etapa autorizada tras merge y gate verde: **20.6 — Reportes + sistema de gráficos**.
