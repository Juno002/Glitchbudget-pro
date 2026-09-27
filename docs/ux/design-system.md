# GlitchBudget Pro — Finance UI System

Fase 7.5 estabiliza un sistema pequeño y reutilizable para información financiera. No sustituye `ui/` ni mueve reglas de dominio a React.

## Tokens

Viven en `src/app/globals.css` y son compartidos por Neón Oscuro, Claro y Minimalista.

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

### Typography

```text
--text-page-title
--text-section-title
--text-metric
--text-supporting
--font-money
```

### Border strength

```text
--border-subtle
--border-strong
```

### Status semantics

```text
--status-success
--status-warning
--status-danger
--status-info
```

### Motion

```text
--motion-fast
--motion-standard
--motion-slow
```

### Surface hierarchy

```text
--surface-page
--surface-section
--surface-card
--surface-interactive
--surface-modal
```

Los temas cambian presentación, nunca jerarquía, navegación, orden o funcionalidad.

## Finance UI primitives

Ruta:

```text
src/components/finance-ui/
```

### PageHeader

Título de área + descripción + acciones globales de esa superficie.

### SectionHeader

Jerarquía secundaria consistente dentro de una página.

### DetailHeader

Patrón de entidad:

```text
Título
Tipo/estado secundario
Métrica primaria
Supporting text
Acciones frecuentes
```

### MoneyValue

Renderizado estándar de importes:
- `formatCurrency` centralizado;
- `--font-money`;
- cifras tabulares;
- signo opcional;
- tono explícito;
- Hide Balances global;
- etiqueta accesible “Importe oculto”.

### DeltaValue

Variación monetaria con signo. El caller define si la variación es buena, mala o neutral.

### MetricCard

Etiqueta + cifra/valor + supporting text. No calcula métricas.

### StatusBadge

Estados con texto y tratamiento visual.

```text
pending   → Pendiente
confirmed → Confirmado
skipped   → Omitido
overdue   → Vencido
```

También: `success`, `warning`, `danger`, `neutral`.

### ProgressMetric

Current / total / remaining + progreso + estado textual.

### EmptyState

Debe incluir un mensaje útil y, cuando existe una acción natural, explicar dónde realizarla.

Evitar “No hay datos” sin contexto.

### ActionMenu

Agrupa administración secundaria y acciones “More” para no mezclar management con lectura cotidiana.

### FilterChip

Filtro compacto reutilizable con estado activo y clear opcional.

### TransactionRow

Fila de actividad financiera real con:
- icono;
- título;
- metadata;
- amount;
- fecha;
- foco/target consistente.

### PlannedPaymentRow

Fila de planificación con:
- título;
- fecha;
- amount;
- estado Pending/Confirmed/Skipped/Overdue;
- Confirmar/Omitir/Ver movimiento según corresponda.

## Loading y feedback

### Loading

Cuando la estructura ya se conoce:
- preferir `Skeleton`;
- no sustituir toda la página por un spinner;
- preservar la jerarquía para evitar saltos grandes.

### Save

Estados recomendados:

```text
Guardar
Guardando…
Guardado
```

Mientras se guarda:
- bloquear submits repetidos;
- no cerrar antes de conocer el resultado.

### Success

Toast breve o feedback inline. No requiere modal adicional.

### Error

Debe responder:
- qué no se guardó;
- qué puede hacer el usuario.

Nunca exponer directamente errores técnicos de Dexie.

## Destructive actions

Confirmación obligatoria para:
- eliminar movimiento;
- borrar todos los datos;
- eliminar entidad con impacto histórico;
- restaurar backup que sobrescribe datos.

El diálogo debe describir el efecto. Acciones reversibles de bajo impacto no requieren confirmación innecesaria.

## Responsive

### Mobile

- una columna por defecto;
- targets táctiles amplios;
- Bottom Navigation de cuatro destinos;
- FAB por encima de safe-area;
- filtros se envuelven/apilan;
- actividad cotidiana evita tablas horizontales.

### Tablet/Desktop

- mismo orden conceptual;
- métricas en grid;
- reportes pueden usar tablas;
- master/detail solo cuando reduce navegación.

## Motion

Permitido principalmente para:
- open/close;
- transición de estado;
- success;
- achievement;
- charts.

No animar continuamente métricas financieras ni decoración.

La aplicación conserva:

```tsx
<MotionConfig reducedMotion="user">
```

## Hide Balances

`balancesHidden` es presentación local.

- quick toggle en Header;
- control en Ajustes → Privacidad;
- persistencia en `localStorage`;
- no Dexie;
- no backup;
- no cambia cálculos ni valores almacenados.

Los campos de entrada que el usuario está editando no se enmascaran.

## Accesibilidad

- estados con texto, no solo color;
- cifras legibles/tabulares;
- focus visible;
- icon buttons con `aria-label`;
- `aria-live` para estados dinámicos útiles;
- skip link a `main`;
- dialogs gestionados por primitives Radix;
- reduced motion respetado;
- targets táctiles reforzados.

## Regla de dominio

```text
finance-ui
≠ cálculos financieros
finance-ui
≠ Dexie
finance-ui
≠ políticas financieras
```

Los componentes reciben valores ya resueltos por domain/application services.
