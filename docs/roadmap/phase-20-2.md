# Fase 20.2 — Design system, temas y shell

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 20.

Estado: **completada / Gate 20.2 aprobado**.

Referencia visual: `Juno002/Prisma@dc4310040f42cefd74cf41bad75152902e549c24`.

## Objetivo

Construir la base visual compartida de Fase 20 sin migrar todavía las superficies financieras de Resumen, Movimientos, Plan o Reportes.

La etapa conserva:

```text
GlitchBudget Engine = motor financiero
Modo Prisma = tema claro principal
Modo Neón = tema oscuro principal
```

El branding visible continúa siendo **GlitchBudget Pro** hasta 20.7.

## 1. Superficies migradas

- shell principal;
- sidebar desktop;
- header responsive;
- navegación móvil;
- acción global de nuevo movimiento;
- primitives visuales compartidos de Card/Button/headers;
- tokens de tema y tipografía.

No se migraron todavía:

- Resumen;
- contenido de Movimientos;
- contenido de Plan;
- contenido de Reportes;
- superficies secundarias de 20.7.

## 2. Design system

### Prisma claro

`:root` y `.light` comparten el sistema Prisma:

- fondo cálido;
- verde profundo como color primario;
- superficies claras y sobrias;
- coral/mint/lavender/gold como acentos;
- borders de bajo contraste;
- sombras cortas;
- cards con menor radio/chrome;
- foco y estados interactivos visibles.

Para instalaciones nuevas, `DEFAULT_SETTINGS.theme = 'light'`.

### Neón oscuro

`.dark` conserva la personalidad visual histórica:

- fondo casi negro;
- verde/cyan/magenta luminosos;
- sombras/glow adaptados;
- mismos radios, spacing, navegación, DOM y handlers;
- mismos datos y comportamiento financiero.

### Compatibilidad

El valor persistido `serious` continúa aceptado y visible como **Minimalista legado**. No se elimina ni se migra silenciosamente una preferencia existente.

## 3. Tipografía

El sistema compartido usa:

- DM Sans para interfaz;
- DM Serif Display para títulos/jerarquía editorial;
- DM Mono para importes/código donde ya aplica.

Las fuentes se empaquetan mediante `next/font`; no añaden requests remotos en runtime.

## 4. Shell

### Desktop

`DesktopSidebar`:

- usa `PRIMARY_NAV_ITEMS`;
- comparte `TabsProvider` con el contenido;
- mantiene Resumen / Movimientos / Plan / Reportes;
- ofrece la acción global **Nuevo movimiento**;
- no contiene cálculos financieros;
- no accede a Dexie.

### Mobile

`BottomNav`:

- usa los mismos `PRIMARY_NAV_ITEMS`;
- usa el mismo `TabsProvider`;
- conserva objetivos táctiles y `aria-current`.

El FAB móvil abre el mismo estado de `TransactionModal` que la acción desktop.

### Header

Conserva:

- período financiero;
- acción **Período actual**;
- hide amounts;
- Ajustes;
- Logros como superficie secundaria;
- branding GlitchBudget hasta 20.7.

Los enlaces de marca siguen usando navegación HTML estática de forma intencional para evitar RSC fetches incompatibles con el CSP offline.

## 5. Estado y navegación

Antes de 20.2, `TabsProvider` vivía dentro del shell y la navegación desktop estaba duplicada dentro de `DashboardContent`.

Ahora:

```text
TabsProvider
  └─ AppShell
      ├─ DesktopSidebar
      ├─ Header
      ├─ DashboardContent
      ├─ BottomNav
      └─ TransactionModal
```

Esto elimina la duplicación visual sin cambiar los valores canónicos de tabs.

## 6. Accesibilidad y motion

Preservado:

- skip link;
- `focus-visible`;
- objetivos táctiles móviles;
- `aria-current`;
- `MotionConfig reducedMotion="user"`;
- `prefers-reduced-motion`;
- tokens de duración;
- estados disabled;
- App Lock / Auto-lock;
- hide amounts.

El ambiente/glow se muestra en Neón y se silencia en Prisma claro.

## 7. Browser E2E

El smoke E2E ahora valida además el shell responsive en Chrome/Chromium real:

1. ancho desktop → sidebar visible y bottom-nav oculta;
2. ancho móvil → sidebar oculta, bottom-nav visible y FAB visible;
3. retorno desktop;
4. crear ingreso;
5. crear gasto;
6. abrir Movimientos;
7. verificar datos;
8. esperar service worker;
9. pasar offline;
10. recargar desde caché;
11. fallar ante requests HTTP(S) externos.

## 8. Invariantes y persistencia

No cambió:

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

No hubo:

- migración de schema;
- cambio de formato de backup;
- cambio de semántica financiera;
- fórmula financiera nueva en UI;
- Dexie directo en shell;
- runtime remoto;
- tráfico financiero de red.

## 9. Archivos principales

Añadidos:

- `src/components/layout/brand-mark.tsx`;
- `src/components/layout/desktop-sidebar.tsx`;
- `tests/phase-20-2-shell.test.ts`.

Actualizados principalmente:

- `src/app/layout.tsx`;
- `src/app/page.tsx`;
- `src/app/globals.css`;
- `src/components/layout/app-shell.tsx`;
- `src/components/layout/header.tsx`;
- `src/components/layout/bottom-nav.tsx`;
- `src/components/dashboard/dashboard-content.tsx`;
- `src/components/ui/card.tsx`;
- `src/components/ui/button.tsx`;
- `src/components/finance-ui/headers.tsx`;
- `src/lib/settings-read-model.ts`;
- `src/contexts/finance-context.tsx`;
- `src/components/layout/settings-dialog.tsx`;
- `scripts/e2e-smoke.mjs`;
- `tailwind.config.ts`.

## 10. Gate 20.2

Criterios demostrados:

- Prisma claro y Neón oscuro comparten motor/DOM/handlers;
- sidebar desktop y navegación móvil consumen la navegación canónica;
- la acción global sigue abriendo el compositor existente;
- cambiar tema/shell no crea ni recalcula datos financieros;
- hide amounts, security y reduced motion siguen presentes;
- browser E2E cubre desktop + mobile + mutación financiera + offline;
- `npm run check`, `npm run build` y `npm run test:e2e` quedaron verdes en Quality checks `36645087940` del PR #45.

Baseline funcional:

```text
472/472 tests
Quality checks 36645087940 ✅
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

## 11. Riesgos / limitaciones

- Las pantallas internas todavía conservan parte del look histórico; su migración empieza en 20.3.
- `serious` se conserva como compatibilidad heredada y no representa un tercer destino visual de Fase 20.
- No se ejecutó cambio de branding a Prisma; eso sigue reservado a 20.7.

Siguiente etapa autorizada tras merge y gate verde: **20.3 — Resumen / Home Prisma**.
