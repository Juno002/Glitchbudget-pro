# Fase 17.3 — Auto-lock

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 17.
Contratos previos: [phase-17-1.md](phase-17-1.md) y [phase-17-2.md](phase-17-2.md).
Plan de ejecución: [phase-17.md](phase-17.md).

Estado: **checkpoint completado**.

Fase 17 permanece **en progreso**. El backup cifrado y su restore/hardening siguen pendientes.

## Objetivo

Construir Auto-lock sobre App lock ya estable, con comportamiento local, explícito y determinista.

Auto-lock no existe sin App lock y no introduce red, telemetría ni heurísticas remotas.

## Configuración

Persistencia local:

```text
glitchbudget_auto_lock_v1
```

Registro v1:

```text
v
enabled: true
timeoutMinutes
```

Tiempos disponibles:

```text
1 minuto
5 minutos
15 minutos
30 minutos
```

La ausencia del registro significa:

```text
Auto-lock OFF
```

Por tanto, el comportamiento legacy permanece desactivado.

Al activar Auto-lock desde Ajustes por primera vez se usa **5 minutos** como valor inicial, que el usuario puede cambiar inmediatamente.

## Dependencia de App lock

Regla contractual:

```text
Auto-lock requires App lock
```

Si App lock no está activo:

- Auto-lock no puede activarse;
- cualquier configuración huérfana se ignora y elimina;
- la UI explica que App lock debe activarse primero.

Al desactivar App lock:

```text
glitchbudget_app_lock_v1
→ eliminado

glitchbudget_auto_lock_v1
→ eliminado
```

No queda un Auto-lock latente esperando una futura reactivación.

## Medición de inactividad

El runtime mantiene localmente el instante de la última actividad de la sesión.

Eventos que reinician el reloj:

```text
pointerdown
keydown
touchstart
wheel
```

No se persiste un historial de actividad.

La comparación es determinista:

```text
now - lastActivityAt >= timeout
→ lock
```

Cuando alcanza el umbral:

- `locked` pasa a `true`;
- `AppLockGate` vuelve a ocultar la UI financiera;
- se solicita el PIN existente de App lock.

Desbloquear correctamente reinicia el reloj de actividad.

## Segundo plano / foreground

No se depende exclusivamente de `setTimeout`, porque los navegadores pueden suspender o retrasar timers en segundo plano.

Al ocultarse la aplicación:

- se conserva el instante real de la última actividad;
- se cancela el timer activo.

Al volver a primer plano mediante:

```text
visibilitychange
pageshow
```

se calcula el tiempo real transcurrido desde la última actividad.

Si el umbral ya se cumplió:

```text
→ lock inmediato
```

Si todavía no:

```text
→ rearmar timer por el tiempo restante
```

Esto mantiene el comportamiento coherente en navegador móvil, PWA y pestañas suspendidas.

## Cambio de configuración

Cambiar el timeout:

- persiste el nuevo valor localmente;
- reinicia el reloj desde ese momento;
- no bloquea retroactivamente por tiempo anterior a la modificación.

Desactivar Auto-lock:

- elimina `glitchbudget_auto_lock_v1`;
- cancela el comportamiento de inactividad;
- App lock manual y bloqueo al reabrir siguen funcionando según 17.2.

## Sincronización local entre pestañas

El `AppLockProvider` escucha cambios locales de:

```text
glitchbudget_app_lock_v1
glitchbudget_auto_lock_v1
```

mediante el evento `storage`.

La configuración se actualiza entre pestañas sin red.

Un cambio de timeout en otra pestaña reinicia el reloj de actividad local de la pestaña receptora para evitar un bloqueo retroactivo inesperado.

## UI

Ajustes → Privacidad y seguridad muestra:

- App lock;
- Auto-lock como control separado;
- checkbox explícito de opt-in;
- selector de 1/5/15/30 minutos;
- explicación de que también se revisa el tiempo al volver desde segundo plano.

Sin App lock activo, Auto-lock se muestra informativo pero no configurable.

## Borrar todos los datos

La acción destructiva elimina también:

```text
glitchbudget_auto_lock_v1
```

junto con la configuración de App lock.

## Backup y schema

**Dexie:** permanece en v14.

**Backup JSON:** permanece en v12.

Auto-lock no se exporta en el backup financiero.

Es una preferencia de seguridad local del navegador/dispositivo, no un dato financiero portable.

## Limitaciones explícitas

Auto-lock:

- controla la sesión de UI;
- no cifra Dexie;
- no cifra backups;
- no protege frente a acceso directo a IndexedDB/localStorage;
- no sustituye el backup cifrado previsto para 17.4–17.5.

## Invariantes preservadas

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- opt-in explícito;
- cero red;
- cero telemetría;
- cero heurísticas remotas;
- Auto-lock solo funciona con App lock;
- App lock sigue siendo una barrera de UI, no cifrado de Dexie;
- configuraciones legacy permanecen OFF;
- Dexie no cambia;
- backup JSON normal no cambia;
- backup cifrado no se implementa anticipadamente.

## Pruebas

`tests/phase-17-3-auto-lock.test.ts` cubre:

- opciones canónicas 1/5/15/30;
- persistencia explícita;
- rechazo de registros inválidos;
- ausencia legacy;
- umbral exacto de inactividad;
- tiempo restante;
- eventos de actividad;
- `visibilitychange`;
- `pageshow`;
- bloqueo al volver a foreground;
- imposibilidad de Auto-lock sin App lock;
- limpieza al desactivar App lock;
- UI de opt-in;
- exclusión de Dexie y backup JSON;
- ausencia de red.

Regresiones de 17.1, 17.2 y Fase 7.5 se actualizaron para reconocer Auto-lock implementado sin debilitar sus contratos previos.

## Gate técnico

GitHub Actions `Quality checks` run `36530131884` verificó:

- **363/363 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

Los intentos previos detectaron únicamente una incompatibilidad del test con el target TypeScript por uso del flag regex `s`. Se corrigió usando una expresión compatible, sin modificar el runtime de Auto-lock.

## Siguiente checkpoint

**17.4 — Backup cifrado**

Debe añadir exportación cifrada opcional con Web Crypto y autenticación criptográfica, manteniendo el JSON normal disponible.

17.4 no queda iniciado por este documento.
