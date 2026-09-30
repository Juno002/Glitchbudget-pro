import type { CreditCardDebt, Debt, HistoricalLoanDebt } from './models';

export type DebtSemanticContract = {
  role: 'supported' | 'historical_compatibility';
  principalMeaning: 'approved_credit_limit' | 'original_principal';
  balanceFormula:
    | 'opening_adjustment_plus_credit_purchases_minus_payments'
    | 'principal_plus_opening_adjustment_minus_payments_clamped_at_zero';
  balanceDescription: string;
  reducingMovements: string;
  netWorthImpact: string;
  statusRule: string;
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
    principalMeaning: 'approved_credit_limit',
    balanceFormula: 'opening_adjustment_plus_credit_purchases_minus_payments',
    balanceDescription: 'Signed balance = openingAdjustment + linked credit purchases - linked debt payments through the requested date. A negative value is cardholder surplus.',
    reducingMovements: 'DebtPayment rows linked by debtId reduce the signed balance. Credit-card purchases increase it; principal never does.',
    netWorthImpact: 'Positive signed balance is a liability. Negative signed balance is a positive card balance asset. Approved credit limit never enters net worth.',
    statusRule: 'Status controls whether new activity is allowed; closing a card does not erase its historical signed balance.',
    allowedActions: ['create', 'record_credit_purchase', 'record_payment', 'reconcile', 'preserve_history'],
    uiRepresentation: 'Operational credit card with pending balance or balance in favor plus available limit; approved limit is never presented as owned money.',
    backupCompatibility: 'Preserve card fields, linked expenses, linked payments and openingAdjustment across export/restore.',
  },
  loan: {
    role: 'historical_compatibility',
    principalMeaning: 'original_principal',
    balanceFormula: 'principal_plus_opening_adjustment_minus_payments_clamped_at_zero',
    balanceDescription: 'Compatibility balance = max(0, original principal + any preserved historical openingAdjustment - linked historical debt payments through the requested date). No interest is synthesized from APR and credit-card purchases never increase a loan.',
    reducingMovements: 'Only historical DebtPayment rows linked by debtId reduce the compatibility balance in the persisted model.',
    netWorthImpact: 'Any positive compatibility balance is a liability and reduces net worth. Status alone never hides a remaining balance.',
    statusRule: 'Loan status is lifecycle metadata only; a closed row with a positive computed balance remains a liability until the historical data reconciles it to zero.',
    allowedActions: ['restore', 'export', 'view_read_only_history'],
    uiRepresentation: 'Imported loan remains identifiable as a historical loan and read-only. It must not be rendered or operated on as a credit card.',
    backupCompatibility: 'Preserve loan type, principal, status, APR, minimum payment, openingAdjustment and linked payments across backward-compatible round-trip.',
  },
};

export function debtSemanticContract(type: Debt['type']): DebtSemanticContract {
  return DEBT_SEMANTICS[type];
}


/**
 * Phase 20.7.5.3 compatibility boundary.
 * Debt.principal remains persisted for backup/schema compatibility, but code
 * outside this module should consume quantities through explicit meanings.
 */
export function isCreditCardDebt(debt: Debt): debt is CreditCardDebt {
  return debt.type === 'credit_card';
}

export function isHistoricalLoanDebt(debt: Debt): debt is HistoricalLoanDebt {
  return debt.type === 'loan';
}

export function cardCreditLimit(debt: CreditCardDebt): number {
  return debt.principal;
}

export function loanOriginalPrincipal(debt: HistoricalLoanDebt): number {
  return debt.principal;
}
