# 20.8.1 — Preflight de información y regresión de categorías

Fuente funcional: `Roadmap septiembre 2026.txt`. Apoyo: `docs/roadmap/phase-20-8.md`.

## Inventario de información visible

### Resumen (`summary-tab.tsx`)

| Superficie | Información visible | Clasificación | Tratamiento permitido en 20.8 |
| --- | --- | --- | --- |
| Posición | Disponible líquido / efectivo y bancos | imprescindible | conservar visible; definición puede pasar a popover |
| Patrimonio | patrimonio neto y deuda relacionada | imprescindible | conservar visible; comparación vendrá de selector canónico |
| Presupuesto | gastado, restante, progreso/estado | imprescindible | conservar estado y consecuencia; explicación estable puede ser contextual |
| Próximos movimientos | ocurrencias y fechas próximas | imprescindible | conservar visible |
| Metas | progreso y estado | imprescindible | conservar señal; definición repetida puede reducirse |
| Inversiones | valor real/proyectado y progreso | imprescindible | conservar distinción real/proyectado visible |
| Badges/alertas | estados que requieren atención | imprescindible | no ocultar en tooltip |
| Copy definicional | textos que explican de qué se compone una métrica | contextual | candidato a popover accesible por toque/teclado |
| Copy que repite título/cifra sin consecuencia | explicación duplicada | redundante | candidato a eliminación posterior |

### Reportes (`reports-tab.tsx` + `charts/*`)

| Superficie | Información visible | Clasificación | Tratamiento permitido en 20.8 |
| --- | --- | --- | --- |
| Spending | gasto del rango y detalle | imprescindible | conservar |
| Cash Flow | entradas/salidas/resultado | imprescindible | conservar |
| Net Worth | patrimonio y evolución | imprescindible | conservar |
| Comparación de períodos | dirección y diferencias | imprescindible | conservar; semántica se centraliza en 20.8.2 |
| Categorías/naturaleza | distribución y desglose | imprescindible | conservar |
| Rangos | 7D / 30D / 3M / 6M / 1Y / Custom | imprescindible | conservar |
| Gráficos | donut/tendencias/resultado y tooltips | imprescindible | conservar datos exactos; jerarquía cambia en 20.8.6 |
| Leyendas/definiciones estables | explicación de métricas | contextual | puede migrar a disclosure accesible |
| Texto repetido entre encabezado, card y gráfico | duplicación sin nueva consecuencia | redundante | candidato a reducción posterior |

## Regla de disclosure congelada

- Ayuda a decidir ahora o advierte una consecuencia financiera: permanece visible.
- Aclara una definición estable: puede migrar a popover/tooltip, nunca solo hover.
- Repite información sin añadir significado: puede eliminarse en una intervención posterior.
- Esta microintervención no modifica Home ni Reportes; solo congela el inventario.

## Contrato de categorías

La instalación limpia se deriva de `categorySeeds` mediante `reconstructCategories({})`. El test de 20.8.1 exige que todos los seeds queden disponibles y activos en su dirección correspondiente. También congela que referencias personalizadas históricas se preservan como entidades archivadas y que una categoría built-in omitida explícitamente por estado legacy permanece archivada en vez de ser reactivada por una reparación especulativa.

No se añade lógica de reparación ni migración.

## Gate 20.8.1

El gate queda preparado cuando:

- este inventario cubre KPI, explicaciones, badges, comparaciones y gráficos visibles de Resumen/Reportes;
- el test específico protege categorías default de instalación limpia;
- personalizadas/archivadas siguen preservadas;
- no se añade reparación especulativa, fórmula financiera, Dexie en UI, schema, migración, backup ni red.
