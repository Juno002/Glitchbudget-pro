# Fase 19.5 — Residual architecture cleanup / Prisma Engine Gate

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.5.

Estado: **completado**.

## Objetivo

Dejar el núcleo financiero de GlitchBudget reutilizable desde una interfaz distinta sin copiar reglas, fórmulas ni acceso a Dexie desde React.

No se añaden features.

## 19.5.1 — Auditoría completa de la capa visual

Se auditó el alcance obligatorio:

```text
src/components/**
src/hooks/**
src/contexts/**
src/app/**
```

Hallazgos reales:

- las queries Dexie habían quedado escondidas en `use-finance-context-data`, `use-finance-queries` y `use-categories`;
- `finance-context.tsx` todavía construía promedios, reportes, estados de presupuesto y agrupaciones;
- `AccountsOverview` reconstruía saldos/entries/posición;
- `GoalsManager` calculaba remaining, completion, legacy balance y scheduling;
- `BudgetStatus` reconstruía totales y remaining;
- `DebtsTab` calculaba utilización y disponible de tarjeta;
- `InvestmentsManager` combinaba inversión + cuenta + valor/proyección;
- `useAchievements` contenía reglas financieras de elegibilidad;
- `TransferDialog` decidía qué presupuestos tenían fondos;
- `TransactionModal` convertía directamente transferencias a centavos;
- `TransactionModal` importaba un selector puro desde `lib/accounts.ts`, módulo que también contiene persistencia.

No se encontró una decisión estructural previa que deba revertirse.

## 19.5.2 — Cero acceso financiero directo a Dexie desde React

Se creó:

```text
src/repositories/finance-repository.ts
src/adapters/dexie-live-query.ts
```

Las lecturas financieras persistentes están ahora en repository functions independientes de React.

Los hooks React consumen esas queries mediante el adaptador reactivo; ya no importan `@/lib/db`, `db.*` ni `dexie-react-hooks`.

ESLint amplía `no-restricted-imports` a:

```text
src/components/**
src/hooks/**
src/contexts/**
src/app/**
```

## 19.5.3 — Cero cálculos financieros canónicos en componentes

Se añadieron read models puros:

```text
src/domain/finance-read-models.ts
src/domain/dashboard-read-models.ts
```

Se trasladaron fuera de React:

- promedios financieros;
- disposable;
- budget status composition;
- report snapshots;
- position;
- category/nature aggregation;
- accounts overview;
- goal manager rows/prompts/completion;
- credit-card balance/available/usage;
- investment rows;
- budget source eligibility;
- achievement financial eligibility.

La UI conserva únicamente adaptación/presentación visual, por ejemplo clamps de barras de progreso.

## 19.5.4 — Read models reutilizables

Superficies revisadas:

```text
Resumen
Movimientos
Plan
Reportes
Cuentas
Metas
Inversiones
Planificados
```

Los read models complejos se resuelven fuera de React.

`selectDefaultCashAccount` fue movido a `domain/ledger.ts` para evitar que Quick Add importe un módulo que también contiene persistencia.

## 19.5.5 — finance-context como fachada

`finance-context.tsx` ya no contiene:

- consultas Dexie;
- `reduce()` financieros;
- construcción de reportes;
- fórmulas de presupuesto;
- conversión monetaria con `toCents`;
- validaciones monetarias canónicas.

Las queries se componen mediante `createFinanceReadModels`.

Las transformaciones/validaciones de commands se movieron a:

```text
src/application/finance-commands.ts
```

El contexto conserva coordinación React, toasts, sonidos, confirmaciones y exposición de la API.

## 19.5.6 — Guards automáticos

Se añade `tests/phase-19-5-prisma-engine-gate.test.ts`.

El gate falla si:

- React vuelve a importar Dexie directamente;
- aparecen `db.*` en components/hooks/contexts/app;
- dominio/application/repositories dependen de React UI;
- `finance-context` vuelve a construir fórmulas;
- hotspots conocidos reconstruyen métricas financieras;
- Quick Add vuelve a depender de `lib/accounts` para un selector de lectura.

## 19.5.7 — Residuos pequeños

Tratados explícitamente:

- `limit - spent` en BudgetStatus → read model;
- sumas de límites/gasto → read model;
- remaining/completion de metas → read model;
- legacy contribution `reduce()` → read model;
- card usage percentage → read model;
- transfer cents conversion → application command;
- recurring amount positivity → service schema canónico;
- achievement thresholds → evaluación pura fuera de React.

Persisten únicamente transformaciones visuales sin significado financiero nuevo, como clamp de porcentaje para una barra.

## Trazas obligatorias

### Crear gasto

```text
TransactionModal
→ FinanceContext.addExpense
→ application/createExpenseCommand
→ transaction-service.saveExpense
→ domain policies/selectors
→ Dexie transaction
```

No existe acceso UI → Dexie.

### Consultar Resumen

```text
SummaryTab
→ FinanceContext.getReportSnapshot
→ createFinanceReadModels
→ domain/reports.selectReportsSnapshot
→ datos obtenidos por finance-repository
→ Dexie
```

La pantalla no contiene una fórmula financiera exclusiva.

### Consultar Reportes

```text
ReportsTab
→ FinanceContext.getReportSnapshot
→ createFinanceReadModels
→ domain/reports.selectReportsSnapshot
→ datos obtenidos por finance-repository
→ Dexie
```

El selector de reportes es reutilizable sin React.

## Excepciones deliberadas

- Preferencias visuales/locales (`theme`, hide amounts, UI state, achievements persistence) pueden continuar en almacenamiento local cuando no contienen semántica financiera.
- React conserva form validation para feedback inmediato cuando el command/service repite y hace autoritativa la validación. La UI nunca es la única barrera financiera.
- Clamps y transformaciones destinadas exclusivamente a representación visual pueden permanecer en componentes.

Ninguna excepción contiene una fórmula financiera canónica ni acceso financiero directo a Dexie.

## Persistencia

Sin cambios:

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

No hay migration.

## Gate final

Run de código: `36596762307`.

```text
npm run typecheck  ✅
npm run lint       ✅
npm test           ✅ 434/434
npm run build      ✅
```

El build estático verificó nuevamente:

```text
no diagnostic importer
connect-src 'none' en cada HTML
```

Los gates históricos incluidos en la suite mantienen compatibilidad de backup/import, migraciones permanentes, financial totals, local-only y offline.

## Definition of Done — reporte obligatorio

### 1. Files changed

Cambios arquitectónicos principales:

```text
src/repositories/finance-repository.ts
src/adapters/dexie-live-query.ts
src/application/finance-commands.ts
src/application/finance-settings.ts
src/domain/finance-read-models.ts
src/domain/dashboard-read-models.ts
src/domain/ledger.ts
src/contexts/finance-context.tsx
src/hooks/use-finance-context-data.ts
src/hooks/use-finance-queries.ts
src/hooks/use-categories.ts
src/hooks/use-achievements.ts
src/components/dashboard/TransactionModal.tsx
src/components/dashboard/account-select.tsx
src/components/dashboard/accounts-overview.tsx
src/components/dashboard/budget-status.tsx
src/components/dashboard/debts-tab.tsx
src/components/dashboard/goals-manager.tsx
src/components/dashboard/investments-manager.tsx
src/components/dashboard/subscriptions-manager.tsx
src/components/dashboard/transfer-dialog.tsx
src/lib/achievements.ts
src/lib/accounts.ts
src/lib/goal-calculator.ts
src/lib/recurring-rule-service.ts
.eslintrc.json
tests/phase-19-5-prisma-engine-gate.test.ts
```

También se actualizaron regresiones históricas cuando una responsabilidad cambió de ubicación sin cambiar de contrato.

### 2. Schema changes

Ninguno.

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

### 3. Migration behavior

Sin migration nueva y sin reset destructivo.

La historia Dexie permanente permanece intacta.

### 4. Invariants affected

No se cambió semántica financiera.

Se hizo autoritativa en service una regla que ya existía en UI: una regla recurrente no puede tener monto cero. El comportamiento observable existente se conserva.

Transferencias continúan persistiendo centavos; la conversión se movió desde Quick Add al application command.

### 5. Tests added

`phase-19-5-prisma-engine-gate.test.ts` verifica de forma permanente:

- cero Dexie directo en React;
- dominio/application/repositories independientes de React UI;
- `finance-context` como fachada;
- hotspots sin fórmulas canónicas duplicadas;
- tres trazas obligatorias UI → command/query → domain/service → persistence;
- prohibición de reintroducir `lib/accounts` en componentes para cálculos de lectura.

Gate final: **434/434**.

### 6. Known limitations

- La persistencia actual del engine continúa siendo Dexie; 19.5 desacopla la interfaz de esa persistencia, no reemplaza Dexie.
- `src/adapters/dexie-live-query.ts` es deliberadamente específico de React + Dexie y puede sustituirse sin modificar dominio/read models.
- Los formularios pueden conservar validaciones duplicadas para feedback inmediato, pero los commands/services siguen siendo la autoridad.
- Preferencias visuales/locales y estado de logros pueden continuar en localStorage porque no son ledger ni reglas financieras canónicas.

### 7. Architectural concerns discovered

No queda ningún concern bloqueante para reutilizar el núcleo desde otra UI.

Los módulos históricos de service pueden seguir conteniendo orquestación Dexie, pero React ya no depende de Dexie ni aloja fórmulas financieras canónicas. Los selectors/read models y commands necesarios para una nueva interfaz son independientes de los componentes de GlitchBudget.

## Prisma Engine Gate — veredicto

Demostrado por tests:

```text
UI ≠ reglas financieras
UI ≠ acceso financiero directo a Dexie
React ≠ requisito del dominio
Persistencia ≠ fuente de cálculo financiero
```

Los tres flujos obligatorios están trazados arriba y protegidos por tests.

**Fase 19.5 completada.**
