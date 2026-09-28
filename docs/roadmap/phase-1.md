# Fase 1 — Frontend estático sin IA remota

> **Registro histórico de fase.** Conserva versiones, resultados y restricciones del momento de su cierre. Para el estado acumulado hasta Fase 10, las continuaciones autorizadas y los pendientes vigentes, consulta el [índice del roadmap](README.md).

## Resultado

La distribución es `out/`: HTML, JavaScript, CSS, fuentes e iconos. No necesita un proceso Next en producción. `npm start -- --port 9012` sirve únicamente esos archivos en loopback para pruebas; no es un backend de aplicación. No se ha publicado ni cambiado el origen habitual del usuario.

## Cambios

- Eliminadas las tres rutas `src/app/api/ai-insight*`, sus prompts y stubs.
- Retirados estados, efectos, importaciones y sonido de IA de TransactionModal, reports-tab, summary-tab y sounds. Los errores locales de registro/borrado se mantienen como `submitError`.
- Eliminados `apphosting.yaml` y el archivo vacío `env.local.txt`. No había SDK de IA en las dependencias actuales ni claves que migrar.
- `next.config.ts`: export estático, rutas con slash y sin patrones de imágenes remotas.
- `scripts/generate-precache.mjs`: inventario de todos los archivos exportados, identificador por contenido, manifiesto dentro de out/. Incluye HTML de rutas y recursos de Next.
- `public/sw.js`: instalación completa antes de reemplazar versión; sirve recursos conocidos desde caché. Rechaza métodos distintos de GET, otros orígenes y recursos desconocidos. No reenvía consultas ni datos de solicitudes. No borra IndexedDB.
- CSP en layout de producción: `connect-src 'none'`, recursos locales; sin objetos ni envío de formularios. Inline script/style siguen permitidos por el output de Next y estilos de la UI; no equivale a protección completa frente a XSS.
- `scripts/check-local-only.mjs`, package.json y `tests/local-only.test.ts`: control AST de primitivas de red, rutas/API/server actions, URLs remotas y SDK conocidos. Se ejecuta en el `npm run check` de la CI existente. Distingue eventos fetch de invocaciones fetch; ambos casos tienen regresión.
- README documenta distribución estática. Blueprint y mockup eliminan referencias activas a IA/fuentes externas. El roadmap y la evidencia histórica de Fase 0 se conservan intactos.

## Auditoría de red

Se revisaron fuentes, recursos públicos, scripts, dependencias declaradas y configuración. Crear/editar/eliminar movimientos, cuentas, transferencias, presupuestos, metas, exportación y reportes usan persistencia/cálculos locales; no se encontraron llamadas de red en esos flujos. No se introdujo instrumentación que registre datos financieros.

Las únicas conexiones necesarias en ejecución son la descarga inicial y actualización de recursos estáticos desde el origen. Las fuentes de next/font/google se descargan durante la compilación y se sirven desde los archivos propios: no hay petición del navegador a Google Fonts. Esta dependencia de construcción requiere red; no envía datos financieros. El mockup documental ya no descarga fuentes.

La protección de CI es preventiva, no un análisis completo de paquetes transitivos ni de código deliberadamente ofuscado. La prueba manual no es una captura exhaustiva de tráfico de cada operación en cada navegador. El worker y sus pruebas impiden reenvíos de solicitudes una vez que controla la página; la primera carga se protege con CSP y código local auditado.

## Verificación (26-09-2026)

- `npm run check`: control local, tipos y lint correctos; **67 pruebas aprobadas, 0 fallidas**.
- Las pruebas incluyen migraciones Dexie v6/v7, round-trip JSON v4 con las 13 tablas, igualdad de saldos y rechazo atómico de respaldo inválido.
- `npm run build`: correcto; todas las rutas son estáticas, sin API en el manifiesto de rutas.
- 44 recursos del precache comprobados físicamente en out/; CSP presente en HTML exportado.
- Pruebas del worker sin función fetch disponible: rechaza origen externo, POST y recurso desconocido; resuelve navegación y JavaScript en caché sin reenviar parámetros.
- Prueba manual del cierre inicial, anterior al endurecimiento final de CSP, en origen aislado 9012: cargar build, detener servidor, recargar, registrar ingreso ficticio de RD$ 1,000.00 y recargar. Cuentas e ingresos conservan RD$ 1,000.00. Abrir directamente /transactions/ sin servidor muestra el registro. Conexión al servidor confirmada como rechazada; servidor detenido y pestaña cerrada. [Evidencia](phase-1-offline.png).

## Datos y arquitectura

Dexie permanece en v8 y JSON en v4. No hay migración nueva ni cambios financieros. No se tocaron datos del puerto 9007. Sigue vigente el tag pre-roadmap-2026-09.

Para desplegar: publicar out/ completo y de forma atómica bajo HTTPS en la raíz del mismo origen; revalidar HTML, sw.js y precache-manifest.js. La nueva versión espera al cierre de las pestañas anteriores. Mantener el mismo origen conserva el acceso a IndexedDB; cambiar dominio/puerto exige exportar/importar. No se ejecutó despliegue ni prueba de actualización en un teléfono físico.

La separación del dominio financiero sigue pendiente de Fase 2. La ruta heredada /diag/restore fue eliminada en el cierre corregido: no queda ese segundo importador destructivo en código ni en la exportación. No ampliar este cierre a una certificación general de seguridad o calidad comercial.

## Cierre corregido solicitado

- Se conservaron y verificaron los dos cambios ya presentes al iniciar esta revisión: eliminación de src/app/diag/restore/page.tsx y connect-src 'none' en el layout.
- Regresiones: ausencia del directorio del importador, CSP estricta y rechazo de políticas relajadas o duplicadas. Se prueba además que el verificador detecte la reintroducción de una ruta diagnóstica y HTML con política debilitada.
- scripts/check-static-output.mjs se ejecuta al terminar cada build (incluida CI): exige connect-src exclusivamente 'none' en todos los HTML exportados, ausencia de out/diag y ausencia de /diag/ en el precache.
- Check y build completos repetidos y aprobados. Backups y migraciones siguen cubiertos por la suite. Sin cambios de esquema ni datos.
- La captura offline anterior se conserva como evidencia histórica; en esta corrección se verificaron automáticamente el worker y el output, sin repetir la prueba manual del navegador.

Fase 1 cerrada con los ajustes aprobados. Fase 2 no iniciada; requiere autorización posterior.
