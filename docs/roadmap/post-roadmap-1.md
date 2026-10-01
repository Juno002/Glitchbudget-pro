# Post-roadmap 1 — Corrección funcional crítica: períodos, dinero y reglas

Estado: **completada / Gate aprobado**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Alcance cerrado

### A1 — El período seleccionado ya no se reinicia por ajustes no relacionados

`FinanceProvider` ya no depende del objeto completo `settings` para recentrar el período.

Se añadió `reconcileSelectedPeriod()`:

- conserva una selección histórica cuando `periodStartDay` no cambia;
- recentra al período que contiene “hoy” en la inicialización o cuando cambia realmente `periodStartDay`;
- cambiar tema, políticas u otros ajustes no toca la selección del usuario.

### A2 — Movimientos usa el mismo período financiero que Resumen y Reportes

Se eliminó el helper local `monthRange()` de `MovementsView`.

La ventana predeterminada y el restablecimiento de filtros ahora derivan de:

```text
currentPeriod.start
currentPeriod.end
```

mediante `filtersForPeriod()`. Con un inicio de período distinto de 1, la lista de Movimientos y los totales analíticos comparten exactamente el mismo rango.

### B1 — Frontera monetaria unificada en centavos

Se añadió el tipo nominal `Cents` como contrato de escritura.

`saveIncome()` y `saveExpense()`:

- reciben centavos enteros;
- ya no multiplican internamente por 100;
- comparten la misma unidad que transferencias, pagos de deuda y aportes a metas.

Las conversiones desde formularios se realizan una sola vez en el borde mediante `toCents()`.

Las confirmaciones de planificados conservan directamente los centavos ya persistidos por la regla recurrente.

Los tests históricos que expresaban importes en unidades mayores usan un adaptador de fixture explícito; el servicio productivo permanece cents-only.

### B2 — Currency y locale visibles respetan Settings

- el contexto expone `locale`;
- `usePrivateCurrency()` usa `settings.currency + settings.locale`;
- Movimientos y Resumen usan el locale configurado al presentar fechas/porcentajes;
- el compositor ya no muestra `RD$` de forma fija: `DOP → RD$`, otras monedas → su código ISO.

No se habilita FX automático ni cuentas operativas multimoneda.

### A6 — La decisión manual vence a una regla automática

El compositor registra si categoría o necesidad fueron modificadas manualmente.

Una regla automática solo puede completar un campo mientras ese campo no haya pasado a control manual. Cambiar posteriormente el concepto ya no puede pisar esa decisión.

La aceptación explícita de una sugerencia también pasa el campo a control manual.

## Regresiones añadidas

`tests/post-roadmap-1-critical-correctness.test.ts` comprueba:

- persistencia de un período seleccionado frente a cambios no relacionados;
- rango 25→24 compartido por Movimientos;
- escritura exacta de centavos sin un ×100 oculto;
- formatting con currency/locale configurables;
- precedencia manual sobre automatización.

También se reconciliaron los tests históricos de auto-apply y los fixtures de escritura para reflejar el contrato cents-only sin cambiar sus escenarios económicos.

## Fuera de alcance preservado

No se modificó:

- schema Dexie;
- migraciones;
- formato JSON/CSV;
- formato de copia cifrada;
- invariantes del ledger;
- navegación URL/history;
- lifecycle de medianoche;
- loading de Resumen;
- tema `system`;
- arquitectura general del contexto;
- backend/red/CSP.

## Gate

Quality Checks sobre `aadd2de53a2d97c0a528db0906dcba9a5f41869a`, run `36940504798`:

```text
npm run check            ✅
ledger benchmark         ✅
npm run build            ✅
npm run test:e2e         ✅
```

**Gate Post-roadmap 1 aprobado.**

La próxima intervención autorizada es **Post-roadmap 2 — Ciclo de vida: fecha, carga y tema**.
