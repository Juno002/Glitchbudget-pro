# Fase 7.5A — Arquitectura de información

> **Registro histórico de fase.** Conserva versiones, resultados y restricciones del momento de su cierre. Para el estado acumulado hasta Fase 10, las continuaciones autorizadas y los pendientes vigentes, consulta el [índice del roadmap](README.md).

> **Checkpoint histórico, supersedido por el cierre de Fase 7.5.** Sus alcances, pendientes, instrucciones de parada y pruebas describen esta iteración. Consulta el [cierre canónico](phase-7.5.md), el [Gate aprobado](phase-7.5-gate.md) y los [wireframes vigentes](../ux/wireframes-phase-7.5.md).

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

## Gate técnico

GitHub Actions sobre la rama:

- `npm run check`: aprobado;
- **194 pruebas aprobadas, 0 fallidas**;
- TypeScript: aprobado;
- ESLint: aprobado con 0 warnings;
- guard local-only: aprobado;
- `npm run build`: aprobado;
- exportación estática: aprobada;
- manifiesto offline: 43 recursos;
- Dexie permanece en v11;
- backup permanece en JSON v7.

No se introdujeron migraciones ni cambios del dominio financiero.

## Siguiente subfase

7.5B — Design System mínimo:
- tokens;
- money/status primitives;
- PageHeader / SectionHeader;
- MetricCard / MoneyValue;
- EmptyState / StatusBadge;
- sin reconstrucción masiva de pantallas.

Detenerse después del gate de 7.5A.
