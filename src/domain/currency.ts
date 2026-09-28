export const DEFAULT_BASE_CURRENCY = 'DOP';

const CURRENCY_CODE = /^[A-Z]{3}$/;

export function normalizeCurrencyCode(value: unknown, fallback = DEFAULT_BASE_CURRENCY): string {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (CURRENCY_CODE.test(candidate)) return candidate;
  const safeFallback = typeof fallback === 'string' ? fallback.trim().toUpperCase() : '';
  return CURRENCY_CODE.test(safeFallback) ? safeFallback : DEFAULT_BASE_CURRENCY;
}

export function requireCurrencyCode(value: unknown): string {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!CURRENCY_CODE.test(candidate)) {
    throw new Error('Usa un código de moneda de tres letras, por ejemplo DOP o USD.');
  }
  return candidate;
}

export function isBaseCurrency(currency: string | undefined, baseCurrency: string): boolean {
  return normalizeCurrencyCode(currency, baseCurrency) === normalizeCurrencyCode(baseCurrency);
}
