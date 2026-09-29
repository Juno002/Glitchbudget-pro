# Fase 17.5 — Restore cifrado + hardening + gate final

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 17.
Contratos previos: [phase-17-1.md](phase-17-1.md), [phase-17-2.md](phase-17-2.md), [phase-17-3.md](phase-17-3.md) y [phase-17-4.md](phase-17-4.md).
Plan de ejecución: [phase-17.md](phase-17.md).

Estado: **checkpoint completado**.

Con 17.5 queda **formalmente completada Fase 17 — Seguridad y privacidad local**.

Fase 18 no se inicia por este cierre.

## Objetivo

Cerrar Fase 17 con:

- restore cifrado autenticado;
- rechazo atómico de contraseña incorrecta/corrupción;
- reutilización del importador JSON canónico;
- hardening integral de Hide amounts, App lock y Auto-lock;
- compatibilidad del importador normal v3–v12;
- gate técnico final;
- documentación de formatos, límites y Definition of Done.

## Restore cifrado

La UI añade:

```text
Restaurar cifrado
```

Archivos esperados:

```text
*.gbenc
```

El flujo es:

```text
seleccionar archivo
→ solicitar contraseña localmente
→ parsear/validar envelope
→ derivar clave
→ AES-GCM authenticate + decrypt
→ obtener JSON plaintext
→ importDataJSON()
→ actualizar dashboard
```

El importador financiero **no se duplica**. El JSON descifrado pasa por exactamente el mismo contrato que un restore JSON normal.

## Validación del envelope

Antes de descifrar se exige:

```text
format = "GlitchBudget encrypted backup"
version = 1

KDF:
  PBKDF2
  SHA-256
  310,000 iterations

cipher:
  AES-GCM
  keyLength 256
  tagLength 128

salt:
  base64 válido
  16 bytes

nonce:
  base64 válido
  12 bytes

ciphertext:
  base64 válido
  longitud mínima compatible con tag GCM
```

Formato, versión o metadata no compatibles se rechazan antes de modificar datos.

## Contraseña incorrecta y corrupción

Contraseña incorrecta y fallo de autenticación AES-GCM utilizan un mensaje deliberadamente no concluyente:

```text
No se pudo abrir el backup cifrado.
La contraseña puede ser incorrecta o el archivo puede estar dañado.
```

La aplicación no afirma cuál de las dos causas ocurrió cuando no puede demostrarlo.

## Atomicidad

El orden está encapsulado en:

```text
src/lib/encrypted-backup-restore.ts
```

Contrato:

```text
decryptEncryptedBackupText(...)
↓
solo si autentica correctamente
↓
importDataJSON(...)
```

Por tanto:

- contraseña incorrecta → no se llama al importador;
- ciphertext manipulado → no se llama al importador;
- envelope inválido → no se llama al importador;
- JSON interno inválido → `importDataJSON` rechaza antes de escribir;
- errores de escritura mantienen las garantías transaccionales/rollback del importador canónico.

La suite verifica que Dexie y automatización local permanecen sin cambios ante contraseña incorrecta y ciphertext alterado.

## Round-trip completo

El gate prueba funcionalmente:

```text
Dexie + Local Automation
→ exportDataJSON v12
→ encrypt .gbenc
→ limpiar datos
→ decrypt
→ importDataJSON
→ snapshot final = snapshot original
```

Se restauran también las capas portables de Fase 16 que forman parte de JSON v12:

- Templates;
- Saved Filters;
- Rules.

App lock y Auto-lock siguen fuera del backup financiero por ser configuración local de acceso del dispositivo/navegador.

## Compatibilidad JSON normal

17.5 valida funcionalmente que el importador normal conserva rutas para:

```text
v3
v4
v5
v6
v7
v8
v9
v10
v11
v12
```

El backup cifrado no altera esa compatibilidad: solo encapsula el JSON canónico.

El JSON normal sigue siendo una opción visible y utilizable.

## Hardening de privacidad local

### Hide amounts

Permanece como:

```text
visual-disclosure protection
```

No se transforma en cifrado.

`BalanceVisibilityProvider` sigue por fuera de App lock y ambos mecanismos coexisten sin compartir claves de storage.

### App lock

Se preserva:

- legacy sin configuración → disabled;
- PIN incorrecto → no desbloquea;
- cambio de PIN requiere PIN actual;
- desactivar requiere PIN actual;
- verificador local PBKDF2;
- PIN no almacenado en texto claro;
- UI financiera detrás de `AppLockGate`.

Regla final:

```text
App lock
≠
Dexie encryption
```

### Auto-lock

Se preserva:

- depende de App lock;
- opt-in;
- 1/5/15/30 minutos;
- actividad local reinicia reloj;
- foreground comprueba tiempo real;
- desactivar App lock elimina Auto-lock;
- sin App lock no opera.

## Privacy from servers

Permanece garantizada por arquitectura:

- guard local-only;
- CSP `connect-src 'none'`;
- ninguna ruta de backup cifrado usa fetch/XHR/WebSocket/beacon;
- contraseña nunca se transmite;
- datos financieros no se transmiten.

## Contratos/versiones finales

### Dexie

```text
v14
```

Fase 17 no añade migración de Dexie.

### Backup JSON normal

```text
v12
```

Sin cambio durante Fase 17.

### Encrypted backup envelope

```text
GlitchBudget encrypted backup
version 1
```

KDF:

```text
PBKDF2-SHA-256
310,000 iterations
salt 16 bytes
```

Cipher:

```text
AES-256-GCM
nonce 12 bytes
tag 128 bits
```

## Limitaciones conocidas

### App lock / Auto-lock

Son barreras de UI y sesión.

No protegen frente a una persona con capacidad de:

- inspeccionar/modificar localStorage;
- leer IndexedDB directamente;
- borrar configuración del navegador;
- acceder a archivos del dispositivo.

No cifran Dexie.

### Hide amounts

Oculta valores en las superficies diseñadas para ello, pero no cifra ni elimina el dato subyacente.

### Backup cifrado

Protege el archivo exportado con la contraseña elegida.

Si se pierde la contraseña, GlitchBudget no puede recuperarla.

Como JavaScript usa memoria gestionada, no se afirma secure memory erasure de strings; la garantía es no persistencia/no transmisión de la contraseña.

Las copias OPFS históricas continúan siendo JSON normal local y no se convierten retroactivamente a cifrado.

## Definition of Done — Fase 17

Fase 17 se considera completada porque:

- [x] Privacy from servers permanece local-only.
- [x] Hide amounts existe y su alcance está definido.
- [x] App lock existe.
- [x] App lock no se presenta como cifrado de Dexie.
- [x] PIN no se almacena en texto claro.
- [x] Auto-lock existe y depende de App lock.
- [x] Auto-lock funciona por inactividad y foreground.
- [x] Backup cifrado opcional existe.
- [x] Web Crypto se usa para cifrado/descifrado.
- [x] El formato cifrado es versionado.
- [x] Se usa cifrado autenticado.
- [x] Contraseña nunca se transmite ni se persiste por el flujo de backup.
- [x] JSON normal continúa disponible.
- [x] Restore cifrado autentica antes de importar.
- [x] Contraseña incorrecta/corrupción no generan restore parcial.
- [x] Round-trip cifrado restaura datos y automatización.
- [x] Importador normal mantiene compatibilidad v3–v12.
- [x] Dexie permanece v14.
- [x] JSON normal permanece v12.
- [x] Guard local-only sigue verde.
- [x] Gate completo pasa.

## Pruebas finales

`tests/phase-17-5-security-gate.test.ts` añade cobertura de:

- contrato final de seguridad;
- validación de metadata del envelope;
- contraseña incorrecta;
- ciphertext manipulado;
- atomicidad;
- round-trip encrypt → decrypt → import;
- restauración de automatización local;
- compatibilidad JSON v3–v12;
- App lock legacy;
- PIN incorrecto;
- Auto-lock;
- coexistencia Hide amounts/App lock;
- UI de restore cifrado;
- orden decrypt-before-import;
- ausencia de red;
- ausencia de persistencia/transmisión de contraseña.

Las suites 17.1–17.4 continúan activas como regresión.

## Gate funcional

GitHub Actions `Quality checks` run `36533876517` verificó:

- **379/379 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Cierre

```text
17.1 ✅ Contrato de seguridad local
17.2 ✅ App lock
17.3 ✅ Auto-lock
17.4 ✅ Backup cifrado
17.5 ✅ Restore + hardening + gate
```

**Fase 17 — Seguridad y privacidad local: COMPLETADA.**

Siguiente fase del roadmap: **Fase 18**.

Fase 18 **no está iniciada**. Requiere autorización explícita del usuario.
