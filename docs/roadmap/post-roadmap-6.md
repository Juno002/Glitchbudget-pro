# Post-roadmap 6 — Inicio retroactivo de cuentas

**Estado:** autorizada / en ejecución.

## Objetivo

Permitir que una cuenta líquida empiece a llevarse desde una fecha pasada dentro de una ventana controlada, declarando el saldo de apertura de esa fecha sin registrarlo como ingreso.

## Contrato

- Reutilizar `Account.startDate` y `Account.openingBalance`.
- No crear campo nuevo de apertura ni movimiento `opening`.
- Fecha inicial permitida: desde el primer día del mes calendario anterior hasta la fecha financiera local actual.
- El límite se calcula con semántica date-only canónica; no usar UTC para resolver el borde.
- `startDate` solo puede modificarse mientras la cuenta no tenga actividad.
- Actividad: ingresos asignados, gastos pagados desde la cuenta, pagos de deuda/tarjeta desde la cuenta y transferencias como origen o destino. Las ocurrencias recurrentes/planificadas confirmadas quedan cubiertas por su movimiento materializado.
- Tras existir actividad, `startDate` queda inmutable y el rechazo debe ser explícito.
- `openingBalance` mantiene su corrección posterior existente y las protecciones de saldo.
- Efectivo y bancos usan el mismo contrato.
- Los movimientos anteriores a `startDate` continúan prohibidos.
- `openingBalance` afecta saldo y patrimonio, nunca ingresos, gastos ni cash flow.
- Backup v14 y Dexie v15 solo cambian si un test demuestra incompatibilidad.

## Caso de aceptación

Con fecha 2026-10-02:

- cuenta desde 2026-09-30;
- saldo de apertura: 0;
- ingreso 30/09: 11 000;
- gasto 30/09: 500;
- gasto 01/10: 1 500.

Saldo al 02/10: 9 000. Reportes: ingresos 11 000, gastos 2 000; saldo de apertura fuera de métricas de flujo.

## Fuera de alcance

- importación masiva de historial;
- préstamos;
- edición de `startDate` después de actividad;
- cambios de schema/backup sin necesidad demostrada.

## Gate

Antes de cerrar:

```text
npm ci
npm run check
ledger benchmark
npm run build
npm run test:e2e
```

El PR no se mergea antes de revisión final.
