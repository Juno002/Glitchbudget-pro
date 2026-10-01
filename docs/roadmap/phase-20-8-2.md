# 20.8.2 — Contrato canónico de comparaciones KPI

Fuente funcional: `Roadmap septiembre 2026.txt`. Apoyo: `docs/roadmap/phase-20-8.md`.

**Estado: completada / Gate aprobado.**

Quality gate:

```text
547/547 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36819113232 ✅
```

## Contrato congelado

`src/domain/kpi-comparisons.ts` define una única semántica de comparación para KPI de posición.

Cada comparación declara:

- período actual;
- período comparable cuando existe;
- valor actual;
- valor anterior cuando existe;
- delta absoluto cuando existe base;
- delta porcentual solo cuando es matemáticamente válido;
- estado explícito de comparabilidad.

Estados:

```text
comparable       → existe base anterior distinta de cero
zero_previous    → existe período/base anterior real con valor 0; delta absoluto válido, porcentaje no válido
no_previous_base → no existe período/base comparable; previous/deltas permanecen null
```

Un valor anterior igual a cero ya no se confunde con ausencia de datos.

## KPI cubiertos

`selectPositionKpiComparisons()` produce comparaciones canónicas para:

- disponible líquido;
- patrimonio neto;
- deuda total;
- inversiones.

Los valores se derivan directamente de `selectPosition()`, manteniendo el ledger como fuente financiera única. El módulo no depende en runtime de `reports.ts`, evitando una dependencia circular de dominio.

## Integración con Reportes

La comparación existente de patrimonio neto en `selectReportsSnapshot()` se enruta mediante `compareKpi()`.

Por tanto:

- Reportes no mantiene una segunda semántica para Net Worth;
- `previous = 0` produce `zero_previous` y porcentaje `null`;
- la UI sigue representando valores ya calculados por dominio;
- no se introducen deltas financieros exclusivos de React.

Las comparaciones históricas de Spending, Income y Net Cash Flow permanecen sin ampliar alcance en esta microintervención; 20.8.2 congela específicamente el contrato reutilizable requerido y conecta el KPI de Net Worth ya existente.

## Cambios y no-cambios

Cambios:

- nuevo contrato/read model de comparaciones KPI;
- selector canónico de los cuatro KPI de posición;
- reutilización del contrato en comparación de Net Worth de Reportes;
- tests para porcentaje, valor anterior cero, ausencia real de base y los cuatro KPI.

Sin cambios:

- Dexie v15;
- Backup JSON v13;
- encrypted envelope v1;
- migraciones;
- fórmulas financieras del ledger;
- persistencia;
- red;
- UI visual;
- 20.8.3.

## Gate

20.8.2 queda cerrado porque existe una semántica comparativa única, testeada y reutilizable fuera de React, con estado explícito para cero anterior y ausencia de base comparable.
