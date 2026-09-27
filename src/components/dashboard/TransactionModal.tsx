'use client';

import { AccountSelect } from './account-select';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { cn } from '@/lib/utils';
import type { Expense, Income } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Trash2, CreditCard, Banknote, ArrowRightLeft, BookmarkPlus, ChevronDown } from 'lucide-react';
import { localDate, isValidDate } from '@/lib/finance-calculations';
import { motion } from 'framer-motion';
import { defaultCashAccount } from '@/lib/accounts';
import {
  loadQuickAddTemplates,
  removeQuickAddTemplate,
  upsertQuickAddTemplate,
  type QuickAddTemplate,
  type QuickAddTransactionType,
} from '@/lib/quick-add-templates';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'new' | 'edit';
  editingExpense?: Expense;
  editingIncome?: Income;
}

type TransactionType = QuickAddTransactionType;

export default function TransactionModal({ open, onClose, mode, editingExpense, editingIncome }: TransactionModalProps) {
  const getCategoryInfo = useCategoryResolver();
  const {
    addExpense, updateExpense, deleteExpense,
    addIncomeItem, updateIncomeItem, deleteIncomeItem,
    expenseCategories, incomeCategories,
    debts: allDebts,
    accounts,
    addAccountTransfer,
  } = useFinances();

  const debts = allDebts?.filter(d => d.status === 'active' && d.type === 'credit_card') || [];
  const defaultCashId = useMemo(() => defaultCashAccount(accounts || [])?.id || '', [accounts]);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(localDate());
  const [expenseSubtype, setExpenseSubtype] = useState<'Fijo' | 'Variable' | 'Ocasional'>('Variable');
  const [incomeSubtype, setIncomeSubtype] = useState<'extra' | 'gift'>('extra');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [debtId, setDebtId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferNote, setTransferNote] = useState('');

  const [templates, setTemplates] = useState<QuickAddTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditing = mode === 'edit';

  useEffect(() => {
    if (!open) {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      setSaved(false);
      setSubmitError(null);
      return;
    }

    setSelectedTemplateId('');
    setTemplateName('');

    if (mode === 'edit' && editingExpense) {
      setTxType('expense');
      setAmount(String(editingExpense.amount / 100));
      setCategoryId(editingExpense.categoryId);
      setConcept(editingExpense.concept);
      setDate(editingExpense.date);
      setExpenseSubtype(editingExpense.nature);
      setPaymentMethod(editingExpense.paymentMethod || 'cash');
      setDebtId(editingExpense.debtId || '');
      setAccountId(editingExpense.accountId || '');
      setToAccountId('');
      setTransferNote('');
    } else if (mode === 'edit' && editingIncome) {
      setTxType('income');
      setAmount(String(editingIncome.amount / 100));
      setCategoryId(editingIncome.categoryId);
      setConcept(editingIncome.description);
      setDate(editingIncome.date);
      setIncomeSubtype(editingIncome.type);
      setPaymentMethod('cash');
      setDebtId('');
      setAccountId(editingIncome.accountId || '');
      setToAccountId('');
      setTransferNote('');
    } else {
      setTxType('expense');
      setAmount('');
      setCategoryId('');
      setConcept('');
      setDate(localDate());
      setExpenseSubtype('Variable');
      setIncomeSubtype('extra');
      setPaymentMethod('cash');
      setDebtId('');
      setAccountId('');
      setToAccountId('');
      setTransferNote('');
      if (typeof window !== 'undefined') setTemplates(loadQuickAddTemplates(window.localStorage));
    }
    setSaved(false);
    setSubmitError(null);
  }, [open, mode, editingExpense, editingIncome]);

  useEffect(() => {
    if (open && !isEditing && !accountId && defaultCashId) setAccountId(defaultCashId);
  }, [open, isEditing, accountId, defaultCashId]);

  const categories = useMemo(() => {
    if (txType === 'transfer') return [];
    const ids = txType === 'income' ? incomeCategories : expenseCategories;
    return ids.map(id => getCategoryInfo(id)).filter(Boolean) as NonNullable<ReturnType<typeof getCategoryInfo>>[];
  }, [txType, incomeCategories, expenseCategories, getCategoryInfo]);

  const validAmount = Number.isFinite(Number(amount)) && Number(amount) >= 0.01;
  const hasAccountForActual = !!accountId || isEditing;
  const canSave = txType === 'transfer'
    ? validAmount && isValidDate(date) && !!accountId && !!toAccountId && accountId !== toAccountId && !saved && !isSaving
    : validAmount && !!categoryId && isValidDate(date) && !saved && !isSaving
      && (txType === 'expense' && paymentMethod === 'credit' ? !!debtId : hasAccountForActual);

  const templateReady = !isEditing && validAmount && (
    txType === 'transfer'
      ? !!accountId && !!toAccountId && accountId !== toAccountId
      : !!categoryId && (txType === 'expense' && paymentMethod === 'credit' ? !!debtId : !!accountId)
  );

  const setMovementType = (type: TransactionType) => {
    if (isEditing) return;
    setTxType(type);
    setCategoryId('');
    setSubmitError(null);
    if (type === 'transfer') {
      setPaymentMethod('cash');
      setDebtId('');
    }
  };

  const applyTemplate = (template: QuickAddTemplate) => {
    const templateAccount = template.accountId && accounts?.some(account => account.id === template.accountId)
      ? template.accountId : defaultCashId;
    const templateDestination = template.toAccountId && accounts?.some(account => account.id === template.toAccountId)
      ? template.toAccountId : '';
    const allowedCategories = template.type === 'income' ? incomeCategories : expenseCategories;
    const templateCategory = template.categoryId && allowedCategories.includes(template.categoryId) ? template.categoryId : '';
    const activeDebt = template.debtId && debts.some(debt => debt.id === template.debtId) ? template.debtId : '';
    const method = template.type === 'expense' && template.paymentMethod === 'credit' && activeDebt ? 'credit' : 'cash';

    setTxType(template.type);
    setAmount(template.amount);
    setAccountId(method === 'credit' ? '' : (templateAccount || ''));
    setToAccountId(template.type === 'transfer' && templateDestination !== templateAccount ? templateDestination : '');
    setCategoryId(template.type === 'transfer' ? '' : templateCategory);
    setConcept(template.concept || '');
    setExpenseSubtype(template.expenseSubtype || 'Variable');
    setIncomeSubtype(template.incomeSubtype || 'extra');
    setPaymentMethod(method);
    setDebtId(method === 'credit' ? activeDebt : '');
    setTransferNote(template.transferNote || '');
    setDate(localDate());
    setSelectedTemplateId(template.id);
    setSubmitError(null);
  };

  const handleTemplateSelection = (id: string) => {
    setSelectedTemplateId(id);
    const template = templates.find(item => item.id === id);
    if (template) applyTemplate(template);
  };

  const handleSaveTemplate = () => {
    const name = templateName.trim();
    if (!templateReady || !name || typeof window === 'undefined') return;
    const existing = templates.find(item => item.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'));
    const next = upsertQuickAddTemplate(window.localStorage, {
      id: existing?.id || crypto.randomUUID(),
      name,
      type: txType,
      amount,
      accountId: paymentMethod === 'credit' ? undefined : accountId || undefined,
      toAccountId: txType === 'transfer' ? toAccountId || undefined : undefined,
      categoryId: txType === 'transfer' ? undefined : categoryId || undefined,
      concept: txType === 'transfer' ? undefined : concept || undefined,
      expenseSubtype: txType === 'expense' ? expenseSubtype : undefined,
      incomeSubtype: txType === 'income' ? incomeSubtype : undefined,
      paymentMethod: txType === 'expense' ? paymentMethod : undefined,
      debtId: txType === 'expense' && paymentMethod === 'credit' ? debtId || undefined : undefined,
      transferNote: txType === 'transfer' ? transferNote || undefined : undefined,
    });
    setTemplates(next);
    setSelectedTemplateId(existing?.id || next[0]?.id || '');
    setTemplateName('');
  };

  const handleDeleteTemplate = () => {
    if (!selectedTemplateId || typeof window === 'undefined') return;
    setTemplates(removeQuickAddTemplate(window.localStorage, selectedTemplateId));
    setSelectedTemplateId('');
  };

  const handleSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setSubmitError(null);
    try {
      const numAmount = Number(amount);
      let success: boolean;
      if (txType === 'transfer') {
        success = await addAccountTransfer({
          fromAccountId: accountId,
          toAccountId,
          amount: Math.round(numAmount * 100),
          date,
          note: transferNote,
        });
      } else if (txType === 'expense') {
        const fields = {
          accountId: paymentMethod === 'credit' ? undefined : accountId || undefined,
          concept,
          amount: numAmount,
          categoryId,
          date,
          nature: expenseSubtype,
          paymentMethod,
          debtId: paymentMethod === 'credit' ? debtId : undefined,
        };
        success = editingExpense
          ? await updateExpense({ ...editingExpense, ...fields })
          : await addExpense(fields);
      } else {
        const fields = {
          accountId: accountId || undefined,
          description: concept,
          amount: numAmount,
          categoryId,
          date,
          type: incomeSubtype,
        };
        success = editingIncome
          ? await updateIncomeItem({ ...editingIncome, ...fields })
          : await addIncomeItem(fields);
      }
      if (!success) {
        setSubmitError('No se guardó el movimiento. Revisa el aviso y corrige los datos; el formulario conserva lo que escribiste.');
        return;
      }
      setSaved(true);
      autoCloseTimer.current = setTimeout(onClose, 900);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const success = editingExpense ? await deleteExpense(editingExpense.id)
        : editingIncome ? await deleteIncomeItem(editingIncome.id) : false;
      if (success) onClose();
      else setSubmitError('No se pudo eliminar el movimiento. Inténtalo de nuevo.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !savingRef.current) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden p-0 sm:max-w-[440px]">
        <DialogHeader className="sr-only">
          <DialogDescription>Registra un movimiento con el flujo rápido. Los campos secundarios están en Más detalles.</DialogDescription>
          <DialogTitle>{isEditing ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
        </DialogHeader>

        <fieldset disabled={isSaving || saved} className="contents">
          <motion.div
            data-quick-add-step="amount"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'flex flex-col items-center gap-2 px-6 py-7 transition-colors',
              txType === 'expense' ? 'bg-[hsl(var(--bad)_/_0.08)]' : 'bg-[hsl(var(--primary)_/_0.08)]',
            )}
          >
            <label htmlFor="quick-add-amount" className="text-xs text-muted-foreground">
              {saved
                ? (txType === 'expense' ? 'Gasto registrado' : txType === 'income' ? 'Ingreso registrado' : 'Transferencia registrada')
                : (isEditing ? 'Editando movimiento' : 'Monto')}
            </label>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-medium">RD$</span>
              <input
                id="quick-add-amount"
                type="number"
                aria-label="Monto"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                autoFocus={!isEditing}
                value={amount}
                onChange={event => setAmount(event.target.value)}
                disabled={saved}
                placeholder="0.00"
                className="w-[190px] border-none bg-transparent text-center text-4xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/30"
              />
            </div>
          </motion.div>

          {!isEditing && templates.length > 0 && (
            <div className="border-b px-6 py-3">
              <div className="flex items-center gap-2">
                <label htmlFor="quick-add-template" className="sr-only">Usar plantilla</label>
                <select
                  id="quick-add-template"
                  value={selectedTemplateId}
                  onChange={event => handleTemplateSelection(event.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Usar plantilla…</option>
                  {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
                <Button type="button" variant="ghost" size="sm" disabled={!selectedTemplateId} onClick={handleDeleteTemplate}>
                  Eliminar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4 px-6 py-5">
            <div data-quick-add-step="type" className="space-y-2">
              <span className="text-sm font-medium">Tipo de movimiento</span>
              <div className="grid grid-cols-3 gap-2" aria-label="Tipo de movimiento">
                {([
                  ['expense', 'Gasto', TrendingDown],
                  ['income', 'Ingreso', TrendingUp],
                  ['transfer', 'Transferencia', ArrowRightLeft],
                ] as const).map(([type, label, Icon]) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isEditing}
                    aria-pressed={txType === type}
                    onClick={() => setMovementType(type)}
                    className={cn(
                      'flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      txType === type ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/30',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div data-quick-add-step="account" className="space-y-3">
              {txType === 'transfer' ? (
                <>
                  <AccountSelect cashDefault value={accountId} onChange={setAccountId} label="Cuenta de origen" disabled={isSaving} />
                  <AccountSelect value={toAccountId} onChange={setToAccountId} label="Cuenta de destino" disabled={isSaving} />
                  <p className="text-xs text-muted-foreground">La transferencia mueve dinero entre tus cuentas y no crea ingreso ni gasto.</p>
                </>
              ) : txType === 'expense' && paymentMethod === 'credit' ? (
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <span className="text-muted-foreground">Medio</span>
                  <strong className="ml-2">{debts.find(debt => debt.id === debtId)?.name || 'Selecciona una tarjeta en Más detalles'}</strong>
                </div>
              ) : (
                <AccountSelect
                  cashDefault={!isEditing}
                  value={accountId}
                  onChange={setAccountId}
                  label={txType === 'income' ? 'Cuenta de destino' : 'Cuenta de origen'}
                  disabled={isSaving}
                />
              )}
            </div>

            {txType !== 'transfer' && (
              <label data-quick-add-step="category" className="block space-y-1 text-sm">
                <span className="font-medium">Categoría</span>
                <select
                  aria-label="Categoría"
                  value={categoryId}
                  onChange={event => setCategoryId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            )}

            <details open={isEditing} className="group rounded-lg border">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium">
                Más detalles
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="space-y-4 border-t p-3">
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Fecha</span>
                  <Input type="date" aria-label="Fecha del movimiento" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} />
                </label>

                {txType === 'transfer' ? (
                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">Nota</span>
                    <Input
                      aria-label="Nota de la transferencia"
                      placeholder="Opcional"
                      value={transferNote}
                      onChange={event => setTransferNote(event.target.value)}
                      maxLength={250}
                    />
                  </label>
                ) : (
                  <>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">{txType === 'expense' ? 'Concepto' : 'Descripción'}</span>
                      <Input
                        aria-label={txType === 'expense' ? 'Concepto' : 'Descripción'}
                        placeholder="Opcional"
                        value={concept}
                        onChange={event => setConcept(event.target.value)}
                        maxLength={250}
                      />
                    </label>

                    {txType === 'expense' ? (
                      <>
                        <label className="block space-y-1 text-sm">
                          <span className="text-muted-foreground">Naturaleza</span>
                          <select
                            aria-label="Naturaleza"
                            value={expenseSubtype}
                            onChange={event => setExpenseSubtype(event.target.value as typeof expenseSubtype)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="Variable">Variable</option>
                            <option value="Ocasional">Ocasional</option>
                            <option value="Fijo">Fijo</option>
                          </select>
                        </label>

                        <div className="space-y-2">
                          <span className="text-sm text-muted-foreground">Método de pago</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              aria-pressed={paymentMethod === 'cash'}
                              onClick={() => { setPaymentMethod('cash'); setDebtId(''); if (!accountId) setAccountId(defaultCashId); }}
                              className={cn('flex min-h-11 items-center justify-center gap-2 rounded-md border text-sm', paymentMethod === 'cash' && 'border-primary/40 bg-primary/10 text-primary')}
                            >
                              <Banknote className="h-4 w-4" /> Efectivo / banco
                            </button>
                            <button
                              type="button"
                              disabled={debts.length === 0}
                              aria-pressed={paymentMethod === 'credit'}
                              onClick={() => { setPaymentMethod('credit'); setDebtId(debtId || debts[0]?.id || ''); }}
                              className={cn('flex min-h-11 items-center justify-center gap-2 rounded-md border text-sm disabled:opacity-50', paymentMethod === 'credit' && 'border-primary/40 bg-primary/10 text-primary')}
                            >
                              <CreditCard className="h-4 w-4" /> Tarjeta
                            </button>
                          </div>
                        </div>

                        {paymentMethod === 'credit' && (
                          <label className="block space-y-1 text-sm">
                            <span className="text-muted-foreground">Tarjeta</span>
                            <select
                              aria-label="Tarjeta"
                              value={debtId}
                              onChange={event => setDebtId(event.target.value)}
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="">Selecciona una tarjeta</option>
                              {debts.map(debt => <option key={debt.id} value={debt.id}>{debt.name}</option>)}
                            </select>
                          </label>
                        )}
                      </>
                    ) : (
                      <label className="block space-y-1 text-sm">
                        <span className="text-muted-foreground">Tipo de ingreso</span>
                        <select
                          aria-label="Tipo de ingreso"
                          value={incomeSubtype}
                          onChange={event => setIncomeSubtype(event.target.value as typeof incomeSubtype)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="extra">Adicional</option>
                          <option value="gift">Regalo / otro</option>
                        </select>
                      </label>
                    )}
                  </>
                )}

                {!isEditing && (
                  <div className="space-y-2 border-t pt-4">
                    <span className="text-sm font-medium">Plantilla</span>
                    <p className="text-xs text-muted-foreground">Guarda estos valores para reutilizarlos. La fecha siempre se restablece al día en que uses la plantilla.</p>
                    <div className="flex gap-2">
                      <Input
                        aria-label="Nombre de plantilla"
                        placeholder="Ej. Bus"
                        value={templateName}
                        onChange={event => setTemplateName(event.target.value)}
                        maxLength={80}
                      />
                      <Button type="button" variant="outline" disabled={!templateReady || !templateName.trim()} onClick={handleSaveTemplate}>
                        <BookmarkPlus className="mr-2 h-4 w-4" />
                        Guardar como plantilla
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </details>

            {!saved && txType !== 'transfer' && validAmount && !categoryId && <p className="text-xs text-muted-foreground" role="status">Selecciona una categoría para continuar.</p>}
            {!saved && txType === 'transfer' && validAmount && (!accountId || !toAccountId || accountId === toAccountId) && <p className="text-xs text-muted-foreground" role="status">Selecciona dos cuentas diferentes para continuar.</p>}
            {!saved && txType === 'expense' && paymentMethod === 'credit' && validAmount && !debtId && <p className="text-xs text-muted-foreground" role="status">Selecciona una tarjeta en Más detalles para continuar.</p>}

            {!saved && (
              <div data-quick-add-step="save" className="flex gap-2">
                {isEditing && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button aria-label="Eliminar movimiento" variant="outline" size="sm" className="h-12 text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertTitle>¿Eliminar este registro?</AlertTitle>
                        <AlertDialogDescription>
                          {editingExpense
                            ? 'Eliminar este gasto actualizará tus totales, el presupuesto de su categoría y la cuenta o tarjeta vinculada. Esta acción no se puede deshacer.'
                            : 'Eliminar este ingreso actualizará tus totales y el saldo de la cuenta vinculada. Esta acción no se puede deshacer.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button
                  className="h-12 flex-1 text-base font-semibold"
                  disabled={!canSave}
                  onClick={handleSave}
                >
                  {isSaving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Guardar'}
                </Button>
              </div>
            )}

            {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}

            {saved && !submitError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center py-4"
              >
                <p className="text-sm text-muted-foreground">
                  {txType === 'expense' ? 'Gasto registrado' : txType === 'income' ? 'Ingreso registrado' : 'Transferencia registrada'}
                </p>
              </motion.div>
            )}
          </div>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
