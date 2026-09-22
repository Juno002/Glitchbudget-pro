# Revisión de preparación comercial — 17 de septiembre de 2026

Alcance: aplicación personal con datos locales, sin cuentas, sincronización ni IA. Estado: candidata a prueba piloto; no certificada para venta general.

## Correcciones de esta revisión

- Pagos de tarjetas y aportes a metas validan fecha, monto y saldo del mes en modo estricto dentro de una transacción. Operaciones simultáneas no pueden gastar el mismo saldo.
- Cierre de mes transaccional: conserva presupuestos existentes, no duplica el arrastre y cruza diciembre/enero correctamente. La estrategia reset conserva su comportamiento actual: no genera presupuestos nuevos automáticamente.
- Exportación/importación accesible aunque el navegador no admita OPFS.
- Aviso de actualización disponible sin forzar una recarga ni descartar formularios.
- Ayuda y privacidad dentro de Ajustes, con explicación del disponible, respaldo y almacenamiento local.
- Cabecera adaptable: a 360 px se detectó un ancho de 406 px; corregida y comprobada sin desbordamiento de página a 320 y 360 px.
- Controles de mes, ajustes, logros, modo estricto y presupuestos con etiquetas accesibles.
- Confeti desactivado en modo minimalista y cuando el sistema pide reducir movimiento.

## Matriz de evidencia

| Área | Estado | Evidencia y alcance |
| --- | --- | --- |
| Cálculos y escritura de movimientos | Aprobado en casos cubiertos | Pruebas de fechas, centavos, reservas de presupuestos, modo estricto y concurrencia. |
| Metas y pagos | Aprobado en casos cubiertos | Rechazo por saldo o fecha, tarjeta cerrada, rollback de aporte y pago/aporte simultáneos. |
| Cambio de mes | Aprobado en casos cubiertos | Diciembre/enero, exceso que reduce límite a cero, doble solicitud y mes preparado manualmente. |
| JSON y CSV | Aprobado a nivel de servicio | Validación previa, respaldo antiguo v3, integridad de referencias, rollback y descripciones con comas/comillas/saltos. |
| Historial amplio | Aprobado a nivel de servicio | Exportar/restaurar 10.000 gastos y conservar cantidad y total. No equivale a medir fluidez en teléfono. |
| Temas | Parcial | Resumen claro/minimalista revisado antes; selector móvil con fondo claro y texto oscuro comprobado, minimalista persistente tras recarga. Falta toda la matriz de pantallas con datos. |
| Pantallas estrechas | Parcial | Revisión a 320×568 y 360×740. Resumen, planificación y reportes sin desbordamiento de página; formulario de movimiento dentro de 328 px con márgenes a 360 px. No incluye teclado físico móvil. |
| Ventanas largas y foco | Aprobado en recorrido de ayuda | Ayuda limitada a 708 px de alto en pantalla de 740, desplazamiento interno y retorno al disparador al cerrar. |
| Presupuesto desde interfaz | Aprobado en recorrido | Creación ficticia de 500, cierre al guardar, importe persistido en lista y aviso de éxito. |
| Aviso de logros | Confirmado por usuario | Usuario confirmó resuelto el recorte original. |
| Accesibilidad completa | Pendiente | Faltan lector de pantalla, navegación integral, contraste de todos los estados y zoom 200 %. |
| Uso sin conexión | Parcial | Apertura y registro sin servidor comprobados en pasada anterior; falta instalación física y actualización entre versiones conservando datos. |
| Respaldos desde interfaz | Pendiente integral | Falta ida y vuelta de archivo descargado/importado en navegadores móviles objetivo. |
| Piloto y entrega comercial | Pendiente | Dispositivos objetivo, participantes, canal de distribución, precio/licencia, soporte y textos legales finales. |

## Validación automatizada

34 pruebas aprobadas el 17 de septiembre. Tipos, lint y compilación de producción aprobados después de los últimos cambios; 43 recursos preparados para uso sin conexión. El caso de 10.000 movimientos tardó aproximadamente un segundo en el entorno de pruebas; no es una promesa de rendimiento móvil.

## Condiciones para liberar

1. No tener fallos críticos conocidos que impidan guardar, consultar o recuperar datos.
2. Aprobar instalación y actualización física en al menos un Android; incluir iOS si se ofrece soporte allí.
3. Completar importación/exportación desde interfaz, cierre inesperado y recuperación de errores de almacenamiento.
4. Revisar todas las pantallas con datos y los tres temas, teclado móvil, foco y contraste.
5. Ejecutar un piloto con usuarios nuevos y resolver incidencias bloqueantes.
6. Aprobar las decisiones comerciales y de soporte; publicar una versión identificable con notas de cambios.

## Límites y decisiones de producto

El disponible del mes es una proyección presupuestaria, no patrimonio ni saldo bancario. Desde el 21 de septiembre, «Mi dinero hoy» muestra por separado efectivo, bancos y deuda de tarjetas, con saldos iniciales y movimientos asignados. Las compras con tarjeta no descuentan efectivo hasta registrar el pago. Los gastos fijos son proyecciones mensuales desde su fecha inicial; editar uno afecta esas proyecciones. En las cuentas, cada movimiento registrado se contabiliza una sola vez. Véase accounts.md para el inicio del seguimiento y los respaldos v4.

No hay cifrado de respaldos ni sincronización. Cambiar de origen, navegador o dispositivo cambia el almacenamiento visible. Borrar datos del sitio elimina también las copias OPFS. El respaldo externo JSON es la vía de traslado y recuperación.

Los puertos locales 9003, 9004, 9005 y 9006 son pruebas con almacenamiento separado. 9003 puede contener un ingreso ficticio y 9006 un presupuesto ficticio de 500. No se usaron datos financieros reales para las pruebas nuevas.

## Ampliación de cuentas — 21 de septiembre

50 pruebas aprobadas, incluyendo migración v7 → v8, recuperación JSON v4, transferencias y protección de saldos con movimientos simultáneos o editados. Tipos y lint aprobados. Flujo de alta, retiro y gasto comprobado en navegador con datos ficticios en 9007. Diálogo revisado a 360 × 740, contenido desplazable y sin recorte horizontal; no sustituye la prueba del teclado en teléfono físico. Los pendientes comerciales y de instalación indicados arriba permanecen abiertos.

## Revisión de regresiones — 22 de septiembre

- El formulario de movimiento sobrescribía el desplazamiento vertical con overflow-hidden. Reproducido a 360 × 400: contenido de 394 px en 367 px disponibles, botón recortado. Corregido y comprobado desplazamiento hasta el botón completo.
- El mes del historial solo tomaba el selector global al montar la pantalla. Ahora se sincroniza cuando cambia el mes global; comprobado septiembre → agosto → septiembre.
- Las opciones de categoría se calculaban sobre la lista ya filtrada, ocultando alternativas. Ahora usan todos los movimientos del período; una categoría ausente al cambiar de mes vuelve a «Todas», comprobado desde interfaz.
- Eliminar ingresos y reducir saldos iniciales podía dejar una cuenta negativa pese al modo estricto. Ambas rutas comprueban los movimientos registrados dentro de la transacción; la corrección sin modo estricto sigue permitida.

53 pruebas aprobadas, tipos, lint y compilación de producción correctos. Vista previa 9007 actualizada, sin errores de consola en el recorrido comprobado. Esta revisión no sustituye el piloto ni las pruebas pendientes en dispositivos físicos.

## Ajustes a partir de capturas del teléfono — 22 de septiembre

Las capturas aportadas muestran mes truncado, botón flotante sobre importes, pestañas inactivas con mayor fondo que la activa y formulario desplazado fuera de pantalla al abrir el teclado. Se abrevia el mes conservando el año, el botón de alta móvil pasa a la cabecera y las pestañas resaltan únicamente la opción activa. Los gráficos reciben títulos, nombres de categorías legibles y tooltip con superficie del tema.

Los diálogos normales y de confirmación se dimensionan con visualViewport (altura y desplazamiento), con actualización al abrir teclado o desplazar la vista. Verificado en navegador a 320 × 400: diálogo entre y=16 e y=384, desplazamiento interno y aviso de categoría pendiente. Esta simulación no confirma por sí sola el comportamiento del teclado físico; queda pendiente repetir en el teléfono de las capturas.
