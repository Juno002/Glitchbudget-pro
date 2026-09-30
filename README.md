# GlitchBudget Pro

[![Quality checks](https://github.com/Juno002/Glitchbudget-pro/actions/workflows/checks.yml/badge.svg)](https://github.com/Juno002/Glitchbudget-pro/actions/workflows/checks.yml)

Aplicación de finanzas personales **local-first**, **offline-capable** y orientada a privacidad. Los datos financieros permanecen en el navegador: no hay cuentas, backend de aplicación, sincronización bancaria, telemetría financiera ni servicios remotos que reciban movimientos.

> **Estado del proyecto — 30 sep 2026:** Fases 0–19.5 completadas. Fase 20 — **Modo Prisma / transformación visual y branding** iniciada. **20.1, 20.2, 20.3, 20.4, 20.5 y 20.6 están completadas con sus Gates aprobados**; 20.7 — superficies secundarias + branding Prisma + gate final — es la siguiente etapa.
>
> Este README es la vista general del repositorio. La especificación canónica de ejecución vive en [Roadmap septiembre 2026.txt](Roadmap%20septiembre%202026.txt).

## Producto

GlitchBudget registra y analiza dinero real sin confundirlo con planificación futura.

Las cuatro áreas principales son:

- **Resumen** — posición actual, presupuesto, próximos movimientos, metas e inversiones.
- **Movimientos** — ingresos, gastos, transferencias, cuentas, tarjetas, filtros y metadata.
- **Plan** — presupuestos, metas y pagos planificados.
- **Reportes** — Spending, Cash Flow, Net Worth, categorías, naturaleza del gasto y comparaciones por período.

También incluye Quick Add, Templates, Saved Filters, Rules locales, recurrencias, tarjetas/deuda, inversiones, múltiples rangos de reporte, backups, App Lock, Auto-lock, ocultación de importes, sonidos y animaciones.

## Invariantes financieras

El núcleo financiero mantiene reglas explícitas y testeadas:

- los importes persistidos se almacenan como **enteros en centavos**;
- una compra con tarjeta cuenta como gasto y aumenta el pasivo, sin reducir efectivo;
- pagar una tarjeta reduce efectivo y pasivo, sin volver a crear gasto;
- una transferencia entre cuentas no es ingreso ni gasto;
- un presupuesto no mueve dinero;
- un pago planificado no mueve dinero hasta confirmarse;
- una meta no altera patrimonio por sí sola;
- financiar una inversión mueve patrimonio líquido a invertido, no crea gasto;
- una proyección de inversión no se suma automáticamente al patrimonio real.

## Arquitectura

```text
React UI
  ↓
facades / adapters
  ↓
commands · services · queries
  ↓
domain selectors · policies
  ↓
Dexie / local persistence
```

Fronteras protegidas:

- **UI ≠ reglas financieras**
- **UI ≠ acceso financiero directo a Dexie**
- **React ≠ requisito del dominio**
- **persistencia ≠ cálculo financiero**
- los cálculos canónicos tienen una única fuente de dominio;
- las mutaciones financieras pasan por commands/services;
- las pantallas consumen queries/selectors/read models.

El Prisma Engine Gate de Fase 19.5 cerró específicamente estas fronteras antes de comenzar la transformación visual.

## Privacidad, almacenamiento y backups

La build de producción es estática y funciona offline.

- `connect-src 'none'` se verifica en cada HTML generado.
- `npm run check:local` bloquea primitivas de red, rutas de servidor y SDKs remotos conocidos en el código de aplicación.
- El service worker no reenvía operaciones, queries ni requests desconocidos a la red.
- **App Lock protege la interfaz; no cifra IndexedDB ni los archivos del dispositivo.**
- Hide amounts es privacidad visual, no cifrado.
- Ajustes → Datos y backups muestra si el navegador concedió **persistent storage** y permite solicitarlo cuando está disponible.
- Aun con persistent storage, se recomienda conservar un backup externo.

Contratos actuales:

```text
Dexie schema        v14
Backup JSON         v13
Encrypted envelope  v1
```

El backup cifrado usa PBKDF2-SHA-256 con 310 000 iteraciones y AES-256-GCM autenticado. El import cifrado autentica y descifra antes de entrar al importador JSON canónico. Una contraseña incorrecta o un archivo alterado no deben producir un restore parcial.

Templates, Saved Filters y Rules locales forman parte del backup canónico y del round-trip de restore.

## Calidad

El gate actual del repositorio es:

```bash
npm ci
npm run check
npm run build
npm run test:e2e
```

`npm run check` incluye el guard local-only, typecheck, lint y tests.

Baseline vigente al cerrar Fase 20.6:

- **495/495 tests**;
- suite determinista de propiedades del ledger con **1 200 escenarios generados**;
- build estática + manifest offline;
- browser E2E sobre Chrome/Chromium real;
- E2E: verificar shell + Home Prisma → compositor/Movimientos Prisma → crear ingreso/gasto → recorrer Plan Prisma → Reportes Prisma + cinco gráficos + 7D/Custom → recargar offline desde service worker;
- Quality checks **36670721688** verdes en el PR #49.

La suite de propiedades comprueba, entre otras cosas, conservación patrimonial en transferencias, semántica de compras con tarjeta, pagos de deuda y gastos de efectivo.

## Desarrollo local

Requiere **Node.js 22+**.

```bash
npm ci
npm run dev
```

Desarrollo: `http://localhost:9002`.

Para verificar la salida de producción:

```bash
npm run check
npm run build
npm run test:e2e
npm start -- --port 9011
```

El contenido desplegable es `out/`. No requiere un runtime Next de servidor en producción.

## Estructura

```text
src/
├── app/            # entrada PWA / composición
├── components/     # UI, dashboard, settings, backup, security
├── contexts/       # fachadas y estado React
├── domain/         # modelos, selectors y cálculos puros
├── hooks/          # adapters React / queries
├── lib/            # services, queries, persistence helpers, backup
└── policies/       # invariantes y políticas financieras

tests/              # dominio, integración, migración, seguridad, arquitectura
scripts/            # guards, build/offline, preview y browser E2E
docs/               # contratos, UX y cierres de fases
```

## Roadmap

La fuente funcional única es:

- [Roadmap septiembre 2026.txt](Roadmap%20septiembre%202026.txt)

Documentación de ejecución:

- [Índice vigente](docs/roadmap/README.md)
- [Fase 20 — Modo Prisma](docs/roadmap/phase-20.md)
- [Prisma UI System](docs/ux/prisma-mode.md)
- [Preflight técnico 20.1](docs/roadmap/phase-20-1-preflight.md)
- [Gate 20.1 — contrato visual + inventario de paridad](docs/roadmap/phase-20-1.md)
- [Gate 20.2 — design system, temas y shell](docs/roadmap/phase-20-2.md)
- [Gate 20.3 — Resumen / Home Prisma](docs/roadmap/phase-20-3.md)
- [Gate 20.4 — Movimientos + compositor global Prisma](docs/roadmap/phase-20-4.md)
- [Gate 20.5 — Plan Prisma](docs/roadmap/phase-20-5.md)
- [Gate 20.6 — Reportes + sistema de gráficos Prisma](docs/roadmap/phase-20-6.md)

Fase 20 mantiene **GlitchBudget Engine** como único motor financiero y utiliza el repositorio Prisma únicamente como referencia visual. El producto visible pasará a llamarse **Prisma** al aprobar el Gate 20.7. Ese cambio es branding: identificadores persistentes como `GlitchBudgetDB` no se renombran solo por estética.

## Principio de evolución

No hay rewrite total.

Cada cambio debe preservar datos e invariantes, pasar su gate y mantener backup, migraciones, offline y privacidad. Una superficie visual no sustituye a la anterior hasta demostrar paridad funcional.
