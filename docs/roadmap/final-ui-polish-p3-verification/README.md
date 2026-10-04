# P3 — Tendencia de gasto: evidencia reproducible

La tendencia consume gastos canónicos sin cortar por `Account.startDate`. El selector construye las ventanas con `previousComparableRange()` y realiza una única pasada sobre los gastos: **O(N + W)**. Las pruebas instrumentan las lecturas de fechas y cantidades con 1, 6 y 700 ventanas; los máximos visibles siguen siendo 6/6/4/4/3/6.

## Reproducción

Desde la raíz del repositorio:

```sh
npm run check
npm run build
FINAL_UI_POLISH_P3_CAPTURE_DIR=docs/roadmap/final-ui-polish-p3-verification npm run test:e2e
npm run benchmark:ledger
npm run benchmark:reports
```

El harness utiliza un perfil aislado de Chromium y restaura exactamente accounts/incomes/expenses. Reloj **2026-10-04T12:00:00.000Z**, zona **UTC**, plantilla histórica versionada en `tests/fixtures/final-ui-polish-p1-history.json`; escenarios y filas fijos en `scripts/final-ui-polish-p3-verification.mjs`, y resumen del gate en [verification.json](verification.json). Los dieciséis PNG incluyen doce vistas del mismo historial a 320/390/1280 px, Prisma/Neón, visible/oculto, y cuatro vistas de una sola ventana parcial y del borde parcial punteado. Las referencias P0–P2 permanecen intactas.

La matriz de 130 comprobaciones cubre seis presets, custom alrededor del 29 de febrero, seis escenarios históricos, 320/360/390/1280 px en Prisma/Neón y legado a 320/1280. Comprueba rangos y totales exactos, gráfico solo con dos o más ventanas, una ventana completa sin gráfico y una parcial con indicación accesible, borde parcial punteado neutral, cobertura parcial, ventanas desconocidas omitidas, ceros completos reales, gastos sin cuenta o con cuenta retirada y gastos anteriores al inicio de la cuenta activa. Verifica tooltip visible/oculto —incluido historial parcial—, atributos/SVG/árbol accesible, neutralidad, ventana actual destacada, tabla de comparación visible, teclado, touch, reduced motion, loading y vacío. El gráfico no añade controles ni estados disabled.

## Benchmarks

Entorno: **Node v24.19.0**, Linux x64, cloud executor idéntico a P0, Chromium **151.0.7922.173**. Mediciones aisladas, sin build/check/E2E simultáneos. [Ledger: muestras antes/después y comparación P0](ledger-benchmark.json); [Reports: resumen de 18 mediciones emparejadas](reports-benchmark.json).

El benchmark existente de ledger permanece intacto. Para 50k, posición **42,666 ms** frente a P0 **42,626 ms** (+0,095 %); historiales **34,823 ms** frente a **40,288 ms** (−13,567 %). Ninguna comparación de 1k/10k/50k excede simultáneamente 20 % y 5 ms.

Reports usa un dataset fijo por tamaño y las mismas siete muestras para una lectura `selectSpendingReport()` y la tendencia con el máximo de ventanas del preset. El oracle de exactitud se ejecuta fuera del tiempo; cada pareja alterna el orden de lectura. El JSON conserva entorno, configuración, medianas, ratios y resultado del gate. El detalle de las muestras se regenera con `npm run benchmark:reports`; las comprobaciones visuales se regeneran con el harness. No se versionan registros repetidos de cada combinación.

| Preset (50k) | Lectura de una ventana, ms | Tendencia, ms | Ratio |
|---|---:|---:|---:|
| 7d | 16,395 | 8,324 | 0,508× |
| 30d | 16,594 | 8,435 | 0,508× |
| 3m | 17,053 | 8,490 | 0,498× |
| 6m | 17,777 | 8,426 | 0,474× |
| 1y | 19,003 | 8,671 | 0,456× |
| custom | 16,572 | 8,243 | 0,497× |

Las seis comparaciones 50k cumplen el gate **≤2×**. Esa regla no sustituye la prueba algorítmica de una sola pasada.
