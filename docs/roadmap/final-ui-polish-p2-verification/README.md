# P2 — Evidencia reproducible del hero de gasto

Casos financieros fijos en `scripts/final-ui-polish-p2-verification.mjs`, registrados íntegramente en `verification.json`; plantillas y fechas de `tests/fixtures/final-ui-polish-p1-history.json`, reloj de `tests/fixtures/final-ui-polish-p0-capture.json`: fecha **2026-10-04**, instante **2026-10-04T12:00:00.000Z**, timezone **UTC**, preset **30d**. El harness usa exclusivamente el perfil aislado de smoke y restaura las filas originales al terminar.

Reproducción desde la raíz del repositorio:

```sh
npm run build
FINAL_UI_POLISH_P2_CAPTURE_DIR=docs/roadmap/final-ui-polish-p2-verification npm run test:e2e
```

`verification.json` registra la matriz completa de valores, privacidad y geometría. Los PNG cubren base anterior cero, aumento y descenso a 320/1280 px en Prisma/Neón, con importes visibles/ocultos. La matriz también verifica 360/390 px, igualdad, vacío y Minimalista legado; focus real, touch, reduced motion y loading se verifican en el mismo gate.

Entorno de generación: Node **v24.19.0**, Linux x64, cloud executor, Chromium **151**. No sustituye ni modifica las referencias P0/P1. P2 no incorpora gráfico histórico ni reserva espacio para P3.
