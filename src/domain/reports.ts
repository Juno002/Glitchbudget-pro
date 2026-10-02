import type { Account, AccountTransfer, Debt, DebtPayment, Expense, Income } from './models';
import { selectPosition } from './ledger';
import { contains, type DateRange } from './periods';
import { selectPositionKpiComparisons } from './kpi-comparisons';
import { selectReportQuickRead } from './report-insights';
import { partitionCanonicalFinancialDates } from './financial-date';

export type ReportRangePreset = '7d' | '30d' | '3m' | '6m' | '1y' | 'custom';

export interface ReportsSnapshotInput {
  accounts: Account[];
  debts: Debt[];
  incomes: Income[];
  expenses: Expense[];
  debtPayments: DebtPayment[];
  transfers: AccountTransfer[];
}

type CivilDate = { year:number; month:number; day:number };

function isLeapYear(year:number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function daysInMonth(year:number, month:number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4,6,9,11].includes(month) ? 30 : 31;
}
function parseDate(value:string): CivilDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0,10));
  if (!match) throw new Error('Fecha inválida.');
  const result = { year:Number(match[1]), month:Number(match[2]), day:Number(match[3]) };
  if (result.month < 1 || result.month > 12 || result.day < 1 || result.day > daysInMonth(result.year,result.month)) throw new Error('Fecha inválida.');
  return result;
}
function formatDate({year,month,day}:CivilDate) {
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function ordinal(value:string):number {
  let {year,month,day}=parseDate(value);
  year -= month <= 2 ? 1 : 0;
  const era=Math.floor(year/400);
  const yoe=year-era*400;
  const mp=month+(month>2?-3:9);
  const doy=Math.floor((153*mp+2)/5)+day-1;
  const doe=yoe*365+Math.floor(yoe/4)-Math.floor(yoe/100)+doy;
  return era*146097+doe;
}
function fromOrdinal(value:number):string {
  const z=value;
  const era=Math.floor(z/146097);
  const doe=z-era*146097;
  const yoe=Math.floor((doe-Math.floor(doe/1460)+Math.floor(doe/36524)-Math.floor(doe/146096))/365);
  let year=yoe+era*400;
  const doy=doe-(365*yoe+Math.floor(yoe/4)-Math.floor(yoe/100));
  const mp=Math.floor((5*doy+2)/153);
  const day=doy-Math.floor((153*mp+2)/5)+1;
  const month=mp+(mp<10?3:-9);
  year += month <= 2 ? 1 : 0;
  return formatDate({year,month,day});
}
function addDays(value:string, delta:number) {
  return fromOrdinal(ordinal(value)+Math.trunc(delta));
}
function shiftMonthsClamped(value:string, delta:number) {
  const {year,month,day}=parseDate(value);
  const serial=year*12+(month-1)+delta;
  const nextYear=Math.floor(serial/12);
  const nextMonth=((serial%12)+12)%12+1;
  return formatDate({year:nextYear,month:nextMonth,day:Math.min(day,daysInMonth(nextYear,nextMonth))});
}
function rangeDays(range:DateRange) {
  if (range.start > range.end) throw new Error('Rango inválido.');
  return ordinal(range.end)-ordinal(range.start)+1;
}

export function resolveReportRange(preset:ReportRangePreset, anchor:string, custom?:DateRange):DateRange {
  parseDate(anchor);
  if (preset === 'custom') {
    if (!custom) throw new Error('Define un rango personalizado.');
    parseDate(custom.start); parseDate(custom.end);
    if (custom.start > custom.end) throw new Error('Rango personalizado inválido.');
    if (custom.end > anchor) throw new Error('El reporte no puede terminar en el futuro.');
    return {start:custom.start,end:custom.end};
  }
  if (preset === '7d') return {start:addDays(anchor,-6),end:anchor};
  if (preset === '30d') return {start:addDays(anchor,-29),end:anchor};
  const months=preset === '3m' ? 3 : preset === '6m' ? 6 : 12;
  return {start:addDays(shiftMonthsClamped(anchor,-months),1),end:anchor};
}

export function previousComparableRange(range:DateRange):DateRange {
  const days=rangeDays(range);
  const end=addDays(range.start,-1);
  return {start:addDays(end,-days+1),end};
}

function pctChange(current:number, previous:number):number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current-previous)/Math.abs(previous))*10_000)/100;
}

function spendingForRange(expenses:Expense[], range:DateRange) {
  return expenses.filter(row=>contains(range,row.date));
}
function incomeForRange(incomes:Income[], range:DateRange) {
  return incomes.filter(row=>contains(range,row.date));
}
function paymentsForRange(payments:DebtPayment[], range:DateRange) {
  return partitionCanonicalFinancialDates(payments).valid.filter(row=>contains(range,row.date as string));
}

function categories(rows:Expense[]) {
  const grouped=new Map<string,number>();
  for(const row of rows) grouped.set(row.categoryId,(grouped.get(row.categoryId)||0)+row.amount);
  return Array.from(grouped,([categoryId,value])=>({categoryId,value}))
    .sort((a,b)=>b.value-a.value || a.categoryId.localeCompare(b.categoryId));
}
function natures(rows:Expense[]) {
  const order:Expense['nature'][]=['Fijo','Variable','Ocasional'];
  return order.map(nature=>{
    const matching=rows.filter(row=>row.nature===nature);
    const total=matching.reduce((sum,row)=>sum+row.amount,0);
    return {nature,total,count:matching.length,average:matching.length ? Math.round(total/matching.length) : 0};
  });
}
function largest(rows:Expense[], limit=5) {
  return [...rows]
    .sort((a,b)=>b.amount-a.amount || b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0,limit)
    .map(row=>({id:row.id,date:row.date,amount:row.amount,categoryId:row.categoryId,nature:row.nature,title:row.concept || 'Gasto'}));
}

export function selectSpendingReport(expenses:Expense[], range:DateRange) {
  const currentRows=spendingForRange(expenses,range);
  const previousRange=previousComparableRange(range);
  const previousRows=spendingForRange(expenses,previousRange);
  const total=currentRows.reduce((sum,row)=>sum+row.amount,0);
  const previousTotal=previousRows.reduce((sum,row)=>sum+row.amount,0);
  return {
    total,
    previousTotal,
    difference:total-previousTotal,
    percentChange:pctChange(total,previousTotal),
    categories:categories(currentRows),
    largestTransactions:largest(currentRows),
    byNature:natures(currentRows),
    transactionCount:currentRows.length,
  };
}

export function selectCashFlowReport(input:Pick<ReportsSnapshotInput,'incomes'|'expenses'|'debtPayments'>, range:DateRange) {
  const incomes=incomeForRange(input.incomes,range);
  const expenses=spendingForRange(input.expenses,range);
  const payments=paymentsForRange(input.debtPayments,range);
  const income=incomes.reduce((sum,row)=>sum+row.amount,0);
  const cashExpenses=expenses.filter(row=>row.paymentMethod!=='credit').reduce((sum,row)=>sum+row.amount,0);
  const debtPayments=payments.reduce((sum,row)=>sum+row.amount,0);
  return {income,cashExpenses,debtPayments,netCashFlow:income-cashExpenses-debtPayments};
}

export function selectNetWorthReport(input:ReportsSnapshotInput, through:string) {
  const position=selectPosition(
    input.accounts,
    input.debts,
    {incomes:input.incomes,expenses:input.expenses,payments:input.debtPayments,transfers:input.transfers},
    through,
  );
  return {
    cash:position.cash,
    banks:position.bank,
    investments:position.investmentAssets,
    liabilities:position.liabilities,
    cardPositiveBalance:position.cardPositiveBalance,
    netWorth:position.netWorth,
    liquidAssets:position.liquidAssets,
  };
}

export function selectReportsSnapshot(input:ReportsSnapshotInput, range:DateRange, through=range.end) {
  const previousRange=previousComparableRange(range);
  const spending=selectSpendingReport(input.expenses,range);
  const cashFlow=selectCashFlowReport(input,range);
  const netWorth=selectNetWorthReport(input,through);
  const previousSpending=selectSpendingReport(input.expenses,previousRange);
  const previousCashFlow=selectCashFlowReport(input,previousRange);
  const positionComparisons=selectPositionKpiComparisons(input,range,previousRange,through);

  const comparison={
    spending:{current:spending.total,previous:previousSpending.total,difference:spending.total-previousSpending.total,percentChange:pctChange(spending.total,previousSpending.total)},
    income:{current:cashFlow.income,previous:previousCashFlow.income,difference:cashFlow.income-previousCashFlow.income,percentChange:pctChange(cashFlow.income,previousCashFlow.income)},
    netCashFlow:{current:cashFlow.netCashFlow,previous:previousCashFlow.netCashFlow,difference:cashFlow.netCashFlow-previousCashFlow.netCashFlow,percentChange:pctChange(cashFlow.netCashFlow,previousCashFlow.netCashFlow)},
    netWorth:{
      current:positionComparisons.netWorth.current,
      previous:positionComparisons.netWorth.previous ?? 0,
      difference:positionComparisons.netWorth.absoluteDelta ?? 0,
      percentChange:positionComparisons.netWorth.percentageDelta,
      status:positionComparisons.netWorth.status,
    },
  };
  const quickRead=selectReportQuickRead({spending,comparison});

  return {
    range,
    previousRange,
    spending,
    cashFlow,
    netWorth,
    positionComparisons,
    comparison,
    quickRead,
  };
}