# P1 — capturas con historia comparable

Complemento de evidencia solicitado tras revisar PR #111. No modifica producto, titulares, cuerpos, ranking ni thresholds. Conserva los veinte PNG de P1 y toda la baseline P0.

## Reproducción

```sh
npm run build
FINAL_UI_POLISH_P1_HISTORY_CAPTURE_DIR=/tmp/final-ui-polish-p1-history npm run test:e2e
```

Fixture versionado: [`final-ui-polish-p1-history.json`](../../../../tests/fixtures/final-ui-polish-p1-history.json). El reloj permanece en `2026-10-04T12:00:00.000Z`, UTC y preset 30D. La cuenta comienza el 1 de agosto de 2026 con apertura de 100000 centavos; movimientos previos el 1 de septiembre y actuales el 4 de octubre. Fechas dentro de las dos ventanas comparables canónicas. Moneda DOP, locale es-DO y categorías existentes. Los importes y variaciones son fixtures exclusivos del perfil temporal de test; los selectores reales producen la lectura y se restaura exactamente el dataset P0 al terminar.

## Escenarios fotografiados

Cada escenario se comprueba a 320/1280 px, Prisma/Neón, importes visibles/ocultos: 32 PNG. Los controles y límites se comprueban con altura 844; el recorte editorial se fotografía temporalmente a altura 1600 para evitar el shell fijo, igual que la evidencia P1 inicial. No se ocultan ni alteran componentes.

| Escenario | Lectura canónica esperada | Prisma 320 visible / oculto |
|---|---|---|
| `history-increase` | Flujo aumentó; gasto mayor; patrimonio aumentó | [visible](history-increase-light-320-visible.png) / [oculto](history-increase-light-320-hidden.png) |
| `history-decrease` | Flujo disminuyó; gasto menor; patrimonio disminuyó | [visible](history-decrease-light-320-visible.png) / [oculto](history-decrease-light-320-hidden.png) |
| `category-stable` | Categoría dominante; gasto estable | [visible](category-stable-light-320-visible.png) / [oculto](category-stable-light-320-hidden.png) |
| `history-no-changes` | Sin cambios destacados, con ingresos en ambas ventanas | [visible](history-no-changes-light-320-visible.png) / [oculto](history-no-changes-light-320-hidden.png) |

El caso sin cambios conserva historia e ingresos, con variaciones por debajo de los thresholds existentes; se distingue del escenario vacío ya probado en P1. El fallback editorial no lleva importes: sus versiones visible/oculta muestran el mismo titular y explicación. Se comprueba igualmente que el árbol accesible de toda la página no filtre dinero al ocultarlo.

[`history-verification.json`](history-verification.json) registra orden, copy exacto, protagonista y secundarios, límites responsive y privacidad por variante. Los tipos “nuevo” permanecen documentados en las veinte capturas iniciales; los siete tipos siguen cubiertos en el smoke.

## Decisiones verificadas

- El contrato P1 no exige `✦ Lectura rápida` como título de sección. `Lo más relevante del rango` y el kicker por foco se conservan desde antes de PR #111; el copy obligatorio se refiere a los insights. El cuerpo `Actual … · anterior …` mantiene datos canónicos y no añade copy causal.
- En escritorio, el article principal ocupa ambas columnas y el titular limita su línea a `28ch`. El espacio a la derecha es intencional para controlar longitud de lectura y separar el peso del protagonista de los secundarios. No se añade contenido para rellenarlo.
- El `De` del rango global es previo a P1: CSS `capitalize` en el header capitaliza la preposición del formatter. Registrado por separado en [issue #112](https://github.com/Juno002/Glitchbudget-pro/issues/112). No bloquea este gate ni se corrige dentro de Final UI Polish sin autorización.


## Gate de la ampliación

`npm run check`: **742/742**; `npm run build`: export estático y guard CSP/local-only aprobados; `npm run test:e2e`: **32/32** variantes históricas y smoke completo aprobados, además de los siete tipos y matriz original P1. Node v24.19.0 / Chromium 151 / Linux x64, mismo executor cloud. P1 no exige benchmark propio.

El helper espera a que el ancho de página se ajuste tras cambiar entre escritorio y móvil antes de leer geometría y fotografiar. Usa el criterio de overflow existente y el timeout estándar del smoke; un overflow persistente continúa fallando el gate. No se modifica producto.
