'use client';

import { AccountSelect } from './account-select';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { cn, currencyInputLabel, toCents } from '@/lib/utils';
import type { Expense, Income } from '@/domain/models';
import { selectActiveCreditCards } from '@/domain/ledger';
import { shouldApplyAutomaticRuleField } from '@/domain/transaction-rule-precedence';
import { canSaveTransactionDraft } from '@/domain/transaction-draft';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { TrendingUp, TrendingDown, Trash2, CreditCard, Banknote, ArrowRightLeft, ChevronDown } from 'lucide-react';
import { localDate, isValidDate } from '@/lib/finance-calculations';
import { accountStartDateBounds } from '@/domain/account-start';
import { parseTransactionLabelsInput } from '@/domain/transaction-metadata';
import { evaluateTransactionRules, type RuleMatch } from '@/domain/rule-engine';
import { quickAddRuleSuggestions, resolveAutomaticRuleSuggestion } from '@/domain/rule-suggestions';
import type { TransactionRule } from '@/domain/rules';
import { loadTransactionRules } from '@/lib/transaction-rules';
import { motion } from 'framer-motion';
import { defaultCashAccount } from '@/lib/accounts';
import {
  loadQuickAddTemplates,
  removeQuickAddTemplate,
  upsertQuickAddTemplate,
  type QuickAddTemplate,
  type QuickAddTransactionType,
} from '@/lib/quick-add-templates';
import { QuickAddTemplateSave, QuickAddTemplateSelector, TransactionRuleSuggestions } from './transaction-modal-automation';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'new' | 'edit';
  editingExpense?: Expense;
  editingIncome?: Income;
  rules?: readonly TransactionRule[];
}

type TransactionType = QuickAddTransactionType;

export default function TransactionModal({ open, onClose, mode, editingExpense, editingIncome, rules }: TransactionModalProps) {
  const getCategoryInfo = useCategoryResolver();
  const {
    addExpense, updateExpense, deleteExpense,
    addIncomeItem, updateIncomeItem, deleteIncomeItem,
    expenseCategories, incomeCategories,
    debts: allDebts,
    accounts,
    currency,
    addAccountTransfer,
  } = useFinances();

  const debts = selectActiveCreditCards(allDebts || []);
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
  const [necessity, setNecessity] = useState<'' | 'must' | 'need' | 'want'>('');
  const [labelsInput, setLabelsInput] = useState('');
  const [historyOpeningBalance, setHistoryOpeningBalance] = useState('');
  const [dismissedRuleIds, setDismissedRuleIds] = useState<string[]>([]);
  const [storedRules, setStoredRules] = useState<TransactionRule[]>([]);
  const [automaticRuleId, setAutomaticRuleId] = useState<string | null>(null);
  const [categoryEditedManually, setCategoryEditedManually] = useState(false);
  const [necessityEditedManually, setNecessityEditedManually] = useState(false);

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
    setDismissedRuleIds([]);
    setAutomaticRuleId(null);
    setCategoryEditedManually(false);
    setNecessityEditedManually(false);

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
      setNecessity(editingExpense.necessity || '');
      setLabelsInput((editingExpense.labels || []).join(', '));
      setHistoryOpeningBalance('');
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
      setNecessity('');
      setLabelsInput((editingIncome.labels || []).join(', '));
      setHistoryOpeningBalance('');
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
      setNecessity('');
      setLabelsInput('');
      setHistoryOpeningBalance('');
      if (typeof window !== 'undefined') {
        setTemplates(loadQuickAddTemplates(window.localStorage));
        setStoredRules(loadTransactionRules(window.localStorage));
      }
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

  const effectiveRules = rules ?? storedRules;

  const compatibleRuleSuggestions = useMemo(() => {
    if (isEditing || txType === 'transfer' || !concept.trim() || effectiveRules.length === 0) return [];
    const matches = evaluateTransactionRules(concept, effectiveRules);
    return quickAddRuleSuggestions(matches, txType, categories.map(category => category.id))
      .filter(match => !dismissedRuleIds.includes(match.ruleId));
  }, [isEditing, txType, concept, effectiveRules, categories, dismissedRuleIds]);

  const ruleResolution = useMemo(
    () => resolveAutomaticRuleSuggestion(compatibleRuleSuggestions),
    [compatibleRuleSuggestions],
  );
  const automaticRuleSuggestion = ruleResolution.automatic;
  const ruleSuggestions = ruleResolution.manual;

  useEffect(() => {
    if (!automaticRuleSuggestion) {
      setAutomaticRuleId(null);
      return;
    }
    const applyCategory = shouldApplyAutomaticRuleField(
      categoryEditedManually,
      automaticRuleSuggestion.suggestion.categoryId,
    );
    const applyNecessity = txType === 'expense' && shouldApplyAutomaticRuleField(
      necessityEditedManually,
      automaticRuleSuggestion.suggestion.necessity,
    );

    if (applyCategory) {
      setCategoryId(automaticRuleSuggestion.suggestion.categoryId!);
    }
    if (applyNecessity) {
      setNecessity(automaticRuleSuggestion.suggestion.necessity!);
    }
    setAutomaticRuleId(applyCategory || applyNecessity ? automaticRuleSuggestion.ruleId : null);
  }, [automaticRuleSuggestion, txType, categoryEditedManually, necessityEditedManually]);

  const validAmount = Number.isFinite(Number(amount)) && Number(amount) >= 0.01;
  const selectedAccount = (accounts || []).find(account => account.id === accountId);
  const historyBounds = accountStartDateBounds(localDate());
  const needsIncomeHistoryExtension = Boolean(
    txType === 'income'
    && !isEditing
    && selectedAccount
    && date < selectedAccount.startDate
  );
  const validHistoryOpeningBalance = Number.isFinite(Number(historyOpeningBalance))
    && Number(historyOpeningBalance) >= 0;
  const historyExtensionDateAllowed = date >= historyBounds.min && date <= historyBounds.max;
  const hasAccountForActual = !!accountId || isEditing;
  const baseCanSave = canSaveTransactionDraft({
    type:txType,
    validAmount,
    validDate:isValidDate(date),
    accountId,
    toAccountId,
    categoryId,
    paymentMethod,
    debtId,
    hasAccountForActual,
    saved,
    saving:isSaving,
  });
  const canSave = baseCanSave && (
    !needsIncomeHistoryExtension
    || (validHistoryOpeningBalance && historyExtensionDateAllowed)
  );

  const templateReady = !isEditing && validAmount && (
    txType === 'transfer'
      ? !!accountId && !!toAccountId && accountId !== toAccountId
      : !!categoryId && (txType === 'expense' && paymentMethod === 'credit' ? !!debtId : !!accountId)
  );

  const setMovementType = (type: TransactionType) => {
    if (isEditing) return;
    setTxType(type);
    setCategoryId('');
    setDismissedRuleIds([]);
    setAutomaticRuleId(null);
    setCategoryEditedManually(false);
    setNecessityEditedManually(false);
    setHistoryOpeningBalance('');
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
    setCategoryEditedManually(template.type !== 'transfer' && Boolean(templateCategory));
    setConcept(template.concept || '');
    setExpenseSubtype(template.expenseSubtype || 'Variable');
    setIncomeSubtype(template.incomeSubtype || 'extra');
    setPaymentMethod(method);
    setDebtId(method === 'credit' ? activeDebt : '');
    setTransferNote(template.transferNote || '');
    setNecessity(template.type === 'expense' ? (template.necessity || '') : '');
    setNecessityEditedManually(template.type === 'expense' && Boolean(template.necessity));
    setLabelsInput((template.labels || []).join(', '));
    setHistoryOpeningBalance('');
    setDate(localDate());
    setSelectedTemplateId(template.id);
    setDismissedRuleIds([]);
    setAutomaticRuleId(null);
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
      necessity: txType === 'expense' ? necessity || undefined : undefined,
      labels: txType === 'transfer' ? undefined : parseTransactionLabelsInput(labelsInput),
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

  const dismissRuleSuggestion = (ruleId: string) => {
    setDismissedRuleIds(current => current.includes(ruleId) ? current : [...current, ruleId]);
  };

  const acceptRuleSuggestion = (match: RuleMatch) => {
    if (match.suggestion.categoryId) {
      setCategoryId(match.suggestion.categoryId);
      setCategoryEditedManually(true);
    }
    if (txType === 'expense' && match.suggestion.necessity) {
      setNecessity(match.suggestion.necessity);
      setNecessityEditedManually(true);
    }
    setAutomaticRuleId(null);
    dismissRuleSuggestion(match.ruleId);
  };

  const handleSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setSubmitError(null);
    try {
      const numAmount = Number(amount);
      const amountCents = toCents(numAmount);
      let success: boolean;
      if (txType === 'transfer') {
        success = await addAccountTransfer({
          fromAccountId: accountId,
          toAccountId,
          amount: amountCents,
          date,
          note: transferNote,
        });
      } else if (txType === 'expense') {
        const fields = {
          accountId: paymentMethod === 'credit' ? undefined : accountId || undefined,
          concept,
          amount: amountCents,
          categoryId,
          date,
          nature: expenseSubtype,
          paymentMethod,
          debtId: paymentMethod === 'credit' ? debtId : undefined,
          necessity: necessity || undefined,
          labels: parseTransactionLabelsInput(labelsInput),
        };
        success = editingExpense
          ? await updateExpense({ ...editingExpense, ...fields })
          : await addExpense(fields);
      } else {
        const fields = {
          accountId: accountId || undefined,
          description: concept,
          amount: amountCents,
          categoryId,
          date,
          type: incomeSubtype,
          labels: parseTransactionLabelsInput(labelsInput),
        };
        success = editingIncome
          ? await updateIncomeItem({ ...editingIncome, ...fields })
          : await addIncomeItem(
              fields,
              needsIncomeHistoryExtension
                ? { accountHistoryOpeningBalance: toCents(historyOpeningBalance) }
                : undefined,
            );
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
      <DialogContent className="overflow-x-hidden p-0 sm:max-w-[500px]" data-global-composer="prisma">
        <DialogHeader className="border-b border-border/70 px-6 pb-4 pt-5 text-left">
          <DialogDescription className="text-[9px] font-bold uppercase tracking-[0.16em]">Acción global</DialogDescription>
          <DialogTitle className="font-display text-2xl font-normal tracking-[-0.03em]">{isEditing ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
        </DialogHeader>

        <fieldset disabled={isSaving || saved} className="contents">
          <motion.div
            data-quick-add-step="amount"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'flex flex-col items-center gap-2 px-6 py-7 transition-colors',
              txType === 'expense' ? 'bg-[hsl(var(--brand-coral)/0.09)]' : txType === 'income' ? 'bg-[hsl(var(--brand-mint)/0.10)]' : 'bg-[hsl(var(--brand-lavender)/0.10)]',
            )}
          >
            <label htmlFor="quick-add-amount" className="text-xs text-muted-foreground">
              {saved
                ? (txType === 'expense' ? 'Gasto registrado' : txType === 'income' ? 'Ingreso registrado' : 'Transferencia registrada')
                : (isEditing ? 'Editando movimiento' : 'Monto')}
            </label>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-medium">{currencyInputLabel(currency)}</span>
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
                className="w-[220px] border-none bg-transparent text-center font-display text-[2.75rem] font-normal tracking-[-0.05em] tabular-nums outline-none placeholder:text-muted-foreground/30"
              />
            </div>
          </motion.div>

          {!isEditing && (
            <QuickAddTemplateSelector
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onSelect={handleTemplateSelection}
              onDelete={handleDeleteTemplate}
            />
          )}

          <div className="space-y-5 px-6 py-5">
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
                      'flex min-h-12 flex-col items-center justify-center gap-1 rounded-[var(--radius-interactive)] border px-2 py-2 text-xs font-semibold transition-[background-color,border-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]',
                      txType === type ? 'border-primary/35 bg-primary/10 text-primary shadow-[var(--shadow-control)]' : 'border-border bg-card text-muted-foreground hover:bg-muted/35',
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
                  <p className="text-xs text-muted-foreground">No afecta ingresos ni gastos.</p>
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
                <NativeSelect
                  aria-label="Categoría"
                  value={categoryId}
                  onChange={event => {
                    setCategoryId(event.target.value);
                    setCategoryEditedManually(true);
                    setAutomaticRuleId(null);
                  }}
                  className="h-11 bg-card"
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </NativeSelect>
              </label>
            )}

            <details open={isEditing} className="group rounded-[var(--radius-card)] border bg-card shadow-[var(--shadow-control)]" data-quick-add-details="prisma">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
                Más detalles
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="space-y-4 border-t border-border/70 p-4">
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Fecha</span>
                  <Input type="date" aria-label="Fecha del movimiento" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} />
                </label>

                {needsIncomeHistoryExtension && selectedAccount && (
                  <div className="space-y-2 rounded-[var(--radius-interactive)] border bg-muted/25 p-3" data-retroactive-income-extension="true">
                    <p className="text-sm font-medium">Ampliará el historial de {selectedAccount.name} hasta {date}.</p>
                    {historyExtensionDateAllowed ? (
                      <>
                        <label className="block space-y-1 text-sm">
                          <span className="text-muted-foreground">Saldo al inicio de esa fecha</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            aria-label="Saldo al inicio de la fecha retroactiva"
                            value={historyOpeningBalance}
                            onChange={event => setHistoryOpeningBalance(event.target.value)}
                            placeholder="0.00"
                          />
                        </label>
                      </>
                    ) : (
                      <p className="text-xs text-destructive" role="alert">
                        Solo puedes ampliar el historial desde {historyBounds.min}.
                      </p>
                    )}
                  </div>
                )}

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

                    {!isEditing && (
                      <TransactionRuleSuggestions
                        automaticRuleId={automaticRuleId}
                        automaticRuleSuggestion={automaticRuleSuggestion}
                        hasAutomaticConflict={ruleResolution.hasAutomaticConflict}
                        ruleSuggestions={ruleSuggestions}
                        categoryName={id => getCategoryInfo(id)?.name || id}
                        onAccept={acceptRuleSuggestion}
                        onDismiss={dismissRuleSuggestion}
                      />
                    )}

                    {txType === 'expense' && (
                      <label className="block space-y-1 text-sm">
                        <span className="text-muted-foreground">Necesidad</span>
                        <NativeSelect
                          aria-label="Necesidad"
                          value={necessity}
                          onChange={event => {
                            setNecessity(event.target.value as typeof necessity);
                            setNecessityEditedManually(true);
                            setAutomaticRuleId(null);
                          }}
                          className=""
                        >
                          <option value="">Sin clasificar</option>
                          <option value="must">Must · imprescindible</option>
                          <option value="need">Need · necesario</option>
                          <option value="want">Want · deseo</option>
                        </NativeSelect>
                      </label>
                    )}

                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Etiquetas</span>
                      <Input
                        aria-label="Etiquetas"
                        placeholder="casa, trabajo, reembolso"
                        value={labelsInput}
                        onChange={event => setLabelsInput(event.target.value)}
                        maxLength={500}
                      />
                      <span className="block text-xs text-muted-foreground">Separa con comas. Máximo 12 etiquetas de 40 caracteres.</span>
                    </label>

                    {txType === 'expense' ? (
                      <>
                        <label className="block space-y-1 text-sm">
                          <span className="text-muted-foreground">Naturaleza</span>
                          <NativeSelect
                            aria-label="Naturaleza"
                            value={expenseSubtype}
                            onChange={event => setExpenseSubtype(event.target.value as typeof expenseSubtype)}
                            className=""
                          >
                            <option value="Variable">Variable</option>
                            <option value="Ocasional">Ocasional</option>
                            <option value="Fijo">Fijo</option>
                          </NativeSelect>
                        </label>

                        <div className="space-y-2">
                          <span className="text-sm text-muted-foreground">Método de pago</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              aria-pressed={paymentMethod === 'cash'}
                              onClick={() => { setPaymentMethod('cash'); setDebtId(''); if (!accountId) setAccountId(defaultCashId); }}
                              className={cn('flex min-h-11 items-center justify-center gap-2 rounded-md border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', paymentMethod === 'cash' && 'border-primary/40 bg-primary/10 text-primary')}
                            >
                              <Banknote className="h-4 w-4" /> Efectivo / banco
                            </button>
                            <button
                              type="button"
                              disabled={debts.length === 0}
                              aria-pressed={paymentMethod === 'credit'}
                              onClick={() => { setPaymentMethod('credit'); setDebtId(debtId || debts[0]?.id || ''); }}
                              className={cn('flex min-h-11 items-center justify-center gap-2 rounded-md border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50', paymentMethod === 'credit' && 'border-primary/40 bg-primary/10 text-primary')}
                            >
                              <CreditCard className="h-4 w-4" /> Tarjeta
                            </button>
                          </div>
                        </div>

                        {paymentMethod === 'credit' && (
                          <label className="block space-y-1 text-sm">
                            <span className="text-muted-foreground">Tarjeta</span>
                            <NativeSelect
                              aria-label="Tarjeta"
                              value={debtId}
                              onChange={event => setDebtId(event.target.value)}
                              className=""
                            >
                              <option value="">Selecciona una tarjeta</option>
                              {debts.map(debt => <option key={debt.id} value={debt.id}>{debt.name}</option>)}
                            </NativeSelect>
                          </label>
                        )}
                      </>
                    ) : (
                      <label className="block space-y-1 text-sm">
                        <span className="text-muted-foreground">Tipo de ingreso</span>
                        <NativeSelect
                          aria-label="Tipo de ingreso"
                          value={incomeSubtype}
                          onChange={event => setIncomeSubtype(event.target.value as typeof incomeSubtype)}
                          className=""
                        >
                          <option value="extra">Adicional</option>
                          <option value="gift">Regalo / otro</option>
                        </NativeSelect>
                      </label>
                    )}
                  </>
                )}

                {!isEditing && (
                  <QuickAddTemplateSave
                    templateName={templateName}
                    templateReady={templateReady}
                    onNameChange={setTemplateName}
                    onSave={handleSaveTemplate}
                  />
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
                        <AlertDialogAction variant="destructive" onClick={handleDelete}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button
                  className="h-12 flex-1 text-base font-semibold shadow-[var(--shadow-control)]"
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
                className="flex items-center justify-center rounded-[var(--radius-interactive)] bg-[hsl(var(--brand-mint)/0.10)] py-4"
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
