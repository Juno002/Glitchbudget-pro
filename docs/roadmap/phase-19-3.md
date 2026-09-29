# Fase 19.3 — Componentes grandes + hardening + gate final

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.
Plan de ejecución: [phase-19.md](phase-19.md).

Estado: **completado**.

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

Run de código final: `36592149312`.

Quedaron verdes:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Además deben seguir verdes los guards local-only, backup/migration y límites arquitectónicos de 19.1–19.3.

19.3 debe cerrar **Fase 19** y detenerse antes de **Fase 19.5**.


## Resultado final

- `TransactionModal` delega plantillas y feedback de Rules a una superficie propia;
- `ReportsTab` delega los controles de rango;
- `AccountsOverview` delega el controlador de cuentas, transferencias, conciliación y saldo inicial;
- `GoalsManager` fue auditado y se mantiene sin fragmentación artificial;
- las regresiones históricas de Fases 8, 13 y 16 fueron reorientadas a las nuevas ubicaciones sin relajar contratos;
- **426/426 pruebas**, 0 fallos;
- typecheck, lint y guards arquitectónicos/local-only aprobados;
- build estático aprobado;
- `connect-src 'none'` verificado en cada HTML.

Fase 19 queda cerrada. La siguiente fase canónica es **Fase 19.5 — Residual architecture cleanup / Prisma Engine Gate**, que permanece **no iniciada**.
