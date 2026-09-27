# Fase 7.5A — Arquitectura de información

Fecha: 2026-09-27. Rama: `phase-7.5-ux-architecture`. Base: Fases 6–7 ya integradas en `main`.

## Alcance

7.5A define la arquitectura de información y aplica únicamente cambios estructurales mínimos. No inicia el Design System visual de 7.5B ni modifica lógica financiera.

Contrato persistente: `docs/ux/architecture.md`.

## Cambios aplicados

1. Fuente única para las cuatro áreas primarias:
   - Resumen
   - Movimientos
   - Plan
   - Reportes

2. Móvil y escritorio consumen las mismas etiquetas. Se elimina “Dashboard” vs “Resumen” y “Planificación” vs “Plan” como inconsistencia de navegación.

3. “Nuevo movimiento” sale del header móvil y utiliza el FAB global existente, ahora visible también en móvil por encima del Bottom Navigation.

4. Plan queda con exactamente:
   - Presupuestos
   - Metas
   - Planificados

5. Tarjetas deja de ser un cuarto subtab de Plan. La administración actual permanece accesible como navegación secundaria desde “Mi dinero hoy” en Movimientos.

6. La gamificación deja de empujar el contenido financiero: se retira el banner persistente `AchievementMonkMode` con “Desbloqueo I.A.”. Los logros siguen disponibles mediante su capa secundaria/toasts existentes.

7. Se documentan:
   - navigation map;
   - jerarquía de Resumen;
   - jerarquía de Plan;
   - Settings hierarchy;
   - Quick Add information hierarchy;
   - Detail Screen pattern;
   - vocabulario financiero;
   - vocabulario de estados;
   - responsive behavior;
   - privacy visibility contract;
   - componentes a mantener/simplificar/retirar;
   - restricciones para fases posteriores.

## No tocado

- domain selectors;
- ledger;
- políticas financieras;
- recurrencias;
- PlannedOccurrence lifecycle;
- Dexie/schema;
- backups;
- categorías;
- fórmulas de reportes.

## Siguiente subfase

7.5B — Design System mínimo:
- tokens;
- money/status primitives;
- PageHeader / SectionHeader;
- MetricCard / MoneyValue;
- EmptyState / StatusBadge;
- sin reconstrucción masiva de pantallas.

Detenerse después del gate de 7.5A.
