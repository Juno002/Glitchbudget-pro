# Fase 20.6 — Reportes + sistema de gráficos Prisma

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 20.

Estado: **completada / Gate 20.6 aprobado**.

Referencia visual: `Juno002/Prisma@dc4310040f42cefd74cf41bad75152902e549c24`.

## Objetivo

Rediseñar Reportes con el lenguaje Prisma sin reducir información financiera ni reconstruir significado dentro de React.

```text
Reports Prisma
        ↓
getReportSnapshot(range, range.end)
        ↓
selectors de dominio canónicos
        ↓
ledger / datos locales
```

Los gráficos reciben exclusivamente valores ya derivados desde el snapshot.

## Paridad analítica

Se conserva:

- Spending;
- Cash Flow;
- Net Worth;
- Comparison;
- distribución por categoría;
- naturaleza Fixed / Variable / Occasional;
- Largest transactions;
- seguimiento secundario de presupuestos;
- rango 7D;
- rango 30D;
- rango 3M;
- rango 6M;
- rango 1Y;
- rango Custom.

Regla aplicada:

```text
minimalismo ≠ menos información financiera
```

Las visualizaciones se añaden junto a las tarjetas y tablas exactas; no las sustituyen.

## Spending

Continúa consumiendo `report.spending` desde el snapshot canónico.

Se representan:

- total gastado;
- período comparable;
- percent change;
- cantidad de transacciones;
- distribución por categoría;
- naturaleza del gasto;
- largest transactions.

Una compra con tarjeta cuenta una sola vez como gasto.

## Cash Flow

Continúa consumiendo `report.cashFlow`.

Se representan sin recalcular:

- Income;
- Cash expenses;
- Debt payments;
- Net cash flow.

Una compra a crédito no se convierte en salida de efectivo hasta el pago real de tarjeta.

## Net Worth

Continúa consumiendo `report.netWorth`.

Se representan:

- Cash;
- Banks;
- Investments;
- Credit-card liabilities;
- Net worth;
- saldo a favor real de tarjeta cuando existe.

El crédito disponible no se trata como activo y las proyecciones futuras de inversiones no entran al patrimonio real.

## Comparison

Continúa consumiendo `report.comparison`.

Se comparan:

- gasto;
- ingreso;
- flujo neto de efectivo;
- patrimonio neto.

El rango anterior continúa siendo la ventana inmediatamente anterior de duración comparable definida por el dominio.

## Sistema de gráficos

Nuevo renderer:

`src/components/dashboard/charts/report-charts.tsx`

Expone:

- `ReportCategoryDonut`;
- `ReportValueBars`;
- `ReportComparisonBars`.

Visualizaciones integradas:

1. distribución por categoría;
2. naturaleza del gasto;
3. Cash Flow;
4. composición de Net Worth;
5. comparación actual vs anterior.

Los renderers:

- no importan `useFinances`;
- no acceden a Dexie;
- no acceden a IndexedDB;
- no ejecutan selectors financieros;
- no suman movimientos;
- no derivan spending/cash flow/net worth.

Transforman únicamente métricas recibidas en barras, sectores, ejes, leyendas y tooltips.

Los componentes gráficos históricos existentes no fueron eliminados.

## Rangos

`ReportRangeControls` conserva:

```text
7D
30D
3M
6M
1Y
Custom
```

La resolución de fechas permanece en `resolveReportRange`.

## Arquitectura

No se añadió:

- Dexie directo en Reportes;
- acceso IndexedDB desde charts;
- cálculo alternativo de Spending;
- cálculo alternativo de Cash Flow;
- cálculo alternativo de Net Worth;
- cálculo alternativo de Comparison;
- runtime remoto;
- tráfico financiero de red;
- datos financieros hardcoded de Prisma.

`ReportsTab` sigue usando:

```text
getReportSnapshot(range, range.end)
```

## Browser E2E

El smoke E2E valida en Chrome/Chromium real:

1. shell Prisma desktop/móvil;
2. Home Prisma;
3. Movimientos/compositor Prisma;
4. creación real de ingreso/gasto;
5. Plan Prisma;
6. Reportes Prisma;
7. Spending;
8. Cash Flow;
9. Net Worth;
10. Comparison;
11. cinco visualizaciones;
12. preset 7D;
13. preset Custom + inputs de fecha;
14. service worker;
15. recarga offline;
16. fallo ante requests HTTP(S) externos.

## Gate 20.6

```text
495/495 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36670721688 ✅
```

E2E:

```text
responsive shell
+ Prisma Home
+ Prisma Movimientos/composer
+ Prisma Plan
+ Prisma Reports/charts
+ movement mutation
+ navigation
+ offline reload
✅
```

## Persistencia

Sin cambios:

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

No hubo migración de schema ni cambio de formato de backup.

## Riesgos / límites

- Cuentas/tarjetas ya tienen migración visual parcial desde 20.4, pero el barrido final de superficies secundarias permanece para 20.7.
- Inversiones, categorías, Ajustes, seguridad, backup/restore, logros, estados globales y detail views permanecen para 20.7.
- El branding visible sigue siendo GlitchBudget Pro hasta 20.7.
- `serious` continúa como tema legado.

Siguiente etapa autorizada tras merge y gate verde: **20.7 — Superficies secundarias + branding Prisma + gate final**.
