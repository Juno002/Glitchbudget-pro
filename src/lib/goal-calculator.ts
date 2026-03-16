// Este módulo contiene la lógica pura de cálculo para la planificación de metas.
// Se basa en el modelo proporcionado por el usuario.

type Money = number;
export type SuggestionProfile = 'conservative' | 'balanced' | 'aggressive';

export interface Averages {
  incomeAvgMonthly: Money;
  expenseAvgMonthly: Money;
}

/**
 * Calcula el dinero disponible mensual después de gastos y un colchón de seguridad.
 */
export function computeDisposable(avg: Averages, safetyPct = 0.05): Money {
  const safety = avg.incomeAvgMonthly * safetyPct;
  return Math.max(avg.incomeAvgMonthly - avg.expenseAvgMonthly - safety, 0);
}

/**
 * Calcula el número de meses completos entre dos fechas.
 */
export function monthsBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  const y = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  const d = to.getDate() - from.getDate();
  // Si no ha pasado un mes completo en términos de días, no lo contamos
  const monthCorrection = d < 0 ? -1 : 0;
  return Math.max(y * 12 + m + monthCorrection, 0);
}


/**
 * Añade un número de meses a una fecha.
 */
export function addMonths(date: Date, m: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
}

function round2(n: number) { 
  return Math.round(n * 100) / 100; 
}


/**
 * MODO A: Sugiere un plan de ahorro mensual basado en un perfil de riesgo.
 */
export function suggestMonthly(
  target: Money,
  current: Money,
  disposable: Money,
  profile: SuggestionProfile
) {
  const R = Math.max(target - current, 0);
  if (R <= 0) return { monthly: 0, months: 0, eta: new Date(), viable: true };

  const pct = profile === 'conservative' ? 0.30 : profile === 'balanced' ? 0.50 : 0.70;
  const m = Math.min(disposable * pct, R);
  
  if (m <= 0.01) return { monthly: 0, months: Infinity, eta: null, viable: false };

  const months = Math.ceil(R / m);
  const eta = addMonths(new Date(), months);
  return { monthly: round2(m), months, eta, viable: true };
}


/**
 * MODO B: Calcula el aporte mensual requerido para alcanzar una meta en una fecha específica.
 */
export function requiredMonthlyByDeadline(
    target: Money, 
    current: Money, 
    deadlineISO: string, 
    disposable: Money
) {
  const R = Math.max(target - current, 0);
  if (R <= 0) return { monthlyRequired: 0, months: 0, viable: true, altEta: new Date(), altMonths: 0, deficit: 0 };
  
  const q = Math.max(monthsBetween(new Date(), new Date(deadlineISO)), 1);
  const mReq = round2(R / q);
  const viable = mReq <= disposable;

  let altMonths = q;
  let altEta = new Date(deadlineISO);
  if (!viable) {
    altMonths = Math.ceil(R / Math.max(disposable, 1));
    altEta = addMonths(new Date(), altMonths);
  }

  return { 
    monthlyRequired: mReq, 
    months: q, 
    viable, 
    altEta, 
    altMonths, 
    deficit: Math.max(mReq - disposable, 0) 
  };
}


/**
 * MODO C: Valida la viabilidad de un plan basado en cuotas y montos fijos.
 */
export function viabilityByInstallments(
    target: Money, 
    current: Money, 
    monthly: Money, 
    installments: number, 
    disposable: Money
) {
  const R = Math.max(target - current, 0);
  const total = monthly * installments;
  const viable = monthly <= disposable && total >= R;
  
  const neededInstallments = Math.ceil(R / Math.max(monthly, 1));
  const neededMonthly = round2(R / Math.max(installments, 1));

  return {
    viable,
    total,
    neededInstallments,
    neededMonthly,
    deficitPerMonth: Math.max(neededMonthly - disposable, 0),
    eta: addMonths(new Date(), viable ? installments : neededInstallments)
  };
}
