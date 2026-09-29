# Fase 18.1 — Contrato y versionado de Backup 2.0

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 18.
Plan de ejecución: [phase-18.md](phase-18.md).

Estado: **checkpoint completado**.

Fase 18 permanece **en progreso**. Cobertura automática de tablas, preview de import y backup OPFS pre-import todavía no están implementados.

## Objetivo

Separar explícitamente tres conceptos que antes estaban implícitos o mezclados:

```text
v             = versión del formato JSON
schemaVersion = versión del esquema persistente Dexie
appVersion    = versión de GlitchBudget que creó el archivo
exportedAt    = instante de exportación
```

## Contrato actual

El backup JSON canónico pasa a:

```text
v: 13
schemaVersion: 14
appVersion: "0.1.0"
exportedAt: ISO-8601 UTC
```

### `v`

`v` continúa representando **la forma del archivo JSON**, no la versión de la base de datos.

Se eleva de v12 a **v13** porque los nuevos campos de metadata son obligatorios en el contrato actual.

Lectura legacy preservada:

```text
v3–v12
```

Un backup v12 existente no necesita `schemaVersion` ni `appVersion`; sigue entrando por su parser histórico.

### `schemaVersion`

Representa la versión del esquema Dexie que originó el backup.

Fuente canónica:

```ts
CURRENT_DB_SCHEMA_VERSION = 14
```

La misma constante se utiliza para declarar la versión Dexie actual y para escribir metadata de backup, evitando dos números independientes.

Si un backup v13 declara:

```text
schemaVersion > CURRENT_DB_SCHEMA_VERSION
```

la importación se rechaza antes de modificar datos, porque el archivo requiere un esquema más nuevo que el código actual.

Un `schemaVersion` anterior no se interpreta por sí solo como incompatibilidad: la compatibilidad real sigue determinada por el parser/versionado del formato y las migraciones existentes.

### `appVersion`

Se obtiene directamente de:

```text
package.json → version
```

Valor actual:

```text
0.1.0
```

No existe una segunda constante manual para la versión de la aplicación.

En 18.1 `appVersion` es metadata de procedencia, no un bloqueo semántico: la compatibilidad de datos se decide por `v` y `schemaVersion`, no por comparar cadenas de versión de la app.

### `exportedAt`

Sigue siendo obligatorio y se valida como timestamp ISO-8601.

No cambia su semántica histórica.

## Backup cifrado

El sobre cifrado de Fase 17 no cambia de versión:

```text
GlitchBudget encrypted backup
version 1
```

Su plaintext interno proviene de `exportDataJSON()`, por lo que adopta automáticamente el nuevo JSON v13 y sus campos:

- `schemaVersion`;
- `appVersion`;
- `exportedAt`.

No se crea una segunda semántica de versionado dentro del cifrado.

## Import

Para JSON v13:

1. parsear estructura;
2. exigir metadata obligatoria;
3. rechazar `schemaVersion` futuro;
4. continuar con las validaciones financieras existentes;
5. solo después ejecutar restore.

Metadata faltante o un esquema futuro no provocan modificación parcial.

Para v3–v12 se mantienen los contratos legacy existentes.

## Schema y versiones

### Dexie

```text
v14
```

18.1 no añade una migración de base de datos.

### Backup JSON

```text
v13
```

Cambio respecto al cierre de Fase 17:

```text
v12 → v13
```

La razón exclusiva del bump es hacer obligatoria la metadata de Backup 2.0.

### App

```text
0.1.0
```

Leída desde `package.json`.

## Fuera de alcance de 18.1

No se implementa anticipadamente:

- inventario/cobertura automática de tablas — 18.2;
- preview y conteos antes de import — 18.3;
- backup OPFS automático antes de import — 18.4;
- gate permanente contra migraciones destructivas — 18.5.

## Invariantes preservadas

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- backups legacy v3–v12 siguen siendo legibles;
- JSON normal y backup cifrado comparten el mismo payload financiero interno;
- no se modifica Dexie;
- no se utiliza `db.clear()` como migración;
- no se recrea la DB del usuario;
- import sigue validando antes de escribir;
- arquitectura local-only de Fase 17 permanece intacta.

## Pruebas

`tests/phase-18-1-backup-version-contract.test.ts` verifica:

- separación entre formato, schema y app version;
- conexión de `schemaVersion` con la versión Dexie real;
- conexión de `appVersion` con `package.json`;
- metadata obligatoria;
- `exportedAt` ISO;
- rechazo atómico de metadata faltante;
- rechazo de un esquema futuro;
- lectura legacy v12;
- re-export legacy al contrato actual v13;
- propagación automática de metadata dentro del backup cifrado;
- ausencia de adelanto de 18.2–18.4.

Las regresiones históricas que afirmaban que el **formato actual** era v12 se actualizaron a v13. Las referencias que describen contratos legacy v12 o migraciones Dexie históricas permanecen sin reinterpretar.

## Gate técnico

Primer intento, run `36535604226`:

- detectó cinco regresiones históricas que todavía fijaban el formato actual en v12;
- no detectó fallo del nuevo parser ni pérdida de compatibilidad;
- se actualizaron únicamente esas expectativas actuales.

Gate funcional corregido, run `36535765428`:

- **386/386 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Siguiente checkpoint

**18.2 — Cobertura automática de tablas**

Debe impedir que una tabla Dexie nueva pueda aparecer sin cobertura en export/import/restore/validation/migration tests.

18.2 no queda iniciado por este documento.
