'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useFinances } from '@/contexts/finance-context';
import type { DebtPaymentIntegrityIssue, FinancialDateIntegrityInventory } from '@/domain/data-integrity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function rawValueLabel(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value || 'cadena vacía';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const reasonLabels: Record<DebtPaymentIntegrityIssue['reasons'][number], string> = {
  invalid_date: 'fecha inválida',
  missing_debt: 'deuda o tarjeta inexistente',
  missing_account: 'cuenta inexistente',
  before_account_start: 'fecha anterior al inicio de la cuenta',
  invalid_shape: 'estructura del pago inválida',
};

const inventoryLabels: Record<keyof FinancialDateIntegrityInventory, string> = {
  incomes: 'Ingresos',
  expenses: 'Gastos',
  transfers: 'Transferencias',
  goalContributions: 'Aportes a metas',
  plannedOccurrences: 'Movimientos planificados',
  recurringRules: 'Reglas recurrentes',
  accounts: 'Cuentas',
  investments: 'Inversiones',
};

function IntegrityRow({
  issue,
  onRepair,
  onDelete,
}: {
  issue: DebtPaymentIntegrityIssue;
  onRepair: (id: string, date: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const hasInvalidDate = issue.reasons.includes('invalid_date');
  const id = issue.payment.id;

  const repair = async () => {
    if (!date || busy) return;
    setBusy(true);
    try {
      if (await onRepair(id, date)) setDate('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[var(--radius-interactive)] border bg-background p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Pago aislado</p>
          <p className="break-all text-xs text-muted-foreground">ID: {id}</p>
          <p className="text-xs text-muted-foreground">
            Valor de fecha conservado: <span className="font-mono">{rawValueLabel(issue.payment.date)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {issue.reasons.map(reason => reasonLabels[reason]).join(' · ')}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Eliminar registro inválido" disabled={busy}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este pago aislado?</AlertDialogTitle>
              <AlertDialogDescription>
                El registro se eliminará de forma permanente. Úsalo solo si confirmas que el pago corrupto no debe conservarse.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => void onDelete(id)}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {hasInvalidDate ? (
        <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row">
          <Input
            type="date"
            aria-label="Fecha corregida del pago"
            value={date}
            onChange={event => setDate(event.target.value)}
            disabled={busy}
          />
          <Button type="button" variant="outline" onClick={() => void repair()} disabled={!date || busy}>
            Corregir fecha
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function DataIntegritySettings() {
  const {
    quarantinedDebtPayments,
    financialDateIntegrity,
    repairQuarantinedDebtPaymentDate,
    deleteQuarantinedDebtPayment,
  } = useFinances();

  const rows = quarantinedDebtPayments || [];
  const otherEntries = Object.entries(financialDateIntegrity).filter(([, count]) => count > 0);
  let otherIssueCount = 0;
  for (const [, count] of otherEntries) otherIssueCount += count;
  if (!rows.length && !otherEntries.length) return null;

  return (
    <section className="max-w-md rounded-[var(--radius-card)] border border-amber-500/30 bg-card p-4 shadow-[var(--shadow-control)]" data-data-integrity="prisma">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Integridad de datos</h3>
          {rows.length ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length} {rows.length === 1 ? 'pago está aislado' : 'pagos están aislados'} y no se incluyen en saldos, métricas ni reportes hasta resolver sus datos.
            </p>
          ) : null}
          {otherEntries.length ? (
            <p className="mt-1 text-xs text-muted-foreground">
              También se detectaron {otherIssueCount} anomalías de fecha en otras entidades. Se informan sin cambiar su comportamiento automáticamente.
            </p>
          ) : null}
        </div>
      </div>

      {rows.length ? (
        <div className="mt-4 space-y-3">
          {rows.map(issue => (
            <IntegrityRow
              key={issue.payment.id}
              issue={issue}
              onRepair={repairQuarantinedDebtPaymentDate}
              onDelete={deleteQuarantinedDebtPayment}
            />
          ))}
        </div>
      ) : null}

      {otherEntries.length ? (
        <dl className="mt-4 grid gap-1 text-xs text-muted-foreground">
          {otherEntries.map(([name, count]) => (
            <div key={name} className="flex justify-between gap-3">
              <dt>{inventoryLabels[name as keyof typeof inventoryLabels]}</dt>
              <dd className="tabular-nums">{count}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}