# Efectivo, bancos y tarjetas

Inicio elegido: saldos actuales y movimientos desde ahora. Todo sigue guardándose en el navegador, sin conexión a bancos.

## Uso

1. En Movimientos, abre Configurar mis saldos. Crea Efectivo y cada banco con el saldo actual. No hacen falta números de cuenta ni credenciales.
2. Incluye en el saldo inicial las operaciones que ya hiciste hoy. Los movimientos antiguos quedan sin cuenta para no contarlos dos veces.
3. Los ingresos nuevos piden cuenta de destino; los gastos y pagos de tarjeta, cuenta de origen. Las compras a crédito piden la tarjeta y no descuentan bancos.
4. Para sacar efectivo del banco, usa Gestionar cuentas → Mover dinero entre mis cuentas. Para depositarlo, invierte origen y destino. Una comisión se registra como gasto separado.
5. Conciliar deuda actual permite introducir lo que debes en cada tarjeta, independientemente de sus movimientos anteriores. Un saldo negativo significa saldo a favor.
6. Pulsa una cuenta para consultar sus 50 movimientos recientes y editar sus datos. Las transferencias se pueden editar desde ese historial.

## Qué significa cada cifra

Mi dinero hoy usa saldos iniciales más cobros reales menos pagos reales y transferencias, hasta la fecha actual. Suma efectivo y bancos y muestra la deuda y el saldo neto de las cuentas y tarjetas registradas. No incluye otras propiedades u obligaciones no registradas.

El disponible del mes sigue siendo una planificación. El sueldo configurado no deposita dinero automáticamente. Un gasto fijo registrado afecta a la cuenta una vez; sus proyecciones de meses siguientes solo afectan al presupuesto. Registrar el pago real de cada período es necesario para mantener el saldo de la cuenta. Para pagos repetitivos conviene usar Suscripciones y registrar cada pago.

En modo estricto, un gasto con cuenta comprueba el saldo de esa cuenta. Los movimientos antiguos sin cuenta conservan la validación mensual anterior. Los aportes a metas y el ahorro sugerido reservan presupuesto, pero no trasladan dinero físicamente; una transferencia registra un traslado entre bancos o efectivo.

## Datos y recuperación

Base de datos v8: añade accounts y account_transfers; los movimientos anteriores no reciben una cuenta automáticamente. Las nuevas relaciones son opcionales para conservar el historial.

Respaldo JSON v4: incluye cuentas, transferencias, referencias de movimientos y ajuste inicial de tarjetas. Se aceptan respaldos v3 antiguos, que restauran sin cuentas. Importar reemplaza el contenido actual, igual que antes. Versiones viejas de la app no pueden leer un respaldo v4; usa la versión actualizada para restaurarlo.

CSV de ingresos/gastos conserva accountId; para trasladar cuentas y transferencias usa el JSON completo. Las referencias a cuentas desconocidas se rechazan antes de reemplazar datos.

## Validación

Pruebas de retiro sin ingresos/gastos artificiales, saldos iniciales sin duplicar historial, gasto real frente a proyección, concurrencia, edición de transferencia, pago de tarjeta, ida/vuelta de respaldo v4 y migración desde v7. Los datos usados para verificar son ficticios.

El 21 de septiembre pasaron 50 pruebas, tipos y lint. En la interfaz local de prueba (puerto 9007), banco 10.000 + efectivo 500, retiro de 2.000 y gasto de 100 dejaron banco 8.000, efectivo 2.400 y saldo neto 10.400. El retiro no creó ingresos ni gastos. A 360 × 740 el diálogo quedó dentro de pantalla, sin desbordamiento horizontal y con desplazamiento hasta el botón final. Falta confirmar el teclado y la instalación en un teléfono físico.
