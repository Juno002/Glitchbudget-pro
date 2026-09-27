# Fase 7.5C — Patrones estructurales

Fecha: 2026-09-27. Rama: `phase-7.5-ux-architecture`. Base: 7.5B cerrada en `171410c`.

## Alcance

7.5C aplica la arquitectura de información y los primitives de 7.5A–B a las superficies reales principales.

Objetivos:

- jerarquía coherente de página/sección;
- Resumen orientado a estado y acción, no a análisis;
- separar lectura cotidiana de administración;
- Settings deja de ser un dropdown monolítico;
- establecer un patrón común de detalle;
- no tocar reglas financieras ni persistencia.

## Header

El header queda reducido a responsabilidades globales:

```text
Marca
Período
Logros
Ajustes
```

La configuración financiera ya no vive incrustada como una lista extensa de DropdownMenu + diálogos anidados.

La acción global Nuevo movimiento continúa fuera del header, mediante el FAB definido en 7.5A.

## Settings estructurado

Nuevo:

```text
src/components/layout/settings-dialog.tsx
```

Secciones:

```text
General
Finanzas
Categorías
Privacidad
Datos
Apariencia
Acerca de
```

### General

- día inicial del período.

### Finanzas

- protección de saldo real;
- política allow/warn/block al exceder presupuesto;
- rollover;
- ingreso previsto.

### Categorías

- gestor de gastos;
- gestor de ingresos.

### Privacidad

- explicación explícita del almacenamiento local.

No se implementa todavía `balancesHidden` ni app lock.

### Datos

- backups/import/export;
- zona destructiva separada para borrar datos.

### Apariencia

- Neón oscuro;
- Claro;
- Minimalista.

### Acerca de

- ayuda y privacidad.

Las mismas funciones de aplicación existentes siguen ejecutando cada cambio; el panel no introduce reglas financieras nuevas.

## Resumen

`SummaryTab` se simplifica de forma estructural.

Se retiran del Home los donuts de categoría y la dependencia de Recharts. Ese análisis ya existe en Reportes y no debe competir con la situación inmediata.

Orden actual:

```text
1. Posición financiera
2. Presupuesto restante
3. Actividad registrada
4. Ahorro sugerido
```

Posición financiera utiliza los selectores existentes para mostrar:

- Disponible líquido;
- Deuda de tarjetas;
- Patrimonio neto.

“Deuda de tarjetas” queda explícitamente acotado porque el agregado actual de posición no incorpora otros tipos de préstamo.

Actividad registrada muestra:

- Ingresos;
- Gastos;
- Resultado.

Resultado se describe explícitamente como `ingresos − gastos`, no como saldo bancario.

Los módulos futuros de Upcoming / metas / inversiones y actividad reciente completa continúan reservados para Home 2.0. 7.5C no inventa datos ni adelanta Fases 12/14.

## Movimientos

La página se estructura en:

```text
PageHeader
Mi dinero hoy
Historial
```

“Mi dinero hoy” mantiene cuentas y tarjetas como navegación secundaria, no como tabs primarios.

“Historial” concentra búsqueda, filtros y movimientos reales.

Los planificados pendientes siguen fuera del ledger hasta confirmarse.

El empty state del historial usa el primitive compartido `EmptyState`.

## Patrón de detalle

Nuevo primitive:

```text
DetailHeader
```

Contrato:

```text
Título
Subtítulo / tipo
Métrica primaria
Supporting text
Acciones frecuentes
```

La vista detallada de una cuenta es la primera adopción:

- nombre;
- tipo;
- saldo actual;
- saldo inicial/fecha;
- acción administrativa;
- movimientos recientes.

La lectura del estado se presenta antes de la administración.

## Plan

Plan adopta `PageHeader` y conserva únicamente:

```text
Presupuestos
Metas
Planificados
```

No se cambia la lógica de presupuestos, metas ni recurrencias.

## Reportes

Reportes adopta jerarquía de PageHeader + SectionHeader y agrupa sus módulos por propósito:

```text
Resultado y comparación
Deuda y presupuestos
Desgloses
```

Las visualizaciones analíticas pertenecen aquí y no al Resumen.

## Ayuda y vocabulario

La ayuda se actualiza para reflejar:

- períodos financieros en lugar de asumir mes calendario;
- Disponible líquido;
- Planned Payments en `Plan → Planificados`;
- separación entre planificación y ledger.

Se retira el vocabulario legacy de “Suscripciones” como instrucción principal.

## Guards UX

`tests/ux-structure.test.ts` protege:

- Resumen sin Recharts/PieChart;
- uso de `PageHeader` en las cuatro áreas principales;
- Header delegando en `SettingsDialog` y sin DropdownMenu monolítico;
- las siete secciones estructurales de Settings;
- adopción de `DetailHeader` en cuentas.

Los guards previos de 7.5A y 7.5B siguen activos.

## Cambios deliberadamente NO realizados

7.5C no modifica:

- domain selectors;
- ledger;
- account protection;
- budget policy;
- Period Engine;
- Recurrence Engine;
- PlannedOccurrence lifecycle;
- categorías persistidas;
- Dexie;
- backup JSON.

Tampoco implementa todavía:

- Hide Balances global;
- app lock;
- StatusBadge en todas las ocurrencias;
- FilterChip compartido;
- TransactionRow compartido;
- responsive/accessibility sweep completo;
- Account/Card/Goal detail screens completos;
- Home 2.0;
- Quick Add 2.0.

## Gate técnico

GitHub Actions sobre `25a3689`:

- `npm run check`: aprobado;
- **200 pruebas aprobadas, 0 fallidas**;
- TypeScript: aprobado;
- ESLint: aprobado con 0 warnings;
- guard local-only: aprobado;
- `npm run build`: aprobado;
- exportación estática: aprobada;
- manifiesto offline: 42 recursos.

Persistencia:

```text
Dexie v11
Backup JSON v7
```

Sin migraciones nuevas.

## Siguiente subfase

7.5D — estados, responsive, accesibilidad y consistencia final de UX.

No iniciar automáticamente.
