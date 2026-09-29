import assert from 'node:assert/strict';
import test from 'node:test';

import { selectInvestmentManagerRows } from '../src/domain/investments';
import { selectActiveCreditCards, selectActiveDebts } from '../src/domain/ledger';
import { selectPlannedPaymentsManagerReadModel } from '../src/domain/upcoming';
import type { Account, Debt, Investment, PlannedOccurrence, RecurringRule } from '../src/domain/models';

test('final investment manager read model joins account value and projection outside React', () => {
  const account: Account = {
    id:'investment-account', name:'Certificado', type:'investment', currency:'DOP',
    openingBalance:105_000, startDate:'2026-01-01',
  };
  const investment: Investment = {
    id:'investment', accountId:account.id, type:'certificate', name:'Certificado',
    openedAt:'2026-01-01', maturityDate:'2027-01-01', principal:100_000,
    annualRate:0.12, compoundingMethod:'simple', status:'active',
  };
  const rows = selectInvestmentManagerRows({
    accounts:[account], investments:[investment],
    incomes:[], expenses:[], payments:[], transfers:[],
  }, '2026-09-29');

  assert.equal(rows.length,1);
  assert.equal(rows[0].currentValue,105_000);
  assert.equal(rows[0].account.id,account.id);
  assert.equal(rows[0].projection.estimatedMaturityValue,112_000);
});

test('final planned payments read model owns grouping, recent status and rule ordering', () => {
  const rules: RecurringRule[] = [
    { id:'paused', direction:'expense', title:'B', categoryId:'food', amount:1000, cadence:'monthly', startDate:'2026-01-01', active:false },
    { id:'active', direction:'expense', title:'A', categoryId:'food', amount:1000, cadence:'monthly', startDate:'2026-01-01', active:true },
  ];
  const occurrences: PlannedOccurrence[] = [
    { id:'pending', ruleId:'active', scheduledDate:'2026-09-29', status:'pending' },
    { id:'confirmed', ruleId:'active', scheduledDate:'2026-09-28', status:'confirmed', transactionId:'tx' },
    { id:'skipped', ruleId:'paused', scheduledDate:'2026-09-27', status:'skipped' },
  ];

  const model = selectPlannedPaymentsManagerReadModel(occurrences,rules,'2026-09-29');
  assert.equal(model.unresolvedCount,1);
  assert.equal(model.grouped.today[0].id,'pending');
  assert.equal(model.sortedRules[0].id,'active');
  assert.deepEqual(model.recentResolved.map(row=>row.id),['confirmed','skipped']);
  assert.equal(model.rulesById.get('active')?.title,'A');
});

test('active debt selectors centralize debt/card eligibility', () => {
  const debts: Debt[] = [
    { id:'active-card', name:'Card', type:'credit_card', principal:1000, apr:0, minPayment:0, createdAt:'2026-01-01', status:'active' },
    { id:'closed-card', name:'Old', type:'credit_card', principal:1000, apr:0, minPayment:0, createdAt:'2026-01-01', status:'paid' },
    { id:'loan', name:'Loan', type:'loan', principal:1000, apr:0, minPayment:0, createdAt:'2026-01-01', status:'active' },
  ];

  assert.deepEqual(selectActiveDebts(debts).map(row=>row.id),['active-card','loan']);
  assert.deepEqual(selectActiveCreditCards(debts).map(row=>row.id),['active-card']);
});
