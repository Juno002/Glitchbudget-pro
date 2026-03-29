'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { getCategoryInfo } from '@/lib/categories';
import { formatCurrency, cn } from '@/lib/utils';
import type { Expense, Income } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, ArrowLeft, Trash2 } from 'lucide-react';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'new' | 'edit';
  editingExpense?: Expense;
  editingIncome?: Income;
}

type TransactionType = 'income' | 'expense';

export default function TransactionModal({ open, onClose, mode, editingExpense, editingIncome }: TransactionModalProps) {
  const {
    addExpense, updateExpense, deleteExpense,
    addIncomeItem, updateIncomeItem, deleteIncomeItem,
    expenseCategories, incomeCategories,
  } = useFinances();

  // --- Local state ---
  const [step, setStep] = useState(1);
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseType, setExpenseType] = useState<'Fijo' | 'Variable' | 'Ocasional'>('Variable');
  const [incomeType, setIncomeType] = useState<'extra' | 'gift'>('extra');
  const [frequency, setFrequency] = useState<'mensual' | 'quincenal' | 'semanal'>('mensual');

  // Determine if we're editing
  const isEditing = mode === 'edit';
  const editingType: TransactionType | null = editingExpense ? 'expense' : editingIncome ? 'income' : null;

  // Reset / populate state when modal opens
  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && editingExpense) {
      setTxType('expense');
      setAmount(String(editingExpense.amount / 100));
      setCategoryId(editingExpense.categoryId);
      setConcept(editingExpense.concept);
      setDate(editingExpense.date);
      setExpenseType(editingExpense.type);
      setFrequency(editingExpense.frequency || 'mensual');
      setStep(5); // jump to full-form view
    } else if (mode === 'edit' && editingIncome) {
      setTxType('income');
      setAmount(String(editingIncome.amount / 100));
      setCategoryId(editingIncome.categoryId);
      setConcept(editingIncome.description);
      setDate(editingIncome.date);
      setIncomeType(editingIncome.type);
      setStep(5);
    } else {
      // new mode — start from step 1
      setStep(1);
      setTxType('expense');
      setAmount('');
      setCategoryId('');
      setConcept('');
      setDate(new Date().toISOString().slice(0, 10));
      setExpenseType('Variable');
      setIncomeType('extra');
      setFrequency('mensual');
    }
  }, [open, mode, editingExpense, editingIncome]);

  const categories = useMemo(() => {
    const ids = txType === 'income' ? incomeCategories : expenseCategories;
    return ids.map(id => getCategoryInfo(id)).filter(Boolean) as NonNullable<ReturnType<typeof getCategoryInfo>>[];
  }, [txType, incomeCategories, expenseCategories]);

  const canSave = Number(amount) > 0 && categoryId;

  const handleSave = () => {
    const numAmount = Number(amount);
    if (numAmount <= 0 || !categoryId) return;

    if (isEditing) {
      if (editingExpense) {
        updateExpense({
          ...editingExpense,
          concept,
          amount: numAmount,
          categoryId,
          date,
          type: expenseType,
          frequency: expenseType === 'Fijo' ? frequency : undefined,
        });
      } else if (editingIncome) {
        updateIncomeItem({
          ...editingIncome,
          description: concept,
          amount: numAmount,
          categoryId,
          date,
          type: incomeType,
        });
      }
    } else {
      // New
      if (txType === 'expense') {
        addExpense({
          concept,
          amount: numAmount,
          categoryId,
          date,
          type: expenseType,
          frequency: expenseType === 'Fijo' ? frequency : undefined,
        });
      } else {
        addIncomeItem({
          description: concept,
          amount: numAmount,
          categoryId,
          date,
          type: incomeType,
        });
      }
    }
    onClose();
  };

  const handleDelete = () => {
    if (editingExpense) {
      deleteExpense(editingExpense.id);
    } else if (editingIncome) {
      deleteIncomeItem(editingIncome.id);
    }
    onClose();
  };

  // --- Step renderers ---

  const renderStep1_TypeSelector = () => (
    <div className="flex flex-col items-center gap-6 py-8">
      <p className="text-sm text-muted-foreground">¿Qué deseas registrar?</p>
      <div className="flex gap-4">
        <button
          onClick={() => { setTxType('expense'); setStep(2); }}
          className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,45,120,0.08)] hover:border-[rgba(255,45,120,0.3)] transition-all group"
        >
          <TrendingDown className="h-10 w-10 text-rose-500 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Gasto</span>
        </button>
        <button
          onClick={() => { setTxType('income'); setStep(2); }}
          className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(0,255,136,0.08)] hover:border-[rgba(0,255,136,0.3)] transition-all group"
        >
          <TrendingUp className="h-10 w-10 text-emerald-500 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Ingreso</span>
        </button>
      </div>
    </div>
  );

  const renderStep2_Amount = () => (
    <div className="flex flex-col items-center gap-6 py-8">
      <p className="text-sm text-muted-foreground">¿Cuánto?</p>
      <div className="relative w-full max-w-[240px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">RD$</span>
        <Input
          type="number"
          inputMode="decimal"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-center text-3xl font-semibold h-16 pl-12"
          placeholder="0.00"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setStep(1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
        </Button>
        <Button
          size="sm"
          disabled={!Number(amount)}
          onClick={() => setStep(3)}
          className="bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );

  const renderStep3_Category = () => (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-sm text-muted-foreground text-center">Selecciona la categoría</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1">
        {categories.map(cat => {
          const Icon = cat.icon;
          const isSelected = categoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setCategoryId(cat.id); setStep(4); }}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs",
                isSelected
                  ? "border-[rgba(0,255,136,0.4)] bg-[rgba(0,255,136,0.08)]"
                  : "border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.04)]"
              )}
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="truncate w-full text-center">{cat.name}</span>
            </button>
          );
        })}
      </div>
      <Button variant="outline" size="sm" className="self-start" onClick={() => setStep(2)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
      </Button>
    </div>
  );

  const renderStep4_Details = () => (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-sm text-muted-foreground text-center">Detalles opcionales</p>

      <Input
        placeholder={txType === 'expense' ? 'Concepto (ej: Café con amigos)' : 'Descripción (ej: Proyecto freelance)'}
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
      />

      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {txType === 'expense' && (
        <Select value={expenseType} onValueChange={(v) => setExpenseType(v as any)}>
          <SelectTrigger><SelectValue placeholder="Tipo de gasto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Variable">Variable</SelectItem>
            <SelectItem value="Ocasional">Ocasional</SelectItem>
            <SelectItem value="Fijo">Fijo</SelectItem>
          </SelectContent>
        </Select>
      )}

      {txType === 'expense' && expenseType === 'Fijo' && (
        <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
          <SelectTrigger><SelectValue placeholder="Frecuencia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mensual">Mensual</SelectItem>
            <SelectItem value="quincenal">Quincenal</SelectItem>
            <SelectItem value="semanal">Semanal</SelectItem>
          </SelectContent>
        </Select>
      )}

      {txType === 'income' && (
        <Select value={incomeType} onValueChange={(v) => setIncomeType(v as any)}>
          <SelectTrigger><SelectValue placeholder="Tipo de ingreso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="extra">Adicional</SelectItem>
            <SelectItem value="gift">Regalo / Otro</SelectItem>
          </SelectContent>
        </Select>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => setStep(3)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]"
          disabled={!canSave}
          onClick={handleSave}
        >
          Guardar
        </Button>
      </div>
    </div>
  );

  // Edit mode: all fields at once
  const renderEditForm = () => {
    const selectedCat = getCategoryInfo(categoryId);
    return (
      <div className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {editingType === 'expense' 
            ? <TrendingDown className="h-4 w-4 text-rose-500" />
            : <TrendingUp className="h-4 w-4 text-emerald-500" />
          }
          <span>{editingType === 'expense' ? 'Editando Gasto' : 'Editando Ingreso'}</span>
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">RD$</span>
          <Input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-xl font-semibold h-12 pl-12"
          />
        </div>

        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder={txType === 'expense' ? 'Concepto' : 'Descripción'}
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
        />

        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {txType === 'expense' && (
          <Select value={expenseType} onValueChange={(v) => setExpenseType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Variable">Variable</SelectItem>
              <SelectItem value="Ocasional">Ocasional</SelectItem>
              <SelectItem value="Fijo">Fijo</SelectItem>
            </SelectContent>
          </Select>
        )}

        {txType === 'expense' && expenseType === 'Fijo' && (
          <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="quincenal">Quincenal</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
            </SelectContent>
          </Select>
        )}

        {txType === 'income' && (
          <Select value={incomeType} onValueChange={(v) => setIncomeType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="extra">Adicional</SelectItem>
              <SelectItem value="gift">Regalo / Otro</SelectItem>
            </SelectContent>
          </Select>
        )}

        <div className="flex gap-2 pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10">
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente este {editingType === 'expense' ? 'gasto' : 'ingreso'}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            size="sm"
            className="flex-1 bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]"
            disabled={!canSave}
            onClick={handleSave}
          >
            Guardar Cambios
          </Button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isEditing || step === 5) return renderEditForm();
    switch (step) {
      case 1: return renderStep1_TypeSelector();
      case 2: return renderStep2_Amount();
      case 3: return renderStep3_Category();
      case 4: return renderStep4_Details();
      default: return renderStep1_TypeSelector();
    }
  };

  const getTitle = () => {
    if (isEditing) return 'Editar Registro';
    switch (step) {
      case 1: return 'Nuevo Movimiento';
      case 2: return txType === 'expense' ? 'Nuevo Gasto' : 'Nuevo Ingreso';
      case 3: return 'Categoría';
      case 4: return 'Detalles';
      default: return 'Nuevo Movimiento';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          {!isEditing && step === 1 && (
            <DialogDescription>Selecciona el tipo de transacción para comenzar.</DialogDescription>
          )}
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
