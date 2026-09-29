# Fase 18.2 — Cobertura automática de tablas

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 18.
Plan de ejecución: [phase-18.md](phase-18.md).
Contrato previo: [phase-18-1.md](phase-18-1.md).

Estado: **checkpoint completado**.

Fase 18 permanece **en progreso**. Preview/confirmación de import, backup OPFS pre-import y hardening final siguen pendientes.

## Objetivo

Evitar que una tabla Dexie nueva pueda existir sin cobertura de Backup 2.0.

El roadmap exige cobertura en:

```text
export
import
restore
validation
migration tests
```

18.2 implementa un inventario canónico y un gate que compara ese inventario contra las tablas reales de Dexie.

## Inventario canónico

Archivo:

```text
src/lib/backup-table-coverage.ts
```

Actualmente registra las 16 tablas Dexie:

```text
categories
accounts
account_transfers
investments
expenses
incomes
goals
goal_contributions
plans
settings
periods
recurrents
planned_occurrences
debts
debt_payments
fxRates
```

Cada entrada declara:

- nombre real de tabla Dexie;
- clave correspondiente dentro del JSON;
- las cinco rutas requeridas por el roadmap;
- referencia al migration/full-table round-trip gate.

Las claves JSON no tienen que ser idénticas al nombre físico. Ejemplos:

```text
account_transfers    → accountTransfers
goal_contributions  → goalContributions
planned_occurrences → plannedOccurrences
debt_payments       → debtPayments
```

## Detección automática de tablas nuevas

Antes de exportar y antes de importar:

```text
db.tables
→ nombres reales
→ assertBackupTableCoverage(...)
```

Si aparece una tabla no registrada:

```text
Backup 2.0 no tiene cobertura para las tablas Dexie: <tabla>
```

y la operación aborta.

El mensaje exige explícitamente completar:

```text
export/import/restore/validation/migration tests
```

antes de continuar.

También se rechaza un registro stale que declare una tabla que ya no existe.

La intención es fail-closed: una tabla nueva jamás queda silenciosamente omitida del backup.

## Por qué no se serializan tablas nuevas a ciegas

18.2 **no** presupone que cualquier tabla futura pueda copiarse como JSON sin transformación.

Algunas tablas actuales ya requieren:

- normalización de moneda;
- migración de modelos;
- validación referencial;
- nombres JSON distintos a nombres Dexie;
- lógica específica al restaurar.

Por eso la automatización correcta es:

```text
nueva tabla detectada
→ gate falla
→ se exige adapter/cobertura explícita
→ gate vuelve a verde
```

y no:

```text
nueva tabla
→ copiar bytes sin conocer contrato
```

## Validación del JSON v13

Para el formato actual v13, todas las claves respaldadas por tablas pasan a ser obligatorias.

Esto incluye claves que en formatos legacy eran opcionales por compatibilidad histórica, por ejemplo:

- `categories`;
- `accounts`;
- `accountTransfers`;
- `recurrents`;
- `debts`;
- `debtPayments`;
- `fxRates`.

Por tanto, un backup v13 que omita una tabla se rechaza durante parse/validation **antes del restore**.

Backups legacy v3–v12 conservan sus reglas históricas.

## Restore dirigido por el inventario

El clear destructivo previo al restore deja de mantener una segunda lista manual.

Antes:

```text
db.categories.clear()
db.settings.clear()
...
```

Ahora:

```text
BACKUP_TABLE_COVERAGE
→ db.table(entry.table).clear()
```

Esto garantiza que toda tabla aceptada por el inventario participe automáticamente en el borrado transaccional previo a la restauración.

La escritura de datos sigue usando adapters explícitos por tabla porque existen transformaciones semánticas específicas.

## Conteos post-import

Los conteos Dexie posteriores al restore también dejan de estar hardcodeados.

Ahora se derivan de:

```text
BACKUP_TABLE_COVERAGE
→ table.count()
```

Así el resultado incluye automáticamente las 16 tablas cubiertas y no mantiene una tercera lista susceptible de quedar desactualizada.

Las capas de automatización local siguen añadiéndose aparte:

- Templates;
- Saved Filters;
- Rules.

## Tabla vacía no equivale a tabla ignorada

El gate verifica dos escenarios:

### Export con tablas vacías

`planned_occurrences` e `investments` pueden estar vacías, pero sus claves deben seguir apareciendo:

```json
"plannedOccurrences": []
"investments": []
```

### Round-trip con todas las tablas no vacías

La prueba de cobertura carga el fixture financiero y añade datos válidos a las dos tablas que ese fixture deja vacías.

Antes de exportar se exige:

```text
cada una de las 16 tablas
→ count > 0
```

Después:

```text
snapshot completo
→ export
→ clear
→ import
→ snapshot completo
→ igualdad exacta por tabla
```

Así una tabla no puede pasar el gate simplemente porque esté vacía.

## Migration tests

`tests/phase-18-2-backup-table-coverage.test.ts` funciona como gate de cobertura transversal:

- inventario = tablas reales Dexie;
- cada entrada declara las cinco rutas;
- no hay claves JSON duplicadas;
- tabla futura simulada sin registro → fallo;
- todas las claves actuales existen incluso vacías;
- quitar cualquier clave de tabla de un v13 → import rechazado atómicamente;
- round-trip con 16/16 tablas no vacías;
- conteos post-import corresponden a cada tabla;
- clear/count usan el registro, no listas manuales.

Los migration tests históricos de versiones Dexie permanecen activos y 18.5 hará el hardening final contra migraciones destructivas.

## Versiones

Sin cambios respecto a 18.1:

```text
Dexie schema: v14
Backup JSON:  v13
App version:  0.1.0
Encrypted envelope: v1
```

18.2 no requiere bump del formato porque no cambia la forma externa de un backup v13 válido; endurece cobertura y obligatoriedad.

## Invariantes preservadas

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- compatibilidad legacy v3–v12 permanece;
- JSON normal y cifrado comparten payload;
- no se crea ni elimina ninguna tabla;
- no hay migración Dexie;
- no se usa `db.clear()` como estrategia de migración;
- restore sigue siendo transaccional;
- seguridad local de Fase 17 no cambia;
- 18.3 y 18.4 no se adelantan.

## Gate técnico

Intento 1, run `36536787841`:

- detectó una llave de cierre faltante tras sustituir el bloque manual de conteos;
- corregido sin cambios de diseño.

Intento 2, run `36536891963`:

- detectó un overload incompatible de `assert.rejects` en TypeScript;
- corregido solo en el test.

Intento 3, run `36537002498`:

- el nuevo contrato obligatorio rechazó `categories` a nivel Zod antes del mensaje histórico posterior;
- se ajustó únicamente la expectativa de regresión para aceptar el rechazo schema-level equivalente.

Gate funcional final, run `36537141932`:

- **393/393 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Siguiente checkpoint

**18.3 — Preview + confirmación de import**

Debe validar el archivo y calcular un resumen legible de su contenido antes de permitir cualquier restore destructivo, tanto para JSON normal como para backup cifrado una vez descifrado.

18.3 no queda iniciado por este documento.
