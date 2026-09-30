import type { Debt } from './models';

export type DebtSemanticContract = {
  role: 'supported' | 'historical_compatibility';
  principalMeaning: string;
  canonicalBalance: string;
  reducingMovements: string;
  netWorthImpact: string;
  allowedActions: readonly string[];
  uiRepresentation: string;
  backupCompatibility: string;
};

/**
 * Phase 20.7.5.1 freezes meaning only. It deliberately does not change
 * persistence, migrations or ledger calculations; 20.7.5.2 applies it.
 */
export const DEBT_SEMANTICS: Record<Debt['type'], DebtSemanticContract> = {
  credit_card: {
    role: 'supported',
    principalMeaning: 'approved credit limit; never an asset and never the outstanding balance',
    canonicalBalance: 'openingAdjustment + linked credit purchases - linked debt payments, through the requested date; negative means cardholder surplus',
    reducingMovements: 'DebtPayment rows linked by debtId reduce the signed balance; refunds/reversals require an explicit supported ledger movement rather than reinterpreting principal',
    netWorthImpact: 'positive signed balance is a liability; negative signed balance is a positive card balance asset; approved limit never enters net worth',
    allowedActions: ['create', 'record_credit_purchase', 'record_payment', 'reconcile', 'close_or_preserve_history'],
    uiRepresentation: 'Tarjeta: show pending balance or balance in favor plus available limit; never present approved limit as owned money',
    backupCompatibility: 'preserve all card fields, linked expenses, payments and openingAdjustment on export/restore',
  },
  loan: {
    role: 'historical_compatibility',
    principalMeaning: 'historical outstanding principal at the debt baseline; unlike credit_card it is not a credit limit',
    canonicalBalance: 'max(0, principal + openingAdjustment - linked debt payments) through the requested date; credit-card purchases never increase a loan',
    reducingMovements: 'only DebtPayment rows linked by debtId reduce the loan in the current persisted model',
    netWorthImpact: 'active positive canonical balance is a liability and reduces net worth; closed loan contributes zero liability but its history is preserved',
    allowedActions: ['restore', 'export', 'view_read_only_history'],
    uiRepresentation: 'Imported loan must remain identifiable as a historical loan and read-only; it must not be rendered or operated on as a credit card',
    backupCompatibility: 'preserve loan row, status, principal, openingAdjustment and linked payments exactly enough for backward-compatible round-trip',
  },
};

export function debtSemanticContract(type: Debt['type']): DebtSemanticContract {
  return DEBT_SEMANTICS[type];
}
