# Fase 0 — Línea base de septiembre de 2026

## Punto de recuperación

Antes de modificar archivos para esta fase se creó el commit `9c530c9` y el tag anotado `pre-roadmap-2026-09`. El código previo estaba en `e43da20`; el commit de congelación incorpora el roadmap al control de versiones. Tag y commit son locales; no se ha hecho push.

## Invariantes financieras

Los importes persistidos usan enteros en centavos. Los ejemplos y fixtures son ficticios.

| Operación | Cuentas / patrimonio | Ingresos y gastos |
| --- | --- | --- |
| Ingreso real | Aumenta una cuenta | Cuenta como ingreso una vez |
| Gasto en efectivo/banco | Reduce la cuenta seleccionada | Cuenta como gasto una vez |
| Compra con tarjeta | Aumenta pasivo; no reduce efectivo | Cuenta como gasto |
| Pago de tarjeta | Reduce cuenta y pasivo por igual | No repite el gasto |
| Transferencia | Reduce origen y aumenta destino; conserva patrimonio | No es ingreso ni gasto |
| Saldo inicial | Establece posición al comenzar seguimiento | No es ingreso mensual |
| Presupuesto / ahorro sugerido | Reserva o referencia de planificación; no mueve cuentas | No genera un movimiento real |
| Pago planificado | No mueve dinero antes de confirmarse | Solo su pago real entra al historial financiero |
| Meta / aporte | Seguimiento de una reserva; no cambia patrimonio | No es gasto ni ingreso |
| Inversión financiada desde una cuenta | Futuro: líquido pasa a invertido sin cambiar patrimonio | No debe tratarse como gasto |
| Rendimiento proyectado | Futuro: estimación, no patrimonio real | No es ingreso cobrado |

Las dos últimas reglas son requisitos para la fase 12, no funcionalidades actuales ni pruebas implementadas. El motor de ocurrencias idempotentes está pendiente de fase 7; la restricción mensual actual no sustituye ese motor.

## Pruebas reproducibles

- `npm run check`: tipos, lint y todas las pruebas.
- `npm run build`: compilación de producción y manifiesto de precache.
- `tests/fixtures/dexie-v6.json` y `dexie-v7.json`: esquemas históricos congelados y datos de todas sus tablas. La migración real de Dexie debe conservarlos; v6 recibe únicamente el valor por defecto de iconos. No se asignan cuentas retrospectivamente.
- `tests/fixtures/backup-v4.json`: contrato de respaldo actual con todas las colecciones pobladas, saldo inicial, compra a crédito, pago y transferencia.
- `tests/roadmap-baseline.test.ts`: importar fixture, capturar las 13 tablas y métricas, exportar, vaciar exclusivamente fake-indexeddb, importar, comparar tablas y métricas. También rechaza referencias inválidas sin modificar ninguna tabla.
- Las pruebas existentes cubren ingresos/gastos, edición/borrado, insuficiencia de saldo, concurrencia, transferencias y conservación del patrimonio, crédito, presupuestos, CSV y JSON v3.

Resultado esperado del fixture v4 al 30-09-2026, en centavos: efectivo 80000, banco 220000, deuda 40000, patrimonio 260000; ingresos 100000, gastos 30000 y flujo de efectivo 80000. La previsión de sueldo no aumenta esos ingresos reales.

## Esquema y migración

Esta fase no modifica código de producción ni esquema: Dexie sigue en v8 y JSON en v4. No hay migración nueva, borrado ni normalización de datos del usuario. Los borrados en las pruebas se ejecutan exclusivamente en fake-indexeddb, dentro del proceso Node de prueba.

## Observaciones arquitectónicas para fases siguientes

- Las rutas `/api/ai-insight*` todavía existen. Eliminarlas y auditar todo tráfico es fase 1; no se afirma que esa auditoría ya esté completada.
- Next todavía necesita runtime de servidor para distribución; el paso a export estático corresponde a fase 1.
- Los cálculos y el acceso a Dexie aún comparten módulos; existen fórmulas heredadas de planificación. Separación canónica: fase 2.
- Efectivo se impone actualmente a los ingresos nuevos; selección explícita de otra cuenta y separación de strict mode: fase 3.
- Los fixtures congelan versiones soportadas v6 y v7. No demuestran compatibilidad con versiones anteriores desconocidas.
- El respaldo JSON cubre Dexie. No es una copia integral de preferencias/logros en otros almacenamientos ni de archivos OPFS. Ampliar el alcance corresponde a fase 18.
- La integridad se comprueba con registros válidos del contrato actual; no equivale a demostrar ausencia de todos los errores posibles.

## Verificación y cierre

Verificado el 26-09-2026:

- Tipos y lint: correctos. Suite completa: 63 pruebas aprobadas, 0 fallidas (4 nuevas).
- Build de producción: correcto; manifiesto offline con 43 recursos.
- Respaldo v4: restauración exacta de las 13 tablas y de los resultados financieros; rechazo atómico de referencias inválidas.
- Migraciones reales desde los fixtures v6 y v7: conservan los datos históricos.
- Prueba manual aislada en http://127.0.0.1:9011/: cargar producción, apagar únicamente ese servidor, confirmar conexión rechazada y recargar desde caché. Registrar un ingreso ficticio de RD$ 1,000.00; recargar otra vez con el servidor apagado. El KPI de cuentas y el de ingresos conservan RD$ 1,000.00, y el gráfico muestra Sueldo. Evidencia: [captura](phase-0-offline.png).
- No se modificaron los datos del origen habitual del usuario (puerto 9007). El servidor temporal quedó detenido y la pestaña de prueba cerrada.

La prueba offline acredita este flujo con el origen inaccesible tras una primera carga; no sustituye pruebas en un teléfono físico ni una auditoría de todo el tráfico de red. Esta fase fija la línea base; no certifica todavía toda la experiencia comercial.

Archivos incorporados: este informe, la captura, tres fixtures JSON y tests/roadmap-baseline.test.ts. Sin cambios en código de producción, dependencias ni esquema.

Fase 0 completada. Detenerse aquí para revisión; no iniciar fase 1 automáticamente.
