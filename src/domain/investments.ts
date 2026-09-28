import type { Investment } from './models';

const MS_PER_DAY = 86_400_000;

function dayNumber(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Fecha de inversión inválida.');
  const [, y, m, d] = match;
  const time = Date.UTC(Number(y), Number(m) - 1, Number(d));
  const date = new Date(time);
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) {
    throw new Error('Fecha de inversión inválida.');
  }
  return Math.floor(time / MS_PER_DAY);
}

export type InvestmentProjection = {
  elapsedPercentage: number | null;
  daysRemaining: number | null;
  estimatedMaturityValue: number | null;
  estimatedInterest: number | null;
  maturityReached: boolean;
};

export function investmentProjection(investment: Investment, asOf: string): InvestmentProjection {
  const opened = dayNumber(investment.openedAt);
  const today = dayNumber(asOf);
  const maturity = investment.maturityDate ? dayNumber(investment.maturityDate) : null;

  if (maturity !== null && maturity < opened) throw new Error('El vencimiento no puede ser anterior a la apertura.');

  const totalDays = maturity === null ? null : Math.max(1, maturity - opened);
  const elapsedDays = totalDays === null ? null : Math.min(totalDays, Math.max(0, today - opened));
  const elapsedPercentage = totalDays === null || elapsedDays === null ? null : Math.round((elapsedDays / totalDays) * 10_000) / 100;
  const daysRemaining = maturity === null ? null : Math.max(0, maturity - today);
  const maturityReached = maturity !== null && today >= maturity;

  if (maturity === null || investment.annualRate === undefined) {
    return { elapsedPercentage, daysRemaining, estimatedMaturityValue:null, estimatedInterest:null, maturityReached };
  }

  const years = Math.max(0, maturity - opened) / 365;
  const rate = investment.annualRate;
  const method = investment.compoundingMethod || 'simple';
  let factor: number;
  if (method === 'simple') factor = 1 + rate * years;
  else {
    const periodsPerYear = method === 'monthly' ? 12 : method === 'quarterly' ? 4 : 1;
    factor = Math.pow(1 + rate / periodsPerYear, periodsPerYear * years);
  }
  const estimatedMaturityValue = Math.round(investment.principal * factor);
  return {
    elapsedPercentage,
    daysRemaining,
    estimatedMaturityValue,
    estimatedInterest: estimatedMaturityValue - investment.principal,
    maturityReached,
  };
}
