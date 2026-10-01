# Post-roadmap 2 — Ciclo de vida: fecha, carga y tema

Estado: **completada / Gate aprobado**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Alcance resuelto

### A3 — fecha financiera reactiva

Se añadió una única fuente reactiva de “hoy” mediante `useFinancialToday()`.

El hook:

- calcula la fecha financiera local actual;
- programa el siguiente refresco al cambio de día local;
- vuelve a sincronizar al recuperar foco;
- vuelve a sincronizar al regresar la pestaña a estado visible.

`FinanceProvider` usa esa fecha para:

- `materializePendingOccurrences(plannedOccurrenceWindow(today))`;
- `prepareBudgetPeriodsForDate(today)`.

`SummaryTab` consume el mismo `today`, por lo que estados como vencido / hoy / mañana ya no dependen de que ocurra un render incidental.

La lógica de reloj vive en `src/lib/financial-clock.ts`, fuera de `domain/`, respetando el contrato arquitectónico que prohíbe dependencias de reloj en el dominio.

### A4 — estados vacíos durante carga

Presupuestos, próximos pagos, metas e inversiones ahora distinguen explícitamente:

```text
loading
content
empty
```

Mientras `loading === true`, esos módulos muestran skeletons y nunca un mensaje “Aún no tienes…” basado en arrays todavía no cargados.

### A5 — theme system

`theme: 'system'` deja de mapearse de forma fija a oscuro.

Ahora:

- `prefers-color-scheme: dark` → Neón oscuro;
- preferencia clara → Prisma claro;
- los cambios del sistema se escuchan en tiempo real mediante `MediaQueryList.change`;
- Ajustes vuelve a exponer una opción **Seguir sistema**;
- el valor persistido sigue siendo `system`, mientras la clase visual resuelta sigue siendo `light` o `dark`.

## Pruebas

Se añadió `tests/post-roadmap-2-lifecycle.test.ts` con regresiones para:

- cálculo del siguiente cambio de día;
- wiring de materialización/preparación con la fecha reactiva;
- matriz loading/content/empty;
- resolución de `system` contra `prefers-color-scheme`;
- presencia de la opción visible “Seguir sistema”.

El primer intento colocó el cálculo de medianoche en `domain/`; el gate existente `domain has no ... clock dependencies` lo rechazó. La corrección movió ese cálculo a `lib/` sin debilitar el test.

## Validación

Implementación validada en la rama temporal sobre `56ff02aaf4d501d7055611bc79346223ddbad5f5`:

- `npm run check` ✅
- benchmark del ledger ✅
- `npm run build` ✅
- `npm run test:e2e` ✅

La reconciliación documental forma parte de esta misma intervención y debe volver a pasar el quality gate antes del merge.

## Cambios de datos

- schema Dexie: **sin cambios**;
- migraciones: **sin cambios**;
- formatos de backup: **sin cambios**;
- invariantes financieras: **sin cambios**;
- tráfico de red: **sin cambios**.

## Gate

**Aprobado técnicamente.** Tras el quality gate verde del commit documental final, merge a `main` y eliminación de la rama temporal, Post-roadmap 3 queda autorizado.
