# Fase 20.1 — Preflight técnico previo a la incorporación visual

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 20.

Estado: **completado**.

Este documento registra un hardening previo dentro de 20.1. **No cierra 20.1**: el contrato visual y el inventario de paridad definidos por el roadmap siguen pendientes.

## Motivo

Antes de reemplazar superficies visuales se reforzaron tres áreas que protegen los datos y las invariantes durante una migración UI amplia:

1. durabilidad del almacenamiento local;
2. propiedades generales del ledger;
3. un recorrido end-to-end real sobre la build offline.

## Persistent storage

Se añadió una frontera pequeña en `src/lib/storage-persistence.ts` alrededor de:

```text
navigator.storage.persisted()
navigator.storage.persist()
```

Ajustes → Datos y backups ahora distingue:

- almacenamiento persistente concedido;
- almacenamiento best-effort;
- API no soportada;
- error de consulta.

La solicitud es explícita. Un navegador puede denegarla y la aplicación continúa funcionando.

La UI deja claro que persistent storage **no sustituye un backup externo**.

## Property-based ledger suite

`tests/phase-20-1-ledger-properties.test.ts` ejecuta **1 200 escenarios generados** de forma determinista y reproducible.

Propiedades protegidas:

- transferencias internas conservan liquid assets y net worth;
- compras con tarjeta aumentan spending/pasivo sin reducir liquid cash;
- pagos de deuda reducen efectivo y pasivo por igual sin cambiar net worth;
- gastos cash reducen liquid assets, net worth y cash flow por el mismo importe.

No se añadió una dependencia externa de property testing: el generador usa semillas deterministas para que cualquier fallo pueda reproducirse exactamente.

## Browser E2E

Se añadió `scripts/e2e-smoke.mjs`, sin dependencias nuevas.

El smoke utiliza Chrome/Chromium real contra la salida estática `out/` y cubre:

```text
fresh install
→ crear ingreso desde Quick Add
→ crear gasto desde Quick Add
→ abrir Movimientos
→ comprobar ambos movimientos
→ esperar service worker
→ simular offline
→ recargar
→ app operativa desde caché
```

El E2E también falla si la página emite requests HTTP(S) a un origen externo durante el recorrido.

CI ejecuta ahora:

```text
npm ci
→ npm run check
→ npm run build
→ npm run test:e2e
```

## Evidencia de cierre

PR: **#42 — Fase 20.1 preflight — storage durability, ledger properties, browser E2E**

Merge:

```text
addb91ccd93207f64cfbf8c6a3f883f01dec3be7
```

Quality checks final:

```text
run 36617612176
463/463 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
```

El primer intento del E2E expuso dos defectos del harness —cleanup del perfil temporal de Chrome y una expresión CSS mal cerrada—. Ambos se corrigieron; no se debilitó ni se eliminó el gate.

## Persistencia e invariantes

Sin cambios de schema o formato:

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

No cambió semántica financiera, backup, migraciones, commands o read models.

## Siguiente paso

Continuar 20.1 con el trabajo originalmente definido:

```text
contrato visual
+ inventario completo de superficies
+ matriz de paridad
+ inventario protegido de gráficos / sonidos / animaciones
```

20.2 no comienza hasta cerrar ese gate.
