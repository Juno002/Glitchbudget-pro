# Fase 11 — Currency foundation

Fuente de verdad: Roadmap septiembre 2026.txt, Fase 11.

Estado: **completada técnicamente**.

## Objetivo

Preparar la infraestructura monetaria antes de Investments sin introducir un sistema FX completo ni reinterpretar importes existentes.

La fase define explícitamente una **moneda base** y una **moneda por cuenta**, manteniendo una sola semántica financiera para el ledger actual.

## Contrato vigente

### Moneda base

- Settings.currency es la moneda base.
- Se normaliza como código de tres letras en mayúsculas, por ejemplo DOP o USD.
- No existe consulta remota de tasas de cambio.
- Cambiar la moneda base no convierte importes existentes.
- La UI solo permite cambiarla mientras el conjunto financiero está limpio: sin saldos iniciales distintos de cero, movimientos, presupuestos, metas, deudas ni reglas con importes.
- Si ya existen importes, el cambio se rechaza para evitar reinterpretar silenciosamente centavos de una moneda como otra.

### Cuentas

Account incluye ahora el campo obligatorio currency.

En Fase 11 todas las cuentas creadas por la aplicación usan la moneda base.

Migración Dexie v12 → v13: las cuentas existentes adoptan la moneda base configurada. Si la configuración histórica es DOP, las cuentas pasan a DOP; si la configuración válida ya usa otra moneda base, se respeta esa base.

No se habilita todavía la creación normal de cuentas en una segunda moneda. Esto evita que posición, patrimonio y saldos agreguen monedas incompatibles sin conversión.

### Movimientos

Los ingresos, gastos y pagos de tarjeta ligados a una cuenta se guardan con la moneda de esa cuenta. En el contrato admitido por Fase 11 esa moneda coincide con la base:

- currency = account.currency
- fxRate = 1
- amountBase = amount

Los movimientos históricos sin cuenta y las compras a crédito se normalizan a la moneda base porque hasta Fase 10 sus métricas ya interpretaban amount directamente como monto canónico.

Fase 11 añade metadatos explícitos y no cambia saldos por una conversión retroactiva.

### Transferencias

Las transferencias entre cuentas siguen siendo patrimoniales y no crean ingreso ni gasto.

Fase 11 solo admite transferencias entre cuentas con la misma moneda. Si las monedas difieren, la operación se rechaza.

Una futura transferencia cross-currency requerirá una tasa manual explícita. No se inventa una tasa y no se consulta una API.

### FxRate

La entidad FxRate se conserva como infraestructura local existente, pero Fase 11 no la convierte en una fuente automática para el ledger ni añade descarga remota de FX.

## Persistencia y compatibilidad

### Dexie

Esquema actual: **v13**.

La migración v13:

1. normaliza la moneda base;
2. asigna esa base a todas las cuentas pre-Fase-11;
3. normaliza ingresos, gastos y pagos históricos con fxRate = 1 y amountBase = amount;
4. no cambia el valor numérico de amount, saldos iniciales ni transferencias.

Las migraciones históricas continúan pasando por sus fases originales antes de llegar a v13.

### Backup JSON

Contrato actual: **JSON v9**.

v9 exige moneda explícita en cuentas y metadatos monetarios canónicos en ingresos, gastos y pagos.

Se mantiene lectura de backups v3–v8. Al importarlos:

- la moneda base se obtiene de los ajustes, con DOP como fallback;
- las cuentas legacy adoptan esa base;
- los movimientos adoptan la moneda de su cuenta o la base;
- fxRate queda en 1 y amountBase conserva el importe que el ledger histórico ya utilizaba;
- un backup v9 con cuentas en otra moneda se rechaza mientras no exista conversión manual.

### CSV

Los CSV de ingresos y gastos conservan las columnas currency, fxRate y amountBase, pero al importar no se permite inyectar una moneda diferente a la cuenta seleccionada.

Para el contrato actual:

- currency = account/base currency
- fxRate = 1
- amountBase = amount

## UI

- Ajustes muestra y permite definir la moneda base bajo las restricciones anteriores.
- Los importes generales se formatean usando la moneda base configurada.
- Las cuentas muestran su código de moneda.
- Los selectores de cuenta muestran también la moneda.
- No se muestra un selector de moneda extranjera para nuevas cuentas porque Fase 11 todavía no implementa conversión.
- No existe control de tasa FX remota.

## Invariantes

Fase 11 debe mantener:

1. ningún cambio automático de valor por introducir metadatos de moneda;
2. ninguna suma silenciosa de dos monedas admitidas por la UI;
3. ninguna transferencia cross-currency sin información suficiente;
4. ninguna llamada de red para obtener FX;
5. import/export legacy sin pérdida de saldos;
6. las protecciones de saldo, presupuestos, metas y ocurrencias planificadas sin cambio semántico;
7. connect-src 'none' en el build de producción.

## Fuera de alcance

No pertenecen a Fase 11:

- cotizaciones FX remotas;
- actualización automática de tasas;
- conversión automática al cambiar la moneda base;
- flujo UI de transferencia cross-currency;
- cuentas extranjeras operativas con patrimonio agregado;
- Investments 1.0.

La tasa manual queda como requisito explícito para un soporte cross-currency posterior.

## Pruebas específicas

tests/phase-11-currency.test.ts cubre:

- cambio seguro de moneda base solo con datos financieros limpios;
- cuentas nuevas en moneda base;
- rechazo de cuentas extranjeras en el contrato actual;
- moneda y amountBase de movimientos;
- rechazo de transferencias cross-currency;
- migración Dexie v12 → v13;
- migración usando una base configurada distinta de DOP;
- importación de backup v8 y reexportación v9;
- rechazo de backup v9 con cuenta extranjera;
- normalización de CSV que intenta declarar otra moneda.

Las regresiones históricas fueron actualizadas únicamente cuando el nuevo contrato v13/v9 modifica de forma intencional los metadatos de moneda.

## Gate

GitHub Actions `Quality checks` run `36450157254`, sobre el commit de cierre documental de la rama de Fase 11:

- `npm run check`: **268/268 pruebas**, 0 fallos;
- typecheck: aprobado;
- lint con cero warnings: aprobado;
- guard local-only: aprobado;
- `npm run build`: aprobado;
- manifiesto offline: **42 recursos**;
- salida estática: verificada;
- CSP: `connect-src 'none'` en cada página HTML.

El gate no utilizó datos financieros reales del navegador habitual del usuario.

Fase 12 — Investments 1.0 **no se inicia automáticamente**.
