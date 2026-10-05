# Efectivo, bancos y tarjetas

Inicio elegido: saldos actuales y movimientos desde ahora. Todo sigue guardándose en el navegador, sin conexión a bancos.

## Uso

1. Efectivo se crea automáticamente en cero; si ya existía una cuenta de efectivo, se conserva su saldo y se usa como predeterminada. Cada cuenta tiene una moneda explícita y, en Fase 11, todas las cuentas operativas usan la moneda base. En Movimientos, pulsa esa cuenta y Editar cuenta para indicar el dinero que tenías al iniciar el seguimiento. Crea cada banco desde Gestionar bancos con su saldo actual. No hacen falta números de cuenta ni credenciales.
2. Incluye en el saldo inicial las operaciones que ya hiciste hoy. Los movimientos antiguos quedan sin cuenta para no contarlos dos veces.
3. Todo ingreso nuevo usa Efectivo por defecto, pero puede elegirse otra cuenta de destino. Si necesitas reconstruir un movimiento real anterior al inicio de una cuenta, abre esa cuenta, edita **Llevar esta cuenta desde** hacia una fecha anterior dentro de la ventana permitida e indica el saldo real que tenías al inicio de ese día. Aunque la cuenta ya tenga movimientos, el inicio puede ampliarse hacia atrás; nunca adelantarse. Después registra normalmente el ingreso/gasto histórico. El saldo inicial no cuenta como ingreso y no se crea ningún movimiento sintético. Los gastos y pagos de tarjeta usan Efectivo por defecto y permiten elegir otra cuenta de origen. Para llevar dinero entre cuentas, registra una transferencia. Las compras a crédito piden la tarjeta y no descuentan bancos.
4. Para sacar efectivo del banco, usa Gestionar bancos → Mover dinero entre mis cuentas. Para depositarlo, invierte origen y destino. En Fase 11 la transferencia exige que origen y destino tengan la misma moneda; una futura transferencia cross-currency necesitará una tasa manual. Una comisión se registra como gasto separado.
5. Conciliar deuda actual permite introducir lo que debes en cada tarjeta, independientemente de sus movimientos anteriores. Un saldo negativo significa saldo a favor.
6. Pulsa una cuenta para consultar sus 50 movimientos recientes y editar sus datos. Las transferencias se pueden editar desde ese historial.

## Qué significa cada cifra

Mi dinero hoy usa saldos iniciales más cobros reales menos pagos reales y transferencias, hasta la fecha actual. **Disponible líquido** suma efectivo y bancos. **Inversiones registradas** se muestran aparte como activos no líquidos. El patrimonio neto suma ambos activos y los saldos a favor, y resta la deuda registrada. No incluye otras propiedades u obligaciones no registradas ni rendimientos futuros estimados.

El resumen muestra Dinero en cuentas hoy (efectivo más bancos), ingresos registrados y gastos registrados del mes. Las compras con tarjeta cuentan como gasto; pagarlas reduce cuenta y deuda sin repetir el gasto. Reportes distingue resultado (ingresos menos compras) de flujo de efectivo (cobros menos gastos pagados directamente y pagos de tarjeta). El sueldo configurado no deposita dinero ni se suma a los ingresos reales. Un gasto fijo registrado afecta a la cuenta una vez; no se repite automáticamente en el historial ni en gráficos de meses posteriores. Registrar el pago real de cada período es necesario para mantener el saldo de la cuenta. Para pagos repetitivos conviene usar Suscripciones y registrar cada pago.

En modo estricto, un gasto con cuenta comprueba el saldo de esa cuenta. Los movimientos antiguos sin cuenta conservan la validación mensual anterior. El historial de cuentas incluye saldos iniciales, ingresos/gastos asignados, transferencias y pagos de tarjeta. **Los aportes a metas no son movimientos de cuenta y no aparecen como traslados de dinero:** reservan margen de planificación, pero no modifican efectivo, bancos ni patrimonio. El ahorro sugerido también es planificación; una transferencia sí registra un traslado real entre bancos o efectivo.

## Datos y recuperación

## Moneda y Fase 11

`Settings.currency` es la moneda base y `Account.currency` es obligatorio. Las cuentas existentes se migran a la base configurada sin convertir sus importes. Los movimientos de una cuenta guardan su moneda, `fxRate = 1` y `amountBase = amount` bajo el contrato actual.

Cambiar la moneda base solo está permitido mientras no existan importes financieros registrados. Una vez hay saldos, movimientos, presupuestos, metas, deudas o reglas monetarias, GlitchBudget rechaza el cambio para evitar reinterpretar valores. No se consultan tasas FX en internet.

El esquema Dexie actual es **v14**. Históricamente, v8 introdujo `accounts` y `account_transfers`; Fase 10 llevó el esquema a v12, Fase 11 a v13 para moneda explícita y Fase 12 añade el store `investments` en v14 sin reescribir saldos existentes.

El respaldo JSON canónico actual es **v10** y mantiene lectura de v3–v9. JSON v10 conserva el contrato de moneda de Fase 11 y añade las cuentas de inversión y sus metadatos. Los backups v9 y anteriores restauran sin inventar inversiones.

CSV de ingresos/gastos conserva `accountId`, `currency`, `fxRate` y `amountBase`; al importar, la moneda se normaliza a la cuenta/base y no puede inyectarse una moneda distinta. Para trasladar cuentas y transferencias usa el JSON completo. Las referencias a cuentas desconocidas se rechazan antes de reemplazar datos.

## Historial retroactivo de una cuenta existente

`Account.startDate` sigue siendo el límite inferior del ledger de la cuenta. Una cuenta con actividad puede ampliar ese límite **solo hacia atrás** dentro de la ventana retroactiva vigente. El usuario confirma `openingBalance` como el saldo real al inicio de la nueva fecha; los movimientos existentes no se modifican.

Una vez guardado el nuevo inicio, un ingreso, gasto, pago o transferencia con fecha igual o posterior a `startDate` usa el flujo normal y afecta saldo/reportes según su semántica. Adelantar `startDate` con actividad permanece bloqueado porque podría excluir historial ya registrado.

## Validación

Pruebas de retiro sin ingresos/gastos artificiales, saldos iniciales sin duplicar historial, gasto real frente a proyección, concurrencia, edición de transferencia, pago de tarjeta, ida/vuelta de respaldo v4 y migración desde v7. Los datos usados para verificar son ficticios.

El 21 de septiembre pasaron 50 pruebas, tipos y lint. En la interfaz local de prueba (puerto 9007), banco 10.000 + efectivo 500, retiro de 2.000 y gasto de 100 dejaron banco 8.000, efectivo 2.400 y saldo neto 10.400. El retiro no creó ingresos ni gastos. A 360 × 740 el diálogo quedó dentro de pantalla, sin desbordamiento horizontal y con desplazamiento hasta el botón final. Falta confirmar el teclado y la instalación en un teléfono físico.

## Consolidación de vistas (24 de septiembre)

Resumen y Mi dinero hoy comparten el cálculo de saldos. Historial y reportes usan operaciones registradas; los gastos fijos no generan movimientos en meses posteriores. Plan distingue ingreso previsto de cobros reales y margen mensual tras reservas. Las dos entradas al historial usan el mismo componente. El estado financiero se lee en una sola transacción para evitar mezclar datos anteriores y posteriores al guardar.

Validación: 59 pruebas, incluida reconciliación entre saldos, totales, categorías y respaldo. Prueba de interfaz en origen separado: ingreso ficticio de RD$1,000 reflejado en Resumen, Efectivo, historial, gráfico y reportes. Reportes revisados a 360 × 740.

Movimientos muestra una franja compacta con efectivo y bancos. Ver cuentas y deuda despliega el detalle. Gestionar bancos solo crea cuentas bancarias; Efectivo es automático. Su saldo inicial puede corregirse por separado desde el detalle de Efectivo. El KPI del Dashboard suma efectivo y bancos y muestra su desglose en la información del indicador.


## Inversiones — Fase 12

Una inversión se representa mediante una cuenta de tipo `investment` y una entidad `Investment`.

**Si ya existía cuando comenzaste a seguirla:** introduce el valor que estás siguiendo hoy. Ese valor se convierte en saldo inicial del activo y no en ingreso.

**Si acabas de abrirla con dinero registrado:** selecciona la cuenta líquida que entrega el principal. GlitchBudget registra una transferencia Banco/Efectivo → Inversión. La liquidez baja y el activo de inversión sube por el mismo monto; el patrimonio no cambia por la apertura.

Las cuentas de inversión no aparecen como fuente/destino de ingresos, gastos o pagos de tarjeta. Tampoco se pueden retirar o mover desde la transferencia genérica en Investments 1.0; retiro, vencimiento, renovación e interés realmente acreditado pertenecen a Investments 1.1.

La ficha muestra principal, tasa, apertura, vencimiento, tiempo transcurrido, días restantes, valor estimado al vencimiento e interés estimado. Los dos últimos se calculan localmente y siempre se presentan como **estimados**. No se suman al saldo ni al patrimonio real.
