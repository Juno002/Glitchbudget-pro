# Fase 19.2 — `finance-context.tsx` como fachada

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.
Plan de ejecución: [phase-19.md](phase-19.md).

Estado: **en ejecución**.

## Objetivo

Reducir `finance-context.tsx` a una fachada de composición que coordina hooks, commands/services y selectors, en lugar de acceder directamente a persistencia o gestionar subsistemas completos.

## Extracciones

### Lectura reactiva

Las suscripciones Dexie del contexto pasan a:

```text
src/hooks/use-finance-context-data.ts
```

El contexto consume el resultado del hook y no importa `db` ni `dexie-react-hooks`.

### Settings

Persistencia e inicialización pasan a:

```text
src/lib/settings-service.ts
```

Incluye:

- normalización inicial de políticas;
- seed de defaults;
- update individual;
- update parcial;
- reset explícito de settings.

### Deudas

Las escrituras directas de tarjetas/deudas pasan a:

```text
src/lib/debt-service.ts
```

La protección de integridad histórica al eliminar una tarjeta permanece dentro de la transacción de persistencia.

### Backup / restore

El subsistema de OPFS, JSON normal y restore cifrado pasa a:

```text
src/hooks/use-backup-management.ts
```

El contexto solo expone la fachada existente.

## API pública

La intención de 19.2 es preservar la API de `useFinances()` para no mezclar este refactor con el trabajo de componentes de 19.3.

## Persistencia

Sin cambios:

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

No se modifica ninguna fórmula financiera ni migración.

## Gate

Antes de cerrar 19.2:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Además, una regresión automática exige que `finance-context.tsx` no importe ni acceda directamente a Dexie, OPFS o los importadores/exportadores de backup.
