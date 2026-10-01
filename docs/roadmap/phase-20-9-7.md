# Fase 20.9.7 — Estados y feedback

Estado: **completada / Gate aprobado**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Objetivo

Unificar los estados de la interfaz para que loading, skeleton, empty, success, warning, error, disabled y confirmaciones destructivas pertenezcan al mismo sistema visual y conductual.

## Implementación

- `src/components/ui/alert.tsx` define variantes semánticas default/success/warning/destructive.
- `src/components/finance-ui/feedback-message.tsx` traduce neutral/success/warning/error a esas variantes y fija `role`/`aria-live`.
- `src/components/ui/toast.tsx` comparte las variantes semánticas y la superficie elevada de Prisma/Neón.
- `src/components/ui/skeleton.tsx` usa radios/tone comunes, `aria-hidden`, `data-state="loading"` y `prefers-reduced-motion`.
- Plan y controles de rango de Reportes eliminan errores visuales ad hoc mediante `FeedbackMessage`.
- Tarjetas y copias locales reutilizan `EmptyState`.
- Metas, tarjetas, copias locales y borrado total usan `AlertDialogAction variant="destructive"`.
- El estado disabled conserva el contrato global de Button y elimina press feedback cuando no puede actuar.
- El smoke E2E mantiene exactamente el recorrido funcional y añade un segundo intento únicamente al arranque del navegador/CDP cuando Chromium no expone el puerto de depuración a tiempo.

## Verificación

```text
628/628 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
static output / connect-src 'none' ✅
Quality checks 36906036426 ✅
```

El E2E cubre branding Prisma, superficies secundarias, shell responsive, Resumen, Movimientos/compositor, Plan, Reportes/gráficos, mutación de movimientos, navegación y recarga offline.

## Contratos preservados

- schema: sin cambios, Dexie v15;
- migraciones: ninguna;
- Backup JSON: sin cambios, v13;
- encrypted envelope: sin cambios, v1;
- invariantes financieras: sin cambios;
- persistencia financiera: sin cambios;
- red: sin nuevas capacidades; `connect-src 'none'` permanece;
- dominio/React: sin cambios arquitectónicos.

## Tests añadidos

`tests/phase-20-9-7-states-feedback.test.ts` congela:

- variantes semánticas de feedback;
- skeleton/loading y reduced motion;
- reutilización de EmptyState;
- destructive confirmation común;
- disabled/error states;
- retry limitado del arranque E2E.

## Limitaciones y siguiente intervención

20.9.7 no intenta cerrar los asuntos reservados a **20.9.8**: touch targets, safe areas, focus ring, teclado, contraste, reduced motion global y hover-only information. Tampoco realiza el pixel/interaction sweep final de 20.9.9.

**Gate 20.9.7:** aprobado. Próxima intervención autorizada: **20.9.8 — Mobile, touch, focus y accesibilidad**.
