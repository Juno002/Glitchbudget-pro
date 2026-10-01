# 20.8.5 — Home: decir más con menos

Fuente funcional: `Roadmap septiembre 2026.txt`. Apoyo: `docs/roadmap/phase-20-8.md`.

**Estado: completada / Gate aprobado.**

Quality gate funcional:

```text
569/569 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36825003818 ✅
```

## Resultado

Resumen queda más orientado a decisión sin cambiar ninguna semántica financiera:

- Posición conserva los cuatro KPI, sus comparaciones canónicas y las advertencias que cambian interpretación, pero elimina la explicación redundante del encabezado.
- Los módulos dejan de usar eyebrows que repetían el título sin añadir una consecuencia.
- Presupuesto prioriza **Disponible** y conserva visibles Gastado, Presupuestado y el estado; los conteos de exceso/cercanía al límite solo aparecen cuando requieren atención.
- Próximos conserva las ocurrencias, fechas, importes y acciones Confirmar/Omitir, pero elimina mensajes tranquilizadores como “Sin pagos vencidos” cuando no existe una acción asociada.
- Metas conserva progreso, restante, fecha y consecuencia; el aporte mensual usa copy más corto y accionable.
- Inversiones deja de repetir el valor agregado ya visible en Posición y prioriza vencimientos y elementos que requieren revisión.
- El badge global de atención solo aparece cuando `attentionCount > 0`; se elimina el estado permanente “Todo está en orden”.
- El encabezado conserva el período actual sin repetir “Tu panorama financiero”.

## Información y acciones preservadas

Siguen visibles o accesibles directamente desde Resumen:

- Disponible líquido, patrimonio neto, deuda e inversiones con comparación de período.
- Advertencias sobre crédito disponible, deuda real y rendimiento proyectado.
- Disponible, gastado y presupuestado.
- Pagos/ingresos planificados y sus acciones.
- Progreso y fechas de metas.
- Vencimientos de inversiones.
- Accesos a Cuentas, Presupuestos, Plan, Metas e Inversiones.
- Personalización y orden de módulos.

Los detalles extensos permanecen disponibles mediante las superficies de detalle correspondientes.

## Gate específico

`tests/phase-20-8-5-home-hierarchy.test.ts` congela:

- reducción de copy redundante;
- jerarquía decision-first de Presupuesto;
- ausencia de filler no accionable en Próximos;
- progreso/consecuencia preservados en Metas;
- enfoque action-first de Inversiones;
- badge global únicamente ante atención real;
- ausencia de nueva agregación financiera en React.

## Persistencia y arquitectura

Sin cambios en:

- `src/domain/home.ts`;
- fórmulas financieras;
- Dexie;
- schema/migraciones;
- Backup JSON;
- encrypted backup;
- red;
- offline;
- branding;
- 20.8.6.

**Gate 20.8.5:** aprobado. Resumen reduce ruido permanente sin perder consecuencias financieras, acciones ni acceso a detalle exacto. 20.8.6 queda habilitada.
