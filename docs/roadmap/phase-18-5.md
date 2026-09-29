# Fase 18.5 — Migraciones permanentes + hardening + gate final

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 18.
Plan de ejecución: [phase-18.md](phase-18.md).
Contratos previos: [18.1](phase-18-1.md), [18.2](phase-18-2.md), [18.3](phase-18-3.md) y [18.4](phase-18-4.md).

Estado: **checkpoint de cierre de Fase 18**.

## Objetivo

Cerrar Backup 2.0 con garantías permanentes de preservación y con un gate explícito que impida reintroducir migraciones destructivas o dejar nuevas tablas fuera del sistema de respaldo.

18.5 no añade features ni cambia el modelo financiero.

## Gate permanente de migraciones

`tests/phase-18-5-migration-hardening.test.ts` fija tres garantías sobre el esquema persistente:

1. la historia Dexie registrada permanece incremental y sin huecos desde v6 hasta la versión actual;
2. `CURRENT_DB_SCHEMA_VERSION` coincide con la última versión registrada;
3. el módulo de producción de persistencia no contiene estrategias destructivas de migración como:

```text
table.clear()
table.delete()
deleteDatabase()
indexedDB.deleteDatabase()
```

El clear transaccional de `importDataJSON()` **no es una migración Dexie**: pertenece al restore destructivo explícito de un backup validado y queda protegido por preview/confirmación + backup OPFS previo cuando está disponible.

## Preservación de fixtures históricos

Los fixtures congelados:

```text
tests/fixtures/dexie-v6.json
tests/fixtures/dexie-v7.json
```

se abren primero con su esquema original y luego con `GlitchBudgetDB` actual.

El gate exige:

- migración hasta Dexie v14;
- mismo número de registros por tabla histórica;
- preservación de las identidades históricas de cada registro;
- sin recrear desde cero la base.

Esto complementa las pruebas de caracterización previas que verifican además las transformaciones semánticas esperadas de categorías, Actual/Planned, Goals y Currency foundation.

## Backup coverage permanente

El inventario canónico de 18.2 continúa siendo obligatorio.

El gate final verifica nuevamente:

```text
live Dexie tables == BACKUP_TABLE_COVERAGE
```

y que cada tabla declare:

```text
export
import
restore
validation
migration-tests
```

Una tabla futura no registrada hace fallar inmediatamente el gate.

## Compatibilidad legacy

Se conserva lectura de:

```text
JSON v3–v12
```

La prueba final ejerce los dos extremos de compatibilidad relevantes:

- fixture real v4;
- v12 generado desde el contrato actual retirando la metadata exclusiva de v13.

Además fija en código que los parsers históricos v3–v12 continúen presentes.

Todo restore legacy vuelve a exportar al contrato actual:

```text
JSON v13
schemaVersion 14
appVersion 0.1.0
exportedAt ISO-8601 UTC
```

## Metadata compatible e incompatible

El gate confirma:

- metadata obligatoria del formato actual;
- preview validado antes de escribir;
- `schemaVersion > 14` rechazado;
- hook de seguridad no ejecutado para un archivo incompatible;
- Dexie permanece intacta ante ese rechazo.

`appVersion` continúa siendo metadata de procedencia, no un bloqueo semántico.

## Restore JSON y cifrado

El cierre vuelve a recorrer ambos caminos:

```text
JSON validado
→ beforeWrite
→ restore transaccional
```

y:

```text
encrypted envelope v1
→ authenticate/decrypt
→ JSON validation
→ beforeWrite
→ restore transaccional
```

En ambos casos el hook se ejecuta con el estado anterior todavía intacto y el round-trip conserva los datos.

## Backup OPFS pre-import

18.5 conserva el contrato de 18.4:

```text
validar archivo entrante
→ si OPFS existe, exportar estado actual
→ escribir glitchbudget-pre-import-...
→ solo después permitir restore
```

El gate verifica que la copia use el JSON canónico actual y que un error de escritura produzca cancelación protectora.

Si OPFS no está disponible, se mantiene la política documentada en 18.4: informar que no existe copia automática previa y continuar solo porque el roadmap exige la copia cuando OPFS esté disponible.

## Versiones finales de Fase 18

Sin cambios adicionales en 18.5:

```text
Dexie schema:              v14
Backup JSON:               v13
App version:               0.1.0
Encrypted backup envelope: v1
```

No existe migración nueva de base de datos en 18.5.

## Invariantes afectadas

Ninguna fórmula financiera cambia.

Se endurecen únicamente estas garantías:

- preservación incremental de datos;
- cero reset destructivo como estrategia de migración;
- fail-closed para nuevas tablas sin backup coverage;
- validación antes de write;
- restore transaccional;
- compatibilidad legacy;
- local-only sin transmisión de datos financieros.

## Archivos cambiados

```text
tests/phase-18-5-migration-hardening.test.ts
docs/roadmap/phase-18-5.md
docs/roadmap/phase-18.md
docs/roadmap/README.md
```

## Schema changes

Ninguno.

```text
Dexie v14 → v14
```

## Migration behavior

No se añade una migración.

El gate hace permanente la política:

```text
migración = transformación incremental
migración ≠ db.clear()
migración ≠ recrear DB
```

## Tests añadidos

El gate 18.5 cubre:

- continuidad de versiones Dexie v6→v14;
- ausencia de resets destructivos en migraciones de producción;
- preservación de identidades en fixtures v6 y v7;
- cobertura total de tablas y fallo ante tabla futura;
- compatibilidad real v4 y v12;
- presencia del parser legacy v3–v12;
- metadata actual;
- rechazo atómico de schema futuro;
- preview antes de write;
- restore JSON con hook;
- restore cifrado con hook;
- backup OPFS pre-import;
- cancelación si la copia OPFS falla.

## Limitaciones conocidas

- Los fixtures Dexie congelados disponibles comienzan en v6; no existe fixture binario anterior dentro de la línea base actual.
- La compatibilidad de backup legacy v3–v12 se mantiene por parser versionado; el fixture histórico real conservado en el repositorio es v4.
- OPFS depende del soporte del navegador. Su ausencia se informa explícitamente y no se representa como una copia existente.

Estas limitaciones no contradicen el roadmap ni requieren una migración destructiva.

## Architectural concerns

No se detecta una preocupación nueva que obligue a cambiar decisiones estructurales de fases anteriores.

La deuda arquitectónica restante pertenece a **Fase 19 — Technical-debt closure** y a su posterior **Fase 19.5 — Prisma Engine Gate**, no a Backup 2.0.

## Definition of Done

Antes de cerrar formalmente Fase 18 deben quedar verdes:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

y además verificarse:

```text
existing backup import works
export/import round-trip works
existing financial totals remain valid
migration fixtures preserve historical records
offline mode still works
no financial network traffic introduced
```

## Gate técnico

Run funcional: `36585334550`.

Resultado:

- **420/420 pruebas**, 0 fallos;
- typecheck aprobado;
- lint aprobado con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

El único warning ajeno al producto provino de la infraestructura de GitHub Actions por la transición de sus acciones desde Node.js 20; no afecta el runtime ni las invariantes de GlitchBudget.

## Siguiente fase

Al completar este gate y fusionarlo:

**Fase 18 queda cerrada.**

La siguiente fase canónica es **Fase 19 — Technical-debt closure**, pero no se inicia automáticamente.
