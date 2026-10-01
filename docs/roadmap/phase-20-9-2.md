# Fase 20.9.2 — Motion tokens ultra rápidos

Estado: **en validación**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Contrato implementado

La escala global queda dividida por intención:

```text
press feedback       80 ms
controls            110 ms
menus / popovers    130 ms
content transitions 150 ms
dialogs / sheets    170 ms
```

Todos los valores están dentro de los rangos autorizados por el roadmap.

`--motion-fast`, `--motion-standard` y `--motion-slow` permanecen únicamente como aliases de compatibilidad para consumidores que se normalizarán en intervenciones posteriores. Las superficies críticas de 20.9.2 ya no dependen de `--motion-standard`.

Para Framer Motion se añade `src/lib/motion.ts` con la misma escala en milisegundos/segundos; Plan consume `MOTION_SECONDS.content` en vez de un número literal.

## Consumidores normalizados

- Button: control + press;
- FAB móvil, bottom nav, CTA/sidebar desktop: control + press;
- Dialog, AlertDialog y Sheet: dialog;
- Popover, Tooltip, Select, DropdownMenu y Menubar: menu;
- Accordion trigger: control; expansión/colapso: content;
- barra visual de deuda: content;
- entrada de presupuesto en Plan: content;
- tile de Logros: control.

Las animaciones celebratorias específicas del toast/XP de Logros se mantienen para 20.9.5, donde el roadmap exige rehacer explícitamente su entrada/salida y jerarquía.

## Reducción de movimiento

Se conserva el override global de `prefers-reduced-motion` con duraciones de 0.01 ms y sin scroll suave.

## Cambios funcionales

Ninguno.

No se modifica semántica financiera, schema, migraciones, backup, persistencia, red ni contenido de producto.

## Gate

Pendiente de Quality checks sobre el HEAD final de 20.9.2 y de reconciliación documental antes de autorizar 20.9.3.
