# GlitchBudget Pro — UX Architecture Contract

Estado: aprobado como contrato estructural de Fase 7.5A. Este documento define navegación, jerarquías y vocabulario. No modifica reglas financieras ni el modelo persistente.

## 1. Navegación principal

GlitchBudget tiene exactamente cuatro áreas primarias:

```text
Resumen
Movimientos
Plan
Reportes
```

Las etiquetas son idénticas en móvil y escritorio.

No se crearán destinos primarios nuevos para:

```text
Cuentas
Tarjetas
Metas
Inversiones
Planificados
Ajustes
Logros
```

Esos conceptos viven dentro de una de las cuatro áreas o en navegación secundaria.

### Responsabilidad

**Resumen**
- situación financiera actual;
- presupuesto restante;
- próximos movimientos planificados;
- metas/inversiones relevantes;
- actividad reciente;
- señales que requieran atención.

**Movimientos**
- actividad financiera real;
- ingresos;
- gastos;
- transferencias;
- pagos de deuda;
- búsqueda, filtros y edición.

**Plan**
- Presupuestos;
- Metas;
- Planificados.

No contiene Tarjetas como cuarto subtab.

**Reportes**
- gasto histórico;
- cash flow;
- patrimonio;
- comparaciones;
- tendencias;
- análisis por categoría/tipo.

## 2. Destinos secundarios

**Cuentas**
- entrada natural desde posición financiera en Resumen;
- también pueden consultarse desde el contexto de Movimientos;
- la pantalla de detalle futura concentra saldo, acciones e historial.

**Tarjetas**
- son pasivos/medios de pago, no planificación;
- administración accesible como navegación secundaria dentro de Movimientos, después del historial principal;
- Reportes puede mostrar análisis, no administración.

**Metas**
- viven en Plan → Metas;
- Resumen solo muestra highlights accionables.

**Inversiones**
- futuras; no serán una pestaña primaria;
- acceso secundario desde la posición financiera/activos en Resumen;
- detalle con patrón común de entidad.

**Ajustes**
- accesibles desde el engranaje del header;
- deben evolucionar de dropdown a panel/pantalla estructurada.

**Logros**
- capa secundaria;
- toast de desbloqueo + consulta posterior;
- nunca banner persistente sobre contenido financiero.

## 3. Jerarquía de Resumen

Orden objetivo:

```text
1. Posición financiera
2. Presupuesto restante
3. Próximos planificados
4. Metas / inversiones relevantes
5. Movimientos recientes
```

La posición financiera diferencia:

```text
Disponible líquido
Deuda
Patrimonio neto
```

El crédito disponible nunca se presenta como dinero propio.

Resumen es “status + action”, no “analysis + exploration”. Los donuts de categoría deben salir progresivamente de Resumen y vivir en Reportes.

## 4. Jerarquía de Movimientos

```text
Page header
Búsqueda
Filtros
Lista de actividad real
Detalle / edición
Acceso secundario a cuentas/tarjetas
```

Los movimientos planificados pendientes no se mezclan con el ledger real.

## 5. Jerarquía de Plan

Subnavegación exacta:

```text
Presupuestos
Metas
Planificados
```

**Presupuestos**: límites y restante del período.

**Metas**: objetivos y aportes.

**Planificados**: reglas recurrentes + ocurrencias pendientes/vencidas.

“Suscripción” queda como tipo de caso de uso, no como concepto principal.

## 6. Jerarquía de Reportes

```text
Resultado / cash flow
Comparación de períodos
Patrimonio / deuda
Presupuestos
Desgloses
Tendencias
```

Los reportes explican y comparan. No son el lugar para ejecutar tareas operativas cotidianas.

## 7. Header y acción global

### Móvil

Prioridad:

```text
GlitchBudget
contexto/período
Ajustes
```

“Nuevo movimiento” no ocupa el header. Es una acción principal persistente mediante FAB.

### Escritorio

Mismas cuatro áreas primarias. Nuevo movimiento sigue accesible globalmente sin tener que entrar a Movimientos.

El FAB/compositor actual se conserva como puente hasta Quick Add 2.0.

## 8. Quick Add — contrato de información para Fase 8

Nivel principal:

```text
Monto
Gasto | Ingreso | Transferencia
Cuenta
Categoría cuando aplica
Guardar
```

Segundo nivel “Más detalles”:

```text
Fecha
Nota
Naturaleza
Método de pago
Tarjeta
Recurrencia/template
```

Reglas:
- no mostrar campos irrelevantes;
- transferencia no muestra categoría de gasto;
- compra con tarjeta no pide una cuenta bancaria de origen;
- mismo compositor desde cualquier área principal.

## 9. Patrón común de detalle

Toda entidad importante debe converger a:

```text
Título
Métrica primaria
Estado secundario
Acciones frecuentes
Historial / detalle
Más acciones administrativas
```

Ejemplos: cuenta, tarjeta, meta, inversión.

View mode y management mode se separan. Crear/editar/conciliar/archivar no comparte la misma superficie principal con la lectura cotidiana.

## 10. Settings hierarchy

El engranaje evolucionará a:

```text
General
Finanzas
Categorías
Privacidad y seguridad
Datos y backups
Apariencia
Acerca de
```

**General**
- moneda base;
- inicio del período;
- preferencias generales.

**Finanzas**
- ingreso previsto;
- rollover;
- protección de saldo;
- comportamiento al exceder presupuesto.

**Categorías**
- ingresos;
- gastos;
- archive/reactivate.

**Privacidad y seguridad**
- ocultar importes;
- bloqueo de aplicación;
- auto-lock.

**Datos y backups**
- exportar;
- importar;
- backups;
- borrar datos.

Las acciones destructivas no se mezclan visualmente con preferencias cotidianas.

## 11. Vocabulario financiero UX

Usar de forma consistente:

```text
Saldo
Disponible líquido
Gastado
Restante
Ingreso
Gasto
Transferencia
Deuda
Patrimonio neto
Planificado
Confirmado
Omitido
Vencido
Meta
Aporte
Inversión
```

“Crédito disponible” siempre se etiqueta como crédito, nunca como efectivo/disponible líquido.

“Margen” solo puede utilizarse cuando se especifica que es margen de planificación; no es saldo de cuenta.

## 12. Vocabulario de Planned Payments

```text
pending   → Pendiente
confirmed → Confirmado
skipped   → Omitido
overdue   → Vencido
```

Cada estado debe tener texto y posteriormente icono/tratamiento visual; nunca depender únicamente del color.

## 13. Privacidad de importes

El sistema de diseño soporta un estado global:

```text
balancesHidden
```

Debe ocultar de forma consistente cantidades monetarias en:

```text
Resumen
Cuentas
Tarjetas
Metas
Inversiones
Plan
Reportes
```

Los porcentajes pueden seguir visibles cuando no revelen por sí mismos una cantidad sensible.

En 7.5D se implementa como preferencia visual local del navegador. No entra en Dexie ni en backups.

## 14. Responsive

### Mobile
- una columna por defecto;
- Bottom Navigation de cuatro destinos;
- FAB persistente por encima de la navegación;
- targets táctiles suficientes;
- evitar tablas horizontales para tareas cotidianas.

### Desktop/tablet
- mismos nombres y jerarquía;
- tabs/navegación de cuatro destinos;
- grids para métricas/reportes;
- detail/master-detail solo donde aporte claridad.

Viewport no cambia significado, funcionalidad ni orden conceptual.

## 15. Componentes actuales

### Mantener
- TransactionModal como compositor transitorio hasta Fase 8; en 7.5 ya inicia Gasto/Ingreso/Transferencia desde el mismo FAB;
- BottomNav;
- Tabs principales;
- MovementsView;
- BudgetStatus;
- SubscriptionsManager como implementación actual de Planificados;
- diálogos de backup;
- dialogs y primitives UI existentes.

### Simplificados durante 7.5
- Header;
- SummaryTab;
- AccountsOverview;
- PlanningTab;
- ReportsTab;
- DebtsTab.

### Retirado en 7.5A
- nomenclatura móvil “Dashboard”;
- nomenclatura desktop “Planificación” como área primaria;
- Cards como cuarto subtab de Plan;
- banner persistente AchievementMonkMode / “Desbloqueo I.A.”;
- duplicación de definiciones de navegación entre móvil/escritorio.

### Retirar más adelante
- componentes analíticos legacy sin consumidores, una vez verificado su reemplazo;
- ruta /transactions duplicada cuando exista una estrategia de compatibilidad segura;

## 16. Restricciones para el dominio

7.5 no cambia:
- fórmulas financieras;
- ledger;
- Period Engine;
- recurrencias;
- estados de PlannedOccurrence;
- categorías;
- schema Dexie;
- backup JSON.

Si una decisión UX requiere alterar esas reglas, se detiene y se trata como cambio de dominio separado.

## 17. Decisiones que condicionan fases posteriores

- Fase 8 Quick Add usa un único compositor global.
- Fase 9 Budgets 2.0 vive dentro de Plan → Presupuestos.
- Fase 10 Goals 2.0 vive dentro de Plan → Metas.
- Fase 12 Investments no crea pestaña primaria.
- Fase 13 Reports 2.0 recibe análisis retirado de Resumen.
- Fase 14 Home 2.0 refina la jerarquía definida aquí sin volver a decidirla.
- Fase 17 añade app lock/auto-lock y seguridad adicional; balancesHidden ya existe como preferencia visual local.
