import type { Account, Investment } from './models';
import { selectAccountBalance, type AccountSnapshot } from './ledger';

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4,6,9,11].includes(month) ? 30 : 31;
}

/** Gregorian civil date -> deterministic day ordinal, with no clock/timezone dependency. */
function dayNumber(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Fecha de inversión inválida.');
  let year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error('Fecha de inversión inválida.');
  }

  year -= month <= 2 ? 1 : 0;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const shiftedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra;
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


export type InvestmentManagerSnapshot = AccountSnapshot & {
  investments: Investment[];
  accounts: Account[];
};

export function selectInvestmentManagerRows(data: InvestmentManagerSnapshot, asOf: string) {
  return [...data.investments]
    .sort((a, b) =>
      (a.maturityDate || '9999-12-31').localeCompare(b.maturityDate || '9999-12-31')
      || a.name.localeCompare(b.name, 'es'),
    )
    .flatMap(investment => {
      const account = data.accounts.find(item => item.id === investment.accountId);
      if (!account) return [];
      return [{
        investment,
        account,
        currentValue: selectAccountBalance(account, data, asOf),
        projection: investmentProjection(investment, asOf),
      }];
    });
}
