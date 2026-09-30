import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const { selectAccountEntries, selectPosition } = await import(pathToFileURL(new URL('../src/domain/ledger.ts', import.meta.url).pathname).href);

const through = '2026-09-30';
const sizes = [1_000, 10_000, 50_000];
const accountCount = 8;

function makeDataset(size) {
  const accounts = Array.from({ length: accountCount }, (_, i) => ({
    id: `account-${i}`,
    name: `Account ${i}`,
    type: i === 0 ? 'cash' : i === accountCount - 1 ? 'investment' : 'bank',
    currency: 'DOP',
    openingBalance: 1_000_000,
    startDate: '2020-01-01',
  }));
  const data = { incomes: [], expenses: [], payments: [], transfers: [] };
  for (let i = 0; i < size; i += 1) {
    const accountId = `account-${i % accountCount}`;
    const date = `2026-09-${String((i % 28) + 1).padStart(2, '0')}`;
    switch (i % 4) {
      case 0: data.incomes.push({ id:`i-${i}`, accountId, date, amount:1000, categoryId:'salary', description:'Benchmark', type:'extra' }); break;
      case 1: data.expenses.push({ id:`e-${i}`, accountId, date, amount:500, categoryId:'other', concept:'Benchmark', nature:'Variable', paymentMethod:'cash' }); break;
      case 2: data.payments.push({ id:`p-${i}`, accountId, debtId:'card', date, amount:250 }); break;
      default: data.transfers.push({ id:`t-${i}`, fromAccountId:accountId, toAccountId:`account-${(i + 1) % accountCount}`, date, amount:100, note:'Benchmark' });
    }
  }
  return { accounts, data };
}

function median(values) {
  const sorted = [...values].sort((a,b)=>a-b);
  return sorted[Math.floor(sorted.length / 2)];
}

function measure(fn, samples = 7) {
  fn();
  const values = [];
  for (let i=0;i<samples;i+=1) {
    const start=performance.now(); fn(); values.push(performance.now()-start);
  }
  return { medianMs: median(values), samplesMs: values };
}

for (const size of sizes) {
  const { accounts, data } = makeDataset(size);
  const position = measure(() => selectPosition(accounts, [], data, through));
  const histories = measure(() => accounts.map(account => selectAccountEntries(account, data, through)));
  console.log(JSON.stringify({ movements:size, accounts:accountCount, position, histories }));
}
