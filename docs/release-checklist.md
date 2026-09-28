# Entrega y prueba piloto

## Versión candidata

Usar Node.js 22 o superior, instalar con npm ci, ejecutar npm run check y npm run build. No ignorar fallos. Registrar commit, versión y fecha junto a resultados. Conservar el paquete desplegado anterior para volver a publicarlo si hay regresión; no restaurar bases de usuarios automáticamente.

## Recorridos del piloto

- Configurar ingreso y crear presupuestos semanal, mensual, anual y único. Registrar un gasto y comprobar que afecta cada rango que contiene su fecha sin duplicarse en el ledger. Editar fecha e importe y verificar que los rangos afectados se recalculan.
- Probar rollover en un rango repetible y confirmar que no sobrescribe un período ya editado; comprobar que un presupuesto único no se repite automáticamente.
- Reasignar límite entre dos categorías del mismo rango y comprobar que no cambian cuentas, ingresos, gastos ni transferencias reales.
- Crear tarjeta, registrar compra y pago. Intentar exceder el saldo de una cuenta con un **movimiento real** en modo estricto y comprobar que no se guardó.
- Crear meta con plazo y aporte. Confirmar que el progreso deriva de los aportes, que el aporte mensual requerido usa el período financiero y que aportar no cambia saldos de cuentas aunque el margen de planificación quede negativo.
- Exportar JSON, registrar un dato ficticio adicional, restaurar con confirmación y comparar los registros esperados. Repetir con archivo dañado: no debe alterar nada.
- Instalar app, cerrar/abrir sin conexión, registrar movimiento y volver a conectar. Publicar una actualización de prueba y verificar datos y tema conservados.
- Recorrer claro, oscuro y minimalista con importes grandes y nombres largos, a 320/360 px y escritorio, zoom 200 % y teclado móvil.

## Registro de incidencia

Anotar navegador y versión, sistema, versión de app, pasos, resultado esperado y real. Adjuntar captura sin datos personales. No solicitar respaldos financieros completos por defecto.

## Decisiones del propietario antes de venta

Elegir Android/iOS/escritorio soportados, canal y dirección definitiva, precio/licencia, contacto de soporte y política de mantenimiento. Preparar información de privacidad y condiciones ajustadas a ese canal. Estos puntos requieren decisiones del propietario; no se han inventado ni publicado términos.

## Criterio de salida

Completar la matriz de quality-review.md, no dejar incidencias críticas de pérdida de datos, probar recuperación y documentar limitaciones conocidas. La aplicación seguirá necesitando mantenimiento tras la venta.
