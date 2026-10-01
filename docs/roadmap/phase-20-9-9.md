# Fase 20.9.9 — Pixel / interaction sweep + Gate 20.9

Estado: **completada / Gate aprobado**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Objetivo

Cerrar el polish premium con un sweep final de spacing, densidad, icon alignment, radius, tablas/listas e interacción residual, sin reabrir la arquitectura informativa de 20.8 ni introducir features.

## Recorrido validado

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

El browser smoke cubre desktop y móvil, teclado/focus ya protegido por 20.9.8 y cambio real entre los dos temas premium desde Ajustes.

## Correcciones del sweep

- Categorías: `➕ Agregar` y `🔄 Restablecer` pasan a `Plus` y `RotateCcw` de Lucide; los emoji celebratorios de Logros no se tocan.
- Plan: acciones raw residuales de nuevo presupuesto, guardar y mostrar/ocultar categorías reutilizan `Button`.
- Inversiones: el loading residual usa `Skeleton` compartido y el bloque informativo abandona radius local.
- Cuentas: detalles y controles raw completan radius, press y focus semánticos.
- `TransactionRow`: radius y estado pressed se alinean con el sistema interactivo.
- Ajustes: bloques informativos/destructivos residuales usan el radius de card.

## Verificación

```text
640/640 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
static output / connect-src 'none' ✅
Quality checks 36915706293 ✅
```

Benchmark observado en 50k movimientos:

```text
position median: 32.17 ms
histories median: 24.72 ms
```

E2E confirma además:

- iconografía funcional de Categorías sin emoji residual;
- activación real de Neón oscuro;
- restauración real de Prisma claro;
- recorrido de superficies secundarias;
- responsive shell;
- compositor;
- Plan;
- Reportes y gráficos;
- navegación y recarga offline.

## Regresión

`tests/phase-20-9-9-pixel-interaction-sweep.test.ts` protege:

- iconografía funcional Lucide;
- radius/skeleton/state residual;
- uso del Button compartido en Plan;
- interacción real Prisma/Neón en E2E;
- ausencia de nuevas rutas financieras/persistentes/red en el sweep.

La regresión histórica de 20.9.7 se avanzó para proteger el contrato disabled del primitive `Button`, no el markup raw que 20.9.9 elimina.

## Contratos preservados

- semántica financiera: sin cambios;
- Dexie v15: sin cambios;
- schema/migraciones: sin cambios;
- Backup JSON v13: sin cambios;
- encrypted envelope v1: sin cambios;
- persistencia: sin cambios;
- red: sin nuevas capacidades; `connect-src 'none'` permanece.

## Cierre de Fase 20.9

**Gate 20.9 aprobado.** 20.9.1–20.9.9 quedan cerradas.

La siguiente intervención autorizada por el roadmap canónico es **20.10.1 — Inventario de ramas**. 20.10 no se inicia desde esta microintervención.
