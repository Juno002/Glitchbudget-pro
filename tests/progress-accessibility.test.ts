import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Progress } from '../src/components/ui/progress';

test('progress exposes its actual percentage instead of an indeterminate state to assistive technology', () => {
  for (const value of [0, 10, 100]) {
    const html = renderToStaticMarkup(React.createElement(Progress, {value}));
    assert.ok(html.includes('aria-valuenow="'+value+'"'));
    assert.ok(html.includes('data-state="'+(value === 100 ? 'complete' : 'loading')+'"'));
    assert.ok(!html.includes('data-state="indeterminate"'));
  }
});
