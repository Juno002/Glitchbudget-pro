# Fase 19.1 — Frontera UI → queries/services

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.
Plan de ejecución: [phase-19.md](phase-19.md).

Estado: **completado**.

## Auditoría inicial

La auditoría de `src/components` y `src/app` encontró accesos directos a Dexie en:

- `MovementsView.tsx`;
- `account-select.tsx`;
- `accounts-overview.tsx`;
- `category-maintenance.tsx`;
- `investments-manager.tsx`;
- `settings-dialog.tsx`.

También existían imports de tipos desde `@/lib/db` en componentes.

## Cambio aplicado

19.1 introduce una frontera explícita:

```text
Component / App UI
→ hooks de lectura / application service
→ Dexie
```

El reset total de datos continúa siendo una acción destructiva explícita del usuario; moverlo a un service no lo convierte en migración y no altera la prohibición de resets destructivos durante migraciones.

## Persistencia

Sin cambio de schema ni formato de backup.

```text
Dexie v14
Backup JSON v13
```

## Gate

Run `36587989589` completado correctamente.

Quedaron verdes:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Además, ningún archivo de `src/components` o `src/app` puede importar directamente `@/lib/db` ni `dexie-react-hooks`.


## Resultado final

- cero imports directos de `@/lib/db` en `src/components` y `src/app`;
- cero imports de `dexie-react-hooks` en esas superficies UI;
- lecturas reactivas movidas a `src/hooks/use-finance-queries.ts`;
- reset destructivo explícito movido a `src/lib/data-reset-service.ts`;
- ESLint y test de regresión bloquean reintroducciones;
- sin cambios de Dexie v14, JSON v13 ni semántica financiera.

19.1 queda cerrada. La siguiente etapa es **19.2 — `finance-context.tsx` como fachada**.
