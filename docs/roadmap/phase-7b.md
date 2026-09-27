# Fase 7B — Scheduler de recurrencias

Fecha: 2026-09-26/27. Rama: `phase-7-planned-payments`. Base: 7A cerrada en `f0d96a4`. Alcance: únicamente scheduler/generación de ocurrencias. No se implementa lifecycle de confirmación ni UI Upcoming.

## Resultado

Se añadió un scheduler puro en:

```text
src/domain/recurrence.ts
```

Responsabilidades:

- calcular fechas de reglas weekly / biweekly / monthly;
- respetar `startDate` y `endDate`;
- aplicar una única política para días mensuales 29–31;
- aceptar cualquier `DateRange`, incluidos períodos financieros 25→24;
- producir siempre el mismo resultado para la misma regla/rango;
- no leer reloj, React, Dexie, navegador ni red.

## Semántica de cadencias

### Weekly

```text
startDate
+ 7 días
+ 7 días
...
```

No se traduce a aproximaciones mensuales ni depende de número de semana.

El campo histórico `day` se ignora en reglas weekly.

### Biweekly

```text
startDate
+ 14 días
+ 14 días
...
```

También se basa en intervalos reales desde `startDate`.

El campo histórico `day` se ignora en reglas biweekly.

### Monthly

El día objetivo es:

1. `rule.day` cuando contiene un valor 1..31;
2. en ausencia de `day`, el día de `startDate`;
3. `day = 0` se interpreta únicamente como compatibilidad legacy y también usa el día de `startDate`.

Una regla nunca genera una ocurrencia anterior a su `startDate`.

## Política 29–31

La política adoptada es:

> Si un mes no contiene el día solicitado, usar el último día válido de ese mes.

Ejemplos:

```text
31 ene → 28 feb 2026 → 31 mar → 30 abr
31 ene → 29 feb 2028 → 31 mar
29 ene → 28 feb 2026 → 29 mar
30 ene → 28 feb 2026 → 30 mar
```

No se desplaza la fecha sobrante al mes siguiente.

## Rangos y límites

`scheduledDatesForRule(rule, range)` usa límites inclusivos.

Se intersectan:

```text
DateRange solicitado
∩
startDate..endDate de la regla
```

Una regla inactiva devuelve cero fechas.

Un rango o fecha inválida se rechaza.

El scheduler consume directamente el `DateRange` introducido en Fase 6. Se prueba explícitamente el período:

```text
2026-08-25 .. 2026-09-24
```

sin asumir mes calendario.

## Identidad de ocurrencia

Se añadió un ID de almacenamiento determinista:

```text
occ:<scheduledDate>:<ruleId>
```

Ejemplo:

```text
occ:2026-09-15:internet
```

Este ID físico NO sustituye la identidad lógica establecida en 7A:

```text
ruleId + scheduledDate
```

La unicidad lógica continúa protegida por el índice compuesto de Dexie.

## Materialización

`materializePendingOccurrences(range)`:

1. lee reglas activas;
2. ejecuta el scheduler puro para cada regla;
3. comprueba `ruleId + scheduledDate`;
4. crea únicamente las ocurrencias que falten;
5. las crea como `pending`;
6. nunca crea movimientos financieros.

Ejecutar el mismo rango dos veces es idempotente.

Rangos solapados añaden únicamente las fechas nuevas.

La operación también se probó de forma concurrente: dos materializaciones simultáneas no duplican la misma ocurrencia lógica.

## Estados existentes

7B es deliberadamente no destructiva.

Si ya existe una ocurrencia en una fecha como:

```text
pending
confirmed
skipped
```

la generación no la sobrescribe ni cambia su estado.

Esto es importante porque el scheduler no es el dueño del lifecycle.

## Edición/desactivación de reglas

Una regla inactiva no produce nuevas ocurrencias.

7B **no elimina ni reprograma ocurrencias ya materializadas** cuando posteriormente cambia/desaparece una regla. Hacerlo automáticamente podría destruir decisiones históricas como skipped/confirmed.

La política de reconciliación de ocurrencias pendientes frente a cambios de regla se deja explícitamente fuera de 7B y debe resolverse junto con lifecycle/integración en 7C–7D.

## Neutralidad financiera

Materializar cualquier cantidad de ocurrencias pending no modifica:

- liquidAssets;
- liabilities;
- netWorth;
- recordedIncome;
- spending;
- monthlyResult;
- cashFlow;
- cuentas, tarjetas o movimientos reales.

Solo crea planificación persistida.

## Persistencia / backups

No fue necesaria una nueva versión de Dexie ni de backup en 7B.

Continúan:

```text
Dexie v11
JSON v7
```

El formato de PlannedOccurrence definido en 7A no cambió.

## Pruebas

Se añadieron pruebas para:

- weekly cada 7 días desde startDate;
- biweekly cada 14 días;
- cruces de mes;
- integración con DateRange 25→24 de Fase 6;
- monthly 29 / 30 / 31;
- febrero no bisiesto;
- febrero bisiesto;
- fallback al día de startDate;
- compatibilidad legacy de day=0;
- no generar antes de startDate;
- endDate inclusivo;
- reglas inactivas;
- rangos/fechas inválidos;
- ID determinista;
- materialización repetida idempotente;
- rangos solapados;
- conservación de skipped/confirmed existentes;
- reglas terminadas;
- generación concurrente sin duplicados;
- neutralidad financiera.

## Gate técnico

GitHub Actions sobre el código de 7B:

- `npm run check`: aprobado;
- **167 pruebas aprobadas, 0 fallidas**;
- TypeScript: aprobado;
- ESLint: aprobado con 0 warnings;
- guard local-only: aprobado;
- `npm run build`: aprobado;
- exportación estática: aprobada;
- manifiesto offline: 42 recursos.

Los avisos de deprecación de Node/Actions del runner no son fallos del código.

## Límites deliberados de 7B

No se implementó:

- `pending → confirmed`;
- creación de Income/Expense desde una ocurrencia;
- `pending → skipped`;
- Overdue;
- integridad de transactionId contra el ledger;
- reconciliación destructiva de ocurrencias tras editar una regla;
- Upcoming;
- eliminación del guard mensual legacy;
- UI de Planned Payments.

Eso corresponde a 7C y 7D.

## Gate

7B cerrada. Detenerse antes de 7C.
