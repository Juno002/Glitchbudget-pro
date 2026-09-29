import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  normalizeRuleCondition,
  normalizeRuleSuggestion,
  normalizeTransactionRule,
  requireTransactionRule,
} from '../src/domain/rules';

test('16.1 accepts only the roadmap condition: description contains text', () => {
  assert.deepEqual(normalizeRuleCondition({
    field:'description',
    operator:'contains',
    value:'  Spotify   Premium ',
  }),{
    field:'description',
    operator:'contains',
    value:'Spotify Premium',
  });

  assert.equal(normalizeRuleCondition({field:'description',operator:'equals',value:'Spotify'}),null);
  assert.equal(normalizeRuleCondition({field:'category',operator:'contains',value:'Spotify'}),null);
  assert.equal(normalizeRuleCondition({field:'description',operator:'contains',value:'   '}),null);
});

test('16.1 suggestion contains category and/or necessity but nothing automatic', () => {
  assert.deepEqual(normalizeRuleSuggestion({categoryId:' entertainment ',necessity:'want'}),{
    categoryId:'entertainment',
    necessity:'want',
  });
  assert.deepEqual(normalizeRuleSuggestion({categoryId:'entertainment'}),{categoryId:'entertainment',necessity:undefined});
  assert.deepEqual(normalizeRuleSuggestion({necessity:'need'}),{categoryId:undefined,necessity:'need'});
  assert.equal(normalizeRuleSuggestion({}),null);
  assert.equal(normalizeRuleSuggestion({necessity:'invalid'}),null);
});

test('16.1 normalizes the complete deterministic rule contract', () => {
  assert.deepEqual(normalizeTransactionRule({
    id:' spotify ',
    name:'  Spotify   classification ',
    enabled:true,
    condition:{field:'description',operator:'contains',value:' spotify '},
    suggestion:{categoryId:'entertainment',necessity:'want'},
  }),{
    id:'spotify',
    name:'Spotify classification',
    enabled:true,
    condition:{field:'description',operator:'contains',value:'spotify'},
    suggestion:{categoryId:'entertainment',necessity:'want'},
  });
});

test('16.1 rejects incomplete or future-scope rule shapes', () => {
  assert.equal(normalizeTransactionRule({
    id:'r',name:'Rule',enabled:true,
    condition:{field:'description',operator:'contains',value:'Spotify'},
    suggestion:{},
  }),null);

  assert.equal(normalizeTransactionRule({
    id:'r',name:'Rule',enabled:true,
    condition:{field:'description',operator:'regex',value:'Spotify.*'},
    suggestion:{categoryId:'entertainment'},
  }),null);

  assert.equal(normalizeTransactionRule({
    id:'r',name:'Rule',enabled:true,
    condition:{field:'description',operator:'contains',value:'Spotify'},
    suggestion:{labels:['music']},
  }),null);

  assert.throws(()=>requireTransactionRule({}),/contrato determinista/);
});

test('16.1 legacy contract remains backward-compatible when 16.6 adds explicit auto-apply opt-in', () => {
  const source=readFileSync(new URL('../src/domain/rules.ts',import.meta.url),'utf8');
  const legacy=normalizeTransactionRule({
    id:'legacy',name:'Legacy',enabled:true,
    condition:{field:'description',operator:'contains',value:'Spotify'},
    suggestion:{categoryId:'entertainment'},
  });
  assert.ok(legacy);
  assert.equal(legacy.applyAutomatically,undefined);
  assert.match(source,/applyAutomatically\?: boolean/);
  assert.doesNotMatch(source,/fetch\s*\(|axios|XMLHttpRequest|https?:\/\//i);
  assert.doesNotMatch(source,/openai|gemini|anthropic|language model|\bAI\b/i);
});

test('16.1 contract remains isolated from templates, saved filters and persistence after 16.3 consumes it', () => {
  const template=readFileSync(new URL('../src/lib/quick-add-templates.ts',import.meta.url),'utf8');
  const filters=readFileSync(new URL('../src/lib/saved-transaction-filters.ts',import.meta.url),'utf8');
  const modal=readFileSync(new URL('../src/components/dashboard/TransactionModal.tsx',import.meta.url),'utf8');
  const db=readFileSync(new URL('../src/lib/db.ts',import.meta.url),'utf8');

  assert.doesNotMatch(template,/TransactionRule|RuleCondition|RuleSuggestion/);
  assert.doesNotMatch(filters,/TransactionRule|RuleCondition|RuleSuggestion/);
  assert.match(modal,/rules\?: readonly TransactionRule\[\]/);
  assert.match(modal,/rules\?: readonly TransactionRule\[\]/);
  assert.doesNotMatch(db,/transaction_rules|rules!:/);
});
