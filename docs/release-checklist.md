# Publicación y prueba piloto

Estado al 28/09/2026: fases 0–10 implementadas e integradas. El [índice del roadmap](roadmap/README.md) enlaza los cierres y sus límites. El cierre funcional de Fase 10 aprobó 259 pruebas, compilación estática y QA móvil emulado/offline; eso no completa la matriz física ni las fases 11–19.

## Preparar una candidata

- [ ] Registrar commit, fecha, navegadores y dispositivos que se van a soportar.
- [ ] Con Node.js 22 o superior, ejecutar `npm ci`, `npm run check` y `npm run build`; no ignorar fallos.
- [ ] Conservar el paquete anterior y un respaldo exportado antes de probar actualizaciones. Un rollback de archivos no implica compatibilidad del código antiguo con una base ya migrada; no degradar esquemas ni restaurar datos automáticamente.

## Matriz física pendiente

Ejecutar con datos ficticios en cada combinación Android/iOS/escritorio elegida y anotar resultado. Estas casillas son pendientes de release, no fallos confirmados ni repetición obligatoria del QA automático.

- [ ] Crear ingreso y gasto desde Quick Add; editar fecha/cuenta/importe y comprobar saldos, historial y período afectado. Verificar plantillas y doble pulsación de Guardar.
- [ ] Transferir entre efectivo y banco: patrimonio estable, sin nuevo ingreso/gasto. Comprar con tarjeta y pagarla: el pago no repite el gasto.
- [ ] Probar protección de cuentas y exceso de presupuesto por separado: permitir, advertir/cancelar y bloquear. La advertencia cancelada no debe crear movimiento.
- [ ] Consultar los cuatro tipos de presupuesto, cambiar rango, reasignar límites y comprobar rollover sin duplicación ni movimiento de dinero.
- [ ] Crear meta, editar plazo, aportar y comparar Plan/Resumen. Progreso y aporte requerido deben coincidir; efectivo y bancos permanecen iguales. Las reservas no se bloquean por falta de ingreso mensual.
- [ ] Confirmar y omitir planificados; confirmar dos veces no duplica el movimiento. Comprobar vencidos y límites de calendario.
- [ ] Exportar y restaurar JSON v8 desde archivo en los navegadores móviles elegidos; verificar metas, rangos, cuentas y movimientos. Un archivo inválido no altera datos. No confundir este respaldo con una copia de plantillas/localStorage/OPFS.
- [ ] Instalar la PWA, cerrar/abrir sin conexión, registrar y recargar. Actualizar la aplicación con varias pestañas y verificar conservación de datos y preferencias.
- [ ] Recorrer claro, oscuro y minimalista con nombres largos e importes grandes, 320/360 px, escritorio, zoom 200 % y teclado virtual. Verificar modales, notificaciones y menús sin recortes.
- [ ] Navegar con teclado y lector de pantalla; comprobar foco al abrir/cerrar diálogos, etiquetas, contraste y reducción de movimiento.
- [ ] Medir fluidez con historial amplio en teléfono. La prueba de restauración de 10.000 movimientos no demuestra rendimiento visual móvil.

## Evidencia e incidencias

Registrar dispositivo, navegador/versión, sistema, commit, pasos, resultado esperado y real. Adjuntar capturas sin datos personales. No pedir respaldos financieros completos por defecto. Conservar esta matriz como pendiente hasta disponer de evidencia; no marcarla completa por pasar tests.

## Decisiones antes de venta

Definir plataformas soportadas, canal y origen definitivo, precio/licencia, contacto de soporte, mantenimiento e información de privacidad y condiciones apropiadas. No se han inventado ni publicado términos. La finalización de estas decisiones es independiente de implementar las fases restantes.

## Criterio de salida

Completar la matriz acordada, no dejar incidencias críticas de pérdida de datos, probar recuperación y documentar las limitaciones de la versión publicada. Ocultar importes no equivale a cifrado o autenticación; la aplicación seguirá necesitando mantenimiento.
