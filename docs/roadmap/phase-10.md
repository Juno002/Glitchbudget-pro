# Fase 10 — Goals 2.0

**Estado: implementación completada e integrada en main mediante el [PR #6](https://github.com/Juno002/Glitchbudget-pro/pull/6), commit 60b50e9, el 28/09/2026.** Consulta el [índice acumulado](README.md) para las demás fases.

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 10. Implementación autorizada durante el cierre de Fase 9; cierre técnico el 2026-09-28. No inicia Fase 11.

## Modelo y semántica

- El progreso tiene una sola fuente: `saved = sum(goal_contributions.amount)`. Ni `saved` ni `status` se almacenan en la meta; ambos se derivan para Plan, Resumen y logros.
- Aportar registra una reserva de planificación. No crea ingresos, gastos, pagos de tarjeta ni transferencias, y no modifica efectivo, bancos o patrimonio.
- Se muestran objetivo, ahorrado, restante, porcentaje, fecha límite y aporte mensual requerido. Los importes de consulta respetan la privacidad visual.
- El importe requerido divide el restante entre los períodos financieros desde el actual hasta el que contiene el plazo, ambos incluidos. Utiliza Period Engine y redondea hacia arriba al centavo. Respeta el día inicial configurado, los cambios de año y febrero.
- Sin plazo se invita a definirlo. Un plazo vencido muestra el pendiente completo; una meta completada requiere cero. El exceso de aportes permanece visible y nunca produce un restante negativo.
- La cuota elegida es solo una referencia. No genera aportes automáticos ni inventa fondos. La aportación no se bloquea por liquidez: el margen de planificación puede ser negativo, de acuerdo con la separación de políticas existente.

## Flujos

Plan → Metas permite crear, editar objetivo/plazo/cuota, aportar y eliminar con confirmación. Editar conserva el historial de aportes; eliminar quita sus reservas, sin tocar movimientos reales. Los servicios validan fechas, montos enteros seguros, referencias e identificadores. Las aportaciones concurrentes no pierden actualizaciones y solo la que cruza el objetivo señala su finalización.

Se reemplazan las sugerencias heurísticas anteriores por el aporte calculado con el calendario financiero. Resumen presenta el mismo progreso y la misma recomendación, y mantiene una selección compacta de metas activas.

## Migración y respaldos

Dexie v12 elimina el almacenamiento independiente de progreso/estado. Cuando el antiguo `saved` supera los aportes existentes, conserva solo la diferencia como un aporte identificado `legacy_balance`. Si los aportes ya superaban `saved`, se conserva todo su historial. La transformación es idempotente y atómica: datos inválidos abortan la migración sin borrar la base anterior.

El saldo heredado cuenta para el progreso, pero no como una reserva nueva del mes ni como un movimiento real. Se explica en la tarjeta de la meta. No se inventa una salida de efectivo para cuadrar datos antiguos.

JSON v8 exporta el modelo canónico y mantiene lectura de v3–v7. Los respaldos completos conservan metas, aportes, cuentas, saldos y rangos presupuestarios. Se rechazan duplicados, aportes huérfanos y desbordamientos antes de reemplazar datos.

CSV actual conserva la columna `kind` de los aportes y permite restaurar metas y aportes sin duplicación. Un CSV antiguo de metas con progreso no explicado por los aportes existentes se rechaza antes de mutar, indicando usar el JSON completo: importar ese total y luego sus aportes por separado podría duplicar el progreso. Los CSV de planes preservan los cuatro tipos y su metadata.

## Validación

Dos pruebas de caracterización se ejecutaron antes de cambiar el modelo. Diez pruebas de Fase 10 cubren migración idempotente, conservación del historial, concurrencia, fechas, calendario financiero, overflow, eliminación neutral, JSON v7→v8, actualización Dexie v11→v12 y rollback de una actualización inválida. Las pruebas históricas conservan sus fixtures y verifican la representación migrada.

La suite integrada y el build estático se registran al final de este documento. Incluyen regresiones CSV, rollover independiente de visitar Plan, navegación móvil local y accesibilidad de las barras. La CSP conserva `connect-src 'none'` y el precaché contiene 44 recursos.

## Límites

No vincula metas a cuentas ni introduce pagos automáticos, monedas nuevas o inversiones. La comprobación con teclado virtual y dispositivos Android/iOS físicos sigue siendo QA de release; la emulación de ancho móvil no la sustituye.

## Gate técnico integrado de Fases 9 y 10

- `npm run check`: 259/259 pruebas, typecheck, lint y guard local-only aprobados.
- `npm run build`: exportación estática correcta, 44 recursos de precaché, sin importador de diagnóstico y con `connect-src 'none'` en cada HTML.
- QA de producción con datos sintéticos en un origen separado: crear meta de RD$ 1,000, editar su plazo al 31/12/2026 y aportar RD$ 100. Plan y Resumen muestran ahorrado 100, restante 900, progreso 10% y aporte requerido 225 para cuatro períodos. La liquidez y patrimonio permanecen en RD$ 870.
- Navegación móvil entre Resumen/Movimientos/Plan/Reportes, sin 404 ni errores de consola. Viewport de 360 px, documento de 354 px útiles sin desbordamiento horizontal.
- Corregida una pista de progreso que parecía llena por usar el color secundario saturado: ahora es neutra, y el control expone `aria-valuenow` con el porcentaje real. Regresión de accesibilidad para 0/10/100%.
- Cerradas todas las ventanas de prueba para activar el nuevo service worker, conservando datos; posteriormente, con el servidor apagado, recarga y consulta de metas persistidas correctas, sin errores de consola.
- Confirmada visualmente la tarjeta completa y sus acciones en tema claro móvil. Esto no afirma validación física de teclado Android/iOS.

Implementación de Fase 10 completada. Fase 11 queda fuera de este cambio.
