# Roadmap — índice vigente

Este archivo es un **índice de estado y navegación**. No reemplaza la especificación funcional.

**Fuente de verdad:** [`Roadmap septiembre 2026.txt`](../../Roadmap%20septiembre%202026.txt).

## Estado actual

- Fases **0–19.5: completadas**.
- **Fase 20 — Modo Prisma:** 20.1–20.7 y 20.7.5 completadas; 20.8–20.10 planificadas.
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
- **20.8 — Information Design + Deterministic Insights:** planificada.
- **20.9 — Premium UI Polish:** planificada.
- **20.10 — Repository Consolidation + Product README:** etapa final planificada.

## Próxima intervención autorizada

```text
20.8.1 — Comparative financial snapshot
```

La secuencia pendiente está cerrada por el roadmap canónico:

```text
20.8.1 → 20.8.8
20.9.1 → 20.9.9
20.10.1 → 20.10.7
```

No crear 20.11, Fase 21 ni microintervenciones nuevas sin modificar primero `Roadmap septiembre 2026.txt` con aprobación explícita. Los documentos auxiliares, chats, ramas o README no pueden ampliar el roadmap por sí solos.

Baseline técnico actual:

```text
Dexie v15
Backup JSON v13
Encrypted envelope v1
540/540 tests
Ledger benchmark: 50k position 32.22 ms / histories 23.68 ms median
Golden reconciliation: net worth 1.205m / spending 90k / cash flow 340k
Final hardening manifest: debt/date/currency/backup/migrations/architecture ✅
Quality checks 36797160206 ✅
browser E2E Prisma branding + secondary surfaces + responsive shell + Home + Movimientos/composer + Plan + Reports/charts + movement + offline ✅
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
| 20.8 — Information Design + Deterministic Insights | Planificada | [phase-20-8.md](phase-20-8.md) |
| 20.9 — Premium UI Polish | Planificada | [phase-20-9.md](phase-20-9.md) |
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
