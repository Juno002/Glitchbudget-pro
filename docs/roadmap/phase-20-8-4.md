# 20.8.4 — KPI de Resumen: comparación antes que explicación

Fuente funcional: `Roadmap septiembre 2026.txt`. Apoyo: `docs/roadmap/phase-20-8.md`.

**Estado: completada / Gate aprobado.**

Quality gate funcional:

```text
562/562 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36823261725 ✅
```

## Resultado

Los cuatro KPI principales de posición en Resumen ahora priorizan:

```text
nombre
→ cifra
→ comparación canónica
→ señal visual
→ advertencia visible solo cuando cambia interpretación
```

KPI cubiertos:

- Disponible líquido;
- Patrimonio neto;
- Deuda total;
- Inversiones.

## Fuente comparativa

`selectReportsSnapshot()` expone `positionComparisons` usando el contrato de 20.8.2.

`selectPositionKpiComparisons()` acepta un `currentThrough` opcional para que Home compare la posición realmente visible hasta hoy sin incorporar movimientos posteriores del mismo período.

El valor por defecto sigue siendo `currentPeriod.end`, por lo que el contrato anterior permanece compatible.

`selectHomeReadModel()` expone `positionComparisons` como read model paralelo. El objeto histórico `home.position` conserva exactamente:

```text
liquidAssets
investments
liabilities
netWorth
```

Esto mantiene el golden reconciliation de 20.7.5.8 intacto.

## UI

`summary-tab.tsx` consume exclusivamente los resultados canónicos:

- porcentaje cuando existe una base matemática válida;
- delta monetario cuando el valor anterior es cero;
- estado sin base cuando corresponde;
- flecha de dirección como representación visual, no como nueva fórmula financiera.

Las definiciones estables migraron a popover accesible por botón.

Se mantienen visibles las advertencias que sí cambian interpretación:

- Disponible líquido: **No incluye crédito disponible**;
- Deuda total: **Deuda real registrada**;
- Inversiones: **No incluye rendimiento proyectado**.

La definición estable de patrimonio neto queda contextual, no como copy permanente.

## Regresiones protegidas

`tests/phase-20-8-4-summary-kpis.test.ts` congela:

- los cuatro KPI comparativos;
- comparación de Home usando posición hasta `today/currentThrough`;
- exclusión de movimientos posteriores al corte visible;
- preservación exacta del objeto histórico `home.position`;
- orden cifra → comparación → advertencia;
- ayuda contextual mediante popover;
- ausencia de cálculo porcentual o financiero reconstruido en React.

## No-cambios

Sin cambios de:

- Dexie v15;
- Backup JSON v13;
- encrypted envelope v1;
- migraciones;
- persistencia;
- invariantes financieras;
- red;
- 20.8.5.

## Gate

20.8.4 queda cerrada porque Home comunica posición y dirección inmediatamente usando comparaciones canónicas, mantiene visibles las advertencias financieras necesarias y no reconstruye significado financiero en React.
