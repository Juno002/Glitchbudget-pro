# Fase 19.5.3 — Cálculos financieros + read models reutilizables

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.5.

Plan de ejecución: [phase-19-5.md](phase-19-5.md).

Estado: **completado**.

## Objetivo

Cerrar los residuos P1/P2 detectados en 19.5.1:

```text
UI / React
≠ fórmulas financieras
≠ reconstrucción de read models
≠ evaluación de reglas de aplicación basada en métricas financieras
```

19.5.3 no cambia comportamiento financiero ni añade features. Extrae significado financiero hacia selectores puros reutilizables.

## Read models / selectores añadidos

### Presupuestos — `src/domain/budgets.ts`

Se centralizan:

- detalle de presupuesto para un rango;
- total limit / spent / remaining del resumen;
- límites no mensuales activos;
- categorías activas/inactivas de Plan;
- presupuestos con fondos disponibles para reasignación.

La UI deja de calcular:

```text
sum(limit)
sum(spent)
limit - spent
configured || spent > 0
remaining > 0
```

como reglas propias.

### Metas — `src/domain/goals.ts`

Se centralizan:

- remaining;
- progreso legacy;
- aporte sugerido;
- schedule de un draft;
- detección de si un aporte completa la meta.

`GoalsManager` conserva únicamente formulario, representación y feedback visual.

### Cuentas / deuda — `src/domain/ledger.ts`

Se añaden read models para:

- saldo firmado de tarjeta;
- deuda vs saldo a favor;
- disponible de crédito;
- utilización del límite;
- posición para Accounts Overview;
- clasificación de movimientos históricos sin cuenta.

La UI sigue decidiendo color/label/ancho visual, pero no la cifra financiera.

### Métricas — `src/domain/metrics.ts`

Se centralizan:

- promedios por períodos financieros;
- disposable después del safety percentage;
- agrupación de gasto por naturaleza.

`src/lib/goal-calculator.ts` mantiene su API histórica pero delega la fórmula canonical de disposable al dominio.

### Achievements — `src/domain/achievements.ts`

Las condiciones de desbloqueo pasan a un evaluador puro independiente de React.

`useAchievements` queda como coordinador de:

- hidratación de estado local;
- persistencia de achievements;
- ejecución del evaluador;
- actualización de UI.

No vuelve a sumar ahorro ni interpretar presupuestos dentro del hook.

## React actualizado

Las siguientes superficies consumen selectores/read models:

```text
src/components/dashboard/budget-status.tsx
src/components/dashboard/goals-manager.tsx
src/components/dashboard/debts-tab.tsx
src/components/dashboard/transfer-dialog.tsx
src/components/dashboard/accounts-overview.tsx
src/components/dashboard/planning-tab.tsx
src/contexts/finance-context.tsx
src/hooks/use-achievements.ts
```

`finance-context` conserva su API pública, pero:

- `getMonthlyAverages` delega a `selectPeriodAverages`;
- `getDisposable` delega a `selectDisposable`;
- `getBudgetStatusDetails` delega a `selectBudgetStatusDetails`;
- `getExpensesByType` delega a `selectExpensesByNature`.

Esto evita romper consumidores durante la transición a 19.5.4.

## Files changed

```text
src/components/dashboard/accounts-overview.tsx
src/components/dashboard/budget-status.tsx
src/components/dashboard/debts-tab.tsx
src/components/dashboard/goals-manager.tsx
src/components/dashboard/planning-tab.tsx
src/components/dashboard/transfer-dialog.tsx
src/contexts/finance-context.tsx
src/domain/achievements.ts
src/domain/budgets.ts
src/domain/goals.ts
src/domain/ledger.ts
src/domain/metrics.ts
src/hooks/use-achievements.ts
src/lib/goal-calculator.ts
tests/phase-19-5-3-read-models.test.ts
docs/roadmap/phase-19-5-3.md
docs/roadmap/phase-19-5.md
docs/roadmap/README.md
```

## Schema changes

Ninguno.

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

## Migration behavior

No existe migración nueva.

No se modifica, resetea ni reinterpreta información persistida.

## Invariantes afectadas

No cambia ninguna invariante financiera.

Los nuevos selectores reproducen las mismas reglas que antes estaban repartidas en React.

## Tests added

`tests/phase-19-5-3-read-models.test.ts` caracteriza:

- totales/restante/estado de presupuestos;
- categorías activas/inactivas y fondos reasignables;
- remaining / legacy / suggested contribution de metas;
- completitud de metas;
- deuda, available limit y utilization;
- movimientos sin cuenta;
- promedios por período y disposable;
- agrupación por naturaleza;
- thresholds de achievements;
- ausencia de las fórmulas residuales identificadas en las superficies React auditadas.

## Gate técnico

El run de código `36604789623` dejó verdes:

```text
npm run check ✅
npm run build ✅
```

El primer intento detectó un import de compatibilidad comentado accidentalmente en `goal-calculator.ts`; se corrigió antes del cierre. No se relajó ningún test.

## Known limitations

19.5.3 elimina los residuos financieros/read-model identificados, pero **19.5 todavía no está cerrada**.

19.5.4 debe:

- revisar de nuevo `finance-context.tsx` como fachada;
- decidir qué coordinación de aplicación todavía debe salir del context;
- endurecer checks automáticos para dominio React-free y fronteras de capas;
- ejecutar una búsqueda sistemática de regresiones arquitectónicas.

19.5.5 realizará el barrido final y el ejercicio de trazabilidad obligatorio del Prisma Engine Gate.

## Resultado

Después de 19.5.3:

```text
UI → representa valores resueltos
React hooks/context → coordinan interacción
Domain selectors/read models → determinan significado financiero
Queries/services → persistencia y commands
```

La siguiente ejecución es **19.5.4 — finance-context + hardening**. No iniciar automáticamente sin autorización del usuario.
