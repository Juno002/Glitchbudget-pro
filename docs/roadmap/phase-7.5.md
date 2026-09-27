# Fase 7.5 — UX Architecture & Design System

Fecha de cierre: 2026-09-27. Rama: `phase-7.5-ux-architecture`. Base: Fases 6–7 integradas en `main`.

Fase 7.5 se dividió deliberadamente en cuatro gates para evitar una reescritura visual masiva y proteger el dominio financiero.

## 7.5A — Arquitectura de información

Contrato principal:

```text
Resumen
Movimientos
Plan
Reportes
```

Mismos nombres en móvil y escritorio.

Plan queda en:

```text
Presupuestos
Metas
Planificados
```

Tarjetas, cuentas, settings, logros e inversiones no son navegación primaria.

Se centralizaron definiciones de navegación y se retiró la nomenclatura inconsistente Dashboard/Resumen y Planificación/Plan.

Documento:

```text
docs/ux/architecture.md
```

## 7.5B — Design System mínimo

Primitives financieros compartidos:

```text
PageHeader
SectionHeader
DetailHeader
MoneyValue
DeltaValue
MetricCard
StatusBadge
ProgressMetric
EmptyState
```

Tokens estructurales centralizados:

- spacing;
- radius;
- typography;
- motion;
- surface hierarchy.

Documento:

```text
docs/ux/design-system.md
```

## 7.5C — Patrones estructurales

Resumen pasa a status-first:

```text
Posición financiera
Presupuesto restante
Actividad registrada
Ahorro sugerido
```

Los donuts salen de Home y el análisis queda en Reportes.

Movimientos se estructura como:

```text
Mi dinero hoy
Historial
```

Settings deja de ser un dropdown monolítico y pasa a:

```text
General
Finanzas
Categorías
Privacidad
Datos
Apariencia
Acerca de
```

Se establece `DetailHeader` y cuentas se convierte en la primera adopción del patrón común de detalle.

Reportes se agrupa por propósito analítico.

## 7.5D — Estados, privacidad y accesibilidad

Hide Balances global:

- preferencia visual local;
- quick toggle en Header;
- Ajustes → Privacidad;
- sin Dexie ni backup;
- superficies financieras principales privacy-aware;
- sin flash inicial de importes cuando ya estaba activado.

Estados Planned Payments:

```text
Pendiente
Vencido
Confirmado
Omitido
```

con texto + color y actividad reciente.

Accesibilidad/responsive:

- skip link;
- main focus target;
- focus rings;
- touch targets móviles;
- live regions;
- autosave anunciado;
- formularios apilados en móvil;
- reduced-motion preservado.

## Frontera respetada

Durante toda 7.5 no se modificó:

- ledger;
- fórmulas financieras;
- canonical metrics;
- Period Engine;
- Recurrence Engine;
- lifecycle de PlannedOccurrence;
- categorías persistidas;
- Dexie schema;
- backup format.

Persistencia final:

```text
Dexie v11
Backup JSON v7
```

## Resultado arquitectónico

La aplicación tiene ahora una jerarquía UX estable sobre la cual pueden construirse fases posteriores sin volver a decidir navegación y vocabulario en cada feature.

```text
UI primitives
      ↓
4 áreas primarias
      ↓
dominio financiero existente
```

El Design System no calcula dinero y la UI no redefine reglas financieras.

## Gates

- 7.5A: 194 tests.
- 7.5B: 196 tests.
- 7.5C: 200 tests.
- 7.5D: 205 tests.

Gate final:

```text
205 tests
205 pass
0 fail
typecheck ✓
lint ✓
local-only ✓
static build ✓
offline manifest ✓
```

## Siguiente fase del roadmap

```text
Fase 8 — Quick Add 2.0
```

Quick Add deberá respetar el contrato ya definido:

```text
Monto
Gasto | Ingreso | Transferencia
Cuenta
Categoría cuando aplica
Guardar
↓
Más detalles
```

No iniciar Fase 8 sin un gate explícito.
