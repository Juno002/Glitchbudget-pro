import { accountFundsWorsen } from '../policies/account-protection';
import { readFinancialPolicies } from './policy-settings';
import { selectAccountEntries, selectAccountBalance, selectAccountHasActivity, selectCardSignedBalance, selectPosition } from '../domain/ledger';
import { isCreditCardDebt } from '../domain/debt-semantics';
import { z } from 'zod';
import { db, type Account, type Income, type Expense, type DebtPayment, type AccountTransfer } from './db';
import { isValidDate, localDate } from './finance-calculations';
import { normalizeCurrencyCode, requireCurrencyCode } from '../domain/currency';
import { classifyDebtPaymentIntegrity, type RawDebtPayment } from '../domain/data-integrity';
import { assertAccountStartDateAllowed } from '../domain/account-start';
const cents = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const date = z.string().refine(isValidDate, 'Fecha inválida');
const commonAccountFields = {
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  openingBalance: cents,
  startDate: date,
  isDefaultCash: z.boolean().optional(),
};
const legacyAccountFields = z.object({ ...commonAccountFields, type:z.enum(['cash','bank']) });
export const legacyAccountSchema = legacyAccountFields.refine(a => !a.isDefaultCash || a.type === 'cash', 'La cuenta predeterminada debe ser de efectivo.');
export const phase11AccountSchema = legacyAccountFields.extend({
  currency: z.string().transform(requireCurrencyCode),
}).refine(a => !a.isDefaultCash || a.type === 'cash', 'La cuenta predeterminada debe ser de efectivo.');
const accountFields = z.object({ ...commonAccountFields, type:z.enum(['cash','bank','investment']) });
export const accountSchema = accountFields.extend({
  currency: z.string().transform(requireCurrencyCode),
}).refine(a => !a.isDefaultCash || a.type === 'cash', 'La cuenta predeterminada debe ser de efectivo.');
export function defaultCashAccount(accounts: Account[]) {
  return accounts.find(a => a.isDefaultCash && a.type === 'cash') || accounts.filter(a => a.type === 'cash').sort((a,b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id))[0];
}
export async function ensureCashAccount(startDate = localDate()): Promise<Account> {
  return db.transaction('rw', db.accounts, db.settings, async () => {
    const settings = await db.settings.get('general');
    const baseCurrency = normalizeCurrencyCode(settings?.currency);
    const accounts = await db.accounts.toArray();
    const existing = defaultCashAccount(accounts);
    if (existing) {
      const currency = normalizeCurrencyCode(existing.currency, baseCurrency);
      if (currency !== baseCurrency) {
        throw new Error('La cuenta de efectivo está en otra moneda y necesita una conversión manual.');
      }
      if (!existing.isDefaultCash || existing.currency !== baseCurrency) {
        await db.accounts.update(existing.id, { isDefaultCash: true, currency:baseCurrency });
      }
      return { ...existing, currency:baseCurrency, isDefaultCash: true };
    }
    assertAccountStartDateAllowed(startDate, localDate());
    const account: Account = { id: crypto.randomUUID(), name: 'Efectivo', type: 'cash', currency: baseCurrency, openingBalance: 0, startDate, isDefaultCash: true };
    await db.accounts.add(account);
    return account;
  });
}
export const transferSchema = z.object({ id: z.string().min(1), fromAccountId: z.string().min(1), toAccountId: z.string().min(1), amount: cents.refine(v => v > 0, 'Introduce un monto positivo.'), date, note: z.string().trim().max(250) }).refine(t => t.fromAccountId !== t.toAccountId, 'Selecciona dos cuentas diferentes.');
export type { AccountSnapshot } from '../domain/ledger';
import type { AccountSnapshot } from '../domain/ledger';
export const accountEntries = (account: Account, data: AccountSnapshot, through = localDate()) => selectAccountEntries(account, data, through);
export const accountBalance = (account: Account, data: AccountSnapshot, through = localDate()) => selectAccountBalance(account, data, through);
export function requirePreservedAccountFunds(accounts: Account[], before: AccountSnapshot, after: AccountSnapshot) {
  for (const account of accounts) {
    if (accountFundsWorsen(account, account, before, after, localDate())) {
      throw new Error('Saldo insuficiente: el cambio dejaría sin saldo este movimiento o movimientos posteriores.');
    }
  }
}
export const accountTables = [db.accounts, db.account_transfers, db.incomes, db.expenses, db.debt_payments, db.debts];
export async function readAccountSnapshot(): Promise<AccountSnapshot> {
  const [incomes, expenses, rawPayments, transfers, accounts, debts] = await Promise.all([
    db.incomes.toArray(),
    db.expenses.toArray(),
    db.debt_payments.toArray(),
    db.account_transfers.toArray(),
    db.accounts.toArray(),
    db.debts.toArray(),
  ]);
  const payments = classifyDebtPaymentIntegrity(
    rawPayments as unknown as RawDebtPayment[],
    debts,
    accounts,
  ).valid;
  return { incomes, expenses, payments, transfers };
}
export async function hasAccountActivity(accountId: string): Promise<boolean> {
  const [incomes, expenses, payments, transfers] = await Promise.all([
    db.incomes.toArray(),
    db.expenses.toArray(),
    db.debt_payments.toArray(),
    db.account_transfers.toArray(),
  ]);
  return selectAccountHasActivity(accountId, { incomes, expenses, payments, transfers });
}

export async function requireAccount(id: string | undefined, movementDate: string) {
  if (!id) throw new Error('Selecciona una cuenta del movimiento.');
  const account = await db.accounts.get(id);
  if (!account) throw new Error('La cuenta ya no existe.');
  if (movementDate < account.startDate) throw new Error('La fecha es anterior al inicio del seguimiento de esta cuenta.');
  return account;
}
export async function addAccount(input: Account, editing = false) {
  const account = accountSchema.parse(input);
  if (account.type === 'investment') throw new Error('Las cuentas de inversión se crean desde Investments 1.0.');
  if (!editing) assertAccountStartDateAllowed(account.startDate, localDate());
  await db.transaction('rw', [...accountTables, db.settings], async () => {
    const settings = await db.settings.get('general');
    const baseCurrency = normalizeCurrencyCode(settings?.currency);
    if (account.currency !== baseCurrency) {
      throw new Error('Las cuentas en otra moneda necesitan conversión manual, que todavía no forma parte de Fase 11.');
    }
    if (editing) {
      const existing = await db.accounts.get(account.id);
      if (!existing) throw new Error('La cuenta ya no existe. Actualiza la lista.');
      if (existing.startDate !== account.startDate) {
        assertAccountStartDateAllowed(account.startDate, localDate());
        if (await hasAccountActivity(account.id)) {
          throw new Error('La fecha inicial no se puede cambiar porque la cuenta ya tiene movimientos registrados.');
        }
      }
      if (existing.isDefaultCash && account.type !== 'cash') throw new Error('La cuenta Efectivo predeterminada no puede convertirse en banco.');
      if (normalizeCurrencyCode(existing.currency, baseCurrency) !== account.currency) throw new Error('La moneda de una cuenta con historial no se puede reinterpretar.');
      account.isDefaultCash = existing.isDefaultCash;
      if ((await readFinancialPolicies()).preventNegativeAccountBalance && account.openingBalance < existing.openingBalance) {
        const snapshot = await readAccountSnapshot();
        if (accountFundsWorsen(existing, account, snapshot, snapshot, localDate())) {
          throw new Error('Saldo insuficiente: el saldo inicial dejaría sin fondos movimientos registrados.');
        }
      }
      await db.accounts.put(account);
    } else {
      if (account.isDefaultCash && (await db.accounts.toArray()).some(a => a.isDefaultCash)) throw new Error('Ya existe una cuenta de efectivo predeterminada.');
      await db.accounts.add(account);
    }
  });
}
export async function saveTransfer(input: AccountTransfer, editing = false) {
  const transfer = transferSchema.parse(input);
  if (transfer.date > localDate()) throw new Error('Registra las transferencias cuando se hayan realizado.');
  await db.transaction('rw', [...accountTables, db.settings], async () => {
    const fromAccount = await requireAccount(transfer.fromAccountId, transfer.date);
    const toAccount = await requireAccount(transfer.toAccountId, transfer.date);
    if (fromAccount.type === 'investment' || toAccount.type === 'investment') {
      throw new Error('Las transferencias de inversión se administran desde Investments 1.0; retiros y vencimientos pertenecen a Investments 1.1.');
    }
    if (fromAccount.currency !== toAccount.currency) {
      throw new Error('Las transferencias entre monedas requieren una tasa manual y todavía no están habilitadas.');
    }
    const snapshot = await readAccountSnapshot();
    const before = { ...snapshot };
    if (editing) {
      if (!await db.account_transfers.get(transfer.id)) throw new Error('La transferencia ya no existe.');
      snapshot.transfers = snapshot.transfers.filter(t => t.id !== transfer.id);
    }
    const projected = { ...snapshot, transfers: [...snapshot.transfers, transfer] };
    if ((await readFinancialPolicies()).preventNegativeAccountBalance) requirePreservedAccountFunds(await db.accounts.toArray(), before, projected);
    if (editing) await db.account_transfers.put(transfer);
    else await db.account_transfers.add(transfer);
  });
}

export const debtBalance = (debt: import('./db').Debt, expenses: Expense[], payments: DebtPayment[], through = localDate()) => {
  if (!isCreditCardDebt(debt)) throw new Error('El saldo operativo solo aplica a tarjetas de crédito.');
  return selectCardSignedBalance(debt, expenses, payments, through);
};
export async function reconcileDebt(id: string, balance: number) {
  if (!Number.isSafeInteger(balance)) throw new Error('Introduce un saldo válido.');
  await db.transaction('rw', db.debts, db.expenses, db.debt_payments, db.accounts, async () => {
    const debt = await db.debts.get(id);
    if (!debt || !isCreditCardDebt(debt)) throw new Error('Tarjeta no encontrada.');
    const [expenses, rawPayments, debts, accounts] = await Promise.all([
      db.expenses.toArray(),
      db.debt_payments.toArray(),
      db.debts.toArray(),
      db.accounts.toArray(),
    ]);
    const payments = classifyDebtPaymentIntegrity(
      rawPayments as unknown as RawDebtPayment[],
      debts,
      accounts,
    ).valid;
    const recorded = debtBalance({ ...debt, openingAdjustment: 0 }, expenses, payments);
    const openingAdjustment = balance - recorded;
    if (!Number.isSafeInteger(openingAdjustment)) throw new Error('El saldo supera el monto admitido.');
    await db.debts.update(id, { openingAdjustment });
  });
}

/** Compatibility shape for pre-domain callers; no financial formulas here. */
export function accountPosition(accounts: Account[], debts: import('./db').Debt[], data: AccountSnapshot, through = localDate()) {
 const p = selectPosition(accounts, debts, data, through);
 return { cash:p.cash, bank:p.bank, investments:p.investmentAssets, liquid:p.liquidAssets, owed:p.liabilities, credit:p.cardPositiveBalance, net:p.netWorth, balances:p.balances.map(({signedBalance, ...card}) => ({...card, balance:signedBalance})) };
}