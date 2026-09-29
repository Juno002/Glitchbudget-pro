# Fase 17 — Plan de ejecución en cinco iteraciones

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 17.

Este documento **no redefine el roadmap**. Solo divide su alcance en cinco checkpoints verificables para facilitar la ejecución y permitir retomar el trabajo en otro chat sin perder el orden acordado.

## Fuente de verdad

El roadmap exige separar correctamente dos problemas:

### Privacy from servers

Ya está garantizada por la arquitectura local-only existente.

Fase 17 no debe introducir red, sincronización, telemetría financiera ni dependencia remota para proteger datos.

### Privacy from someone using the device

Añadir:

```text
Hide amounts
App lock
Auto-lock
```

Si App lock utiliza PIN o biometría, la UI debe explicar correctamente que **bloquear la aplicación no equivale a cifrar Dexie**.

### Backup cifrado

Añadir exportación cifrada opcional mediante Web Crypto con autenticación criptográfica.

El formato debe ser versionado e incluir la familia de campos indicada por el roadmap:

```text
GlitchBudget encrypted backup
version
KDF metadata
salt
nonce
ciphertext
```

La contraseña:

- nunca se envía;
- nunca se almacena remotamente.

El backup JSON normal puede continuar disponible.

---

# Iteraciones acordadas

## 17.1 — Contrato de seguridad local ✅

Objetivo: fijar las fronteras de seguridad antes de implementar App lock.

Debe documentar y probar:

- qué protege `Hide amounts`;
- qué protege App lock;
- qué protege Auto-lock;
- qué **no** protege cada mecanismo;
- persistencia local de preferencias de seguridad;
- comportamiento legacy cuando no existe configuración previa;
- separación explícita entre bloqueo de UI y cifrado de datos;
- continuidad de la arquitectura local-only.

Regla esencial:

```text
App lock
≠
Dexie encryption
```

No crear una promesa de cifrado de base de datos si solo existe una barrera de acceso en la interfaz.

### Estado actual relevante

`Hide amounts` ya existe en la aplicación y sirve como punto de partida. App lock y Auto-lock todavía no existen funcionalmente.

---

## 17.2 — App lock ✅

Objetivo: añadir un bloqueo local de la aplicación para protegerla frente a otra persona que use el mismo dispositivo/navegador.

Dirección acordada:

- bloqueo local;
- PIN como mecanismo base;
- no guardar el PIN en texto claro;
- almacenar únicamente material local necesario para verificarlo;
- desbloqueo sin red;
- la UI financiera no debe quedar accesible mientras la aplicación esté bloqueada;
- desactivar/cambiar el bloqueo requiere el flujo de verificación correspondiente;
- ninguna afirmación de que Dexie queda cifrada.

El mecanismo debe seguir siendo compatible con el guard local-only.

No añadir biometría salvo que se haga de forma correcta y sin desviar el alcance del roadmap.

---

## 17.3 — Auto-lock ✅

Objetivo: construir Auto-lock sobre App lock ya estable.

Debe incluir:

- opt-in explícito;
- tiempos de bloqueo comprensibles;
- bloqueo después de inactividad según la configuración;
- comportamiento coherente cuando la aplicación vuelve a primer plano después del tiempo configurado;
- ausencia de auto-lock cuando App lock está desactivado;
- configuración y evaluación completamente locales.

No introducir heurísticas remotas ni comportamiento “inteligente” fuera del roadmap.

---

## 17.4 — Backup cifrado ✅

Objetivo: añadir exportación cifrada **opcional** sin retirar el JSON normal.

Requisitos del roadmap:

- Web Crypto;
- cifrado autenticado;
- formato versionado;
- contraseña nunca enviada;
- contraseña nunca almacenada remotamente.

Formato conceptual:

```text
GlitchBudget encrypted backup
version
KDF metadata
salt
nonce
ciphertext
```

Dirección técnica prevista para implementación, sujeta a validación en este checkpoint:

- derivación de clave local mediante un KDF apropiado de Web Crypto;
- salt aleatorio;
- nonce/IV aleatorio;
- cifrado autenticado, previsiblemente AES-GCM;
- metadata suficiente para poder descifrar futuras versiones del formato;
- contenido interno basado en el backup JSON canónico vigente;
- contraseña mantenida solo durante la operación necesaria.

El JSON normal sigue disponible como opción separada.

---

## 17.5 — Restore cifrado + hardening + gate final ✅

Objetivo: cerrar Fase 17 con restauración segura y pruebas completas.

Debe incluir:

### Restore cifrado

- detectar el formato cifrado;
- solicitar contraseña localmente;
- derivar la clave usando la metadata del archivo;
- autenticar y descifrar;
- pasar el JSON recuperado por el importador canónico existente;
- no modificar datos si la contraseña es incorrecta;
- no modificar datos si el ciphertext o metadata fueron alterados;
- mensajes de error que no afirmen causas criptográficas no comprobadas.

### Hardening

Validar como mínimo:

- App lock legacy/no configurado;
- PIN incorrecto;
- cambio/desactivación de lock;
- Auto-lock;
- regreso a primer plano;
- Hide amounts coexistiendo con App lock;
- formato cifrado versionado;
- round-trip encrypt → decrypt → import;
- contraseña incorrecta;
- archivo manipulado;
- backups JSON normales todavía utilizables;
- backups JSON v3–v12 siguen dentro del contrato del importador normal;
- local-only;
- ausencia de transmisión de contraseñas y datos financieros.

### Gate final

Antes de cerrar Fase 17:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

más los guards local-only y pruebas específicas de seguridad.

Al cerrar 17.5:

- documentar Definition of Done;
- registrar cambios de esquema/formato;
- registrar limitaciones conocidas;
- confirmar explícitamente que App lock no se presenta como cifrado de Dexie;
- cerrar formalmente Fase 17;
- detenerse antes de Fase 18 hasta autorización del usuario.

---

# Invariantes de toda Fase 17

Durante 17.1–17.5:

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- cero transmisión de datos financieros para implementar seguridad;
- cero transmisión de PIN o contraseña;
- cero almacenamiento remoto de PIN o contraseña;
- App lock nunca se describe como cifrado de Dexie si solo bloquea la UI;
- backup cifrado es opcional;
- backup JSON normal sigue disponible;
- cifrado y descifrado ocurren localmente mediante Web Crypto;
- cualquier formato cifrado debe ser versionado;
- corrupción o contraseña incorrecta no deben provocar restore parcial;
- no avanzar a Fase 18 antes de completar 17.5 y su gate.

# Estado actual

```text
17.1 — Contrato de seguridad local        ✅ completado
17.2 — App lock                           ✅ completado
17.3 — Auto-lock                          ✅ completado
17.4 — Backup cifrado                     ✅ completado
17.5 — Restore + hardening + gate final   ✅ completado
```

**Fase 17 — Seguridad y privacidad local está completada. Las cinco iteraciones 17.1–17.5 quedaron cerradas; Fase 18 no está iniciada y requiere autorización explícita del usuario.**
