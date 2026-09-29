# Fase 19.3 — Componentes grandes + hardening + gate final

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.
Plan de ejecución: [phase-19.md](phase-19.md).

Estado: **en ejecución**.

## Auditoría de componentes

### `TransactionModal`

Era la superficie claramente sobredimensionada (~760 líneas) y mezclaba:

- formulario principal;
- selección y guardado de plantillas;
- feedback de reglas automáticas/manuales;
- persistencia del movimiento.

19.3 extrae las superficies de automatización/plantillas a:

```text
src/components/dashboard/transaction-modal-automation.tsx
```

El modal conserva el estado transaccional y los commands para no crear una segunda fuente de verdad.

### `ReportsTab`

El selector de rango es una responsabilidad autocontenida. Se extrae a:

```text
src/components/dashboard/report-range-controls.tsx
```

Los cálculos continúan viniendo de `domain/reports` y de los selectors expuestos por la fachada financiera.

### `AccountsOverview`

La vista mezclaba presentación de posición financiera con el controlador de:

- cuentas;
- transferencias;
- conciliación de tarjetas;
- corrección de saldo inicial.

Ese controlador pasa a:

```text
src/hooks/use-account-management.ts
```

La vista sigue consumiendo queries/selectors para lectura y delega commands al controlador.

### `GoalsManager`

Revisado explícitamente. Tiene ~110 líneas, ya separa `ContributeDialog` y consume dominio/commands sin persistencia directa.

**Decisión:** no dividirlo más. Hacerlo solo para reducir líneas violaría el criterio de la Fase 19 de extraer responsabilidades independientes y no fragmentar por tamaño arbitrario.

## Hardening

Una regresión nueva exige:

- que las extracciones anteriores permanezcan activas;
- que `AccountsOverview` no vuelva a alojar commands de persistencia de cuenta;
- que `GoalsManager` permanezca libre de Dexie directo;
- que la frontera de `finance-context` de 19.2 siga intacta.

## Persistencia e invariantes

Sin cambios:

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

No se cambian fórmulas financieras, schema, migraciones, backups ni semántica de cuentas, tarjetas, metas o reportes.

## Gate final de Fase 19

Antes de cerrar Fase 19:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Además deben seguir verdes los guards local-only, backup/migration y límites arquitectónicos de 19.1–19.3.

19.3 debe cerrar **Fase 19** y detenerse antes de **Fase 19.5**.
