# Final UI Polish — baseline P0

Capturada el 4 de octubre de 2026 sobre el producto de `main`, sin cambios visuales ni financieros. La sesión aislada del smoke registra ingreso y gasto mediante el compositor existente; las capturas no contienen datos personales ni nuevos datos demo en producto.

## Reproducción

```sh
npm ci
npm run build
FINAL_UI_POLISH_BASELINE_DIR=/tmp/final-ui-polish-p0 npm run test:e2e
```

`verifyFinalUiPolishP0()` se ejecuta siempre dentro de `npm run test:e2e`. La variable solo activa la escritura de PNG y geometría; no condiciona las comprobaciones. Las capturas se toman antes del benchmark de navegador existente. Se cierran los diálogos de la sesión anterior mediante sus controles y se restaura al terminar tema, viewport e importes visibles.

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

[Muestras completas](ledger-benchmark.json). Los tiempos describen este executor; no reemplazan la baseline de otras máquinas.

Revisión de diff: solo tests, captura/verificación y documentación P0. Cero cambios de producto, fórmulas React, fixtures de dinero, dominio, schema/migraciones, backup/envelope o red. Ningún bloqueo de producto encontrado.
