# Fase 7.5 — UX Architecture & Design System

**Estado vigente: fase completa; Gate 7.5 revisado y aprobado por el usuario el 2026-09-27.** Fase 8 — Quick Add 2.0 queda habilitada. Esta actualización registra la aprobación; no implementa Fase 8.

Fuentes canónicas: este cierre, el [entregable formal del Gate](phase-7.5-gate.md) y los [wireframes estructurales](../ux/wireframes-phase-7.5.md). El [índice del roadmap](README.md) distingue estos documentos de los registros históricos.

Fecha: 2026-09-27. Rama: `phase-7.5-ux-architecture`. Fuente de verdad: `Roadmap septiembre 2026.txt`.

Este documento registra el cumplimiento de **Fase 7.5 completa según el roadmap**, no una reescritura pixel-perfect de toda la aplicación. El objetivo fue fijar y aplicar la arquitectura de interacción, los patrones reutilizables y las restricciones UX antes de Quick Add 2.0.

## Navegación principal

La aplicación mantiene exactamente cuatro áreas:

```text
Resumen
Movimientos
Plan
Reportes
```

Las etiquetas son iguales en móvil y escritorio.

No se añadieron tabs primarios para Cuentas, Tarjetas, Metas, Inversiones, Planificados, Ajustes o Logros.

## Header y acción global

### Mobile

El header prioriza:

```text
GlitchBudget
Ocultar/mostrar importes
Ajustes
Período/contexto
```

Logros permanece como capa secundaria y su acceso explícito se oculta del header móvil para reducir densidad.

### Desktop

Conserva el mismo contexto y las mismas cuatro áreas.

### Nuevo movimiento

El FAB es accesible desde cualquier área primaria y abre siempre `TransactionModal`.

El compositor global puede iniciar:

```text
Gasto
Ingreso
Transferencia
```

Transferencia solicita origen/destino y no muestra categoría. Reutiliza `saveTransfer`, por lo que sigue siendo movimiento de activos y no ingreso/gasto.

TransactionModal continúa siendo la base a mejorar en Fase 8; no se reconstruyó desde cero.

## Resumen

Se aplicó la jerarquía del roadmap:

```text
1. Posición financiera
2. Presupuesto disponible
3. Próximos pagos
4. Metas relevantes
5. Movimientos recientes
```

### Posición financiera

Diferencia:

- Disponible líquido;
- Deuda de tarjetas;
- Patrimonio neto.

El crédito disponible no se presenta como efectivo.

### Presupuesto disponible

`BudgetStatus` prioriza `Restante total` antes del detalle por categoría.

### Próximos pagos

Muestra hasta tres ocurrencias que requieren atención y permite Confirmar/Omitir sin reintroducir sus datos.

### Metas

Muestra highlights activos con progreso. Inversiones no se inventan antes de Fase 12.

### Actividad reciente

Incluye actividad registrada reciente:

- ingresos;
- gastos;
- transferencias;
- pagos de tarjeta;
- aportes a metas.

El análisis profundo por categoría vive en Reportes.

## Movimientos

El orden visible es ahora:

```text
Movimientos
→ búsqueda
→ filtros
→ historial real
→ cuentas/tarjetas como acceso secundario
```

`AccountsOverview` ya no ocupa la parte superior antes del historial.

La administración de cuentas/tarjetas se agrupa detrás de acciones secundarias y `ActionMenu`.

## Plan

Contiene exactamente:

```text
Presupuestos
Metas
Planificados
```

La subsección activa se conserva en el contexto de navegación, permitiendo que Resumen lleve directamente a Metas o Planificados.

“Suscripciones” ya no es concepto de navegación principal.

## Planned Payments

Patrón estable:

```text
PlannedPaymentRow
Pendiente
Vencido
Confirmado
Omitido
```

Los estados siempre tienen texto y tratamiento visual.

Las ocurrencias pendientes/vencidas permiten Confirmar/Omitir.

Las confirmadas recientes ofrecen:

```text
Ver movimiento
```

y abren el movimiento real vinculado dentro de Movimientos.

## Detail Screen / View vs Management

Se estabilizó `DetailHeader`:

```text
Título
Tipo/estado
Métrica primaria
Supporting information
Acciones
Historial/detalle
```

Cuentas es la primera adopción.

La vista cotidiana muestra estado primero; editar, ajustar saldos o abrir administración se mueve a `ActionMenu`/dialogs secundarios.

## Settings

El engranaje abre un panel estructurado:

```text
General
Finanzas
Categorías
Privacidad y seguridad
Datos y backups
Apariencia
Acerca de
```

### General
- moneda base actual;
- inicio del período.

La edición/multicurrency se reserva para Fase 11.

### Finanzas
- ingreso previsto;
- rollover;
- protección de saldo;
- comportamiento al exceder presupuesto.

### Privacidad y seguridad
- Ocultar importes;
- bloqueo de aplicación: reservado para Fase 17;
- auto-lock: reservado para Fase 17.

No se presentan controles falsos para features futuras.

### Datos y backups
- respaldos/export/import;
- zona destructiva separada.

## Hide Balances

`balancesHidden` es una preferencia de presentación local:

- quick toggle;
- Ajustes → Privacidad;
- persistencia en `localStorage`;
- sincronización entre tabs;
- sin Dexie;
- sin backup;
- sin modificar cálculos.

Las superficies financieras principales usan `MoneyValue` o `usePrivateCurrency`.

## Sistema de métricas y patrones base

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

El sistema visual no calcula dinero ni accede al ledger.

## Design tokens

Centralizados:

- spacing;
- radius;
- surface hierarchy;
- border strength;
- typography scale;
- money typography;
- status semantics;
- animation duration.

Niveles estructurales:

```text
page
section
card
interactive surface
modal
```

Neón Oscuro, Claro y Minimalista comparten exactamente la misma arquitectura UX.

## Empty / loading / feedback

Aplicado/definido:

- `EmptyState` contextual;
- skeleton cuando la estructura se conoce;
- bloqueo de submits repetidos;
- Guardando/Guardado;
- toasts/feedback inline;
- errores de aplicación mediante mensajes útiles en vez de exponer Dexie directamente.

## Destructivos

Se exige confirmación en superficies con impacto histórico, incluyendo:

- eliminar movimientos;
- eliminar tarjetas;
- borrar datos;
- restaurar un backup que sobrescribe datos;
- resets de categorías.

La confirmación explica el efecto cuando corresponde.

## Accesibilidad

Incluye:

- skip link a contenido;
- focus visible;
- navegación por teclado;
- icon buttons etiquetados;
- estados no basados solo en color;
- live regions para estados dinámicos;
- touch targets reforzados;
- `prefers-reduced-motion`;
- dialogs con primitives Radix.

## Responsive

### Mobile
- una columna;
- Bottom Navigation de cuatro destinos;
- FAB sobre safe-area;
- filtros/inputs apilables;
- historial cotidiano sin tablas horizontales;
- administración secundaria debajo del contenido principal.

### Desktop
- mismos nombres/orden;
- grids para métricas;
- tablas/grids en análisis;
- master/detail solo donde aporte claridad.

## Prototipos estructurales

Antes de Fase 8 se documentaron wireframes para:

```text
Resumen
Quick Add
Movimientos
Plan
Account Detail
Settings
```

Documento:

```text
docs/ux/wireframes-phase-7.5.md
```

Incluye evaluación de orden, información secundaria, progressive disclosure y objetivos de interacción.

## Gate exacto del roadmap

El entregable de 10 puntos solicitado por el roadmap está en:

```text
docs/roadmap/phase-7.5-gate.md
```

Contiene:

1. Proposed navigation structure
2. Components/patterns to reuse
3. Existing components to keep
4. Existing components to simplify
5. Existing components to retire
6. Mobile behavior
7. Desktop behavior
8. Accessibility considerations
9. Screens affected by later phases
10. UX decisions that constrain the domain model

## Frontera financiera respetada

Fase 7.5 no modificó:

- fórmulas financieras;
- canonical metrics;
- Period Engine;
- Recurrence Engine;
- estados de PlannedOccurrence;
- categorías persistidas;
- schema Dexie;
- formato del backup.

Persistencia:

```text
Dexie v11
Backup JSON v7
```

El único adaptador funcional nuevo del compositor global reutiliza el servicio de transferencia existente; no redefine su semántica.

## Gate técnico

Gate de código previo a esta documentación:

```text
214 tests
214 pass
0 fail
typecheck ✓
ESLint 0 warnings ✓
local-only ✓
static build ✓
offline manifest: 43 resources
```

Los avisos Node/Actions del runner son deprecaciones externas.

## QA manual

Los checks automáticos no sustituyen:

- revisión visual en teléfono físico;
- lector de pantalla real;
- contraste manual de combinaciones extremas;
- revisión humana del entregable UX.

La revisión humana del Gate fue completada y aprobada por el usuario el 2026-09-27. Las comprobaciones físicas de QA anteriores siguen siendo tareas de release; no bloquean el cierre arquitectónico ni el inicio de Fase 8.

## Siguiente fase

```text
Fase 8 — Quick Add 2.0
```

**Requisito cumplido:** el [Gate 7.5](phase-7.5-gate.md) está revisado y aprobado. Fase 8 mejorará `TransactionModal`, manteniendo el compositor único y las invariantes financieras.
