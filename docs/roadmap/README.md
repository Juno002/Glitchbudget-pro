# Roadmap — índice vigente

Este archivo es un **índice de estado y navegación**. No reemplaza la especificación funcional.

**Fuente de verdad:** [`Roadmap septiembre 2026.txt`](../../Roadmap%20septiembre%202026.txt).

## Estado actual

- Fases **0–19.5: completadas**.
- **Fase 20 — Modo Prisma:** 20.1–20.8 completadas / Gates aprobados; 20.9 en curso con 20.9.1–20.9.8 cerradas; 20.10 planificada.
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
- **20.9 — Premium UI Polish:** en curso; 20.9.1–20.9.8 completadas / Gates aprobados.
- **20.10 — Repository Consolidation + Product README:** etapa final planificada.

## Próxima intervención autorizada

```text
20.9.9 — Pixel / interaction sweep + Gate 20.9
```

La secuencia pendiente está cerrada por el roadmap canónico:

```text
20.9.9
20.10.1 → 20.10.7
```

No crear 20.11, Fase 21 ni microintervenciones nuevas sin modificar primero `Roadmap septiembre 2026.txt` con aprobación explícita. Los documentos auxiliares, chats, ramas o README no pueden ampliar el roadmap por sí solos.

Baseline técnico actual:

```text
Dexie v15
Backup JSON v13
Encrypted envelope v1
635/635 tests
Ledger benchmark: 50k position 34.69 ms / histories 25.63 ms median
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
Quality checks 36912136865 ✅
browser E2E Prisma branding + secondary surfaces + responsive shell + Home desktop/mobile + Movimientos/composer + Plan + Reports desktop/mobile/charts + movement + offline ✅
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
| 20.9 — Premium UI Polish | **En curso — 20.9.1–20.9.8 completadas / Gates aprobados** | [phase-20-9.md](phase-20-9.md) |
| 20.10 — Repository Consolidation + Product README | Planificada | [phase-20-10.md](phase-20-10.md) |

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
