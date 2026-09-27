# Fase 7C — Lifecycle de Planned Occurrences

Fecha: 2026-09-27. Rama: `phase-7-planned-payments`. Base: 7B cerrada en `c56c7b2`. Alcance: lifecycle `pending → confirmed/skipped`, vínculo atómico con el ledger e integridad de respaldo. No se implementa Upcoming ni se sustituye todavía la UI legacy.

## Resultado

La planificación ya puede convertirse explícitamente en un hecho real sin mezclar ambos estados.

Transiciones implementadas:

```text
pending → confirmed
pending → skipped
```

No se implementó una transición inversa.

`overdue` es un estado derivado de presentación: no se persiste.

## Confirmación atómica

`confirmPlannedOccurrence(id, options)` ejecuta en una sola transacción IndexedDB:

1. carga la ocurrencia;
2. valida su estado;
3. carga la regla de origen;
4. construye exactamente un Income o Expense;
5. reutiliza todas las validaciones financieras existentes;
6. guarda el movimiento real;
7. marca la ocurrencia `confirmed`;
8. guarda `transactionId`.

Si cualquier paso falla, ni el movimiento ni la transición de estado quedan escritos.

Esto incluye:

- protección de saldo real;
- validación de cuentas;
- tarjetas de crédito;
- categorías;
- política de presupuesto allow/warn/block;
- confirmación previa de un warning presupuestario.

Un `BudgetWarning` aborta toda la transacción. El reintento con el token vuelve a validar las políticas antes de escribir.

## Idempotencia

Cada ocurrencia usa un ID determinista para su movimiento:

```text
actual:<occurrenceId>
```

La primera confirmación crea el movimiento.

Una confirmación repetida sobre una ocurrencia ya confirmada:

- verifica que el movimiento vinculado todavía existe;
- verifica que conserva `recurringRuleId`;
- devuelve el vínculo existente;
- no vuelve a crear ni alterar dinero.

La concurrencia también está cubierta: dos confirmaciones simultáneas producen exactamente un movimiento real.

## Valores del movimiento real

Por defecto:

- fecha real = `scheduledDate`;
- monto real = monto actual de la regla;
- Expense nature = `Variable`;
- Income type = `extra`;
- título de la regla → concepto/descripción;
- cash/bank sin accountId usa el default existente de Efectivo.

La API permite confirmar con:

- `actualDate` distinto de la fecha planificada;
- `actualAmountCents` distinto del previsto;
- cuenta explícita;
- compra con tarjeta + debtId;
- naturaleza de gasto;
- tipo de ingreso.

La `scheduledDate` original nunca cambia al confirmar con otra fecha real.

Cambiar posteriormente monto/título/categoría de la regla no reescribe movimientos ya confirmados. Para una ocurrencia todavía pendiente, 7C usa los metadatos actuales de la regla al confirmar; la reconciliación visual/masiva tras editar reglas pertenece a 7D.

## Reglas inactivas o eliminadas

Una ocurrencia ya materializada puede confirmarse aunque su regla haya sido desactivada. Desactivar impide generación futura, pero no invalida una obligación ya materializada.

Una ocurrencia pendiente necesita conservar su regla de origen:

- eliminar una regla mediante el servicio se bloquea mientras tenga pending;
- cambiar la dirección income/expense se bloquea una vez exista cualquier ocurrencia materializada;
- un backup v7 con pending huérfano se rechaza.

Una regla sí puede eliminarse cuando solo quedan ocurrencias confirmed/skipped. La procedencia histórica permanece mediante `ruleId` y el movimiento confirmado.

## Skip

`skipPlannedOccurrence(id)`:

- pending → skipped;
- repetir skip es idempotente;
- confirmed → skipped se rechaza;
- una ocurrencia skipped no puede confirmarse.

Skip no crea ni modifica movimientos financieros.

## Overdue

`occurrenceDisplayStatus(occurrence, today)` deriva:

```text
pending + scheduledDate < today → overdue
```

El día programado todavía es `pending`.

Confirmed y skipped conservan su estado sin importar la fecha.

La fecha de referencia es argumento explícito; no se consulta reloj dentro del dominio.

## Edición y eliminación del movimiento real

Una vez confirmado:

- editar el movimiento real está permitido;
- puede cambiar fecha real, monto, cuenta u otros campos válidos;
- no puede cambiarse/eliminarse su procedencia `recurringRuleId`;
- la ocurrencia sigue apuntando al mismo `transactionId`;
- `scheduledDate` permanece intacta.

La eliminación directa del movimiento confirmado se bloquea para no dejar una ocurrencia `confirmed` apuntando a nada.

No existe todavía “deshacer confirmación”. Si se desea esa función, debe implementarse como transición lifecycle explícita, no mediante borrado directo. Se deja para integración posterior.

## Tarjetas y saldo real

La confirmación no evita las políticas financieras de Fases 2–3.

Pruebas específicas demuestran:

- cash/bank con fondos insuficientes → la operación falla y la ocurrencia sigue pending;
- tarjeta de crédito → aumenta spending + liability sin reducir liquidAssets;
- budget warn → no escribe nada hasta recibir confirmación;
- budget block continúa bloqueando mediante el mismo servicio financiero.

## Integridad de backup v7

No cambia la versión del backup: continúa JSON v7.

Ahora, además de validar la forma de PlannedOccurrence:

- pending debe conservar una regla existente;
- confirmed debe apuntar a exactamente un Income o Expense;
- el movimiento debe conservar el mismo `recurringRuleId`;
- si la regla todavía existe, su direction debe coincidir con el tipo de movimiento;
- transactionId sigue siendo único entre ocurrencias.

Confirmed/skipped históricos pueden sobrevivir aunque la regla haya sido eliminada.

Backups corruptos se rechazan antes de reemplazar los datos actuales.

## Persistencia

No hubo cambio de schema en 7C:

```text
Dexie v11
JSON v7
```

La tabla y estados creados en 7A eran suficientes.

## Archivos principales

- `src/lib/planned-occurrence-service.ts`
  - confirmPlannedOccurrence
  - skipPlannedOccurrence
  - actualTransactionIdForOccurrence
  - validateOccurrenceLedgerLinks
- `src/domain/occurrence-status.ts`
  - occurrenceDisplayStatus
- `src/lib/transaction-service.ts`
  - protección frente a borrado directo de actual confirmado
  - soporte controlado para procedencia de reglas inactivas
  - removeExpense centralizado
- `src/lib/recurring-rule-service.ts`
  - integridad de reglas con ocurrencias materializadas
- `src/lib/backup-json.ts`
  - validación referencial del lifecycle
- `tests/planned-occurrence-lifecycle.test.ts`

## Pruebas

La suite de 7C cubre:

- confirmación expense;
- confirmación income;
- fecha real distinta de scheduledDate;
- monto real distinto del previsto;
- confirmación idempotente;
- confirmación concurrente;
- rollback por BudgetWarning;
- rollback por fondos insuficientes;
- compra con tarjeta y efecto patrimonial correcto;
- confirmación desde regla inactiva;
- rechazo si falta regla para pending;
- skip idempotente;
- confirmación de skipped rechazada;
- skip de confirmed rechazado;
- overdue derivado;
- edición posterior del movimiento;
- eliminación directa bloqueada para Income/Expense confirmados;
- eliminación de regla bloqueada mientras existan pending;
- direction de regla congelada una vez hay ocurrencias;
- round-trip de confirmed válido;
- rechazo atómico de transactionId colgante;
- rechazo de procedencia incompatible;
- rechazo de pending sin regla.

## Gate técnico

GitHub Actions del código final antes de este documento:

- `npm run check`: aprobado;
- **185 pruebas aprobadas, 0 fallidas**;
- TypeScript: aprobado;
- ESLint: aprobado con 0 warnings;
- guard local-only: aprobado;
- `npm run build`: aprobado;
- exportación estática: aprobada;
- manifiesto offline: 42 recursos.

Los warnings del runner por Node/Actions son deprecaciones externas y no fallos de la aplicación.

## Límites deliberados de 7C

No se implementó:

- UI de confirm/skip;
- Upcoming;
- agrupación hoy/mañana/próximos 7 días;
- sustitución del botón legacy “Registrar pago”;
- eliminación de `legacy-monthly-subscription-guard`;
- reconciliación automática de pending cuando cambia cadence/day/startDate;
- deshacer una confirmación;
- rediseño 7.5.

Eso corresponde a 7D o a una decisión explícita posterior.

Fase 7C cerrada. Detenerse antes de 7D.
