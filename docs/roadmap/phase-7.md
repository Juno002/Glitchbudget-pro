# Fase 7 — Recurrence / Planned Payments Engine

Fecha de cierre: 2026-09-27. Implementación dividida en 7A, 7B, 7C y 7D sobre `phase-7-planned-payments`. Base: Fase 6 cerrada. `main` permaneció congelado durante toda la implementación.

## 7A — Modelo

- `PlannedOccurrence` persistente;
- estados pending / confirmed / skipped;
- identidad lógica única `ruleId + scheduledDate`;
- Dexie v11;
- JSON backup v7;
- migración v10→v11 no destructiva;
- planning neutral respecto al ledger.

## 7B — Scheduler

- weekly = intervalos reales de 7 días;
- biweekly = intervalos reales de 14 días;
- monthly calendario;
- política 29–31 = último día válido;
- límites startDate/endDate;
- integración con DateRange de Fase 6;
- materialización idempotente;
- rangos solapados/concurrencia sin duplicados.

## 7C — Lifecycle

- pending → confirmed;
- pending → skipped;
- overdue derivado;
- confirmación atómica crea exactamente un Income/Expense;
- idempotencia y concurrencia;
- políticas de cuenta/presupuesto/tarjeta reutilizadas;
- edición posterior del actual permitida;
- borrado directo del actual confirmado bloqueado;
- integridad referencial en backup v7.

## 7D — Integración

- Upcoming local;
- Vencidos / Hoy / Mañana / Próximos 7 días / Después;
- UI Confirmar/Omitir;
- weekly/biweekly/monthly accesibles;
- gastos e ingresos recurrentes;
- cuenta predeterminada opcional;
- Pausar/Reactivar reglas;
- retirada total del guard mensual legacy;
- tab visible “Planificados”.

## Invariantes finales

```text
RecurringRule
≠ dinero

PlannedOccurrence pending/skipped
≠ dinero

PlannedOccurrence confirmed
→ exactamente un movimiento real

ruleId + scheduledDate
→ único

confirmar dos veces
→ no duplica dinero

weekly/biweekly
→ pueden tener múltiples ocurrencias en un mes

scheduledDate
≠ necesariamente actualDate

editar/desactivar regla
→ no reescribe movimientos confirmados
```

## Persistencia final

```text
Dexie v11
Backup JSON v7
```

No se incorporó red, backend, cloud sync ni servicios financieros remotos.

## Siguiente gate

Después de validar 7D, la siguiente fase del roadmap es:

```text
7.5 — UX Architecture & Design System
```

No iniciar 7.5 automáticamente.
