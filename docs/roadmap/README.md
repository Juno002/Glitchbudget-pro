# Roadmap: documentación vigente

## Fase 12 — Investments 1.0 completada

Fase 12 quedó cerrada técnicamente el **2026-09-28** contra `Roadmap septiembre 2026.txt`. El contrato completo está en [phase-12.md](phase-12.md).

Las inversiones pasan a ser activos no líquidos vinculados a cuentas `investment`. Una inversión nueva usa transferencia patrimonial desde una cuenta registrada; una inversión preexistente usa saldo inicial actual. Las proyecciones de vencimiento son locales y **no forman parte del patrimonio real**.

Persistencia actual: **Dexie v14 / JSON v10**, con lectura de backups v3–v9. El gate `Quality checks` run `36454064247` verificó **278/278 pruebas**, typecheck, lint, guard local-only y build estático. El manifiesto offline contiene **42 recursos** y cada HTML conserva `connect-src 'none'`.

**Estado actual del roadmap:** Fase 12 cerrada. **Fase 13 — Reports 2.0 no se ha iniciado** y no queda autorizada por continuidad implícita.

## Fase 11 — Currency foundation completada

Fase 11 quedó cerrada técnicamente el **2026-09-28** contra `Roadmap septiembre 2026.txt`. El contrato completo está en [phase-11.md](phase-11.md).

El cierre define **moneda base + `Account.currency`**, migra el esquema a **Dexie v13**, eleva el respaldo canónico a **JSON v9** y mantiene lectura de v3–v8. Las cuentas preexistentes adoptan la moneda base configurada; los movimientos actuales se normalizan sin alterar su valor numérico. No existe FX remoto ni conversión automática, y una operación cross-currency se rechaza mientras no exista una tasa manual explícita.

El gate `Quality checks` run `36450157254` verificó **268/268 pruebas**, typecheck, lint, guard local-only y build estático. El manifiesto offline contiene **42 recursos** y cada HTML conserva `connect-src 'none'`.

Fase 11 queda como fundamento histórico vigente de moneda para Investments 1.0.

## Fases 9 y 10 — completadas

**Fase 9 — Budgets 2.0** y **Fase 10 — Goals 2.0** están completadas e integradas en `main` desde el **2026-09-28** mediante el PR #6, con merge commit `60b50e964d34d441fb6e236a55ec5d8a3aa2ce29`. La continuación de ambas fases había sido autorizada el 2026-09-27.

Los contratos, migraciones, comprobaciones, invariantes financieras y límites quedan registrados en [phase-9.md](phase-9.md) y [phase-10.md](phase-10.md). El gate técnico integrado verificó **259/259 pruebas**, typecheck, lint, guard local-only y build estático; el manifiesto offline final contiene **42 recursos** y cada HTML conserva `connect-src 'none'`.

La fuente de verdad sigue siendo [`Roadmap septiembre 2026.txt`](../../Roadmap%20septiembre%202026.txt).

## Fase 8 — completada

Fase 8 — Quick Add 2.0 está cerrada contra `Roadmap septiembre 2026.txt`. El cierre histórico y la Definition of Done están en [phase-8.md](phase-8.md). Las fases posteriores autorizadas se registran arriba.

## Fase 7.5 — completada y aprobada

El usuario revisó y aprobó el Gate 7.5 el **2026-09-27**. Ese gate habilitó Fase 8 — Quick Add 2.0 sobre `TransactionModal`, conservando el compositor único. Los documentos siguientes preservan ese cierre histórico.

| Documento canónico | Función |
|---|---|
| [phase-7.5.md](phase-7.5.md) | Cierre completo y evidencia técnica registrada |
| [phase-7.5-gate.md](phase-7.5-gate.md) | Entregable formal de diez puntos y aprobación |
| [wireframes-phase-7.5.md](../ux/wireframes-phase-7.5.md) | Jerarquías vigentes de las seis superficies |

El contrato se desarrolla en [arquitectura UX](../ux/architecture.md) y [sistema de diseño](../ux/design-system.md). En Movimientos, el orden aprobado es **búsqueda → filtros → historial real → cuentas/tarjetas como gestión secundaria**.

El cierre histórico registraba 214/214 pruebas. La **revisión final contra `Roadmap septiembre 2026.txt`** añadió regresiones específicas para 7.5.17 y 7.5.19 y volvió a ejecutar el gate técnico: GitHub Actions `Quality checks` run 299 completó correctamente `npm run check` y `npm run build` antes del merge de cierre.

## Antecedentes históricos

[7.5A](phase-7.5a.md), [7.5B](phase-7.5b.md), [7.5C](phase-7.5c.md) y [7.5D](phase-7.5d.md) conservan la evolución y las pruebas de cada checkpoint. Sus pendientes o instrucciones de detenerse corresponden a esas iteraciones y no reabren el gate aprobado.

Los siguientes entregables de la primera implementación están **supersedidos y ausentes del árbol actual de main**:

- `phase-7-5-ux-architecture.md`
- `phase-7-5-validation.md`
- `phase-7-5-wireframes.html`
- `phase-7-5-summary.png`

No deben recrearse ni usarse como referencia canónica. Una copia local, captura o pestaña antigua puede mostrar otra jerarquía o el resultado anterior de 195 pruebas. Para la arquitectura vigente, utilizar los tres documentos canónicos enlazados arriba. El historial Git conserva los antecedentes que hayan sido versionados.
