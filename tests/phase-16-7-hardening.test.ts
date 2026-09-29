import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { RuleMatch } from '../src/domain/rule-engine';
import {
  RULE_PRECEDENCE_POLICY,
  resolveAutomaticRuleSuggestion,
} from '../src/domain/rule-suggestions';
import {
  exportLocalAutomation,
  normalizeLocalAutomationBackup,
  replaceLocalAutomation,
} from '../src/lib/local-automation';
import { upsertQuickAddTemplate } from '../src/lib/quick-add-templates';
import { upsertSavedTransactionFilter } from '../src/lib/saved-transaction-filters';
import { upsertTransactionRule } from '../src/lib/transaction-rules';

class MemoryStorage {
  protected values = new Map<string,string>();
  getItem(key:string) { return this.values.get(key) ?? null; }
  setItem(key:string,value:string) { this.values.set(key,value); }
  removeItem(key:string) { this.values.delete(key); }
}

class FlakyStorage extends MemoryStorage {
  failKey:string|null=null;
  setItem(key:string,value:string) {
    if(this.failKey===key){
      this.failKey=null;
      throw new Error('simulated storage failure');
    }
    super.setItem(key,value);
  }
}

const auto = (id:string,categoryId:string):RuleMatch => ({
  ruleId:id,
  ruleName:id,
  applyAutomatically:true,
  suggestion:{categoryId},
});

test('16.7 freezes precedence: stored order is presentation order, never an implicit automatic winner',()=>{
  assert.equal(RULE_PRECEDENCE_POLICY,'stored-order-manual-on-automatic-conflict');
  const result=resolveAutomaticRuleSuggestion([
    auto('first','food'),
    auto('second','entertainment'),
  ]);
  assert.equal(result.automatic,null);
  assert.equal(result.hasAutomaticConflict,true);
  assert.deepEqual(result.manual.map(row=>row.ruleId),['first','second']);
});

test('16.7 keeps one automatic rule deterministic while preserving remaining manual order',()=>{
  const result=resolveAutomaticRuleSuggestion([
    {ruleId:'manual-1',ruleName:'Manual 1',suggestion:{categoryId:'food'}},
    auto('automatic','entertainment'),
    {ruleId:'manual-2',ruleName:'Manual 2',suggestion:{necessity:'need'}},
  ]);
  assert.equal(result.automatic?.ruleId,'automatic');
  assert.deepEqual(result.manual.map(row=>row.ruleId),['manual-1','manual-2']);
  assert.equal(result.hasAutomaticConflict,false);
});

test('16.7 validates the complete local automation backup and rejects duplicate or malformed legacy data',()=>{
  const valid={
    templates:[{id:'bus',name:'Bus',type:'expense',amount:'35',categoryId:'transport'}],
    savedFilters:[{id:'expenses',name:'Gastos',filters:{type:'expense'}}],
    rules:[{
      id:'spotify',
      name:'Spotify',
      enabled:true,
      condition:{field:'description',operator:'contains',value:'Spotify'},
      suggestion:{categoryId:'entertainment'},
    }],
  };
  const normalized=normalizeLocalAutomationBackup(valid);
  assert.equal(normalized.rules[0].applyAutomatically,undefined);

  assert.throws(()=>normalizeLocalAutomationBackup({
    ...valid,
    templates:[valid.templates[0],valid.templates[0]],
  }),/IDs duplicados/i);

  assert.throws(()=>normalizeLocalAutomationBackup({
    ...valid,
    rules:[{
      ...valid.rules[0],
      condition:{field:'description',operator:'regex',value:'Spotify.*'},
    }],
  }),/Rules contiene datos inválidos/i);
});

test('16.7 replaces the three local layers atomically and rolls back if storage fails',()=>{
  const storage=new FlakyStorage();
  upsertQuickAddTemplate(storage,{id:'old-template',name:'Old',type:'expense',amount:'10'});
  upsertSavedTransactionFilter(storage,{id:'old-filter',name:'Old',filters:{type:'expense'}});
  upsertTransactionRule(storage,{
    id:'old-rule',
    name:'Old',
    enabled:true,
    condition:{field:'description',operator:'contains',value:'Old'},
    suggestion:{categoryId:'old'},
  });
  const before=exportLocalAutomation(storage);

  storage.failKey='glitchbudget_saved_transaction_filters_v1';
  assert.throws(()=>replaceLocalAutomation(storage,{
    templates:[{id:'new-template',name:'New',type:'income',amount:'20'}],
    savedFilters:[{id:'new-filter',name:'New',filters:{type:'income'}}],
    rules:[{
      id:'new-rule',
      name:'New',
      enabled:true,
      applyAutomatically:true,
      condition:{field:'description',operator:'contains',value:'New'},
      suggestion:{categoryId:'new'},
    }],
  }),/simulated storage failure/);

  assert.deepEqual(exportLocalAutomation(storage),before);
});

test('16.7 automation backup contract remains preserved under Backup 2.0',()=>{
  const backup=readFileSync(new URL('../src/lib/backup-json.ts',import.meta.url),'utf8');
  const db=readFileSync(new URL('../src/lib/db.ts',import.meta.url),'utf8');
  assert.match(backup,/const DumpV12/);
  assert.match(backup,/CURRENT_BACKUP_FORMAT_VERSION = 13/);
  assert.match(backup,/localAutomation/);
  assert.match(backup,/if \(version===11\) return DumpV11\.parse/);
  assert.match(backup,/replaceLocalAutomation/);
  assert.doesNotMatch(db,/transaction_rules|quick_add_templates|saved_transaction_filters/i);
});

test('16.7 keeps the whole automation system local-only and AI-free',()=>{
  const paths=[
    '../src/domain/rules.ts',
    '../src/domain/rule-engine.ts',
    '../src/domain/rule-suggestions.ts',
    '../src/lib/transaction-rules.ts',
    '../src/lib/quick-add-templates.ts',
    '../src/lib/saved-transaction-filters.ts',
    '../src/lib/local-automation.ts',
  ];
  const combined=paths.map(path=>readFileSync(new URL(path,import.meta.url),'utf8')).join('\n');
  assert.doesNotMatch(combined,/fetch\s*\(|axios|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\//i);
  assert.doesNotMatch(combined,/openai|gemini|anthropic|language model|remote ai/i);
});
