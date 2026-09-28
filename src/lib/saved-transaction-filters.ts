import type { MovementFilterType, TransactionFilters } from '../domain/transaction-filters';
import { normalizeNecessity } from '../domain/transaction-metadata';

export const SAVED_TRANSACTION_FILTERS_KEY='glitchbudget_saved_transaction_filters_v1';

export type SavedTransactionFilter = {
  id:string;
  name:string;
  filters:TransactionFilters;
};

type FilterStorage = Pick<Storage,'getItem'|'setItem'>;
const types:MovementFilterType[]=['income','expense','transfer','payment','saving','opening'];

function cleanText(value:unknown,max=100) {
  return typeof value==='string' ? value.trim().slice(0,max) : '';
}
function cleanDate(value:unknown) {
  const text=cleanText(value,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined;
}
function cleanCents(value:unknown) {
  return typeof value==='number' && Number.isSafeInteger(value) && value>=0 ? value : undefined;
}

export function normalizeTransactionFilters(value:unknown):TransactionFilters {
  const raw=(value && typeof value==='object' ? value : {}) as Partial<TransactionFilters>;
  let dateStart=cleanDate(raw.dateStart);
  let dateEnd=cleanDate(raw.dateEnd);
  if(dateStart && dateEnd && dateStart>dateEnd) [dateStart,dateEnd]=[dateEnd,dateStart];
  let amountMin=cleanCents(raw.amountMin);
  let amountMax=cleanCents(raw.amountMax);
  if(amountMin!==undefined && amountMax!==undefined && amountMin>amountMax) [amountMin,amountMax]=[amountMax,amountMin];
  return {
    accountId:cleanText(raw.accountId) || undefined,
    categoryId:cleanText(raw.categoryId) || undefined,
    dateStart,
    dateEnd,
    amountMin,
    amountMax,
    necessity:normalizeNecessity(raw.necessity),
    label:cleanText(raw.label,40) || undefined,
    type:types.includes(raw.type as MovementFilterType) ? raw.type : undefined,
  };
}

function normalizeSaved(value:unknown):SavedTransactionFilter|null {
  if(!value || typeof value!=='object') return null;
  const raw=value as Partial<SavedTransactionFilter>;
  const id=cleanText(raw.id);
  const name=cleanText(raw.name,80);
  if(!id || !name) return null;
  return {id,name,filters:normalizeTransactionFilters(raw.filters)};
}

export function loadSavedTransactionFilters(storage:FilterStorage):SavedTransactionFilter[] {
  try {
    const parsed=JSON.parse(storage.getItem(SAVED_TRANSACTION_FILTERS_KEY)||'[]');
    if(!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSaved).filter((row):row is SavedTransactionFilter=>Boolean(row)).slice(0,20);
  } catch {
    return [];
  }
}

export function writeSavedTransactionFilters(storage:FilterStorage,rows:SavedTransactionFilter[]) {
  storage.setItem(SAVED_TRANSACTION_FILTERS_KEY,JSON.stringify(rows.slice(0,20)));
}

export function upsertSavedTransactionFilter(storage:FilterStorage,row:SavedTransactionFilter) {
  const normalized=normalizeSaved(row);
  if(!normalized) throw new Error('El filtro guardado necesita un nombre válido.');
  const next=[normalized,...loadSavedTransactionFilters(storage).filter(item=>item.id!==normalized.id)].slice(0,20);
  writeSavedTransactionFilters(storage,next);
  return next;
}

export function removeSavedTransactionFilter(storage:FilterStorage,id:string) {
  const next=loadSavedTransactionFilters(storage).filter(row=>row.id!==id);
  writeSavedTransactionFilters(storage,next);
  return next;
}
