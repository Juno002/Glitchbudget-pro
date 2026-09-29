# Fase 18.4 — Backup OPFS automático pre-import

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 18.
Plan de ejecución: [phase-18.md](phase-18.md).
Contratos previos: [phase-18-1.md](phase-18-1.md), [phase-18-2.md](phase-18-2.md) y [phase-18-3.md](phase-18-3.md).

Estado: **checkpoint completado**.

Fase 18 permanece **en progreso**. Solo queda 18.5 — migraciones permanentes + hardening + gate final.

## Objetivo

Crear una red de seguridad local antes de cualquier importación destructiva cuando OPFS esté disponible.

La secuencia canónica queda:

```text
validar archivo entrante
→ preparar datos
→ si OPFS está disponible, exportar estado actual
→ escribir copia local automática
→ solo si la copia termina correctamente, ejecutar import destructivo
```

Si OPFS no está disponible:

```text
validar
→ informar claramente que no existe copia previa
→ continuar restore
```

La aplicación no debe fingir que existe una copia cuando el navegador no soporta OPFS.

## Copia automática

Implementación:

```text
src/lib/pre-import-backup.ts
```

Nombre:

```text
glitchbudget-pre-import-<timestamp>-<id>.json
```

Contenido:

```text
exportDataJSON()
```

Por tanto la copia automática usa el contrato JSON canónico actual:

```text
v13
schemaVersion 14
appVersion 0.1.0
exportedAt
```

No se crea un formato alternativo para la copia previa.

## OPFS disponible

Cuando `hasOPFS()` devuelve `true`:

1. se exporta el estado actual;
2. se genera nombre único;
3. se escribe con `opfsWrite`;
4. se notifica:
   `Copia de seguridad automática creada`;
5. se ejecuta la escritura destructiva del import.

Si exportar o escribir falla:

```text
→ lanzar error protector
→ cancelar import
→ no modificar Dexie
```

Mensaje base:

```text
No se pudo crear la copia local automática previa.
La importación fue cancelada para proteger tus datos.
```

## OPFS no disponible

Cuando `hasOPFS()` devuelve `false`:

- no se intenta exportar/escribir una copia inexistente;
- se devuelve estado explícito `unavailable`;
- la UI informa:
  `Sin copia automática previa`;
- se explica que OPFS no está disponible;
- el restore puede continuar porque el roadmap exige esta copia **cuando OPFS esté disponible**.

No se muestra un nombre falso ni se afirma que exista una copia.

## Punto exacto del hook

`importDataJSON()` incorpora:

```text
beforeWrite?: () => Promise<void>
```

Orden:

```text
prepareDataJSONImport(...)
→ validación completa
→ beforeWrite()
→ reemplazo de automatización local
→ transacción Dexie destructiva
```

Esto es importante: la copia previa ocurre **después de validar** pero **antes de cualquier mutación**.

Si `beforeWrite` falla:

- automatización local no se reemplaza;
- Dexie no abre su transacción destructiva;
- el import aborta.

## JSON externo

Flujo final:

```text
preview/validación 18.3
→ usuario confirma
→ importDataJSON(..., { beforeWrite })
→ copia OPFS automática
→ restore
```

## Restore desde copia OPFS existente

Aunque el archivo entrante ya viva en OPFS, el estado actual también se protege antes de reemplazarlo:

```text
leer copia seleccionada
→ validar/preview
→ confirmar
→ crear NUEVA copia automática del estado actual
→ restaurar copia seleccionada
```

Así restaurar una copia anterior no elimina la posibilidad de volver al estado inmediatamente anterior.

## Backup cifrado

`restoreEncryptedBackupText()` propaga el mismo `beforeWrite`.

Orden:

```text
authenticate/decrypt
→ prepareDataJSONImport
→ copia OPFS previa
→ importDataJSON
```

Contraseña incorrecta, ciphertext corrupto o JSON inválido fallan antes de intentar crear la copia y antes de cualquier escritura.

## CSV destructivo

18.4 amplía la protección también a CSV porque sus imports reemplazan tablas completas.

Los cinco importadores CSV soportados:

- incomes;
- expenses;
- plans;
- goals;
- goal contributions;

reciben el mismo contrato:

```text
validar CSV y referencias
→ beforeWrite()
→ transacción que reemplaza tabla
```

Validaciones como:

- columnas requeridas;
- schema de filas;
- cuentas;
- moneda;
- tarjetas;
- categorías;
- metas/contribuciones;

ocurren antes del hook de copia.

Por tanto un CSV inválido no crea una copia innecesaria.

## UI

Las confirmaciones explican que, antes de escribir, GlitchBudget intentará crear una copia local automática cuando OPFS esté disponible.

Durante la ejecución:

### Copia creada

```text
Copia de seguridad automática creada
<nombre del archivo>
```

### OPFS no disponible

```text
Sin copia automática previa
OPFS no está disponible en este navegador.
La restauración continuará sin una copia local previa.
```

### OPFS disponible pero fallo de copia

El import se cancela y la superficie de error muestra el motivo.

## Versiones

Sin cambios:

```text
Dexie:                     v14
Backup JSON:               v13
App:                       0.1.0
Encrypted backup envelope: v1
```

18.4 no requiere migración de base de datos ni bump de formato.

## Invariantes preservadas

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- validar antes de crear la copia;
- crear copia antes de escribir;
- fallo de copia con OPFS disponible cancela import;
- ausencia de OPFS se informa sin fingir protección;
- JSON normal/cifrado comparten importador canónico;
- CSV destructivo también queda protegido;
- no se usa red;
- no se modifica Dexie schema;
- no se adelanta el gate permanente de migraciones de 18.5;
- no se usa `db.clear()` como estrategia de migración.

## Pruebas

`tests/phase-18-4-opfs-pre-import.test.ts` cubre:

- OPFS no disponible;
- ausencia de export/write cuando OPFS no existe;
- nombre y contenido de copia automática;
- fallo de escritura OPFS;
- validación antes de hook;
- fallo del hook sin mutar Dexie;
- hook exactamente una vez;
- snapshot del estado todavía intacto durante hook;
- cifrado autentica/valida antes del hook;
- JSON externo;
- restore OPFS;
- restore cifrado;
- CSV destructivo;
- CSV inválido no dispara copia;
- CSV válido con fallo de copia no reemplaza tabla;
- mensajes de UI;
- local-only.

Regresiones históricas de 17.5 y 18.3 se actualizaron para reconocer el nuevo hook sin debilitar sus garantías previas.

## Gate técnico

Primer intento, run `36580932998`:

- falló typecheck por inferencia de los arrays normalizados del refactor CSV;
- no hubo fallo funcional del contrato.

Segundo intento, run `36581096074`:

- **411/412 pruebas**;
- única regresión: una prueba histórica 17.5 esperaba la firma anterior de `restoreEncryptedBackupText`.

Gate funcional corregido, run `36581303597`:

- **412/412 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Siguiente checkpoint

**18.5 — Migraciones permanentes + hardening + gate final**

Debe cerrar formalmente Fase 18 verificando preservación de datos, prohibición de migraciones destructivas, cobertura de tablas, versionado, preview, copia OPFS pre-import, restore normal/cifrado y compatibilidad legacy.

18.5 no queda iniciado por este documento.
