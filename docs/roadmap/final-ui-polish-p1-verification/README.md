# Final UI Polish — evidencia P1

Verificación sobre la rama P1 el 4 de octubre de 2026, con Node v24.19.0, Chromium 151 y Linux x64 en el executor cloud. Conserva el dataset, reloj `2026-10-04T12:00:00.000Z`, fecha financiera `2026-10-04` y zona UTC del fixture P0. Las doce capturas y el benchmark P0 no se modifican.

## Reproducción

```sh
npm ci
npm run build
FINAL_UI_POLISH_P1_CAPTURE_DIR=/tmp/final-ui-polish-p1 npm run test:e2e
```

`verifyFinalUiPolishP1()` se ejecuta siempre después de la caracterización P0 y antes del benchmark de navegador existente. La variable solo habilita PNG y JSON. La sesión usa un perfil temporal y se restaura exactamente el dataset original después de los escenarios.

## Evidencia

[verification.json](verification.json) registra copy, orden, tamaños de titulares, límites y los siete tipos cubiertos. La matriz comprueba 320/360/390/1280 px con altura 844, Prisma y Neón, importes visibles/ocultos; Minimalista legado se comprueba a 320/1280 px. Los veinte PNG recortan solo la sección editorial: para fotografiarla se amplía temporalmente la altura a 1600 y se vuelve al inicio, evitando que el shell fijo tape el recorte. Después se restaura altura 844; no se oculta ni modifica ningún componente.

| Tema | Anchos | Ejemplos visible / oculto |
|---|---|---|
| Prisma | 320, 360, 390, 1280 | [320 visible](light-320-visible.png) / [320 oculto](light-320-hidden.png) |
| Neón | 320, 360, 390, 1280 | [1280 visible](dark-1280-visible.png) / [1280 oculto](dark-1280-hidden.png) |
| Minimalista legado | 320, 1280 | [320 visible](serious-320-visible.png) / [320 oculto](serious-320-hidden.png) |

- Primer insight canónico protagonista; secundarios con menor tamaño, sin reordenar.
- Titulares exactos sin cifras; importes del cuerpo enmascarados mediante el control real. Texto, SVG, atributos accesibles y árbol accesible completo sin fugas.
- Teclado con foco visible; cambio de rango mediante touch en controles existentes; editorial sin animación bajo reduced motion.
- Loading observado durante recargas, con skeleton existente y sin artículos editoriales todavía. Vacío con titular y explicación obligatorios; disabled no aplica a la lectura editorial, que no añade controles.
- Escenarios aislados con categorías existentes `vivienda`, `transporte` y `alimentacion`: dominante/estable, gasto mayor, menor, base cero y vacío. Se escriben solo en IndexedDB del perfil de test, alimentando los selectores reales; no hay datos demo en producto.
- Caracterización P0 conserva orden de secciones, presets, cuatro tablas visibles, privacidad de tooltip y responsive de Reportes completos. El smoke completo mantiene navegación, mutaciones y recarga offline.

## Gate P1

`npm run check`: 742/742 tests. `npm run build`: export estático y guard CSP/local-only aprobados. `npm run test:e2e`: matriz P1 y smoke completo aprobados. Los siete tests nuevos cubren copy, direcciones, base cero, parámetros canónicos, pureza, determinismo y ranking/thresholds intactos. P1 no requiere un benchmark propio; no altera la baseline ni las reglas de P3.

Decisiones cerradas: un surface editorial con articles, `report.quickRead[0]` protagonista, titulares sin importes, parámetros numéricos sin formato en `report-editorial.ts`, dinero formateado exclusivamente en React mediante `usePrivateCurrency()`. Hero, métricas, tablas y resto de Reportes permanecen bajo sus contratos actuales.
