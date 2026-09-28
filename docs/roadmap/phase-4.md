# Fase 4 — Categorías con identidad estable

> **Registro histórico de fase.** Conserva versiones, resultados y restricciones del momento de su cierre. Para el estado acumulado hasta Fase 10, las continuaciones autorizadas y los pendientes vigentes, consulta el [índice del roadmap](README.md).

Fecha: 2026-09-26. Alcance: exclusivamente Fase 4. No se inicia Fase 5 ni el rediseño visual de 7.5.

## 1. Esquema final

```ts
interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income' | 'both';
  iconName: string;
  archived: boolean;
  expenseOrder?: number;
  incomeOrder?: number;
}
```

Tabla Dexie `categories`, clave primaria `id`, índice `type`. Los IDs nuevos se generan con `crypto.randomUUID()` y nunca dependen del nombre. Los órdenes son independientes y las categorías inferidas sin posición se colocan al final del ámbito correspondiente. Nombre e icono son metadatos; los cálculos y referencias siguen utilizando el ID.

## 2. Migración v8 → v9

La actualización de esquema lee Settings y todas las referencias de ingresos, gastos, planes y recurrentes dentro de la transacción de actualización de Dexie. `reconstructCategories` combina los arrays antiguos con las referencias históricas. Conserva exactamente cada ID; asigna los órdenes según la primera aparición en cada array, conserva iconos personalizados e infiere el ámbito a partir de todos los usos. Un ID usado en ambos ámbitos pasa a `both`; `otros` siempre es `both`.

Las categorías presentes en arrays son activas. Las que solo aparecen en historial son archivadas. Los built-ins retirados quedan como entidades archivadas. Si faltan arrays se utilizan las semillas compatibles; un array explícitamente vacío permanece vacío. Después de insertar las entidades se retiran los tres campos legacy de Settings. Todo se confirma junto o se revierte junto. Las instalaciones nuevas se inicializan directamente con la tabla v9.

## 3. IDs históricos desconocidos

Se crea una entidad archivada con el ID exacto, nombre legible derivado únicamente para presentación e icono personalizado si existía, o el icono genérico. No se cambia ninguna transacción ni se reasigna a `otros`. Las importaciones CSV preservan también IDs desconocidos como entidades archivadas, en la misma transacción de importación; rechazan ámbitos incompatibles con entidades existentes.

## 4. Settings retirados

`expenseCategories`, `incomeCategories` y `customCategoryIcons` están deprecados y solo se admiten para migración/compatibilidad con respaldos antiguos. Se eliminan al migrar/importar y no se exportan en v5. `updateSettings` filtra estos campos. Las listas del contexto son proyecciones de `categories`, no una segunda fuente persistida. No hay sincronización bidireccional con Settings.

## 5. Renombrar, archivar y reactivar

Renombrar/cambiar icono actualiza una entidad, manteniendo su ID y todos sus movimientos. Archivar oculta las opciones para movimientos, presupuestos y recurrentes nuevos; el historial sigue resolviendo su nombre e icono. Se permite editar un registro histórico conservando su categoría archivada, pero no asignarla a otro registro. La renovación de presupuestos omite categorías archivadas. Reactivar las devuelve al selector.

No existe borrado físico de categorías. Restablecer archiva categorías propias de ese ámbito y reactiva las semillas, conservando metadatos e historial. Las categorías `both` se preservan para no retirar opciones del otro ámbito. La ampliación a `both` está permitida; retirar un ámbito se rechaza conservadoramente. Duplicados activos se comparan normalizando mayúsculas, espacios y Unicode en ámbitos superpuestos; también se comprueba al renombrar/reactivar. Las operaciones son transaccionales, incluidas creaciones concurrentes.

## 6. Respaldos

JSON v5 incluye explícitamente `categories`. Conserva IDs, nombres, tipos, iconos, estado y ambos órdenes. v3/v4 se reconstruyen con la misma función de migración. Antes de reemplazar datos, v5 valida el esquema, IDs únicos, nombres activos y referencias/direcciones de ingresos, gastos, planes y recurrentes. Falta de categorías, referencias inexistentes o incompatibles y duplicados rechazan la restauración; no se escribe parcialmente. Se mantienen las validaciones previas de cuentas, tarjetas, metas y fechas.

## 7. Consumidores migrados

- Contexto financiero y gestores de categorías de ingresos/gastos.
- Modal de movimientos y formulario/tabla alternativos de transacciones.
- Historial, filtros y nombres/iconos de Movimientos.
- Resumen y gráficos de categorías; gráfico de resultado mensual.
- Desgloses y estado de presupuestos en Reportes.
- Planificación, transferencia y renovación de presupuestos.
- Suscripciones/recurrentes.
- Escrituras de ingresos/gastos, planes y recurrentes; respaldos JSON/CSV.

`useCategoryResolver` resuelve siempre contra la tabla persistida. Las semillas son inicialización/migración, no estado activo. Los totales financieros y las políticas de saldo/presupuesto de fases anteriores conservan sus reglas.

## 8. Pruebas de migración e integridad

`npm run check`: 119 pruebas aprobadas, 0 fallos; incluye guardia local-only, TypeScript y ESLint. Se mantienen las suites de cuentas, dominio, Strict Mode/políticas y respaldos.

La suite de categorías demuestra: built-ins/custom y órdenes independientes; ID histórico huérfano; inferencia de ambos ámbitos; iconos; UUID; renombrado sin cambios en movimientos/gastos calculados; archivo, edición histórica y reactivación; dirección incorrecta y prohibición de estrechar ámbitos; nombres duplicados y creación concurrente; planes/recurrentes archivados; restauración v3/v4; round trip exacto v5; rechazo atómico de referencias rotas, ámbito incompatible e IDs duplicados. Un fallo inyectado durante la migración confirma que la base permanece en v8 sin tabla nueva ni alteración de los registros previos. Las migraciones previas desde v6/v7 siguen pasando.

## 9. Casos no triviales y límites de evidencia

- Dos IDs legacy pueden producir el mismo nombre visible: se preservan ambos IDs y el segundo nombre se distingue con un sufijo basado en el ID, repitiendo la desambiguación si fuera necesario. No se fusionan movimientos.
- Un ID presente solo en el historial se archiva; uno usado en las dos direcciones se amplía a `both`.
- Los nombres originales de categorías personalizadas no existían como entidad: solo puede recuperarse una etiqueta legible desde el ID y el icono conservado. El usuario puede renombrarla después sin afectar referencias.
- Se verificaron fixtures y bases aisladas, no se inspeccionaron ni reemplazaron manualmente los datos personales del origen habitual `:9007`. No se detectó pérdida en los casos probados; no se afirma que se haya auditado cada categoría real del usuario.

## 10. Gate técnico y offline

- `npm run check`: aprobado, 119/119.
- `npm run build`: exportación estática aprobada; manifiesto offline de 44 recursos; sin importador de diagnóstico y con `connect-src 'none'`.
- Prueba de navegador en origen aislado `http://127.0.0.1:9015/`, con fixture v4: restaurar, renombrar `food` a «Alimentación estable», archivar y comprobar nombre en historial, resumen y presupuestos. Servidor detenido, recarga correcta y categoría persistida; reactivación sin servidor y opción visible en Nuevo movimiento. Reportes conservan ingresos 1,000, gastos 300, resultado 700, flujo 800 y presupuesto 500/300. Sin errores/warnings capturados en consola durante la prueba.
- Evidencia: `phase-4-offline.png` (datos sintéticos, servidor detenido).

Fase 4 cerrada. Fase 5 no iniciada.
