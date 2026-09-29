# Fase 18.3 — Preview + confirmación de import

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 18.
Plan de ejecución: [phase-18.md](phase-18.md).
Contratos previos: [phase-18-1.md](phase-18-1.md) y [phase-18-2.md](phase-18-2.md).

Estado: **checkpoint completado**.

Fase 18 permanece **en progreso**. Backup OPFS automático pre-import y hardening final siguen pendientes.

## Objetivo

Mostrar qué contiene un backup validado **antes** de permitir cualquier restore destructivo de backup completo.

El roadmap exige un resumen equivalente a:

```text
4 accounts
423 transactions
7 budgets
3 goals
2 cards
1 investment
```

y confirmación explícita antes de importar.

18.3 aplica esa regla a:

- JSON externo;
- copias JSON locales existentes en OPFS;
- backup cifrado `.gbenc`, después de autenticar/descifrar.

CSV continúa con su flujo independiente por tabla; no se trata como restore completo de Backup 2.0.

## Una sola ruta de validación

No existe un parser “ligero” para preview.

`backup-json.ts` extrae la preparación previa al restore a:

```text
prepareDataJSONImport(...)
```

Tanto:

```text
previewDataJSON(...)
```

como:

```text
importDataJSON(...)
```

usan exactamente esa misma función.

Por tanto, el preview ejecuta las mismas comprobaciones previas a escritura que el restore:

- formato y versión;
- schemaVersion;
- metadata;
- cobertura de tablas;
- automatización local;
- budgets;
- categorías;
- cuentas y monedas;
- investments;
- referencias de movimientos;
- recurrents;
- transfers;
- goals;
- cards/debts;
- planned occurrences;
- normalizaciones necesarias para preparar el restore.

El preview no escribe en Dexie ni reemplaza automatización local.

## Contrato del resumen

`BackupImportPreview` contiene:

```text
formatVersion
schemaVersion?
appVersion?
exportedAt

accounts
transactions
budgets
goals
cards
investments
```

Semántica de los seis conteos visibles:

### accounts

```text
accounts.length
```

### transactions

Suma de movimientos reales respaldados:

```text
incomes
+ expenses
+ debtPayments
+ accountTransfers
```

No incluye planes, recurrents ni planned occurrences porque no son movimientos realizados.

### budgets

```text
plans.length
```

Cada fila de presupuesto respaldada cuenta como una asignación presupuestaria.

### goals

```text
goals.length
```

### cards

```text
debts.length
```

La superficie actual modela las tarjetas/deudas administradas por ese contrato.

### investments

```text
investments.length
```

## UI del resumen

Componente compartido:

```text
src/components/backup/backup-preview-summary.tsx
```

Muestra seis tarjetas compactas con:

- cuentas;
- movimientos;
- presupuestos;
- metas;
- tarjetas;
- inversiones.

También muestra metadata contextual:

```text
Backup JSON vN
schema N
app N
```

cuando está disponible.

## JSON externo

Flujo:

```text
seleccionar .json
→ file.text()
→ previewDataJSON()
→ validación completa
→ mostrar resumen
→ usuario confirma
→ importData(file)
```

Si el archivo falla la validación:

- no se abre confirmación destructiva;
- se muestra error;
- no se modifica Dexie.

`ImportConfirmation` recibe:

```text
requirePreview
```

para restores completos.

Sin preview validado, el botón destructivo no está disponible.

## Copias OPFS existentes

El botón Restaurar de una copia local ya no abre directamente una confirmación genérica.

Ahora:

```text
seleccionar copia OPFS
→ getBackupFile(name)
→ previewDataJSON()
→ mostrar resumen
→ confirmar
→ restoreBackup(name)
```

Así una copia OPFS existente recibe la misma validación y preview que un JSON externo antes de reemplazar datos.

18.3 **no crea todavía** un backup OPFS automático del estado actual antes del restore. Esa garantía pertenece a 18.4.

## Backup cifrado

La restauración cifrada pasa a ser explícitamente de dos pasos.

### Paso 1 — Revisar backup

```text
seleccionar .gbenc
→ introducir contraseña
→ Revisar backup
→ decrypt/authenticate
→ previewDataJSON()
→ mostrar resumen
```

Implementación:

```text
previewEncryptedBackupText(...)
```

usa:

```text
decryptEncryptedBackupText(...)
→ previewDataJSON(...)
```

Contraseña incorrecta, ciphertext alterado o JSON interno inválido no muestran una confirmación destructiva.

### Paso 2 — Confirmar y restaurar

Solo con preview válido aparece:

```text
Confirmar y restaurar
```

El restore definitivo sigue pasando por el contrato de Fase 17 y vuelve a autenticar/descifrar antes de importar.

Si el usuario modifica la contraseña después del preview:

```text
preview → invalidado
```

y debe revisar nuevamente.

## CSV

`ImportConfirmation` sigue siendo reutilizable por CSV, pero:

- CSV importa una tabla individual;
- no usa `BackupImportPreview`;
- no se fuerza el resumen de backup completo sobre un archivo CSV;
- conserva su confirmación existente.

Esto evita mezclar el alcance del roadmap de Backup 2.0 con el flujo de intercambio tabular CSV.

## Atomicidad y no mutación

El preview es una operación de lectura/validación.

La suite comprueba:

```text
snapshot Dexie antes
→ preview JSON
→ snapshot Dexie después
→ igualdad
```

y también:

```text
snapshot Dexie antes
→ decrypt + preview cifrado
→ snapshot Dexie después
→ igualdad
```

Un archivo inválido rechazado por preview tampoco modifica datos.

## Versiones

Sin cambios respecto a 18.2:

```text
Dexie schema:        v14
Backup JSON:         v13
App version:         0.1.0
Encrypted envelope:  v1
```

18.3 no cambia persistencia ni formato.

## Fuera de alcance de 18.3

No se implementa anticipadamente:

- backup OPFS automático antes del import destructivo — 18.4;
- política final permanente contra migraciones destructivas — 18.5;
- cierre formal de Fase 18 — 18.5.

## Invariantes preservadas

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- preview valida antes de cualquier confirmación de restore completo;
- preview y restore comparten la misma ruta de preparación;
- preview no muta Dexie;
- JSON normal y cifrado siguen compartiendo el mismo contrato interno;
- compatibilidad legacy v3–v12 permanece;
- cobertura automática de 18.2 permanece activa;
- seguridad local de Fase 17 no se degrada;
- no se crea backup OPFS automático todavía;
- no se modifica Dexie;
- no se usa `db.clear()` como migración.

## Pruebas

`tests/phase-18-3-import-preview.test.ts` cubre:

- preview sin mutación;
- metadata de preview;
- seis dimensiones del resumen;
- definición de transactions;
- archivo inválido rechazado antes de escribir;
- paridad JSON normal / cifrado;
- contraseña cifrada incorrecta sin mutación;
- preview y import usando una sola función de preparación;
- preview obligatorio en JSON completo;
- preview de OPFS;
- UI cifrada de dos pasos;
- ausencia de adelanto de 18.4.

También se actualizó la regresión de Fase 17.5 para reconocer el nuevo flujo cifrado sin debilitar la garantía decrypt/authenticate-before-import.

## Gate técnico

Intento 1, run `36538705238`:

- typecheck detectó que `ImportConfirmation` también era usado por CSV;
- se separó `requirePreview` para exigir preview únicamente en restores completos.

Intento 2, run `36538869247`:

- typecheck y nueva suite pasaron;
- una regresión histórica de 17.5 esperaba literalmente el texto anterior del diálogo cifrado;
- se actualizó la expectativa a la nueva garantía de revisar/confirmar antes de reemplazar.

Gate funcional final, run `36539044319`:

- **401/401 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Siguiente checkpoint

**18.4 — Backup OPFS automático pre-import**

Debe crear una copia local automática del estado actual antes de ejecutar un import destructivo cuando OPFS esté disponible, y definir claramente el comportamiento cuando OPFS no esté disponible.

18.4 no queda iniciado por este documento.
