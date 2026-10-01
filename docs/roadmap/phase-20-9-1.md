# Fase 20.9.1 — Auditoría visual y de consistencia

Estado: **inventario cerrado / pendiente de gate**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Propósito

20.9.1 no corrige componentes. Congela el mapa de inconsistencias que 20.9.2–20.9.9 deben resolver sin improvisar cambios visuales aislados.

Regla:

```text
primero inventariar
→ después priorizar
→ después normalizar por sistema
→ finalmente hacer pixel/interaction sweep
```

## Alcance revisado

Se auditó el código visible actual de:

- shell, header, sidebar desktop, bottom navigation y FAB;
- Resumen;
- Movimientos, filas, cuentas, tarjetas/deudas e inversiones;
- compositor global y diálogos de transferencias/automatización;
- Plan / Presupuestos / Metas / Planificados;
- Reportes y charts;
- Logros y feedback celebratorio;
- Ajustes;
- categorías, Rules y automatización local;
- backups CSV/JSON/cifrados/OPFS e importación;
- App Lock, Auto-lock y persistent storage;
- primitives de `src/components/ui/**`;
- primitives financieras de `src/components/finance-ui/**`;
- tokens globales de `src/app/globals.css` y `tailwind.config.ts`.

No se modificó ninguna de esas superficies en 20.9.1.

## Temas objetivo

### Prisma claro

Objetivo premium principal.

### Neón oscuro

Objetivo premium principal con el mismo DOM/comportamiento siempre que sea razonable.

### Minimalista legado (`serious`)

Compatibilidad preservada, **no tercer destino de paridad premium de 20.9**.

Debe seguir funcionando y no romperse por los cambios de 20.9, pero no obliga a replicar sombras, textura o profundidad de Prisma/Neón. Esta decisión ya estaba congelada desde 20.2 y elimina cualquier ambigüedad de alcance para 20.9.2–20.9.9.

## Escala de prioridad

| Prioridad | Significado |
| --- | --- |
| **P0 — sistémica** | Afecta primitives/tokens o varias superficies. Debe resolverse antes del polish local porque cualquier corrección aislada volvería a divergir. |
| **P1 — visible/repetida** | Inconsistencia de alta visibilidad o repetida en una familia concreta de superficies. |
| **P2 — localizada/final** | Excepción aislada, compatibilidad o detalle apropiado para el sweep final una vez normalizado el sistema. |

---

# Inventario por dimensión

## 1. Motion y respuesta — P0

### Estado actual

Los tokens globales actuales son:

```text
--motion-fast:     120ms
--motion-standard: 180ms
--motion-slow:     280ms
```

20.9.2 define otra escala objetivo:

```text
press feedback       60–90 ms
controls             90–120 ms
menus / popovers     100–140 ms
content transitions  120–160 ms
dialogs / sheets     140–180 ms
```

Desviaciones confirmadas:

- `Button`, sidebar, bottom-nav y FAB consumen `--motion-standard` (180 ms), demasiado genérico para feedback de press/control;
- `Dialog` y `AlertDialog` conservan `duration-200`;
- `Sheet` conserva 300 ms al cerrar y 500 ms al abrir;
- `Accordion` conserva `duration-200`;
- Logros usa `duration-300`;
- barra de deuda usa `duration-500`;
- Plan contiene una transición Framer Motion literal de 0.16 s en vez de un token compartido.

### Decisión

No corregir esos valores individualmente.

**Dueño: 20.9.2.** Primero redefinir tokens por familia de interacción y luego migrar consumidores.

---

## 2. Radios y geometría de superficie — P0

### Sistema canónico existente

```text
--radius-card:        0.875rem
--radius-interactive: 0.625rem
--radius-modal:       1.125rem
```

`Card` ya usa `--radius-card` y `Button` usa `--radius-interactive`.

### Bypasses encontrados

Primitives:

- `Dialog`: `rounded-[24px]`;
- `AlertDialog`: `sm:rounded-lg`;
- `Popover`: `rounded-[14px]`;
- `Tooltip`: `rounded-[10px]`;
- `Select`: `rounded-md` y items `rounded-[6px]`;
- `TabsList`: `rounded-[14px]`;
- `TabsTrigger`: `rounded-[10px]`;
- `Toast`: `rounded-md` más override `rounded-[16px]`;
- `Skeleton`: `rounded-md`.

Superficies:

- compositor: mezcla `radius-interactive`, `rounded-md` y `rounded-lg`;
- Plan: mezcla tokens con `rounded-lg` y `rounded-xl`;
- cuentas/inversiones: `rounded-lg`, `rounded-xl`, `rounded-2xl`;
- App Lock: mezcla `radius-card` y `rounded-xl`;
- Settings/Rules: tokens más `rounded-md`/`rounded-xl`;
- filas de movimientos: `rounded-xl`;
- brand mark usa geometría propia de 9–10 px, considerada **intencional de marca**, no deuda de sistema.

### Decisión

La geometría de marca queda exceptuada. El resto debe expresar intención semántica: card / interactive / modal / pill.

**Dueño: 20.9.3 para superficies; 20.9.4 para overlays/contextual UI; 20.9.9 para residuos locales.**

---

## 3. Sombras, profundidad, fondos y overlays — P0

### Núcleo consistente

`Card`, shell principal y varias superficies migradas consumen:

- `--shadow-card`;
- `--shadow-control`;
- `--shadow-floating`;
- `--shadow-nav`;
- colores semánticos `bg-card`, `bg-background`, `bg-popover`.

### Desviaciones sistémicas

- `DialogOverlay`, `AlertDialogOverlay` y `SheetOverlay` usan `bg-black/80` en lugar de `--backdrop`;
- `Dialog` usa sombra RGBA hardcodeada distinta por tema;
- `AlertDialog` y `Sheet` usan `shadow-lg`;
- `Popover` usa sombra RGBA hardcodeada;
- `Tooltip` usa blanco/rgba explícitos y sombra hardcodeada;
- `SelectContent` usa `bg-white/95` / rgba oscuro y sombra hardcodeada;
- dropdown menus conservan bordes/sombras hardcodeados;
- toast base conserva fondos/blur/radios propios;
- header y bottom-nav usan blur de forma intencional, pero todavía no existe una política única de blur/elevación.

### Riesgo concreto

`Tooltip` combina fondo claro explícito en Prisma con texto basado en blanco translúcido. Aunque no se declara aquí un defecto visual definitivo sin render, la combinación está fuera del sistema semántico y debe verificarse de forma prioritaria en 20.9.4.

### Decisión

No parchear overlays uno por uno.

**Dueño: 20.9.3 crea la política de profundidad/superficie. 20.9.4 migra popover/tooltip/dialog. 20.9.5 resuelve el toast de logros.**

---

## 4. Bordes — P1

Patrón objetivo ya dominante:

```text
border
border-border
border-input
border-subtle / border-strong cuando corresponda
```

Desviaciones:

- Tabs usa bordes `black/5` y variantes dark directas;
- dropdown menu usa `border-black/10` + dark RGBA;
- alert/dialog/sheet dependen de defaults o bordes genéricos;
- `SelectContent` declara `border-border` sin una política de borde equivalente al resto de overlays;
- componentes locales combinan `border`, `border-input`, `border-primary/40` y colores literales sin una taxonomía cerrada de estado.

**Dueño: 20.9.3 y 20.9.7.**

---

## 5. Tipografía — P1

### Núcleo sano

- DM Sans = interfaz;
- DM Serif Display = títulos/editorial;
- DM Mono = importes;
- `PageHeader` y `SectionHeader` ya centralizan jerarquía;
- `MoneyValue` centraliza importes.

### Inconsistencias

- `DialogTitle` base sigue siendo `text-lg font-semibold`;
- varias superficies modernas lo sobrescriben manualmente con `font-display text-2xl font-normal`, otras no;
- cards heredadas y settings mezclan `font-semibold`, `font-display`, `font-headline` y tamaños locales sin una jerarquía declarada;
- Logros usa una escala propia de 9/10/11 px que necesita validación de legibilidad, pero puede conservar personalidad celebratoria.

**Dueño: 20.9.3/20.9.4 para jerarquía de surfaces/dialogs; 20.9.5 para Logros; 20.9.9 para residuos.**

---

## 6. Iconografía — P2 con excepción conocida

### Sistema predominante

Lucide es el sistema funcional predominante y mantiene tamaños cercanos a 16–20 px.

### Excepciones

- BrandMark es identidad propia y queda fuera de normalización Lucide;
- Logros usa emoji como glyph de recompensa (`role="img"`) y también símbolos visuales como fuego/trofeo;
- los gestores de categorías de gastos e ingresos usan **emoji funcional** en acciones normales: `➕ Agregar` y `🔄 Restablecer`.

Los emoji de Logros se consideran **contenido celebratorio intencional**, no iconografía de navegación. Deben revisarse por tamaño/alineación/contraste en 20.9.5, no reemplazarse automáticamente.

Los emoji de **Agregar/Restablecer** sí son una inconsistencia funcional confirmada frente al sistema Lucide predominante. No son branding ni contenido celebratorio y deben normalizarse como acciones estándar en el sweep.

**Dueño: 20.9.5 para Logros; 20.9.9 para iconografía funcional residual.**

---

## 7. Spacing y densidad — P1

Tokens disponibles:

```text
--space-page
--space-section
--space-card
--space-control
```

Situación:

- shell, cards principales y métricas usan una jerarquía razonablemente consistente;
- Resumen y Reportes son las superficies más alineadas tras 20.8;
- compositor, Settings, cuentas, inversiones y Rules mezclan `p-2`, `p-3`, `p-4`, `p-5`, `p-6` y gaps locales;
- la variación no es toda incorrecta, pero no está clasificada por rol;
- dialogs grandes usan padding base distinto de cards internas, lo que amplifica densidad desigual;
- tablas conservan `p-4`/header `h-12` aunque las listas financieras nuevas son más compactas.

### Decisión

No convertir cada padding en token mecánicamente. Primero normalizar families y luego ajustar densidad visual.

**Dueño: 20.9.3, 20.9.4 y sweep 20.9.9.**

---

## 8. Hover / press — P1

### Bien resuelto

`Button`, FAB y navegación principal tienen hover/press explícitos.

### Inconsistencias

- varios botones raw de Plan/cuentas solo definen hover y no press;
- tabs y selects dependen principalmente de estados Radix/focus sin feedback de press equivalente;
- filas financieras usan hover pero no una convención única de pressed/selected;
- dropdown/select items usan colores directos `black/10` / `white/10`;
- acciones destructivas locales no siempre comparten el mismo patrón visual de press.

**Dueño: 20.9.2 para timing; 20.9.7 para semántica de estados; 20.9.8 para touch.**

---

## 9. Focus — P0 de accesibilidad / P1 visual

### Bien resuelto

Button/Input y navegación principal usan `focus-visible` con ring semántico.

### Zonas a normalizar

- algunos primitives Radix usan `focus:` y otros `focus-visible:`;
- dropdown/select items usan focus como selección visual pero con colores hardcodeados;
- algunos botones raw dependen de focus heredado o no hacen visible el mismo tratamiento del contenedor;
- cards seleccionables de Settings alojan RadioGroupItem pero la superficie completa no necesariamente expresa focus como una unidad;
- **defecto confirmado:** los tiles de Logros (`BadgeCard`) usan `focus:outline-none` sin `focus-visible:ring-*`, `focus:ring-*` ni otro indicador visual sustituto; un usuario de teclado puede enfocar el control sin señal visible;
- skip link usa un patrón específico y se preserva como accesibilidad funcional.

El focus ausente de `BadgeCard` no es una verificación opcional: queda como **remediación obligatoria de 20.9.8**.

**Dueño: 20.9.7 para semántica general de focus/estado; 20.9.8 para accesibilidad y corrección obligatoria de BadgeCard.**

---

## 10. Disabled — P1

Primitives de formulario suelen aplicar:

```text
disabled:pointer-events-none
disabled:cursor-not-allowed
disabled:opacity-50
```

Superficies raw no siempre reutilizan esa convención. Hay controles locales con solo `disabled:opacity-50` y otros sin estado visual adicional.

**Dueño: 20.9.7.**

---

## 11. Scroll interno — P1

### Infraestructura existente

`.viewport-dialog` limita altura al viewport visible y aplica `overscroll-behavior: contain`.

### Inconsistencias / riesgo

- generic Dialog, Settings, compositor, cuentas, inversiones y OPFS aplican límites diferentes: `85vh`, `88vh`, `90dvh`, `calc(100dvh - 1rem)`;
- varios dialogs añaden `overflow-y-auto` encima del comportamiento base;
- tablas usan su propio overflow horizontal;
- toast de logro puede adquirir scroll vertical;
- en móvil esto puede producir scroll anidado con comportamiento diferente según superficie.

No se afirma que todos esos casos estén rotos; se clasifican como **zona de verificación obligatoria**.

**Dueño: 20.9.4 para dialogs; 20.9.8 para móvil/touch/safe areas.**

---

## 12. Responsive — P0/P1

### Cobertura fuerte existente

El E2E ya protege:

- shell desktop/móvil;
- Home desktop/móvil;
- Reportes desktop/móvil con geometría/overflow.

### Superficies de mayor riesgo para 20.9.8

1. compositor global;
2. Settings con tabs y formularios extensos;
3. Logros/toast;
4. diálogos de cuentas/inversiones/deudas;
5. backups/OPFS;
6. App Lock;
7. tablas/listas con contenido largo.

Bottom nav y FAB ya respetan safe-area inferior; dialogs usan viewport visible, pero la consistencia debe comprobarse en browser real.

**Dueño: 20.9.8.**

---

## 13. Idioma visible — P1

La mezcla actual es conocida y está reservada explícitamente a 20.9.6.

Ejemplos visibles existentes:

- Spending;
- Comparison;
- Cash Flow;
- Net Worth;
- Fixed / Variable / Occasional;
- Largest transactions;
- Rules / nombres heredados en algunas superficies.

No corregir en 20.9.1.

**Dueño: 20.9.6.**

---

## 14. Loading / empty / success / warning / error — P1

Existe `EmptyState`, `StatusBadge` y `Skeleton`, pero las superficies todavía mezclan:

- skeletons tokenizados y skeletons con `rounded-xl/2xl`;
- alertas mediante `role="alert"` + cards locales;
- colores destructivos/alerta locales;
- estados de carga manuales `animate-pulse`;
- mensajes success/error en dialogs y settings con estructuras distintas.

**Dueño: 20.9.7.**

---

# Matriz de superficies

| Superficie | Estado de base | Inconsistencias principales | Prioridad | Dueño |
| --- | --- | --- | --- | --- |
| Shell / sidebar / header / bottom-nav / FAB | Mayormente tokenizado | motion genérico, blur/elevación sin política final, algunos radios locales | P0/P1 | 20.9.2–20.9.3, 20.9.8 |
| Resumen | Fuerte tras 20.8 | residuos de spacing/interaction menores | P2 | 20.9.9 |
| Movimientos | Mixto | rows `rounded-xl`, tablas heredadas, estados interactivos heterogéneos | P1 | 20.9.7–20.9.9 |
| Compositor global | Mixto | radios md/lg + tokens, inputs raw, densidad/scroll, feedback press desigual | P0/P1 | 20.9.3, 20.9.7, 20.9.8 |
| Plan | Bueno/mixto | skeleton/radius locales, raw buttons, motion literal | P1 | 20.9.2, 20.9.7, 20.9.9 |
| Reportes | Fuerte tras 20.8 | depende de primitives de tooltip/popover/chart; copy mixto | P1/P2 | 20.9.4, 20.9.6, 20.9.9 |
| Cuentas / deuda / inversiones | Mixto | rounded lg/xl/2xl, selects raw, duración 500 ms, dialogs con alturas distintas | P1 | 20.9.2–20.9.4, 20.9.8 |
| Logros | Deuda visual conocida | toast/blur/contraste/radios/motion/color propio | P1 explícita | 20.9.5 |
| Ajustes | Mixto | tabs + forms heredados, radios/selects raw, densidad/scroll largo y emoji funcional en gestores de categorías | P0/P1 | 20.9.3–20.9.4, 20.9.7–20.9.9 |
| Backups | Funcionalmente estable | dialogs/forms con spacing y responsive dispares | P1 | 20.9.4, 20.9.7–20.9.8 |
| App Lock / Auto-lock | Funcionalmente estable | radios locales, focus/state/spacing por normalizar | P1 | 20.9.7–20.9.8 |
| UI primitives | Principal deuda sistémica | motion, radius, overlay, shadow, focus y theme colors divergentes | **P0** | 20.9.2–20.9.4 |
| finance-ui primitives | Mayormente coherente | transaction rows/chips y detalles locales | P1/P2 | 20.9.7–20.9.9 |

---

# Orden de resolución congelado

No saltar directamente a pixel polish.

## 20.9.2 — Motion

Resolver primero:

- escala global;
- press/control/menu/dialog;
- Sheet 300/500;
- valores 200/300/500 heredados;
- valores Framer Motion literales;
- reduced motion.

## 20.9.3 — Superficies y profundidad

Resolver:

- radius semantics;
- border policy;
- shadow/elevation;
- backdrop/blur;
- background semantic tokens;
- densidad base de cards/panels.

## 20.9.4 — Tooltips / popovers / dialogs

Resolver:

- overlay;
- modal radius;
- shadow;
- padding;
- close affordance;
- max width;
- focus;
- mobile scroll;
- tooltip/select/popover contrast.

## 20.9.5 — Achievement toast

Resolver la deuda visual celebratoria ya aislada sin convertirla en patrón general.

## 20.9.6 — Idioma visible

Eliminar mezcla ES/EN sin renombrar identificadores internos ni datos persistentes.

## 20.9.7 — Estados y feedback

Unificar loading/empty/success/warning/error/disabled/selected/destructive.

## 20.9.8 — Mobile / touch / focus / accesibilidad

Validar objetivos táctiles, safe areas, teclado, scroll, focus ring y hover-only information. Corregir obligatoriamente el focus invisible confirmado de `BadgeCard` en Logros.

## 20.9.9 — Sweep final

Solo después de lo anterior:

- spacing residual;
- densidad;
- icon alignment;
- excepciones de radius;
- tablas/listas;
- pixel polish;
- interacción residual.

---

# Zonas explícitamente no ambiguas

- **Prisma + Neón** son los dos objetivos premium.
- **Minimalista legado** se preserva por compatibilidad, no exige paridad premium.
- BrandMark conserva geometría propia.
- emoji de Logros es contenido celebratorio, no reemplaza Lucide en navegación/acciones.
- Resumen y Reportes no deben ser reestructurados otra vez: 20.9 pule, no reabre 20.8.
- ninguna etapa de 20.9 puede añadir fórmulas financieras, nueva persistencia, red o features.
- las inconsistencias sistémicas se resuelven en primitives/tokens antes de parchear consumidores.
- 20.9.1 no autoriza correcciones visuales: solo cierra el mapa.

## Gate 20.9.1

El inventario cubre todas las dimensiones exigidas por el roadmap:

- radios;
- bordes;
- sombras;
- fondos;
- overlays;
- tipografía;
- iconografía;
- spacing;
- densidad;
- hover;
- press;
- focus;
- disabled;
- scroll interno;
- responsive.

Cada familia tiene prioridad y etapa propietaria.

**Pendiente de Quality checks y reconciliación de estado antes de autorizar 20.9.2.**
