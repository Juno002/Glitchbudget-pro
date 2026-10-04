# Final UI Polish — baseline P0

Capturada el 4 de octubre de 2026 sobre el producto de `main`, sin cambios visuales ni financieros. La sesión aislada del smoke registra el dataset fijo mediante el compositor existente; las capturas no contienen datos personales ni nuevos datos demo en producto.

## Reproducción

```sh
npm ci
npm run build
FINAL_UI_POLISH_BASELINE_DIR=/tmp/final-ui-polish-p0 npm run test:e2e
```

`verifyFinalUiPolishP0()` se ejecuta siempre dentro de `npm run test:e2e`. La variable solo activa la escritura de PNG y geometría; no condiciona las comprobaciones. Las capturas se toman antes del benchmark de navegador existente. El fixture versionado en `tests/fixtures/final-ui-polish-p0-capture.json` fija fecha financiera `2026-10-04`, reloj `2026-10-04T12:00:00.000Z` y zona UTC antes de la primera carga de la app. Se crea una cuenta Efectivo con apertura cero, un ingreso de 100000 centavos en `sueldo` y un gasto de 10000 centavos en `vivienda`; moneda DOP y locale es-DO. Estos son los mismos movimientos del smoke original, ahora con categorías explícitas. Antes de capturar, una lectura de verificación comprueba fechas, importes, categorías, cuenta, configuración y tablas financieras vacías. Los UUID generados por producto no se muestran y no forman parte de la comparación visual. [Contrato de captura](capture-contract.json). Se cierran los diálogos de la sesión anterior mediante sus controles y se restaura al terminar tema, viewport e importes visibles.

## Contratos caracterizados

- Reportes obtiene `getReportSnapshot(range, range.end)` del facade; este delega en `selectReportsSnapshot()`.
- Orden exacto: `quick-read → spending → comparison → spending-breakdown → cash-flow → net-worth → detail`; presupuesto permanece como follow-up secundario.
- Cuatro tablas visibles con filas: comparación, categorías originales, naturaleza y movimientos de mayor importe. Las tablas anchas conservan su scroll interno; no se ocultan mediante disclosure.
- Presets interactivos `7d`, `30d`, `3m`, `6m`, `1y` y `custom`; custom conserva dos fechas válidas. El test fija también los rangos canónicos anclados en 2026-10-04.
- Secciones contenidas y sin overflow horizontal de página a 320, 390 y 1280 px, en Prisma y Neón. Alturas y bordes de cada sección quedan registrados en [geometry.json](geometry.json); son baseline descriptiva, no nuevos thresholds de producto.
- Importes visibles como control positivo; ocultos mediante el control real: máscara presente y ninguna moneda con cantidad en texto, SVG, etiquetas, títulos ni árbol accesible. Se comprueba también un tooltip real de comparación con máscara.
- Tests de frontera protegen Reportes y sus charts contra reducciones financieras, filtros de movimientos y acceso directo a persistencia. No se cambia React, dominio, schema, backup, navegación ni copy.

## Capturas

Cada PNG contiene la página completa. La navegación fija aparece en la posición del viewport inicial; no representa una nueva ubicación del componente.

| Tema / ancho | Importes visibles | Importes ocultos |
|---|---|---|
| Prisma / 320 | [PNG](light-320-visible.png) | [PNG](light-320-hidden.png) |
| Prisma / 390 | [PNG](light-390-visible.png) | [PNG](light-390-hidden.png) |
| Prisma / 1280 | [PNG](light-1280-visible.png) | [PNG](light-1280-hidden.png) |
| Neón / 320 | [PNG](dark-320-visible.png) | [PNG](dark-320-hidden.png) |
| Neón / 390 | [PNG](dark-390-visible.png) | [PNG](dark-390-hidden.png) |
| Neón / 1280 | [PNG](dark-1280-visible.png) | [PNG](dark-1280-hidden.png) |

P0 conserva el acabado y copy actuales; no aplica contratos visuales de P1–P6 anticipadamente. El gate completo mantiene además las verificaciones existentes de temas, superficies secundarias, navegación, mutaciones por compositor y recarga offline sin requests externos.

## Gate y benchmark

- `npm run check`: aprobado, 733/733 tests (incluye tres caracterizaciones P0).
- `npm run build`: aprobado, export estático y guard CSP/local-only.
- `npm run test:e2e`: aprobado, matriz P0 y smoke completo con offline.
- `npm run benchmark:ledger`: aprobado; script existente sin cambios, ocho cuentas y siete muestras tras calentamiento. Medición aislada del resto de gates; no se añaden thresholds.

| Movimientos | Posición, mediana ms | Historiales, mediana ms |
|---|---:|---:|
| 1k | 1.208 | 0.712 |
| 10k | 7.789 | 9.350 |
| 50k | 42.626 | 40.288 |

[Muestras completas](ledger-benchmark.json). La medición original se hizo en el **executor cloud adjunto, no en GitHub Actions**, con **Node v24.19.0 y Linux x64**, sin gates concurrentes. Su identificador y la huella de máquina observada en la repetición están registrados en el JSON: Debian 13.6, kernel 6.18.44, AMD EPYC 9V74, 3 vCPU visibles y cuota de 2 CPU. Los números son **milisegundos**, no segundos: 42.626 ms equivale a 0.042626 s. Para la regla P3 de 20% / 5 ms deben compararse baseline P0 y candidato medidos en el mismo entorno y versión de Node; no cruzar estos valores con CI Node 22 u otra máquina. Si cambia el executor, se puede medir el código de P0 y el candidato en ese mismo nuevo entorno, conservando el contrato y las muestras originales.

Revisión de diff: solo tests, captura/verificación y documentación P0. Cero cambios de producto, fórmulas React, fixtures de dinero, dominio, schema/migraciones, backup/envelope o red. Ningún bloqueo de producto encontrado.

## Verificación previa a P1

El registro P0 conserva `Gate aprobado · PR #109`; GitHub confirma ese PR mergeado. P1 permanece como siguiente intervención.

La revisión detectó que las capturas originales usaban reloj real y la primera categoría disponible. Esta corrección fija reloj, zona y dataset en el harness, regenera las doce capturas en la misma ruta estable y deja tests que rechazan una fecha, categoría, importe o cantidad de filas distinta. Las capturas esperan al estado en reposo, sin tooltip abierto ni foco transitorio. Dos corridas independientes comprobaron contrato y geometría idénticos. No cambia producto.

Una repetición aislada del benchmark existente dio posición/historiales 50k **43.119/37.117 ms** (posición +0.493 ms, +1.16%; historiales −3.171 ms, −7.87%). El coste es coherente con las muestras originales de unos 40 ms; no es una medición de 40 segundos. [Muestras de verificación](ledger-recheck.json). Las medianas originales siguen siendo la baseline P0.
