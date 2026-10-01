# Fase 20.9.3 — Superficies, textura y profundidad

Estado: **en validación**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Política de profundidad

20.9.3 normaliza la jerarquía espacial sin convertir Prisma en glassmorphism.

Principios:

```text
page < card/panel < elevated popover < modal/sheet
```

- superficies de contenido: opacas;
- bordes: suaves y semánticos;
- sombras: discretas en Prisma, más profundas en Neón sin cubrir legibilidad;
- blur: reservado a navegación translúcida;
- overlays: usan `--backdrop`, no negro hardcodeado;
- Minimalista legado mantiene compatibilidad y continúa anulando sombras/blur.

## Tokens

Se consolidan:

- `--surface-card`, `--surface-modal`, `--surface-elevated`;
- `--border-subtle`, `--border-strong`;
- `--shadow-card`, `--shadow-control`, `--shadow-popover`, `--shadow-modal`, `--shadow-nav`;
- `--blur-navigation: 18px`;
- backdrops separados para Prisma y Neón.

## Consumidores

- Card adopta surface/card + border-subtle + spacing compartido;
- Dialog y AlertDialog usan radius modal, superficie opaca, backdrop y shadow modal;
- Sheet usa la misma superficie/backdrop/shadow sin inventar otra capa;
- Popover consume surface-elevated + shadow-popover; comportamiento/foco/copy sigue reservado a 20.9.4;
- Tabs elimina fondos/bordes directos light/dark y blur local;
- Header y bottom nav conservan translucidez intencional con blur tokenizado;
- Separator usa border-subtle.

## Browser gate

El smoke E2E alterna temporalmente las clases `light` y `dark` y confirma que ambos temas resuelven el sistema de profundidad, con backdrops y sombras de modal diferentes y blur de navegación compartido.

## Fuera de alcance

20.9.3 no normaliza todavía:

- trigger/posición/cierre/focus/copy de tooltips, popovers o dialogs;
- achievement toast;
- idioma;
- estados loading/error/disabled;
- focus/touch responsive final.

Esos puntos permanecen en 20.9.4–20.9.8 según el inventario aprobado.

## Cambios funcionales

Ninguno. No cambia semántica financiera, schema, migraciones, backup, persistencia ni red.

## Gate

Pendiente de Quality checks sobre el HEAD final y reconciliación documental antes de autorizar 20.9.4.
