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

## Resultado después del cambio — commit 1960e12

| Dataset | Apertura Movimientos | Filas DOM iniciales | financeContext | lecturas duplicadas | Heap |
|---:|---:|---:|---:|---:|---:|
| 5k | 374 ms | 100 | 113.7 ms | 0 | 29.9 MB |
| 25k | 672 ms | 100 | 350.5 ms | 0 | 41.2 MB |
| 50k | 1 169 ms | 100 | 749.3 ms | 0 | 88.7 MB |

Mejora observada:

- 5k: ~74 % menos tiempo hasta Movimientos;
- 25k: ~89 % menos;
- 50k: ~91 % menos;
- 50k: ~77 % menos heap observado;
- las dos lecturas redundantes grandes desaparecen por completo.

## C3 — fondos con blur

Se midió la vista a 390×844 con throttling de CPU 4×, comparando el fondo ambiental visible frente a oculto durante 90 intervalos de animación.

Resultado:

| Estado | Frame medio | Frame máximo | frames >20 ms |
|---|---:|---:|---:|
| blurs visibles | 16.67 ms | 16.80 ms | 0 |
| fondo oculto | 16.67 ms | 16.80 ms | 0 |

En este benchmark reproducible no aparece impacto medible, por lo que **no se modifica el fondo**.

La medición es un proxy Chromium móvil/throttled, no un teléfono Android físico. La validación física sigue siendo QA de release; no hay evidencia cuantitativa que justifique degradar la identidad visual dentro de este hardening.

## Estabilidad del smoke E2E

Durante la PR aparecieron timeouts distintos en transiciones de Plan/Metas/Planificados con el mismo SHA que había pasado en el run de rama. Como el smoke ahora también ejecuta datasets grandes y comparte runner con build/benchmark, el timeout genérico de `waitFor` se amplió de 15 s a **30 s**. Esto no cambia comportamiento del producto ni oculta fallos: un estado que no aparece en 30 s sigue fallando, pero se reduce el falso negativo por variación del runner.

## Benchmark reproducible

El smoke E2E conserva:

- datasets 5k / 25k / 50k;
- contadores de lecturas activados solo por `?perf=1`;
- medición de filas DOM y heap;
- comparación de ambient background con CPU throttling.

## Carrera detectada por el gate

Los runs de PR reprodujeron timeouts alternos en Metas/Planificados. La revisión mostró que `PlanningTab` todavía usaba `setPlanningTab()`, cuya escritura de URL dependía de que el closure de `activeTab` ya estuviera en `planning`. Se eliminó esa dependencia: las subsecciones ahora llaman directamente a `navigate({ area:'planning', planningTab })`, actualizando estado y URL mediante el mismo contrato atómico usado por la navegación principal.

Esto no amplía alcance funcional; endurece C4/C2 bajo la carga del benchmark y elimina una carrera revelada por el smoke.

## Datos e invariantes

Sin cambios en:

- schema Dexie;
- migraciones;
- formatos de backup;
- moneda;
- cálculos financieros;
- red.

## Gate técnico

Antes de documentación, el commit `1960e12a7bfcfa44d0ecab3ae42875d04c1931a9` pasó:

- `npm run check` ✅
- benchmark ledger ✅
- `npm run build` ✅
- `npm run test:e2e` ✅

La rama debe volver a pasar el gate completo con esta evidencia incluida antes de considerarse lista para la integración conjunta.
