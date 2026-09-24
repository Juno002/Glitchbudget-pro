# Efectivo, bancos y tarjetas

Inicio elegido: saldos actuales y movimientos desde ahora. Todo sigue guardándose en el navegador, sin conexión a bancos.

## Uso

1. Efectivo se crea automáticamente en cero; si ya existía una cuenta de efectivo, se conserva su saldo y se usa como predeterminada. En Movimientos, pulsa esa cuenta y Editar cuenta para indicar el dinero que tenías al iniciar el seguimiento. Crea cada banco desde Gestionar bancos con su saldo actual. No hacen falta números de cuenta ni credenciales.
2. Incluye en el saldo inicial las operaciones que ya hiciste hoy. Los movimientos antiguos quedan sin cuenta para no contarlos dos veces.
3. Todo ingreso nuevo se deposita en Efectivo. Los gastos y pagos de tarjeta usan Efectivo por defecto y permiten elegir otra cuenta de origen. Para llevar el ingreso al banco, registra una transferencia. Las compras a crédito piden la tarjeta y no descuentan bancos.
4. Para sacar efectivo del banco, usa Gestionar bancos → Mover dinero entre mis cuentas. Para depositarlo, invierte origen y destino. Una comisión se registra como gasto separado.
5. Conciliar deuda actual permite introducir lo que debes en cada tarjeta, independientemente de sus movimientos anteriores. Un saldo negativo significa saldo a favor.
6. Pulsa una cuenta para consultar sus 50 movimientos recientes y editar sus datos. Las transferencias se pueden editar desde ese historial.

## Qué significa cada cifra

Mi dinero hoy usa saldos iniciales más cobros reales menos pagos reales y transferencias, hasta la fecha actual. Suma efectivo y bancos y muestra la deuda y el saldo neto de las cuentas y tarjetas registradas. No incluye otras propiedades u obligaciones no registradas.

El resumen muestra Dinero en cuentas hoy (efectivo más bancos), ingresos registrados y gastos registrados del mes. Las compras con tarjeta cuentan como gasto; pagarlas reduce cuenta y deuda sin repetir el gasto. Reportes distingue resultado (ingresos menos compras) de flujo de efectivo (cobros menos gastos pagados directamente y pagos de tarjeta). El sueldo configurado no deposita dinero ni se suma a los ingresos reales. Un gasto fijo registrado afecta a la cuenta una vez; no se repite automáticamente en el historial ni en gráficos de meses posteriores. Registrar el pago real de cada período es necesario para mantener el saldo de la cuenta. Para pagos repetitivos conviene usar Suscripciones y registrar cada pago.

En modo estricto, un gasto con cuenta comprueba el saldo de esa cuenta. Los movimientos antiguos sin cuenta conservan la validación mensual anterior. El historial incluye saldos iniciales, transferencias, pagos de tarjeta y aportes a metas. Los aportes a metas y el ahorro sugerido reservan presupuesto, pero no trasladan dinero físicamente; una transferencia registra un traslado entre bancos o efectivo.

## Datos y recuperación

Base de datos v8: añade accounts y account_transfers; los movimientos anteriores no reciben una cuenta automáticamente. Las nuevas relaciones son opcionales para conservar el historial.

Respaldo JSON v4: conserva la cuenta de efectivo predeterminada e incluye cuentas, transferencias, referencias de movimientos y ajuste inicial de tarjetas. Se aceptan respaldos v3 antiguos, que restauran sin cuentas. Importar reemplaza el contenido actual, igual que antes. Versiones viejas de la app no pueden leer un respaldo v4; usa la versión actualizada para restaurarlo.

CSV de ingresos/gastos conserva accountId; para trasladar cuentas y transferencias usa el JSON completo. Las referencias a cuentas desconocidas se rechazan antes de reemplazar datos.

## Validación

Pruebas de retiro sin ingresos/gastos artificiales, saldos iniciales sin duplicar historial, gasto real frente a proyección, concurrencia, edición de transferencia, pago de tarjeta, ida/vuelta de respaldo v4 y migración desde v7. Los datos usados para verificar son ficticios.

El 21 de septiembre pasaron 50 pruebas, tipos y lint. En la interfaz local de prueba (puerto 9007), banco 10.000 + efectivo 500, retiro de 2.000 y gasto de 100 dejaron banco 8.000, efectivo 2.400 y saldo neto 10.400. El retiro no creó ingresos ni gastos. A 360 × 740 el diálogo quedó dentro de pantalla, sin desbordamiento horizontal y con desplazamiento hasta el botón final. Falta confirmar el teclado y la instalación en un teléfono físico.

## Consolidación de vistas (24 de septiembre)

Resumen y Mi dinero hoy comparten el cálculo de saldos. Historial y reportes usan operaciones registradas; los gastos fijos no generan movimientos en meses posteriores. Plan distingue ingreso previsto de cobros reales y margen mensual tras reservas. Las dos entradas al historial usan el mismo componente. El estado financiero se lee en una sola transacción para evitar mezclar datos anteriores y posteriores al guardar.

Validación: 59 pruebas, incluida reconciliación entre saldos, totales, categorías y respaldo. Prueba de interfaz en origen separado: ingreso ficticio de RD$1,000 reflejado en Resumen, Efectivo, historial, gráfico y reportes. Reportes revisados a 360 × 740.

Movimientos muestra una franja compacta con efectivo y bancos. Ver cuentas y deuda despliega el detalle. Gestionar bancos solo crea cuentas bancarias; Efectivo es automático. Su saldo inicial puede corregirse por separado desde el detalle de Efectivo. El KPI del Dashboard suma efectivo y bancos y muestra su desglose en la información del indicador.
