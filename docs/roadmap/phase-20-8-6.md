# 20.8.6 — Reportes: nueva jerarquía editorial

Fuente funcional: `Roadmap septiembre 2026.txt`. Apoyo: `docs/roadmap/phase-20-8.md`.

**Estado: completada / Gate aprobado.**

Quality gate funcional:

```text
576/576 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36826235113 ✅
```

## Resultado

Reportes deja de presentar bloques analíticos equivalentes y adopta la jerarquía editorial autorizada:

```text
Lectura rápida
→ hero analítico
→ tendencias / comparaciones
→ categorías / naturaleza
→ flujo de caja
→ patrimonio neto
→ detalle exacto
```

### Lectura rápida

- `report.quickRead` pasa a mostrarse como primera capa de lectura;
- las tarjetas usan las claves/params deterministas ya producidas por 20.8.3;
- la UI solo aplica plantillas fijas y resolución de nombre de categoría;
- no se añade ranking, causalidad, cálculo financiero ni generación libre de texto en React;
- cada insight mantiene `data-quick-read-kind` para congelar el contrato visual.

### Hero analítico

Spending pasa a ser el hero de apertura analítica y presenta, desde el snapshot existente:

- gasto total del rango;
- período comparable;
- tendencia;
- cantidad de transacciones.

No se reconstruye ninguna métrica.

### Tendencias y distribución

- Comparison se mueve inmediatamente después del hero;
- el gráfico y la tabla exacta Actual vs. anterior permanecen intactos;
- Categorías y naturaleza se agrupan como una misma capa de desglose;
- se conservan donut, barras y tablas exactas.

### Capacidad preservada

Se mantienen:

- Spending;
- Cash Flow;
- Net Worth;
- comparación de períodos;
- distribución por categoría;
- naturaleza del gasto;
- Largest transactions;
- 7D / 30D / 3M / 6M / 1Y / Custom;
- gráficos reales;
- tablas exactas;
- seguimiento secundario de presupuestos.

Largest transactions queda después de Net Worth bajo **Detalle exacto**, de modo que la capa editorial no sustituye las filas reales.

## Gate específico

`tests/phase-20-8-6-reports-hierarchy.test.ts` congela:

- el orden editorial completo;
- Lectura rápida antes del hero;
- hero derivado solo de `report.spending`;
- gráficos y tablas existentes;
- detalle exacto después de Net Worth;
- rangos de Reportes;
- seguimiento de presupuestos;
- ausencia de acceso directo a persistencia o reconstrucción financiera en React.

## Arquitectura

Sin cambios en:

- `src/domain/reports.ts`;
- `src/domain/report-insights.ts`;
- fórmulas financieras;
- Dexie;
- schema/migraciones;
- backups;
- red;
- offline;
- 20.8.7.

**Gate 20.8.6:** aprobado. Reportes interpreta y jerarquiza sin perder capacidad analítica. 20.8.7 queda habilitada.
