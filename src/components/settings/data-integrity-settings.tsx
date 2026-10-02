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