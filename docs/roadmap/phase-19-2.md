# Fase 19.2 — `finance-context.tsx` como fachada

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.
Plan de ejecución: [phase-19.md](phase-19.md).

Estado: **completado**.

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

Run final: `36590179498`.

Quedaron verdes:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Además, una regresión automática exige que `finance-context.tsx` no importe ni acceda directamente a Dexie, OPFS o los importadores/exportadores de backup.


## Resultado final

- `finance-context.tsx` no importa Dexie, `dexie-react-hooks`, OPFS ni helpers directos de backup;
- lectura reactiva encapsulada en `use-finance-context-data`;
- backup/restore encapsulado en `use-backup-management`;
- settings y deudas pasan por services;
- regresiones históricas 17.5/18.3/18.4 siguen verificando exactamente cifrado, preview y copia OPFS previa en la nueva ubicación;
- **424/424 pruebas**, 0 fallos;
- typecheck, lint y guard local-only aprobados;
- build estático aprobado;
- `connect-src 'none'` verificado en cada HTML.

19.2 queda cerrada. La siguiente etapa es **19.3 — componentes grandes + hardening + gate final**.
