# Fase 20.9.5 — Achievement toast / feedback celebratorio

Estado: **en validación**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Objetivo

Hacer que el logro se entienda de un vistazo sin competir con el dashboard, manteniendo el feedback celebratorio existente.

## Superficie y jerarquía

El toast deja atrás la superficie translúcida/glass anterior y usa:

- `--surface-elevated`;
- `--border-strong`;
- `--shadow-modal`;
- `--radius-modal`;
- texto semántico de foreground/muted;
- acento lateral por tier;
- icono contenido en superficie propia;
- jerarquía explícita: eyebrow → título → descripción → XP → CTA.

Se conservan dos salidas claras:

- CTA `Listo`;
- botón cerrar de 40×40 con foco visible.

## Motion y celebración

- entrada/salida mediante `MOTION_SECONDS.dialog`;
- con `useReducedMotion`, la transición decorativa pasa a duración 0;
- sonido de logro se mantiene;
- confetti se mantiene para tiers gold/diamond;
- `triggerConfetti` continúa respetando `prefers-reduced-motion`.

## Responsive

El layer del toast permanece por encima de la bottom navigation durante **todo el rango < md**.

El review de PR detectó que usar `sm:bottom-6` causaba solapamiento entre 640–767 px; se corrigió a `md:bottom-6`.

El E2E dispara un logro real de “Primer Ingreso”, cambia el viewport a 700×844 y verifica:

- bottom nav visible;
- toast completamente por encima de la nav;
- toast dentro del viewport;
- superficie opaca/visible;
- jerarquía título + descripción + XP;
- cierre mediante CTA.

## Temas

Prisma y Neón comparten el mismo DOM y los mismos tokens semánticos de superficie/foreground. El acento de tier permanece como contenido celebratorio, no como sistema alternativo de UI.

## Cambios funcionales

Ninguno.

No cambia semántica financiera, schema, migraciones, backup, persistencia ni red.

## Gate

Pendiente de Quality checks sobre el HEAD final, review y reconciliación documental antes de autorizar 20.9.6.
