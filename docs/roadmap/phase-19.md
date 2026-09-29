# Fase 19 — Technical-debt closure

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.

Este documento no amplía el alcance del roadmap. Divide su cierre técnico en tres checkpoints verificables para aplicar el mismo método incremental usado en fases anteriores.

## 19.1 — Frontera UI → queries/services

Objetivo: eliminar accesos directos a Dexie desde `src/components` y `src/app`.

Debe:

- retirar imports directos de `@/lib/db` desde UI;
- retirar `db.*` desde componentes;
- encapsular lecturas reactivas detrás de hooks/queries;
- encapsular operaciones destructivas explícitas detrás de services;
- añadir ESLint `no-restricted-imports` para impedir regresiones;
- mantener comportamiento, esquema, backups e invariantes financieras sin cambios.

## 19.2 — `finance-context.tsx` como fachada

Objetivo: sacar persistencia y responsabilidades operativas del contexto hasta que funcione principalmente como composición/fachada de hooks y servicios.

Debe:

- eliminar acceso directo a Dexie desde el contexto;
- mover lecturas, settings, backup/data-management y operaciones independientes a hooks/services apropiados;
- preservar exactamente la API pública necesaria o migrarla de forma controlada;
- no duplicar fórmulas financieras;
- mantener selectors y domain como fuente de cálculo.

## 19.3 — Componentes grandes + hardening + gate final

Objetivo: dividir responsabilidades independientes únicamente donde aporte límites claros.

Revisar como mínimo:

- `TransactionModal`;
- `GoalsManager`;
- `ReportsTab`;
- `AccountsOverview`.

Debe:

- extraer responsabilidades independientes, no fragmentar por tamaño arbitrario;
- comprobar que UI consume commands/queries/selectors y no persistencia directa;
- verificar que `finance-context` ya no actúa como motor financiero;
- ejecutar la Definition of Done completa;
- cerrar formalmente Fase 19;
- detenerse antes de Fase 19.5.

## Invariantes de toda la fase

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- no cambiar semántica financiera;
- no introducir red, backend, sync ni telemetría;
- no cambiar schema salvo necesidad explícita y documentada;
- backups y migraciones históricas deben seguir funcionando;
- no usar resets destructivos como estrategia de migración.

## Estado

```text
19.1 — Frontera UI → queries/services      ✅ completado
19.2 — finance-context como fachada        ✅ completado
19.3 — Componentes + hardening + gate      ⏳ en ejecución
```
