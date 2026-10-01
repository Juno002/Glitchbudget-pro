# 20.8.3 — Motor local de Lectura rápida

Fuente funcional: `Roadmap septiembre 2026.txt`. Apoyo: `docs/roadmap/phase-20-8.md`.

**Estado: completada / Gate aprobado.**

Quality gate funcional:

```text
557/557 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36821019073 ✅
```

## Arquitectura cerrada

`src/domain/report-insights.ts` implementa una capa editorial puramente determinista:

```text
snapshot canónico de Reportes
→ reglas explícitas
→ candidatos
→ prioridad estable
→ máximo 3 insights
→ copy key + params
```

El motor:

- no lee movimientos crudos;
- no recalcula dinero;
- no toca Dexie;
- no usa React;
- no lee reloj;
- no usa aleatoriedad;
- no usa red;
- no genera texto libre;
- no infiere causas.

`selectReportsSnapshot()` adjunta el resultado como `quickRead`, de modo que los consumidores posteriores reciben la interpretación junto al mismo snapshot canónico.

## Reglas y umbrales

Umbrales congelados en `QUICK_READ_THRESHOLDS`:

```text
spendingNearPercent             5%
cashFlowSignificantPercent     15%
netWorthSignificantPercent      5%
leadingCategorySharePercent    35%
maxInsights                     3
```

Prioridad estable:

```text
cash_flow_change          100
spending_above/below       90
net_worth_change           80
leading_category           60
spending_near_previous     40
no_material_change         10
```

Empates se resuelven de forma estable por `kind`.

## Insights soportados

El motor puede devolver:

- `spending_above_previous`;
- `spending_below_previous`;
- `spending_near_previous`;
- `cash_flow_change`;
- `net_worth_change`;
- `leading_category`;
- `no_material_change`.

Cada insight contiene:

- `kind`;
- `priority`;
- `focus`;
- `direction`;
- `copy.key`;
- `copy.params`.

El copy queda parametrizado como datos. La presentación visual y el texto final visible se reservan para las intervenciones de UI posteriores.

## Decisiones semánticas

- Spending usa la comparación canónica contra el período inmediatamente anterior de duración comparable ya existente en Reportes.
- No se inventa todavía un “promedio reciente” multiperíodo porque el snapshot actual no lo expone; añadir esa agregación aquí habría ampliado la semántica financiera sin necesidad.
- Spending que pasa de una base real de 0 a un valor positivo se trata como incremento nuevo, con porcentaje `null` en vez de fabricar un porcentaje.
- Cash Flow solo se eleva como insight por cambio >= 15%, o cuando pasa de una base real de 0 a un valor no nulo.
- Net Worth solo se eleva por cambio >= 5%, o cuando pasa de una base real de 0 a un valor no nulo.
- Una categoría se eleva como foco cuando su proporción real, antes de redondear para display, concentra >= 35% del spending del rango.
- Si ninguna regla resulta relevante, se devuelve `no_material_change`.
- Un valor anterior cero no produce un porcentaje fabricado.
- No se interpreta subida/bajada como causa, diagnóstico o recomendación financiera.

## Tests específicos

`tests/phase-20-8-3-quick-read.test.ts` congela:

- mismo snapshot → misma Lectura rápida;
- umbrales exactos;
- ranking estable;
- máximo de 3 insights;
- copy parametrizado;
- categoría dominante;
- fallback sin cambio material;
- spending y cash flow con base anterior cero;
- umbral de categoría evaluado antes del redondeo;
- integración dentro del snapshot de Reportes;
- ausencia de reloj, aleatoriedad, React, persistencia y red.

## No-cambios

20.8.3 no modifica:

- fórmulas del ledger;
- Dexie v15;
- Backup JSON v13;
- encrypted envelope v1;
- migraciones;
- UI visual;
- schema;
- persistencia;
- red;
- 20.8.4.

## Gate

20.8.3 queda cerrado porque el mismo snapshot financiero produce exactamente la misma Lectura rápida, con reglas explícitas, prioridades estables y copy parametrizado, sin causalidad inventada ni comportamiento probabilístico.
