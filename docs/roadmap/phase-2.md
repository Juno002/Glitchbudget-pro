# Fase 2 — Dominio financiero canónico

## Resultado y alcance

Completada la extracción de métricas existentes sin cambios de cifras, interfaz funcional, aceptación/rechazo, categorías, períodos, recurrentes ni Quick Add. La separación de políticas legacy fue aprobada explícitamente después de la revisión inicial. No se inició Fase 3.

El [inventario previo](phase-2-review.md) conserva el mapa de cálculos y las contradicciones detectadas antes de extraer. Sus definiciones eran propuestas; las de este documento constituyen el contrato adoptado. El nombre definitivo para saldos a favor es **cardPositiveBalance**.

## Definiciones adoptadas

Importes en centavos, sin conversiones nuevas ni redondeos nuevos. El universo patrimonial sigue siendo las cuentas y tarjetas registradas. Las funciones de posición reciben fecha de corte explícita; las de actividad reciben el mes explícito. Ninguna lee reloj, React, Dexie, browser APIs o red.

| Métrica | Definición | No significa |
| --- | --- | --- |
| liquidAssets | Efectivo + bancos a la fecha, desde su saldo inicial y movimientos vinculados | Crédito disponible, previsión o margen presupuestario |
| liabilities | Suma de saldos positivos adeudados en tarjetas | Suma neteada contra otra tarjeta con saldo a favor |
| cardPositiveBalance | Suma de saldos negativos de tarjetas tomados en positivo | Límite de crédito ni dinero líquido |
| netWorth | liquidAssets + cardPositiveBalance − liabilities | Ingresos del mes |
| recordedIncome | Ingresos registrados con fecha en el mes | Sueldo previsto |
| spending | Compras cash/bank y tarjeta registradas en el mes | Pagos de tarjeta, transferencias o reservas |
| monthlyResult | recordedIncome − spending | Cash flow ni saldo de cuentas |
| cashFlow | recordedIncome − cashSpending − cardPayments | Resultado contable de compras a crédito |
| budgetRemaining | Límite − gasto registrado por categoría, firmado | Reserva siempre positiva |
| unspentBudgetReservation | max(0, budgetRemaining) | Dinero movido a otra cuenta |
| plannedBudgetTotal | Suma de límites del mes | Activos |
| planningReservations | Reservas presupuestarias pendientes + aportes del mes + ahorro sugerido | Pasivos ni salidas físicas |
| monthlyPlanningMargin | monthlyResult − planningReservations, firmado | Liquidez ni capacidad real de pago |
| selectCardAvailableLimit | Límite de tarjeta − saldo firmado | Activo; nunca se suma al patrimonio |

Los saldos negativos de cuentas se conservan firmados. Las tarjetas cerradas conservan su posición registrada. Los préstamos tipo loan siguen fuera de la posición agregada, igual que antes: ampliar ese universo sería cambio visible, no una corrección silenciosa de esta fase.

## Funciones y modelos

- `src/domain/models.ts`: tipos trasladados desde db.ts, sin cambiar campos ni contratos. db.ts los reexporta para compatibilidad.
- `src/domain/snapshot.ts`: datos de actividad; sus settings requieren solo savePct, no sueldo previsto.
- `src/domain/metrics.ts`: selectMonthlyMetrics, recordedExpenseForMonth, recordedCategories, selectCategorySpending, selectBudgetRemaining, selectRolloverLimit, selectMonthlyResultSplit.
- `src/domain/ledger.ts`: selectAccountEntries, selectAccountBalance, selectCardSignedBalance, selectPosition, selectCardAvailableLimit. Fecha de corte obligatoria.
- `src/policies/legacy-finance.ts`: legacyProjectedTotals, legacyProjectedExpenseForMonth, monthlyAmount, legacyExpensePolicyRejects y legacyGoalContributionPolicyRejects. Fuera del dominio canónico. No representan capacidad real de pago.

Las funciones de lib/accounts que añaden la fecha actual son adaptadores de aplicación. calculateRecordedTotals y accountPosition mantienen únicamente un mapeo de nombres antiguos para compatibilidad/pruebas. calculateTotals y expenseForMonth reexportan explícitamente la política legacy; no se consumen como métricas canónicas en UI. `balance` genérico solo sobrevive en esos contratos de compatibilidad/policy; los consumidores mensuales activos usan monthlyResult.

## Consumidores y duplicaciones eliminadas

- finance-context.getTotals usa selectMonthlyMetrics; getPosition usa selectPosition con fecha suministrada por la aplicación.
- Dashboard, anillos, logros basados en gastos, Plan y Reports consumen recordedIncome, spending, monthlyResult, cardPayments, monthlyPlanningMargin o liquidAssets según su significado previo.
- accounts-overview usa netWorth directamente, eliminando su suma patrimonial paralela.
- Tarjetas y reportes comparten saldo firmado y cálculo de límite disponible.
- Cálculo de gasto por categoría compartido entre contexto, transferencia de presupuesto y rollover. Restante presupuestario compartido con Plan; conserva la diferencia entre restante firmado y reserva truncada.
- El promedio mensual del contexto reutiliza spending canónico en vez de sumar de nuevo gastos.
- CashFlowChart pasa a MonthlyResultChart. Mantiene título, aspecto y cifras; usa el resultado mensual y su partición excedente/déficit canónicos.
- Los cálculos de cuentas y tarjetas se retiraron de lib/accounts hacia ledger; los servicios de escritura siguen controlando atomicidad y fondos con los mismos valores.

Se mantienen porcentajes de presentación, reparto geométrico del Sankey, agrupaciones por tipo, sugerencias de metas y proyecciones de calendario fuera de esta extracción. No son nuevas fuentes de liquidez; sus políticas de promedio/fecha/redondeo no se cambiaron.

## Políticas preservadas y pendientes de Fase 3

1. Gastos legacy sin cuenta: sueldo previsto, periodicidad de fijos y margen legacy siguen determinando la aceptación en Strict Mode. Editar un déficit sin empeorarlo sigue permitido; empeorarlo sigue rechazado.
2. Aportes a metas: se conserva el umbral de margen mensual, aunque existan saldos iniciales; no se presenta ese umbral como efectivo real. Reserva de metas no modifica patrimonio.
3. Historial sin accountId: sigue contando en actividad mensual, pero no se asigna retrospectivamente a cuentas. Por ello cashFlow histórico no necesariamente concilia con el cambio de activos vinculados.
4. El mes incluye todos sus registros; la posición usa corte de hoy. No se ocultaron registros posteriores del mes ni se amplió el corte de posición para igualarlos.
5. Promedios de metas usan meses presentes y proyecciones con reloj de aplicación, como antes. No reinterpretar esta sugerencia como capacidad garantizada de pago.

No se descubrieron ni aplicaron cambios de comportamiento nuevos. La separación de nombres hace explícitas diferencias existentes. Resolver políticas o ampliar préstamos/otras clases de activos requiere autorización posterior.

## Pruebas y compatibilidad

Las 4 pruebas de caracterización se crearon y pasaron antes de mover lógica. Se mantienen intactas. Se añadieron 15 pruebas en tests/domain.test.ts: las diez invariantes solicitadas, cortes de fecha, no mutación, restante firmado y rollover, límites de crédito, preservación de políticas legacy y aislamiento del dominio.

- Ingreso aumenta activo e ingreso; gasto cash/bank reduce activo y aumenta spending.
- Compra con tarjeta aumenta spending y pasivo sin tocar efectivo; pago reduce activo y pasivo sin repetir spending.
- Transferencia conserva patrimonio, ingreso, spending y flujo agregado.
- Presupuestos, planificados, previsiones y metas no mueven dinero ni patrimonio por sí solos.
- Crédito disponible excluido del activo; saldo a favor separado de efectivo y de pasivos de otras tarjetas.

Dexie sigue en v8. La clase y las migraciones de db.ts no cambian: solo se movieron interfaces y se reexportaron. JSON v4 permanece compatible. La suite incluye restore v3/v4, round-trip de las 13 tablas y saldos, conservación en migraciones v6/v7, rollback y concurrencia. No se abrió ni modificó la base del usuario.

## Validación final

- npm run check: aprobado; 86 pruebas, 0 fallidas, tipos y lint correctos.
- npm run build: aprobado; todas las rutas estáticas, 44 recursos precache, CSP connect-src 'none' y ausencia del importador diagnóstico verificados.
- Backups v3/v4 y migraciones históricas: pasan dentro de la suite. Las métricas restauradas siguen iguales.
- Comparación literal de la clase GlitchBudgetDB con el commit previo: idéntica, incluidas versiones y migraciones.
- Prueba manual aislada en 9013: cargar producción, detener el servidor, recargar Resumen y abrir Reportes desde caché. Ambos renderizan con métricas cero sin datos de usuario. [Captura](phase-2-offline.png). No es una prueba exhaustiva de todos los dispositivos ni de todos los flujos UI; las invariantes con datos están cubiertas en los tests.
- Servidor de prueba detenido; pestaña cerrada. Ningún despliegue ni push.

Fase 2 completada. Detenerse antes de Fase 3 para revisión.


## Archivos modificados o incorporados

- `docs/roadmap/phase-2-offline.png`
- `docs/roadmap/phase-2.md`
- `src/components/dashboard/accounts-overview.tsx`
- `src/components/dashboard/charts/cash-flow-chart.tsx`
- `src/components/dashboard/charts/monthly-result-chart.tsx`
- `src/components/dashboard/charts/percentage-spent-ring.tsx`
- `src/components/dashboard/dashboard-content.tsx`
- `src/components/dashboard/debts-tab.tsx`
- `src/components/dashboard/planning-tab.tsx`
- `src/components/dashboard/reports-tab.tsx`
- `src/components/dashboard/summary-tab.tsx`
- `src/contexts/finance-context.tsx`
- `src/domain/ledger.ts`
- `src/domain/metrics.ts`
- `src/domain/models.ts`
- `src/domain/snapshot.ts`
- `src/lib/accounts.ts`
- `src/lib/budget-rollover.ts`
- `src/lib/db.ts`
- `src/lib/finance-calculations.ts`
- `src/lib/transaction-service.ts`
- `src/policies/legacy-finance.ts`
- `tests/domain.test.ts`
