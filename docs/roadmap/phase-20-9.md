# Fase 20.9 — Premium UI Polish

Estado: **planificada / no iniciada**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Objetivo

Dar a Prisma un acabado de producto premium: rápido, silencioso, coherente y físicamente fluido.

Regla central:

```text
la app nunca debe animarse más lento de lo que responde
```

Las animaciones suavizan cambios; nunca bloquean interacción.

## 20.9.1 — Auditoría visual y de consistencia

Recorrer todas las superficies y registrar:

- radios;
- bordes;
- sombras;
- fondos;
- overlays;
- tipografía;
- iconos;
- espaciado;
- densidad;
- estados hover/press/focus/disabled;
- scroll interno;
- responsive.

No corregir “a ojo” componente por componente sin antes cerrar el inventario.

**Gate 20.9.1:** mapa de inconsistencias priorizado.

## 20.9.2 — Motion tokens ultra rápidos

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
