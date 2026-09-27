# GlitchBudget Pro — Minimal Finance UI System

Fase 7.5B estabiliza un conjunto pequeño de primitives financieros. No pretende sustituir toda la UI ni crear un framework paralelo a los componentes `ui/`.

## Tokens

Los tokens estructurales viven en `src/app/globals.css` y son compartidos por los tres temas.

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

Los temas pueden cambiar color/presentación, pero no jerarquía ni estructura UX.

## Finance UI primitives

Ruta:

```text
src/components/finance-ui/
```

### PageHeader

Título de área + descripción + acciones. No contiene reglas financieras.

### SectionHeader

Jerarquía secundaria consistente para módulos dentro de una página.

### MoneyValue

Único patrón de renderizado de importe para nuevas superficies financieras.

Características:
- cifras tabulares;
- formato centralizado mediante `formatCurrency`;
- signo opcional;
- tono explícito;
- soporte de presentación oculta mediante `concealed` sin crear todavía estado global de privacidad.

### DeltaValue

Variación monetaria con signo. El tono no se infiere automáticamente porque una subida puede ser buena o mala según la métrica.

### MetricCard

Etiqueta + valor monetario/valor custom + texto de apoyo.

No asigna significado a una cifra; recibe datos ya calculados por domain/application.

### StatusBadge

Estados reutilizables con texto, no solo color.

Vocabulario base:

```text
pending   → Pendiente
confirmed → Confirmado
skipped   → Omitido
overdue   → Vencido
```

También existen estados genéricos de UI:
`success`, `warning`, `danger`, `neutral`.

### ProgressMetric

Patrón común para:
- presupuesto gastado/restante;
- objetivos;
- progreso financiero.

Muestra current/total/restante + estado textual.

### EmptyState

Siempre admite:
- título;
- explicación útil;
- acción opcional;
- icono opcional.

Evitar nuevos “No hay datos” sin contexto.

## Accesibilidad

- estados llevan texto y no dependen de color;
- valores monetarios mantienen contraste del tema;
- importes usan cifras tabulares;
- `concealed` expone “Importe oculto” a tecnología asistiva;
- acciones se siguen construyendo con Button/primitives accesibles existentes;
- reduced motion continúa gobernado globalmente por `prefers-reduced-motion`.

## Uso durante 7.5B

Solo se migra una superficie pequeña (`BudgetStatus`) para demostrar el patrón y evitar una reconstrucción masiva.

La adopción estructural de Resumen, Movimientos, Plan, Reportes, Settings y detalles corresponde a 7.5C/7.5D.

## Regla de dominio

Estos componentes reciben cifras/estados ya calculados.

```text
finance-ui
≠ cálculos financieros
finance-ui
≠ Dexie
finance-ui
≠ políticas
```
