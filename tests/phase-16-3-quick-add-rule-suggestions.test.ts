import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { quickAddRuleSuggestions } from '../src/domain/rule-suggestions';
import type { RuleMatch } from '../src/domain/rule-engine';

const matches:RuleMatch[]=[
  {
    ruleId:'spotify',
    ruleName:'Spotify',
    suggestion:{categoryId:'entertainment',necessity:'want'},
  },
  {
    ruleId:'farmacia',
    ruleName:'Farmacia',
    suggestion:{categoryId:'health',necessity:'need'},
  },
];

test('16.3 keeps only suggestions compatible with the current Quick Add type/categories',()=>{
  assert.deepEqual(
    quickAddRuleSuggestions(matches,'expense',['entertainment']),
    [{
      ruleId:'spotify',
      ruleName:'Spotify',
      suggestion:{categoryId:'entertainment',necessity:'want'},
    },{
      ruleId:'farmacia',
      ruleName:'Farmacia',
      suggestion:{categoryId:undefined,necessity:'need'},
    }],
  );

  assert.deepEqual(
    quickAddRuleSuggestions(matches,'income',['salary']),
    [],
  );

  assert.deepEqual(
    quickAddRuleSuggestions(matches,'transfer',['entertainment','health']),
    [],
  );
});

test('16.3 preserves input order and never mutates rule matches',()=>{
  const original=structuredClone(matches);
  const result=quickAddRuleSuggestions(matches,'expense',['health','entertainment']);
  assert.deepEqual(result.map(row=>row.ruleId),['spotify','farmacia']);
  result[0].suggestion.categoryId='changed';
  assert.deepEqual(matches,original);
});

test('16.3 Quick Add wiring is suggestion-only: accept/ignore are explicit and rules default to empty',()=>{
  const modal=readFileSync(new URL('../src/components/dashboard/TransactionModal.tsx',import.meta.url),'utf8');

  assert.match(modal,/rules = \[\]/);
  assert.match(modal,/evaluateTransactionRules/);
  assert.match(modal,/quickAddRuleSuggestions/);
  assert.match(modal,/Aceptar sugerencia/);
  assert.match(modal,/Ignorar sugerencia/);
  assert.match(modal,/setCategoryId/);
  assert.match(modal,/setNecessity/);
  assert.doesNotMatch(modal,/localStorage.*rule|rule.*localStorage/i);
  assert.doesNotMatch(modal,/applyAutomatically|autoApply/i);
});

test('16.3 still has no persistent rule source or rule-management UI',()=>{
  const context=readFileSync(new URL('../src/contexts/finance-context.tsx',import.meta.url),'utf8');
  const db=readFileSync(new URL('../src/lib/db.ts',import.meta.url),'utf8');
  const settings=readFileSync(new URL('../src/components/layout/settings-dialog.tsx',import.meta.url),'utf8');

  assert.doesNotMatch(context,/transactionRules|rules:/);
  assert.doesNotMatch(db,/transaction_rules|rules!:/);
  assert.doesNotMatch(settings,/Crear regla|Gestionar reglas|Reglas locales/);
});
