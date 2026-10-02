import { z } from 'zod';
import { db, type Account, type Investment } from './db';
import { normalizeCurrencyCode } from '../domain/currency';
import { isValidDate, localDate } from './finance-calculations';
import { readFinancialPolicies } from './policy-settings';
import { readAccountSnapshot, requirePreservedAccountFunds } from './accounts';

const cents = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const nonNegativeCents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const date = z.string().refine(isValidDate, 'Fecha inválida');

export const investmentSchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  type: z.enum(['certificate','term_deposit','known_yield']),
  name: z.string().trim().min(1).max(100),
  institution: z.string().trim().max(120).optional(),
  openedAt: date,
  maturityDate: date.optional(),
  principal: cents,
  annualRate: z.number().finite().min(0).max(10).optional(),
  compoundingMethod: z.enum(['simple','monthly','quarterly','annually']).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(['active','closed']),
}).superRefine((row, ctx) => {
  if (row.maturityDate && row.maturityDate < row.openedAt) {
    ctx.addIssue({ code:z.ZodIssueCode.custom, path:['maturityDate'], message:'El vencimiento no puede ser anterior a la apertura.' });
  }
});

const createSchema = z.object({
  mode: z.enum(['existing','new']),
  type: z.enum(['certificate','term_deposit','known_yield']),
  name: z.string().trim().min(1).max(100),
  institution: z.string().trim().max(120).optional(),
  openedAt: date,
  maturityDate: date.optional(),
  principal: cents,
  annualRate: z.number().finite().min(0).max(10).optional(),
  compoundingMethod: z.enum(['simple','monthly','quarterly','annually']).optional(),
  notes: z.string().trim().max(1000).optional(),
  currentTrackedValue: nonNegativeCents.optional(),
  sourceAccountId: z.string().min(1).optional(),
}).superRefine((row, ctx) => {
  if (row.maturityDate && row.maturityDate < row.openedAt) {
    ctx.addIssue({ code:z.ZodIssueCode.custom, path:['maturityDate'], message:'El vencimiento no puede ser anterior a la apertura.' });
  }
  if (row.mode === 'existing' && row.currentTrackedValue === undefined) {
    ctx.addIssue({ code:z.ZodIssueCode.custom, path:['currentTrackedValue'], message:'Indica el valor que estás siguiendo hoy.' });
  }
  if (row.mode === 'new' && !row.sourceAccountId) {
    ctx.addIssue({ code:z.ZodIssueCode.custom, path:['sourceAccountId'], message:'Selecciona la cuenta que financia la inversión.' });
  }
});

export type CreateInvestmentInput = z.input<typeof createSchema>;

export async function createInvestment(input: CreateInvestmentInput): Promise<Investment> {
  const value = createSchema.parse(input);
  const today = localDate();
  if (value.openedAt > today) throw new Error('La fecha de apertura no puede estar en el futuro.');

  return db.transaction('rw', [
    db.investments, db.accounts, db.account_transfers,
    db.incomes, db.expenses, db.debt_payments, db.debts, db.settings,
  ], async () => {
    const settings = await db.settings.get('general');
    const currency = normalizeCurrencyCode(settings?.currency);
    const id = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const account: Account = {
      id: accountId,
      name: value.name,
      type: 'investment',
      currency,
      openingBalance: value.mode === 'existing' ? (value.currentTrackedValue ?? 0) : 0,
      startDate: value.mode === 'existing' ? today : value.openedAt,
    };
    const investment: Investment = investmentSchema.parse({
      id,
      accountId,
      type:value.type,
      name:value.name,
      institution:value.institution || undefined,
      openedAt:value.openedAt,
      maturityDate:value.maturityDate || undefined,
      principal:value.principal,
      annualRate:value.annualRate,
      compoundingMethod:value.annualRate === undefined ? undefined : (value.compoundingMethod || 'simple'),
      notes:value.notes || undefined,
      status:'active',
    });

    await db.accounts.add(account);
    await db.investments.add(investment);

    if (value.mode === 'new') {
      const source = await db.accounts.get(value.sourceAccountId!);
      if (!source || source.type === 'investment') throw new Error('Selecciona una cuenta líquida registrada para financiar la inversión.');
      if (source.currency !== currency) throw new Error('La inversión debe abrirse en la misma moneda base de la cuenta de origen.');
      if (value.openedAt < source.startDate) throw new Error('La apertura es anterior al inicio del seguimiento de la cuenta de origen.');

      const transfer = {
        id: crypto.randomUUID(),
        fromAccountId: source.id,
        toAccountId: accountId,
        amount: value.principal,
        date: value.openedAt,
        note: 'Apertura de inversión · ' + value.name,
      };
      const before = await readAccountSnapshot();
      const projected = { ...before, transfers:[...before.transfers, transfer] };
      if ((await readFinancialPolicies()).preventNegativeAccountBalance) {
        requirePreservedAccountFunds(await db.accounts.toArray(), before, projected);
      }
      await db.account_transfers.add(transfer);
    }

    return investment;
  });
}