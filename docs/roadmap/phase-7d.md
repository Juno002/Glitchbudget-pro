# Fase 7D — Integración mínima de Planned Payments

> **Registro histórico de fase.** Conserva versiones, resultados y restricciones del momento de su cierre. Para el estado acumulado hasta Fase 10, las continuaciones autorizadas y los pendientes vigentes, consulta el [índice del roadmap](README.md).

Fecha: 2026-09-27. Rama: `phase-7-planned-payments`. Base: 7C cerrada en `37214ab`. Alcance: integración local de Upcoming, confirm/skip y retirada del flujo legacy. No se realiza el rediseño visual de 7.5.

## Resultado

La UI de “Suscripciones” deja de registrar gastos directamente y pasa a consumir `PlannedOccurrence`.

El flujo activo queda:

```text
RecurringRule
→ materializePendingOccurrences()
→ PlannedOccurrence pending
→ Confirmar / Omitir
→ Expense o Income real solo al confirmar
```

El viejo supuesto:

```text
una regla mensual = como máximo un pago por mes
```

queda eliminado del servicio de transacciones y del UI.

## Materialización local

FinanceContext materializa de forma idempotente una ventana alrededor de la fecha local cuando las reglas recurrentes están disponibles.

Ventana por defecto:

```text
31 días hacia atrás
90 días hacia delante
```

Esto permite recuperar vencidos recientes y mantener una cola próxima útil sin generar años de eventos futuros.

La generación:

- ocurre completamente en IndexedDB/local;
- no necesita servidor;
- no mueve dinero;
- se vuelve a evaluar cuando cambian las reglas;
- conserva confirmed/skipped existentes.

## Upcoming

Nuevo selector puro:

```text
src/domain/upcoming.ts
```

Agrupa únicamente ocurrencias accionables `pending` en:

```text
Vencidos
Hoy
Mañana
Próximos 7 días
Después
```

Confirmed y skipped no permanecen en la cola accionable. Su efecto confirmado vive en Movimientos; los estados visuales/historial detallado se trabajarán en 7.5.

La fecha “hoy” es explícita para los selectores puros. No hay reloj oculto dentro del dominio.

## UI funcional

El tab visible pasa de:

```text
Suscripciones
```

a:

```text
Planificados
```

El componente existente conserva su nombre de archivo por compatibilidad interna, pero ahora muestra:

- Movimientos planificados próximos;
- grupos Upcoming;
- botones Confirmar/Omitir;
- reglas recurrentes;
- Pausar/Reactivar;
- creación de reglas semanal/quincenal/mensual;
- reglas de gasto o ingreso;
- fecha inicial;
- categoría;
- cuenta predeterminada opcional.

No se implementó todavía el diseño visual reutilizable de estados de Fase 7.5.

## Cuenta predeterminada

`RecurringRule` añade opcionalmente:

```ts
defaultAccountId?: string
```

Semántica:

1. una confirmación puede suministrar una cuenta como override;
2. si no, utiliza `defaultAccountId`;
3. si tampoco existe, cash/bank conserva el comportamiento normal de Efectivo predeterminado.

La cuenta de la regla se valida al guardar y al importar respaldos.

Este campo es aditivo, no indexado y no requiere cambio de Dexie ni nueva versión del backup.

## Cadencias desde UI

La creación local admite:

- weekly;
- biweekly;
- monthly.

Weekly/biweekly usan exclusivamente `startDate` + intervalos 7/14 definidos en 7B.

Monthly permite seleccionar día 1..31 y muestra la política:

> Si el mes no contiene ese día, se utiliza su último día válido.

## Retirada del guard legacy

Se eliminó:

```text
src/lib/legacy-monthly-subscription-guard.ts
```

`saveExpense` ya no intenta decidir si una regla “ya fue pagada este mes”.

La unicidad correcta vive ahora en:

```text
PlannedOccurrence(ruleId + scheduledDate)
```

Por tanto una regla semanal o quincenal puede confirmar múltiples ocurrencias dentro del mismo mes calendario.

Incluso los movimientos con procedencia añadida manualmente dejan de estar sujetos a una restricción mensual artificial; la UI normal utiliza las ocurrencias como camino de confirmación.

## Integridad al editar reglas

Para no dejar `pending` materializados con un calendario obsoleto:

- cambiar cadence/day/startDate/endDate se bloquea mientras existan pending;
- amount/title/category/defaultAccount pueden cambiar y se aplican al confirmar pendientes;
- active puede cambiar para pausar/reactivar;
- direction ya estaba congelada una vez existen ocurrencias.

Después de confirmar u omitir los pendientes, puede modificarse el calendario.

No se implementó una reconciliación destructiva automática porque podría borrar decisiones históricas.

## Pausar en lugar de borrar desde UI

La interfaz principal usa Pausar/Reactivar.

Pausar:

- evita nuevas ocurrencias;
- no elimina pending ya creados;
- no altera confirmed/skipped;
- no toca el ledger.

El servicio de borrado sigue disponible para casos válidos, con las protecciones de 7C.

## Presupuesto y confirmación

FinanceContext conecta `confirmPlannedOccurrence` con el AlertDialog de presupuesto existente.

Si aparece `BudgetWarning`:

1. no se escribe Expense;
2. la ocurrencia sigue pending;
3. se solicita confirmación;
4. al aceptar se reintenta con el token;
5. todas las políticas se vuelven a validar.

La UI no realiza un toast posterior fingiendo una confirmación.

## Pruebas de integración

Se cubre:

- agrupación Vencidos/Hoy/Mañana/7 días/Después;
- exclusión de confirmed/skipped de Upcoming;
- ventana local determinista;
- cuenta predeterminada de regla;
- rechazo de defaultAccountId inválido en backup;
- eliminación del guard mensual;
- múltiples movimientos con procedencia en un mismo mes;
- confirmación de múltiples weekly/biweekly occurrences en el mismo mes;
- bloqueo de cambios de calendario mientras existen pending;
- todas las garantías 7A/7B/7C anteriores.

## Persistencia

No hay cambio adicional de formato:

```text
Dexie v11
JSON v7
```

`defaultAccountId` es un campo opcional compatible con el contrato v7.

## Límites deliberados

No se implementó:

- rediseño de navegación de 7.5;
- componentes visuales finales Pending/Confirmed/Skipped/Overdue;
- enlace “Ver movimiento” desde confirmed;
- edición completa de reglas desde UI;
- deshacer confirmación;
- reconciliación automática destructiva de ocurrencias tras cambiar calendario;
- Quick Add recurrence creation.

Esos puntos pertenecen a 7.5/8 o requieren una decisión explícita posterior.

Fase 7D cerrada. Con este bloque, el motor de Fase 7 queda funcional de extremo a extremo.
