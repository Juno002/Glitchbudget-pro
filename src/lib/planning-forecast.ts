/** Salary forecast for planning only. Never assets or payment capacity. */
export function monthlyAmount(freq: string, amount: number): number { return freq === 'quincenal' ? amount * 2 : freq === 'semanal' ? Math.round(amount * 4.33) : amount; }
