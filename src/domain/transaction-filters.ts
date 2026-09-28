import type { TransactionNecessity } from './models';

export type MovementFilterType = 'income' | 'expense' | 'transfer' | 'payment' | 'saving' | 'opening';

export type TransactionFilters = {
  accountId?: string;
  categoryId?: string;
  dateStart?: string;
  dateEnd?: string;
  amountMin?: number; // cents, inclusive
  amountMax?: number; // cents, inclusive
  necessity?: TransactionNecessity;
  label?: string;
  type?: MovementFilterType;
};

export type FilterableMovement = {
  id: string;
  kind: MovementFilterType;
  amount: number;
  date: string;
  categoryId?: string;
  accountIds?: string[];
  necessity?: TransactionNecessity;
  labels?: string[];
};

function normalized(value:string|undefined) {
  return (value || '').trim().toLocaleLowerCase('es');
}

export function applyTransactionFilters<T extends FilterableMovement>(rows:T[], filters:TransactionFilters):T[] {
  const wantedLabel=normalized(filters.label);
  return rows.filter(row => {
    if(filters.type && row.kind!==filters.type) return false;
    if(filters.accountId && !(row.accountIds || []).includes(filters.accountId)) return false;
    if(filters.categoryId && row.categoryId!==filters.categoryId) return false;
    if(filters.dateStart && row.date.slice(0,10)<filters.dateStart) return false;
    if(filters.dateEnd && row.date.slice(0,10)>filters.dateEnd) return false;
    if(filters.amountMin!==undefined && row.amount<filters.amountMin) return false;
    if(filters.amountMax!==undefined && row.amount>filters.amountMax) return false;
    if(filters.necessity && row.necessity!==filters.necessity) return false;
    if(wantedLabel && !(row.labels || []).some(label=>normalized(label)===wantedLabel)) return false;
    return true;
  });
}

export function hasTransactionFilters(filters:TransactionFilters):boolean {
  return Object.values(filters).some(value=>value!==undefined && value!=='');
}
