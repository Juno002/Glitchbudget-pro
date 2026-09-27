# Fase 7.5 · Arquitectura UX y patrones de interfaz

Estado: implementación mínima y contrato de diseño preparados para revisión del Gate 7.5. No se inicia Fase 8 hasta revisar este entregable. Base verificada: Fase 7 integrada en 2bfd90a.

## 1. Navegación propuesta

| Área | Propósito | Contenido |
|---|---|---|
| Resumen | Entender la situación y decidir la próxima acción | Posición actual, actividad del período, presupuesto restante, próximos movimientos, metas y actividad reciente |
| Movimientos | Consultar y explicar el dinero real | Efectivo, bancos, historial de cuentas, tarjetas/deudas, historial y filtros |
| Plan | Preparar decisiones futuras | Presupuestos, Metas, Planificados; se conserva la subsección al cambiar de área |
| Reportes | Analizar | Resultado y comparativas de períodos, gráficos por categoría, tablas detalladas |

Las mismas cuatro etiquetas en escritorio y móvil. Ajustes y Logros quedan fuera de la navegación principal. Las tarjetas se consultan desde Movimientos; no son una cuarta subsección de Plan.

## 2. Componentes y patrones reutilizables

Implementados: PageHeader, SectionHeader, MetricCard, MoneyValue, StatusBadge y EmptyState en `src/components/ui/financial-patterns.tsx`. `useMoneyFormatter` aplica la preferencia global a las vistas existentes; evita otra implementación monetaria. Los tokens de superficie, borde, texto y estado siguen siendo los existentes; se incorporan espaciado de página/sección/tarjeta, radio y duración de feedback.

Contratos para adoptar gradualmente, sin crear abstracciones vacías:

| Patrón | Contrato |
|---|---|
| DeltaValue | Diferencia con signo, período comparado y texto de mejora/empeoramiento. Una caída del gasto no es un empeoramiento. Reutilizar MoneyValue. |
| ProgressMetric | Gastado, límite, restante/excedido, porcentaje con nombre accesible. No usar anillos decorativos para saldos. |
| DetailHeader | Nombre, saldo/valor principal, estado y acciones relevantes, seguido del historial. |
| ActionMenu | Editar/archivar/eliminar separados de la consulta; nunca ocultar la acción principal detrás de un menú genérico. |
| FilterChip | Estado seleccionado accesible, quitar filtro explícito; no confundir filtros con secciones. |
| TransactionRow | Concepto, tipo, fecha, cuenta/categoría e importe con signo. Transferencia no se presenta como ingreso/gasto. |
| PlannedPaymentRow | Nombre, fecha, dirección, importe, StatusBadge y confirmar/omitir; confirmado ofrece Ver movimiento. |

## 3. Conservar

Motor contable y selectores canónicos; efectivo automático; bancos por transferencia; prevención de saldo negativo; políticas presupuestarias; períodos configurables; Radix para foco/diálogos; compositor actual hasta Fase 8; respaldos locales y validación de importación; diseño de los tres temas; logros como consulta voluntaria y aviso breve.

## 4. Simplificar

Resumen pasa de anillos y donuts a prioridades financieras. Sus tres primeros indicadores son Disponible líquido, Deuda y Patrimonio neto, seguidos de ingresos/gastos/resultado del período. El presupuesto muestra restante o excedido. Las próximas operaciones y metas tienen accesos directos a Plan. La actividad reciente se rotula explícitamente Ingresos y gastos: el historial completo, incluidas transferencias y pagos, permanece en Movimientos.

Ajustes es un panel desplazable con General, Finanzas, Categorías, Privacidad y seguridad, Datos y backups, Apariencia y Acerca de. El ahorro sugerido se configura allí. No inventar bloqueo, sincronización o multimoneda funcional que aún no existe. El borrado irreversible explica su alcance y queda separado de exportar/importar.

## 5. Retirar

Banner persistente “Desbloqueo I.A.” y texto de Monje Financiero de las pantallas de dinero; donuts duplicados en Resumen; etiquetas Dashboard/Planificación que competían con Resumen/Plan; cuarto tab de Plan para tarjetas; creación móvil duplicada en el encabezado. Se conserva el mecanismo de logros.

## 6. Móvil

Una columna; navegación inferior de cuatro áreas; FAB + a distancia de la barra y área segura; espacio final para que el último elemento pueda desplazarse por encima del FAB. Encabezado con marca, privacidad, contexto y Ajustes/Logros. Controles táctiles de al menos 44 px de alto; cierre de diálogos de 44 × 44. Diálogos con altura limitada al viewport visible y desplazamiento interior. Nunca recortar contenido para simular que cabe.

## 7. Escritorio

Mismas áreas y acciones; navegación superior. Tres indicadores en fila, dos columnas para próximos movimientos/metas y gráficos. Historial y tablas utilizan el ancho disponible; los paneles de edición mantienen un ancho legible. El botón de movimiento del encabezado en escritorio y el FAB móvil abren el mismo compositor, con una única acción visible por tamaño.

## 8. Accesibilidad y privacidad

Foco visible; diálogos con cierre accesible y restauración de foco; estados incluyen texto e icono; la cantidad se expresa con etiqueta y formato monetario tabular. Respetar reduced-motion ya existente. Los gráficos nuevos no animan cifras.

La preferencia `balancesHidden` se guarda en este dispositivo, se puede revertir desde el encabezado o Ajustes y reacciona entre pestañas. Los importes de consulta se sustituyen por una máscara sin valor real en texto/aria. El render inicial del servidor también enmascara para evitar mostrar cantidades antes de cargar la preferencia. Los gráficos analíticos se retiran mientras está activa. Los porcentajes de progreso permanecen visibles: revelan avance relativo, no importes. Formularios de edición abiertos deliberadamente y copias exportadas conservan los números reales; se avisa en Ajustes. Esta función es privacidad visual, no autenticación ni cifrado.

Los tres temas comparten jerarquía, componentes, foco y navegación; solo cambian presentación. Queda fuera de esta fase certificar cada navegador físico o prometer ausencia absoluta de bugs.

## 9. Pantallas afectadas en fases posteriores

Fase 8 sustituirá el contenido del compositor con la jerarquía aprobada, sin otro botón o motor. Detalles de cuenta/tarjeta/meta adoptarán progresivamente DetailHeader e historial compartido. Futuros filtros y plantillas reutilizarán TransactionRow/FilterChip. No agregar inversión/mercados, recibos, garantías, ubicación, fidelización, upsells, cuentas cloud o sincronización bancaria en esta fase.

Quick Add 2.0 (diseño, no implementado): importe primero → Gasto/Ingreso/Transferencia → cuenta → categoría cuando corresponda → Guardar. Fecha y nota en detalles; naturaleza solo gasto; tarjeta solo si aplica; origen y destino en transferencia, sin categoría de consumo; recurrencia/plantilla futuras sin hacer enorme el formulario. Efectivo predeterminado, preservar edición sin recontabilizar. Guardando bloquea doble envío, error conserva lo escrito, éxito aparece solo tras persistencia y cierre controlado.

## 10. Restricciones y vocabulario financiero

| Término | Significado |
|---|---|
| Saldo | Posición de una cuenta a una fecha, no resultado mensual |
| Disponible líquido | Efectivo + bancos hoy; no crédito disponible |
| Deuda | Deuda pendiente de tarjetas registradas; saldos a favor no son deuda negativa en el indicador |
| Patrimonio neto | Cuentas y saldos a favor registrados menos deuda de tarjetas; no estima bienes ni préstamos no soportados por el selector actual |
| Ingreso / gasto | Operación real fechada, contada una sola vez |
| Resultado del período | Ingresos registrados menos gastos del período |
| Transferencia | Movimiento entre cuentas propias, sin ingreso/gasto adicional |
| Pago de tarjeta | Baja liquidez y deuda; no vuelve a contar la compra |
| Gastado / restante | Consumo de un presupuesto / límite menos consumo; mostrar excedido cuando sea negativo |
| Margen planificado | Estimación tras reservas, distinta del saldo líquido |
| Meta / aporte | Objetivo / asignación a ese objetivo; no inventar transferencia bancaria |
| Previsto / planificado | Intención sin alterar todavía el dinero real |
| Confirmado | Operación real enlazada a su previsión, sin duplicación |

Pendiente: sin resolver. Vencido: pendiente cuya fecha ya pasó (derivado, no nuevo estado persistido). Confirmado: tiene movimiento enlazado. Omitido: no genera movimiento real. Pausar una regla no borra pendientes anteriores.

No se modifica esquema, migración, scheduler ni fórmula contable en 7.5. Las vistas usan los selectores de Fase 5–7. El saldo actual y el período seleccionado tienen contextos explícitos, no se fuerza que sean iguales. El borrado local vuelve a sembrar categorías iniciales para que el siguiente movimiento sea posible.

## Bocetos para revisar

`phase-7-5-wireframes.html` contiene seis esquemas: Resumen, Quick Add, Movimientos, Plan, Detalle de cuenta y Ajustes. Son contratos de jerarquía, no un diseño final ni un segundo flujo ejecutable. Revisar antes de implementar Fase 8.

## Validación

Ver `phase-7-5-validation.md` para resultados y límites de la revisión.
