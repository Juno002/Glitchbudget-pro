# Auditoría de viabilidad: Capacitor para Android/iOS

**Fecha:** 3 de octubre de 2026  
**Repositorio:** `Juno002/Glitchbudget-pro`  
**Commit auditado:** `8cb6c31` (`main`)  
**Alcance:** determinar si Prisma puede empaquetarse más adelante con Capacitor sin reescribir el motor financiero.

## Veredicto

**Sí, es viable, con viabilidad alta para una primera versión móvil basada en el mismo frontend.** No hay un bloqueo arquitectónico que obligue a migrar a React Native, Ionic UI u otra reescritura.

La forma correcta sería empaquetar el resultado estático actual de Next.js como assets locales de Capacitor. La integración no debe hacerse todavía como cambio funcional del producto: primero hay que completar una prueba de concepto nativa y resolver los bordes de almacenamiento/archivos que hoy dependen de capacidades del navegador.

### Calificación resumida

| Área | Estado | Evaluación |
|---|---|---|
| Build y empaquetado | Verde | `next.config.ts` ya usa `output: 'export'`; el destino natural de Capacitor es `out/`. |
| Backend/server runtime | Verde | No hay rutas API ni dependencia de servidor; el proyecto es local-only. |
| Motor financiero | Verde | El dominio es TypeScript puro y está separado de React/DOM según los gates existentes. |
| Persistencia principal | Verde con pruebas | Dexie/IndexedDB, `localStorage` y Web Crypto son utilizables en WebViews modernas; falta matriz real Android/iOS. |
| OPFS / backups locales | Amarillo | Se detecta soporte y se degrada si no existe, pero debe verificarse en el WebView y durante suspensión/actualización. |
| Exportar/descargar archivos | Amarillo | Usa `Blob` + `<a download>`; en app nativa conviene reemplazarlo o complementarlo con Filesystem/Share. |
| Service Worker/PWA | Amarillo | Es útil para web, pero no debe ser requisito de la app nativa; conviene desactivar el registro cuando se ejecuta dentro de Capacitor. |
| UX móvil | Verde con QA pendiente | Ya existen safe areas, `visualViewport`, navegación móvil y pruebas responsive; falta probar teclado y ciclo de vida físico. |
| Integración de plugins nativos | Verde | No se requiere para el shell inicial; se puede añadir después para compartir, biometría y archivos. |

## Evidencia del repositorio

### Lo que favorece la integración

1. **Salida estática ya configurada.** `next.config.ts` declara `output: 'export'`, `trailingSlash: true` e imágenes sin optimización del servidor. Capacitor requiere un directorio de assets construido con `index.html` en la raíz; `out/` encaja con ese contrato.
2. **Sin servidor de aplicación.** El guard `scripts/check-local-only.mjs` rechaza rutas server/API, primitivas de red y SDKs remotos. El CSP generado mantiene `connect-src 'none'`.
3. **Separación del dominio.** El proyecto contiene un motor financiero local-first y las pruebas de arquitectura impiden que el dominio dependa de React, Dexie o APIs del navegador. Esto reduce el riesgo de que Capacitor contamine los cálculos.
4. **Persistencia local explícita.** Dexie usa el esquema actual v15 sobre IndexedDB. Preferencias menores usan `localStorage`; el cifrado usa Web Crypto. Son APIs web estándar apropiadas para una WebView moderna.
5. **Trabajo previo de móvil web.** Ya se contemplan safe areas, `100dvh`, `visualViewport`, navegación táctil, foco y layouts estrechos. Esto no sustituye dispositivos físicos, pero reduce el trabajo de adaptación visual.
6. **Backups con degradación controlada.** OPFS se comprueba con `hasOPFS()` antes de utilizarlo y la importación/exportación normal existe aparte del backup local automático.

### Puntos que requieren adaptación o validación

#### 1. OPFS y persistencia

`src/lib/opfs.ts` usa `navigator.storage.getDirectory()` para backups automáticos y la gestión de copias internas. WebKit documenta soporte de Origin Private File System desde iOS 15.2, pero la app debe probarse en el `WKWebView` concreto incluido por la versión objetivo de Capacitor/iOS. También se debe comprobar:

- conservar IndexedDB y OPFS tras cerrar/reabrir la app;
- conservarlos después de actualización de la app;
- comportamiento con poco espacio y app suspendida;
- modo sin OPFS: el flujo no debe bloquear la exportación/importación manual;
- borrado de datos y reinstalación, documentando que son operaciones destructivas.

**Recomendación:** mantener Dexie como almacenamiento financiero canónico. No mover el ledger a un plugin nativo durante la primera integración. Usar un plugin de Filesystem solo para archivos que el usuario quiera compartir o guardar fuera del almacenamiento privado de la app.

#### 2. Descargas y compartir

La exportación JSON/CSV actual crea un `Blob`, un object URL y un enlace con descarga. Eso funciona en navegador, pero una WebView nativa puede no mostrar un diálogo de descarga ni una ubicación visible para el usuario.

**Adaptación prevista:** añadir una abstracción de exportación con dos implementaciones:

- navegador/PWA: conservar `Blob` + descarga actual;
- Capacitor: escribir temporalmente mediante `@capacitor/filesystem` y ofrecer `@capacitor/share` o el mecanismo nativo equivalente.

La importación mediante `<input type="file">` debe probarse en Android e iOS; si el selector de archivos nativo no conserva el flujo esperado, se añadirá una ruta de Filesystem/Share específica.

#### 3. Service Worker

`src/components/pwa-registration.tsx` registra `/sw.js` solo en producción. El Service Worker y el precache son correctos para la distribución web, pero en Capacitor los assets ya viajan dentro de la aplicación y el ciclo de actualización lo controla la distribución nativa.

**Adaptación prevista:** detectar `Capacitor.isNativePlatform()` y omitir el registro del Service Worker en Android/iOS. No cambiar el comportamiento PWA web.

#### 4. Navegación y ciclo de vida

La navegación usa `history.pushState` y query strings; es compatible con el shell web local, pero debe verificarse el botón atrás de Android, el gesto atrás de iOS y la restauración tras suspensión. Los listeners existentes para `visibilitychange` y `pageshow` son una buena base, pero no sustituyen un evento nativo de app activa/inactiva si más adelante se necesita reaccionar a ellos.

#### 5. Seguridad y biometría

El App Lock actual protege la interfaz mediante un contrato local de PIN y **no cifra Dexie en reposo**. Empaquetar la web con Capacitor no cambia ese límite. Para una versión distribuida en tiendas, la biometría y el almacenamiento seguro de secretos deberían ser una mejora opt-in posterior, no una falsa promesa de seguridad derivada del empaquetado.

#### 6. Safe areas y teclado

El código ya usa `env(safe-area-inset-*)`, `visualViewport` y layouts móviles. Falta la prueba física con teclado virtual, notch/isla dinámica, rotación, barras del sistema, modo oscuro del sistema y tamaños de texto grandes. Debe incluirse tanto Android como iOS si se anuncian ambas plataformas.

## Resultado de validación automatizada

Ejecutado sobre el commit auditado:

- `npm run check:local`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado.
- `npm test`: **730 pruebas aprobadas, 0 fallos**.
- `npm run build`: aprobado; generó `out/index.html`, **44 recursos offline**, `precache-manifest.js` y pasó la verificación de CSP (`connect-src 'none'`) y ausencia de rutas diagnósticas.

La suite es fuerte para dominio, migraciones, backups, seguridad local, navegación y responsive, pero **no demuestra por sí sola la compatibilidad de WebView nativa**.

## Plan recomendado de adopción

### P0 — Mantener la web como producto principal

No añadir Capacitor al runtime productivo aún. Mantener una sola fuente financiera y el mismo build web. No duplicar modelos ni crear una base nativa paralela.

### P1 — Prueba de concepto aislada

Crear una rama de integración y añadir:

```text
@capacitor/core
@capacitor/cli
@capacitor/android
@capacitor/ios
```

Configurar `capacitor.config.ts` con:

```ts
{
  appId: 'com.<propietario>.prisma',
  appName: 'Prisma',
  webDir: 'out',
}
```

Flujo esperado:

```bash
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

La PoC debe abrir el build local, crear datos ficticios, recargar, cerrar/reabrir y probar navegación atrás. No debe incluir todavía permisos nativos ni acceso remoto.

### P2 — Matriz de compatibilidad local

Mínimo recomendado:

- Android físico de gama media y Android reciente/emulador;
- iPhone/iPad con iOS 15.2+ como mínimo técnico de OPFS y una versión actual;
- instalación limpia;
- actualización sobre datos existentes;
- cierre forzado y reapertura;
- poco espacio/suspensión;
- exportación e importación JSON/CSV;
- copia cifrada;
- OPFS disponible y no disponible;
- teclado, safe areas, rotación, back/gestos;
- App Lock y recuperación de errores.

### P3 — Adaptadores nativos mínimos

Solo si P2 lo justifica:

1. guard de Service Worker para native;
2. Filesystem/Share para exportaciones;
3. selector de archivo nativo si el input HTML falla;
4. biometría/secure storage solo si se define el contrato de seguridad y privacidad;
5. deep links o notificaciones únicamente si se convierten en requisitos explícitos.

### P4 — Publicación

Antes de tiendas faltan decisiones del propietario: identificador de aplicación, plataformas y versiones mínimas, canal de distribución, política de privacidad, soporte, analíticas (si se desean, hoy están prohibidas por el contrato local-only), firma de builds y estrategia de migración/backup.

## Conclusión operativa

**Capacitor es una opción técnicamente viable y razonable para Prisma.** La mayor parte del trabajo sería empaquetado y QA de WebView, no reescritura del producto. El riesgo real está concentrado en OPFS, archivos descargables, ciclo de vida y promesas de seguridad nativa. Si se mantiene Dexie como fuente canónica, se introducen adaptadores solo donde la WebView lo requiera y se exige una matriz física de Android/iOS antes de publicar, la evolución futura puede compartir prácticamente todo el frontend y el motor financiero actuales.

## Fuentes externas consultadas

- [Capacitor — Installing Capacitor](https://capacitorjs.com/docs/getting-started): un proyecto existente necesita `package.json`, directorio de assets construido e `index.html`; después se configura `webDir`, se añaden plataformas y se ejecuta `npx cap sync`.
- [Capacitor — Configuration](https://capacitorjs.com/docs/config): `webDir` debe apuntar al directorio de assets compilados que contiene el `index.html` final.
- [WebKit — The File System API with Origin Private File System](https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/): OPFS está disponible en Safari desde macOS 12.2/iOS 15.2, con las salvedades de persistencia y navegación privada descritas por WebKit.
