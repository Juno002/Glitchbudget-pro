# Fase 20.9.6 — Idioma visible único

Estado: **completada / Gate aprobado**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Regla

El idioma visible del producto es **español**.

Esta intervención modifica únicamente copy visible y ARIA. No renombra:

- identificadores de código;
- tipos/modelos;
- nombres de archivos;
- `data-*`;
- IDs persistentes;
- formatos o tecnologías como CSV, JSON, OPFS y Dexie;
- marcas como Google Sheets.

## Superficies normalizadas

### Reportes

- Spending → Gastos;
- Comparison → Comparación;
- Cash Flow → Flujo de caja;
- Net Worth → Patrimonio neto;
- Income → Ingresos;
- Debt payments → Pagos de deuda;
- Net cash flow → Flujo neto;
- Largest transactions → Movimientos de mayor importe.

### Resumen

El copy visible de “Home” pasa a “Resumen”:

- Personalizar Resumen;
- sección inicial al abrir Resumen;
- al entrar a Resumen;
- restablecer Resumen.

Los identificadores internos `home`, `HOME_MODULES` y `data-home-*` permanecen sin cambios.

### Automatización local

- Templates → Plantillas;
- Saved filters → Filtros guardados;
- Rules → Reglas;
- Quick Add → registro rápido.

Los IDs internos `templates-saved-filters-rules`, `data-quick-add-*` y modelos `QuickAdd*` permanecen intactos.

### Privacidad y bloqueo

- App lock → bloqueo de aplicación;
- Auto-lock → bloqueo automático;
- ARIA y mensajes de estado siguen la misma terminología.

### Copias de seguridad

El sustantivo visible “backup” se normaliza a “copia” / “copia de seguridad”:

- copia cifrada;
- restaurar copia cifrada;
- contraseña de la copia;
- copia JSON;
- copias de seguridad externas.

CSV, JSON, OPFS y Dexie permanecen por ser formatos/tecnologías explícitamente permitidos por el roadmap.

### Planificados

La única mezcla `cash/bank` visible pasa a “efectivo/banco”.

## Review resuelto

El review de PR detectó tres P2 válidos antes del cierre:

- métricas/chart rows de Reportes todavía en inglés;
- `LOCAL_AUTOMATION_LAYERS` todavía exponía títulos/localización/descripción en inglés;
- errores y feedback de backup cifrado propagaban “backup” desde capas inferiores.

Los tres se corrigieron en la misma intervención y quedaron cubiertos por `tests/phase-20-9-6-visible-language.test.ts`.

## Quality gate aprobado

```text
622/622 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
static output / connect-src 'none' ✅
Quality checks 36900165070 ✅
```

El E2E se actualizó al copy visible “Datos y copias” y pasó completo.

## Gate

**Aprobado.** 20.9.6 queda cerrada. Una vez fusionada esta reconciliación y verificado `main`, la siguiente intervención autorizada es **20.9.7 — Estados y feedback**.
