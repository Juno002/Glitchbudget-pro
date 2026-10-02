# Post-roadmap 4 — Rendimiento medido

Estado técnico: **completado / pendiente de integración conjunta con Post-roadmap 5**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Método

La medición se ejecutó en Chromium real dentro del mismo smoke E2E de producción, con la base IndexedDB local de Prisma y datasets sintéticos de:

- 5 000 movimientos;
- 25 000 movimientos;
- 50 000 movimientos.

La instrumentación solo se activa con `?perf=1` y registra duración/cantidad de las lecturas Dexie relevantes. El benchmark también registra tiempo hasta que Movimientos queda utilizable, filas DOM iniciales y heap JS cuando Chrome lo expone.

## Baseline — commit 094be11

| Dataset | Apertura Movimientos | Filas DOM | financeContext | accountOverview | investmentManager | Heap |
|---:|---:|---:|---:|---:|---:|---:|
| 5k | 1 414 ms | 5 000 | 183.1 ms | 177.8 ms | 180.9 ms | 36.1 MB |
| 25k | 6 202 ms | 25 000 | 652.9 ms | 632.5 ms | 632.5 ms | 158.7 MB |
| 50k | 12 474 ms | 50 000 | 1 614.9 ms | 1 586.9 ms | 1 587.0 ms | 383.7 MB |

El baseline confirmó C1 y C2:

- Cuentas e Inversiones releían los mismos arrays grandes ya disponibles en `FinanceContext`;
- Movimientos materializaba todo el resultado filtrado en el DOM.

## Cambios aplicados

### C1 — eliminar lecturas redundantes

`AccountsOverview` e `InvestmentsManager` consumen ahora los arrays ya cargados por `FinanceContext`.

No se cambió el dominio financiero ni la persistencia. Solo se eliminó la duplicación de lectura de:

- incomes;
- expenses;
- debt payments;
- accounts;
- transfers;
- debts/investments según la superficie.

### C2 — render progresivo

Movimientos mantiene el conjunto filtrado completo para búsqueda/conteo, pero solo monta inicialmente 100 filas.

El usuario puede ampliar de 100 en 100 mediante **Mostrar más**.

No se cambian:

- filtros;
- orden;
- búsqueda;
- edición;
- conteos;
- semántica de movimientos.

## Resultado después del cambio — medición revalidada en CI

Medición del head `703b8d9`, run de rama **Quality checks #2022**:

| Dataset | Apertura Movimientos | Filas DOM iniciales | financeContext | lecturas duplicadas | Heap |
|---:|---:|---:|---:|---:|---:|
| 5k | 244 ms | 100 | 48.5 ms | 0 | 24.3 MB |
| 25k | 587 ms | 100 | 215.6 ms | 0 | 39.5 MB |
| 50k | 696 ms | 100 | 457.3 ms | 0 | 95.3 MB |

Frente al baseline, esta ejecución observó aproximadamente:

- 5k: ~83 % menos tiempo hasta Movimientos;
- 25k: ~91 % menos;
- 50k: ~94 % menos;
- 50k: ~75 % menos heap observado;
- las dos lecturas redundantes grandes permanecen ausentes.

Los tiempos absolutos varían entre runners; el criterio estructural es que las 100 filas iniciales, la única lectura `financeContext` y la ausencia de lecturas redundantes se mantienen bajo 5k / 25k / 50k.

## C3 — fondos con blur

Se midió la vista a 390×844 con throttling de CPU 4×, comparando el fondo ambiental realmente visible frente a oculto durante 90 intervalos de animación. El smoke fuerza temporalmente **Neón oscuro**, verifica que `.ambient-background` tenga visibilidad y opacidad efectiva, toma la muestra visible y después oculta únicamente ese fondo para la comparación.

Resultado del run **#2022**:

| Estado | Frame medio | Frame máximo | frames >20 ms |
|---|---:|---:|---:|
| blurs visibles | 16.67 ms | 16.80 ms | 0 |
| fondo oculto | 16.67 ms | 16.80 ms | 0 |

En este proxy no aparece impacto medible, por lo que **no se modifica el fondo**.

La medición es Chromium headless móvil/throttled, no un teléfono Android físico. La validación física sigue siendo QA de release; esta evidencia no justifica degradar la identidad visual dentro de este hardening.

## Estabilidad del smoke E2E

Los rojos de Plan/Metas/Planificados resultaron intermitentes: el mismo SHA `5f8c830` que había fallado pasó al reejecutar el job sin cambios de producto. El helper del smoke activaba tabs de Radix mediante `focus()` + `click()`, dependiendo de la activación automática por foco. Se cambió a un `mousedown` primario sobre un tab visible, que es la ruta de interacción que Radix usa para seleccionar la pestaña y elimina esa dependencia del foco.

El timeout genérico permanece en **30 s** para absorber variación normal del runner, pero ya no es la corrección principal ni convierte estados ausentes en éxito.

## Benchmark reproducible y fail-closed

El smoke E2E conserva y ahora valida explícitamente:

- datasets 5k / 25k / 50k;
- fecha de seed derivada del período activo de Movimientos, sin una fecha fija;
- contadores de lecturas activados solo por `?perf=1`;
- exactamente 100 filas DOM iniciales en cada dataset;
- una lectura `financeContext` y ausencia de `accountOverview` / `investmentManager`;
- fallo inmediato si Movimientos no llega a estado medible;
- medición de heap cuando Chromium la expone;
- comparación del fondo ambiental visible en Neón oscuro frente al mismo fondo oculto, con CPU throttling.

Así, un timeout o una medición inválida ya no puede terminar como benchmark aparentemente exitoso.

## Navegación de Plan endurecida

Además del hardening del harness, `PlanningTab` dejó de depender de `setPlanningTab()` para escribir la URL según el closure de `activeTab`. Las subsecciones llaman directamente a `navigate({ area:'planning', planningTab })`, actualizando estado y URL mediante el mismo contrato atómico usado por la navegación principal.

Esto no amplía alcance funcional ni cambia datos financieros; reduce una dependencia temporal innecesaria entre estado de área y estado de subsección.

## Datos e invariantes

Sin cambios en:

- schema Dexie;
- migraciones;
- formatos de backup;
- moneda;
- cálculos financieros;
- red.

## Gate técnico

El head `703b8d9` pasó en **Quality checks #2022**:

- `npm run check` ✅
- benchmark ledger ✅
- `npm run build` ✅
- `npm run test:e2e` ✅
- benchmark 5k / 25k / 50k fail-closed ✅
- comparación C3 con fondo realmente visible ✅

La documentación final debe volver a pasar el mismo gate antes de considerar la rama lista para la integración conjunta.
