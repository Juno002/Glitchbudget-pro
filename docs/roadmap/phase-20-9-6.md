# Fase 20.9.6 — Idioma visible único

Estado: **en validación**.

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

## Gate

El test de 20.9.6 protege las frases visibles normalizadas y documenta explícitamente las excepciones técnicas permitidas.

Pendiente de Quality checks, review, reconciliación documental, merge y verificación post-merge antes de autorizar 20.9.7.
