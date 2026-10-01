# Fase 20 — Modo Prisma / transformación visual y branding

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 20.

Estado: **20.1–20.7 completadas / Gates aprobados. 20.7.5 completada / Gate aprobado con 20.7.5.1–20.7.5.9 cerradas. 20.8 completada / Gate aprobado con 20.8.1–20.8.8 cerradas. 20.9 en curso con 20.9.1–20.9.6 completadas / Gates aprobados; 20.9.7 es la próxima intervención autorizada. 20.10 permanece planificada.**

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

El preflight no cerraba por sí solo 20.1. El contrato visual, matriz de paridad e inventarios protegidos quedaron cerrados posteriormente en [phase-20-1.md](phase-20-1.md).

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

**Estado: completada / Gate aprobado.** Evidencia: [phase-20-1.md](phase-20-1.md).


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

**Estado: completada / Gate aprobado.** Evidencia: [phase-20-2.md](phase-20-2.md). Quality checks `36645087940`: 472/472 tests, build y browser E2E responsive/offline verdes.


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

**Estado: completada / Gate aprobado.** Evidencia: [phase-20-3.md](phase-20-3.md). Quality checks `36650050876`: 477/477 tests, build y browser E2E responsive/offline verdes.

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

**Estado: completada / Gate aprobado.** Evidencia: [phase-20-4.md](phase-20-4.md). Quality checks `36660263082`: 483/483 tests, build y browser E2E responsive/offline verdes.

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

**Estado: completada / Gate aprobado.** Evidencia: [phase-20-5.md](phase-20-5.md). Quality checks `36661934533`: 489/489 tests, build y browser E2E responsive/offline verdes.

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

**Estado: completada / Gate aprobado.** Evidencia: [phase-20-6.md](phase-20-6.md). Quality checks `36670721688`: 495/495 tests, build y browser E2E con Reportes/gráficos + offline verdes.

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

**Estado: completada / Gate aprobado.** Evidencia: [phase-20-7.md](phase-20-7.md). Quality checks `36675832852` y `36675835726`: 502/502 tests, build y browser E2E final con branding Prisma, superficies secundarias y offline verdes.

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

## 20.7.5 — Semantic Integrity & Security Hardening

Estado: **completada / Gate aprobado — 20.7.5.1–20.7.5.9 cerradas**.

Esta fase fue aprobada el 30 sep 2026 después de una revisión externa del código y una verificación posterior contra `main`.

Ocurre después del baseline visual/branding aprobado en 20.7 y **antes de 20.8**.

### Por qué existe

20.8 empezará a comparar e interpretar patrimonio, deuda, flujo de caja y tendencias.

Antes de construir esa capa informativa hay que cerrar varias ambigüedades semánticas del núcleo:

- el modelo persistente admite `Debt.type = 'loan'`, pero el cálculo actual de posición solo incorpora tarjetas de crédito;
- la UI actual crea tarjetas, no préstamos, pero backups históricos pueden contener `loan`;
- `Debt.principal` tiene significados distintos según tipo de deuda;
- `DebtPayment.date` permite legado ISO datetime mientras el flujo actual trabaja con fecha local `YYYY-MM-DD`;
- el contrato de moneda está protegido hoy, pero debe quedar explícitamente cubierto antes de añadir comparaciones;
- el backup cifrado v1 merece una revisión de endurecimiento sin perder compatibilidad;
- los selectores de cuenta deben medirse con datasets grandes antes de introducir optimizaciones;
- los tests existentes necesitan un gate adicional de reconciliación financiera independiente de la implementación.

Regla central:

```text
no construir insights sobre semántica financiera ambigua
```

### Invariantes que no se pueden romper

Durante toda 20.7.5:

- importes persistidos siguen siendo enteros en unidades menores;
- compra con tarjeta = gasto + pasivo, sin reducir efectivo;
- pago de tarjeta = reduce efectivo + pasivo, sin crear gasto nuevo;
- transferencia = mueve dinero entre cuentas, no crea ingreso/gasto;
- planificación no mueve dinero;
- inversión financiada desde cuenta mueve líquido → inversión, no crea gasto;
- rendimiento proyectado no entra automáticamente en patrimonio real;
- UI no accede directamente a Dexie;
- UI no define fórmulas financieras canónicas;
- backups existentes siguen siendo legibles;
- offline y `connect-src 'none'` permanecen intactos;
- no se introduce red para seguridad, FX ni análisis.

---

### 20.7.5.1 — Debt semantics audit

**Estado: completada / Gate aprobado.**

Quality gate de cierre:

```text
505/505 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36745462982 ✅
```

#### Objetivo

Determinar formalmente qué significa cada variante de `Debt` antes de modificar cálculos o persistencia.

#### Auditar

Como mínimo:

- `src/domain/models.ts`;
- `src/domain/ledger.ts`;
- `src/lib/debt-service.ts`;
- `src/lib/accounts.ts`;
- `src/lib/transaction-service.ts`;
- `src/lib/backup-json.ts`;
- `src/components/dashboard/debts-tab.tsx`;
- read models/selectors que consuman deuda;
- migraciones Dexie;
- fixtures/backups históricos;
- tests existentes de tarjetas/deuda.

#### Preguntas que deben quedar respondidas

1. ¿`loan` es una feature vigente, una feature incompleta o solo compatibilidad histórica?
2. ¿Cómo se determina el saldo pendiente de un préstamo?
3. ¿Qué representa `principal` para:
   - tarjeta;
   - préstamo?
4. ¿Qué movimientos reducen un préstamo?
5. ¿Cómo debe entrar un préstamo en:
   - pasivos;
   - patrimonio neto;
   - Reportes;
   - Home?
6. ¿Qué debe hacer la UI si importa un backup que contiene un `loan`?
7. ¿Qué datos históricos deben preservarse aunque la UI no permita crear nuevos préstamos?

#### Entregable

Una matriz explícita:

```text
tipo de deuda
→ significado de campos
→ saldo canónico
→ impacto en net worth
→ acciones permitidas
→ representación UI
→ compatibilidad de backup
```

#### Restricción

No hacer migración de datos ni “arreglar” `loan` antes de cerrar esta definición.

#### Resultado de la auditoría

La decisión de 20.7.5.1 es:

```text
credit_card = feature operativa vigente
loan        = compatibilidad histórica; no es una feature operativa vigente
```

Evidencia revisada:

- el modelo persistente conserva `Debt.type = credit_card | loan` desde los esquemas históricos;
- Fase 2 dejó documentado que `loan` quedaba fuera de la posición agregada y que incorporarlo requería una decisión posterior explícita;
- la UI actual solo crea tarjetas de crédito;
- `saveExpense()` exige una deuda activa de tipo `credit_card` para una compra a crédito;
- backup/import sigue aceptando y preservando filas `loan` y sus `DebtPayment`;
- el ledger actual calcula posición únicamente con tarjetas;
- existen residuos genéricos que todavía pueden tratar un `loan` como si fuera tarjeta en algunos caminos. Esos desajustes se registran para 20.7.5.2 y no se corrigen en esta microintervención.

Contrato adoptado:

| Tipo | `principal` | Saldo canónico | Net worth | Acciones permitidas | UI | Backup |
|---|---|---|---|---|---|---|
| `credit_card` | límite de crédito aprobado; no es activo ni saldo pendiente | saldo firmado = `openingAdjustment + compras a crédito vinculadas - pagos vinculados`; un valor negativo es saldo a favor | saldo positivo = pasivo; saldo negativo = activo de saldo a favor; el límite nunca entra al patrimonio | crear, registrar compra a crédito, registrar pago, conciliar y preservar historial | tarjeta operativa con saldo pendiente/a favor y límite disponible | preservar campos, compras, pagos y `openingAdjustment` |
| `loan` | principal original del préstamo | compatibilidad = `max(0, principal + openingAdjustment histórico - pagos históricos vinculados)`; no se sintetizan intereses desde `apr`; compras de tarjeta nunca aumentan un préstamo | todo saldo positivo computado es pasivo y reduce patrimonio; `status` por sí solo no borra una deuda pendiente | restaurar, exportar y consultar historial en modo lectura | préstamo histórico identificable y de solo lectura; nunca renderizado ni operado como tarjeta | preservar tipo, principal, status, APR, pago mínimo, `openingAdjustment` y pagos vinculados |

Reglas adicionales:

- `DebtPayment` histórico vinculado a un `loan` reduce su saldo compatible.
- `status` es metadata de ciclo de vida; un préstamo marcado `closed` con saldo computado positivo sigue requiriendo tratamiento como pasivo hasta que los datos históricos lo concilien a cero.
- `openingAdjustment` en `loan` se conserva como corrección histórica de baseline si existe; esta fase no crea una nueva UI para producirlo.
- Home y Reportes deben recibir el mismo pasivo de préstamo desde la posición canónica; esa aplicación pertenece a 20.7.5.2.
- Un backup con `loan` no puede convertirlo a tarjeta, descartarlo ni habilitar acciones de tarjeta.

Contrato ejecutable de apoyo: `src/domain/debt-semantics.ts`.
Tests de contrato: `tests/phase-20-7-5-1-debt-semantics.test.ts`.

**Gate 20.7.5.1:** contrato de deuda explícito, documentado y cubierto por tests de contrato.

---

### 20.7.5.2 — Loans + Net Worth correctness

**Estado: completada / Gate aprobado.**

Quality gate de cierre:

```text
511/511 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36758265316 (attempt 2) ✅
```

#### Objetivo

Aplicar el contrato decidido en 20.7.5.1 para que ninguna deuda persistida pueda producir un patrimonio incorrecto.

#### Si `loan` continúa soportado

Debe existir una fuente canónica para:

- saldo pendiente;
- pagos aplicados;
- pasivo total;
- impacto en patrimonio;
- estado activo/cerrado.

`selectPosition()` y cualquier read model de posición deben incluir correctamente el préstamo.

#### Si `loan` queda como compatibilidad histórica

Debe definirse un comportamiento seguro y explícito para registros existentes/importados:

- nunca tratarlos como tarjeta;
- nunca ocultarlos silenciosamente de los pasivos;
- no permitir acciones incompatibles;
- conservar datos al exportar/restaurar;
- mostrar una representación coherente o una ruta de migración explícita.

#### Tests mínimos

Crear fixtures deterministas para:

- tarjeta sin saldo;
- tarjeta con compra;
- tarjeta con pago;
- tarjeta con saldo a favor;
- préstamo activo;
- préstamo parcialmente pagado;
- préstamo cerrado;
- tarjeta + préstamo simultáneos;
- backup histórico con `loan`;
- net worth antes/después de pagos.

#### Resultado de implementación

- `src/domain/ledger.ts` añade `selectLoanCompatibilityBalance()` con el contrato congelado en 20.7.5.1.
- `selectPosition()` agrega los saldos compatibles de `loan` a `liabilities` y por tanto a `netWorth`, sin sintetizar intereses desde APR.
- Un préstamo `closed` con saldo histórico positivo sigue contando como pasivo hasta que pagos registrados lo lleven a cero.
- Un sobrepago histórico se limita a cero y nunca convierte el préstamo en activo.
- `src/components/dashboard/debts-tab.tsx` usa `selectActiveCreditCards()` para acciones operativas y presenta los `loan` importados en una superficie separada de solo lectura.
- `tests/phase-20-7-5-2-loan-net-worth.test.ts` cubre saldo activo/parcial/cerrado, sobrepago, tarjeta + préstamo, neutralidad patrimonial de pagos y separación de UI.
- El test forense de Fase 19.5 fue actualizado para exigir el selector de dominio más estricto `selectActiveCreditCards()` sin relajar la prohibición de lógica financiera en React.
- Backup histórico con `loan` continúa preservado por el contrato y tests de 20.7.5.1.
- No hubo cambios de schema Dexie, migraciones ni formato de backup.

**Gate 20.7.5.2:** patrimonio y pasivos cuadran para todos los tipos de deuda que el sistema pueda persistir o restaurar.

---

### 20.7.5.3 — Debt model normalization

**Estado: completada / Gate aprobado.**

Quality gate de cierre:

```text
516/516 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36762375604 ✅
```

#### Objetivo

Eliminar la ambigüedad de mantenimiento causada por usar `Debt.principal` con significados distintos.

#### Problema actual

Conceptualmente:

```text
credit_card.principal ≈ límite aprobado
loan.principal        ≈ principal del préstamo
```

Una misma propiedad no debe obligar a UI/read models futuros a adivinar el significado por contexto.

#### Estrategia preferida

Primero intentar resolverlo sin romper persistencia:

- read models discriminados;
- helpers/selectors con nombres explícitos;
- tipos discriminados derivados;
- funciones como:
  - `cardCreditLimit`;
  - `loanOriginalPrincipal`;
  - equivalentes canónicos.

#### Si se requiere cambio persistente

Debe ser:

- migración Dexie explícita;
- versionada;
- testeada desde fixtures antiguos;
- compatible con backups anteriores;
- reversible a nivel de import/export mediante normalización;
- sin borrar ni recrear la DB.

#### UI

Los componentes no deben volver a usar un campo ambiguo directamente para decidir:

- límite disponible;
- utilización;
- saldo;
- principal pendiente.

#### Resultado de implementación

- `src/domain/models.ts` deriva `CreditCardDebt` y `HistoricalLoanDebt` sin alterar la forma persistida.
- `src/domain/debt-semantics.ts` concentra la frontera de compatibilidad con `cardCreditLimit()`, `loanOriginalPrincipal()` y type guards explícitos.
- `src/domain/ledger.ts` consume esos significados y devuelve read models con `creditLimit`, `originalPrincipal`, `compatibilityBalance` y demás cantidades inequívocas.
- El flujo de alta operativa usa `CreateCreditCardInput.creditLimit`; React ya no construye una tarjeta mediante `principal`.
- `reconcileDebt()` y el helper legado de saldo rechazan filas `loan` antes de aplicar semántica de tarjeta.
- El agregado de Reportes se renombra de `creditCardLiabilities` a `liabilities`, y Home/Reportes dejan de etiquetar como “tarjetas” un valor que también puede contener préstamos históricos.
- `tests/phase-20-7-5-3-debt-normalization.test.ts` cubre cantidades discriminadas, read models, agregado tarjeta + préstamo, superficies React y estabilidad de versiones.
- Los gates históricos afectados se actualizaron únicamente para exigir la API más estricta.
- Persistencia sin cambios: Dexie v14, Backup JSON v13, encrypted envelope v1.

**Gate 20.7.5.3:** el significado de cada cantidad de deuda es inequívoco fuera de la capa de compatibilidad.

---

### 20.7.5.4 — Canonical financial dates

**Estado: completada / Gate aprobado.**

Quality gate de cierre:

```text
522/522 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36764771406 (attempt 2) ✅
```

#### Objetivo

Unificar el contrato temporal de movimientos financieros para evitar desplazamientos de día por zona horaria.

#### Estado a revisar

- Income/Expense usan `YYYY-MM-DD`;
- flujo actual de pagos de deuda usa `localDate()`;
- `saveDebtPayment()` valida fecha local;
- el modelo histórico de `DebtPayment` documenta ISO;
- backup acepta `YYYY-MM-DD` o ISO datetime legado;
- ledger normaliza pagos mediante `.slice(0,10)`.

#### Contrato objetivo

Para movimientos financieros nuevos:

```text
fecha financiera = YYYY-MM-DD local
```

Los timestamps técnicos pueden existir separadamente cuando hagan falta, pero no deben determinar silenciosamente el día contable.

#### Trabajo

- corregir comentarios/tipos que aún describan datetime donde el contrato actual es fecha financiera;
- centralizar normalización de legacy ISO datetime;
- normalizar durante import/migration, no dispersar `.slice(0,10)` por selectores;
- impedir que nuevos pagos persistan datetime si el contrato es date-only;
- revisar ordenamiento/comparación por fecha.

#### Tests de zona horaria

Cubrir al menos:

- UTC−4 alrededor de medianoche;
- ISO datetime que cae en fecha UTC distinta;
- fecha local ya canónica;
- restore legacy;
- pago creado por UI;
- comparación `through`.

#### Resultado de implementación

- `src/domain/financial-date.ts` define únicamente el contrato civil puro `YYYY-MM-DD`, sin reloj ni dependencias de plataforma.
- `src/lib/financial-date.ts` concentra la conversión legacy ISO datetime → día civil local.
- `DebtPayment.date` se declara como fecha financiera local.
- `saveDebtPayment()` valida y persiste solo date-only.
- Dexie v15 migra una sola vez pagos históricos con datetime.
- Restore JSON v3–v13 acepta datetime histórico, lo normaliza antes de persistir y exporta nuevamente date-only.
- Backup JSON permanece en v13; no se introduce un formato nuevo.
- `src/domain/ledger.ts` ya compara pagos directamente por fecha canónica y no recorta timestamps.
- Los contratos históricos de schema fueron actualizados para el nuevo CURRENT_DB_SCHEMA_VERSION sin reescribir la historia de migraciones anteriores.
- `tests/phase-20-7-5-4-canonical-financial-dates.test.ts` cubre UTC−4, cambio de día UTC/local, pago nuevo, `through`, restore legacy y migración v14→v15.

**Gate 20.7.5.4:** ninguna operación financiera nueva puede cambiar de día por conversión UTC implícita.

---

### 20.7.5.5 — Currency invariant defense

**Estado: completada / Gate aprobado.**

Quality gate de cierre:

```text
526/526 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36776913726 ✅
```

#### Objetivo

Convertir la protección actual de moneda en un invariant explícito del ledger/posición antes de introducir nuevas comparaciones.

#### Estado actual a preservar

Hoy el sistema:

- crea cuentas operativas en moneda base;
- rechaza cuentas extranjeras en el flujo soportado;
- bloquea transferencias cross-currency sin conversión;
- bloquea restore incompatible;
- normaliza movimientos de cuenta a moneda/base;
- no consulta FX por internet.

#### Trabajo

- consolidar tests existentes como contrato de posición;
- comprobar que `selectPosition()` nunca recibe silenciosamente activos heterogéneos desde un camino válido;
- decidir si el selector debe:
  - asumir precondición validada;
  - o rechazar explícitamente monedas mezcladas;
- documentar esa precondición;
- añadir fixture adversarial con dos monedas para que una futura feature FX no active una suma nominal accidental.

#### Restricción

No implementar multi-moneda real en 20.7.5.

#### Resultado de implementación

- `src/domain/ledger.ts` incorpora `requireSinglePositionCurrency()` como precondición ejecutable del agregado de posición.
- Los códigos se normalizan antes de comparar, por lo que variantes como `dop` y ` DOP ` siguen siendo equivalentes.
- `selectPosition()` invoca el guard antes de sumar efectivo, bancos, inversiones y pasivos.
- `tests/phase-20-7-5-5-currency-invariant.test.ts` cubre dataset homogéneo, fixture adversarial DOP + USD, normalización y posición vacía.
- Las restricciones de servicios existentes continúan bloqueando cuentas/transferencias incompatibles sin conversión explícita.
- No se añade conversión FX, multi-moneda real, red ni segunda fuente de posición.
- Persistencia permanece en Dexie v15; Backup JSON v13 y encrypted envelope v1 no cambian.

**Gate 20.7.5.5:** ningún camino soportado puede sumar nominalmente monedas diferentes como si fueran equivalentes.

---

### 20.7.5.6 — Encrypted Backup v2 assessment

**Estado: completada / Gate aprobado como assessment.**

Quality gate de cierre:

```text
530/530 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36784502529 ✅
```

#### Objetivo

Reevaluar el endurecimiento criptográfico del backup cifrado sin romper archivos v1 existentes.

#### Baseline

Actualmente:

```text
PBKDF2-HMAC-SHA-256
310 000 iteraciones
AES-256-GCM
salt aleatorio
nonce aleatorio
AAD autenticado
envelope v1
contraseña mínima 8 caracteres
```

#### Trabajo

1. contrastar parámetros contra guía de seguridad vigente;
2. medir coste real en desktop y móvil razonable;
3. definir presupuesto de latencia aceptable para export/import;
4. evaluar:
   - mayor coste PBKDF2;
   - política de longitud de contraseña;
   - posibles alternativas disponibles en Web Crypto sin dependencias remotas;
5. diseñar envelope v2 solo si aporta una mejora concreta.

#### Compatibilidad obligatoria

Si se crea v2:

- export nuevo puede usar v2;
- import debe seguir leyendo v1;
- archivos v1 no se reescriben automáticamente;
- error de contraseña/archivo manipulado sigue sin filtrar información útil al atacante;
- AAD sigue autenticando metadata relevante;
- no almacenar ni transmitir contraseña.

#### Restricción

No subir iteraciones a un número arbitrario sin benchmark.

#### Resultado de implementación

- Se auditó el baseline real de encrypted backup v1: PBKDF2-HMAC-SHA-256 310k, salt aleatorio de 16 bytes, AES-256-GCM, nonce aleatorio de 12 bytes, tag de 128 bits y AAD autenticado.
- La guía vigente se revisó contra OWASP y NIST. El valor OWASP de 600k se trata como referencia de endurecimiento para PBKDF2 password hashing, no como requisito directo del formato de backup.
- `scripts/benchmark-encrypted-backup.mjs` mide 310k y 600k sobre Web Crypto sin cambiar parámetros productivos.
- El desktop medido admite 600k cómodamente, pero no existe benchmark representativo de hardware móvil físico en el entorno disponible.
- Por la regla del roadmap de no escoger un work factor arbitrario sin benchmark, **no se crea envelope v2**.
- El presupuesto <= 750 ms, con revisión a 1 000 ms, queda documentado como objetivo de ingeniería del proyecto.
- `tests/phase-20-7-5-6-encrypted-backup-assessment.test.ts` congela v1, round-trip y el mismo límite de error para contraseña incorrecta/tamper.
- v1 sigue siendo importable/exportable; no se reescribe automáticamente ningún archivo histórico.
- Dexie v15, Backup JSON v13, red, UI y persistencia financiera permanecen sin cambios.
- Evidencia completa: [phase-20-7-5-6.md](phase-20-7-5-6.md).

**Gate 20.7.5.6:** decisión documentada; v2 no procede todavía por falta de benchmark físico-móvil representativo, y la compatibilidad v1 queda protegida.

---

### 20.7.5.7 — Ledger performance baseline

**Estado: completada / Gate aprobado.**

Quality gate de cierre:

```text
530/530 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36795170833 ✅
```

#### Objetivo

Medir antes de optimizar.

#### Riesgo

`selectAccountEntries()` filtra colecciones completas por cuenta. El coste puede crecer de forma apreciable con muchos movimientos.

#### Benchmark determinista

Medir escenarios como mínimo de:

- 1 000 movimientos;
- 10 000 movimientos;
- 50 000 movimientos;
- múltiples cuentas;
- combinación de ingresos, gastos, pagos y transferencias;
- lectura de posición;
- historial por cuenta.

Registrar:

- tiempo de selector;
- tiempo de read model agregado;
- memoria aproximada cuando sea práctico;
- comportamiento en CI sin convertir timings inestables en tests frágiles.

#### Regla

```text
sin degradación medible
→ no optimizar

degradación medible
→ optimización mínima y testeada
```

Posibles estrategias solo si son necesarias:

- agrupar una vez por `accountId`;
- construir índices/read models intermedios;
- evitar filtrar N veces el mismo snapshot.

No introducir caches persistentes que creen una segunda fuente financiera.

#### Resultado de implementación

- `scripts/benchmark-ledger.mjs` genera datasets deterministas de 1k/10k/50k movimientos con 8 cuentas e ingresos/gastos/pagos/transferencias.
- Se miden por separado `selectPosition()` y el historial agregado de las 8 cuentas.
- La workflow de Quality checks ejecuta `npm run benchmark:ledger` como paso informativo, sin thresholds de tiempo frágiles.
- Medianas CI: 1k = 0.59/0.51 ms; 10k = 5.66/6.10 ms; 50k = 32.22/23.68 ms para posición/historial respectivamente.
- El crecimiento observado no justifica una optimización arquitectónica: a 50k ambas lecturas permanecen en decenas de milisegundos en el entorno CI.
- No se introduce cache persistente, índice materializado, schema nuevo ni segunda fuente financiera.
- La memoria no se congela como métrica de gate porque `process.memoryUsage()` en runners compartidos sería demasiado ruidoso; no se añadió duplicación persistente.
- Evidencia reproducible: [phase-20-7-5-7.md](phase-20-7-5-7.md).

**Gate 20.7.5.7:** existe baseline reproducible y no se optimiza sin evidencia de una degradación que justifique mayor complejidad.

---

### 20.7.5.8 — Independent financial reconciliation gate

**Estado: completada / Gate aprobado.**

Quality gate de cierre:

```text
536/536 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36796234747 ✅
```

#### Objetivo

Complementar los tests escritos junto con la implementación mediante datasets “golden” cuyos resultados esperados se definan de antemano.

#### Principio

```text
expected financial outcome
≠
copiar la fórmula de producción dentro del test
```

Los fixtures deben describir casos completos y resultados contables esperados explícitos.

#### Datasets mínimos

Incluir combinaciones de:

- saldo inicial;
- ingreso;
- gasto en efectivo;
- gasto bancario;
- compra con tarjeta;
- pago de tarjeta;
- saldo a favor;
- transferencia;
- inversión financiada desde cuenta;
- préstamo según contrato 20.7.5.1;
- presupuesto;
- pago planificado pendiente/confirmado;
- meta;
- cambio de período.

#### Cuadrar independientemente

Para cada dataset, verificar cuando aplique:

- efectivo;
- bancos;
- inversiones;
- líquido;
- pasivos;
- patrimonio neto;
- spending;
- debt payments;
- cash flow;
- transferencias neutrales;
- planning neutral;
- Reportes;
- Home.

#### Validación manual opcional

Puede hacerse una reconciliación temporal con datos reales del usuario fuera del fixture del repositorio, pero:

- no guardar información personal en tests;
- no subir extractos reales;
- no convertir datos personales en dependencia del gate automático.

#### Resultado de implementación

- `tests/fixtures/phase-20-7-5-8-golden.json` conserva el dataset y todos los expected como datos independientes.
- `tests/phase-20-7-5-8-financial-reconciliation.test.ts` compara esos expected contra ledger, métricas, budgets, goals, planned payments, Home y Reports.
- El dataset cubre opening balance, ingreso, cash/bank expense, compra/pago/saldo a favor de tarjeta, préstamo histórico, transferencias e inversión financiada.
- También cubre presupuesto, meta, pending/confirmed planned occurrence y un corte de período el día 25.
- Transferencias e inversión cambian la composición de activos sin alterar el net worth golden.
- Planning conserva neutralidad financiera.
- Home y Reports reconcilian la misma posición y net worth.
- El motor actual pasó el golden sin modificar fórmulas productivas.
- Evidencia completa: [phase-20-7-5-8.md](phase-20-7-5-8.md).

**Gate 20.7.5.8:** los principales invariantes cuadran contra resultados esperados independientes del código productivo.

---

### 20.7.5.9 — Final hardening gate

**Estado: completada / Gate aprobado.**

Quality gate de cierre:

```text
540/540 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36797160206 ✅
```

#### Objetivo

Cerrar la fase solo cuando las correcciones semánticas, seguridad, compatibilidad y rendimiento estén reconciliadas.

#### Validación obligatoria

```text
npm run check
npm run build
npm run test:e2e
```

Además:

- fixtures de deuda;
- net worth con todos los tipos persistibles;
- fechas locales/legacy;
- moneda base;
- backup JSON import/export round-trip;
- encrypted backup v1 compatibility;
- encrypted backup v2 si fue aprobado;
- migraciones antiguas;
- golden financial reconciliation;
- benchmark registrado;
- offline;
- `connect-src 'none'`;
- cero nuevas fórmulas financieras en UI;
- cero Dexie directo en UI.

#### Entrega de cierre

Documentar:

1. archivos cambiados;
2. decisión final sobre `loan`;
3. semántica final de deuda;
4. contrato final de fechas;
5. cambios de schema, si hubo;
6. migraciones, si hubo;
7. formato(s) de backup soportados;
8. parámetros criptográficos vigentes;
9. resultados del benchmark;
10. golden datasets añadidos;
11. riesgos conocidos restantes.

#### Resultado de implementación

- `tests/phase-20-7-5-9-final-hardening.test.ts` congela versiones, contratos y la cadena de evidencia de 20.7.5.
- Se verifican explícitamente deuda histórica, fechas, moneda única, Dexie v15, Backup JSON v13 y encrypted envelope v1.
- Las migraciones v6/v7, backup v4, migración temporal v14→v15 y encrypted-v1 round-trip permanecen en la suite.
- Benchmark y golden reconciliation permanecen conectados al gate normal.
- Los guards local-only, `connect-src 'none'`, React/Dexie y dominio React-free continúan activos.
- No se añadió lógica financiera, schema, migración, formato de backup, red, FX ni feature nueva.
- Informe final obligatorio de 11 puntos: [phase-20-7-5-9.md](phase-20-7-5-9.md).

**Gate 20.7.5:** aprobado. Integridad semántica/security cerrada; 20.8.1 queda habilitada.

### Fuera de alcance

20.7.5 no debe convertirse en una feature phase.

No añadir:

- préstamos nuevos en UI salvo que el contrato auditado demuestre que ya son una capacidad vigente que necesita representación correcta;
- multi-moneda real;
- sincronización bancaria;
- APIs FX;
- servidor;
- IA;
- cambios visuales de 20.8/20.9;
- optimizaciones sin benchmark.


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

## Extensión final después de 20.7

Gate 20.7 permanece aprobado y constituye el **baseline visual/branding estable**. Posteriormente se decidió extender Fase 20 sin reabrir ni invalidar 20.1–20.7:

- **20.7.5 — Semantic Integrity & Security Hardening:** especificada íntegramente arriba en este mismo documento.
- [20.8 — Information Design + Deterministic Insights](phase-20-8.md)
- [20.9 — Premium UI Polish](phase-20-9.md)
- [20.10 — Repository Consolidation + Product README](phase-20-10.md)

La secuencia obligatoria es:

```text
20.7.5 integridad semántica/security
→ 20.8 información/insights
→ 20.9 premium polish
→ 20.10 consolidación final
```

No iniciar 20.8 antes de cerrar 20.7.5. No saltar directamente a limpieza de ramas o README antes de cerrar 20.8 y 20.9.

### Baseline cerrado en 20.7

Al completar 20.7:

- el producto visible se llama **Prisma**;
- el usuario ve una interfaz más limpia, pulida y comercial;
- Modo Neón conserva la personalidad oscura;
- sonidos y animaciones siguen formando parte de la experiencia;
- los gráficos siguen presentes y mejor integrados;
- el motor financiero sigue siendo exactamente el núcleo GlitchBudget endurecido hasta 19.5;
- el repositorio Prisma original permanece como referencia histórica de diseño, no como segunda fuente técnica.
