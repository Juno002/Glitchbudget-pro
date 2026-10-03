'use client';

import { useRef, useState } from 'react';
import type { Account, AccountTransfer } from '@/domain/models';
import { addAccount, reconcileDebt, saveTransfer } from '@/lib/accounts';
import { localDate } from '@/lib/finance-calculations';
import { friendlyError } from '@/lib/errors';
import { toCents } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function useAccountManagement(accounts: Account[], currency: string) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [editingAccount, setEditingAccount] = useState('');
  const [editingTransfer, setEditingTransfer] = useState('');
  const [name, setName] = useState('');
  const [cashOpen, setCashOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [opening, setOpening] = useState('');
  const [startDate, setStartDate] = useState(localDate());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDate());
  const [note, setNote] = useState('');
  const [card, setCard] = useState('');
  const [cardBalance, setCardBalance] = useState('');

  const run = async (action: () => Promise<void>, title: string) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await action();
      toast({ title });
    } catch (error) {
      toast({
        title: 'No se guardó el cambio',
        description: friendlyError(error),
        variant: 'destructive',
      });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  const resetAccountDraft = () => {
    setEditingAccount('');
    setName('');
    setOpening('');
    setStartDate(localDate());
  };

  const openManagement = () => {
    resetAccountDraft();
    setOpen(true);
  };

  const editAccount = (account: Account) => {
    setEditingAccount(account.id);
    setName(account.name);
    setOpening(String(account.openingBalance / 100));
    setStartDate(account.startDate);
    if (account.type === 'cash') setCashOpen(true);
    else setOpen(true);
  };

  const editTransfer = (transfer: AccountTransfer) => {
    resetAccountDraft();
    setEditingTransfer(transfer.id);
    setFrom(transfer.fromAccountId);
    setTo(transfer.toAccountId);
    setAmount(String(transfer.amount / 100));
    setDate(transfer.date);
    setNote(transfer.note);
    setOpen(true);
  };

  const submitAccount = async () => {
    await run(async () => {
      const existing = accounts.find(account => account.id === editingAccount);
      await addAccount({
        id: editingAccount || crypto.randomUUID(),
        name,
        type: 'bank',
        currency: existing?.currency || currency,
        openingBalance: toCents(opening),
        startDate,
      }, !!editingAccount);
      resetAccountDraft();
    }, editingAccount ? 'Cuenta actualizada' : 'Cuenta creada');
  };

  const submitTransfer = async () => {
    await run(async () => {
      await saveTransfer({
        id: editingTransfer || crypto.randomUUID(),
        fromAccountId: from,
        toAccountId: to,
        amount: toCents(amount),
        date,
        note,
      }, !!editingTransfer);
      setAmount('');
      setNote('');
      setEditingTransfer('');
    }, editingTransfer ? 'Transferencia actualizada' : 'Transferencia registrada');
  };

  const submitCardReconciliation = async () => {
    await run(async () => {
      await reconcileDebt(card, toCents(cardBalance));
      setCardBalance('');
    }, 'Saldo de tarjeta ajustado');
  };

  const submitCashOpening = async () => {
    await run(async () => {
      const existing = accounts.find(account => account.id === editingAccount);
      if (!existing || existing.type !== 'cash') {
        throw new Error('Cuenta de efectivo no encontrada.');
      }
      await addAccount({ ...existing, openingBalance: toCents(opening), startDate }, true);
      setCashOpen(false);
      resetAccountDraft();
    }, 'Saldo inicial actualizado');
  };

  return {
    open,
    setOpen,
    busy,
    locked,
    editingAccount,
    setEditingAccount,
    editingTransfer,
    setEditingTransfer,
    name,
    setName,
    cashOpen,
    setCashOpen,
    cardsOpen,
    setCardsOpen,
    opening,
    setOpening,
    startDate,
    setStartDate,
    from,
    setFrom,
    to,
    setTo,
    amount,
    setAmount,
    date,
    setDate,
    note,
    setNote,
    card,
    setCard,
    cardBalance,
    setCardBalance,
    resetAccountDraft,
    openManagement,
    editAccount,
    editTransfer,
    submitAccount,
    submitTransfer,
    submitCardReconciliation,
    submitCashOpening,
  };
}
