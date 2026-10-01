# Fase 20.9 — Premium UI Polish

Estado: **en curso — 20.9.1–20.9.4 completadas / Gates aprobados; 20.9.5 es la próxima intervención autorizada**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Objetivo

Dar a Prisma un acabado de producto premium: rápido, silencioso, coherente y físicamente fluido.

Regla central:

```text
la app nunca debe animarse más lento de lo que responde
```

Las animaciones suavizan cambios; nunca bloquean interacción.

## 20.9.1 — Auditoría visual y de consistencia

**Estado: completada / Gate aprobado.**

Quality gate:

```text
591/591 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36886044970 ✅
```

Resultado:

- mapa P0/P1/P2 cerrado para todas las dimensiones visuales exigidas;
- matriz completa de shell, Resumen, Movimientos, compositor, Plan, Reportes, cuentas/deuda/inversiones, Logros, Ajustes, backups, App Lock y primitives;
- cada inconsistencia tiene dueño explícito entre 20.9.2–20.9.9;
- Minimalista legado queda fuera de la paridad premium Prisma/Neón pero protegido por compatibilidad;
- focus invisible de BadgeCard confirmado y reservado como corrección obligatoria para 20.9.8;
- emoji funcional de Agregar/Restablecer inventariado para normalización final;
- no se aplicó polish ni cambio funcional en 20.9.1.

Evidencia: [phase-20-9-1.md](phase-20-9-1.md).

**Gate 20.9.1:** mapa de inconsistencias priorizado y sin zonas ambiguas.

## 20.9.2 — Motion tokens ultra rápidos

**Estado: completada / Gate aprobado.**

Quality gate:

```text
597/597 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36890383021 ✅
```

Resultado:

- tokens press/control/menu/content/dialog fijados en 80/110/130/150/170 ms;
- primary controls usan control + press, sin depender del alias de contenido;
- Dialog/AlertDialog/Sheet comparten dialog timing;
- Popover/Tooltip/Select/DropdownMenu/Menubar comparten menu timing;
- Accordion, debt progress, Plan y tile de Logros consumen tokens adecuados;
- reduced motion permanece protegido;
- motion celebratorio específico de Logros sigue reservado a 20.9.5.

Evidencia: [phase-20-9-2.md](phase-20-9-2.md).

Definir timings globales orientativos:

```text
press feedback      60–90 ms
controls            90–120 ms
menus/popovers      100–140 ms
content transitions 120–160 ms
dialogs/sheets      140–180 ms
```

Principios:

- reacción inmediata;
- sin delays artificiales;
- preferir opacity/transform;
- evitar animaciones de layout costosas;
- respetar `prefers-reduced-motion`;
- nunca impedir el siguiente input mientras termina una animación decorativa.

**Gate 20.9.2:** navegación y controles se sienten instantáneos en desktop y móvil.

## 20.9.3 — Superficies, textura y profundidad

**Estado: completada / Gate aprobado.**

Quality gate:

```text
602/602 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36891760591 ✅
```

Resultado:

- política única de surfaces, borders, shadows, backdrop y blur;
- cards/panels opacos y de bajo contraste;
- dialogs/sheets con profundidad modal compartida;
- popovers elevados sin blur decorativo generalizado;
- navegación translúcida conserva blur tokenizado;
- browser smoke valida Prisma + Neón;
- Minimalista legado preservado como compatibilidad.

Evidencia: [phase-20-9-3.md](phase-20-9-3.md).

Pulir:

- cards;
- panels;
- sheets;
- dialogs;
- backdrops;
- blur;
- sombras;
- separadores;
- superficies elevadas;
- contraste entre plano principal/secundario.

Objetivo: profundidad suave, no “glassmorphism” que perjudique legibilidad.

**Gate 20.9.3:** jerarquía espacial coherente en Prisma y Neón.

## 20.9.4 — Tooltips, popovers y dialogs

**Estado: completada / Gate aprobado.**

Quality gate:

```text
610/610 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36894175981 ✅
```

Resultado:

- tooltip semántico, legible y collision-aware;
- popover responsive con dismiss opcional para ayuda táctil;
- KPI help mantiene advertencias críticas siempre visibles;
- dialogs comparten jerarquía y cierre con foco visible;
- AlertDialog conserva consecuencias visibles y confirmación explícita;
- browser smoke valida ayuda contextual en desktop + móvil;
- focus de BadgeCard sigue reservado a 20.9.8.

Evidencia: [phase-20-9-4.md](phase-20-9-4.md).

Normalizar:

- trigger;
- posición;
- padding;
- icono;
- cierre;
- foco;
- toque;
- ancho máximo;
- copy breve;
- contraste.

Revisar especialmente explicaciones movidas desde 20.8.

Advertencias financieras/destructivas importantes no deben quedar escondidas exclusivamente en tooltip.

**Gate 20.9.4:** ayuda contextual consistente y accesible.

## 20.9.5 — Achievement toast / feedback celebratorio

Rehacer la notificación de logros para corregir la legibilidad observada.

Debe mejorar:

- opacidad de fondo;
- contraste;
- blur;
- jerarquía título/descripción/XP;
- CTA;
- botón cerrar;
- ancho/padding;
- solapamiento con contenido;
- entrada/salida rápida;
- mobile;
- Modo Prisma y Modo Neón.

Mantener sonido, confetti y reduced motion.

Criterio:

```text
la notificación debe entenderse de un vistazo sin pelear con el fondo
```

**Gate 20.9.5:** toast legible en ambos temas y tamaños.

## 20.9.6 — Idioma visible único

Hacer un barrido completo de copy visible.

Idioma final del producto: **español**.

Normalizar términos visibles, por ejemplo:

- Spending → Gastos;
- Cash Flow → Flujo de caja;
- Net Worth → Patrimonio neto;
- Templates → Plantillas;
- Saved Filters → Filtros guardados;
- Rules → Reglas.

Los identificadores internos de código pueden permanecer en inglés.

No traducir marcas, formatos técnicos ni nombres persistentes por estética.

**Gate 20.9.6:** ninguna superficie mezcla idiomas sin una razón documentada.

## 20.9.7 — Estados y feedback

Unificar:

- loading;
- skeleton;
- empty;
- success;
- warning;
- error;
- disabled;
- destructive confirmation.

Evitar skeletons agresivos o feedback que parezca latencia artificial.

**Gate 20.9.7:** todos los estados pertenecen al mismo sistema visual.

## 20.9.8 — Mobile, touch, focus y accesibilidad

Revisar:

- targets táctiles;
- teclado móvil;
- scroll de dialogs;
- FAB;
- safe areas;
- focus ring;
- navegación por teclado;
- contraste;
- reduced motion;
- hover-only information.

**Gate 20.9.8:** paridad de calidad, no solo de funcionalidad, entre móvil y escritorio.

## 20.9.9 — Pixel/interaction sweep final

Recorrido completo:

```text
Resumen
→ Movimientos
→ compositor
→ Plan
→ Reportes
→ Logros
→ Ajustes
→ backups
→ App Lock
```

Revisar ambos temas y varios tamaños.

No introducir nuevas features en esta intervención.

**Gate 20.9:** UI premium cerrada, sin cambios de semántica financiera.

Requerido:

```text
npm run check
npm run build
npm run test:e2e
```
