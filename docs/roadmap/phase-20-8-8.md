# Fase 20.8.8 — Gate final 20.8

Estado: **completada / Gate aprobado**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Propósito

20.8.8 es un gate de cierre, no una iteración de features. Debe demostrar que Information Design + Deterministic Insights queda cerrada sin degradar semántica financiera, privacidad local, backup/migraciones, offline ni paridad responsive.

## Cobertura consolidada

El gate reutiliza y exige evidencia ejecutable de 20.8.1–20.8.7 para:

- categorías default en instalación limpia;
- comparaciones KPI canónicas y deterministas;
- Lectura rápida reproducible;
- Home sin reconstrucción de fórmulas financieras en React;
- Reportes con jerarquía editorial, gráficos, tablas y detalle exacto;
- progressive disclosure accesible sin esconder consecuencias financieras.

Además, 20.8.8 amplía el smoke E2E para ejercer explícitamente **Reportes en viewport móvil**, complementando la cobertura desktop y la cobertura Home desktop/móvil ya existente.

## Privacidad y arquitectura

El gate mantiene:

- `check:local` sobre `src/**`;
- bloqueo de primitivas de red y SDK remotos/IA;
- build estática;
- CSP final con `connect-src 'none'`;
- comprobación E2E de cero requests externos;
- recarga offline desde service worker.

## Backup y migraciones

La suite vigente continúa cubriendo:

- migración de fixtures Dexie históricos;
- importación de backup histórico;
- export/import round-trip;
- preservación de tablas, automatización local y resultados financieros;
- rechazo transaccional de backups inválidos.

## Validaciones de cierre

Obligatorias antes de aprobar:

```text
npm run check
npm run build
npm run test:e2e
```

El benchmark del ledger puede ejecutarse como evidencia adicional del pipeline, pero 20.8.8 no introduce una nueva exigencia de rendimiento ni modifica fórmulas financieras.

## Cambios de producto

Ninguno previsto.

No hay cambios de schema, migraciones, formato de backup, red, persistencia o fórmula financiera. La única modificación ejecutable del gate es ampliar cobertura E2E/test para validar el contrato ya implementado.

## Quality gate aprobado

```text
585/585 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
static output / connect-src 'none' ✅
Quality checks 36882536925 ✅
```

El E2E final valida Home desktop/móvil y Reportes desktop/móvil. En móvil, Reportes exige secciones y charts visibles con geometría contenida, controles de rango utilizables y ausencia de overflow horizontal global. También confirma cero requests externos y recarga offline desde service worker.

El gate conserva la evidencia ejecutable de migraciones históricas y backup export/import round-trip. No se cambió schema, migración, formato de backup, persistencia, red ni lógica financiera.

## Gate

**Aprobado.** 20.8.8 queda cerrada y con ella se cierra **20.8 — Information Design + Deterministic Insights**.

La siguiente intervención autorizada, una vez fusionada esta reconciliación y verificado `main` post-merge, es **20.9.1 — Auditoría visual y de consistencia**.
