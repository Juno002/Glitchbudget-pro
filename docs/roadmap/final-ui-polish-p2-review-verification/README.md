# P2 — Correcciones de revisión: evidencia reproducible

Las cuatro correcciones solicitadas se verifican con los mismos casos, filas, reloj y anchos de P2 PR #115. Las referencias originales de `final-ui-polish-p2-verification/` se conservan.

Casos financieros en `scripts/final-ui-polish-p2-verification.mjs`, registrados íntegramente en `verification.json`; plantillas y fechas de `tests/fixtures/final-ui-polish-p1-history.json`, reloj de `tests/fixtures/final-ui-polish-p0-capture.json`: **2026-10-04**, **2026-10-04T12:00:00.000Z**, **UTC**, preset **30d**. El harness usa el perfil aislado de smoke y restaura las filas originales.

Reproducción desde la raíz del repositorio:

```sh
npm run build
FINAL_UI_POLISH_P2_CAPTURE_DIR=docs/roadmap/final-ui-polish-p2-review-verification npm run test:e2e
```

La matriz conserva 100 registros en Prisma/Neón a 320/360/390/1280 px y legado a 320/1280 px, importes visibles/ocultos. Los 24 PNG cubren base cero, subida y bajada a 320/1280 px en Prisma/Neón. Los controles también prueban vacío, igualdad, concordancia singular/plural, el copy exacto «Sin gasto anterior con el que comparar», fuente heredada del comparable, los seis glifos U+2022 del hook privado, máscaras de igual fuente/tamaño (`text-base`, 16 px), y vuelta a visible con la jerarquía anterior. Privacidad accesible, focus, touch, reduced motion y loading forman parte del mismo gate.

Entorno: Node **v24.19.0**, Linux x64, cloud executor, Chromium **151**. P3 no se ejecuta ni se añade espacio reservado para su gráfico.
