# Fase 20.1 — Contrato visual + inventario de paridad

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 20.

Estado: **completado / Gate 20.1 aprobado**.

Referencia visual congelada:

```text
Juno002/Prisma
dc4310040f42cefd74cf41bad75152902e549c24
```

El preflight técnico previo está documentado en [phase-20-1-preflight.md](phase-20-1-preflight.md). Este documento cierra el trabajo visual/documental que faltaba para completar 20.1.

## 1. Decisión de integración

```text
Prisma visual language
        ↓
GlitchBudget React UI
        ↓
existing queries / read models / commands
        ↓
GlitchBudget financial engine
        ↓
Dexie / local persistence
```

Prisma aporta apariencia, composición, densidad, jerarquía, tokens, navegación visual y patrones de interacción. GlitchBudget conserva toda semántica financiera, persistencia, backup, seguridad local, offline y comportamiento de producto.

No hay rewrite ni segundo motor.

## 2. Qué sí puede tomarse de Prisma

Se pueden recrear o adaptar, sin copiar lógica financiera:

- paleta clara cálida, verdes profundos y acentos coral/mint/lavender;
- tipografía editorial para métricas/títulos y sans para interfaz;
- sidebar de escritorio;
- header móvil compacto;
- bottom navigation de cuatro destinos;
- FAB móvil;
- cards con menor chrome y mayor respiración;
- metric cards y paneles;
- filas de movimientos y cuentas;
- filtros/search bars;
- modales/sheets;
- barras, donuts, legends y tratamientos de chart;
- jerarquía de `eyebrow → title → supporting copy`;
- estados hover/focus/pressed;
- motion breve de entrada y modal;
- responsive composition.

La implementación final debe usar los datos y handlers de GlitchBudget, aunque el componente visual sea recreado a partir de la referencia.

## 3. Código Prisma expresamente prohibido

No incorporar al producto final:

- `client/src/domain/**`;
- `client/src/application/**`;
- `client/src/persistence/**`;
- `server/**`;
- DB, schema, migraciones o backup de Prisma;
- Express/runtime remoto;
- `package.json`, toolchain o roadmap de Prisma;
- cálculos de `client/src/pages/Home.tsx` como `deriveMetrics`, `accountBalance`, `liabilities` o fórmulas equivalentes;
- `initialTransactions`, `chartBars`, `budgetRows` y cualquier otro dato financiero demo/hardcoded;
- porcentajes, fechas, nombres de usuario, compromisos o insights hardcoded presentados como información real;
- cualquier llamada de red o dependencia que debilite el contrato local-only.

La referencia Prisma contiene lógica y datos de demostración mezclados con la vista. Por eso `Home.tsx` es referencia de composición, **no** fuente para portar comportamiento.

## 4. Matriz de paridad: superficies principales

| Superficie GlitchBudget actual | Capacidades que deben sobrevivir | Destino Fase 20 | Etapa |
|---|---|---|---|
| Shell / app layout | composición, offline/PWA, overlays, toasts | Shell Prisma + Neón compartido | 20.2 |
| Header | período, hide amounts, ajustes, logros secundarios | Header Prisma responsive | 20.2 |
| Bottom nav | Resumen / Movimientos / Plan / Reportes | Mobile nav Prisma, mismos cuatro destinos | 20.2 |
| Acción global | gasto / ingreso / transferencia desde cualquier área | FAB móvil + acción desktop Prisma | 20.2/20.4 |
| Resumen | posición, presupuesto, próximos, metas, inversiones, preferencias | Home Prisma alimentado por `selectHomeReadModel` | 20.3 |
| Movimientos | historial, búsqueda, filtros, saved filters, metadata, edición | Movimientos Prisma | 20.4 |
| Compositor | crear/editar gasto, ingreso y transferencia, templates/rules | Modal/sheet Prisma conectado a commands existentes | 20.4 |
| Cuentas | saldos, detalle, movimientos, transferencias, conciliación, archive/manage | gestión secundaria desde Movimientos | 20.4/20.7 |
| Tarjetas/deuda | pasivo, pagos/abonos, conciliación, gestión | gestión secundaria Prisma | 20.4/20.7 |
| Inversiones | principal, valor registrado, vencimiento, gestión | superficie Prisma sin proyecciones convertidas en real | 20.3/20.7 |
| Plan | Presupuestos / Metas / Planificados | Plan Prisma con misma navegación interna | 20.5 |
| Presupuestos | límites, spent/remaining/status, period controls, reassignment | cards/rows Prisma consumiendo selectors | 20.5 |
| Metas | objetivo, reservas, aportes, progreso, edición | Goals Prisma | 20.5 |
| Planificados | reglas, ocurrencias, pending/confirmed/skipped/overdue, confirm/skip | Planned Prisma | 20.5 |
| Reportes | Spending, Cash Flow, Net Worth, Comparison, budget follow-up | Reportes Prisma | 20.6 |
| Rangos | 7D / 30D / 3M / 6M / 1Y / Custom | controles compactos Prisma | 20.6 |
| Categorías | income/expense, rename/archive/icon/history-safe | Ajustes/management Prisma | 20.7 |
| Automatización | Templates → Saved Filters → Rules, sugerir/aplicar/ordenar | Ajustes + compositor Prisma | 20.4/20.7 |
| Ajustes | General, Finanzas, Categorías, Privacidad, Datos, Apariencia, Acerca de | Settings Prisma | 20.7 |
| Seguridad | App Lock, Auto-lock, unlock gate | overlays/settings Prisma, misma lógica | 20.7 |
| Backup/restore | JSON, cifrado, preview, OPFS, confirmación | Datos y respaldos Prisma | 20.7 |
| Persistent storage | awareness + request explícito | Datos y respaldos Prisma | 20.7 |
| Logros | badge, panel, toast/unlock feedback | superficie secundaria Prisma | 20.7 |
| Help | ayuda y explicación necesaria | diálogo/hoja Prisma | 20.7 |
| Error/loading/empty | errores, skeletons, empty states, destructive confirmations | patrones Prisma accesibles | 20.2–20.7 |
| `/transactions` | compatibilidad de historial/tabla existente | mantener hasta demostrar que Movimientos lo sustituye sin regresión | 20.4 |

Ninguna fila autoriza eliminar una capacidad. Si durante la migración aparece una función no listada, se añade a esta matriz antes de retirar su superficie antigua.

## 5. Paridad de Resumen

La jerarquía canónica se mantiene:

1. posición financiera;
2. presupuesto disponible;
3. próximos movimientos;
4. metas relevantes;
5. inversiones.

Protegido:

- disponible líquido;
- inversiones registradas reales;
- pasivos;
- patrimonio neto;
- remaining/spent de presupuesto;
- upcoming y overdue;
- metas activas y progreso;
- inversiones activas/vencimientos;
- personalización/orden/visibilidad de módulos;
- hide amounts.

La referencia Prisma puede inspirar metric cards, paneles, sparkline/chrome y composición, pero no sus porcentajes, presupuestos fijos, usuario `Alex`, fechas ni mensajes hardcoded.

## 6. Paridad de Movimientos

Protegido:

- búsqueda;
- filtros por tipo, cuenta, categoría, necesidad y etiqueta;
- saved filters;
- metadata;
- edición de movimientos;
- gasto / ingreso / transferencia;
- cuentas de origen/destino;
- tarjeta/crédito;
- validaciones canónicas;
- budget warning;
- templates;
- rules sugeridas y auto-apply;
- navegación desde planificados confirmados al movimiento real;
- administración de cuentas/tarjetas/inversiones como superficies secundarias.

El nuevo compositor no puede saltarse `command/service/domain/persistence`.

## 7. Paridad de Plan

Protegido:

- `Presupuestos`;
- `Metas`;
- `Planificados`;
- selector de período;
- límites y estados de presupuesto;
- reasignación;
- reservas/aportes de metas;
- recurrencias;
- ocurrencias;
- estados pending/confirmed/skipped/overdue;
- confirmación única;
- vínculo al movimiento confirmado.

La UI solo representa estos estados; no vuelve a calcular su semántica.

## 8. Paridad de Reportes y gráficos

Capacidad analítica protegida:

- Spending;
- Cash Flow;
- Net Worth;
- comparación contra período comparable;
- tendencia;
- categorías;
- Fixed / Variable / Occasional;
- largest transactions;
- seguimiento de presupuestos actuales;
- rangos 7D / 30D / 3M / 6M / 1Y / Custom.

Inventario de gráficos existente:

- `expense-donut-chart.tsx`;
- `monthly-result-chart.tsx`;
- `percentage-spent-ring.tsx`;
- visualizaciones de tendencia/distribución integradas en Reportes.

Regla de migración:

```text
rediseñar / combinar / recolocar ✅
eliminar capacidad analítica por minimalismo ❌
recalcular significado financiero dentro del chart ❌
usar cifras demo Prisma ❌
```

## 9. Sonidos protegidos

`src/lib/sounds.ts` conserva como contrato de experiencia:

- `playExpense`;
- `playIncome`;
- `playBudgetExceeded`;
- `playGoalComplete`;
- `playCoinDrop`;
- `playAchievementUnlock`.

Pueden ajustarse los puntos visuales donde se dispara el feedback durante la migración, pero no eliminarse silenciosamente. Audio no disponible/bloqueado continúa siendo no fatal.

## 10. Movimiento y microinteracciones protegidas

Protegido:

- `MotionConfig reducedMotion="user"` / preferencia equivalente;
- `prefers-reduced-motion`;
- tokens `--motion-fast`, `--motion-standard`, `--motion-slow`;
- animación de cards de presupuesto;
- transiciones del compositor;
- toast/animación de logros;
- feedback de guardado/estado;
- focus-visible y estados disabled;
- hover/pressed donde existan;
- skeleton/loading;
- confirmations destructivas;
- balance visibility;
- feedback de App Lock/Auto-lock.

La estética Prisma puede reducir amplitud o duración, pero no ignorar accesibilidad.

## 11. Copy: qué se puede reducir y qué no

Se puede reducir:

- texto que repite literalmente el título de una sección;
- explicaciones permanentes de acciones obvias;
- subtítulos redundantes que no cambian una decisión;
- chrome verbal alrededor de métricas autoexplicativas.

Debe conservarse o reubicar cerca de la acción:

- diferencia entre saldo real y planificación;
- compra a crédito vs salida de efectivo;
- pago de deuda;
- transferencias;
- metas como reservas;
- inversiones reales vs proyección;
- consecuencias de acciones destructivas;
- límites/advertencias de backup, App Lock y persistent storage;
- estados pending/confirmed/skipped/overdue;
- errores y razones de bloqueo/validación.

Principio:

```text
menos copy redundante ≠ menos información necesaria para decidir
```

## 12. Component mapping inicial

Patrones GlitchBudget que permanecen conceptualmente y pueden recibir nueva piel:

- `PageHeader` → Prisma page heading;
- `SectionHeader` → Prisma section heading;
- `MetricCard` → Prisma metric card;
- `MoneyValue` / `DeltaValue` → typography/value treatment;
- `ProgressMetric` → Prisma progress treatment;
- `StatusBadge` → Prisma status pill/badge;
- `TransactionRow` → Prisma transaction row;
- `PlannedPaymentRow` → Prisma planned row;
- `DetailHeader` → Prisma detail header;
- `ActionMenu` → compact overflow/action menu;
- `FilterChip` → Prisma filter chip;
- `EmptyState` → Prisma empty state.

No se obliga a conservar el mismo JSX si la sustitución demuestra paridad.

## 13. Gate 20.1

Gate aprobado porque:

- referencia Prisma congelada por commit;
- inventario de superficies actuales completado;
- toda superficie funcional tiene destino y etapa;
- gráficos inventariados y protegidos;
- sonidos inventariados y protegidos;
- movimiento/microinteracciones inventariados y protegidos;
- seguridad, backup, offline y privacidad tienen destino;
- copy reducible vs copy obligatoria queda separado;
- componentes visuales portables/recreables identificados;
- código Prisma prohibido queda explícito;
- ninguna capacidad está marcada para eliminación implícita;
- no se cambió schema, backup ni semántica financiera.

## 14. Cambios técnicos de 20.1

```text
Schema: ninguno
Dexie: v14
Backup JSON: v13
Encrypted envelope: v1
Financial semantics: sin cambios
Network contract: sin cambios
```

Quality gate final:\n\n```text\n467/467 tests\nnpm run check ✅\nnpm run build ✅\nnpm run test:e2e ✅\nQuality checks 36640064226 ✅\n```\n\nSiguiente etapa autorizada: **20.2 — Design system, temas y shell**.
