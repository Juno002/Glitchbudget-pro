# Fase 17.1 — Contrato de seguridad local

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 17.
Plan de ejecución: [phase-17.md](phase-17.md).

Estado: **checkpoint completado**.

Fase 17 permanece **en progreso**. App lock, Auto-lock y backup cifrado todavía no están implementados.

## Objetivo

Fijar qué problema resuelve cada mecanismo de Fase 17 antes de construir seguridad sobre supuestos ambiguos.

El roadmap separa dos fronteras:

```text
Privacy from servers
→ garantizada por arquitectura local-only

Privacy from someone using the device
→ Hide amounts
→ App lock
→ Auto-lock
```

El backup cifrado permanece como una protección separada para archivos exportados.

## Contrato canónico

El contrato executable queda en:

```text
src/domain/local-security.ts
```

### Privacy from servers

Estado:

```text
guaranteed-local-only
```

Depende de la arquitectura existente, no de App lock.

Se preservan:

- ausencia de APIs/SDKs remotos en el dominio financiero;
- guard local-only;
- CSP de producción con `connect-src 'none'`.

### Hide amounts

Estado: **implementado**.

Protege:

```text
visual disclosure
```

No protege:

- Dexie en reposo;
- backups/exportaciones;
- Developer Tools;
- acceso del sistema/dispositivo a archivos.

Persistencia actual:

```text
localStorage
glitchbudget_balances_hidden_v1
```

Legacy:

```text
key ausente
→ Hide amounts OFF
```

La key quedó centralizada en el contrato y es reutilizada por el contexto React y por el script de arranque previo a hydration.

### App lock

Estado: **planificado para 17.2**.

Protección contractual:

```text
ui-access
```

No debe afirmarse que protege:

- Dexie en reposo;
- backups por cifrado;
- acceso directo del dispositivo a almacenamiento/archivos.

Legacy:

```text
sin configuración
→ App lock disabled
```

Regla esencial:

```text
App lock
≠
Dexie encryption
```

### Auto-lock

Estado: **planificado para 17.3**.

Protección contractual:

```text
ui-session-after-inactivity
```

Dependencia:

```text
Auto-lock requires App lock
```

Legacy:

```text
sin configuración
→ Auto-lock disabled
```

Auto-lock no cifra Dexie ni backups.

### Backup cifrado

Estado: **planificado para 17.4–17.5**.

Contrato ya congelado:

- opcional;
- Web Crypto;
- cifrado autenticado;
- contraseña nunca transmitida;
- contraseña nunca almacenada remotamente;
- backup JSON normal permanece disponible.

17.1 no implementa criptografía anticipadamente.

## UI

Ajustes → Privacidad y seguridad ahora describe explícitamente las fronteras:

- Hide amounts no cifra datos almacenados ni backups;
- App lock se implementará como bloqueo local de interfaz;
- la UI dice expresamente que App lock no es cifrado de Dexie;
- Auto-lock se implementará sobre App lock.

No existen controles funcionales falsos para App lock o Auto-lock en 17.1.

## Persistencia y schema

**Dexie:** sin cambios, permanece en v14.

**Backup JSON:** sin cambios, permanece en v12.

**localStorage:** solo se consolida la key existente de Hide amounts; 17.1 no añade credenciales, PIN, hash ni configuración funcional de App lock/Auto-lock.

## Legacy defaults

`LOCAL_SECURITY_LEGACY_DEFAULTS` congela:

```ts
{
  hideAmounts: false,
  appLockEnabled: false,
  autoLockEnabled: false
}
```

Un usuario existente que actualiza a Fase 17 no queda bloqueado automáticamente.

## Invariantes preservadas

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- cero transmisión de datos financieros;
- cero transmisión de PIN/contraseña;
- cero almacenamiento remoto de credenciales;
- App lock no se describe como cifrado de Dexie;
- Hide amounts sigue siendo una preferencia local de presentación;
- backup JSON normal sigue vigente;
- no se implementa App lock antes de 17.2;
- no se implementa Auto-lock antes de 17.3;
- no se implementa cifrado antes de 17.4.

## Pruebas

`tests/phase-17-1-local-security-contract.test.ts` verifica:

- separación server privacy / device-user privacy;
- alcance real de Hide amounts;
- defaults legacy;
- frontera de App lock;
- dependencia de Auto-lock;
- backup cifrado opcional y separado;
- key canónica de Hide amounts;
- ausencia de controles falsos;
- ausencia de persistencia de lock en Dexie;
- ausencia de criptografía implementada antes de 17.4;
- CSP/local-only.

También se actualizaron regresiones históricas de UX y Fase 7.5 para depender del contrato centralizado en vez de detalles hardcodeados previos.

## Gate técnico

GitHub Actions `Quality checks` run `36506480694` verificó:

- **347/347 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

Los dos primeros intentos del gate detectaron:

1. un nombre de import duplicado durante la centralización de la key;
2. dos regresiones históricas acopladas a texto/key hardcodeados.

Ambos se corrigieron sin relajar el contrato.

## Siguiente checkpoint

**17.2 — App lock**

Debe implementar el bloqueo local de la interfaz respetando el contrato de 17.1.

17.2 no queda iniciado por este documento.
