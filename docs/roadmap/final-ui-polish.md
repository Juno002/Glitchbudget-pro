# Final UI Polish — Plan ejecutable y contrato de alcance

**Estado:** EN EJECUCIÓN · P3 Gate aprobado · PR #117 · pendiente de revisión e integración
**Fecha de autorización:** 4 de octubre de 2026  
**Repositorio:** `Juno002/Glitchbudget-pro`  
**Secuencia obligatoria:** `P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7`  
**Naturaleza:** pulido final de UI/jerarquía editorial sobre Prisma visible; no reabre el roadmap funcional.

## 1. Autoridad de este documento

Este documento es la especificación ejecutable y fuente de verdad para **Final UI Polish**. Su autorización queda registrada también en `Roadmap septiembre 2026.txt` para no contradecir la regla canónica de autoridad del repositorio.

Reglas de precedencia:

1. `Roadmap septiembre 2026.txt` sigue siendo la fuente de verdad funcional general.
2. Para el alcance específico de Final UI Polish, este archivo define la secuencia, límites, entregables y gates.
3. Si este documento parece pedir algo que contradice una invariante financiera, seguridad, privacidad, backup, persistencia o migración ya cerrada, **gana la invariante existente y se detiene la ejecución**.
4. Ningún chat, memoria, comentario de PR, rama, README, Manus, Codex ni otra IA puede ampliar P0–P7 por interpretación.
5. No existe P8, 20.11 ni Fase 21 salvo modificación explícita del roadmap canónico y de este documento con aprobación del usuario.

## 2. Objetivo de producto

Final UI Polish debe convertir la presentación actual de Prisma en una experiencia de lectura financiera más editorial y jerárquica sin sustituir ni reinterpretar el motor real de GlitchBudget.

La pantalla de Reportes debe responder en este orden:

1. **Entender en 5 segundos:** qué cambió y qué merece atención.
2. **Entender en 30 segundos:** gasto, tendencia, distribución y comparación.
3. **Auditar cuando se quiera:** cash flow, patrimonio, tablas exactas y movimientos.

La fórmula de diseño es:

```text
conclusión → contexto visual → evidencia → detalle
```

El objetivo NO es añadir más información. El objetivo es mejorar prioridad, composición, microcopy y lectura progresiva de información que ya es real.

## 3. Principio arquitectónico no negociable

```text
Prisma = cara, composición, lenguaje visual y microcopy
GlitchBudget Engine = única fuente financiera
```

La UI puede **presentar** métricas; no puede reconstruirlas.

Está prohibido introducir en componentes React:

- sumas o `reduce()` destinados a reconstruir métricas financieras;
- filtros de ingresos, gastos, pagos o transferencias para recalcular resultados canónicos;
- nuevas definiciones de liquidez, patrimonio, gasto, cash flow, presupuesto o deuda;
- acceso directo a Dexie/IndexedDB para producir Reportes;
- inferencias de causas no presentes en los datos;
- números de demostración o placeholders tratados como valores reales.

`selectReportsSnapshot()` continúa siendo la fuente canónica de Reportes. Los selectores puros nuevos autorizados en P3 y las proyecciones de presentación autorizadas en P1/P4 deben consumir datos canónicos; no pueden crear una contabilidad paralela.

## 4. Fuera de alcance global

Final UI Polish NO autoriza:

- cambios de schema Dexie;
- migraciones;
- bump de versión de backup;
- cambios de envelope cifrado;
- cambios de ledger o invariantes financieras, excepto la lectura pura adicional explícitamente descrita en P3;
- cambios en deuda, préstamos, pagos, currency semantics o account semantics;
- cambios a la navegación primaria de cuatro áreas: Resumen, Movimientos, Plan y Reportes;
- nuevas pestañas principales;
- perfiles de usuario, nombres ficticios o cuentas de usuario;
- IA local o remota para generar insights;
- telemetría, analytics o red;
- copiar la arquitectura monolítica de `Prisma/client/src/pages/Home.tsx`;
- copiar datos mock del repositorio Prisma de Manus;
- ocultar tablas exactas detrás de accordions, botones “Ver tabla” o disclosure equivalente;
- convertir una dirección matemática en juicio moral mediante color.

## 5. Referencia Prisma de Manus

El repositorio Prisma de Manus se usa únicamente como **referencia de composición visual**.

Se autoriza extraer:

- jerarquía editorial;
- ritmo visual;
- uso de eyebrow + titular + dato;
- hero de gasto;
- lectura rápida protagonista;
- composición donut + leyenda;
- apertura editorial de Home;
- densidad y relaciones entre superficies.

No se autoriza extraer:

- porcentajes hardcoded;
- arrays de presupuestos o transacciones demo;
- cifras como `RD$ 30,000`, `6.8%`, `RD$ 28,400` o equivalentes;
- nombres de usuario ficticios;
- comportamiento placeholder;
- cálculos o estado incrustados dentro de una página monolítica.

## 6. Contratos visuales y de accesibilidad globales

Cada P que toque UI debe cerrar por sí misma los siguientes puntos antes de merge:

- viewport de 320 px sin overflow horizontal;
- 360/390 px correctos;
- escritorio correcto;
- tema Prisma claro correcto;
- tema Neón oscuro correcto;
- Minimalista legado sin regresión funcional, sin obligación de paridad premium;
- focus visible por teclado;
- touch targets compatibles con el sistema actual;
- `prefers-reduced-motion` respetado;
- estados loading/empty/disabled coherentes;
- ocultación de importes sin fugas en texto visible, tooltips, SVG, labels accesibles ni `aria-label`;
- información obligatoria no dependiente exclusivamente del color.

No se aplazan estos controles a P7.

## 7. Regla de color

Las direcciones matemáticas no se colorean como éxito/fracaso por defecto.

Por tanto:

- gasto que baja: dirección neutral + flecha + texto;
- gasto que sube: dirección neutral + flecha + texto;
- cash flow que sube/baja: neutral salvo que exista un estado semántico independiente;
- patrimonio que sube/baja: neutral como comparación.

Coral/ámbar/destructive se reservan para estados con semántica real de atención ya definida, por ejemplo:

- presupuesto excedido;
- presupuesto en alerta;
- ocurrencias vencidas;
- integridad de datos;
- acciones destructivas.

Mint/success se reserva para estados explícitamente definidos como éxito por contrato, no por simple dirección numérica.

## 8. Secuencia y estado

| Punto | Entregable | Cambios de dominio | Estado inicial |
|---|---|---:|---|
| P0 | Baseline + contratos de caracterización | No | Gate aprobado · PR #109 |
| P1 | Lectura rápida editorial | No financiero | Gate aprobado · PR #111 |
| P2 | Hero de gasto sin tendencia | No | Gate aprobado · PR #115; correcciones Gate aprobado · PR #116 |
| P3 | Tendencia histórica real + integración en hero | Sí, selector puro de lectura | Gate aprobado · PR #117 |
| P4 | Donut + leyenda + agrupación determinista | Proyección pura de presentación | No iniciado |
| P5 | Comparación y análisis profundo | No | No iniciado |
| P6 | Transplante Prisma a Home | Selector puro de estado | No iniciado |
| P7 | Regresión global e integración | No | No iniciado |

No se permite trabajo paralelo entre puntos. P(n+1) empieza únicamente después de que P(n) esté mergeada en `main` con su gate aprobado.

Cada punto usa una rama y PR atómicos propios. No agrupar dos puntos en un mismo PR.

---

# P0 — Baseline y contratos

## Objetivo

Fijar el comportamiento y geometría actuales antes de cualquier cambio visual. P0 no rediseña Reportes ni Home.

## Entregables obligatorios

1. Confirmar que `selectReportsSnapshot()` sigue siendo la fuente de verdad.
2. Caracterizar el orden editorial protegido actualmente:
   - quick-read;
   - spending;
   - comparison;
   - spending-breakdown;
   - cash-flow;
   - net-worth;
   - detail.
3. Confirmar que las tablas exactas siguen visibles.
4. Confirmar todos los presets: `7d`, `30d`, `3m`, `6m`, `1y`, `custom`.
5. Registrar baseline visual de Reportes en:
   - 320 px;
   - 390 px;
   - desktop;
   - Prisma;
   - Neón.
6. Registrar baseline de importes ocultos.
7. Ejecutar y registrar el benchmark de ledger existente.

## Archivos que P0 puede tocar

- tests de caracterización de Final UI Polish;
- documentación de Final UI Polish;
- scripts de captura/verificación si son estrictamente necesarios y no cambian producto.

P0 no toca `reports-tab.tsx`, `summary-tab.tsx`, dominio financiero ni persistencia.

## Gate P0

```text
npm run check
npm run build
npm run test:e2e
npm run benchmark:ledger
```

Además, los tests deben confirmar que React no introduce cálculos financieros nuevos.

## Stop conditions

Detener P0 si el baseline ya está rojo por una regresión no relacionada. Final UI Polish no debe ocultar ni absorber un bug preexistente.

---

# P1 — Lectura rápida editorial

## Objetivo

Transformar la Quick Read existente en una lectura editorial protagonista sin cambiar su ranking ni sus thresholds canónicos.

El selector existente `selectReportQuickRead()` sigue decidiendo **qué insight importa**. P1 solo decide **cómo expresarlo**.

## Arquitectura autorizada

Crear una capa pura de presentación, preferentemente:

```text
src/lib/report-editorial.ts
```

Esta capa NO puede:

- importar React;
- importar Dexie/db;
- leer reloj;
- usar red;
- usar `Math.random()`;
- formatear dinero;
- inferir causas.

Debe devolver parámetros estructurados y claves/tipo de mensaje. Los importes permanecen como números canónicos.

React debe formatear todo importe mediante `usePrivateCurrency()`.

## Privacidad

Está prohibido devolver desde `report-editorial.ts` una frase que ya contenga `RD$`, `$`, moneda o importe textual.

La UI debe construir el texto final de forma que cuando “Ocultar importes” esté activo:

- no aparezca el importe en pantalla;
- no aparezca en tooltip;
- no aparezca en texto SVG;
- no aparezca en `aria-label`;
- no aparezca en descripción accesible.

Porcentajes no son importes monetarios y pueden permanecer visibles salvo que otra política existente indique lo contrario.

## Copy obligatorio para TODOS los `QuickReadInsightKind`

Se deben cubrir siete tipos:

### `spending_above_previous`

Si `previous > 0` y existe porcentaje:

```text
Gastaste más que en el rango anterior
```

El cuerpo puede mencionar porcentaje y diferencia absoluta, sin atribuir causa.

Si `previous === 0` y `current > 0`:

```text
Hay gasto nuevo en este rango
```

No mostrar porcentaje infinito, “+∞%” ni equivalente.

### `spending_below_previous`

```text
Gastaste menos que en el rango anterior
```

Sin calificarlo automáticamente como bueno.

### `spending_near_previous`

```text
El gasto se mantuvo estable
```

Debe respetar el threshold existente; P1 no lo modifica.

### `cash_flow_change`

Antes del titular general por `direction`, un cruce estricto de signo usa estos hechos observables a partir de los parámetros canónicos `previous` y `current`:

- `previous > 0` y `current < 0` → `El flujo neto pasó de positivo a negativo`;
- `previous < 0` y `current > 0` → `El flujo neto pasó de negativo a positivo`.

Solo en esos dos casos se omite el porcentaje del cuerpo editorial. Los importes actual/anterior siguen pasando por `usePrivateCurrency()` y la tabla exacta conserva su comparación canónica. No se recalcula porcentaje, no se modifica `direction`, ranking ni thresholds. Cero no es un cruce estricto: mantiene las reglas existentes de base cero y dirección.

En los demás casos, el titular debe derivarse de `direction`:

- increase → `El flujo neto aumentó`;
- decrease → `El flujo neto disminuyó`;
- stable → `El flujo neto se mantuvo estable`;
- new → `Hay un nuevo flujo neto comparable`.

No usar “mejoró/empeoró” por dirección matemática.

### `net_worth_change`

El titular debe derivarse de `direction`:

- increase → `El patrimonio registrado aumentó`;
- decrease → `El patrimonio registrado disminuyó`;
- stable → `El patrimonio registrado se mantuvo estable`;
- new → `Hay una nueva base de patrimonio registrada`.

No usar “tu situación está mejor/peor”.

### `leading_category`

```text
La categoría con mayor participación en el gasto
```

El titular es válido para todo el rango del threshold canónico, incluido 100%, y no introduce tramos ni thresholds nuevos. El cuerpo muestra nombre, share y, si corresponde, importe mediante formateo de React.

### `no_material_change`

```text
No hay cambios destacados en este rango
```

El cuerpo explica la ausencia de cambios destacados sin exponer terminología del sistema:

```text
Ninguna métrica principal cambió lo suficiente para destacarla.
```

No afirmar que “todo está bien”.

## Composición visual

El insight `report.quickRead[0]` es el protagonista, respetando la prioridad ya calculada. No forzar gasto como titular.

Los insights secundarios, si existen, se muestran con menor peso visual y sin competir con el principal.

No usar tres cards idénticas como tres titulares equivalentes.

Todo importe de la lectura rápida conserva símbolo y número como una unidad indivisible, también a 320 px. Aplicar `white-space: nowrap` al token formateado por `usePrivateCurrency()`; no cambiar formato monetario, locale ni semánticas de currency.

## Archivos previstos

- `src/lib/report-editorial.ts` (nuevo);
- `src/components/dashboard/reports-tab.tsx`;
- tests específicos de Final UI Polish P1;
- E2E solo si hace falta ampliar cobertura de privacidad/responsive.

No tocar `src/domain/report-insights.ts` salvo que un test demuestre un bug previo; si eso ocurre, DETENER y pedir autorización porque P1 no autoriza cambiar ranking/thresholds.

## Gate P1

- siete `kind` cubiertos;
- variante `previous=0` cubierta;
- cruces estrictos de signo en ambas direcciones, sin porcentaje editorial y con tabla exacta intacta;
- categoría con copy válido de 35% a 100%, sin tramos nuevos;
- símbolo e importe indivisibles a 320 px;
- importes ocultos sin fuga;
- 320/390/desktop;
- Prisma/Neón;
- teclado/reduced motion;
- `npm run check`;
- `npm run build`;
- `npm run test:e2e`.

---

# P2 — Hero de gasto sin tendencia

## Objetivo

Reconstruir la cabecera analítica de gasto para comunicar el rango actual con menos cajas y más jerarquía, SIN gráfico histórico todavía.

## Datos permitidos

El hero solo consume datos ya canónicos de `report.spending` y `report.comparison.spending`:

- `total`;
- `previousTotal` o comparación equivalente;
- `percentChange`;
- `transactionCount`;
- etiquetas del rango actual/comparable.

No recalcular ninguno dentro del componente.

## Composición obligatoria

Desktop y mobile deben comunicar:

```text
GASTO DEL RANGO
[importe principal]
[flecha/signo] [variación] frente al rango comparable
[número] movimiento / movimientos
```

Cuando `previousTotal === 0`, la variación presenta exactamente **«Sin gasto anterior con el que comparar»**, sin porcentaje, flecha ni sufijo adicional. Esta decisión de presentación incluye el rango vacío (actual y anterior en cero): conserva el `percentChange` canónico y la tabla de comparación sin alterarlos. Con base anterior distinta de cero se presenta el porcentaje canónico con signo y flecha neutral; cero conserva **«Sin cambio»**. Autorización explícita en la revisión del usuario del 4 de octubre de 2026.

El total y el importe comparable se formatean en React mediante `usePrivateCurrency()` y permanecen indivisibles (`white-space: nowrap`). No se incorporan importes visibles ni preformateados a `aria-label` ni a descripciones accesibles.

Correcciones de presentación autorizadas en la revisión de P2 del 4 de octubre de 2026: `transactionCount === 1` presenta **«1 movimiento»**; cualquier otro conteo conserva **«N movimientos»**. El importe comparable visible hereda la fuente del texto, sin `font-mono`. Ambos importes ocultos del hero conservan los seis glifos **`••••••`** devueltos por el hook y heredan la fuente del texto con el mismo tamaño `text-base` y tracking normal; el total visible conserva su jerarquía protagonista. No se cambia el hook global ni otras superficies. Esta revisión se cierra antes de iniciar P3; no modifica su contrato de historia desconocida/cero real.

P2 NO crea:

- sparkline;
- barras históricas;
- hueco vacío reservado para P3;
- props de tendencia no usadas;
- placeholder de chart;
- datos ficticios.

P3 añadirá el gráfico sobre una composición P2 ya terminada.

## Color

La variación usa presentación neutral. Flecha + signo + texto comunican dirección.

No usar mint solo porque el gasto bajó ni coral solo porque subió.

## Densidad

Las minicards “Período comparable / Tendencia / Transacciones” pueden convertirse en información secundaria integrada dentro del hero. El resultado debe tener menos fragmentación visual que la implementación anterior.

## Archivos previstos

- `src/components/dashboard/reports-tab.tsx`;
- primitives existentes solo si el cambio puede reutilizarse sin afectar otras superficies;
- tests P2.

## Gate P2

- valores exactamente iguales antes/después;
- sin gráfico ni placeholder;
- privacidad monetaria;
- 320/390/desktop;
- Prisma/Neón;
- `npm run check`;
- `npm run build`;
- `npm run test:e2e`.

---

# P3 — Tendencia histórica real

## Objetivo

Añadir al hero de P2 una evolución temporal REAL de gasto basada exclusivamente en ventanas comparables canónicas.

P3 es la única intervención de Final UI Polish que autoriza un selector nuevo de lectura de datos financieros. No autoriza cambiar semántica de gasto.

## Contrato temporal obligatorio

`resolveReportRange()` ya define los rangos actuales:

- `7d`: 7 días anclados en la fecha financiera actual;
- `30d`: 30 días anclados;
- `3m`, `6m`, `1y`: rango anclado mediante desplazamiento de meses;
- `custom`: rango explícito válido.

La comparación canónica usa `previousComparableRange(range)`, que retrocede por **igual cantidad de días**.

Por tanto, la tendencia se construye iterando:

```text
window[actual] = rango resuelto
window[-1] = previousComparableRange(window[actual])
window[-2] = previousComparableRange(window[-1])
...
```

Está prohibido reinterpretar `3m/6m/1y` como meses calendario cerrados para el histórico.

## Número objetivo de ventanas

Antes de aplicar cobertura histórica:

| Preset | Máximo de ventanas visibles incluyendo actual |
|---|---:|
| `7d` | 6 |
| `30d` | 6 |
| `3m` | 4 |
| `6m` | 4 |
| `1y` | 3 |
| `custom` | hasta 6 ventanas de igual duración |

No aumentar estos máximos sin modificar este documento.

## Inicio de historia y cobertura

No usar `Account.startDate` como corte global del gráfico de gasto.

Razón contractual: Reportes conserva movimientos históricos reportables incluso cuando no estén asociados a una cuenta actual; PR #104 no autoriza borrar ese historial.

P3 NO implementa una noción general y abstracta de `reportHistoryStart`. Para este alcance se define únicamente:

```text
spendingHistoryStart = fecha canónica del primer gasto reportable disponible
```

No se calculan todavía fechas equivalentes para ingresos, pagos, transferencias o patrimonio. Si una futura intervención necesita tendencia de otra métrica, deberá definir su propia cobertura y obtener autorización explícita; no se anticipa esa implementación en P3.

Cada punto/ventana debe declarar:

```ts
coverage: "full" | "partial"
```

Reglas:

- ventana totalmente anterior a `spendingHistoryStart` → no se muestra;
- ventana que cruza `spendingHistoryStart` → `partial`;
- ventana completamente posterior o igual a `spendingHistoryStart` → `full`;
- una ventana `partial` debe tener indicación accesible “Historial parcial”;
- ausencia de historia no debe representarse como cero histórico ficticio.

### Decisión explícita sobre ceros anteriores al primer gasto

Antes de `spendingHistoryStart` el producto **no distingue** entre “el usuario realmente gastó cero” y “todavía no existe historial suficiente en la app”. Por decisión de producto, esas ventanas se tratan como **historia desconocida/no observada** y se ocultan; no se muestran como cero.

Después de `spendingHistoryStart`, una ventana con cobertura `full` y sin gastos registrados sí representa un cero válido y puede mostrarse como tal.

Esta decisión evita inventar historia financiera positiva o negativa donde la app no puede demostrar que exista.

## Selector autorizado

Crear un selector puro equivalente a:

```text
selectSpendingTrend(input, range, maxWindows)
```

Debe devolver como mínimo:

- rango de cada ventana;
- total de gasto;
- cobertura full/partial;
- indicador de ventana actual;
- orden cronológico estable.

No debe depender de React, Dexie, browser, red, reloj ni locale.

## Rendimiento y benchmark

P3 debe ampliar la medición; `benchmark-ledger.mjs` por sí solo no mide la nueva tendencia.

### Contrato algorítmico

La implementación de tendencia debe construir primero las ventanas comparables y después agregar el gasto con **una sola pasada lógica sobre los gastos canónicos, o una estrategia de complejidad equivalente O(N + W)**, donde N es el número de gastos y W el número de ventanas.

Está prohibido implementar la tendencia llamando una vez a `selectSpendingReport()` por ventana o realizando W escaneos completos independientes sobre el mismo conjunto de gastos. Con hasta seis ventanas, ese enfoque sería deliberadamente multiplicativo y no se considera una implementación válida aunque pase en datasets pequeños.

Cada gasto canónico debe asignarse como máximo a una ventana de la serie, porque las ventanas derivadas sucesivamente de `previousComparableRange()` son contiguas y no se superponen.

Procedimiento obligatorio:

1. ejecutar benchmark de ledger existente y registrar baseline;
2. añadir un benchmark reproducible de Reportes/tendencia con datasets 1k, 10k y 50k;
3. medir una lectura de reporte de una ventana y la tendencia con el máximo de ventanas correspondiente;
4. usar la misma generación de dataset y mismas muestras para comparar resultados.

Regla de seguridad adicional:

```text
si la mediana de tendencia 50k > 2 × mediana de una lectura equivalente de Reportes 50k
→ no mergear;
→ revisar la implementación o la agregación hasta mantener exactamente el mismo resultado con coste acotado.
```

La regla 2× es un **gate de rendimiento**, no el mecanismo que decide si se usa agregación eficiente: la agregación eficiente ya es obligatoria por contrato.

Además, el benchmark de ledger existente no puede empeorar simultáneamente más de 20% y más de 5 ms de mediana frente al baseline P0 en el mismo entorno.

No cambiar estas reglas desde el PR para “hacer pasar” el gate.

## Integración visual

P3 añade el gráfico al hero P2.

La ventana actual se destaca. Las anteriores son secundarias.

Tooltips y labels monetarios pasan por `usePrivateCurrency()`.

Con importes ocultos, el chart no filtra dinero en tooltip/ARIA.

## Archivos previstos

- `src/domain/reports.ts` o módulo puro específico de reports;
- `src/components/dashboard/charts/report-charts.tsx`;
- `src/components/dashboard/reports-tab.tsx`;
- script de benchmark de reports/tendencia;
- tests P3.

Si P3 exige schema, migración o nueva persistencia: DETENER. Eso está fuera de alcance.

## Gate P3

- semántica de ventanas testeada en bordes de mes/año y leap year;
- `custom` testeado;
- full/partial testeado;
- historial sin cuenta no descartado;
- no ceros ficticios;
- benchmark reportado;
- regla 2× satisfecha o implementación optimizada;
- ledger benchmark sin regresión material según regla;
- privacidad;
- 320/390/desktop;
- Prisma/Neón;
- `npm run check`;
- `npm run build`;
- `npm run test:e2e`.

---

# P4 — Distribución por categoría: donut + leyenda determinista

## Objetivo

Convertir la distribución por categoría en una unidad visual Prisma: donut + total + leyenda controlada, sin alterar el desglose exacto.

## Proyección pura obligatoria

La agrupación visual no puede vivir dentro de `ReportCategoryDonut` ni dentro de JSX.

Crear una función pura, preferentemente en:

```text
src/lib/report-visualization.ts
```

responsable de:

- orden estable;
- top N visible;
- agregado visual `Otros` cuando corresponda;
- valores exactos;
- shares;
- redondeo de leyenda.

La tabla/desglose detallado conserva TODAS las categorías originales. `Otros` es solo una proyección visual.

## Regla de agrupación

Mostrar como segmentos individuales las primeras 4 categorías por valor. Si existen más de 4, todas las restantes se agrupan en `Otros`.

Excepción: si hay 4 o menos categorías con valor positivo, no crear `Otros`.

Categorías con valor 0 no generan segmento visual.

El valor de `Otros` debe ser exactamente la suma de los valores agrupados.

## Porcentajes

La leyenda debe sumar exactamente **100.0%** cuando el total sea mayor que cero.

Usar redondeo por mayor resto a una decimal:

1. convertir cada share exacto a décimas de porcentaje;
2. tomar suelo entero de cada cantidad de décimas;
3. calcular cuántas décimas faltan hasta 1000;
4. asignarlas una por una según resto fraccional descendente;
5. desempatar por orden canónico estable.

No usar `toFixed(1)` de forma independiente para cada fila si el total resultante no suma 100.0.

Para total 0 no renderizar un donut falso; usar estado vacío.

## Leyenda

La leyenda principal la controla Prisma, no la leyenda automática de Recharts.

Debe poder mostrar:

- nombre;
- porcentaje;
- importe si los balances están visibles;
- indicador de color;
- truncado/ajuste accesible.

## Tests obligatorios

- 0 categorías;
- 1 categoría;
- 2–4 categorías;
- más de 4;
- empates;
- restos iguales;
- categoría dominante extrema;
- suma 100.0%;
- `Otros` exacto;
- privacidad monetaria.

## Gate P4

- detalle exacto intacto;
- donut/leyenda consistente;
- 320/390/desktop;
- Prisma/Neón;
- ocultación de importes;
- `npm run check`;
- `npm run build`;
- `npm run test:e2e`.

---

# P5 — Comparación y análisis profundo

## Objetivo

Completar la jerarquía de Reportes sin añadir nuevas métricas ni esconder evidencia.

## Orden contractual

Debe conservarse exactamente la secuencia protegida:

```text
quick-read
→ spending
→ comparison
→ spending-breakdown
→ cash-flow
→ net-worth
→ detail
```

El seguimiento de presupuesto puede permanecer como follow-up secundario después del detalle según el contrato actual.

## Comparación

Primero visualización “Actual vs. anterior”.

Inmediatamente después permanece la tabla exacta con:

- Métrica;
- rango anterior;
- rango actual;
- cambio.

No se permite botón “Ver tabla”.
No se permite accordion para ocultar esta evidencia.

## Spending breakdown

Categorías mantiene prioridad visual sobre naturaleza.

La naturaleza conserva:

- Fijo;
- Variable;
- Ocasional.

No cambiar la semántica de `Expense.nature`.

## Cash flow

Preservar exactamente:

- Ingresos;
- Gastos en efectivo;
- Pagos de deuda;
- Flujo neto.

## Patrimonio

Preservar exactamente:

- Efectivo;
- Bancos;
- Inversiones;
- Pasivos;
- Patrimonio neto.

La explicación existente de que crédito disponible no es activo debe seguir accesible.

## Detalle

`Movimientos de mayor importe` permanece visible y después de patrimonio.

P5 no sustituye filas exactas por narrativa.

## Densidad

P5 debe reducir fragmentación visual donde sea posible, pero no a costa de esconder información obligatoria.

No crear un PR posterior de “densidad general”; este trabajo se cierra aquí para Reportes.

## Gate P5

- orden contractual testado;
- tablas visibles;
- mismos importes antes/después;
- privacidad;
- 320/390/desktop;
- Prisma/Neón;
- teclado/reduced motion;
- `npm run check`;
- `npm run build`;
- `npm run test:e2e`.

Al terminar P5, **Reportes debe considerarse cerrado** dentro de Final UI Polish.

---

# P6 — Home / Resumen: apertura editorial y estado determinista

## Objetivo

Trasplantar dos decisiones del Prisma de Manus a Home sin perfiles ficticios ni conclusiones vagas:

1. apertura editorial;
2. status pill determinista.

P6 no empieza hasta que P5 esté mergeada.

## Apertura editorial

La cabecera debe comunicar:

```text
Tu panorama financiero.
[fecha financiera] · período [inicio] – [fin]
```

No usar nombres ficticios como “Alex Rivera”.

La fecha debe derivarse del reloj financiero local ya existente. El período debe venir del Period Engine actual.

## Estado actual que P6 debe reconciliar

Antes de P6, Resumen tiene dos avisos globales separados:

1. `home.attentionCount > 0` → badge “N elementos requieren atención”;
2. `quarantinedDebtPayments.length > 0` → badge específico de pagos inválidos.

Además, `selectHomeReadModel()` calcula hoy `attentionCount` como la suma de:

- movimientos planificados vencidos;
- presupuestos excedidos;
- metas activas con fecha límite vencida;
- inversiones activas cuyo vencimiento ya fue alcanzado.

El estado de presupuesto `alert` no forma parte de `attentionCount`, pero sí es una condición visible de atención dentro del módulo de presupuesto.

## Decisión de composición global

P6 **reemplaza los dos badges globales actuales por un único status pill editorial** en la cabecera de Resumen.

No deben convivir en la parte superior:

- el nuevo pill;
- “N elementos requieren atención”;
- el badge global de pagos inválidos.

Eso produciría mensajes duplicados.

Los badges y estados **dentro de cada módulo** sí permanecen como evidencia contextual. Ejemplos: estado del presupuesto, inversión vencida dentro de Inversiones, ocurrencias vencidas dentro de Próximos movimientos. La jerarquía será:

```text
pill global = conclusión priorizada
módulos = evidencia y detalle
```

P6 puede conservar `attentionCount` en el read model por compatibilidad o tests, pero no debe usarlo como único origen semántico del pill porque no incluye presupuesto en alerta ni pagos cuarentenados.

## Selector de atención

Crear un selector puro equivalente a:

```text
selectHomeAttentionState(...)
```

No construir prioridades mediante condicionales dispersos en JSX.

El selector debe cubrir explícitamente **todos los contribuyentes que hoy pueden producir atención global**, más el estado de presupuesto en alerta.

## Prioridad EXACTA

La primera condición activa gana:

1. **integridad de datos / pagos cuarentenados**;
2. **movimientos planificados vencidos**;
3. **presupuesto excedido**;
4. **metas vencidas**;
5. **inversiones vencidas o maduras pendientes de revisión**;
6. **presupuesto en alerta/cerca del límite**;
7. **neutral**.

No reordenar prioridades sin modificar este documento.

## Copy autorizado

### Integridad

```text
Revisa datos preservados
```

Se activa solo cuando la fuente actual de integridad del producto indique pagos/datos cuarentenados o preservados que requieran atención. No inventar una nueva noción de integridad.

### Movimientos planificados vencidos

```text
Hay movimientos planificados vencidos
```

Debe reutilizar la semántica existente de agrupación/estado de planned occurrences; no una comparación de fecha nueva dispersa en JSX.

### Presupuesto excedido

```text
Presupuesto excedido
```

### Metas vencidas

```text
Hay metas con fecha límite vencida
```

Debe derivarse de la misma semántica que ya usa Home para detectar metas activas vencidas.

### Inversiones vencidas

```text
Hay inversiones que requieren revisión
```

Debe derivarse de la misma semántica que ya alimenta `home.investments.maturedCount`.

### Presupuesto en alerta

```text
Presupuesto cerca del límite
```

### Neutral

```text
Sin alertas destacadas
```

Neutral solo es válido cuando:

- no hay pagos/datos cuarentenados relevantes;
- no hay movimientos planificados vencidos;
- no hay presupuestos excedidos;
- no hay metas vencidas;
- no hay inversiones vencidas/maduras pendientes de revisión;
- no hay presupuestos en alerta.

Por tanto, el pill **no puede** mostrar “Sin alertas destacadas” mientras `attentionCount > 0` o mientras exista un badge/estado global equivalente de integridad.

NO significa “tus finanzas están bien” ni “todo está en orden”.

## Color

Integridad/excedido/vencidos pueden usar semántica de atención ya existente.

Neutral no debe parecer una celebración.

## Tests obligatorios

- cada estado individual;
- integridad + cualquier otro estado → gana integridad;
- vencidos + excedido → gana vencidos;
- excedido + meta vencida → gana excedido;
- meta vencida + inversión vencida → gana meta vencida;
- inversión vencida + presupuesto en alerta → gana inversión vencida;
- solo alerta;
- ninguna condición → neutral;
- `attentionCount > 0` nunca produce neutral;
- pagos cuarentenados nunca producen neutral;
- el badge global “N elementos requieren atención” desaparece;
- el badge global separado de pagos inválidos desaparece;
- los estados/badges contextuales dentro de módulos permanecen;
- cambio de período;
- fecha local;
- 320 px;
- importes ocultos sin fuga.

## Archivos previstos

- selector puro nuevo en dominio/read-model apropiado;
- `src/components/dashboard/summary-tab.tsx`;
- tests P6;
- E2E Home si es necesario.

P6 no toca movimientos, Plan, Reportes ni settings salvo componentes compartidos estrictamente necesarios.

## Gate P6

- prioridades deterministas;
- ningún perfil ficticio;
- fecha/período canónicos;
- 320/390/desktop;
- Prisma/Neón;
- privacidad;
- accesibilidad;
- `npm run check`;
- `npm run build`;
- `npm run test:e2e`.

---

# P7 — Gate global de integración

## Objetivo

Detectar regresiones cruzadas entre P1–P6. P7 no es una fase para arreglar deuda visual que debió cerrar una intervención anterior.

## Prohibiciones

P7 no añade features.
P7 no rediseña.
P7 no cambia thresholds.
P7 no cambia el modelo financiero.
P7 no introduce “pequeños extras”.

Si aparece un defecto:

- si es regresión causada por P1–P6 → corregir en P7 con test;
- si es trabajo nuevo no contemplado → registrar y DETENER; no ampliar alcance.

## Flujo manual/E2E mínimo de integración

```text
Resumen
→ Reportes
→ cambiar entre 7d / 30d / 3m / 6m / 1y
→ rango custom válido
→ revisar Lectura rápida
→ revisar hero + tendencia
→ revisar donut + leyenda
→ revisar tabla de comparación
→ revisar cash flow / patrimonio / detalle
→ ocultar importes
→ cambiar Prisma ↔ Neón
→ viewport móvil
→ volver a Resumen
→ verificar apertura editorial y status pill
```

## Gate P7

```text
npm run check
npm run benchmark:ledger
benchmark de Reports/tendencia introducido en P3
npm run build
npm run test:e2e
```

P7 también confirma:

- ningún request financiero remoto;
- ninguna regresión offline;
- ningún cambio de schema/backup;
- ninguna tabla exacta oculta;
- ninguna fuga de importes;
- ninguna cifra mock;
- ningún copy causal no respaldado;
- ninguna nueva pestaña principal.

Cuando P7 cierre, Final UI Polish queda **COMPLETADO / Gate final aprobado**.

---

# 9. Protocolo obligatorio por PR

Cada P0–P7 debe seguir este orden:

1. leer este documento completo;
2. verificar que la P anterior, cuando exista, esté mergeada en `main`;
3. sincronizar contra `main`;
4. crear una rama específica de esa P;
5. implementar solo el alcance autorizado;
6. añadir/actualizar tests de esa P;
7. ejecutar su gate propio;
8. revisar diff para detectar scope creep;
9. abrir PR atómico;
10. con el número de PR ya disponible, actualizar en la misma rama el registro de ejecución de esa P con `Gate aprobado · PR #N`, tests relevantes y benchmark si aplica;
11. no mergear con checks rojos relevantes;
12. mergear el PR;
13. la P se considera **Completada / Gate aprobado** únicamente cuando GitHub confirme que ese PR está mergeado;
14. solo entonces comenzar la siguiente P.

No se exige escribir el SHA de merge dentro de este documento. El número de PR es el identificador canónico de evidencia y el estado `merged` de ese PR en GitHub es la fuente de verdad de que la intervención quedó integrada. Esto evita un commit documental posterior creado únicamente para registrar un hash que no existe antes del merge.

Convención recomendada de ramas:

```text
final-ui-polish-p0-baseline
final-ui-polish-p1-editorial-quick-read
final-ui-polish-p2-spending-hero
final-ui-polish-p3-spending-trend
final-ui-polish-p4-category-composition
final-ui-polish-p5-reports-depth
final-ui-polish-p6-home-editorial
final-ui-polish-p7-final-gate
```

# 10. Regla de documentación viva

Cada PR P0–P7 debe dejar su propio registro de ejecución **dentro del mismo PR antes del merge** con:

- estado de gate: `Gate aprobado`;
- número de PR;
- tests relevantes;
- benchmark si aplica;
- decisiones cerradas o desviaciones autorizadas.

No registrar el commit de merge como requisito documental. Tras el merge, la combinación `PR #N + estado merged en GitHub` constituye evidencia suficiente y verificable.

Para iniciar la siguiente P, el ejecutor debe comprobar el PR de la intervención anterior en GitHub y confirmar `merged=true`. No basta con que el documento diga `Gate aprobado`.

La tabla/estado del documento puede expresar `Gate aprobado · PR #N`; su condición de completado se deriva del estado real del PR. No crear un commit directo posterior a `main` únicamente para cambiar esa etiqueta o insertar un SHA.

No reescribir retrospectivamente contratos para justificar una implementación distinta.

Si una P necesita cambiar su contrato antes de implementarse:

```text
DETENER
→ documentar por qué el contrato no es viable
→ proponer cambio concreto
→ obtener aprobación explícita
→ modificar este documento
→ modificar el roadmap canónico si cambia alcance/autoridad
→ solo entonces continuar
```

# 11. Definition of Done de Final UI Polish

Final UI Polish solo está terminado cuando:

- P0–P7 están completadas en orden;
- todas las PR están mergeadas;
- Reportes expresa primero conclusión, luego contexto, luego evidencia y detalle;
- Quick Read sigue siendo determinista y local;
- ningún insight inventa causas;
- hero usa datos canónicos;
- tendencia usa ventanas comparables canónicas;
- cobertura histórica distingue full/partial, trata la etapa anterior al primer gasto como historia desconocida y no inventa ceros;
- donut usa composición pura y porcentajes que suman 100.0%;
- tablas exactas permanecen visibles;
- Home no usa perfil ficticio ni “Todo está en orden”;
- status pill reemplaza los avisos globales duplicados, cubre todos los estados actuales de atención y usa prioridad determinista;
- Prisma y Neón mantienen acabado premium;
- 320 px no tiene overflow;
- ocultar importes no filtra dinero;
- ledger benchmark permanece sano;
- benchmark de Reports/tendencia está documentado;
- check/build/E2E final están verdes;
- no hubo cambios de schema, backup ni red.

# 12. Resultado esperado

El producto final debe conservar la arquitectura y exactitud de GlitchBudget Engine, pero presentar la información con la claridad editorial que hizo útil al Prisma de Manus como referencia.

La relación final debe poder resumirse así:

```text
Prisma de Manus = concept car visual
Prisma actual = versión de producción
```

La implementación no busca que ambas aplicaciones sean idénticas. Busca conservar el parentesco visual mientras la versión actual sigue siendo la única que contiene el motor financiero completo, exacto, local y auditable.

# 13. Estado de ejecución

```text
P0 — Gate aprobado · PR #109
P1 — Gate aprobado · PR #111
P2 — Gate aprobado · PR #115; correcciones Gate aprobado · PR #116
P3 — Gate aprobado · PR #117 (pendiente de revisión e integración)
P4 — BLOQUEADO POR P3
P5 — BLOQUEADO POR P4
P6 — BLOQUEADO POR P5
P7 — BLOQUEADO POR P6
```

No cambiar estos estados por anticipación. Solo el gate real de cada punto desbloquea el siguiente.

## Registro P0 — 4 de octubre de 2026

**Gate aprobado · PR #109** — [PR atómico](https://github.com/Juno002/Glitchbudget-pro/pull/109). La integración se considera completada únicamente al confirmar `merged=true` en GitHub. P1 no se ejecutó en esta intervención.

- `npm run check`: aprobado, 733/733 tests. `tests/final-ui-polish-p0.test.ts` caracteriza el facade canónico, ausencia de cálculos/persistencia en React, orden protegido, cuatro tablas y rangos anclados de todos los presets.
- `npm run build`: aprobado; output estático y guard CSP/local-only aprobados.
- `npm run test:e2e`: aprobado; seis presets, custom válido, cuatro tablas con filas visibles, matriz 320/390/1280 px × Prisma/Neón × importes visibles/ocultos. Incluye tooltip real y árbol accesible sin fugas; smoke existente de interacción, mutaciones, navegación y offline aprobado.
- `npm run benchmark:ledger`: aprobado, script existente sin cambios. **Entorno: executor cloud adjunto (no GitHub Actions), Node v24.19.0, Linux x64**; identificado en `final-ui-polish-p0-baseline/ledger-benchmark.json`. Medianas posición/historiales: 1k **1.208/0.712 ms**, 10k **7.789/9.350 ms**, 50k **42.626/40.288 ms**. Medición aislada del resto de gates; ocho cuentas, siete muestras tras calentamiento; sin thresholds nuevos.
- [Baseline reproducible, doce capturas, geometría y muestras completas](final-ui-polish-p0-baseline/README.md). Capturas sobre transacciones creadas por el compositor del smoke aislado, antes del benchmark de navegador existente; reloj/fecha UTC y dataset fijados en `tests/fixtures/final-ui-polish-p0-capture.json`. No se introducen datos demo en producto.
- Decisiones cerradas: `selectReportsSnapshot()` conserva autoridad; tablas anchas mantienen scroll interno y evidencia visible; se conserva `budget-followup` tras detalle. P0 no aplica diseño ni copy de P1–P6.
- Revisión de diff: solo documentación, tests y scripts de captura/verificación. Sin cambios en Reportes/Home, dominio financiero, schema, migraciones, backup/envelope, semánticas, navegación o red.
- Bloqueantes de producto: ninguno. El push Git devolvió 401; se publicó la misma rama mediante la API de GitHub, verificando igualdad de árboles.

### Verificación previa a P1 — evidencia P0

**Gate aprobado · PR #110** — [Corrección de evidencia](https://github.com/Juno002/Glitchbudget-pro/pull/110), sin trabajo de P1 ni cambios de producto. El cierre original P0 conserva **Gate aprobado · PR #109**, confirmado mergeado en GitHub.

- Entorno del ledger: executor cloud adjunto, no CI; Node v24.19.0 / Linux x64. El JSON conserva las muestras originales y registra por separado la huella observada en la repetición.
- Unidad confirmada: `performance.now()` y `medianMs` son milisegundos. 50k original **42.626/40.288 ms**, no segundos. La repetición aislada dio **43.119/37.117 ms**, coherente con el coste existente; no reemplaza la baseline P0 ni modifica la regla 20% / 5 ms de P3.
- Capturas: reloj **2026-10-04T12:00:00.000Z**, fecha financiera **2026-10-04**, zona **UTC** y dataset versionado. Mismos movimientos del smoke original, categorías explícitas y verificación del dataset antes de capturar; doce PNG en la ruta estable `docs/roadmap/final-ui-polish-p0-baseline/`. Captura en reposo tras comprobar privacidad del tooltip.
- Dos sesiones aisladas comprobaron contrato y geometría idénticos. Tests nuevos prueban reloj independiente del día del host y rechazo de fecha/categoría/importe/filas diferentes. `npm run check`: **735/735**; `npm run build`, `npm run test:e2e` y `npm run benchmark:ledger`: aprobados.
- Bloqueantes de producto: ninguno. P1 permanece siguiente autorizada y sin iniciar en esta ejecución.


## Registro P1 — 4 de octubre de 2026

**Gate aprobado · PR #111** — [PR atómico](https://github.com/Juno002/Glitchbudget-pro/pull/111). La intervención solo se considera completada cuando GitHub confirme `merged=true`. P2 no se inicia en esta ejecución.

- Reanudación: `main` y contenido real verificados; P0 conserva **Gate aprobado · PR #109** y GitHub confirma `merged=true` de PR #109 y de la corrección de evidencia PR #110. No existía rama ni PR parcial de P1; rama única `final-ui-polish-p1-editorial-quick-read` sincronizada con `main`.
- `npm run check`: aprobado, **742/742** tests. Los siete tests de `tests/final-ui-polish-p1-editorial.test.ts` cubren los siete tipos, titulares exactos por dirección, base cero sin infinito, parámetros numéricos negativos/cero/null, pureza, determinismo, ranking y thresholds canónicos intactos. La caracterización de jerarquía existente consume ahora el presenter sin cambiar sus demás contratos.
- `npm run build`: aprobado; export estático, manifiesto offline y guard CSP/local-only aprobados.
- `npm run test:e2e`: aprobado; siete tipos renderizados desde los selectores reales, primer insight protagonista, secundarios de menor tamaño, copy exacto y sin cifras en titulares. Matriz **320/360/390/1280 px**, **Prisma/Neón**, importes visibles/ocultos; legado Minimalista a 320/1280. Sin overflow horizontal, titulares contenidos, privacidad en texto/SVG/atributos y árbol accesible completo. Foco por teclado, cambio de rango por touch y reduced motion aprobados. Loading observado con skeleton existente y sin artículos prematuros; vacío con explicación obligatoria. Disabled no aplica a la lectura editorial, que no añade controles. La caracterización P0 y smoke completo mantienen cuatro tablas visibles, tooltip privado, presets, navegación, mutaciones y recarga offline.
- [Evidencia reproducible P1 y veinte capturas](final-ui-polish-p1-verification/README.md), con reloj/fecha/dataset P0 fijados y escenarios aislados restaurados exactamente. Entorno local: Node v24.19.0, Chromium 151, Linux x64, executor cloud. Baseline y doce capturas P0 intactas.
- Benchmark: P1 no requiere benchmark propio. No se altera el script, las medianas baseline P0 ni la regla de rendimiento P3.
- Decisiones cerradas: capa pura `report-editorial.ts` con claves/tipos y parámetros numéricos, sin dinero preformateado; React usa `usePrivateCurrency()` para todo importe. Titulares sin dinero y nombres accesibles derivados de esos titulares. `report.quickRead[0]` conserva protagonismo; un surface editorial con articles y secundarios de menor peso. Copy fallback explica el threshold, sin inferir causas ni valorar direcciones matemáticas.
- Revisión completa de diff: solo lectura rápida, presenter, tests, verificación y documentación P1. Sin cambios en selector/ranking/thresholds, hero de gasto, tablas exactas, orden protegido, cálculos financieros React, dominio, schema/migraciones, backup/envelope, semánticas, navegación principal ni red. Fixtures solo en el perfil temporal de test, sin números demo en producto.
- Bloqueantes de producto: ninguno. Publicación mediante la API de GitHub por el 401 Git conocido, verificando igualdad de árboles y reutilizando la misma rama.


### Revisión posterior a P1 — historia y decisiones visuales

**Gate aprobado · PR #113** — [Ampliación de evidencia](https://github.com/Juno002/Glitchbudget-pro/pull/113), solicitada al revisar PR #111, sin cambios de producto. El cierre original P1 conserva **Gate aprobado · PR #111**, confirmado `merged=true` en GitHub. P2 no se ejecuta en esta revisión.

- Capturas adicionales: [32 PNG con historia comparable y registro de verificación](final-ui-polish-p1-verification/history/README.md). Fixture versionado `tests/fixtures/final-ui-polish-p1-history.json`, reloj/fecha P0 en UTC, cuenta iniciada el 1 de agosto, movimientos previos el 1 de septiembre y actuales el 4 de octubre. Cuatro escenarios: aumento de flujo/gasto/patrimonio, disminución de flujo/gasto/patrimonio, categoría dominante/gasto estable y ausencia de cambios destacados con ingresos en ambas ventanas. Todos consumen selectores reales; se restaura exactamente el dataset original.
- Matriz histórica: **32/32** variantes, Prisma/Neón × 320/1280 px × importes visibles/ocultos, con copy y orden exactos, protagonista/subordinados, límites responsive y privacidad en texto/atributos/árbol accesible completo. La máscara se exige cuando hay dinero editorial; el fallback no fabrica importes y su árbol accesible global permanece privado. Contenedores de charts esperan al ajuste de viewport antes de medir; el criterio de overflow y timeout estándar del smoke siguen fallando si el overflow persiste.
- Gates locales: `npm run check` **742/742**, `npm run build` y `npm run test:e2e` aprobados. El smoke conserva además matriz original P1 a 320/360/390/escritorio, siete tipos, Prisma/Neón/legado, teclado, touch, reduced motion, loading/vacío, cuatro tablas, tooltip privado y recarga offline. Entorno: Node v24.19.0, Chromium 151, Linux x64, executor cloud. Benchmark propio no exigido por P1; baseline y contrato P3 intactos.
- Decisiones cerradas: P1 no exige el literal `✦ Lectura rápida` para el título de sección. `Lo más relevante del rango` y kicker por foco ya existían antes de PR #111; se mantienen. Los titulares “nuevo” son el copy obligatorio del contrato y el cuerpo `Actual … · anterior …` presenta datos canónicos. En escritorio, article principal a ambas columnas con titular limitado a **28ch**, intencional para controlar longitud de línea; no se añade contenido para rellenar el espacio derecho.
- Hallazgo separado: [issue #112](https://github.com/Juno002/Glitchbudget-pro/issues/112) registra `De` en mayúscula en el selector global. `formatPeriodRange()` devuelve `de`; CSS `capitalize` del header transforma la palabra. Header/formatter idénticos al padre de PR #111: incidencia estilística previa que no impide el gate. No se implementa ni se incorpora a P2/P7 sin autorización de alcance.
- Revisión completa de diff: solo helper, fixture y evidencia/documentación. Producto, copy, ranking/thresholds, dominio/schema/backup, navegación, veinte PNG iniciales P1, doce PNG P0 y benchmarks sin cambios. Bloqueantes: ninguno. La ampliación solo se considera integrada tras confirmar `merged=true` de PR #113 en GitHub.


### Correcciones de la revisión P1 — importes y copy

**Gate aprobado · PR #114** — [PR atómico de correcciones](https://github.com/Juno002/Glitchbudget-pro/pull/114), solicitado explícitamente en la revisión del 4 de octubre. Contrato P1 y autorización del roadmap actualizados antes de implementar las cuatro correcciones. El cierre original P1 conserva **Gate aprobado · PR #111**; PR #111 y la evidencia PR #113 confirmados `merged=true` en GitHub. P2 no se inicia. Estas correcciones de copy no añaden un bloqueo ni dependencia de P2.

- Importes indivisibles: spans `white-space: nowrap` exclusivamente en el cuerpo de lectura rápida; `usePrivateCurrency()` sigue formateando el dinero. Símbolo y número permanecen en una línea, sin cambiar currency/locale, con geometría contenida a 320/360/390/escritorio.
- Cruces estrictos de signo: ambos titulares observables y key `cash_flow_sign_change` con parámetros numéricos intactos. React omite porcentaje solo en esa variante; tabla exacta conserva −400% y +133.33%. Cero y signos iguales mantienen copy/porcentaje anteriores; ranking, thresholds y cálculos canónicos sin cambios.
- Categoría: titular universal `La categoría con mayor participación en el gasto`, válido de 35% a 100%, probado a 35/80/100; sin tramos nuevos. Fallback: `Ninguna métrica principal cambió lo suficiente para destacarla.`, con titular original preservado y sin causalidad/reaseguro.
- `npm run check`: **745/745** aprobado, incluidos diez tests del presenter (cruces en ambos sentidos, ceros/signos iguales, rango completo del titular de categoría, pureza y contratos anteriores). `npm run build`: aprobado, export estático y guard CSP/local-only. `npm run test:e2e`: aprobado; **40/40** variantes históricas más veinte variantes de la matriz original, siete tipos, base cero, 320/360/390/1280, Prisma/Neón/legado, privacidad texto/atributos/árbol accesible, una línea por token monetario, comparación exacta, foco, touch, reduced motion, loading/vacío, cuatro tablas, tooltip privado, navegación y recarga offline. Disabled no aplica a la lectura editorial sin controles propios.
- [Sesenta capturas y registros reproducibles](final-ui-polish-p1-review-verification/README.md) en ruta nueva. Fixture histórico v2 incorpora negativo → positivo y conserva reloj/fecha UTC P0; perfil de test aislado, restauración exacta del dataset original. Capturas P0/P1 previas intactas. Entorno: Node v24.19.0, Chromium 151, Linux x64, executor cloud. Benchmark propio no exigido por P1; baseline y contrato P3 intactos.
- Revisión completa de diff: solo contrato autorizado, presenter, cuerpo editorial, tests/fixture, helper y evidencia. Sin refactors fuera de alcance, hero de gasto, tablas/orden, mocks de producto, cálculos financieros React, dominio, schema/migraciones, backup/envelope, semánticas, navegación, red ni colores semánticos nuevos. Issue #112 permanece separado.
- Bloqueantes: ninguno. La corrección se considera integrada únicamente tras confirmar `merged=true` de PR #114 en GitHub; no se documenta SHA de merge.


## Registro P2 — 4 de octubre de 2026

**Gate aprobado · PR #115** — [PR atómico](https://github.com/Juno002/Glitchbudget-pro/pull/115). P2 se considera completada únicamente cuando GitHub confirme `merged=true`. P3 no se inicia en esta ejecución.

- Reanudación: `main` y contenido real verificados; GitHub confirma `merged=true` de P1 PR #111 y de sus correcciones PR #114. No había rama ni PR parcial de P2; rama única `final-ui-polish-p2-spending-hero` sincronizada con `main`.
- Implementación: el hero integra gasto del rango, total protagonista, variación con signo/flecha neutral, movimientos y referencia comparable. Conserva `report.spending.total`, `previousTotal`, `percentChange`, `transactionCount`, etiquetas de ambos rangos y tablas exactas. Consume exclusivamente el facade existente; no hay cálculos financieros en React ni cambios de dominio, persistencia, backup, navegación o red.
- Decisiones cerradas: base anterior cero presenta «Sin referencia anterior frente al rango comparable», sin flecha ni porcentaje, incluyendo actual/anterior en cero; en ese caso el porcentaje canónico cero y la tabla permanecen intactos. Con base distinta de cero se presenta el porcentaje canónico; igualdad conserva «Sin cambio». Importes mediante `usePrivateCurrency()` en spans indivisibles, sin importes en atributos accesibles. Variación y total usan tokens neutrales. Sin gráfico, placeholder, props de tendencia ni espacio reservado para P3.
- Confirmación solicitada: `leadingCategorySharePercent` conserva **35 %**, prioridad y ranking P1 intactos; 25 % no activa `leading_category`. El copy editorial no sustituye ese filtro canónico.
- `npm run check`: aprobado, **754/754 tests**. `tests/final-ui-polish-p2.test.ts` añade nueve pruebas: arquitectura/privacidad/alcance y seis snapshots de base cero, subida, bajada, igualdad, actual cero con base y rango vacío. Valores y comparación canónica protegidos.
- `npm run build`: aprobado; output estático y guard CSP/local-only aprobados.
- `npm run test:e2e`: aprobado; **100 comprobaciones P2** en cinco casos (base anterior cero, subida, bajada, igualdad y vacío), Prisma/Neón × 320/360/390/1280 px × importes visibles/ocultos, más legado 320/1280 px. Importes exactamente iguales a la tabla, nowrap/geometría, jerarquía, dirección neutral, texto/atributos/árbol accesible sin fugas, focus real, touch, reduced motion, loading real observado y restauración exacta de filas. Disabled: el hero no incorpora controles. Smoke global de navegación, mutaciones, cuatro tablas y offline aprobado.
- Evidencia: [24 capturas y matriz reproducible](final-ui-polish-p2-verification/README.md), fecha **2026-10-04 UTC**, casos y filas fijos registrados en `verification.json`; Node **v24.19.0**, Chromium **151**, Linux x64, cloud executor. Capturas estabilizan fuentes/layout y ocultan scrollbars antes de medir el recorte. Referencias P0/P1 intactas.
- Benchmark propio no exigido por P2; baseline P0 y contrato de rendimiento P3 intactos.
- Revisión completa del diff: sin ampliación de alcance, importes filtrados, copy causal, datos ficticios en producto, reconstrucción de métricas, schema/backup ni invariantes alteradas. Sin bloqueantes reales. Merge condicionado a checks relevantes verdes y confirmación real de GitHub; próxima P autorizada después del merge: P3.


## Registro de correcciones P2 — 4 de octubre de 2026

**Gate aprobado · PR #116** — [PR atómico de correcciones](https://github.com/Juno002/Glitchbudget-pro/pull/116), solicitado explícitamente al revisar P2. El cierre original conserva **Gate aprobado · PR #115**, confirmado `merged=true` en GitHub. Esta revisión se considera completada únicamente cuando GitHub confirme `merged=true` de PR #116; P3 no se inicia.

- Reanudación: `main` y contenido real verificados; P1 PR #114 y P2 PR #115 confirmados mergeados. No había rama ni PR parcial de estas correcciones; rama única `final-ui-polish-p2-review-corrections` sincronizada con `main`. Autorización funcional y contrato de copy/presentación actualizados antes de modificar el hero.
- Cambios cerrados: **«1 movimiento»** para conteo uno; **«N movimientos»** para el resto. Comparable visible con la fuente heredada del texto, sin monoespaciada, manteniendo importe indivisible. Ambos importes ocultos conservan los seis bullets **U+2022 (`••••••`)** del hook privado, fuente heredada del tema y tamaño `text-base` (16 px), peso normal y tracking normal; el total visible conserva su tipografía y jerarquía anteriores. Con anterior cero, copy exacto **«Sin gasto anterior con el que comparar»**, sin porcentaje, flecha ni sufijo adicional.
- Alcance: solo presentación del hero P2 y pruebas/documentación. Hook global, P1, valores canónicos, variación, tablas, thresholds, dominio, schema, migraciones, backup/envelope, navegación y local-only intactos. No añade tendencia, datos ficticios, espacio reservado ni reglas P3 de historia desconocida/cero real.
- `npm run check`: aprobado, **754/754 tests**. Los nueve tests P2 mantienen los seis snapshots financieros y protegen nuevo copy exacto/uso del hook compartido sin máscaras inventadas ni cálculos/persistencia en React.
- `npm run build`: aprobado; output estático y guard CSP/local-only aprobados.
- `npm run test:e2e`: aprobado; **100 combinaciones** P2 de cinco casos × Prisma/Neón 320/360/390/1280 px y legado 320/1280 px × visible/oculto. Verifica concordancia, copy, importes exactamente iguales a tabla, nowrap, geometría, tipografía calculada del comparable, máscaras iguales a Lectura rápida con U+2022/fuente/tamaño/tracking, y regreso a visible recuperando jerarquía display. Privacidad de texto/atributos/árbol accesible, focus, touch, reduced motion, loading real y vacío aprobados; disabled no aplica al hero sin controles. Smoke global, mutaciones, cuatro tablas y offline aprobados; dataset original restaurado exactamente.
- Evidencia: [24 capturas y matriz reproducible de la revisión](final-ui-polish-p2-review-verification/README.md), mismos casos y reloj **2026-10-04 UTC** de PR #115. Referencias P0/P1/P2 originales intactas. Entorno: Node **v24.19.0**, Chromium **151.0.7922.173**, Linux x64, cloud executor.
- Benchmark propio no exigido por P2; baseline P0 y contrato de rendimiento P3 intactos.
- Diff completo revisado: sin ampliación de alcance, reconstrucción de métricas, fugas de importes, copy causal, colores direccionales semánticos ni cambios de schema/backup. Sin bloqueantes. Merge condicionado a checks relevantes verdes. Próxima P autorizada después del merge de esta revisión: P3, sin cambios en su contrato de historia desconocida/cero real.


## Registro P3 — 4 de octubre de 2026

**Gate aprobado · PR #117** — [PR atómico](https://github.com/Juno002/Glitchbudget-pro/pull/117). Pendiente de la revisión solicitada por el usuario; no mergeado. P3 solo se considera completada cuando GitHub confirme `merged=true`. P4 no se inicia y conserva su bloqueo.

- Reanudación: `main` y contenido real verificados; GitHub confirma `merged=true` de P2 PR #115 y de las correcciones PR #116. No existía rama ni PR parcial de P3; rama única `final-ui-polish-p3-spending-trend`, sincronizada con `main`.
- Selector puro `selectSpendingTrend()`: `spendingHistoryStart` es la fecha civil del primer gasto reportable disponible, con el mismo prefijo de fecha y `amount` que el reporte existente. Conserva gastos sin cuenta, con referencia a cuenta retirada y anteriores al `Account.startDate` activo. No introduce `reportHistoryStart`, conversión monetaria ni otra semántica financiera.
- Agregación **O(N + W)**: construye primero los rangos mediante `previousComparableRange()` y recorre los gastos una vez, asignando cada uno como máximo a un bucket. Tests instrumentados comprueban N lecturas de fecha y como máximo N de importe con 1, 6 y 700 ventanas; ningún rescan por ventana. Las ventanas visibles mantienen los máximos 6/6/4/4/3/6 y los presets anclados canónicos.
- Decisiones cerradas: ventanas anteriores al primer gasto omitidas como historia desconocida; cruce del primer gasto marcado `partial` con «Historial parcial» accesible; ventanas completas posteriores sin gastos conservan cero real. Serie cronológica estable y actual destacada con tokens neutrales. React recibe los puntos mediante la facade y formatea importes indivisibles con `usePrivateCurrency()`; tooltip y lista visible sin dinero crudo en SVG/ARIA. Sin historia no se fabrica gráfico, placeholder ni cero histórico.
- `npm run check`: aprobado, **775/775 tests**. Incluye 18 pruebas nuevas de tendencia y tres del benchmark; bordes mes/año, leap year, custom, full/partial, ceros, historial sin cuenta, invariancia de entrada y una sola pasada. Guards P2 admiten únicamente el gráfico canónico autorizado por P3; copy, tipografía, privacidad y snapshots protegidos permanecen.
- `npm run build`: aprobado; export estático y manifest offline generados, `connect-src 'none'` y ausencia de importer diagnóstico verificados.
- `npm run test:e2e`: aprobado; **130 comprobaciones P3**, seis presets y seis escenarios, Prisma/Neón a 320/360/390/1280 px y legado a 320/1280, visible/oculto. Totales, rangos, coberturas, cero real/desconocido, actual igual al hero, neutralidad, geometría sin overflow, tooltip real —incluido parcial—, SVG/atributos/árbol accesible, focus y activación real por teclado, touch, reduced motion, loading y vacío aprobados. Disabled: el gráfico no añade controles. Smoke global, cuatro tablas exactas y offline aprobados; filas originales restauradas exactamente.
- [Evidencia reproducible y doce capturas](final-ui-polish-p3-verification/README.md): dataset y reloj **2026-10-04 UTC** fijos, fuentes/layout estabilizados y avisos de logro descartados mediante su botón real. El harness de teclado envía el carácter nativo de Enter; sin cambios de producto para resolver la verificación. Referencias P0–P2 intactas.
- `npm run benchmark:ledger`: script original intacto, siete muestras aisladas en el mismo **Node v24.19.0 / Linux x64 / cloud executor** que P0. Medianas 50k antes **41,425/39,811 ms**, después **42,217/36,955 ms**; baseline P0 **42,626/40,288 ms**. Cambios frente a P0 **−0,959 % / −8,273 %**; ninguna medición 1k/10k/50k excede simultáneamente 20 % y 5 ms. [Muestras y comparaciones completas](final-ui-polish-p3-verification/ledger-benchmark.json).
- `npm run benchmark:reports`: **18 mediciones** (1k/10k/50k × seis presets), mismo dataset fijo y siete muestras emparejadas para `selectSpendingReport()` y tendencia máxima; oracle fuera del tiempo. En 50k, medianas de tendencia **8,325–9,301 ms**, ratios **0,488–0,545×**: seis gates **≤2×** aprobados. [Entorno, generación, muestras y medianas](final-ui-polish-p3-verification/reports-benchmark.json). CI ejecuta también `benchmark:reports` sin modificar los thresholds.
- Diff completo revisado: selector y su facade, integración en hero, chart, benchmark, tests, evidencia y documentación P3. Sin cálculos financieros nuevos en React, mocks de producto, copy causal, colores de dirección semánticos, schema/migraciones, backup/envelope, ledger, deuda/currency/accounts, navegación principal, persistencia ni red. Sin bloqueantes técnicos. PR abierto para revisión; siguiente P de la secuencia, P4, requiere el merge real de PR #117.
