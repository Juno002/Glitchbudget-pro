# Fase 19.5.1 — Auditoría forense completa

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.5.

Plan de ejecución: [phase-19-5.md](phase-19-5.md).

Estado: **completado**.

## Alcance auditado

Se revisaron las cuatro superficies exigidas por el roadmap:

```text
src/components/**
src/hooks/**
src/contexts/**
src/app/**
```

El barrido cubrió **120 archivos TypeScript/TSX** de esas superficies:

- 85 archivos de aplicación/componentes/hooks/contextos fuera de primitives;
- 35 primitives de `src/components/ui/**`.

Los primitives de `components/ui` no contienen imports ni candidatos de semántica financiera/persistencia.

La auditoría buscó específicamente:

- imports/accesos a Dexie y `useLiveQuery`;
- sumas/reducciones de importes;
- `limit - spent`, `target - saved`, porcentajes y promedios;
- decisiones basadas en saldo/deuda/presupuesto/meta/inversión;
- construcción de vistas compuestas desde varias entidades;
- mutaciones y validaciones financieras;
- lógica que parezca meramente visual pero determine significado financiero.

## Resultado

La Fase 19 cerró correctamente la deuda **conocida** que prometía cerrar, pero 19.5.1 confirma residuos indirectos que impiden todavía afirmar el Prisma Engine Gate.

No se encontró acceso Dexie directo dentro de `src/components/**` ni `src/app/**`.

Sí se encontró persistencia financiera escondida en hooks React y varias fórmulas/read models residuales en componentes/contexto.

## Hallazgos P0 — frontera arquitectónica

### A. Dexie financiero dentro de hooks React

Archivos:

```text
src/hooks/use-finance-context-data.ts
src/hooks/use-finance-queries.ts
src/hooks/use-categories.ts
```

Los tres importan `@/lib/db` / `dexie-react-hooks` y leen tablas financieras directamente.

Esto era válido para el objetivo limitado de 19.1/19.2 —sacar Dexie de componentes y del contexto—, pero **no satisface 19.5.2**, que prohíbe utilizar hooks/contextos como vía alternativa para esconder persistencia financiera.

Destino previsto: 19.5.2, moviendo queries/repositories fuera de React y conservando hooks mínimos como adaptadores de suscripción.

### B. `finance-context.tsx` todavía contiene lógica financiera

Residuos confirmados:

- `getMonthlyAverages()` agrega ingresos/gastos por períodos y calcula promedios;
- `getDisposable()` coordina ese cálculo antes de llamar `computeDisposable`;
- `getExpensesByType()` filtra gastos realizados, agrupa por naturaleza y calcula total/count/avg;
- parte de la construcción de vistas de metas sigue ocurriendo desde el contexto.

El contexto ya no toca Dexie directamente, pero aún no es solo fachada/composición.

Destino previsto: 19.5.3–19.5.4.

## Hallazgos P1 — cálculos/read models en UI

### `budget-status.tsx`

La UI vuelve a derivar:

```text
totalLimit = sum(limit)
totalSpent = sum(spent)
totalRemaining = totalLimit - totalSpent
remaining = budget.limit - budget.spent
```

Estas métricas tienen semántica financiera de presupuesto y deben venir resueltas desde dominio/read model.

### `goals-manager.tsx`

La UI vuelve a decidir/derivar:

- transición de meta a completada para disparar confetti mediante `saved + contribution >= target`;
- importe sugerido con `target - saved`;
- restante con `target - saved`;
- reconstrucción de progreso legacy sumando `goal_contributions`.

Parte del componente ya usa `goalMetrics`, por lo que estas duplicaciones deben converger al mismo selector/read model o al resultado del command.

### `debts-tab.tsx`

El saldo firmado y el límite disponible ya vienen de selectors, pero la UI calcula:

```text
percentUsed = currentDebt / principal * 100
```

La utilización de crédito es una métrica financiera; UI solo debería clamplear/renderizar un porcentaje ya resuelto.

### `transfer-dialog.tsx`

La pantalla decide qué presupuestos tienen fondos mediante:

```text
getBudgetStatusDetails(...).filter(b => b.remaining > 0)
```

Eso determina elegibilidad financiera de una fuente de transferencia desde el componente. Debe trasladarse a un query/read model o command adecuado.

### `accounts-overview.tsx`

Aunque posición/saldos usan selectors, la pantalla reconstruye la clasificación de “movimientos anteriores sin cuenta” combinando ingresos, gastos y pagos de deuda con reglas distintas.

Debe ser un read model reutilizable, no una relación ensamblada por la vista.

## Hallazgos P2 — lógica de aplicación acoplada a React

### `use-achievements.ts`

El hook decide logros desde métricas financieras:

- suma de ahorro total;
- presupuestos configurados;
- estados de presupuesto;
- condición “≤ 10% restante”;
- conteo de aportes reales a metas.

No altera contabilidad, pero las reglas de achievements son lógica de aplicación y hoy requieren React. Conviene mover el evaluador a una función pura y dejar el hook como coordinador.

### `planning-tab.tsx`

Clasifica categorías activas/inactivas usando `configured || spent > 0`.

Es principalmente una decisión de presentación y **no es un blocker financiero por sí sola**, pero se revisará junto al read model de Plan para evitar que la pantalla siga componiendo relaciones innecesariamente.

## Casos revisados y aceptados como presentación

No deben extraerse por reflejo:

- `monthly-result-chart.tsx`: `reduce()` usado para geometría/composición de gráfico;
- `investments-manager.tsx`: `annualRate * 100` únicamente para mostrar porcentaje;
- `reports-tab.tsx` y `summary-tab.tsx`: elección de tone/color/label desde métricas ya resueltas;
- `ProgressMetric`: representación visual de valores recibidos;
- `TransactionModal`: gating de campos/estado de formulario; la validez financiera canónica continúa perteneciendo a commands/domain;
- `debts-tab.tsx`: `Math.min/Math.max` para ancho visual será permitido cuando el porcentaje venga del dominio.

## Mapa de extracción

| Prioridad | Residuo | Siguiente checkpoint |
|---|---|---|
| P0 | Dexie en `use-finance-context-data` | 19.5.2 |
| P0 | Dexie en `use-finance-queries` | 19.5.2 |
| P0 | Dexie en `use-categories` | 19.5.2 |
| P0 | Promedios/agrupación en `finance-context` | 19.5.3/19.5.4 |
| P1 | Métricas agregadas en `budget-status` | 19.5.3 |
| P1 | Derivaciones de metas en `goals-manager` | 19.5.3 |
| P1 | Utilización de deuda en `debts-tab` | 19.5.3 |
| P1 | Elegibilidad de presupuesto en `transfer-dialog` | 19.5.3 |
| P1 | “unassigned movements” en `accounts-overview` | 19.5.3 |
| P2 | Evaluador financiero de achievements dentro de hook | 19.5.3/19.5.4 |

## Persistencia / schema

Sin cambios.

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

19.5.1 no modifica datos, migraciones ni formato de backup.

## Invariantes afectadas

Ninguna modificación funcional en esta iteración.

La auditoría detecta duplicaciones/acoplamientos; no cambia sus resultados.

## Tests

No se añade un test que “congele” residuos conocidos, porque eso convertiría violaciones temporales en contrato.

Los guards existentes de Fase 19 siguen siendo válidos, pero 19.5.2/19.5.4 deberán endurecerlos para incluir `src/hooks` y `src/contexts` sin bloquear persistencia visual no financiera documentada.

## Limitaciones conocidas

19.5.1 es deliberadamente read-only respecto a producción. Los hallazgos P0/P1 permanecen abiertos hasta los checkpoints siguientes.

Por tanto, todavía **no** se puede afirmar:

```text
React ≠ requisito de persistencia financiera
UI ≠ todos los cálculos financieros
```

y el Prisma Engine Gate permanece abierto.

## Decisión de cierre

19.5.1 queda cerrada porque el mapa residual está identificado, clasificado y versionado.

La siguiente ejecución es **19.5.2 — Persistencia fuera de React**. No iniciar automáticamente sin autorización del usuario.
