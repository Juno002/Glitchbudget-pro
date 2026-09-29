# Fase 17.2 — App lock

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 17.
Contrato previo: [phase-17-1.md](phase-17-1.md).
Plan de ejecución: [phase-17.md](phase-17.md).

Estado: **checkpoint completado**.

Fase 17 permanece **en progreso**. Auto-lock y backup cifrado siguen pendientes.

## Objetivo

Añadir un bloqueo local de la interfaz para proteger GlitchBudget frente a otra persona que abra la aplicación en el mismo navegador/dispositivo, sin presentar esa barrera como cifrado de Dexie.

## Contrato implementado

`LOCAL_SECURITY_CONTRACT.appLock` queda en estado:

```text
implemented-17.2
```

Protege:

```text
ui-access
```

No protege:

- Dexie en reposo;
- archivos del dispositivo;
- backups mediante cifrado;
- acceso directo mediante Developer Tools o manipulación del almacenamiento local.

Regla preservada:

```text
App lock
≠
Dexie encryption
```

## PIN

App lock utiliza un PIN numérico de:

```text
6–12 dígitos
```

El PIN **no se guarda en texto claro**.

La configuración persistida usa:

```text
localStorage
glitchbudget_app_lock_v1
```

Registro v1:

```text
v
kdf
iterations
salt
verifier
```

Verificación:

```text
PBKDF2
SHA-256
310,000 iteraciones
salt aleatorio de 16 bytes
verifier de 256 bits
```

El valor persistido contiene únicamente material necesario para comprobar el PIN localmente.

No se transmite PIN, salt ni verifier.

## Apertura y bloqueo de UI

`AppLockProvider` carga la configuración local al iniciar.

Comportamiento:

```text
sin configuración
→ App lock disabled
→ UI financiera disponible
```

```text
configuración válida existente
→ App lock enabled
→ sesión comienza locked
→ pedir PIN
→ PIN correcto
→ montar UI financiera
```

El `AppLockGate` está montado **antes de `FinanceProvider`**.

Mientras la sesión está bloqueada:

- no se renderiza la UI financiera;
- no se monta `FinanceProvider`;
- se muestra exclusivamente la superficie local de desbloqueo;
- PIN incorrecto no desbloquea.

Una sesión desbloqueada puede volver a bloquearse con:

```text
Bloquear ahora
```

17.2 no implementa todavía bloqueo por inactividad; eso queda reservado para 17.3.

## Gestión en Ajustes

Ajustes → Privacidad y seguridad permite:

### Activar

- introducir PIN;
- confirmar PIN;
- validar longitud/formato;
- crear salt y verifier;
- mantener la sesión actual desbloqueada después de activar.

La próxima apertura/reload comienza bloqueada.

### Cambiar PIN

Requiere:

```text
PIN actual correcto
+
nuevo PIN válido
+
confirmación
```

Un PIN actual incorrecto no modifica el verifier existente.

### Desactivar

Requiere PIN actual correcto.

PIN incorrecto:

```text
→ App lock permanece activo
```

PIN correcto:

```text
→ eliminar glitchbudget_app_lock_v1
→ App lock disabled
```

### Bloqueo manual

Con App lock activo:

```text
Bloquear ahora
→ locked
→ desmontar UI financiera
→ pedir PIN
```

## Sincronización entre pestañas

Cambios en `glitchbudget_app_lock_v1` recibidos mediante el evento local `storage` actualizan el estado:

- una configuración válida añadida/reemplazada bloquea la otra pestaña;
- eliminar la configuración desactiva el lock en la otra pestaña.

No existe sincronización remota.

## Backup y schema

**Dexie:** permanece en v14.

**Backup JSON:** permanece en v12.

App lock **no se exporta** dentro del backup financiero.

Motivo: el verifier es una configuración de acceso local del navegador/dispositivo, no dato financiero portable.

El backup cifrado del roadmap sigue siendo un mecanismo distinto reservado para 17.4–17.5.

## Borrar todos los datos

La acción destructiva existente elimina también:

```text
glitchbudget_app_lock_v1
```

Después de la recarga, App lock queda desactivado.

## Limitaciones explícitas

App lock es una barrera de privacidad de UI, no una frontera criptográfica de almacenamiento.

Una persona con capacidad de:

- abrir Developer Tools;
- borrar/modificar localStorage;
- leer directamente IndexedDB/Dexie;
- acceder a archivos exportados;

puede eludir o rodear esta barrera.

Eso es coherente con el contrato de Fase 17: el cifrado de backup se trata por separado y el roadmap no exige cifrar Dexie.

## Invariantes preservadas

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- PIN nunca almacenado en texto claro;
- PIN nunca transmitido;
- verificación completamente local;
- no se añade endpoint ni SDK remoto;
- App lock no se afirma como cifrado de Dexie;
- usuarios legacy sin configuración permanecen desbloqueados;
- Auto-lock no se implementa anticipadamente;
- backup cifrado no se implementa anticipadamente;
- backup JSON normal sigue disponible;
- App lock no entra al backup JSON.

## Pruebas

`tests/phase-17-2-app-lock.test.ts` cubre:

- formato de PIN;
- ausencia de PIN en el registro persistido;
- creación de salt/verifier;
- verificación correcta/incorrecta;
- legacy sin configuración;
- cambio de PIN con verificación previa;
- desactivación con verificación previa;
- contrato UI-only;
- orden `AppLockGate → FinanceProvider`;
- gestión en Ajustes;
- Auto-lock aún pendiente;
- App lock fuera de Dexie y backup JSON;
- ausencia de red.

También se actualizaron regresiones históricas de 17.1 y Fase 7.5 para reconocer la implementación real sin debilitar sus invariantes.

## Gate técnico

GitHub Actions `Quality checks` run `36508079352` verificó:

- **355/355 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

Intentos previos detectaron:

1. un icono no disponible en la versión instalada de `lucide-react`;
2. una regresión histórica de Fase 7.5 acoplada a que el texto de App lock viviera directamente en `settings-dialog.tsx`.

Ambos fueron corregidos sin modificar el contrato funcional.

## Siguiente checkpoint

**17.3 — Auto-lock**

Debe construirse sobre App lock ya estable y permanecer completamente local.

17.3 no queda iniciado por este documento.
