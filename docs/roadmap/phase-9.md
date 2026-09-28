# Fase 9 — Budgets 2.0

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 9. Continuación autorizada el 2026-09-27. Implementación completada e integrada en `main` el 2026-09-28 mediante el PR #6.

## Estado al iniciar el cierre (histórico)

Al comenzar, `main` local y `origin/main` coincidían en `487ccc2` (Fase 8 integrada). GitHub contenía además `phase-9-budgets-2` en `307b0cd`, con 17 commits adicionales y el PR #6 abierto. Se continuó esa implementación, conservando su historial.

## Alcance

- Límite, gastado, restante, porcentaje y estado para cada categoría y rango.
- Semanas de lunes a domingo, meses financieros configurables, años calendario y rangos únicos inclusivos mediante el mismo Period Engine.
- Navegación anterior/siguiente, fecha de referencia y acceso a rangos guardados, incluidos los únicos.
- Edición explícita del límite, sin guardados diferidos al abandonar una pantalla. Los importes de consulta respetan la privacidad visual.
- Resumen conserva el total mensual y muestra hasta tres límites adicionales activos, sin sumar límites solapados. Reportes permite consultar los cuatro tipos completos.
- Todos los presupuestos que contienen la fecha real del gasto participan en `allow / warn / block`. La confirmación se invalida si cambian límites o gastos antes del guardado.
- Rollover mensual, semanal y anual con la política existente; un rango único no se repite automáticamente. Es idempotente y no sobrescribe un período que ya tiene límites.
- Reasignación entre categorías del mismo rango: modifica límites, nunca cuentas, ingresos, gastos ni transferencias bancarias.

## Semántica e invariantes

Los presupuestos son controles de planificación. Un mismo gasto puede consumir un límite semanal y otro anual, pero se registra una sola vez en el ledger. Los límites no mensuales no se añaden a las reservas mensuales ni reducen el efectivo. No se altera `monthlyResult`, `cashFlow` ni `liquidAssets`.

Los límites mensuales siguen el día inicial configurado en Ajustes, igual que en Fase 6. Su metadata histórica no congela un calendario diferente del que usa Resumen. Un formulario abierto con un calendario anterior debe volver a seleccionar el rango antes de guardar.

Un límite explícito de cero sigue siendo un presupuesto activo: no equivale a una categoría sin presupuesto. Se mantiene la política de excesos existente y se distingue visualmente. Sin límite positivo, el porcentaje se muestra como «—» para evitar una división por cero engañosa.

## Persistencia y compatibilidad

Se mantiene la clave compuesta `[month+categoryId]`. `month` continúa como identificador mensual histórico; los nuevos tipos utilizan prefijos distintos. `periodType`, `periodStart` y `periodEnd` son metadata opcional para compatibilidad con registros anteriores.

Fase 9 no necesita una nueva tabla ni una reescritura del ledger. JSON v7 conserva los rangos; la continuación de Fase 10 eleva el backup a v8 por su modelo de metas y mantiene lectura de v7. La importación valida límites enteros seguros, rangos completos/canónicos y claves duplicadas antes de reemplazar datos. CSV conserva también la metadata opcional de períodos, manteniendo presupuestos mensuales antiguos.

## Correcciones encontradas durante el cierre

1. Los límites mensuales desaparecían de Plan al cambiar el calendario, aunque la política seguía evaluando el rango viejo.
2. Una reasignación podía desbordar el máximo entero admitido.
3. Los respaldos admitían períodos inconsistentes y duplicados; el guardado directo de límites tampoco tenía la misma validación.
4. Faltaban navegación semanal y recuperación de rangos únicos.
5. Reportes solo consultaba presupuestos mensuales; Resumen no mostraba otros límites activos.
6. `ProgressMetric` había impuesto «Gastado/Límite» también a las metas; ahora las etiquetas son configurables.
7. La navegación móvil usaba enlaces de Next para cambiar paneles locales. Con la CSP local, el intento de cargar RSC acababa en `/index.txt` y una pantalla 404. Los paneles usan botones locales y el logotipo usa navegación HTML estática.
8. La exportación CSV de planes no preservaba los rangos nuevos.
9. El rollover dependía de haber visitado Plan antes de registrar un gasto. Ahora se prepara al iniciar la app y dentro de la transacción de guardado, antes de evaluar todos los límites activos.
10. La advertencia de exceso ahora respeta la privacidad visual y distingue correctamente uno o varios límites adicionales.

## Validación

- La rama remota original pasó 229/229 pruebas.
- Tras las correcciones de dominio y UI, 241/241 pruebas, typecheck, lint y guard local-only pasaron. Ese checkpoint intermedio también validó el build estático y mantuvo `connect-src 'none'`.
- Las regresiones añadidas cubren calendario cambiado, overflow atómico, respaldo inválido sin pérdida de datos, límites inválidos, consentimiento obsoleto, rollover idempotente, round-trip de los cuatro tipos y legacy, límites inclusivos, no duplicación de reservas, fechas de año/bisiesto y presupuesto cero.
- QA con datos sintéticos en un origen separado: ingreso 1,200; gasto inicial 300; límite semanal editado de 500 a 600; reasignación de 50 a Transporte; gasto adicional de 30. Plan y Reportes mostraron límite semanal 550, gastado 330, restante 220 y 60%. La liquidez permaneció en 870.
- Aviso simultáneo de dos presupuestos, cancelación sin movimiento, privacidad visual, rango único guardado, tema claro y ancho móvil de 360 px sin desbordamiento horizontal verificados.
- Con el servidor de pruebas apagado, la app recargó y permitió consultar los presupuestos persistidos desde la caché.

La validación final integrada, incluida la navegación móvil corregida y CSV, se registra con el cierre de Fase 10: **259/259 pruebas** y build estático correctos en GitHub Actions, con **42 recursos** en el manifiesto offline final y `connect-src 'none'` en cada HTML. No se utilizaron datos financieros del navegador habitual del usuario.

## Definition of Done y límites

Archivos afectados: motor de períodos/presupuestos, servicios de límites/rollover, política y confirmación de gastos, adaptadores JSON/CSV, contexto financiero, controles de Plan/Resumen/Reportes, navegación local, patrones compartidos y pruebas de regresión.

Los cambios de calendario, solapamiento, reasignación y restauración conservan las invariantes financieras. No se implementan cuatro motores independientes. Semanas y años son calendario; la configuración del día inicial aplica al mes financiero. La validación física en Android/iOS sigue perteneciendo al QA de release.

Fase 9 queda completada e integrada junto con Fase 10. Fase 11 no se ha iniciado ni queda autorizada por continuidad implícita.
