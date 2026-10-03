import { isCanonicalFinancialDate } from './financial-date';
import { shiftPeriodId } from './periods';

export const ACCOUNT_RETROACTIVE_START_MONTHS = 1;

export function accountStartDateBounds(today: string): { min: string; max: string } {
  if (!isCanonicalFinancialDate(today)) throw new Error('Fecha financiera actual inválida.');
  const earliestMonth = shiftPeriodId(today.slice(0, 7), -ACCOUNT_RETROACTIVE_START_MONTHS);
  return { min: `${earliestMonth}-01`, max: today };
}

export function assertAccountStartDateAllowed(startDate: string, today: string): string {
  if (!isCanonicalFinancialDate(startDate)) throw new Error('Selecciona una fecha inicial válida.');
  const { min, max } = accountStartDateBounds(today);
  if (startDate > max) throw new Error('La fecha inicial no puede estar en el futuro.');
  if (startDate < min) throw new Error(`La fecha inicial no puede ser anterior a ${min}.`);
  return startDate;
}
