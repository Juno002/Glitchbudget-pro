# Fase 2 — Inventario y revisión previa a extracción

> **Antecedente histórico supersedido:** este inventario previo fue completado por [Fase 2](phase-2.md). Sus propuestas y estado detenido no describen el estado vigente. Consulta el [índice acumulado hasta Fase 10](README.md).

Estado: **iniciada, detenida para revisión; no completada**. No se ha movido lógica ni cambiado comportamiento, esquema, UI, Strict Mode o contratos de respaldo.

## Mapa de cálculos y consumidores

| Origen | Interpretación actual | Consumidores |
| --- | --- | --- |
| finance-calculations.calculateRecordedTotals | Ingreso cobrado, gasto con y sin tarjeta, pagos, resultado, flujo y reservas mensuales | finance-context.getTotals; Dashboard, Plan, Reports, tendencias y servicio de aportes |
| finance-calculations.calculateTotals / expenseForMonth | Sueldo previsto más ingresos, gasto fijo proyectado, pagos, reservas y disponible truncado en cero | transaction-service.saveExpense, rama legacy sin accountId en Strict Mode; pruebas históricas |
| recordedExpenseForMonth / recordedCategories | Movimientos fechados en el mes; gasto fijo cuenta una vez | finance-context, categorías, presupuestos, gráficos; budget-rollover |
| accounts.accountEntries / accountBalance | Saldo inicial + movimientos vinculados desde startDate hasta through | accounts-overview, accountPosition, saveTransfer y verificaciones de fondos en servicios |
| accounts.debtBalance | Ajuste inicial + compras a crédito − pagos; signo negativo = saldo a favor | debts-tab, reports-tab, accountPosition, reconcileDebt |
| accounts.accountPosition | Efectivo + banco; pasivos positivos y saldos a favor separados; patrimonio | finance-context.getPosition, summary-tab, accounts-overview |
| accounts.requirePreservedAccountFunds / addAccount | Evita empeorar déficit en fechas afectadas | transaction-service y cuentas/transferencias; política Strict Mode, no métrica |
| transaction-service.requireAvailableCash | Resultado registrado menos reservas, no saldo efectivo | saveGoalContribution |
| budget-rollover.rollBudgetsIntoMonth | Límite menos gasto registrado; arrastra sobrante o déficit | Inicialización/cambio de mes en contexto; transacción idempotente |
| finance-context.getSpentAmount / getBudgetStatusDetails / transferencia de presupuesto | Suma por categoría, restante con signo, comprobación del límite transferible | Plan, presupuesto, reportes |
| finance-context.getMonthlyAverages / getDisposable | Promedio de meses presentes, ingresos menos gastos y colchón | goal-calculator, goals-manager; previsión, no activo líquido |
| finance-context agrupaciones por tipo | Total, número y media de gastos | Reportes y resúmenes |
| charts/cash-flow-chart | Ingreso versus gasto; excedente positivo o déficit; distribuye enlaces proporcionalmente | Reports. Pese al nombre del archivo, el título visible es «Resultado del mes»: no es cash flow |
| planning-tab | Restante positivo truncado para tarjeta de presupuesto y progreso | Plan; diferenciar de restante firmado en Reports |
| debts-tab / reports-tab | Límite principal − saldo firmado; utilización de crédito | Tarjetas y reportes; no activo patrimonial |
| summary-tab / percentage-spent-ring / budget-status / reports-tab | Porcentajes, topes visuales y agregaciones | Visualización; topes no deben alterar importes del dominio |
| goal-calculator | Cuotas, viabilidad, fechas, proyecciones y redondeo; usa reloj implícito | Metas; extracción futura necesita fecha explícita para pureza |

## Definiciones propuestas para el contrato canónico

Todas las cifras monetarias en centavos. Fecha de corte y mes deben ser argumentos explícitos; el dominio no consulta reloj, DB ni navegador. El universo incluye exclusivamente cuentas y tarjetas registradas, no patrimonio externo desconocido.

- **liquidAssets**: suma de saldos firmados de efectivo y bancos a la fecha. No incluye límite de crédito ni saldo a favor de tarjetas. Conservar saldos negativos actuales sin reclasificarlos silenciosamente como préstamo.
- **liabilities**: suma de max(0, saldo firmado de cada tarjeta). No compensar la deuda de una tarjeta con el saldo a favor de otra.
- **cardCreditAssets**: suma de max(0, −saldo firmado de cada tarjeta). Activo a favor, separado del efectivo; no confundir con crédito disponible para pedir prestado.
- **netWorth**: liquidAssets + cardCreditAssets − liabilities. Saldo inicial afecta posición, no ingreso mensual.
- **recordedIncome**: suma de ingresos registrados en el mes, sin sumar previsión de sueldo.
- **spending**: compras/gastos registrados en el mes, incluidos los de tarjeta. No incluye pagos de tarjeta, transferencias ni aportes a metas.
- **monthlyResult**: recordedIncome − spending. Reemplazo explícito de balance en calculateRecordedTotals.
- **cashFlow**: recordedIncome − cashSpending − cardPayments del mes. Transferencias internas se cancelan. No es saldo de cuentas; historial legacy sin cuenta puede impedir conciliarlo con cambios de posición.
- **budgetRemaining**: límite de categoría − spending de categoría, firmado. **unspentBudgetReservation**: max(0, budgetRemaining). No usar ambos nombres indistintamente.
- **plannedBudgetTotal**: suma de límites del mes; no es dinero apartado físicamente.
- **monthlyPlanningMargin**: monthlyResult − suma de unspentBudgetReservation − aportes del mes − ahorro sugerido. Es el significado actual de available registrado, admite negativos. No es liquidAssets ni capacidad garantizada de pago.
- **forecastIncome / legacyProjectedMargin**: previsión de sueldo y modelo heredado, separados de dinero real. No adoptar este último como selector canónico de capacidad de gasto.

Estas definiciones son propuestas para revisión, no cambios adoptados en producción ni selectors ya implementados.

## Contradicción que requiere revisión

1. `transaction-service.saveExpense` usa calculateTotals al editar ciertos gastos históricos sin accountId. Ese modelo añade sueldo previsto y proyecta gastos fijos. `requireAvailableCash` usa calculateRecordedTotals para aportes a metas. Ambos sirven a controles de «disponible», pero interpretan realidades distintas.
2. Ejemplo mínimo, sin movimientos ni reservas: sueldo previsto RD$ 1,000.00. Disponible legacy = RD$ 1,000.00; margen registrado = RD$ 0.00. Unificar la fórmula cambia aceptación/rechazo de operaciones legacy.
3. Aportes: una persona puede tener efectivo de saldo inicial y cero ingreso del mes. Tiene posición líquida, pero requireAvailableCash usa un margen mensual cero y puede rechazar el aporte. Corregir ese control cambia comportamiento visible y pertenece a la política de Strict Mode; no se cambia sin autorización.

Definición financiera correcta: previsión no es cobro, resultado mensual no es efectivo y capacidad de pago no se deduce únicamente del resultado mensual. Una reserva de meta no reduce patrimonio por sí sola. La política de permitir aportes usando saldo previo es una decisión explícita de producto, distinta de la definición de las métricas.

Recomendación para continuar Fase 2: autorizar mantener las políticas legacy y Strict Mode intactas, con adaptadores claramente nombrados, mientras se extraen selectors para métricas reales. Documentar las correcciones de aceptación/rechazo para Fase 3. Alternativamente, autorizar explícitamente un cambio visible; no se presupone esa autorización.

No se detecta contradicción entre monthlyResult y cashFlow: con ingresos 100000, compras cash 10000, compras tarjeta 20000 y pagos de tarjeta 10000, dan 70000 y 80000 respectivamente. Son métricas diferentes. El gráfico llamado CashFlowChart en código ya se presenta como Resultado del mes; renombrarlo no requiere cambiar sus cifras.

## Caracterización antes de mover código

Archivo nuevo: tests/metric-characterization.test.ts. Cuatro pruebas: diferencia resultado/flujo y efecto de pagos; divergencia legacy/registrado (documenta anomalía, no la legitima); reservas y margen sin alterar resultado/flujo; saldo a favor de tarjeta y límite de crédito excluido del activo.

Sin selectors creados todavía ni duplicaciones eliminadas: se respeta el punto de revisión solicitado. Las diez invariantes solicitadas siguen siendo criterios de aceptación para completar la extracción; estas cuatro pruebas iniciales no se presentan como cobertura completa de la Fase 2.

## Validación

npm run check aprobado: tipos, lint y 71 pruebas (4 nuevas). npm run build aprobado: salida estática, 44 recursos, sin importador diagnóstico y CSP connect-src none validada. Las pruebas de respaldo v4 y migraciones históricas pasan. Cambios limitados a este informe y pruebas. Compatibilidad Dexie v8 / JSON v4 intacta. Fase 3 no iniciada.
