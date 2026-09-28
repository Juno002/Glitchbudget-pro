# Fase 3 — Corrección del ledger y separación del modo estricto

> **Registro histórico de fase.** Conserva versiones, resultados y restricciones del momento de su cierre. Para el estado acumulado hasta Fase 10, las continuaciones autorizadas y los pendientes vigentes, consulta el [índice del roadmap](README.md).

Fecha: 2026-09-26. Alcance autorizado: exclusivamente Fase 3. Base aprobada: `90ef78a` (Fase 2). No se inicia Fase 4.

## Contrato y cambios intencionales respecto a Fase 2

| Operación | Antes | Ahora |
| --- | --- | --- |
| Gastos cash/bank | `strictMode` activaba protección de cuenta; movimientos legacy sin cuenta usaban previsión y reservas | `preventNegativeAccountBalance` comprueba únicamente el historial real de cuentas; presupuesto se evalúa por separado |
| Compras con tarjeta | Se validaba tarjeta, sin guard de categoría equivalente | Tarjeta activa y presupuesto de categoría; no consumen efectivo |
| Presupuesto | Mezclado con margen mensual en el guard legacy | `allow`, `warn`, `block`; compras cash/bank y tarjeta cuentan una vez; sin plan no hay límite implícito |
| Exceso existente | Dependía del guard aplicado | Solo crear o aumentar exceso provoca advertencia/bloqueo; reducirlo o mantenerlo permite editar |
| Transferencias | Protección de fondos siempre activa, incluso con strict desactivado | Respetan el nuevo control de cuentas; nunca se someten a presupuesto |
| Pagos de tarjeta | Protección vinculada al nombre ambiguo strict | Protección de cuenta independiente; no son gasto presupuestario repetido |
| Aportes a metas | Bloqueados por margen mensual insuficiente | Reserva/seguimiento: no exigen ingreso, liquidez ni margen; conservan validación y actualización atómica de meta |
| Edición legacy sin cuenta | Guard de sueldo previsto | Sigue sin afectar cuentas y sigue en actividad; sí se evalúa presupuesto. Asignar una cuenta activa su protección histórica |
| Configuración | Un único checkbox de modo estricto | Checkbox de protección de cuentas y selector de presupuesto; confirmación mínima antes de guardar |

RD$10,000 iniciales pueden financiar gastos aunque no haya ingreso mensual. RD$30,000 previstos no permiten gastar una cuenta protegida sin fondos. Una meta puede dejar `monthlyPlanningMargin` negativo sin falsificar la disponibilidad física.

## Protección de cuentas

`src/policies/account-protection.ts` contiene `accountFundsWorsen`, puro y sin reloj implícito. Compara el saldo posterior con `min(0, saldo anterior)` en las fechas relevantes de ambos historiales, inicio y corte. Se preserva un déficit previo si no empeora.

`requirePreservedAccountFunds` es el adaptador de aplicación. Se utiliza en gastos, edición/eliminación de ingresos, pagos, transferencias y reducción del saldo inicial. Una edición de transferencia protege también el destino cuando retira fondos ya gastados allí. La fecha anterior al inicio de una cuenta sigue siendo inválida. Las compras a crédito no consumen cuentas. No se añadieron APIs para eliminar pagos/transferencias; esas operaciones no existen en la UI actual.

## Presupuesto y confirmación

`src/policies/budget-overspending.ts` usa `selectCategorySpending` para comparar categoría/mes destino antes y después de la propuesta. No utiliza previsión, frecuencia proyectada ni margen de planificación. `BudgetWarning` devuelve los datos de evaluación sin persistir el gasto.

Orden: estructura/cuenta o tarjeta → fondos reales cuando corresponda → presupuesto → escritura, en una única transacción. Los cambios de categoría/mes evalúan el presupuesto destino.

`withBudgetConfirmation` espera fuera de IndexedDB. Cancelar devuelve false sin escritura; confirmar reintenta con una huella de la propuesta y estado presupuestario. Cada reintento vuelve a validar tarjeta, cuenta, fondos y política. Si cambió el presupuesto/gasto evaluado, pide otra confirmación; si ya no hay fondos o la política pasó a block, rechaza. La huella no incorpora el ID autogenerado de efectivo, pues una primera transacción abortada puede generar otro ID; los fondos siempre se revalidan.

El hook de confirmación presenta un AlertDialog accesible, permite cancelar y evita dos confirmaciones simultáneas. Se integra centralmente en altas y ediciones del contexto, incluidas las altas invocadas desde recurrentes. No hay toast que sustituya la aprobación previa.

## Migración y respaldos

`normalizeFinancialPolicies` es el único lugar que interpreta `strictMode`. Si faltan las nuevas propiedades: true → protección true + block; false/ausente → protección false + allow. Las propiedades explícitas tienen prioridad. La app nueva conserva el comportamiento inicial de protección true + block.

`readFinancialPolicies` persiste la conversión idempotente al inicializar o dentro de una transacción de escritura. Después, cambiar el flag antiguo no altera las dos políticas explícitas. El flag histórico solo permanece como dato de compatibilidad, sin setter ni consumidor de negocio activo.

Sin cambios de stores, índices, versión Dexie (v8) ni versión del respaldo (v4). Los nuevos ajustes se validan y se exportan/importan; respaldos antiguos v3/v4 derivan las políticas. Un valor de política inválido se rechaza antes de sustituir datos. Las migraciones congeladas v6/v7, round-trip integral, rollback y restauración de 10,000 movimientos siguen cubiertos.

## Separación de código

- Nuevos: `src/policies/{settings,account-protection,budget-overspending}.ts`.
- Nuevos adaptadores: `src/lib/{policy-settings,expense-confirmation,planning-forecast}.ts`.
- Nueva confirmación: `src/hooks/use-budget-confirmation.tsx`.
- Modificados: `src/lib/{accounts,transaction-service,backup-json,finance-calculations}.ts`, `src/contexts/finance-context.tsx`, `src/components/layout/header.tsx`, `src/domain/models.ts` (solo propiedades opcionales de Settings).
- Retirado de producción: `src/policies/legacy-finance.ts`. `monthlyAmount` permanece como previsión explícita para planificación.
- El oráculo congelado de Fase 2 vive exclusivamente en `tests/reference/phase2-finance.ts`: documenta diferencias históricas y mantiene characterization tests, sin importaciones desde producción.
- Nuevas pruebas: `tests/financial-policies.test.ts`; ajustes de compatibilidad/oráculo en `tests/{accounts,finance,domain,metric-characterization}.test.ts`.
- Las fórmulas de `src/domain/metrics.ts`, `src/domain/ledger.ts` y `src/domain/snapshot.ts` permanecen intactas. No se alteran categorías, períodos, recurrentes ni Quick Add.

## Validación de cierre

- `npm run check`: 107 tests; incluye tipos, lint, barrera local-only, políticas puras, concurrencia, fondos históricos, backup/migraciones y service worker.
- `npm run build`: export estático correcto, 44 recursos offline; verificación de ausencia de importador diagnóstico y CSP `connect-src 'none'` en cada HTML.
- El sandbox de Windows produjo `uv_os_get_passwd ENOMEM` al arrancar tsx. El gate se ejecutó correctamente fuera de esa restricción; no se modificó el código para eludir checks.
- Prueba de UI en origen aislado `127.0.0.1:9014`, exclusivamente con `tests/fixtures/backup-v4.json`. Tus datos habituales no se tocaron.
- Presupuesto RD$500 / gasto previo RD$300: proponer RD$300 mostró la confirmación con RD$600. Cancelar conservó formulario y RD$300. Confirmar dejó gasto RD$600 y cuentas RD$2,700, una sola vez.
- Servidor detenido y recarga: Dashboard/Reportes siguieron funcionando. Reportes mostró gasto RD$600, resultado RD$400 y cash flow RD$500, distinguiendo correctamente compras y pagos de tarjeta. Sin errores de consola observados.
- Evidencia: [confirmación previa](phase-3-warning.png) y [Reportes sin servidor](phase-3-offline.png).

## Límite de la entrega

La comprobación automática y la prueba local no equivalen a garantizar ausencia absoluta de bugs en todos los dispositivos. No se amplió UX ni se implementaron fases posteriores. El diseño de pantallas, espacio vacío de gráficos y Period Engine permanecen en sus fases autorizables correspondientes. Detención al cierre de Fase 3 para revisión del usuario.
