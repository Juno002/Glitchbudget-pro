# Fase 13 — Reports 2.0

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 13.

Estado: **completada técnicamente**.

## Objetivo

Construir análisis histórico solo después de disponer de:

- ledger confiable;
- Period Engine;
- categorías estables;
- liabilities;
- planning;
- investments.

Fase 13 no introduce una segunda lógica financiera. **Resumen y Reportes consumen los mismos selectors de dominio.**

## Selectors comunes

El contrato vive en:

```text
src/domain/reports.ts
```

Selectors principales:

```ts
resolveReportRange()
previousComparableRange()
selectSpendingReport()
selectCashFlowReport()
selectNetWorthReport()
selectReportsSnapshot()
```

`FinanceContext.getReportSnapshot()` es el punto compartido por las superficies React.

### Regla Home / Reports

Resumen obtiene su posición financiera mediante:

```text
getReportSnapshot(currentPeriod, today)
```

Reportes usa:

```text
getReportSnapshot(selectedRange, selectedRange.end)
```

La diferencia está en el rango solicitado, no en la fórmula.

No se duplican fórmulas de patrimonio, cash flow o gasto dentro de componentes.

## Ranges

Reports 2.0 expone:

```text
7D
30D
3M
6M
1Y
Custom
```

Todos los límites son inclusivos.

- 7D: fecha ancla y seis días anteriores.
- 30D: fecha ancla y veintinueve días anteriores.
- 3M / 6M / 1Y: ventana móvil de calendario terminada en la fecha ancla.
- Custom: inicio y final explícitos; el final no puede estar en el futuro.

La lógica de rangos es pura y no lee el reloj. La UI entrega `localDate()` explícitamente.

## Previous comparable period

Cada rango actual se compara con la ventana inmediatamente anterior que contiene **exactamente el mismo número de días**.

Ejemplo:

```text
actual     2026-09-01 .. 2026-09-30
comparable 2026-08-02 .. 2026-08-31
```

Esto evita comparar ventanas de distinta duración.

## Spending

Selector:

```text
selectSpendingReport()
```

Expone:

- Total spent;
- Trend frente al rango comparable;
- Categories;
- Largest transactions;
- Fixed / Variable / Occasional;
- cantidad de transacciones.

### Semántica

Una compra real cuenta una sola vez como gasto, incluso si fue a crédito.

La dimensión de categoría y la naturaleza del gasto permanecen separadas.

La dimensión opcional `Must / Need / Want` **no se añadió** en esta fase porque el roadmap la declara opcional y actualmente no existe un contrato persistente que la defina.

### Trend

La tendencia se expresa como cambio absoluto y porcentual contra el previous comparable period.

Si el período anterior es cero y el actual no, el porcentaje no se inventa: se presenta como **Sin base comparable**.

## Cash Flow

Selector:

```text
selectCashFlowReport()
```

Contrato:

```text
Income
Cash expenses
Debt payments
Net cash flow
```

Fórmula:

```text
Net cash flow = Income - Cash expenses - Debt payments
```

Una compra a crédito entra en Spending cuando ocurre, pero no sale de efectivo hasta que se registra el pago de tarjeta.

## Net Worth

Selector:

```text
selectNetWorthReport()
```

Expone:

```text
Cash
Banks
Investments
Credit-card liabilities
Net worth
```

Además conserva internamente:

- liquid assets;
- card positive balance.

### Semántica temporal

Net worth es una **posición acumulativa** a la fecha final del rango, no la suma de actividad dentro del rango.

Por eso movimientos anteriores al inicio del rango siguen afectando los saldos si ocurrieron antes de la fecha de corte.

Las proyecciones futuras de Investments 1.0 no entran en patrimonio.

El crédito disponible tampoco es un activo.

## Comparison

Reports 2.0 compara:

- Spending;
- Income;
- Net cash flow;
- Net worth.

Para cada métrica muestra:

- previous;
- current;
- diferencia absoluta;
- cambio porcentual cuando existe una base válida.

## Presupuestos

El seguimiento de presupuestos actuales permanece como bloque secundario en Reportes para respetar el contrato UX 7.5.

Si no existen presupuestos, el estado vacío conserva la acción:

```text
Crear presupuesto
→ Plan → Presupuestos
```

Ese bloque no cambia el rango analítico seleccionado arriba.

## UI

Reportes mantiene una sola área primaria y no crea rutas nuevas.

Jerarquía implementada:

```text
Page header
Range selector
Spending
Cash Flow
Net Worth
Comparison
Current budget follow-up
```

Resumen sigue siendo `status + action`; el análisis histórico permanece en Reportes.

## Persistencia

Fase 13 es una fase de lectura/analytics.

No cambia:

```text
Dexie v14
JSON v10
```

No añade tablas, migraciones ni campos persistentes.

## Invariantes

1. Home y Reports usan `selectReportsSnapshot`.
2. Spending cuenta cada gasto real una vez.
3. Cash Flow no vuelve a contar una compra de tarjeta al comprar y al pagar.
4. Net worth usa `selectPosition` y permanece acumulativo.
5. Investments registradas entran al patrimonio; proyecciones estimadas no.
6. Previous comparable usa la misma cantidad de días.
7. Los rangos no leen reloj implícito.
8. No se añaden primitivas de red.
9. Ocultar importes sigue aplicando a Reportes.
10. Reportes no se convierte en superficie de edición operativa.

## Pruebas específicas

`tests/phase-13-reports.test.ts` cubre:

- resolución determinista de 7D / 30D / 3M / 6M / 1Y / Custom;
- rechazo de Custom futuro;
- previous comparable con igual duración;
- Spending con compras cash y crédito;
- categorías separadas de Fixed / Variable / Occasional;
- largest transactions;
- Cash Flow con debt payments;
- Net Worth acumulativo con cash, bank, investments y liabilities;
- comparación current vs previous;
- consumo del mismo selector por Home y Reports;
- presencia de todos los rangos y secciones requeridos por el roadmap.

Las regresiones de 7.5 conservan el estado vacío y acceso a Plan → Presupuestos.

## Gate técnico

GitHub Actions `Quality checks` run `36458493360` verificó:

- **286/286 pruebas**, 0 fallos;
- typecheck: aprobado;
- lint con cero warnings: aprobado;
- guard local-only: aprobado;
- build de producción: aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

No se utilizaron datos financieros reales del navegador habitual del usuario.

## Fuera de alcance

- persistir una clasificación Must / Need / Want;
- nuevas fórmulas de forecasting;
- APIs externas;
- Fase 14 — Home 2.0.

**Fase 14 no se inicia automáticamente.**
