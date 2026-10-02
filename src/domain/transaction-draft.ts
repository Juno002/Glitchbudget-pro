export type TransactionDraftType = 'expense' | 'income' | 'transfer';

export type TransactionDraftSaveInput = {
  type: TransactionDraftType;
  validAmount: boolean;
  validDate: boolean;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  paymentMethod: 'cash' | 'credit';
  debtId: string;
  hasAccountForActual: boolean;
  saved: boolean;
  saving: boolean;
};

export function canSaveTransactionDraft(input: TransactionDraftSaveInput): boolean {
  if (!input.validAmount || !input.validDate || input.saved || input.saving) return false;

  if (input.type === 'transfer') {
    return Boolean(
      input.accountId
      && input.toAccountId
      && input.accountId !== input.toAccountId,
    );
  }

  if (!input.categoryId) return false;
  if (input.type === 'expense' && input.paymentMethod === 'credit') {
    return Boolean(input.debtId);
  }

  return input.hasAccountForActual;
}
