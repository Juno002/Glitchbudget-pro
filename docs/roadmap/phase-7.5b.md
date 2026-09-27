# Fase 7.5B — Design System mínimo

Fecha: 2026-09-27. Rama: `phase-7.5-ux-architecture`. Base: 7.5A cerrada en `4b1869a`.

## Alcance

7.5B crea primitives y tokens reutilizables para información financiera sin reconstruir las pantallas principales ni introducir lógica de dominio.

No se modifican ledger, métricas, períodos, recurrencias, categorías, Dexie ni backups.

## Tokens centralizados

En `src/app/globals.css`:

### Spacing

```text
--space-page
--space-section
--space-card
--space-control
```

### Radius

```text
--radius-card
--radius-interactive
--radius-modal
```

### Tipografía

```text
--text-page-title
--text-section-title
--text-metric
--text-supporting
```

### Motion

```text
--motion-fast
--motion-standard
--motion-slow
```

### Jerarquía de superficies

```text
--surface-page
--surface-section
--surface-card
--surface-interactive
--surface-modal
```

Son tokens estructurales compartidos por Neón Oscuro, Claro y Minimalista. Un tema no puede cambiar jerarquía, navegación ni funcionalidad.

## Primitives nuevos

Ruta:

```text
src/components/finance-ui/
```

### PageHeader

Título, descripción y acciones de página con una jerarquía estable.

### SectionHeader

Encabezado reutilizable de sección.

### MoneyValue

Renderiza importes con:
- `formatCurrency` centralizado;
- cifras tabulares;
- tonos explícitos;
- signo opcional;
- `concealed` como primitive visual futuro para Hide Balances.

No existe todavía estado global `balancesHidden`.

### DeltaValue

Variación monetaria con signo explícito.

No decide por sí sola si positivo = bueno o malo; el caller asigna el tono según la métrica.

### MetricCard

Patrón reutilizable de:
- etiqueta;
- cifra/valor;
- supporting text.

No calcula ninguna métrica.

### StatusBadge

Estados financieros/operativos textuales:

```text
pending   → Pendiente
confirmed → Confirmado
skipped   → Omitido
overdue   → Vencido
```

También existen `success`, `warning`, `danger` y `neutral`.

El estado nunca se comunica solo mediante color.

### ProgressMetric

Patrón de progreso con:
- current;
- total;
- remaining opcional;
- status textual;
- progress bar.

No calcula presupuestos ni metas: recibe datos ya resueltos.

### EmptyState

Patrón de:
- título útil;
- descripción;
- icono opcional;
- acción opcional.

Evita proliferar mensajes sin contexto del tipo “No hay datos”.

## Primera adopción controlada

`BudgetStatus` fue migrado como superficie piloto.

Ahora utiliza:

```text
ProgressMetric
EmptyState
```

Estados de presupuesto muestran texto además de color:

```text
En presupuesto
Cerca del límite
Excedido
```

El empty state dirige explícitamente a:

```text
Plan → Presupuestos
```

No se migraron todavía SummaryTab, MovementsView, PlanningTab completo ni ReportsTab. Esa adopción corresponde a 7.5C/7.5D.

## Documentación

Contrato:

```text
docs/ux/design-system.md
```

Define:
- tokens;
- responsabilidades de cada primitive;
- accesibilidad;
- fronteras UI/domain;
- estrategia de adopción.

## Invariante de arquitectura

```text
finance-ui
≠ cálculo financiero
finance-ui
≠ Dexie
finance-ui
≠ políticas financieras
```

Los componentes reciben valores ya calculados por domain/application services.

## Pruebas

Se añadieron guards para:
- vocabulario Planned Payments;
- existencia de tokens estructurales.

## Gate técnico

GitHub Actions:

- `npm run check`: aprobado;
- **196 pruebas aprobadas, 0 fallidas**;
- TypeScript: aprobado;
- ESLint: aprobado con 0 warnings;
- guard local-only: aprobado;
- `npm run build`: aprobado;
- exportación estática: aprobada;
- manifiesto offline: 43 recursos.

Persistencia sin cambios:

```text
Dexie v11
Backup JSON v7
```

## Límites deliberados

7.5B no implementa:
- Settings como pantalla/panel;
- estado global Hide Balances;
- DetailHeader;
- ActionMenu;
- FilterChip;
- TransactionRow compartido;
- PlannedPaymentRow compartido;
- reestructuración completa de Resumen;
- reestructuración completa de Movimientos/Plan/Reportes;
- prototipos finales de Account Detail/Settings/Quick Add;
- rediseño pixel-perfect.

Esos patrones se aplicarán/estabilizarán en 7.5C y 7.5D.

Fase 7.5B cerrada. Detenerse antes de 7.5C.
