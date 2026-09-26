# Fase 7A — Modelo persistente de Planned Occurrences

Fecha: 2026-09-26. Rama: `phase-7-planned-payments`. Base: cierre de Fase 6 en `phase-6-period-engine`. Alcance: únicamente 7A. No se implementa todavía scheduler, lifecycle de confirmación ni Upcoming.

## Resultado

Se añadió la entidad persistente que representará cada ocurrencia concreta de una regla recurrente sin convertirla todavía en movimiento real.

```ts
type PlannedOccurrenceStatus = 'pending' | 'confirmed' | 'skipped';

interface PlannedOccurrence {
  id: string;
  ruleId: string;
  scheduledDate: string; // YYYY-MM-DD
  status: PlannedOccurrenceStatus;
  transactionId?: string;
}
```

La identidad lógica es:

```text
ruleId + scheduledDate
```

y no depende del `id` físico de la fila.

## Persistencia

Dexie pasa de v10 a **v11** con una tabla nueva:

```text
planned_occurrences
```

Índices:

```text
id
ruleId
scheduledDate
status
&[ruleId+scheduledDate]
&transactionId
```

La combinación regla + fecha es única en almacenamiento. Un `transactionId` presente también es único para impedir que un único movimiento real pueda terminar asociado a dos ocurrencias.

La migración v10→v11 solo crea la tabla. No reescribe ninguna tabla financiera ni genera ocurrencias retroactivamente.

## Contrato de estado

El schema de aplicación establece:

- `pending`: no puede tener `transactionId`;
- `skipped`: no puede tener `transactionId`;
- `confirmed`: debe tener `transactionId`.

Esto define la forma válida de la entidad, pero **no implementa todavía las transiciones** entre estados.

Fase 7C será responsable de:

```text
pending → confirmed
pending → skipped
```

y de crear/vincular de forma atómica el movimiento real.

## Servicio de creación pendiente

`src/lib/planned-occurrence-service.ts` incorpora:

- `plannedOccurrenceSchema`;
- `validatePlannedOccurrenceSet`;
- `addPendingOccurrence`.

En 7A el único comando de lifecycle expuesto es crear una ocurrencia `pending`.

Crear una ocurrencia pendiente exige que exista una regla recurrente activa. La tabla y el schema pueden representar `confirmed/skipped` para backups y para las siguientes subfases, pero no se añadió un comando genérico que permita saltarse el lifecycle futuro.

## Unicidad e integridad

Se validan en dos capas:

1. aplicación/backup:
   - IDs sin duplicar;
   - `ruleId + scheduledDate` sin duplicar;
   - `transactionId` sin duplicar;
   - fecha válida;
   - combinación status/transaction válida;

2. Dexie:
   - índice único compuesto para regla+fecha;
   - índice único para transactionId.

La doble protección evita que concurrencia o importación accidental creen dos ocurrencias para el mismo evento lógico.

## Neutralidad financiera

Guardar una ocurrencia pendiente no modifica:

- cuentas;
- ingresos;
- gastos;
- pagos de deuda;
- transferencias;
- presupuestos;
- metas;
- `recordedIncome`;
- `spending`;
- `cashFlow`;
- `netWorth`.

Una ocurrencia sigue siendo únicamente planificación.

## Backup v7

El contrato JSON pasa de **v6 a v7** porque existe una tabla persistente nueva.

v7 añade:

```json
"plannedOccurrences": []
```

El export incluye la entidad completa y valida el conjunto antes de producir el archivo.

Compatibilidad:

- v3/v4/v5 → importan como antes y producen cero ocurrencias;
- v6 → importa correctamente y produce cero ocurrencias;
- v7 → round-trip exacto de ocurrencias.

Un v7 con ocurrencias duplicadas o estados inválidos se rechaza **antes de reemplazar datos**.

No se exige todavía que `transactionId` apunte a un Income/Expense existente durante la importación. Esa integridad pertenece al lifecycle de confirmación de 7C, donde también se definirá de forma explícita la relación entre dirección de la regla y tipo de movimiento.

## Reglas eliminadas

7A no cambia aún el comportamiento existente de eliminación/desactivación de RecurringRule.

El servicio de creación exige una regla activa, pero el contrato de backup no obliga a que toda ocurrencia histórica conserve una regla existente. Esto evita cerrar prematuramente una decisión que debe resolverse junto con lifecycle/regeneración en 7B–7C.

## Tests

Se añadieron pruebas para:

- v10→v11 sin reescritura de datos;
- tabla nueva inicialmente vacía;
- unicidad regla+fecha;
- unicidad transactionId;
- rechazo de regla inexistente/inactiva al crear pending;
- validación pending/confirmed/skipped;
- fechas inválidas;
- neutralidad de métricas y posición;
- backup v7 exacto;
- compatibilidad de v6 sin inventar ocurrencias;
- rechazo atómico de v7 corrupto;
- todas las migraciones y respaldos anteriores.

También se actualizaron los gates históricos que verificaban explícitamente Dexie v10 o backup v6 para reconocer el nuevo contrato v11/v7.

## Límites deliberados de 7A

No se implementó:

- generación semanal;
- generación quincenal;
- generación mensual;
- política de días 29–31;
- creación automática dentro de DateRange;
- regeneración idempotente;
- `pending → confirmed`;
- `pending → skipped`;
- Overdue;
- Upcoming;
- sustitución del guard mensual legacy;
- cambios de UI.

Esos puntos pertenecen a 7B, 7C y 7D.

## Gate

7A se considera cerrada solo si el commit final mantiene:

```text
npm run check ✅
tests ✅
typecheck ✅
lint ✅
build ✅
local-only ✅
backup/migrations ✅
```

Después del gate: detenerse. No iniciar 7B automáticamente.
