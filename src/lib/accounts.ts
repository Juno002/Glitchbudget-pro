import { z } from 'zod';
import { db, type Account, type Income, type Expense, type DebtPayment, type AccountTransfer } from './db';
import { isValidDate, localDate } from './finance-calculations';
const cents = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const date = z.string().refine(isValidDate, 'Fecha inválida');
export const accountSchema = z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(80), type: z.enum(['cash', 'bank']), openingBalance: cents, startDate: date });
export const transferSchema = z.object({ id: z.string().min(1), fromAccountId: z.string().min(1), toAccountId: z.string().min(1), amount: cents.refine(v => v > 0, 'Introduce un monto positivo.'), date, note: z.string().trim().max(250) }).refine(t => t.fromAccountId !== t.toAccountId, 'Selecciona dos cuentas diferentes.');
export type AccountSnapshot = { incomes: Income[]; expenses: Expense[]; payments: DebtPayment[]; transfers: AccountTransfer[] };
export function accountEntries(account: Account, data: AccountSnapshot, through = localDate()) {
  const entries = [
    ...data.incomes.filter(r => r.accountId === account.id).map(r => ({ id: r.id, date: r.date, amount: r.amount, description: r.description || 'Ingreso', kind: 'income' })),
    ...data.expenses.filter(r => r.accountId === account.id && r.paymentMethod !== 'credit').map(r => ({ id: r.id, date: r.date, amount: -r.amount, description: r.concept || 'Gasto', kind: 'expense' })),
    ...data.payments.filter(r => r.accountId === account.id).map(r => ({ id: r.id, date: r.date.slice(0, 10), amount: -r.amount, description: r.note || 'Pago de tarjeta', kind: 'payment' })),
    ...data.transfers.filter(r => r.fromAccountId === account.id || r.toAccountId === account.id).map(r => ({ id: r.id, date: r.date, amount: r.fromAccountId === account.id ? -r.amount : r.amount, description: r.note || 'Transferencia entre cuentas', kind: 'transfer' })),
  ];
  return entries.filter(r => r.date >= account.startDate && r.date <= through).sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
export function accountBalance(account: Account, data: AccountSnapshot, through = localDate()) {
  if (through < account.startDate) return 0;
  return account.openingBalance + accountEntries(account, data, through).reduce((sum,r) => sum + r.amount, 0);
}
export function requirePreservedAccountFunds(accounts: Account[], before: AccountSnapshot, after: AccountSnapshot) {
  for (const account of accounts) {
    const dates = new Set([localDate(), ...accountEntries(account, before, '9999-12-31').map(r => r.date), ...accountEntries(account, after, '9999-12-31').map(r => r.date)]);
    if ([...dates].some(d => accountBalance(account, after, d) < Math.min(0, accountBalance(account, before, d)))) {
      throw new Error('Saldo insuficiente: el cambio dejaría sin saldo este movimiento o movimientos posteriores.');
    }
  }
}
export const accountTables = [db.accounts, db.account_transfers, db.incomes, db.expenses, db.debt_payments];
export async function readAccountSnapshot(): Promise<AccountSnapshot> {
  return { incomes: await db.incomes.toArray(), expenses: await db.expenses.toArray(), payments: await db.debt_payments.toArray(), transfers: await db.account_transfers.toArray() };
}
export async function requireAccount(id: string | undefined, movementDate: string) {
  if (!id) throw new Error('Selecciona la cuenta de efectivo o banco del movimiento.');
  const account = await db.accounts.get(id);
  if (!account) throw new Error('La cuenta ya no existe.');
  if (movementDate < account.startDate) throw new Error('La fecha es anterior al inicio del seguimiento de esta cuenta.');
  return account;
}
export async function addAccount(input: Account, editing = false) {
  const account = accountSchema.parse(input);
  if (!editing && account.startDate !== localDate()) throw new Error('Introduce el saldo actual para comenzar el seguimiento hoy.');
  await db.transaction('rw', accountTables, async () => {
    if (editing) {
      const existing = await db.accounts.get(account.id);
      if (!existing || existing.startDate !== account.startDate) throw new Error('No se puede cambiar la fecha inicial de la cuenta.');
      await db.accounts.put(account);
    } else await db.accounts.add(account);
  });
}
export async function saveTransfer(input: AccountTransfer, editing = false) {
  const transfer = transferSchema.parse(input);
  if (transfer.date > localDate()) throw new Error('Registra las transferencias cuando se hayan realizado.');
  await db.transaction('rw', accountTables, async () => {
    const from = await requireAccount(transfer.fromAccountId, transfer.date);
    await requireAccount(transfer.toAccountId, transfer.date);
    const snapshot = await readAccountSnapshot();
    const before = { ...snapshot };
    if (editing) {
      if (!await db.account_transfers.get(transfer.id)) throw new Error('La transferencia ya no existe.');
      snapshot.transfers = snapshot.transfers.filter(t => t.id !== transfer.id);
    }
    if (accountBalance(from, snapshot, transfer.date) < transfer.amount) throw new Error('Saldo insuficiente en la cuenta de origen.');
    const projected = { ...snapshot, transfers: [...snapshot.transfers, transfer] };
    requirePreservedAccountFunds(await db.accounts.toArray(), before, projected);
    if (editing) await db.account_transfers.put(transfer);
    else await db.account_transfers.add(transfer);
  });
}

export function debtBalance(debt: import('./db').Debt, expenses: Expense[], payments: DebtPayment[], through = localDate()) {
  return (debt.openingAdjustment ?? 0) + expenses.filter(e => e.debtId === debt.id && e.paymentMethod === 'credit' && e.date <= through).reduce((s,e) => s + e.amount, 0) - payments.filter(p => p.debtId === debt.id && p.date.slice(0,10) <= through).reduce((s,p) => s + p.amount, 0);
}
export async function reconcileDebt(id: string, balance: number) {
  if (!Number.isSafeInteger(balance)) throw new Error('Introduce un saldo válido.');
  await db.transaction('rw', db.debts, db.expenses, db.debt_payments, async () => {
    const debt = await db.debts.get(id);
    if (!debt) throw new Error('Tarjeta no encontrada.');
    const recorded = debtBalance({ ...debt, openingAdjustment: 0 }, await db.expenses.toArray(), await db.debt_payments.toArray());
    const openingAdjustment = balance - recorded;
    if (!Number.isSafeInteger(openingAdjustment)) throw new Error('El saldo supera el monto admitido.');
    await db.debts.update(id, { openingAdjustment });
  });
}
