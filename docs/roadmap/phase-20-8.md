# Fase 20.8 — Information Design + Deterministic Insights

Estado: **en curso — 20.8.1–20.8.2 completadas / Gates aprobados; 20.8.3 es la próxima intervención autorizada**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Objetivo

Hacer que Prisma **diga más con menos** sin introducir IA remota, generación libre de texto ni nuevas fórmulas financieras en React.

La interfaz debe pasar de explicar cada cifra a **jerarquizar, comparar e interpretar métricas canónicas** mediante read models y reglas deterministas.

Regla central:

```text
datos canónicos
→ comparación/selector de dominio
→ prioridad determinista
→ insight parametrizado
→ UI
```

Mismos datos = mismo insight.

No hay LLM, red, prompt ni comportamiento probabilístico.

## 20.8.1 — Preflight de información y regresión de categorías

**Estado: completada / Gate aprobado.**

Quality gate:

```text
542/542 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36803800520 ✅
```

Resultado:

- inventario cerrado de KPI, copy, badges, comparaciones y gráficos visibles de Resumen/Reportes;
- copy clasificado como imprescindible, contextual o redundante;
- disclosure congelado para no esconder consecuencias financieras ni depender solo de hover;
- instalación limpia protegida por test contra desaparición de categorías default;
- categorías históricas personalizadas/archivadas permanecen preservadas;
- no se añadió reparación automática especulativa ni cambios de schema/backup/red/UI financiera.

Evidencia: [phase-20-8-1.md](phase-20-8-1.md).

Antes de cambiar Home o Reportes:

- inventariar cada KPI, explicación, badge, comparación y gráfico visible;
- clasificar copy en: imprescindible / contextual / redundante;
- documentar qué información puede migrar a popover sin perder significado;
- añadir contrato de regresión para instalación limpia: categorías por defecto disponibles;
- no añadir lógica de reparación de categorías mientras la desaparición no sea reproducible;
- confirmar que categorías personalizadas/archivadas siguen protegidas.

**Gate 20.8.1:** inventario cerrado y categorías default protegidas por test, sin reparación especulativa.

## 20.8.2 — Contrato canónico de comparaciones de KPI

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

Resultado:

- `compareKpi()` define una semántica única para períodos, valores, delta absoluto, porcentaje y estado;
- estados canónicos: `comparable`, `zero_previous` y `no_previous_base`;
- `selectPositionKpiComparisons()` cubre líquido, net worth, deuda e inversiones desde `selectPosition()`;
- Net Worth de Reportes reutiliza este contrato y deja de tener semántica paralela;
- el módulo KPI no depende en runtime de Reportes, evitando ciclo de dominio;
- no se añadieron fórmulas comparativas en React ni cambios de persistencia/backup/red/UI.

Evidencia: [phase-20-8-2.md](phase-20-8-2.md).

Definir read models/selectors para comparar, como mínimo:

- disponible líquido;
- patrimonio neto;
- deuda total;
- inversiones.

Cada comparación debe declarar:

- período actual;
- período comparable;
- valor actual;
- valor anterior;
- delta absoluto;
- delta porcentual cuando sea matemáticamente válido;
- estado cuando no existe base comparable.

No calcular estos deltas en componentes React.

**Gate 20.8.2:** semántica comparativa única, testeada y reutilizable.

## 20.8.3 — Motor local de Lectura rápida

Crear un motor determinista de insights para Reportes.

Debe poder producir observaciones parametrizadas como:

- gasto por debajo/encima/cerca del promedio reciente;
- categoría con mayor movimiento;
- cambio significativo de cash flow;
- variación destacable de patrimonio;
- ausencia de anomalías relevantes;
- próximo foco útil para explorar.

Reglas:

- usar exclusivamente métricas/read models canónicos;
- umbrales explícitos y testeados;
- prioridad estable entre insights;
- máximo de información suficiente para una lectura rápida;
- no diagnosticar, predecir ni inventar causalidad;
- no usar texto generado libremente;
- no presentar una correlación como explicación causal.

**Gate 20.8.3:** mismo snapshot financiero produce exactamente la misma Lectura rápida.

## 20.8.4 — KPI de Resumen: comparación antes que explicación

Rediseñar los KPI principales para priorizar:

```text
nombre
cifra
comparación
señal visual
```

Mover definiciones permanentes del tipo “Efectivo + bancos…” a popover/tooltip cuando sean contexto y no una advertencia.

Mantener visibles cuando corresponda:

- distinción efectivo/crédito;
- deuda real;
- valor real/proyectado de inversiones;
- estados que cambian una decisión financiera.

**Gate 20.8.4:** Home comunica posición + dirección sin reconstruir significado financiero.

## 20.8.5 — Home: decir más con menos

Revisar la composición completa de Resumen:

- reducir explicación redundante;
- reforzar jerarquía de posición, presupuesto, próximos pagos, metas e inversiones;
- evitar cards que parezcan documentación;
- preservar acciones importantes;
- usar espacio, comparación y señales visuales para comunicar estado;
- mantener detalles exactos accesibles bajo demanda.

No eliminar información necesaria para entender una consecuencia financiera.

**Gate 20.8.5:** menos texto permanente, igual o mayor capacidad de decisión.

## 20.8.6 — Reportes: nueva jerarquía editorial

Recomponer Reportes siguiendo una lectura descendente:

```text
Lectura rápida
→ hero analítico
→ tendencias/comparaciones
→ categorías/naturaleza
→ cash flow
→ net worth
→ detalle exacto
```

La Lectura rápida debe complementar, no reemplazar, tablas o métricas exactas.

Preservar:

- Spending;
- Cash Flow;
- Net Worth;
- comparación de períodos;
- categoría;
- naturaleza;
- 7D / 30D / 3M / 6M / 1Y / Custom;
- gráficos reales.

**Gate 20.8.6:** Reportes interpreta y jerarquiza sin perder ninguna capacidad analítica.

## 20.8.7 — Progressive disclosure y copy contextual

Aplicar una regla consistente:

```text
¿ayuda a decidir ahora? → visible
¿aclara una definición? → popover/tooltip
¿es redundante? → eliminar
¿advierte una consecuencia importante? → visible
```

No esconder únicamente en hover información necesaria en móvil.

Tooltips/popovers deben ser accesibles por teclado y toque.

**Gate 20.8.7:** la reducción de ruido no reduce comprensión ni accesibilidad.

## 20.8.8 — Gate final 20.8

Validar:

- comparaciones deterministas;
- Lectura rápida determinista;
- cero red;
- cero LLM;
- cero nuevas fórmulas financieras en UI;
- categorías default en instalación limpia;
- Home desktop/móvil;
- Reportes desktop/móvil;
- tablas/detalle exacto preservados;
- offline intacto;
- backup/migraciones intactos.

Requerido:

```text
npm run check
npm run build
npm run test:e2e
```

## Fuera de alcance

20.8 no es la fase de acabado visual fino.

No dedicar esta fase a:

- texturas;
- motion polish global;
- timings premium;
- sombras/blur finales;
- pixel polish;
- normalización completa de idioma.

Eso pertenece a 20.9.
