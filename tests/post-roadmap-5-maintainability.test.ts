import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { canSaveTransactionDraft } from '../src/domain/transaction-draft';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function hslToRgb(h: number, s: number, l: number) {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = h / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const [r1,g1,b1] =
    segment < 1 ? [chroma,x,0] :
    segment < 2 ? [x,chroma,0] :
    segment < 3 ? [0,chroma,x] :
    segment < 4 ? [0,x,chroma] :
    segment < 5 ? [x,0,chroma] : [chroma,0,x];
  const m = lightness - chroma / 2;
  return [r1+m,g1+m,b1+m];
}

function luminance(rgb: number[]) {
  const [r,g,b] = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126*r + 0.7152*g + 0.0722*b;
}

function contrast(a: number[], b: number[]) {
  const [hi,lo] = [luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (hi + 0.05) / (lo + 0.05);
}

test('Post-roadmap 5 NativeSelect centralizes the repeated accessible native control', () => {
  const component = source('src/components/ui/native-select.tsx');
  const settings = source('src/components/layout/settings-dialog.tsx');
  const modal = source('src/components/dashboard/TransactionModal.tsx');

  assert.match(component, /React\.SelectHTMLAttributes<HTMLSelectElement>/);
  assert.match(component, /focus-visible:ring-2/);
  assert.match(component, /disabled:opacity-50/);
  assert.match(settings, /NativeSelect/);
  assert.match(modal, /NativeSelect/);
  assert.doesNotMatch(settings, /<select/);
  assert.doesNotMatch(modal, /<select/);
});

test('Post-roadmap 5 keeps action errors specific and removes any from the refactored action cluster', () => {
  const provider = source('src/contexts/finance-context.tsx');
  assert.match(provider, /const runAction = useCallback/);
  assert.match(provider, /No se pudo registrar la planificación/);
  assert.match(provider, /No se pudo actualizar la planificación/);
  assert.match(provider, /No se pudo borrar la planificación/);
  assert.match(provider, /async <K extends keyof Settings,>\(key: K, value: Settings\[K\]\)/);
  assert.doesNotMatch(provider, /catch \(e: any\)/);
});

test('Post-roadmap 5 light muted text meets 4.5:1 against the primary light surfaces', () => {
  const muted = hslToRgb(150,5,42);
  const background = hslToRgb(48,23,95);
  const card = hslToRgb(45,40,98);
  assert.ok(contrast(muted, background) >= 4.5);
  assert.ok(contrast(muted, card) >= 4.5);

  const css = source('src/app/globals.css');
  assert.match(css, /--muted-foreground: 150 5% 42%/);
});

test('Post-roadmap 5 preserves deliberate product language and compatibility entrypoint', () => {
  const modal = source('src/components/dashboard/TransactionModal.tsx');
  const compatibility = source('src/contexts/finance--context.tsx');
  assert.match(modal, /Must · imprescindible/);
  assert.match(modal, /Need · necesario/);
  assert.match(modal, /Want · deseo/);
  assert.match(compatibility, /Compatibility entrypoint/);
  assert.match(compatibility, /finance-context/);
});


test('Post-roadmap 5 exercises the Quick Add save matrix as behavior instead of source grep', () => {
  const base = {
    validAmount:true,
    validDate:true,
    accountId:'cash',
    toAccountId:'',
    categoryId:'food',
    paymentMethod:'cash' as const,
    debtId:'',
    hasAccountForActual:true,
    saved:false,
    saving:false,
  };

  assert.equal(canSaveTransactionDraft({...base,type:'expense'}), true);
  assert.equal(canSaveTransactionDraft({...base,type:'income'}), true);
  assert.equal(canSaveTransactionDraft({...base,type:'expense',paymentMethod:'credit',accountId:'',hasAccountForActual:false,debtId:'card'}), true);
  assert.equal(canSaveTransactionDraft({...base,type:'expense',paymentMethod:'credit',debtId:''}), false);
  assert.equal(canSaveTransactionDraft({...base,type:'transfer',categoryId:'',toAccountId:'bank'}), true);
  assert.equal(canSaveTransactionDraft({...base,type:'transfer',categoryId:'',toAccountId:'cash'}), false);
  assert.equal(canSaveTransactionDraft({...base,type:'income',categoryId:''}), false);
  assert.equal(canSaveTransactionDraft({...base,type:'income',validDate:false}), false);
  assert.equal(canSaveTransactionDraft({...base,type:'income',validAmount:false}), false);
  assert.equal(canSaveTransactionDraft({...base,type:'income',saving:true}), false);
  assert.equal(canSaveTransactionDraft({...base,type:'income',saved:true}), false);
});
