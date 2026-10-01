# Fase 20.9.8 — Mobile, touch, focus y accesibilidad

Estado: **completada / Gate aprobado**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Objetivo

Cerrar la brecha de calidad entre móvil y escritorio sin alterar lógica financiera: targets táctiles, teclado móvil, safe areas, scroll de overlays, focus visible, navegación por teclado, contraste, reduced motion y dependencias hover-only.

## Implementación

- `Dialog` / `AlertDialog` usan `.viewport-dialog` con visual viewport y centrado horizontal dentro del rectángulo seguro, incluyendo insets asimétricos.
- `Sheet` usa geometría safe-area por lado mediante `data-sheet-side`; no impone padding global y preserva consumidores con `p-0`.
- controles coarse-pointer interactivos obtienen targets mínimos de 44 px; radio/checkbox/switch amplían hit area sin cambiar el glyph.
- `Input` solicita `inputMode="decimal"` por defecto para números y conserva overrides explícitos como PIN numérico.
- formularios móviles usan texto base durante foco para evitar zoom/legibilidad deficiente.
- `BadgeCard` compone el glow mediante `--achievement-glow`, permitiendo que el ring de Tailwind se renderice realmente; el focus se valida por teclado.
- Select/Dropdown abandonan colores de foco hardcodeados por tokens semánticos.
- cards seleccionables de Ajustes expresan focus mediante `focus-within`.
- compositor, Ajustes, cuentas, inversiones y backups reutilizan el contrato de viewport compartido.
- reduced motion cubre las animaciones revisadas de XP y medallas.

## Review posterior

Un review sobre el primer gate verde detectó tres defectos que bloquearon el merge:

1. el `boxShadow` inline de `BadgeCard` anulaba el ring y permitía un falso positivo E2E;
2. el padding no-layered de `.viewport-sheet` anulaba overrides como el sidebar móvil `p-0`;
3. el dialog seguía centrado en el viewport completo con safe-area horizontal asimétrico.

Los tres fueron corregidos antes del cierre. El E2E ahora inspecciona `--tw-ring-shadow`, compara el shadow enfocado con su baseline y exige el ring específico de 2 px; no acepta el glow normal como evidencia de focus.

## Verificación

```text
635/635 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
static output / connect-src 'none' ✅
Quality checks 36912136865 ✅
```

Benchmark observado en 50k movimientos:

```text
position median: 34.69 ms
histories median: 25.63 ms
```

E2E cubre además compositor móvil a 390 px, Ajustes móvil contenido/scrollable y focus visible real de BadgeCard.

## Contratos preservados

- Dexie v15: sin cambios;
- schema/migraciones: sin cambios;
- Backup JSON v13: sin cambios;
- encrypted envelope v1: sin cambios;
- semántica e invariantes financieras: sin cambios;
- persistencia: sin cambios;
- red: sin nuevas capacidades; `connect-src 'none'` permanece;
- arquitectura dominio/React: sin cambios.

## Regresión

`tests/phase-20-9-8-mobile-accessibility.test.ts` protege:

- safe-area/visual viewport;
- targets táctiles;
- teclado móvil;
- focus real de BadgeCard;
- contraste/focus semántico;
- dialogs móviles de alto riesgo;
- distinción E2E entre ring de focus y glow normal;
- preservación del `p-0` del sidebar.

## Siguiente intervención

20.9.8 no ejecuta el sweep final ni introduce features nuevas.

**Gate 20.9.8:** aprobado. Próxima intervención autorizada: **20.9.9 — Pixel / interaction sweep + Gate 20.9**.
