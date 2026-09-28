# Entrega y prueba piloto

## Versión candidata

Usar Node.js 22 o superior, instalar con npm ci, ejecutar npm run check y npm run build. No ignorar fallos. Registrar commit, versión y fecha junto a resultados. Conservar el paquete desplegado anterior para volver a publicarlo si hay regresión; no restaurar bases de usuarios automáticamente.

## Recorridos del piloto

- Configurar ingreso y crear presupuestos semanal, mensual, anual y único. Registrar un gasto y comprobar que afecta cada rango que contiene su fecha sin duplicarse en el ledger. Editar fecha e importe y verificar que los rangos afectados se recalculan.
- Probar rollover en un rango repetible y confirmar que no sobrescribe un período ya editado; comprobar que un presupuesto único no se repite automáticamente.
- Reasignar límite entre dos categorías del mismo rango y comprobar que no cambian cuentas, ingresos, gastos ni transferencias reales.
- Crear tarjeta, registrar compra y pago. Intentar exceder el saldo de una cuenta con un **movimiento real** en modo estricto y comprobar que no se guardó.
- Crear meta con plazo y aporte. Confirmar que el progreso deriva de los aportes, que el aporte mensual requerido usa el período financiero y que aportar no cambia saldos de cuentas aunque el margen de planificación quede negativo.
- En una base limpia, cambiar la moneda base y confirmar que Efectivo/cuentas nuevas adoptan el nuevo código sin modificar importes.
- Con cualquier importe financiero ya registrado, intentar cambiar la moneda base: debe rechazarse sin alterar ajustes, cuentas ni movimientos.
- Confirmar que una transferencia entre cuentas de monedas distintas es rechazada mientras no exista tasa manual; no debe aparecer ingreso, gasto ni transferencia parcial.
- Exportar JSON v11, registrar un dato ficticio adicional, restaurar con confirmación y comparar los registros esperados. Repetir con archivo dañado: no debe alterar nada.
- Importar un backup legacy v8 y comprobar que cuentas/movimientos adoptan la moneda base, fxRate 1 y amountBase equivalente al importe histórico.
- Importar CSV de ingreso/gasto con metadatos de otra moneda y una cuenta base válida: el registro final debe normalizarse a la moneda de la cuenta, no conservar una tasa inyectada.
- Instalar app, cerrar/abrir sin conexión, registrar movimiento y volver a conectar. Publicar una actualización de prueba y verificar datos y tema conservados.
- Recorrer claro, oscuro y minimalista con importes grandes y nombres largos, a 320/360 px y escritorio, zoom 200 % y teclado móvil.

## Registro de incidencia

Anotar navegador y versión, sistema, versión de app, pasos, resultado esperado y real. Adjuntar captura sin datos personales. No solicitar respaldos financieros completos por defecto.

## Decisiones del propietario antes de venta

Elegir Android/iOS/escritorio soportados, canal y dirección definitiva, precio/licencia, contacto de soporte y política de mantenimiento. Preparar información de privacidad y condiciones ajustadas a ese canal. Estos puntos requieren decisiones del propietario; no se han inventado ni publicado términos.

## Criterio de salida

Completar la matriz de quality-review.md, no dejar incidencias críticas de pérdida de datos, probar recuperación y documentar limitaciones conocidas. La aplicación seguirá necesitando mantenimiento tras la venta.

- Registrar una inversión que ya existía: comprobar que su valor actual aparece como activo inicial, sin ingreso ni transferencia.
- Registrar una inversión nueva desde un banco: comprobar Banco − principal, Inversión + principal, gasto = 0, ingreso = 0 y patrimonio neto sin cambio.
- Intentar abrir una inversión nueva sin fondos en modo protegido: no debe quedar cuenta, inversión ni transferencia parcial.
- Confirmar que una cuenta de inversión no aparece en selectores de ingreso/gasto/pago y que la transferencia genérica no permite retirar ni añadir capital.
- Para una inversión con tasa y vencimiento, verificar Principal, Tasa, Apertura, Vencimiento, Tiempo transcurrido, Días restantes, Valor al vencimiento e Interés estimado.
- Confirmar que el valor e interés futuros están etiquetados como ESTIMADOS y que no cambian el patrimonio real.
- Importar un JSON v9 sin inversiones: debe restaurar con cero inversiones. Importar un JSON v10 con cuenta de inversión huérfana: debe fallar antes de reemplazar datos.


## Reports 2.0 — Fase 13

- Verificar 7D, 30D, 3M, 6M y 1Y contra fechas conocidas; el final debe ser hoy y los límites inclusivos.
- Probar Custom con inicio/final válidos y confirmar que una fecha futura es rechazada.
- Para cada rango, comprobar que el previous comparable period termina el día anterior y contiene exactamente la misma cantidad de días.
- Registrar un gasto cash y una compra con tarjeta: ambos deben aparecer una vez en Spending; solo el cash debe salir de Cash expenses.
- Registrar un pago de tarjeta: debe aparecer en Debt payments y reducir Net cash flow sin añadir un segundo gasto.
- Comprobar Categories y Fixed / Variable / Occasional como dimensiones separadas.
- Confirmar que Largest transactions ordena por importe real del rango.
- En Net Worth, comprobar Cash + Banks + Investments + saldo a favor real − Credit-card liabilities. El crédito disponible y el rendimiento estimado de inversiones no entran.
- Seleccionar un rango que empiece después de un movimiento histórico: el movimiento no aparece en Spending del rango, pero sí sigue afectando Net Worth a la fecha final.
- Comparar Resumen y Reportes en la misma fecha: Disponible líquido, Investments, liabilities y Net Worth deben provenir del mismo selector compartido.
- Activar ocultar importes y confirmar que los montos de Reports 2.0 quedan protegidos mientras los porcentajes no sensibles pueden seguir visibles.


## Home 2.0 — Fase 14

- Confirmar que Home muestra como máximo los cinco módulos principales: Posición financiera, Presupuesto disponible, Próximos pagos, Metas relevantes e Inversiones.
- Comparar Posición financiera con Reportes en la misma fecha: disponible líquido, inversiones, liabilities y patrimonio neto deben provenir del selector compartido.
- Crear/exceder presupuestos y comprobar que Home refleja restante/estado sin permitir edición directa; la administración sigue en Plan → Presupuestos.
- Crear ocurrencias vencidas y próximas: Home debe ordenar vencido → hoy → mañana → próximos 7 días y mantener Confirmar/Omitir.
- Crear meta activa con fecha límite: Home debe reutilizar progreso y aporte mensual requerido ya derivados por Goals 2.0.
- Registrar inversión con vencimiento: Home debe mostrar valor real registrado y días restantes sin sumar rendimiento futuro estimado.
- Probar Personalizar Home: ocultar/mostrar, subir/bajar módulos, elegir sección inicial y restablecer.
- Intentar ocultar todos los módulos: debe permanecer al menos uno visible.
- Corromper manualmente `glitchbudget_home_preferences_v1`: Home debe recuperar un contrato válido sin afectar datos financieros.
- Ejecutar Borrar todos los datos: la personalización de Home debe volver a valores por defecto.
- Confirmar que Movimientos recientes ya no aparece en Home y que el historial completo sigue en Movimientos.
- Confirmar que Ahorro sugerido sigue disponible en Ajustes → Finanzas y que modificarlo no mueve dinero.


## Transaction Metadata + filtros — Fase 15

- Crear gasto con Must/Need/Want y varias etiquetas; editarlo y confirmar que la metadata se conserva.
- Crear ingreso con etiquetas y confirmar que no aparece selector de necessity.
- Introducir etiquetas repetidas con mayúsculas/espacios: deben deduplicarse y normalizarse.
- Verificar filtros individuales y combinados por cuenta, categoría, fecha, monto, necesidad, etiqueta y tipo.
- Confirmar que una transferencia coincide con cualquiera de sus dos cuentas al filtrar por cuenta.
- Guardar un filtro local, recargar y aplicarlo; la búsqueda textual libre no debe quedar aplicada silenciosamente.
- Eliminar un filtro guardado y confirmar que no cambia movimientos ni backups.
- Exportar JSON v11 con metadata y restaurarlo; importar un JSON v10 debe dejar metadata ausente, no inventarla.
- Exportar/importar CSV actual con necessity/labels y comprobar round-trip; CSV legacy sin las columnas nuevas debe seguir importando.
- Ejecutar “Borrar todos los datos” y confirmar que también desaparecen los filtros guardados locales.
- Confirmar que no existen campos de ubicación, garantías, loyalty cards ni receipts en Quick Add o filtros.
- Confirmar que no existe clasificación automática ni transmisión de descripciones; eso pertenece a Fase 16.
