# Fase 19.5 — Residual architecture cleanup / Prisma Engine Gate

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.5.

Estado: **en ejecución**.

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

## Gate pendiente

Antes de cerrar:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

También deben permanecer verdes los gates históricos de backup/import, migraciones permanentes, local-only y offline.
