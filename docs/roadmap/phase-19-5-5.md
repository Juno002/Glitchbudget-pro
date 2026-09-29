# Fase 19.5.5 — Barrido final + Prisma Engine Gate

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.5.

Plan de ejecución: [phase-19-5.md](phase-19-5.md).

Estado: **completado**.

## Objetivo

Ejecutar desde cero la auditoría final de frontera y demostrar el Gate 19.5:

```text
UI ≠ reglas financieras
UI ≠ acceso financiero directo a Dexie
React ≠ requisito del dominio
Persistencia ≠ cálculo financiero
```

No se añaden features.

## Barrido final

La auditoría volvió a cubrir las superficies React exigidas:

```text
src/components/**
src/hooks/**
src/contexts/**
src/app/**
```

El gate permanente recorre automáticamente esas superficies y verifica:

- cero imports de `@/lib/db` desde React;
- cero `db.*` desde React;
- `dexie-react-hooks` limitado a los dos adapters autorizados;
- dominio, policies, services financieros y query layer libres de React;
- reducciones en React limitadas a código visual previamente revisado;
- ausencia explícita de los residuos encontrados durante el barrido final.

## Residuos encontrados y corregidos

El barrido final no se limitó a confirmar el trabajo anterior. Encontró cuatro residuos adicionales.

### 1. Investments Manager reconstruía un read model

`src/components/dashboard/investments-manager.tsx` todavía:

- ordenaba inversiones;
- unía cada inversión con su cuenta;
- calculaba el valor actual mediante saldo de cuenta;
- calculaba la proyección.

Se añadió:

```text
src/domain/investments.ts
  selectInvestmentManagerRows()
```

La UI recibe ahora:

```text
investment
account
currentValue
projection
```

ya resueltos.

### 2. Planificados reconstruía reglas + ocurrencias

`subscriptions-manager.tsx` todavía construía:

- grupos de ocurrencias pendientes;
- mapa de rules por id;
- orden active-first;
- conteo pendiente;
- últimas ocurrencias confirmadas/omitidas.

Se añadió:

```text
src/domain/upcoming.ts
  selectPlannedPaymentsManagerReadModel()
```

La pantalla consume ese read model.

### 3. DebtsTab decidía qué deudas están activas

Se añadió:

```text
src/domain/ledger.ts
  selectActiveDebts()
```

`DebtsTab` deja de filtrar `status === 'active'` por su cuenta.

### 4. TransactionModal decidía qué deudas son tarjetas activas

Se añadió:

```text
src/domain/ledger.ts
  selectActiveCreditCards()
```

`TransactionModal` ya no deriva:

```text
status === active && type === credit_card
```

También se sustituyó la conversión monetaria manual `Math.round(numAmount * 100)` por el adapter compartido `toCents()`.

`SubscriptionsManager` hizo la misma convergencia para el monto de nuevas reglas.

## Excepciones finales permitidas

Permanecen deliberadamente en UI solo responsabilidades de representación/interacción:

- `useLiveQuery` exclusivamente en:
  - `src/hooks/use-finance-context-data.ts`;
  - `src/hooks/use-finance-queries.ts`;
- clamps/coordenadas/reducciones exclusivamente visuales en charts revisados;
- comparaciones de métricas ya resueltas para tone/color/labels;
- `annualRate * 100` para presentar una tasa almacenada como decimal;
- `toCents()` como adaptación de unidad de inputs antes de invocar commands;
- gating de formulario (`min`, required, habilitar/deshabilitar botón).

Estas validaciones de formulario **no son la fuente canónica**: commands/services vuelven a validar los valores antes de persistir.

Ninguna excepción contiene una regla financiera exclusiva de la pantalla.

## Gate automático permanente

### `tests/phase-19-5-5-forensic-scan.test.ts`

Protege:

- frontera de persistencia React;
- adapters Dexie autorizados;
- dependencia React del núcleo;
- reducciones inesperadas en surfaces React;
- residuos finales concretos de inversiones, planificados, deuda y Quick Add.

### `tests/phase-19-5-5-read-models.test.ts`

Caracteriza:

- read model de inversiones;
- read model de planificados;
- selección de deudas activas;
- selección de tarjetas activas.

### `tests/phase-19-5-5-flow-traces.test.ts`

Convierte los tres ejercicios obligatorios del roadmap en regresión estructural.

## Ejercicio obligatorio de cierre

### Flujo A — crear gasto

```text
TransactionModal
→ useFinances().addExpense
→ finance-context (fachada de interacción)
→ withBudgetConfirmation(...)
→ transaction-service.saveExpense()
→ requireCategory / requireRecurringProvenance
→ account + policy checks
→ budgetPlansForDate()
→ evaluateBudgetOverspendingSet()
→ db.expenses.add()
```

Propiedades verificadas:

- TransactionModal no importa Dexie;
- finance-context no importa Dexie;
- la UI no decide saldo disponible ni exceso de presupuesto;
- el service valida categoría/cuenta/policies;
- la policy de presupuesto vive fuera de React;
- la escritura final ocurre en la capa de persistencia/service.

### Flujo B — consultar Resumen

```text
SummaryTab
→ getReportSnapshot() + getBudgetStatusDetails()
→ selectHomeReadModel()
→ finance-context (fachada)
→ selectReportsSnapshot() / selectBudgetStatusDetails()
→ useFinanceContextData (adapter React)
→ readFinanceContextData()
→ Dexie read transaction
```

La dirección de datos de una lectura reactiva es Dexie → query → selector → UI, pero desde la superficie no existe ningún atajo hacia Dexie.

Resumen no posee fórmulas exclusivas de patrimonio, cash flow, spending o presupuesto.

### Flujo C — consultar Reportes

```text
ReportsTab
→ getReportSnapshot(range)
→ finance-context (fachada)
→ selectReportsSnapshot()
   → selectSpendingReport()
   → selectCashFlowReport()
   → selectNetWorthReport()
→ snapshot de readFinanceContextData()
→ Dexie
```

Resumen y Reportes reutilizan los mismos selectors canónicos para métricas compartidas.

## Definition of Done

El gate previo a documentación:

```text
Quality checks #36610513904

npm run check ✅
  check:local ✅
  typecheck ✅
  lint ✅
  full test suite ✅

npm run build ✅
```

La suite completa conserva las regresiones existentes de:

- backup import;
- export/import round-trip;
- migraciones históricas;
- totales financieros;
- modo offline/local-only;
- ausencia de tráfico financiero de red;
- CSP/local-only guards.

19.5.5 no añade migraciones, por lo que no existe una nueva ruta de migración que probar.

## Files changed

```text
src/domain/investments.ts
src/domain/upcoming.ts
src/domain/ledger.ts
src/components/dashboard/investments-manager.tsx
src/components/dashboard/subscriptions-manager.tsx
src/components/dashboard/debts-tab.tsx
src/components/dashboard/TransactionModal.tsx
tests/phase-19-5-5-forensic-scan.test.ts
tests/phase-19-5-5-read-models.test.ts
tests/phase-19-5-5-flow-traces.test.ts
docs/roadmap/phase-19-5-5.md
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

Sin migración nueva.

No se resetea ni reescribe Dexie.

## Invariants affected

Ninguna semántica financiera cambia.

Los cambios trasladan clasificación/composición ya existente a selectors/read models reutilizables.

## Known limitations

`finance-context.tsx` continúa siendo una fachada React amplia. Puede dividirse por organización en el futuro, pero ninguna fórmula, persistencia financiera o regla del motor depende de mantenerlo como un único archivo.

Los adapters `useLiveQuery` siguen siendo React-specific por definición, pero envuelven queries no-React; una UI nueva puede omitirlos por completo.

## Prisma Engine Gate — decisión

**APROBADO.**

Se puede afirmar y demostrar:

```text
UI ≠ reglas financieras
UI ≠ acceso financiero directo a Dexie
React ≠ requisito del dominio
Persistencia ≠ cálculo financiero
```

Además:

- las mutaciones financieras pasan por services/commands;
- las pantallas consumen selectors/read models;
- los tests de dominio se ejecutan sin montar React;
- sustituir la interfaz no requiere copiar fórmulas desde componentes;
- Prisma puede consumir el mismo núcleo no-React y construir su propia capa visual.

No queda ninguna excepción conocida con semántica financiera dentro de UI.

Fase 19.5 queda cerrada.
