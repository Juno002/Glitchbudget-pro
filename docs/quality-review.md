# Revisión de calidad — 16 de septiembre de 2026

Alcance: aplicación personal con datos locales, sin cuentas ni sincronización.

## Estética e interacción
Se conserva la identidad visual de la aplicación. Se corrigieron colores dependientes del tema en movimientos y gráficos, textos de estados y controles de cierre. Las ventanas compartidas limitan su altura al espacio disponible y permiten desplazamiento. Las notificaciones tienen cierre visible y accesible; los errores duran más que los mensajes de éxito. Las preferencias de movimiento reducido se aplican a CSS y Framer Motion.

Las importaciones JSON y CSV usan confirmaciones coherentes con la interfaz, muestran el archivo elegido y bloquean envíos repetidos durante la restauración. Los formularios principales esperan el resultado persistido antes de cerrarse; un rechazo conserva los datos introducidos. El audio es opcional: su fallo no cambia el resultado de una operación financiera.

## Fiabilidad
Cálculos en centavos, meses derivados de la fecha, reserva de presupuesto sin duplicar el gasto, validación de respaldos antes de reemplazar datos y transacciones atómicas para movimientos e importaciones. Se eliminó código de IA que no corresponde al alcance local. La compilación ya no ignora errores de tipos.

## Evidencia y límites
Hay pruebas automatizadas de cálculos, movimientos concurrentes, modo estricto, respaldos y CSV. En la comprobación anterior del navegador se abrió la aplicación sin servidor, se rechazó un gasto sin saldo conservando el formulario y se guardó un ingreso ficticio.

La última inspección visual fue bloqueada por el límite de uso de la herramienta. Los ajustes visuales posteriores requieren revisión en navegador y móvil real: teclado virtual, foco, contraste medido, temas, zoom y ventanas anidadas. No se certifica ausencia de errores ni preparación comercial completa con esa comprobación pendiente. La vista de prueba en el puerto 9003 puede conservar el ingreso ficticio de 10 000; sus datos son independientes de otros orígenes.

Los datos y copias locales se pierden al borrar el almacenamiento del sitio. Los respaldos externos JSON no están cifrados. La PWA necesita una primera carga con conexión para instalar los recursos; sus actualizaciones esperan al cierre de las pestañas de la versión anterior.

Validación final: 26/26 pruebas aprobadas, tipos y lint sin errores, compilación de producción correcta con 43 recursos de precarga. La auditoría completada tras actualizar dependencias reportó cero vulnerabilidades; el intento posterior de repetirla desde el entorno restringido no pudo acceder al registro.
