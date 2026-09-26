# Fase 5 — Separación Actual vs Planned

Fecha: 2026-09-26. Alcance: completar la Fase 5 iniciada por Codex y detenida a mitad de implementación. Base de trabajo: commit `942c881`; cierre continuado en la rama `phase-5-completion`. No se inicia Fase 6.

## 1. Modelo final

Un movimiento representa únicamente un hecho registrado. La planificación recurrente vive en una entidad separada.

```ts
interface Expense {
  id: string;
  month: string;
  date: string;
  categoryId: string;
  amount: number;
  concept: string;
  nature: 'Fijo' | 'Variable' | 'Ocasional';
  accountId?: string;
  paymentMethod?: 'cash' | 'credit';
  debtId?: string;
  recurringRuleId?: string;
  // campos de moneda existentes...
}

interface RecurringRule {
  id: string;
  direction: 'income' | 'expense';
  title: string;
  categoryId: string;
  amount: number;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  day?: number;
  startDate: string;
  endDate?: string;
  active: boolean;
}
```

`nature` clasifica un gasto real; no genera movimientos futuros. `recurringRuleId` conserva únicamente procedencia histórica. Editar, desactivar o eliminar una regla no modifica movimientos ya registrados.

## 2. Naturaleza y frecuencia

`Fijo | Variable | Ocasional` permanece como naturaleza analítica del gasto.

`frequency` deja de formar parte del modelo activo de Expense. Un gasto fijo registrado en septiembre cuenta una sola vez en septiembre. No se proyecta automáticamente a octubre ni crea una regla recurrente.

Los respaldos/CSV antiguos con `type + frequency` se migran a `nature`; la frecuencia histórica no crea reglas nuevas.

## 3. RecurringRule

La planificación utiliza `direction` y `cadence`, separadas de los movimientos reales. El servicio `recurring-rule-service.ts` modifica exclusivamente datos de planificación y valida categoría/dirección.

Crear, editar, activar, desactivar o eliminar una regla no altera `liquidAssets`, `netWorth`, `recordedIncome`, `spending` ni `cashFlow`.

La tabla Dexie conserva el nombre físico `recurrents` para limitar riesgo de migración; el modelo activo y los consumidores usan `RecurringRule`.

## 4. Procedencia

Movimientos creados explícitamente desde una regla pueden guardar `recurringRuleId`.

La procedencia:
- no hace que el movimiento se repita;
- no exige que la regla continúe existiendo para conservar el historial;
- no puede reasignarse silenciosamente al editar un movimiento histórico;
- puede sobrevivir a la eliminación posterior de la regla.

## 5. Migración v9 → v10

Dexie v10 migra:
- Expense legacy `type` → `nature`;
- elimina `frequency` del registro activo;
- `recurringId` → `recurringRuleId`;
- Recurring legacy `type/freq` → `direction/cadence`.

La migración conserva importes, fechas, categorías, cuentas, tarjetas y procedencia. No crea reglas a partir de gastos fijos antiguos. Una migración inválida revierte sin reescritura parcial y conserva la base v9.

## 6. Respaldos

El contrato actual pasa a JSON v6.

v6 exporta:
- `nature` en gastos;
- `recurringRuleId` como procedencia opcional;
- `RecurringRule` con `direction/cadence`;
- no exporta `frequency`, el antiguo `Expense.type` ni `recurringId`.

v3/v4/v5 continúan importándose y se migran al modelo actual sin inventar reglas. El round-trip v6 se comprueba sobre su representación serializable; campos opcionales ausentes y propiedades `undefined` no se consideran diferencias del contrato JSON.

CSV acepta tanto gastos legacy como el formato canónico, sin crear reglas por inferencia.

## 7. Compatibilidad temporal mensual

`legacy-monthly-subscription-guard.ts` mantiene temporalmente el comportamiento de la UI actual: una regla **mensual** no puede registrar dos pagos asociados en el mismo mes.

Esto NO es identidad de ocurrencia ni selector de dominio.

Las reglas semanales y quincenales no están sujetas a ese límite. La Fase 7 debe retirar este guard y sustituirlo por ocurrencias explícitas con identidad propia.

## 8. UI mínima

Quick Add deja de mostrar frecuencia dentro del gasto. La naturaleza sigue disponible como `Fijo | Variable | Ocasional`.

El gestor actual de suscripciones continúa siendo una compatibilidad temporal:
- crea reglas mensuales;
- registrar pago crea un gasto real;
- reglas semanales/quincenales no usan el botón mensual y esperan al motor de ocurrencias de Fase 7.

No se hizo el rediseño de Fase 7.5/8.

## 9. Corrección de cuenta de destino de ingresos

Durante el cierre se detectó una contradicción con una decisión ya aprobada en fases anteriores: `saveIncome` seguía forzando Efectivo incluso cuando el usuario seleccionaba explícitamente un banco.

Se corrigió:
- Efectivo es el destino predeterminado solo cuando no se suministra `accountId`;
- una cuenta bancaria seleccionada se respeta desde la creación;
- TransactionModal y el formulario alternativo muestran selector de cuenta para ingresos.

Se añadieron regresiones para destino bancario explícito y fallback a Efectivo.

## 10. Invariantes verificadas

La suite demuestra, entre otros casos:
- gasto fijo real cuenta una vez y no crea futuros movimientos;
- un gasto fijo no crea RecurringRule;
- reglas recurrentes no mueven dinero por sí solas;
- registrar explícitamente un pago afecta métricas una sola vez;
- editar/eliminar una regla no modifica el movimiento histórico;
- procedencia sobrevive a la eliminación de la regla;
- semanal/quincenal no quedan limitados artificialmente a un pago por mes;
- `baseIncome` y reglas de ingreso no aumentan ingreso registrado ni activos;
- v9→v10 conserva métricas y referencias;
- v3/v4/v5 migran sin inventar recurrencias;
- v6 hace round-trip del contrato serializable;
- CSV legacy/canónico preserva naturaleza/procedencia;
- un ingreso puede registrarse directamente en banco o usar Efectivo por defecto.

## 11. Validación

GitHub Actions sobre el cierre de la rama:
- `npm run check`: aprobado;
- **132 pruebas aprobadas, 0 fallidas**;
- TypeScript y ESLint: aprobados;
- guard local-only: aprobado;
- `npm run build`: aprobado;
- exportación estática generada;
- manifiesto offline generado con 42 recursos;
- CSP/local-only continúan cubiertos por las pruebas existentes.

No se ejecutó una prueba manual de navegador con el servidor detenido desde este entorno. La capacidad offline permanece cubierta por la suite del service worker/local-only y por el build estático; se mantiene pendiente el smoke test manual antes de release, no como cambio de lógica de esta fase.

## 12. Archivos temporales y roadmap

Se retiraron del repositorio los logs fallidos `phase5-check.log` y `phase5-types.log`.

La lista final del roadmap vuelve a incluir explícitamente:
`7 → 7.5 UX Architecture & Design System → 8`.

## Gate

Fase 5 cerrada en la rama `phase-5-completion`. Fase 6 no iniciada.