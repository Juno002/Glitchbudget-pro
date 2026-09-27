import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MoneyValue, MetricCard, StatusBadge } from '../src/components/ui/financial-patterns';

test('server-rendered money never flashes an amount before the saved visibility preference loads', () => {
  for (const amount of [125000, -803688, 0]) {
    const html = renderToStaticMarkup(React.createElement(MoneyValue, { amount }));
    assert.match(html, /••••••/);
    assert.doesNotMatch(html, /1250|1,250|8036|8,036|RD\$/);
    assert.doesNotMatch(html, /title=|aria-label=|data-amount=/);
  }
});

test('metric keeps its financial meaning accessible while the amount is hidden', () => {
  const html = renderToStaticMarkup(React.createElement(MetricCard, { label: 'Disponible líquido', amount: 125000, help: 'Efectivo y bancos' }));
  assert.match(html, /Disponible líquido/);
  assert.match(html, /Efectivo y bancos/);
  assert.match(html, /••••••/);
});

test('planned statuses carry readable text and do not depend on color alone', () => {
  for (const [status, label] of [['pending','Pendiente'],['confirmed','Confirmado'],['skipped','Omitido'],['overdue','Vencido']] as const) {
    const html = renderToStaticMarkup(React.createElement(StatusBadge, { status }));
    assert.match(html, new RegExp(label));
    assert.match(html, /<svg/);
  }
});
