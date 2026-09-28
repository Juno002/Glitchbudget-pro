# Gate Fase 7.5 — Entregable de UX Architecture & Design System

> **Gate histórico aprobado.** Las fases 8–10 ya fueron implementadas posteriormente. Consulta el [estado acumulado del roadmap](README.md).

**Gate 7.5: APROBADO por el usuario el 2026-09-27.** Se aprueban navegación, Resumen, Plan, estados de planificados, compositor global, sistema visual, privacidad, responsive/accesibilidad y la frontera del dominio financiero. Fase 8 — Quick Add 2.0 puede comenzar sobre `TransactionModal`.

Fuentes canónicas: [cierre de fase](phase-7.5.md), este entregable formal y [wireframes estructurales](../ux/wireframes-phase-7.5.md). Las iteraciones 7.5A–D y los antiguos archivos `phase-7-5-*` son antecedentes, no arquitecturas alternativas vigentes.

Este documento responde literalmente al entregable exigido por `Roadmap septiembre 2026.txt`.

## 1. Proposed navigation structure

Navegación primaria única:

```text
Resumen
Movimientos
Plan
Reportes
```

Móvil: Bottom Navigation de cuatro destinos.  
Desktop: cuatro tabs equivalentes.

Secundarios:
- Cuentas/Tarjetas → desde contexto financiero, no tab primario.
- Ajustes → engranaje.
- Logros → capa secundaria.
- Metas → Plan.
- Inversiones futuras → acceso secundario desde activos/Resumen.

## 2. Components/patterns to reuse

Estabilizados:

```text
PageHeader
SectionHeader
MetricCard
MoneyValue
DeltaValue
ProgressMetric
StatusBadge
EmptyState
DetailHeader
ActionMenu
FilterChip
TransactionRow
PlannedPaymentRow
```

Primitives Radix/UI existentes se conservan para dialogs, alerts, inputs, buttons, tables y tabs.

## 3. Existing components to keep

```text
TransactionModal
BottomNav
DashboardContent/Tabs
MovementsView
BudgetStatus
SubscriptionsManager
GoalsManager
backup dialogs
ui/* primitives
```

TransactionModal permanece como base de Fase 8.

## 4. Existing components to simplify

```text
Header
SummaryTab
AccountsOverview
PlanningTab
ReportsTab
DebtsTab
Settings
```

Aplicado en 7.5:
- Header reducido.
- Summary status/action.
- Movimientos prioriza historial.
- Accounts management es secundario.
- Reportes concentra análisis.
- Settings estructurado.

## 5. Existing components to retire

Retirado:
- navegación “Dashboard” vs “Resumen”;
- “Planificación” como nombre alternativo;
- Tarjetas como cuarto tab de Plan;
- banner persistente de gamificación / “Desbloqueo I.A.”;
- definiciones duplicadas de navegación.

Retirar posteriormente, con migración segura:
- ruta `/transactions` duplicada.
- componentes analíticos legacy que queden sin consumidores.

## 6. Mobile behavior

- una columna por defecto;
- Bottom Navigation de cuatro destinos;
- FAB global por encima de safe-area;
- filtros envuelven/apilan;
- touch targets reforzados;
- Cuentas/Tarjetas después del historial en Movimientos;
- dialogs con scroll cuando exceden viewport;
- sin tablas horizontales para la actividad cotidiana.

## 7. Desktop behavior

- mismas cuatro áreas y mismos nombres;
- métricas en grids;
- reportes pueden usar tablas/grids;
- Account Detail puede evolucionar a master/detail;
- Nuevo movimiento sigue globalmente accesible;
- viewport no altera semántica financiera.

## 8. Accessibility considerations

Implementado/definido:
- skip link;
- `main` focus target;
- focus visible;
- labels/aria-label en icon buttons;
- statuses con texto, no solo color;
- `aria-live` en cambios relevantes;
- reduced motion respetado;
- targets táctiles mayores;
- destructive actions con AlertDialog;
- Hide Balances rápido y reversible.

Pendiente de release QA:
- auditoría manual con lector de pantalla;
- prueba en teléfono físico;
- contraste manual en combinaciones extremas de tema.

## 9. Screens affected by later phases

- F8 Quick Add 2.0 → TransactionModal.
- F9 Budgets 2.0 → Plan/Presupuestos.
- F10 Goals 2.0 → Plan/Metas.
- F11 Currency → Settings/General + money rendering.
- F12 Investments → Resumen/activos + Detail pattern.
- F13 Reports 2.0 → Reportes.
- F14 Home 2.0 → refinamiento de Resumen.
- F15 metadata/filters → Movimientos + FilterChip/TransactionRow.
- F17 Security → Privacidad: app lock/auto-lock.
- F18 Backup 2.0 → Settings/Datos.

## 10. UX decisions that constrain the domain model

No se añadieron nuevas reglas de dominio.

Decisiones que el dominio debe seguir respetando:
- Transferencia ≠ ingreso/gasto.
- Planned ≠ actual hasta Confirmar.
- Crédito disponible ≠ activo líquido.
- `scheduledDate` y fecha real pueden diferir.
- Budget Remaining tiene definición única del domain.
- Hide Balances es presentación, no mutación/cifrado de datos.
- moneda base futura no debe reinterpretar centavos actuales sin migración explícita.
- entidades futuras deben encajar en patrón de detalle sin crear tabs primarios.
- confirmar un planificado sin reintroducir datos requiere que la regla contenga suficientes defaults de ejecución. El dominio actual conserva `defaultAccountId`, pero no modela todavía tarjeta/método de pago recurrente; si se necesita ese caso, debe abrirse como cambio explícito de dominio y no resolverse desde 7.5 con datos implícitos.

Si una UX futura exige cambiar cualquiera de estas invariantes, se abre como cambio de dominio separado.

---

## Acuerdos de jerarquía requeridos por Gate 7.5

Navigation map: definido.  
Home hierarchy: definido y representado.  
Plan hierarchy: definido.  
Settings hierarchy: definido.  
Quick Add information hierarchy: definido.  
Detail-screen pattern: definido.  
Financial vocabulary: definido.  
Status vocabulary: definido.  
Responsive behavior: definido.  
Privacy visibility behavior: definido.

Prototipos estructurales: `docs/ux/wireframes-phase-7.5.md`.

> Requisito original del roadmap: No pasar a Fase 8 antes de revisar este gate.

**Cumplido el 2026-09-27:** revisión y aprobación explícita del usuario. Los acuerdos anteriores constituyen el contrato aprobado para Fase 8; las pruebas físicas permanecen en release QA.
