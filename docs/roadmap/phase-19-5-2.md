# Fase 19.5.2 — Persistencia financiera fuera de React

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.5.

Plan de ejecución: [phase-19-5.md](phase-19-5.md).

Estado: **completado**.

## Objetivo

Cerrar el hallazgo P0 de 19.5.1:

```text
React hook/context
≠ propietario de persistencia financiera
```

Los componentes, hooks y contexts pueden coordinar suscripciones y estado de UI, pero no deben importar ni operar la instancia Dexie financiera.

## Arquitectura aplicada

Antes:

```text
Component
→ React hook
  → useLiveQuery
    → db.*
```

Después:

```text
Component
→ React hook de suscripción
  → query no-React
    → Dexie
```

Una interfaz distinta puede consumir la query no-React directamente sin importar hooks ni componentes de GlitchBudget.

## Nueva capa de lectura

Se añadió:

```text
src/lib/finance-queries.ts
```

Contiene las lecturas que estaban repartidas entre hooks:

- snapshot financiero usado por `finance-context`;
- settings generales;
- categorías;
- reglas recurrentes;
- ocurrencias planificadas;
- cuentas + transferencias para Movimientos;
- cuentas;
- snapshot de Accounts Overview;
- snapshot de Investments Manager.

Esta capa importa `@/lib/db`, pero **no importa React, hooks ni `dexie-react-hooks`**.

## Adaptadores React

### `use-finance-context-data.ts`

Conserva `useLiveQuery` exclusivamente para suscribirse a:

```text
readFinanceContextData
readGeneralSettings
readCategories
readRecurringRules
readPlannedOccurrences
```

No conoce tablas Dexie ni `db`.

### `use-finance-queries.ts`

Conserva las suscripciones reactivas que necesita la UI, pero todas llaman funciones de `src/lib/finance-queries.ts`.

No conoce tablas Dexie ni `db`.

### `use-categories.ts`

Deja de usar Dexie/LiveQuery directamente y reutiliza `useCategoriesData()`.

## Hardening

Se endureció `.eslintrc.json`:

- `src/components/**`, `src/app/**` y `src/contexts/**` no pueden importar:
  - `@/lib/db`;
  - `dexie`;
  - `dexie-react-hooks`.
- `src/hooks/**` no puede importar:
  - `@/lib/db`;
  - `dexie`.

`dexie-react-hooks` queda permitido únicamente como mecanismo de suscripción en adaptadores de query, no como acceso directo a persistencia.

La regresión `tests/phase-19-5-2-persistence-boundary.test.ts` exige además que solo estos archivos importen `dexie-react-hooks`:

```text
src/hooks/use-finance-context-data.ts
src/hooks/use-finance-queries.ts
```

y verifica que `src/lib/finance-queries.ts` sea React-free.

## Files changed

```text
src/lib/finance-queries.ts
src/hooks/use-finance-context-data.ts
src/hooks/use-finance-queries.ts
src/hooks/use-categories.ts
.eslintrc.json
tests/phase-19-5-2-persistence-boundary.test.ts
docs/roadmap/phase-19-5-2.md
docs/roadmap/phase-19-5.md
docs/roadmap/README.md
```

## Schema changes

Ninguno.

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

## Migration behavior

No existe migración nueva.

No se resetea ni transforma la base.

## Invariantes afectadas

Ninguna regla financiera cambia.

Las mismas lecturas Dexie se ejecutan detrás de una frontera no-React.

## Tests added

`phase-19-5-2-persistence-boundary.test.ts` cubre:

- ausencia de `@/lib/db`, `dexie` y `db.*` en surfaces React;
- límite explícito de `dexie-react-hooks`;
- query layer React-free;
- hooks conectados a la query layer;
- presencia de guards ESLint sobre las cuatro superficies exigidas.

## Known limitations

19.5.2 no intenta resolver los residuos P1/P2 de 19.5.1.

Siguen deliberadamente para 19.5.3–19.5.4:

- agregados/proporciones financieras todavía presentes en algunos componentes;
- read models todavía reconstruidos parcialmente en UI;
- promedios/agrupación todavía presentes en `finance-context.tsx`;
- reglas de achievements todavía alojadas en un hook React.

## Resultado

El hallazgo P0 de persistencia queda cerrado:

```text
src/components/**  → no Dexie
src/app/**         → no Dexie
src/hooks/**       → no db / no tablas
src/contexts/**    → no Dexie

src/lib/finance-queries.ts
→ frontera de lectura persistente reutilizable sin React
```

El Prisma Engine Gate completo continúa abierto porque todavía faltan cálculos/read models y el barrido final.

La siguiente ejecución es **19.5.3 — Cálculos y read models reutilizables**. No iniciar automáticamente sin autorización del usuario.
