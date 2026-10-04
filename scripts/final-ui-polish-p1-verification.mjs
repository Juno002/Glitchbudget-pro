import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { captureFixture } from './final-ui-polish-p0-fixture.mjs';

const historyFixture = JSON.parse(readFileSync(new URL('../tests/fixtures/final-ui-polish-p1-history.json', import.meta.url), 'utf8'));

const baseline = [
  ['cash_flow_change', 'Hay un nuevo flujo neto comparable'],
  ['spending_above_previous', 'Hay gasto nuevo en este rango'],
  ['net_worth_change', 'Hay una nueva base de patrimonio registrada'],
];
const moneyPattern = /(?:RD\$|DOP|US\$|USD|\$)\s*-?\d/;
const tables = ['accounts', 'incomes', 'expenses'];

async function financialRows(client, replacement) {
  return client.evaluate(`(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('GlitchBudgetDB');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const names = ${JSON.stringify(tables)};
    const replacement = ${JSON.stringify(replacement ?? null)};
    const tx = db.transaction(names, replacement ? 'readwrite' : 'readonly');
    const complete = new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    let rows;
    if (replacement) {
      for (const name of names) {
        const store = tx.objectStore(name);
        store.clear();
        for (const row of replacement[name]) store.put(row);
      }
    } else {
      rows = await Promise.all(names.map(name => new Promise((resolve, reject) => {
        const request = tx.objectStore(name).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })));
    }
    await complete;
    db.close();
    return rows ? Object.fromEntries(names.map((name, index) => [name, rows[index]])) : true;
  })()`, { awaitPromise: true });
}

async function setHidden(client, waitFor, hidden) {
  const current = await client.evaluate(`document.documentElement.dataset.balancesHidden === 'true'`);
  if (current === hidden) return;
  const label = hidden ? 'Ocultar importes' : 'Mostrar importes';
  assert.equal(await client.evaluate(`(() => {
    const button = document.querySelector('button[aria-label=${JSON.stringify(label)}]');
    if (!button) return false;
    button.click();
    return true;
  })()`), true, 'P1 control real de privacidad');
  await waitFor(client, `document.documentElement.dataset.balancesHidden === '${hidden}'`, 'P1 privacidad ' + hidden);
}

async function readEditorial(client) {
  return client.evaluate(`(() => {
    const root = document.querySelector('[data-report-section="quick-read"]');
    if (!root) return null;
    const bounds = node => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    };
    return {
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      text: root.innerText,
      labels: [...root.querySelectorAll('svg text,[aria-label],[aria-description],[title]')]
        .map(node => [node.textContent, node.getAttribute('aria-label'), node.getAttribute('aria-description'), node.getAttribute('title')].join(' ')).join(' '),
      articles: [...root.querySelectorAll('article[data-quick-read-kind]')].map(article => {
        const heading = article.querySelector('h3');
        const style = getComputedStyle(heading);
        return {
          kind: article.dataset.quickReadKind,
          primary: article.dataset.quickReadPrimary === 'true',
          title: heading.textContent.trim(),
          labelled: article.getAttribute('aria-labelledby') === heading.id && Boolean(heading.id),
          articleBounds: bounds(article),
          headingBounds: bounds(heading),
          fontSize: parseFloat(style.fontSize),
          fontWeight: parseFloat(style.fontWeight),
          body: article.querySelector('h3 + p')?.textContent.trim(),
          moneyTokens: [...article.querySelectorAll('[data-quick-read-money]')].map(node => {
            const range = document.createRange();
            range.selectNodeContents(node);
            return { text: node.textContent, whiteSpace: getComputedStyle(node).whiteSpace, lines: range.getClientRects().length, bounds: bounds(node) };
          }),
        };
      }),
      animated: root.getAnimations({ subtree: true }).length,
    };
  })()`);
}

function assertEditorial(view, expected) {
  assert.ok(view, 'P1 lectura editorial visible');
  assert.deepEqual(view.articles.map(row => [row.kind, row.title]), expected, 'P1 ranking y copy exactos');
  assert.equal(view.articles.filter(row => row.primary).length, 1, 'P1 un protagonista');
  assert.equal(view.articles[0].primary, true, 'P1 primer insight protagonista');
  assert.ok(view.scrollWidth <= view.viewport + 1, 'P1 sin overflow horizontal');
  for (const article of view.articles) {
    assert.equal(article.labelled, true, 'P1 article nombrado por su titular');
    assert.doesNotMatch(article.title, /[0-9]|RD\$|DOP|USD|\$/, 'P1 titular sin dinero ni cifras');
    for (const token of article.moneyTokens) {
      assert.equal(token.whiteSpace, 'nowrap', 'P1 símbolo e importe indivisibles');
      assert.equal(token.lines, 1, 'P1 dinero completo en una línea');
      assert.ok(token.bounds.left >= -1 && token.bounds.right <= view.viewport + 1, 'P1 token monetario contenido');
    }
    for (const rect of [article.articleBounds, article.headingBounds]) {
      assert.ok(rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.right <= view.viewport + 1, 'P1 límites responsive del titular y article');
    }
  }
  for (const secondary of view.articles.slice(1)) {
    assert.ok(view.articles[0].fontSize > secondary.fontSize, 'P1 protagonista con mayor tamaño');
    assert.ok(view.articles[0].fontWeight >= secondary.fontWeight, 'P1 secundarios sin competir por peso');
  }
}

async function assertPrivate(client, view) {
  if (view.articles.some(article => article.kind !== 'no_material_change')) {
    assert.ok(view.text.includes('••••••'), 'P1 control positivo de enmascarado');
  }
  assert.doesNotMatch(view.text + view.labels, moneyPattern, 'P1 sin importes en texto, SVG, labels ni tooltips');
  const ax = await client.command('Accessibility.getFullAXTree');
  assert.doesNotMatch(JSON.stringify(ax.nodes.map(node => ({ name: node.name?.value, description: node.description?.value, value: node.value?.value }))), moneyPattern, 'P1 sin importes en árbol accesible');
}

function scenarioRows(original, currentParts, previousParts, incomeAmounts = {}) {
  const account = { ...original.accounts[0], openingBalance: historyFixture.accounts[0].openingBalance, startDate: historyFixture.accounts[0].startDate };
  const rows = { accounts: [account], incomes: [], expenses: [] };
  for (const [period, date, parts, explicitIncome] of [
    ['current', historyFixture.currentDate, currentParts, incomeAmounts.currentIncome],
    ['previous', historyFixture.previousDate, previousParts, incomeAmounts.previousIncome],
  ]) {
    const income = explicitIncome ?? parts.reduce((total, part) => total + part[1], 0);
    if (income > 0) rows.incomes.push({
      ...original.incomes[0], id: 'p1-income-' + period, accountId: account.id,
      amount: income,
      amountBase: income, date, month: date.slice(0, 7),
    });
    parts.forEach(([categoryId, amount], index) => rows.expenses.push({
      ...original.expenses[0], id: 'p1-expense-' + period + '-' + index, accountId: account.id,
      categoryId, amount, amountBase: amount, date, month: date.slice(0, 7),
    }));
  }
  return rows;
}

// Isolated test fixtures only; product selectors, schema and P0 evidence remain untouched.
export async function verifyFinalUiPolishP1(client, waitFor) {
  const directory = process.env.FINAL_UI_POLISH_P1_CAPTURE_DIR;
  const historyDirectory = process.env.FINAL_UI_POLISH_P1_HISTORY_CAPTURE_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  if (historyDirectory) await mkdir(historyDirectory, { recursive: true });
  const records = [];
  const historyRecords = [];
  const covered = new Set();
  const original = await financialRows(client);
  assert.equal(await client.evaluate('new Date().toISOString()'), captureFixture.instant, 'P1 mismo reloj fijo P0');
  assert.equal(historyFixture.instant, captureFixture.instant, 'P1 historia usa el reloj P0');
  assert.equal(historyFixture.currentDate, captureFixture.date, 'P1 historia usa la fecha P0');
  assert.equal(historyFixture.preset, captureFixture.preset, 'P1 historia conserva 30d');
  let loadingObserved = false;
  const observer = await client.command('Page.addScriptToEvaluateOnNewDocument', { source: `
    globalThis.__p1LoadingObserved = false;
    new MutationObserver(() => {
      if (document.querySelector('[data-reports-prisma] .animate-pulse') && !document.querySelector('[data-quick-read-kind]')) globalThis.__p1LoadingObserved = true;
    }).observe(document, { subtree: true, childList: true });
  ` });
  try {
    await setHidden(client, waitFor, false);
    for (const theme of ['light', 'dark', 'serious']) {
      await client.evaluate(`document.documentElement.classList.remove('light','dark','serious'); document.documentElement.classList.add('${theme}');`);
      for (const width of theme === 'serious' ? [320, 1280] : [320, 360, 390, 1280]) {
        await client.command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false });
        await client.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))', { awaitPromise: true });
        for (const hidden of [false, true]) {
          await setHidden(client, waitFor, hidden);
          const view = await readEditorial(client);
          assertEditorial(view, baseline);
          view.articles.forEach(row => covered.add(row.kind));
          if (hidden) await assertPrivate(client, view);
          else assert.match(view.text, moneyPattern, 'P1 control positivo de importes visibles');
          const name = `${theme}-${width}-${hidden ? 'hidden' : 'visible'}`;
          records.push({ name, ...view });
          if (directory) {
            // Keep fixed shell controls outside the crop; layout checks above use height 844.
            await client.command('Emulation.setDeviceMetricsOverride', { width, height: 1600, deviceScaleFactor: 1, mobile: false });
            await client.evaluate('window.scrollTo(0,0); new Promise(resolve => requestAnimationFrame(resolve))', { awaitPromise: true });
            const clip = await client.evaluate(`(() => {
              const rect = document.querySelector('[data-report-section="quick-read"]').getBoundingClientRect();
              return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height, scale: 1 };
            })()`);
            const screenshot = await client.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
            await writeFile(path.join(directory, name + '.png'), Buffer.from(screenshot.data, 'base64'));
            await client.command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false });
          }
        }
        await setHidden(client, waitFor, false);
      }
    }

    await client.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await client.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
    await client.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
    assert.equal(await client.evaluate(`(() => {
      const button = document.querySelector('[data-report-preset="30d"]');
      button.focus();
      const style = getComputedStyle(button);
      return document.activeElement === button && button.matches(':focus-visible') && (style.boxShadow !== 'none' || style.outlineStyle !== 'none');
    })()`), true, 'P1 focus visible en controles reales');
    await client.command('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    for (const preset of ['7d', '30d']) {
      const point = await client.evaluate(`(() => {
        const button = document.querySelector('[data-report-preset="${preset}"]');
        button.scrollIntoView({ block: 'center' });
        const rect = button.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, height: rect.height, enabled: !button.disabled };
      })()`);
      assert.ok(point.enabled && point.height >= 40, 'P1 touch target del sistema existente');
      await client.command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] });
      await client.command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await waitFor(client, `document.querySelector('[data-report-preset="${preset}"]').getAttribute('aria-pressed') === 'true'`, 'P1 preset por touch ' + preset);
    }
    await client.command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await client.evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`), true);
    const reduced = await readEditorial(client);
    assertEditorial(reduced, baseline);
    assert.equal(reduced.animated, 0, 'P1 editorial estática con reduced motion');

    const split = value => [['vivienda', value], ['transporte', value], ['alimentacion', value]];
    const scenarios = [
      { name: 'category-stable', current: [['vivienda', 8_000], ['transporte', 2_000]], previous: [['vivienda', 10_000]], expected: [['leading_category', 'La categoría con mayor participación en el gasto'], ['spending_near_previous', 'El gasto se mantuvo estable']] },
      { name: 'above', current: split(2_000), previous: split(1_000), expected: [['spending_above_previous', 'Gastaste más que en el rango anterior']] },
      { name: 'below', current: split(1_000), previous: split(2_000), expected: [['spending_below_previous', 'Gastaste menos que en el rango anterior']] },
      { name: 'new', current: split(1_000), previous: [], expected: [['spending_above_previous', 'Hay gasto nuevo en este rango']] },
      { name: 'empty', current: [], previous: [], expected: [['no_material_change', 'No hay cambios destacados en este rango']] },
    ];
    for (const scenario of scenarios) {
      await financialRows(client, scenarioRows(original, scenario.current, scenario.previous));
      await client.command('Page.reload', { ignoreCache: true });
      await waitFor(client, `document.readyState === 'complete' && document.querySelector('[data-report-preset="30d"]')?.getAttribute('aria-pressed') === 'true' && JSON.stringify([...document.querySelectorAll('article[data-quick-read-kind]')].map(node => [node.dataset.quickReadKind, node.querySelector('h3').textContent.trim()])) === ${JSON.stringify(JSON.stringify(scenario.expected))}`, 'P1 fixture ' + scenario.name);
      loadingObserved ||= await client.evaluate('globalThis.__p1LoadingObserved === true');
      const view = await readEditorial(client);
      assertEditorial(view, scenario.expected);
      view.articles.forEach(row => covered.add(row.kind));
      if (scenario.name === 'empty') {
        assert.equal(view.articles[0].body, 'Ninguna métrica principal cambió lo suficiente para destacarla.');
      } else {
        assert.match(view.text, moneyPattern, 'P1 fixture con dinero canónico visible');
        await setHidden(client, waitFor, true);
        const hidden = await readEditorial(client);
        assertEditorial(hidden, scenario.expected);
        await assertPrivate(client, hidden);
        await setHidden(client, waitFor, false);
      }
      records.push({ name: scenario.name, ...view });
    }

    const historySeed = {
      accounts: historyFixture.accounts,
      incomes: [historyFixture.incomeTemplate],
      expenses: [historyFixture.expenseTemplate],
    };
    for (const scenario of historyFixture.scenarios) {
      const rows = scenarioRows(historySeed, scenario.current, scenario.previous, scenario);
      assert.deepEqual(rows, scenario.rows, 'P1 filas históricas versionadas ' + scenario.name);
      await financialRows(client, rows);
      await client.command('Page.reload', { ignoreCache: true });
      await waitFor(client, `document.readyState === 'complete' && document.querySelector('[data-report-preset="30d"]')?.getAttribute('aria-pressed') === 'true' && JSON.stringify([...document.querySelectorAll('article[data-quick-read-kind]')].map(node => [node.dataset.quickReadKind, node.querySelector('h3').textContent.trim()])) === ${JSON.stringify(JSON.stringify(scenario.expected))}`, 'P1 historia ' + scenario.name);
      loadingObserved ||= await client.evaluate('globalThis.__p1LoadingObserved === true');
      for (const theme of ['light', 'dark']) {
        await client.evaluate(`document.documentElement.classList.remove('light','dark','serious'); document.documentElement.classList.add('${theme}');`);
        for (const width of [320, 1280]) {
          await client.command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false });
          await client.evaluate('window.scrollTo(0,0); new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))', { awaitPromise: true });
          for (const hidden of [false, true]) {
            await setHidden(client, waitFor, hidden);
            // Chart containers settle asynchronously after the desktop/mobile resize.
            await waitFor(client, 'document.documentElement.scrollWidth <= innerWidth + 1', 'P1 historia viewport asentado ' + scenario.name + ' ' + theme + ' ' + width);
            const view = await readEditorial(client);
            assertEditorial(view, scenario.expected);
            if (scenario.name === 'history-decrease' || scenario.name === 'history-sign-recovery') {
              const flow = view.articles.find(article => article.kind === 'cash_flow_change');
              assert.ok(flow && flow.moneyTokens.length === 2, 'P1 cruce conserva ambos importes privados');
              assert.doesNotMatch(flow.body, /%/, 'P1 cruce sin porcentaje editorial');
              const comparison = await client.evaluate(`document.querySelector('[data-report-section="comparison"] tbody')?.textContent`);
              assert.ok(comparison.includes(scenario.name === 'history-decrease' ? '-400%' : '+133.33%'), 'P1 tabla conserva porcentaje canónico del cruce');
            }
            view.articles.forEach(row => covered.add(row.kind));
            if (scenario.name === 'history-no-changes') {
              assert.equal(view.articles[0].body, 'Ninguna métrica principal cambió lo suficiente para destacarla.');
              assert.doesNotMatch(view.text, moneyPattern, 'P1 fallback histórico sin dinero fabricado');
            } else if (!hidden) {
              assert.match(view.text, moneyPattern, 'P1 historia con importes canónicos visibles');
            }
            if (hidden) await assertPrivate(client, view);
            const name = `${scenario.name}-${theme}-${width}-${hidden ? 'hidden' : 'visible'}`;
            historyRecords.push({ name, ...view });
            if (historyDirectory) {
              // Only the capture viewport changes; responsive assertions above retain height 844.
              await client.command('Emulation.setDeviceMetricsOverride', { width, height: 1600, deviceScaleFactor: 1, mobile: false });
              try {
                await client.evaluate('window.scrollTo(0,0); new Promise(resolve => requestAnimationFrame(resolve))', { awaitPromise: true });
                const clip = await client.evaluate(`(() => {
                  const rect = document.querySelector('[data-report-section="quick-read"]').getBoundingClientRect();
                  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height, scale: 1 };
                })()`);
                const screenshot = await client.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
                await writeFile(path.join(historyDirectory, name + '.png'), Buffer.from(screenshot.data, 'base64'));
              } finally {
                await client.command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false });
              }
            }
          }
          await setHidden(client, waitFor, false);
        }
      }
    }
    assert.equal(historyRecords.length, 40, 'P1 matriz histórica completa');
    assert.deepEqual([...covered].sort(), ['cash_flow_change', 'leading_category', 'net_worth_change', 'no_material_change', 'spending_above_previous', 'spending_below_previous', 'spending_near_previous']);
  } finally {
    await client.command('Page.removeScriptToEvaluateOnNewDocument', { identifier: observer.identifier });
    await financialRows(client, original);
    assert.deepEqual(await financialRows(client), original, 'P1 restauración exacta del dataset P0');
    await client.command('Page.reload', { ignoreCache: true });
    await waitFor(client, `document.querySelector('article[data-quick-read-kind="cash_flow_change"] h3')?.textContent.trim() === 'Hay un nuevo flujo neto comparable'`, 'P1 restaurar Reportes P0');
    await client.evaluate(`document.querySelector('[data-report-preset="30d"]').click(); document.documentElement.classList.remove('light','dark','serious'); document.documentElement.classList.add('light'); window.scrollTo(0,0);`);
    await setHidden(client, waitFor, false);
    await client.command('Emulation.setTouchEmulationEnabled', { enabled: false });
    await client.command('Emulation.setEmulatedMedia', { features: [] });
    await client.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  }
  const result = { kinds: [...covered].sort(), widths: [320, 360, 390, 1280], themes: ['light', 'dark'], legacyWidths: [320, 1280], privacy: 'passed', keyboard: 'passed', touch: 'passed', reducedMotion: 'passed', empty: 'passed', loadingObserved, disabled: 'editorial has no controls' };
  const historyResult = { fixtureVersion: historyFixture.version, scenarios: historyFixture.scenarios.map(scenario => scenario.name), widths: [320, 1280], themes: ['light', 'dark'], modes: ['visible', 'hidden'], checks: historyRecords.length, captures: historyDirectory ? historyRecords.length : 0, privacy: 'passed', rankingAndCopy: 'passed', restoredOriginalDataset: true };
  if (directory) await writeFile(path.join(directory, 'verification.json'), JSON.stringify({ result, records }, null, 2) + '\n');
  if (historyDirectory) await writeFile(path.join(historyDirectory, 'history-verification.json'), JSON.stringify({ fixture: 'tests/fixtures/final-ui-polish-p1-history.json', result: historyResult, records: historyRecords }, null, 2) + '\n');
  process.stdout.write('FINAL_UI_POLISH_P1 ' + JSON.stringify(result) + '\n');
  process.stdout.write('FINAL_UI_POLISH_P1_HISTORY ' + JSON.stringify(historyResult) + '\n');
}
