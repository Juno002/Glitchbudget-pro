import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { captureFixture, assertCaptureDataset } from './final-ui-polish-p0-fixture.mjs';

// Browser-only characterization. Never changes product data or financial selectors.
export async function verifyFinalUiPolishP0(client, waitFor) {
  // Earlier smoke steps may leave a nested backup surface open. Close it
  // through its own control so the baseline captures Reports unobstructed.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const count = await client.evaluate(`document.querySelectorAll('[role="dialog"]').length`);
    if (!count) break;
    assert.equal(await client.evaluate(`(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      const button = [...dialogs.at(-1).querySelectorAll('button')].find(node => node.textContent.trim() === 'Cerrar' || node.getAttribute('aria-label') === 'Cerrar ajustes');
      if (!button) return false;
      button.click();
      return true;
    })()`), true, 'P0 cerrar superficie anterior');
    await waitFor(client, `document.querySelectorAll('[role="dialog"]').length < ${count}`, 'P0 Reportes sin modal');
  }
  assert.equal(await client.evaluate(`document.querySelectorAll('[role="dialog"]').length`), 0);
  await client.evaluate('window.scrollTo(0, 0)');
  assert.equal(await client.evaluate(`new Date().toISOString()`), captureFixture.instant, 'P0 reloj fijo');
  const dataset = await client.evaluate(`(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('GlitchBudgetDB');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const fixture = ${JSON.stringify(captureFixture.dataset)};
    const names = ['accounts', 'incomes', 'expenses', 'settings', ...fixture.emptyTables];
    const tx = db.transaction(names, 'readonly');
    const rows = await Promise.all(names.map(name => new Promise((resolve, reject) => {
      const request = tx.objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    })));
    const data = Object.fromEntries(names.map((name, index) => [name, rows[index]]));
    db.close();
    const project = (row, expected) => Object.fromEntries(Object.keys(expected).map(key => [key, row[key]]));
    const result = {
      accounts: data.accounts.map(row => project(row, fixture.accounts[0])),
      incomes: data.incomes.map(row => project(row, fixture.incomes[0])),
      expenses: data.expenses.map(row => project(row, fixture.expenses[0])),
      emptyTables: fixture.emptyTables.filter(name => data[name].length === 0),
      settings: project(data.settings.find(row => row.id === 'general'), fixture.settings),
    };
    if (!data.incomes.concat(data.expenses).every(row => row.accountId === data.accounts[0]?.id)) throw new Error('P0 cuenta de movimientos distinta del fixture');
    return result;
  })()`, { awaitPromise: true });
  assertCaptureDataset(dataset);
  const directory = process.env.FINAL_UI_POLISH_BASELINE_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const primaryOrder = ['spending', 'quick-read', 'spending-breakdown', 'comparison', 'analysis-access'];
  const detailOrder = ['comparison-detail', 'spending-detail', 'cash-flow', 'net-worth', 'detail'];
  const order = [...primaryOrder, ...detailOrder];
  const originalTheme = await client.evaluate('document.documentElement.className');
  const records = [];
  for (const preset of ['7d', '30d', '3m', '6m', '1y', 'custom']) {
    await client.evaluate(`document.querySelector('[data-report-preset="${preset}"]').click()`);
    await waitFor(client, `document.querySelector('[data-report-preset="${preset}"]').getAttribute('aria-pressed') === 'true'`, 'P0 preset ' + preset);
    if (preset === 'custom') {
      assert.equal(await client.evaluate(`(() => {
        const inputs = [...document.querySelectorAll('[data-report-range-controls] input[type="date"]')];
        return inputs.length === 2 && inputs.every(input => input.value && input.validity.valid) && inputs[0].value <= inputs[1].value;
      })()`), true, 'P0 custom válido');
    }
  }
  await client.evaluate(`document.querySelector('[data-report-preset="30d"]').click()`);
  await waitFor(client, `document.querySelector('[data-report-preset="30d"]').getAttribute('aria-pressed') === 'true'`, 'P0 baseline 30d');

  for (const theme of ['light', 'dark']) {
    await client.evaluate(`(() => {
      const html = document.documentElement;
      html.classList.remove('light', 'dark', 'serious');
      html.classList.add('${theme}');
    })()`);
    for (const width of [320, 390, 1280]) {
      await client.command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false });
      // Wait for responsive Recharts layout and animation to settle before capture.
      await client.evaluate('new Promise(resolve => setTimeout(resolve, 1800))', { awaitPromise: true });
      for (const hidden of [false, true]) {
        if (hidden) {
          await client.evaluate(`document.querySelector('button[aria-label="Ocultar importes"]').click()`);
          await waitFor(client, `document.documentElement.dataset.balancesHidden === 'true'`, 'P0 privacidad');
        }
        const geometry = await client.evaluate(`(() => {
          const root = document.querySelector('[data-reports-prisma]');
          const visible = node => {
            if (!node || !node.getClientRects().length) return false;
            for (let current = node; current; current = current.parentElement) {
              const style = getComputedStyle(current);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            }
            return true;
          };
          const sections = [...root.querySelectorAll('[data-report-section]')].filter(node => node.dataset.reportSection !== 'budget-followup');
          const tables = [...root.querySelectorAll('table')];
          return {
            width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            sections: sections.map(node => ({ name: node.dataset.reportSection, visible: visible(node), x: node.getBoundingClientRect().x, right: node.getBoundingClientRect().right, height: node.getBoundingClientRect().height })),
            tables: tables.map(node => ({ visible: visible(node), rows: node.querySelectorAll('tbody tr').length, headers: node.querySelector('thead')?.innerText })),
            hidden: document.documentElement.dataset.balancesHidden === 'true',
            masked: root.innerText.includes('••••••'),
            moneyLeaks: /(?:RD\\$|DOP|US\\$|USD|\\$)\\s*-?\\d/.test(root.innerText + [...root.querySelectorAll('svg text,[aria-label],[aria-description],[title]')].map(node => node.textContent + ' ' + node.getAttribute('aria-label') + ' ' + node.getAttribute('aria-description') + ' ' + node.getAttribute('title')).join(' ')),
          };
        })()`);
        assert.deepEqual(geometry.sections.map(section => section.name), order);
        assert.ok(geometry.sections.filter(section => primaryOrder.includes(section.name)).every(section => section.visible && section.x >= -1 && section.right <= width + 1), 'P0 lectura primaria visible y contenida');
        assert.ok(geometry.sections.filter(section => detailOrder.includes(section.name)).every(section => !section.visible), 'P0 auditoría cerrada por defecto');
        assert.ok(geometry.scrollWidth <= width + 1, 'P0 overflow horizontal');
        assert.equal(geometry.tables.length, 4, 'P0 comparación, categorías, naturaleza y detalle');
        assert.ok(geometry.tables.every(table => !table.visible && table.rows > 0), 'P0 evidencia exacta preservada bajo demanda');
        assert.equal(geometry.hidden, hidden);
        if (!hidden) assert.equal(geometry.moneyLeaks, true, 'P0 control positivo de importes visibles');
        if (hidden) {
          assert.equal(geometry.masked, true);
          assert.equal(geometry.moneyLeaks, false, 'P0 importes en texto/SVG/labels/tooltips');
          // Hover a real rendered chart to cover tooltip monetary formatting too.
          const point = await client.evaluate(`(() => {
            const shape = document.querySelector('[data-report-chart="category-donut"] .recharts-sector');
            if (!shape) return null;
            shape.scrollIntoView({ block: 'center' });
            // Hover the ring, whose bounding-box center is an empty hole.
            const arc = shape.getPointAtLength(shape.getTotalLength() * 0.2).matrixTransform(shape.getScreenCTM());
            const rect = shape.ownerSVGElement.getBoundingClientRect();
            const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            return { x: center.x + (arc.x - center.x) * 0.85, y: center.y + (arc.y - center.y) * 0.85 };
          })()`);
          assert.ok(point, 'P0 chart con datos');
          await client.command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
          await waitFor(client, `(() => {
            const nodes = [...document.querySelectorAll('.recharts-tooltip-wrapper')];
            return nodes.some(node => getComputedStyle(node).visibility === 'visible' && node.innerText.includes('••••••'));
          })()`, 'P0 tooltip privado');
          const ax = await client.command('Accessibility.getFullAXTree');
          assert.doesNotMatch(JSON.stringify(ax.nodes.map(node => ({ name: node.name?.value, description: node.description?.value, value: node.value?.value }))), /(?:RD\$|DOP|US\$|USD|\$)\s*-?\d/, 'P0 árbol accesible');
        }
        await client.command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
        await client.evaluate('document.activeElement?.blur(); window.scrollTo(0, 0)');
        await waitFor(client, `[...document.querySelectorAll('[data-reports-prisma] .recharts-tooltip-wrapper')].every(node => getComputedStyle(node).visibility !== 'visible')`, 'P0 captura en reposo sin tooltip');
        const name = `${theme}-${width}-${hidden ? 'hidden' : 'visible'}`;
        records.push({ name, ...geometry });
        if (directory) {
          const metrics = await client.command('Page.getLayoutMetrics');
          const shot = await client.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } });
          await writeFile(path.join(directory, name + '.png'), Buffer.from(shot.data, 'base64'));
        }
        if (hidden) {
          await client.evaluate(`document.querySelector('button[aria-label="Mostrar importes"]').click()`);
          await waitFor(client, `document.documentElement.dataset.balancesHidden === 'false'`, 'P0 restaurar importes');
        }
      }
    }
  }
  await client.evaluate(`document.documentElement.className = ${JSON.stringify(originalTheme)}`);
  await client.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  if (directory) {
    await writeFile(path.join(directory, 'geometry.json'), JSON.stringify(records, null, 2) + '\n');
    await writeFile(path.join(directory, 'capture-contract.json'), JSON.stringify(captureFixture, null, 2) + '\n');
  }
  process.stdout.write('FINAL_UI_POLISH_P0 ' + JSON.stringify({ captures: records.length, widths: [320, 390, 1280], themes: ['light', 'dark'], presets: 6, exactTables: 4, privacy: 'passed' }) + '\n');
}
