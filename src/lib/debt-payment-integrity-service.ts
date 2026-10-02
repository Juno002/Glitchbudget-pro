import { isCanonicalFinancialDate } from '@/domain/financial-date';
import {
  classifyDebtPaymentIntegrity,
  type DebtPaymentIntegrityIssue,
  type RawDebtPayment,
} from '@/domain/data-integrity';
import { db } from '@/lib/db';

export type DebtPaymentRepairResult =
  | { status: 'repaired' }
  | { status: 'still_quarantined'; issue: DebtPaymentIntegrityIssue };

async function loadIntegrityContext() {
  const [debts, accounts] = await Promise.all([
    db.debts.toArray(),
    db.accounts.toArray(),
  ]);
  return { debts, accounts };
}

export async function repairQuarantinedDebtPaymentDate(
  id: string,
  nextDate: string,
): Promise<DebtPaymentRepairResult> {
  if (!isCanonicalFinancialDate(nextDate)) {
    throw new Error('Selecciona una fecha financiera válida.');
  }

  return db.transaction('rw', [db.debt_payments, db.debts, db.accounts], async () => {
    const stored = await db.debt_payments.get(id);
    if (!stored) throw new Error('El pago ya no existe.');

    const raw = stored as unknown as RawDebtPayment;
    const { debts, accounts } = await loadIntegrityContext();
    const before = classifyDebtPaymentIntegrity([raw], debts, accounts);
    const issue = before.quarantined[0];
    if (!issue) throw new Error('Este pago ya no necesita reparación de integridad.');
    if (!issue.reasons.includes('invalid_date')) {
      throw new Error('La fecha de este pago ya es válida; revisa las referencias faltantes.');
    }

    if (raw.accountId !== undefined && typeof raw.accountId === 'string') {
      const account = accounts.find(candidate => candidate.id === raw.accountId);
      if (account && nextDate < account.startDate) {
        throw new Error('La fecha corregida no puede ser anterior al inicio del seguimiento de la cuenta.');
      }
    }

    await db.debt_payments.update(id, { date: nextDate } as never);
    const updated = { ...raw, date: nextDate };
    const after = classifyDebtPaymentIntegrity([updated], debts, accounts);
    if (after.valid.length) return { status: 'repaired' };
    return { status: 'still_quarantined', issue: after.quarantined[0] };
  });
}

export async function deleteQuarantinedDebtPayment(id: string): Promise<void> {
  await db.transaction('rw', [db.debt_payments, db.debts, db.accounts], async () => {
    const stored = await db.debt_payments.get(id);
    if (!stored) return;
    const raw = stored as unknown as RawDebtPayment;
    const { debts, accounts } = await loadIntegrityContext();
    const integrity = classifyDebtPaymentIntegrity([raw], debts, accounts);
    if (integrity.valid.length) {
      throw new Error('Este pago es válido y no puede eliminarse desde reparación de integridad.');
    }
    await db.debt_payments.delete(id);
  });
}
