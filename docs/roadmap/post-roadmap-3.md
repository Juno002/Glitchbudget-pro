# Post-roadmap 3 — Navegación robusta

Estado: **completada / Gate aprobado**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Alcance resuelto

### C4 — área principal tipada

La navegación principal ya no usa `string` abierto.

Se añadió `src/domain/navigation.ts` con contratos explícitos para:

- `PrimaryArea`: Resumen, Movimientos, Plan y Reportes;
- `PlanningArea`: Presupuestos, Metas y Planificados;
- `MovementSection`: Historial, Cuentas e Inversiones;
- parseo y serialización determinista del estado navegable.

`TabsContext` expone `activeTab: PrimaryArea` y mantiene compatibilidad con el foco de movimientos existente.

### URL + history

La navegación principal se refleja en la URL sin provocar navegación RSC ni tráfico de red:

```text
/                              → Resumen
/?tab=movements                → Movimientos
/?tab=planning&plan=budgets    → Plan / Presupuestos
/?tab=planning&plan=goals      → Plan / Metas
/?tab=planning&plan=subscriptions → Plan / Planificados
/?tab=reports                  → Reportes
```

Los saltos usan `history.pushState` / `replaceState`.

`popstate` reconstruye el estado React desde la URL, por lo que atrás/adelante del navegador y Android recuperan el área correspondiente.

### Deep links y foco secundario

Movimientos admite deep links de sección:

```text
/?tab=movements&section=history
/?tab=movements&section=accounts
/?tab=movements&section=investments
```

Los destinos secundarios usan refs reales en `MovementsTab`.

Al consumir un foco:

- se hace `scrollIntoView`;
- el destino recibe foco programático mediante `tabIndex={-1}`;
- el estado de foco efímero se limpia sin alterar la URL, preservando el deep link para reload/back/forward.

### Eliminación de carreras DOM

Resumen ya no usa:

- `setTimeout(..., 0)`;
- `document.getElementById(...)`;

para navegar a Cuentas, Inversiones o su sección inicial.

Los módulos de Resumen conservan refs directas y los saltos entre áreas pasan por `navigate(...)`.

## Pruebas

Se añadió `tests/post-roadmap-3-navigation.test.ts` con regresiones para:

- parseo de deep links;
- serialización de URL;
- tipado del contexto;
- wiring de `pushState/popstate`;
- eliminación de `setTimeout/getElementById`;
- refs/focus de secciones.

El smoke E2E ahora comprueba en navegador real:

- URL de Movimientos;
- URL de Plan y sus tres subsecciones;
- URL de Reportes;
- `history.back()` desde Reportes a Planificados;
- `history.forward()` de vuelta a Reportes.

## Hallazgos durante el gate

El primer gate detectó tres tests históricos acoplados a texto/API antigua:

- Fase 20.3 buscaba literalmente `setActiveTab/setPlanningTab`;
- Fase 20.5 contaba cualquier `label:` dentro del archivo de navegación;
- Fase 20.8.8 dependía del texto exacto de una etiqueta E2E.

Se actualizaron únicamente esas expectativas para conservar la misma invariante bajo el contrato nuevo. No se relajaron pruebas financieras ni de arquitectura.

## Validación

Quality gate verde sobre `923802a1fbbf50809e44cd2e8662f96bcef98e2e`:

- `npm run check` ✅
- benchmark del ledger ✅
- `npm run build` ✅
- `npm run test:e2e` ✅

La reconciliación documental forma parte de esta misma intervención y debe volver a pasar el gate antes del merge.

## Cambios de datos

- schema Dexie: **sin cambios**;
- migraciones: **sin cambios**;
- backups: **sin cambios**;
- invariantes financieras: **sin cambios**;
- tráfico de red: **sin cambios**.

## Gate

**Aprobado técnicamente.** Tras el quality gate verde del commit documental final, merge a `main` y eliminación de la rama temporal, Post-roadmap 4 queda autorizado.
