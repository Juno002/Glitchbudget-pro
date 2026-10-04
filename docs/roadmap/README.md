# Roadmap — índice vigente

Este archivo es un **índice de estado y navegación**. No reemplaza la especificación funcional.

**Fuente de verdad:** [`Roadmap septiembre 2026.txt`](Roadmap%20septiembre%202026.txt).

## Estado actual

- Fases **0–19.5: completadas**.
- **Fase 20 — Modo Prisma:** completada / Gate final aprobado; 20.1–20.10 cerradas.
- **20.1:** completada / Gate aprobado.
- Preflight técnico de 20.1: **completado**.
- Contrato visual + inventario de paridad: **completado**.
- **20.2 — Design system + temas + shell:** completada / Gate aprobado.
- **20.3 — Resumen / Home Prisma:** completada / Gate aprobado.
- **20.4 — Movimientos + compositor global:** completada / Gate aprobado.
- **20.5 — Plan Prisma:** completada / Gate aprobado.
- **20.6 — Reportes + sistema de gráficos:** completada / Gate aprobado.
- **20.7 — Superficies secundarias + branding Prisma:** completada / Gate aprobado.
- **20.7.5 — Semantic Integrity & Security Hardening:** completada / Gate aprobado; 20.7.5.1–20.7.5.9 cerradas.
- **20.8 — Information Design + Deterministic Insights:** completada / Gate aprobado; 20.8.1–20.8.8 cerradas.
- **20.9 — Premium UI Polish:** completada / Gate aprobado; 20.9.1–20.9.9 cerradas.
- **20.10 — Repository Consolidation + Product README:** completada / Gate aprobado; 20.10.1–20.10.7 cerradas.

## Próxima intervención autorizada

```text
Final UI Polish — P3 (tendencia temporal de gasto), tras confirmar merged=true de PR #115 y de las correcciones PR #116
```

No crear 20.11 ni Fase 21. Final UI Polish fue autorizado explícitamente el 4 de octubre de 2026 y no constituye una fase funcional nueva. Cualquier trabajo fuera de P0–P7 exige modificar primero [`Roadmap septiembre 2026.txt`](Roadmap%20septiembre%202026.txt) y el documento ejecutable con aprobación explícita.

## Final UI Polish — autorizado

- **Documento ejecutable:** [Final UI Polish — Plan ejecutable y contrato de alcance](final-ui-polish.md)
- **Estado:** en ejecución; P0 **Gate aprobado · PR #109**; P1 **Gate aprobado · PR #111**; P2 **Gate aprobado · PR #115**; correcciones P2 **Gate aprobado · PR #116**.
- **Secuencia obligatoria:** `P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7`.
- **Próxima intervención:** P3 — tendencia temporal de gasto; requiere confirmar `merged=true` de [PR #115](https://github.com/Juno002/Glitchbudget-pro/pull/115) y de sus [correcciones PR #116](https://github.com/Juno002/Glitchbudget-pro/pull/116).
- No crea 20.11 ni Fase 21; el roadmap funcional 0–20.10 permanece cerrado.

## Evaluación técnica externa al roadmap

- [Auditoría de viabilidad de Capacitor para Android/iOS — 3 de octubre de 2026](capacitor-audit-2026-10-03.md)

Baseline técnico actual:

```text
Dexie v15
Backup JSON v13
Encrypted envelope v1
640/640 tests
Ledger benchmark: 50k position 32.17 ms / histories 24.72 ms median
Golden reconciliation: net worth 1.205m / spending 90k / cash flow 340k
Final hardening manifest: debt/date/currency/backup/migrations/architecture ✅
20.8.1 information inventory + clean-install category regression ✅
20.8.2 canonical KPI comparisons: liquid/net worth/debt/investments + explicit base states ✅
20.8.3 deterministic Quick Read: explicit thresholds + stable ranking + max 3 insights ✅
20.8.4 Summary KPI comparison-first hierarchy + contextual definitions ✅
20.8.5 Home reduced permanent copy without losing decision-critical context ✅
20.8.6 Reports editorial hierarchy + deterministic Quick Read placement ✅
20.8.7 accessible progressive disclosure + contextual copy contract ✅
20.8.8 final Information Design gate + mobile Reports geometry/overflow regression ✅
20.9.1 prioritized visual consistency audit + explicit owners 20.9.2–20.9.9 ✅
20.9.2 premium motion tokens 80/110/130/150/170 ms + primary control/dialog/menu migration ✅
20.9.3 semantic depth system + opaque cards/modals + Prisma/Neón browser verification ✅
20.9.4 contextual UI: semantic tooltip + responsive dismissible popovers + dialog hierarchy + desktop/mobile KPI help ✅
20.9.5 achievement toast: opaque hierarchy + accessible dismiss + mobile-nav-safe 700px regression ✅
20.9.6 Spanish visible copy + propagated automation/security/backup labels + technical-name exceptions ✅
20.9.7 unified feedback/loading/empty/disabled/destructive states + E2E startup hardening ✅
20.9.8 safe-area/touch/focus/mobile accessibility + review blockers resolved ✅
20.9.9 final pixel/interaction sweep + real Prisma/Neón theme interaction ✅
Gate 20.9 UI premium ✅
20.10.1 inventory: 84 ramas / 39 contenidas / 42 históricas divergidas / 1 WIP único / 1 rama activa ✅
20.10.2 unique-work audit: 44 ramas post-squash decididas / 0 trabajo vigente pendiente ✅
20.10.3 main unification: 0 rescates / PR #35 y #7 cerradas / 0 PRs abiertas / main autosuficiente ✅
20.10.4 full main gate: check/build/E2E/backup/offline/CSP/superficies completos ✅
20.10.5 remote cleanup: única rama permanente `main` ✅
20.10.6 README estrictamente de producto ✅
20.10.7 cierre definitivo del roadmap ✅
Quality checks 36915706293 ✅
browser E2E Prisma branding + real premium-theme interaction + secondary surfaces + responsive shell + Home desktop/mobile + Movimientos/composer + Plan + Reports desktop/mobile/charts + Logros + Ajustes/backups/App Lock + movement + offline ✅
```

## Fase 20 — Modo Prisma

| Etapa | Estado | Documento |
|---|---|---|
| 20.1 — Contrato visual + inventario de paridad | **Completado / Gate aprobado** | [phase-20-1.md](phase-20-1.md) |
| Preflight técnico de 20.1 | **Completado** | [phase-20-1-preflight.md](phase-20-1-preflight.md) |
| 20.2 — Design system + temas + shell | **Completado / Gate aprobado** | [phase-20-2.md](phase-20-2.md) |
| 20.3 — Resumen / Home Prisma | **Completado / Gate aprobado** | [phase-20-3.md](phase-20-3.md) |
| 20.4 — Movimientos + compositor global | **Completado / Gate aprobado** | [phase-20-4.md](phase-20-4.md) |
| 20.5 — Plan Prisma | **Completado / Gate aprobado** | [phase-20-5.md](phase-20-5.md) |
| 20.6 — Reportes + sistema de gráficos | **Completado / Gate aprobado** | [phase-20-6.md](phase-20-6.md) |
| 20.7 — Superficies secundarias + branding Prisma | **Completado / Gate aprobado** | [phase-20-7.md](phase-20-7.md) |
| 20.7.5 — Semantic Integrity & Security Hardening | **Completada / Gate aprobado — 20.7.5.1–20.7.5.9** | [phase-20.md](phase-20.md#2075--semantic-integrity--security-hardening) |
| 20.8 — Information Design + Deterministic Insights | **Completada / Gate aprobado — 20.8.1–20.8.8** | [phase-20-8.md](phase-20-8.md) |
| 20.9 — Premium UI Polish | **Completada / Gate aprobado — 20.9.1–20.9.9** | [phase-20-9.md](phase-20-9.md) |
| 20.10 — Repository Consolidation + Product README | **Completada / Gate final aprobado — 20.10.1–20.10.7** | [phase-20-10.md](phase-20-10.md) |

Contrato visual complementario: [Prisma UI System](../ux/prisma-mode.md).

Regla central de Fase 20:

```text
Prisma = lenguaje visual / branding
GlitchBudget Engine = única fuente financiera
```

Sonidos, animaciones y gráficos forman parte de la paridad protegida. **Prisma es ya el producto visible**; Modo Prisma es el tema claro principal y Modo Neón el tema oscuro principal. El motor financiero continúa siendo GlitchBudget Engine. 20.7.5 endurece integridad semántica/seguridad antes de que 20.8–20.10 trabajen información, acabado premium y consolidación del repositorio.

## Fases completadas

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Safety baseline + backup fixtures | [Completada](phase-0.md) |
| 1 | Local-only / static distribution | [Completada](phase-1.md) |
| 2 | Canonical financial domain | [Completada](phase-2.md) |
| 3 | Ledger correctness + policies | [Completada](phase-3.md) |
| 4 | Stable categories | [Completada](phase-4.md) |
| 5 | Actual vs Planned | [Completada](phase-5.md) |
| 6 | Period Engine | [Completada](phase-6.md) |
| 7 | Planned Payments | [Completada](phase-7.md) |
| 7.5 | UX Architecture & Design System | [Completada / Gate aprobado](phase-7.5.md) |
| 8 | Quick Add 2.0 | [Completada](phase-8.md) |
| 9 | Budgets 2.0 | [Completada](phase-9.md) |
| 10 | Goals 2.0 | [Completada](phase-10.md) |
| 11 | Currency foundation | [Completada](phase-11.md) |
| 12 | Investments 1.0 | [Completada](phase-12.md) |
| 13 | Reports 2.0 | [Completada](phase-13.md) |
| 14 | Home 2.0 | [Completada](phase-14.md) |
| 15 | Transaction metadata + filters | [Completada](phase-15.md) |
| 16 | Templates / Saved Filters / Rules | [Completada](phase-16.md) |
| 17 | Security & privacy UX | [Completada](phase-17.md) |
| 18 | Backup 2.0 + permanent migrations | [Completada](phase-18.md) |
| 19 | Technical-debt closure | [Completada](phase-19.md) |
| 19.5 | Prisma Engine Gate | [Completada / Gate aprobado](phase-19-5.md) |

## Checkpoints detallados

Las fases largas conservan sus checkpoints como evidencia histórica:

- Fase 7.5: [A](phase-7.5a.md) · [B](phase-7.5b.md) · [C](phase-7.5c.md) · [D](phase-7.5d.md) · [Gate](phase-7.5-gate.md)
- Fase 16: [16.1](phase-16-1.md) · [16.2](phase-16-2.md) · [16.3](phase-16-3.md) · [16.4](phase-16-4.md) · [16.5](phase-16-5.md) · [16.6](phase-16-6.md) · [16.7](phase-16-7.md)
- Fase 17: [17.1](phase-17-1.md) · [17.2](phase-17-2.md) · [17.3](phase-17-3.md) · [17.4](phase-17-4.md) · [17.5](phase-17-5.md)
- Fase 18: [18.1](phase-18-1.md) · [18.2](phase-18-2.md) · [18.3](phase-18-3.md) · [18.4](phase-18-4.md) · [18.5](phase-18-5.md)
- Fase 19: [19.1](phase-19-1.md) · [19.2](phase-19-2.md) · [19.3](phase-19-3.md)
- Fase 19.5: [19.5.1](phase-19-5-1.md) · [19.5.2](phase-19-5-2.md) · [19.5.3](phase-19-5-3.md) · [19.5.4](phase-19-5-4.md) · [19.5.5](phase-19-5-5.md)

Los textos de checkpoints históricos reflejan el estado en que fueron cerrados. Para conocer **qué está vigente ahora**, usar este índice y el roadmap canónico.


## Post-roadmap — Hardening técnico

El roadmap funcional 0–20.10 está cerrado y el hardening Post-roadmap 1–5 quedó completado. Post-roadmap 6 fue autorizado explícitamente después de ese cierre. La fuente canónica sigue siendo [`Roadmap septiembre 2026.txt`](Roadmap%20septiembre%202026.txt).

| Intervención | Alcance | Estado |
|---|---|---|
| Post-roadmap 1 | Períodos, contrato monetario, currency/locale y reglas automáticas | **Completada / Gate aprobado** · [evidencia](post-roadmap-1.md) |
| Post-roadmap 2 | Fecha financiera, loading y tema system | **Completada / Gate aprobado** · [evidencia](post-roadmap-2.md) |
| Post-roadmap 3 | Navegación URL/history y focus robusto | **Completada / Gate aprobado** · [evidencia](post-roadmap-3.md) |
| Post-roadmap 4 | Rendimiento medido en navegador | **Completada / Gate aprobado** · [evidencia](post-roadmap-4.md) |
| Post-roadmap 5 | Mantenibilidad, pruebas y pulido | **Completada / Gate aprobado** · [evidencia](post-roadmap-5.md) |
| Post-roadmap 6 | Inicio retroactivo de cuentas | **Completada / Gate aprobado** · [evidencia](post-roadmap-6.md) · PR #104 |

No existe Fase 20.11 ni Fase 21. No quedan intervenciones Post-roadmap autorizadas pendientes. La única secuencia adicional autorizada pendiente es **Final UI Polish P0–P7**.
