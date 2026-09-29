# Fase 20 — Modo Prisma / transformación visual y branding

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 20.

Estado: **20.1 en curso — preflight técnico completado; contrato visual e inventario de paridad pendientes**.

Referencia visual congelada al iniciar la fase:

```text
Juno002/Prisma
main @ dc4310040f42cefd74cf41bad75152902e549c24
```

La referencia Prisma se utiliza **solo como fuente visual**. Su dominio, commands, persistencia, backup, servidor y roadmap técnico no forman parte de la implementación final.

## Preflight técnico de 20.1

El hardening previo está **completado** y documentado en [phase-20-1-preflight.md](phase-20-1-preflight.md).

Incluye:

- browser persistent storage awareness/request;
- 1 200 escenarios deterministas de propiedades del ledger;
- browser E2E real sobre la build estática y recarga offline;
- Quality checks `36617612176`: 463/463 tests, build y E2E verdes.

Esto no cierra 20.1: la matriz de paridad, el inventario visual y el inventario protegido de gráficos/sonidos/animaciones siguen pendientes.
## Objetivo

Transformar GlitchBudget en el producto visual **Prisma** sin sustituir ni duplicar su motor financiero.

La dirección de integración es:

```text
Prisma visual language
        ↓
GlitchBudget UI
        ↓
existing queries / read models / commands
        ↓
GlitchBudget financial engine
        ↓
Dexie / local persistence
```

Al completar el gate 20.7, **Prisma** pasa a ser el nombre visible del producto. El cambio es de branding y experiencia; no implica renombrar automáticamente identificadores persistentes o internos.

## Contrato innegociable

Durante toda Fase 20:

- GlitchBudget continúa siendo la única fuente de verdad financiera.
- No se porta el mini-motor financiero del repositorio Prisma.
- No se importa la Dexie DB de Prisma.
- No se adopta el backup v4 de Prisma.
- No se adopta su servidor Express, runtime remoto ni dependencias de red.
- No se fusionan `package.json`, toolchains o roadmaps de ambos repositorios.
- Las pantallas Prisma consumen commands, queries, selectors y read models ya existentes.
- Ninguna fórmula financiera nueva aparece en React/UI.
- Ninguna funcionalidad existente desaparece por razones estéticas.
- Sonidos y animaciones de GlitchBudget se conservan.
- Los gráficos se conservan; pueden rediseñarse o recolocarse, pero no eliminarse por defecto.
- El estilo Neón se conserva como variante oscura.
- El modo claro limpio/comercial adopta el lenguaje visual Prisma.
- `GlitchBudgetDB`, versiones Dexie, formato de backup y otros identificadores persistentes no se renombran solo por branding.

## Temas finales

La fase construye un único sistema visual con dos expresiones.

### Modo Prisma

- claro;
- limpio;
- espacioso;
- comercial;
- jerarquía visual fuerte;
- menos texto explicativo redundante;
- superficies y tarjetas sobrias;
- gráficos integrados como herramientas de análisis.

### Modo Neón

- oscuro;
- conserva la personalidad luminosa actual;
- mismos datos, commands, navegación y funciones;
- contraste y efectos adaptados al dark mode;
- no constituye una segunda aplicación ni una bifurcación funcional.

Ambos modos deben consumir exactamente el mismo motor y las mismas métricas.

# Ejecución en 7 etapas

## 20.1 — Contrato visual + inventario de paridad

Antes de cambiar componentes:

- congelar la referencia visual Prisma;
- inventariar todas las superficies actuales de GlitchBudget;
- crear una matriz `actual → destino Prisma`;
- identificar sonidos, animaciones, gráficos y microinteracciones que deben preservarse;
- identificar texto explicativo redundante que puede reducirse sin perder información necesaria;
- identificar componentes puramente visuales de Prisma que pueden recrearse o portarse sin arrastrar lógica;
- registrar explícitamente qué código del repositorio Prisma está prohibido incorporar: `domain/**`, `application/**`, `persistence/**`, `server/**`, cálculos financieros de `Home.tsx` y datos financieros hardcoded.

Entregable principal:

```text
Visual parity matrix
+ component mapping
+ protected functionality inventory
```

**Gate 20.1:** ninguna superficie funcional queda sin destino y ninguna capacidad existente queda marcada para eliminación implícita.

## 20.2 — Design system, temas y shell

Construir la base visual común antes de migrar pantallas:

- tokens de color;
- tipografía;
- spacing;
- radios;
- sombras;
- bordes;
- estados de foco/hover/disabled;
- densidad de cards;
- iconografía;
- sidebar escritorio;
- navegación móvil;
- header;
- FAB / acción global de movimiento;
- Modo Prisma claro;
- Modo Neón oscuro.

Preservar:

- hide amounts;
- reduced-motion/accessibility behavior;
- sonidos existentes;
- microanimaciones;
- App Lock y overlays de seguridad;
- navegación principal Resumen / Movimientos / Plan / Reportes.

**Gate 20.2:** el shell puede cambiar de tema sin cambiar datos ni comportamiento financiero.

## 20.3 — Resumen / Home Prisma

Usar Resumen como primera pantalla real sobre el nuevo sistema visual.

Debe consumir los read models existentes; no reconstruir métricas.

Conservar como mínimo:

- posición financiera;
- presupuesto;
- próximos movimientos;
- metas;
- inversiones;
- señales de atención;
- navegación contextual;
- personalización de Home existente.

Los gráficos que tengan sentido en Home pueden mantenerse o recolocarse, pero cualquier eliminación requiere una decisión explícita documentada.

**Gate 20.3:** Home tiene apariencia Prisma, paridad funcional con la versión anterior y cero fórmulas financieras nuevas en UI.

## 20.4 — Movimientos + compositor global

Migrar:

- historial de movimientos;
- búsqueda;
- filtros;
- saved filters;
- metadata;
- cuentas/tarjetas como gestión secundaria;
- Quick Add;
- templates;
- Rules;
- compositor global de gasto / ingreso / transferencia;
- diálogos y estados de confirmación.

Preservar:

- sonidos de ingreso/gasto;
- animaciones de guardado/feedback;
- budget warning;
- reglas de crédito;
- validación canónica en services;
- transaction automation.

**Gate 20.4:** cualquier movimiento creado desde la nueva UI sigue la misma ruta command/service/domain/persistence existente.

## 20.5 — Plan Prisma

Migrar visualmente:

- Presupuestos;
- Metas;
- Planificados;
- controles de período;
- contribuciones;
- recurrencias;
- estados pending/confirmed/skipped/overdue;
- gestión asociada.

La UI no calcula remaining, status, required contribution, overdue ni otras semánticas canónicas.

**Gate 20.5:** Plan conserva paridad completa y consume exclusivamente read models/selectors existentes.

## 20.6 — Reportes + sistema de gráficos

Rediseñar Reportes conservando toda la capacidad analítica.

Como mínimo conservar:

- Spending;
- Cash Flow;
- Net Worth;
- comparación de períodos;
- distribución por categoría;
- naturaleza de gasto;
- rangos 7D / 30D / 3M / 6M / 1Y / Custom;
- gráficos existentes que representen información real.

Regla:

```text
minimalismo ≠ menos información financiera
```

Se permite:

- cambiar tipo o composición visual de un gráfico;
- mejorar legends/tooltips;
- reducir chrome;
- combinar visualizaciones cuando no se pierda lectura.

No se permite:

- reemplazar métricas reales por números hardcoded;
- eliminar análisis solo porque la referencia Prisma original no lo incluya;
- recalcular métricas dentro del componente gráfico.

**Gate 20.6:** todas las métricas/gráficos provienen de selectors/read models canónicos y existe paridad analítica con GlitchBudget previo.

## 20.7 — Superficies secundarias + branding Prisma + gate final

Completar el rediseño de:

- cuentas;
- tarjetas/deuda;
- inversiones;
- categorías;
- Ajustes;
- seguridad;
- backup/restore;
- logros;
- dialogs/utilidades restantes;
- estados vacíos/error/loading;
- mobile/detail views.

Luego ejecutar el cambio de branding visible:

```text
GlitchBudget → Prisma
```

Cambiar donde sea seguro:

- nombre visible;
- logo;
- títulos;
- metadata;
- PWA labels;
- documentación de producto;
- copy visible.

No renombrar por branding, salvo migración explícita y probada:

- `GlitchBudgetDB`;
- claves de localStorage;
- IDs persistentes;
- nombres internos cuyo cambio pueda crear una nueva base o perder preferencias;
- versiones/formato de backup.

Realizar un barrido final de residuos del look anterior y de datos/demo del repositorio Prisma.

**Gate 20.7 — Prisma Visual/Branding Gate:**

```text
Prisma = producto visible
GlitchBudget Engine = único motor financiero
Modo Prisma = tema claro principal
Modo Neón = tema oscuro principal
```

Además debe demostrarse:

- paridad funcional completa;
- sonidos conservados;
- animaciones conservadas;
- gráficos conservados/rediseñados;
- cero cálculos financieros nuevos en UI;
- cero Dexie directo en UI;
- backup y migraciones intactos;
- funcionamiento offline intacto;
- cero tráfico financiero de red;
- mobile + desktop revisados;
- ningún dato hardcoded de la maqueta Prisma presentado como información real.

## Estrategia de implementación

Fase 20 **no** es un rewrite y no debe ejecutarse como un cambio masivo.

Cada etapa sigue:

```text
old GlitchBudget surface
→ replace visual layer
→ connect existing read models/commands
→ verify parity
→ Quality checks
→ continue
```

No borrar una superficie antigua hasta que su reemplazo haya demostrado paridad.

## Definition of Done por etapa

Cada etapa requiere:

```text
npm run check
npm run build
npm run test:e2e
```

y debe reportar:

1. superficies migradas;
2. componentes visuales añadidos/reemplazados;
3. funcionalidad preservada;
4. gráficos/sonidos/animaciones afectados;
5. cambios de schema: normalmente ninguno;
6. cambios de backup: normalmente ninguno;
7. riesgos o excepciones descubiertos;
8. verificación móvil/escritorio cuando corresponda.

## Persistencia prevista

Fase 20 no requiere cambios financieros de persistencia.

Baseline al iniciar:

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

Cualquier necesidad de cambiar schema durante una etapa visual se considera una señal de alerta y debe detener la implementación para revisión.

## Resultado esperado

Al completar 20.7:

- el producto visible se llama **Prisma**;
- el usuario ve una interfaz más limpia, pulida y comercial;
- Modo Neón conserva la personalidad oscura;
- sonidos y animaciones siguen formando parte de la experiencia;
- los gráficos siguen presentes y mejor integrados;
- el motor financiero sigue siendo exactamente el núcleo GlitchBudget endurecido hasta 19.5;
- el repositorio Prisma original permanece como referencia histórica de diseño, no como segunda fuente técnica.
