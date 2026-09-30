import type { Account, Income, Expense, DebtPayment, AccountTransfer, CreditCardDebt, Debt, HistoricalLoanDebt } from './models';
import { cardCreditLimit, isCreditCardDebt, isHistoricalLoanDebt, loanOriginalPrincipal } from './debt-semantics';
export type AccountSnapshot = { incomes: Income[]; expenses: Expense[]; payments: DebtPayment[]; transfers: AccountTransfer[] };
export function selectAccountEntries(account: Account, data: AccountSnapshot, through: string) {
  const entries = [
    ...data.incomes.filter(r => r.accountId === account.id).map(r => ({ id: r.id, date: r.date, amount: r.amount, description: r.description || 'Ingreso', kind: 'income' })),
    ...data.expenses.filter(r => r.accountId === account.id && r.paymentMethod !== 'credit').map(r => ({ id: r.id, date: r.date, amount: -r.amount, description: r.concept || 'Gasto', kind: 'expense' })),
    ...data.payments.filter(r => r.accountId === account.id).map(r => ({ id: r.id, date: r.date.slice(0, 10), amount: -r.amount, description: r.note || 'Pago de tarjeta', kind: 'payment' })),
    ...data.transfers.filter(r => r.fromAccountId === account.id || r.toAccountId === account.id).map(r => ({ id: r.id, date: r.date, amount: r.fromAccountId === account.id ? -r.amount : r.amount, description: r.note || 'Transferencia entre cuentas', kind: 'transfer' })),
  ];
  return entries.filter(r => r.date >= account.startDate && r.date <= through).sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
export function selectAccountBalance(account: Account, data: AccountSnapshot, through: string) {
  if (through < account.startDate) return 0;
  return account.openingBalance + selectAccountEntries(account, data, through).reduce((sum,r) => sum + r.amount, 0);
}
export function selectCardSignedBalance(debt: Debt, expenses: Expense[], payments: DebtPayment[], through: string) {
  if (!isCreditCardDebt(debt)) throw new Error('El saldo de tarjeta requiere una tarjeta de crédito.');
  return (debt.openingAdjustment ?? 0) + expenses.filter(e => e.debtId === debt.id && e.paymentMethod === 'credit' && e.date <= through).reduce((s,e) => s + e.amount, 0) - payments.filter(p => p.debtId === debt.id && p.date.slice(0,10) <= through).reduce((s,p) => s + p.amount, 0);
}

/**
 * Compatibility balance for historical loan rows.
 *
 * Phase 20.7.5.1 froze loan.principal as original principal, not a credit limit.
 * The persisted model has no canonical interest accrual schedule, so we preserve
 * only recorded principal/opening adjustment minus recorded debt payments.
 */
export function selectLoanCompatibilityBalance(debt: Debt, payments: DebtPayment[], through: string) {
  if (!isHistoricalLoanDebt(debt)) throw new Error('El saldo compatible de préstamo requiere un préstamo histórico.');
  const paid = payments
    .filter(payment => payment.debtId === debt.id && payment.date.slice(0, 10) <= through)
    .reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, loanOriginalPrincipal(debt) + (debt.openingAdjustment ?? 0) - paid);
}

export function selectPosition(accounts: Account[], debts: Debt[], data: AccountSnapshot, through: string) {
  const cash = accounts.filter(a => a.type === 'cash').reduce((sum,a) => sum+selectAccountBalance(a,data,through),0);
  const bank = accounts.filter(a => a.type === 'bank').reduce((sum,a) => sum+selectAccountBalance(a,data,through),0);
  const investmentAssets = accounts.filter(a => a.type === 'investment').reduce((sum,a) => sum+selectAccountBalance(a,data,through),0);
  const balances = debts.filter(isCreditCardDebt).map(d => ({...d, signedBalance: selectCardSignedBalance(d,data.expenses,data.payments,through)}));
  const loanBalances = debts.filter(isHistoricalLoanDebt).map(d => ({...d, compatibilityBalance: selectLoanCompatibilityBalance(d,data.payments,through)}));
  const cardLiabilities = balances.reduce((sum,d) => sum+Math.max(0,d.signedBalance),0);
  const loanLiabilities = loanBalances.reduce((sum,d) => sum+d.compatibilityBalance,0);
  const liabilities = cardLiabilities + loanLiabilities;
  const cardPositiveBalance = balances.reduce((sum,d) => sum+Math.max(0,-d.signedBalance),0);
  return { cash, bank, investmentAssets, liquidAssets: cash+bank, liabilities, cardPositiveBalance, netWorth: cash+bank+investmentAssets+cardPositiveBalance-liabilities, balances, loanBalances };
}
/** Borrowing headroom, never part of liquid assets or net worth. */
export function selectCardAvailableLimit(limit: number, signedBalance: number) {
  return limit - signedBalance;
}


export function selectActiveDebts(debts: Debt[]) {
  return debts.filter(debt => debt.status === 'active');
}

export function selectActiveCreditCards(debts: Debt[]): CreditCardDebt[] {
  return selectActiveDebts(debts).filter(isCreditCardDebt);
}

export function selectCardReadModel(
  debt: CreditCardDebt,
  expenses: Expense[],
  payments: DebtPayment[],
  through: string,
) {
  const creditLimit = cardCreditLimit(debt);
  const signedBalance = selectCardSignedBalance(debt, expenses, payments, through);
  const isSurplus = signedBalance < 0;
  const absoluteBalance = Math.abs(signedBalance);
  const availableLimit = selectCardAvailableLimit(creditLimit, signedBalance);
  const utilizationPercent = creditLimit > 0
    ? Math.min(100, Math.max(0, (signedBalance / creditLimit) * 100))
    : 0;
  return { creditLimit, signedBalance, isSurplus, absoluteBalance, availableLimit, utilizationPercent };
}

export function selectHistoricalLoanReadModel(
  debt: HistoricalLoanDebt,
  payments: DebtPayment[],
  through: string,
) {
  return {
    originalPrincipal: loanOriginalPrincipal(debt),
    compatibilityBalance: selectLoanCompatibilityBalance(debt, payments, through),
    status: debt.status,
  };
}

export function selectAccountOverviewReadModel(
  accounts: Account[],
  debts: Debt[],
  data: AccountSnapshot,
  through: string,
) {
  const cards = debts.filter(debt => debt.type === 'credit_card');
  const liquidAccounts = accounts.filter(account => account.type !== 'investment');
  const position = selectPosition(accounts, debts, data, through);
  const unassignedMovementCount =
    data.incomes.filter(income => !income.accountId).length
    + data.expenses.filter(expense => expense.paymentMethod !== 'credit' && !expense.accountId).length
    + data.payments.filter(payment => !payment.accountId).length;
  return { cards, liquidAccounts, position, unassignedMovementCount };
}
