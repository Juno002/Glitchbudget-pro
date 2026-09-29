# Roadmap: documentación vigente

## Fase 19 — Technical-debt closure completada

La fuente funcional única sigue siendo `Roadmap septiembre 2026.txt`.

Fase 19 quedó cerrada en tres checkpoints documentados en [phase-19.md](phase-19.md):

- [19.1](phase-19-1.md) — frontera UI → queries/services: **completado**;
- [19.2](phase-19-2.md) — `finance-context.tsx` como fachada: **completado**;
- [19.3](phase-19-3.md) — componentes grandes + hardening + gate final: **completado**.

19.1 eliminó los accesos directos a Dexie desde `src/components` y `src/app` y añadió guards permanentes.

19.2 retiró de `finance-context.tsx` el acceso directo a Dexie, settings persistence, deuda persistente y el subsistema de backup/restore/OPFS, conservando la API pública de `useFinances()`.

19.3 extrajo responsabilidades independientes de `TransactionModal`, `ReportsTab` y `AccountsOverview`; `GoalsManager` fue auditado y se mantuvo cohesivo para evitar fragmentación artificial.

El gate final de código `36592149312` verificó **426/426 pruebas**, typecheck, lint, guards arquitectónicos/local-only y build estático. `connect-src 'none'` continúa presente en cada HTML.

Persistencia e invariantes permanecen sin cambios: **Dexie v14 / JSON v13 / encrypted envelope v1** y ninguna fórmula financiera nueva.

**Estado actual:** Fase 19 completada. La siguiente fase canónica es **Fase 19.5 — Residual architecture cleanup / Prisma Engine Gate**, todavía no iniciada.


## Fase 18 — Backup 2.0 y migraciones permanentes completada

La fuente funcional única sigue siendo `Roadmap septiembre 2026.txt`. Fase 18 se ejecutó en **cinco iteraciones**, documentadas en [phase-18.md](phase-18.md):

- [18.1](phase-18-1.md) — contrato/versionado;
- [18.2](phase-18-2.md) — cobertura automática de tablas;
- [18.3](phase-18-3.md) — preview + confirmación de import;
- [18.4](phase-18-4.md) — backup OPFS automático pre-import;
- [18.5](phase-18-5.md) — migraciones permanentes + hardening + gate final.

El contrato final permanece en **Dexie v14 / JSON v13 / app 0.1.0 / encrypted envelope v1**.

El cierre 18.5 fija un gate permanente contra estrategias destructivas de migración, exige una historia Dexie incremental sin huecos, preserva los fixtures históricos v6/v7, mantiene fail-closed la cobertura de las 16 tablas, conserva compatibilidad JSON v3–v12 y vuelve a verificar preview, restore JSON/cifrado y copia OPFS previa.

No hay schema change ni migración nueva en 18.5. `db.clear()` o recrear la DB continúan prohibidos como estrategia de migración; el clear transaccional del restore sigue siendo una operación explícita de importación validada, no una migración.

**Estado actual:** Fase 18 completada. La siguiente fase canónica es **Fase 19 — Technical-debt closure**, todavía no iniciada. No entrar en Fase 19 sin autorización explícita del usuario.

## Fase 17 — Seguridad y privacidad local completada

La fuente funcional única sigue siendo `Roadmap septiembre 2026.txt`. Fase 17 quedó cerrada en cinco iteraciones: [17.1](phase-17-1.md) contrato de seguridad local, [17.2](phase-17-2.md) App lock, [17.3](phase-17-3.md) Auto-lock, [17.4](phase-17-4.md) backup cifrado opcional y [17.5](phase-17-5.md) restore cifrado + hardening + gate final.

Estado final:

- **Hide amounts** = privacidad visual, no cifrado.
- **App lock** = barrera local de UI con PIN verificado mediante PBKDF2; no cifra Dexie.
- **Auto-lock** = bloqueo de sesión por inactividad/foreground y depende de App lock.
- **Backup cifrado** = sobre `GlitchBudget encrypted backup` v1 con PBKDF2-SHA-256 y AES-256-GCM autenticado.
- **Restore cifrado** = valida/autentica/descifra antes de invocar el importador JSON canónico.
- Contraseña incorrecta, corrupción o envelope inválido no producen restore parcial.
- El backup JSON normal continúa disponible y el importador mantiene contratos **v3–v12**.
- Dexie permanece en **v14** y JSON normal en **v12**.
- PIN/contraseñas no se transmiten; el flujo continúa local-only.

El gate funcional final de 17.5 (`36533876517`) verificó **379/379 pruebas**, typecheck, lint, guard local-only y build estático; manifiesto offline de **42 recursos** y `connect-src 'none'` en cada HTML.

La Definition of Done, formatos y limitaciones quedan registradas en [phase-17-5.md](phase-17-5.md).

**Estado actual:** Fase 17 completada. **Fase 18 es la siguiente fase del roadmap, pero no está iniciada.** No entrar en Fase 18 sin autorización explícita del usuario.

## Fase 16 — Automatización local completada

Fase 16 quedó cerrada mediante **siete iteraciones**, documentadas en [phase-16.md](phase-16.md): [16.1](phase-16-1.md) contrato, [16.2](phase-16-2.md) motor determinista, [16.3](phase-16-3.md) suggestions, [16.4](phase-16-4.md) gestión local, [16.5](phase-16-5.md) integración **Templates → Saved filters → Rules**, [16.6](phase-16-6.md) auto-apply opcional por Rule y [16.7](phase-16-7.md) hardening + gate final.

La política final de precedencia es **stored-order-manual-on-automatic-conflict**: el orden guardado define evaluación/presentación, pero con dos o más Rules automáticas compatibles no existe ganador implícito; se vuelve a decisión manual.

El backup completo sube a **JSON v12** e incluye `localAutomation.templates`, `localAutomation.savedFilters` y `localAutomation.rules`. Backups v3–v11 siguen siendo compatibles y preservan la automatización local existente; v12 la restaura explícitamente. Dexie permanece en **v14**.

Las invariantes de toda la fase quedan preservadas: **cero IA, cero transmisión de descripciones, cero red para evaluar/aplicar Rules, ningún movimiento guardado automáticamente y ninguna alteración de las invariantes financieras**.

El gate final `Quality checks` run `36503687919` verificó **339/339 pruebas**, typecheck, lint, guard local-only y build estático; manifiesto offline de **42 recursos** y `connect-src 'none'` en cada HTML.

**Estado actual del roadmap:** Fase 16 completada. La siguiente fase canónica es **Fase 17 — Seguridad y privacidad local**, todavía no iniciada.

## Fase 15 — Transaction Metadata + filtros completada

Fase 15 quedó cerrada técnicamente el **2026-09-28** contra `Roadmap septiembre 2026.txt`. El contrato completo está en [phase-15.md](phase-15.md).

Los gastos admiten `necessity: must | need | want` y labels; ingresos admiten labels. Movimientos implementa filtros por **account, category, date, amount, necessity, label y type**, con presets guardados exclusivamente en `localStorage`.

No hay migración Dexie: el esquema permanece en **v14** porque la metadata es opcional y no indexada. El backup canónico sube a **JSON v11**, con lectura de v3–v10 y soporte CSV para los nuevos campos.

El gate `Quality checks` run `36471585078` verificó **300/300 pruebas**, typecheck, lint, guard local-only y build estático. El manifiesto offline contiene **42 recursos** y cada HTML conserva `connect-src 'none'`.

Fase 15 queda como fundamento vigente de Templates + Saved Filters antes de Rules.

## Fase 14 — Home 2.0 completada

Fase 14 quedó cerrada técnicamente el **2026-09-28** contra `Roadmap septiembre 2026.txt`. El contrato completo está en [phase-14.md](phase-14.md).

Home utiliza un read model explícito en `src/domain/home.ts` y consume los selectors financieros ya estabilizados. La superficie principal queda limitada a **Posición, Presupuesto, Próximos, Metas e Inversiones**. Movimientos recientes sale de Home y la preferencia de ahorro se traslada a Ajustes → Finanzas.

La personalización **show/hide + reorder + default opening section** vive únicamente en `localStorage`; no altera Dexie ni backups. Fase 14 no cambia persistencia: se mantiene **Dexie v14 / JSON v10**.

El gate `Quality checks` run `36468191021` verificó **292/292 pruebas**, typecheck, lint, guard local-only y build estático. El manifiesto offline contiene **42 recursos** y cada HTML conserva `connect-src 'none'`.

Fase 14 queda como fundamento vigente del Home sobre el que Fase 15 no introduce nuevas fórmulas financieras.

## Fase 13 — Reports 2.0 completada

Fase 13 quedó cerrada técnicamente el **2026-09-28** contra `Roadmap septiembre 2026.txt`. El contrato completo está en [phase-13.md](phase-13.md).

Reports 2.0 centraliza en `src/domain/reports.ts` los selectors de Spending, Cash Flow, Net Worth, comparación y rangos. **Resumen y Reportes consumen el mismo `selectReportsSnapshot`**; cambia el rango solicitado, no la fórmula.

Rangos implementados: **7D, 30D, 3M, 6M, 1Y y Custom**. El previous comparable period es la ventana inmediatamente anterior con igual número de días.

Fase 13 no cambia persistencia: se mantiene **Dexie v14 / JSON v10**. El gate `Quality checks` run `36458493360` verificó **286/286 pruebas**, typecheck, lint, guard local-only y build estático. El manifiesto offline contiene **42 recursos** y cada HTML conserva `connect-src 'none'`.

Fase 13 queda como fundamento analítico vigente del read model de Home 2.0.

## Fase 12 — Investments 1.0 completada

Fase 12 quedó cerrada técnicamente el **2026-09-28** contra `Roadmap septiembre 2026.txt`. El contrato completo está en [phase-12.md](phase-12.md).

Las inversiones pasan a ser activos no líquidos vinculados a cuentas `investment`. Una inversión nueva usa transferencia patrimonial desde una cuenta registrada; una inversión preexistente usa saldo inicial actual. Las proyecciones de vencimiento son locales y **no forman parte del patrimonio real**.

Persistencia actual: **Dexie v14 / JSON v10**, con lectura de backups v3–v9. El gate `Quality checks` run `36454064247` verificó **278/278 pruebas**, typecheck, lint, guard local-only y build estático. El manifiesto offline contiene **42 recursos** y cada HTML conserva `connect-src 'none'`.

Fase 12 queda como fundamento patrimonial vigente para Net Worth en Reports 2.0.

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
