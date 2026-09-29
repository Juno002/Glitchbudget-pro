# Fase 19.5 — Residual architecture cleanup / Prisma Engine Gate

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.5.

Estado: **completado**.

## Objetivo

Dejar el núcleo financiero reutilizable por una interfaz distinta, incluida Prisma, sin depender de componentes React, decisiones visuales ni acceso financiero directo a persistencia desde UI/hooks/contextos.

No se añaden features nuevas.

## Ejecución en cinco checkpoints

La numeración de ejecución agrupa los requisitos canónicos 19.5.1–19.5.7 sin reemplazarlos:

1. **19.5.1 — Auditoría forense completa**
   - cubre la auditoría visual canónica 19.5.1 y el barrido de residuos pequeños;
   - inventaría persistencia, cálculos, read models y decisiones financieras residuales;
   - no extrae todavía: congela el mapa de trabajo.

2. **19.5.2 — Persistencia fuera de React**
   - cumple el requisito canónico de cero acceso financiero directo a Dexie desde UI;
   - mueve lecturas reactivas a queries/repositories/application services;
   - hooks/contextos quedan como adaptadores React, no propietarios de persistencia.

3. **19.5.3 — Cálculos y read models reutilizables**
   - extrae cálculos financieros canónicos de componentes;
   - consolida read models/selectores para Resumen, Movimientos, Plan, Reportes, Cuentas, Metas, Inversiones y Planificados;
   - elimina residuos pequeños de semántica financiera en UI.

4. **19.5.4 — `finance-context` + hardening**
   - deja `finance-context.tsx` como fachada/composición;
   - añade/endurece guards automáticos contra Dexie en React, dominio dependiente de React y fórmulas financieras reintroducidas en UI.

5. **19.5.5 — Barrido final + Prisma Engine Gate**
   - repite la auditoría completa desde cero;
   - traza los tres flujos obligatorios del roadmap;
   - ejecuta el gate técnico completo y documenta cualquier excepción deliberada.

## Invariantes

Durante toda Fase 19.5:

- no cambiar semántica financiera;
- no cambiar schema salvo necesidad estructural demostrada;
- no resetear Dexie;
- no romper backups;
- no introducir red financiera;
- no usar Prisma como nueva fuente de reglas: Prisma deberá consumir el mismo núcleo.

## Estado de checkpoints

- [19.5.1](phase-19-5-1.md) — auditoría forense completa: **completado**;
- [19.5.2](phase-19-5-2.md) — persistencia fuera de React: **completado**;
- [19.5.3](phase-19-5-3.md) — cálculos/read models: **completado**;
- [19.5.4](phase-19-5-4.md) — `finance-context` + hardening: **completado**;
- [19.5.5](phase-19-5-5.md) — barrido final + Prisma Engine Gate: **completado / aprobado**.


## Cierre

Fase 19.5 queda **completada** con el Prisma Engine Gate aprobado en [19.5.5](phase-19-5-5.md).

No existe una fase posterior definida en `Roadmap septiembre 2026.txt`; cualquier trabajo nuevo debe partir de una nueva decisión de roadmap, no de una continuación implícita.
