# Fase 20.10 — Repository Consolidation + Product README

Estado: **en curso — 20.10.1–20.10.4 completadas / Gates aprobados; 20.10.5 es la próxima intervención autorizada**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

Esta etapa ocurre únicamente después de aprobar 20.8 y 20.9.

## Objetivo

Cerrar el proyecto con una única línea de trabajo remota clara:

```text
main = única rama permanente
```

Las ramas futuras serán temporales, una por intervención cuando sea necesario, y deberán eliminarse después del merge.

Baseline observado al planificar esta etapa: **54 ramas remotas**.

## 20.10.1 — Inventario de ramas

**Estado: completada / Gate aprobado.**

Snapshot real: **84 ramas remotas** sobre `main` `32e03190651c77511f24090483993b42f3d4ebb3`.

- 39 ramas ya contenidas completamente en `main`;
- 42 ramas históricas/obsoletas divergidas que requieren auditoría de commits/archivos únicos en 20.10.2;
- `wip/codex-local` conserva 1 commit único cuya relevancia debe decidir 20.10.2;
- `phase-20-10-1-branch-inventory` es la rama activa y no puede eliminarse antes del merge;
- no se eliminó ni fusionó ninguna rama durante el inventario.

Evidencia completa: [phase-20-10-1.md](phase-20-10-1.md).

Enumerar todas las ramas remotas y clasificar cada una:

- ya contenida en main;
- histórica/obsoleta;
- contiene commits únicos relevantes;
- contiene commits únicos obsoletos;
- rama activa que no debe eliminarse todavía.

No borrar ninguna rama antes de esta clasificación.

**Gate 20.10.1:** aprobado. Cada rama tiene destino explícito; ninguna fue eliminada.

## 20.10.2 — Auditoría de trabajo único

**Estado: completada / Gate aprobado.**

Auditoría post-squash sobre `main` `d1d36d6de08f2ae94ce0aad4403ebf5df6bba4f8`: **44 ramas no contenidas por ancestry, 44 decisiones explícitas, 0 trabajo vigente pendiente de integrar**. No se fusionó código antiguo y no se eliminó ninguna rama.

Evidencia completa: [phase-20-10-2.md](phase-20-10-2.md).

Para cualquier rama no contenida completamente en main:

- comparar contra main;
- identificar commits/archivos únicos;
- determinar si representan trabajo válido no integrado o residuos históricos;
- no fusionar automáticamente código antiguo solo para “salvarlo”;
- preservar únicamente trabajo vigente y compatible con el producto final.

**Gate 20.10.2:** aprobado. No existe trabajo relevante sin decisión explícita; 20.10.3 queda habilitada.

## 20.10.3 — Unificación controlada en main

**Estado: completada / Gate aprobado.**

20.10.2 confirmó **0 trabajo vigente pendiente de integrar**. Se verificó `main` `e8ca8f5d4ccbb37fcf296c1ae0aa8c2e8c96a9b0` como línea funcional autosuficiente y se cerraron sin merge las PR históricas #35 y #7. Después de esa consolidación quedan **0 PRs abiertas**; ninguna rama fue eliminada.

Evidencia completa: [phase-20-10-3.md](phase-20-10-3.md).

Integrar solo el trabajo único que siga siendo válido.

Después:

- main debe contener todo el producto vigente;
- ninguna feature depende de otra rama;
- ninguna rama funciona como fuente paralela de verdad;
- roadmap/documentación histórica puede permanecer como archivos, no como ramas activas.

**Gate 20.10.3:** aprobado. main es autosuficiente; 20.10.4 queda habilitada.

## 20.10.4 — Gate completo sobre main

**Estado: completada / Gate aprobado.**

`main` `473850b2291218195aa936f73a59ed09568ebae2` pasó Quality checks `36923309003`: check, benchmark, build y E2E verdes. El gate ejecutable cubre backup round-trip, offline, CSP `connect-src 'none'`, Resumen, Movimientos, Plan, Reportes/Lectura rápida, Prisma/Neón, App Lock, backups, categorías default, idioma y achievement toast.

Evidencia completa: [phase-20-10-4.md](phase-20-10-4.md).

Antes de borrar ramas:

```text
npm run check
npm run build
npm run test:e2e
backup import/round-trip
offline
connect-src 'none'
```

Verificar también:

- Home;
- Movimientos;
- Plan;
- Reportes;
- Lectura rápida;
- temas Prisma/Neón;
- App Lock;
- backups;
- categorías default;
- idioma;
- achievement toast.

**Gate 20.10.4:** aprobado. main verde y funcional por sí solo; 20.10.5 queda habilitada.

## 20.10.5 — Eliminación de ramas remotas

Solo después del gate anterior:

- eliminar ramas fusionadas/históricas;
- eliminar ramas WIP obsoletas;
- conservar únicamente `main`.

No eliminar `main`.

Si una rama no puede clasificarse con seguridad, detener la limpieza y revisarla antes.

Política posterior:

```text
nueva tarea
→ rama temporal si hace falta
→ PR / validación
→ merge a main
→ borrar rama
```

No volver a acumular ramas de fases cerradas.

**Gate 20.10.5:** repositorio remoto con una sola rama permanente: `main`.

## 20.10.6 — README final estrictamente de producto

Rehacer `README.md` desde cero como presentación de **Prisma**.

Debe hablar únicamente de la app y sus funciones.

Puede incluir:

- qué es Prisma;
- qué problema resuelve;
- Resumen;
- Movimientos;
- Plan;
- Reportes;
- Lectura rápida;
- presupuestos;
- metas;
- planificados;
- cuentas;
- tarjetas/deuda;
- inversiones;
- privacidad local;
- offline;
- App Lock;
- backups;
- temas Prisma/Neón;
- sonidos/microinteracciones cuando aporten a la descripción del producto.

No debe incluir:

- roadmap;
- fases;
- gates;
- PRs;
- commits;
- SHAs;
- números de CI;
- historial de implementación;
- deuda técnica;
- instrucciones de producción/build;
- narrativa de migración GlitchBudget → Prisma;
- detalles internos que no ayuden a entender el producto.

El README no es documentación de proceso ni reporte de desarrollo.

**Gate 20.10.6:** una persona puede entender el producto sin conocer su historia de implementación.

## 20.10.7 — Cierre definitivo

Verificar:

```text
main única rama permanente
README = producto
Prisma = branding visible
GlitchBudget Engine = núcleo interno
20.8 aprobado
20.9 aprobado
gate completo verde
```

Después de este punto, cualquier trabajo nuevo empieza desde `main` y crea una rama temporal solo si hace falta.
