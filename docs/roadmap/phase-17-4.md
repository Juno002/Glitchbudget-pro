# Fase 17.4 — Backup cifrado opcional

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 17.
Contratos previos: [phase-17-1.md](phase-17-1.md), [phase-17-2.md](phase-17-2.md) y [phase-17-3.md](phase-17-3.md).
Plan de ejecución: [phase-17.md](phase-17.md).

Estado: **checkpoint completado**.

Fase 17 permanece **en progreso**. La restauración cifrada, hardening final y cierre formal quedan reservados para 17.5.

## Objetivo

Añadir una exportación cifrada **opcional** mediante Web Crypto y autenticación criptográfica, sin retirar ni modificar el backup JSON normal.

El JSON financiero canónico permanece en:

```text
v12
```

17.4 no crea un segundo modelo financiero. El JSON v12 existente se convierte en plaintext de un sobre cifrado versionado.

## Formato cifrado

Formato v1:

```text
format: "GlitchBudget encrypted backup"
version: 1
kdf
cipher
salt
nonce
ciphertext
```

La metadata KDF queda explícita:

```text
PBKDF2
SHA-256
310,000 iteraciones
```

Cifrado:

```text
AES-GCM
clave de 256 bits
tag de autenticación de 128 bits
```

Aleatoriedad por archivo:

```text
salt  = 16 bytes
nonce = 12 bytes
```

Ambos se generan mediante:

```text
crypto.getRandomValues
```

## Autenticación

La metadata estructural del formato participa como Additional Authenticated Data (AAD):

```text
format
version
kdf
cipher
```

Por tanto, el ciphertext queda autenticado junto con el contrato criptográfico esperado.

Cambiar ciphertext o utilizar metadata incompatible debe impedir una descodificación autenticada correcta en 17.5.

## Contraseña

La contraseña:

- se introduce únicamente para crear el archivo;
- no se guarda en localStorage;
- no se guarda en sessionStorage;
- no se guarda en IndexedDB/Dexie;
- no se transmite;
- no forma parte del archivo cifrado.

Longitud admitida:

```text
8–128 caracteres
```

No se normaliza ni recorta la contraseña: se deriva la clave a partir de la secuencia exacta introducida.

La UI limpia sus estados de contraseña/confirmación después de una exportación exitosa o al cancelar el formulario.

Como JavaScript no garantiza borrado seguro de strings de memoria gestionada, la documentación no afirma secure memory erasure; la garantía real es **no persistencia y no transmisión**.

## Payload interno

El flujo es:

```text
exportDataJSON()
→ JSON financiero canónico v12
→ UTF-8
→ PBKDF2-SHA-256
→ AES-256-GCM
→ encrypted envelope v1
→ descarga .gbenc
```

Por ello el archivo cifrado conserva exactamente el contenido que habría producido la exportación JSON normal, incluyendo las capas de automatización local que ya pertenecen al contrato v12.

App lock y Auto-lock permanecen fuera del backup financiero, igual que en 17.2–17.3.

## UI

Datos y backups mantiene visible:

```text
Exportar a JSON
```

y añade como opción separada:

```text
Exportar cifrado
```

La exportación cifrada solicita:

- contraseña;
- confirmación;
- mínimo de 8 caracteres.

Archivo descargado:

```text
glitchbudget-encrypted-backup-YYYY-MM-DD.gbenc
```

La UI informa que:

- el cifrado ocurre localmente con Web Crypto;
- la contraseña no se envía ni se guarda;
- si se pierde la contraseña, el archivo no podrá recuperarse;
- restore cifrado todavía no está disponible en 17.4 y llegará en 17.5.

## Backup JSON normal

El roadmap permite mantener el backup normal y 17.4 lo conserva explícitamente.

No cambia:

- botón Exportar a JSON;
- formato JSON v12;
- importador JSON normal;
- backups legacy v3–v12;
- copias OPFS existentes.

Las copias OPFS locales actuales siguen siendo JSON normal sin cifrar; 17.4 no altera silenciosamente su formato.

## Restore cifrado

**No implementado en 17.4.**

No existe todavía una ruta funcional que acepte `.gbenc` para restaurar datos.

La restauración, validación del sobre, contraseña incorrecta, corrupción y atomicidad pertenecen a:

**17.5 — Restore cifrado + hardening + gate final.**

## Schema y almacenamiento

**Dexie:** permanece en v14.

**Backup JSON normal:** permanece en v12.

**Encrypted envelope:** nuevo formato externo v1; no es una migración de Dexie ni una nueva versión del JSON financiero.

No se persiste configuración criptográfica ni contraseña en la aplicación.

## Invariantes preservadas

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- backup cifrado es opcional;
- backup JSON normal sigue disponible;
- Web Crypto únicamente;
- cifrado autenticado;
- formato versionado;
- salt y nonce aleatorios por exportación;
- contraseña nunca transmitida;
- contraseña nunca almacenada remotamente;
- contraseña tampoco se persiste localmente por esta función;
- cero red;
- App lock/Auto-lock siguen siendo problemas separados;
- no se implementa restore cifrado anticipadamente;
- no se modifica Dexie;
- no se modifica JSON v12.

## Pruebas

`tests/phase-17-4-encrypted-backup.test.ts` verifica:

- contrato versionado;
- PBKDF2-SHA-256;
- AES-256-GCM;
- password bounds;
- salt aleatorio;
- nonce aleatorio;
- ciphertext distinto entre exportaciones;
- ausencia de plaintext sensible;
- ausencia de contraseña en el sobre;
- round-trip criptográfico de prueba;
- fallo de autenticación al manipular ciphertext;
- presencia de los campos requeridos por el roadmap;
- JSON v12 normal intacto;
- JSON normal todavía disponible en UI;
- export cifrado como opción separada;
- ausencia de restore cifrado anticipado;
- Web Crypto;
- ausencia de red;
- ausencia de storage de contraseña.

## Gate técnico

GitHub Actions `Quality checks` run `36531177196` verificó:

- **370/370 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Siguiente checkpoint

**17.5 — Restore cifrado + hardening + gate final**

Debe:

- detectar/validar el sobre cifrado;
- solicitar contraseña;
- derivar clave según metadata;
- autenticar y descifrar;
- pasar el JSON recuperado al importador canónico;
- rechazar contraseña incorrecta/corrupción antes de modificar datos;
- completar hardening y cierre formal de Fase 17.

17.5 no queda iniciado por este documento.
