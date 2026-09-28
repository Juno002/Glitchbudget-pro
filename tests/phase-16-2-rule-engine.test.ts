import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  evaluateTransactionRule,
  evaluateTransactionRules,
} from '../src/domain/rule-engine';
import type { TransactionRule } from '../src/domain/rules';

const spotifyRule: TransactionRule = {
  id:'spotify',
  name:'Spotify',
  enabled:true,
  condition:{
    field:'description',
    operator:'contains',
    value:'Spotify',
  },
  suggestion:{
    categoryId:'entertainment',
    necessity:'want',
  },
};

test('16.2 matches description contains deterministically and case-insensitively', () => {
  assert.deepEqual(evaluateTransactionRule('Pago SPOTIFY premium',spotifyRule),{
    ruleId:'spotify',
    ruleName:'Spotify',
    suggestion:{
      categoryId:'entertainment',
      necessity:'want',
    },
  });

  assert.deepEqual(evaluateTransactionRule('  pago   spotify   premium  ',spotifyRule),{
    ruleId:'spotify',
    ruleName:'Spotify',
    suggestion:{
      categoryId:'entertainment',
      necessity:'want',
    },
  });
});

test('16.2 does not match empty, unrelated or disabled rules', () => {
  assert.equal(evaluateTransactionRule('',spotifyRule),null);
  assert.equal(evaluateTransactionRule('Netflix',spotifyRule),null);
  assert.equal(evaluateTransactionRule('Spotify',{...spotifyRule,enabled:false}),null);
});

test('16.2 supports category-only and necessity-only suggestions from the 16.1 contract', () => {
  const categoryOnly:TransactionRule={
    id:'cat',
    name:'Category only',
    enabled:true,
    condition:{field:'description',operator:'contains',value:'supermercado'},
    suggestion:{categoryId:'groceries'},
  };
  const necessityOnly:TransactionRule={
    id:'need',
    name:'Necessity only',
    enabled:true,
    condition:{field:'description',operator:'contains',value:'farmacia'},
    suggestion:{necessity:'need'},
  };

  assert.deepEqual(evaluateTransactionRule('Compra supermercado central',categoryOnly)?.suggestion,{
    categoryId:'groceries',
    necessity:undefined,
  });
  assert.deepEqual(evaluateTransactionRule('Farmacia de turno',necessityOnly)?.suggestion,{
    categoryId:undefined,
    necessity:'need',
  });
});

test('16.2 returns every matching rule in input order without resolving conflicts', () => {
  const rules:TransactionRule[]=[
    spotifyRule,
    {
      id:'subscription',
      name:'Subscription',
      enabled:true,
      condition:{field:'description',operator:'contains',value:'premium'},
      suggestion:{categoryId:'subscriptions'},
    },
    {
      id:'disabled',
      name:'Disabled',
      enabled:false,
      condition:{field:'description',operator:'contains',value:'spotify'},
      suggestion:{necessity:'must'},
    },
  ];

  const matches=evaluateTransactionRules('Spotify Premium',rules);
  assert.deepEqual(matches.map(match=>match.ruleId),['spotify','subscription']);
  assert.equal(matches[0].suggestion.categoryId,'entertainment');
  assert.equal(matches[1].suggestion.categoryId,'subscriptions');
});

test('16.2 does not mutate descriptions, rules or suggestions', () => {
  const description='  Spotify   Premium ';
  const original=structuredClone(spotifyRule);
  const matches=evaluateTransactionRules(description,[spotifyRule]);

  assert.equal(description,'  Spotify   Premium ');
  assert.deepEqual(spotifyRule,original);

  matches[0].suggestion.categoryId='changed';
  assert.equal(spotifyRule.suggestion.categoryId,'entertainment');
});

test('16.2 engine is pure local evaluation with no UI, persistence, AI or network transport', () => {
  const source=readFileSync(new URL('../src/domain/rule-engine.ts',import.meta.url),'utf8');
  assert.doesNotMatch(source,/localStorage|indexedDB|Dexie|db\./i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|XMLHttpRequest|https?:\/\//i);
  assert.doesNotMatch(source,/openai|gemini|anthropic|language model|\bAI\b/i);
  assert.doesNotMatch(source,/applyAutomatically|autoApply|saveExpense|saveIncome|update/i);
});

test('16.2 does not integrate Rules into Quick Add or storage yet', () => {
  const modal=readFileSync(new URL('../src/components/dashboard/TransactionModal.tsx',import.meta.url),'utf8');
  const templates=readFileSync(new URL('../src/lib/quick-add-templates.ts',import.meta.url),'utf8');
  const filters=readFileSync(new URL('../src/lib/saved-transaction-filters.ts',import.meta.url),'utf8');
  const db=readFileSync(new URL('../src/lib/db.ts',import.meta.url),'utf8');

  assert.doesNotMatch(modal,/evaluateTransactionRule|evaluateTransactionRules|RuleMatch/);
  assert.doesNotMatch(templates,/evaluateTransactionRule|evaluateTransactionRules|RuleMatch/);
  assert.doesNotMatch(filters,/evaluateTransactionRule|evaluateTransactionRules|RuleMatch/);
  assert.doesNotMatch(db,/transaction_rules|rules!:/);
});
