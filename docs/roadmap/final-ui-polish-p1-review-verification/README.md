# P1 — correcciones de la revisión editorial

Evidencia de las cuatro correcciones solicitadas el 4 de octubre de 2026. El contrato P1 y la autorización del roadmap se actualizaron antes de implementar el copy. No inicia P2 ni modifica métricas, ranking o thresholds.

## Reproducción

```sh
npm run build
FINAL_UI_POLISH_P1_CAPTURE_DIR=/tmp/p1-review FINAL_UI_POLISH_P1_HISTORY_CAPTURE_DIR=/tmp/p1-review npm run test:e2e
```

Mismo reloj financiero `2026-10-04T12:00:00.000Z`, UTC, moneda DOP y locale es-DO. El fixture histórico v2 añade el cruce negativo → positivo, conservando datos canónicos enteros en centavos. Se restaura exactamente el dataset original al terminar. Los fixtures solo existen en el perfil temporal de test.

## Correcciones

- Símbolo y número forman un token `white-space: nowrap` después de `usePrivateCurrency()`. El formato monetario permanece intacto. El test comprueba una sola línea del token y límites de viewport tanto con importes visibles como ocultos.
- En cruces estrictos, flujo neto usa “El flujo neto pasó de positivo a negativo” o “El flujo neto pasó de negativo a positivo”. La key estructurada `cash_flow_sign_change` conserva current/previous/percentageDelta; React omite el porcentaje del cuerpo editorial. La tabla exacta conserva −400% y +133.33%, verificados en ambos estados de privacidad. Cero y signos iguales mantienen las reglas anteriores.
- Categoría usa “La categoría con mayor participación en el gasto”, válida para todo el umbral existente (tests a 35%, 80% y 100%). No introduce tramos, thresholds ni reordenación.
- El fallback mantiene el titular y usa “Ninguna métrica principal cambió lo suficiente para destacarla.”, sin copy causal ni conclusiones sobre causas o bienestar.

## Capturas

Veinte variantes del dataset P0: Prisma/Neón 320/360/390/1280 y legado 320/1280, visibles/ocultas. Cuarenta variantes históricas: cinco escenarios × Prisma/Neón × 320/1280 × visible/oculto. Se fotografía solo la sección editorial con altura temporal 1600 para que el shell fijo no tape el recorte; geometría verificada a altura 844. Las capturas previas P0, P1 y PR #113 se conservan como evidencia histórica.

| Caso | Visible | Oculto |
|---|---|---|
| Símbolo/importe a 320 | [Prisma](history-increase-light-320-visible.png) | [Prisma](history-increase-light-320-hidden.png) |
| Positivo → negativo | [Neón escritorio](history-decrease-dark-1280-visible.png) | [Neón escritorio](history-decrease-dark-1280-hidden.png) |
| Negativo → positivo | [Neón 320](history-sign-recovery-dark-320-visible.png) | [Neón 320](history-sign-recovery-dark-320-hidden.png) |
| Categoría / estable | [Prisma 320](category-stable-light-320-visible.png) | [Prisma 320](category-stable-light-320-hidden.png) |
| Sin cambios | [Neón 320](history-no-changes-dark-320-visible.png) | [Neón 320](history-no-changes-dark-320-hidden.png) |

[Registro de la matriz original](verification.json) y [registro histórico](history-verification.json), incluyendo geometría de cada token monetario, privacy/AX, orden y copy exacto. Las variables solo habilitan archivos: los controles se ejecutan siempre.

## Gate

`npm run check`: **745/745** (10 tests del presenter). `npm run build`: aprobado, export estático y CSP/local-only. `npm run test:e2e`: aprobado, **40/40** variantes históricas más matriz original de veinte, siete tipos, base cero, Prisma/Neón/legado, foco, touch, reduced motion, loading/vacío, cuatro tablas, tooltip privado, navegación y recarga offline. P1 no requiere benchmark propio; P0 y contrato P3 intactos.

Entorno: Node v24.19.0, Chromium 151, Linux x64, executor cloud. Bloqueantes: ninguno. El formato “De” del shell sigue registrado aparte en issue #112 y no se modifica en este PR.


**Gate aprobado · PR #114** — [PR de las cuatro correcciones](https://github.com/Juno002/Glitchbudget-pro/pull/114). Integración efectiva únicamente con `merged=true` en GitHub. Se conserva el cierre original P1 en #111; P2 no se inicia.
