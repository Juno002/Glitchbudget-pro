import type { TransactionNecessity } from './models';

export const TRANSACTION_NECESSITIES: TransactionNecessity[] = ['must','need','want'];

export const NECESSITY_LABELS: Record<TransactionNecessity,string> = {
  must:'Must',
  need:'Need',
  want:'Want',
};

export function normalizeTransactionLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result:string[]=[];
  const seen=new Set<string>();
  for(const item of value) {
    if(typeof item!=='string') continue;
    const label=item.trim().replace(/\s+/g,' ').slice(0,40);
    if(!label) continue;
    const key=label.toLocaleLowerCase('es');
    if(seen.has(key)) continue;
    seen.add(key);
    result.push(label);
    if(result.length>=12) break;
  }
  return result;
}

export function parseTransactionLabelsInput(value:string): string[] {
  return normalizeTransactionLabels(value.split(','));
}

export function normalizeNecessity(value:unknown): TransactionNecessity | undefined {
  return TRANSACTION_NECESSITIES.includes(value as TransactionNecessity)
    ? value as TransactionNecessity
    : undefined;
}
