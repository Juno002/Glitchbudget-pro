import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { captureFixture } from './final-ui-polish-p0-fixture.mjs';

const history = JSON.parse(readFileSync(new URL('../tests/fixtures/final-ui-polish-p1-history.json', import.meta.url), 'utf8'));
const moneyPattern = /(?:RD\$|DOP|US\$|USD|\$)\s*-?\d/;
const money = cents => 'RD$ ' + (cents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = 86_400_000;
const date = value => new Date(value + 'T12:00:00.000Z');
const shift = (value, days) => new Date(date(value).getTime() + days * day).toISOString().slice(0, 10);
const windowLabel = range => {
  const formatter = new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  return range.start===range.end ? formatter.format(date(range.start)) : formatter.formatRange(date(range.start),date(range.end));
};
// Independent fixed ranges, rather than importing the selector being verified.
const presets = [
  { name: '7d', range: { start: '2026-09-28', end: '2026-10-04' }, max: 6 },
  { name: '30d', range: { start: '2026-09-05', end: '2026-10-04' }, max: 6 },
  { name: '3m', range: { start: '2026-07-05', end: '2026-10-04' }, max: 4 },
  { name: '6m', range: { start: '2026-04-05', end: '2026-10-04' }, max: 4 },
  { name: '1y', range: { start: '2025-10-05', end: '2026-10-04' }, max: 3 },
  { name: 'custom', range: { start: '2024-02-27', end: '2024-03-02' }, max: 6 },
];

function fixtureRows(entries) {
  return {
    accounts: [{ ...history.accounts[0], startDate: '2026-10-01' }],
    incomes: [],
    expenses: entries.map(([expenseDate, amount, account = 'active'], index) => ({
      ...history.expenseTemplate,
      id: 'p3-expense-' + index,
      ...(account === 'unassigned' ? {} : { accountId: account === 'removed' ? 'p3-removed-account' : history.accounts[0].id }),
      categoryId: ['vivienda', 'transporte', 'alimentacion'][index % 3],
      amount, amountBase: amount, date: expenseDate, month: expenseDate.slice(0, 7),
    })),
  };
}

const scenarios = [
  { name: 'long-history', rows: fixtureRows([
    ['2023-01-01', 8191, 'unassigned'], ['2023-12-31', 16381, 'removed'],
    ['2024-02-02', 32749, 'unassigned'], ['2024-02-27', 65521, 'removed'],
    ['2024-02-29', 99991, 'unassigned'], ['2024-03-02', 17777, 'removed'],
    ['2024-10-04', 24443, 'removed'], ['2025-01-01', 35533], ['2025-10-04', 46633],
    ['2026-04-05', 57731, 'unassigned'], ['2026-05-15', 68819], ['2026-06-10', 79939],
    ['2026-07-05', 81119, 'removed'], ['2026-08-06', 92219], ['2026-09-01', 13331],
    ['2026-09-10', 14447], ['2026-09-20', 15551], ['2026-09-27', 16661],
    ['2026-09-28', 6789, 'removed'], ['2026-10-04', 12345, 'unassigned'],
  ]) },
  { name: 'current-partial', rows: fixtureRows([['2026-09-18', 27773, 'removed'], ['2026-10-04', 38873, 'unassigned']]) },
  { name: 'partial-then-zero', rows: fixtureRows([['2026-08-15', 49991, 'unassigned']]) },
  { name: 'full-boundary-then-zero', rows: fixtureRows([['2026-08-06', 51131, 'removed']]) },
  { name: 'full-zero-history', rows: fixtureRows([['2020-01-01', 62233, 'unassigned']]) },
  { name: 'no-history', rows: fixtureRows([]) },
];

function expectedWindows(rows, preset) {
  const days = (date(preset.range.end) - date(preset.range.start)) / day + 1;
  const start = rows.expenses.map(row => row.date).sort()[0];
  const windows = [];
  for (let index = preset.max - 1; index >= 0; index -= 1) {
    const range = { start: shift(preset.range.start, -index * days), end: shift(preset.range.end, -index * days) };
    if (!start || range.end < start) continue;
    let total = 0;
    for (const row of rows.expenses) if (range.start <= row.date && row.date <= range.end) total += row.amountBase;
    windows.push({ range, total, coverage: range.start < start ? 'partial' : 'full', isCurrent: index === 0 });
  }
  return windows;
}

async function financialRows(client, replacement) {
  return client.evaluate(`(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('GlitchBudgetDB');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const names = ['accounts','incomes','expenses'];
    const replacement = ${JSON.stringify(replacement ?? null)};
    const tx = db.transaction(names, replacement ? 'readwrite' : 'readonly');
    const complete = new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    let rows;
    if (replacement) {
      for (const name of names) { const store = tx.objectStore(name); store.clear(); for (const row of replacement[name]) store.put(row); }
    } else {
      rows = await Promise.all(names.map(name => new Promise((resolve, reject) => {
        const request = tx.objectStore(name).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      })));
    }
    await complete; db.close();
    return rows ? Object.fromEntries(names.map((name, index) => [name, rows[index]])) : true;
  })()`, { awaitPromise: true });
}

async function setHidden(client, waitFor, hidden) {
  if (await client.evaluate(`document.documentElement.dataset.balancesHidden === 'true'`) === hidden) return;
  const label = hidden ? 'Ocultar importes' : 'Mostrar importes';
  assert.equal(await client.evaluate(`(() => { const button = document.querySelector('button[aria-label=${JSON.stringify(label)}]'); if (!button) return false; button.click(); return true; })()`), true, 'P3 control real de privacidad');
  await waitFor(client, `document.documentElement.dataset.balancesHidden === '${hidden}'`, 'P3 privacidad ' + hidden);
}

async function dismissAchievementToasts(client, waitFor) {
  await client.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',{awaitPromise:true});
  for (;;) {
    const dismissed = await client.evaluate(`(() => {
      const toast = document.querySelector('[data-achievement-toast]');
      if (!toast) return false;
      const button = toast.querySelector('[data-achievement-toast-action="dismiss"]');
      if (!button) throw new Error('P3 aviso de logro sin control real de cierre');
      toast.dataset.p3Dismissing = 'true';
      button.click();
      return true;
    })()`);
    if (!dismissed) break;
    await waitFor(client,`!document.querySelector('[data-achievement-toast][data-p3-dismissing="true"]')`,'P3 cierre real del aviso de logro');
    await client.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',{awaitPromise:true});
  }
  assert.equal(await client.evaluate('document.querySelectorAll("[data-achievement-toast]").length'),0,'P3 evidencia sin avisos superpuestos');
}

async function selectPreset(client, waitFor, preset, expected) {
  assert.equal(await client.evaluate(`(() => { const button = document.querySelector('[data-report-preset="${preset.name}"]'); if (!button || button.disabled) return false; button.click(); return true; })()`), true, 'P3 preset real ' + preset.name);
  if (preset.name === 'custom') {
    for (const [index, value] of [[0, preset.range.start], [1, preset.range.end]]) {
      assert.equal(await client.evaluate(`(() => {
        const control = document.querySelectorAll('[data-report-range-controls] input[type="date"]')[${index}];
        if (!control) return false;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(control, ${JSON.stringify(value)});
        control.dispatchEvent(new Event('input', { bubbles: true })); control.dispatchEvent(new Event('change', { bubbles: true })); return true;
      })()`), true, 'P3 fecha custom real');
    }
  }
  const ranges = expected.length>=2 ? expected.map(point => [point.range.start, point.range.end, point.coverage, String(point.isCurrent)]) : [];
  const partial = expected.length===1 && expected[0].coverage==='partial' ? [expected[0].range.start,expected[0].range.end,'partial',String(expected[0].isCurrent)] : null;
  await waitFor(client, `document.querySelector('[data-report-preset="${preset.name}"]')?.getAttribute('aria-pressed') === 'true' && JSON.stringify([...document.querySelectorAll('[data-spending-trend-point]')].map(node => [node.dataset.spendingWindowStart,node.dataset.spendingWindowEnd,node.dataset.spendingCoverage,node.dataset.spendingCurrent])) === ${JSON.stringify(JSON.stringify(ranges))}`, 'P3 ventanas ' + preset.name);
  await waitFor(client, `(() => { const node=document.querySelector('[data-spending-trend-partial]'); const partial=node ? [node.dataset.spendingWindowStart,node.dataset.spendingWindowEnd,node.dataset.spendingCoverage,node.dataset.spendingCurrent] : null; return JSON.stringify(partial)===${JSON.stringify(JSON.stringify(partial))} && Boolean(document.querySelector('[data-report-chart="spending-trend"]'))===${expected.length>=2}; })()`, 'P3 representación con historia suficiente '+preset.name);
}

async function readTrend(client) {
  return client.evaluate(`(() => {
    const hero = document.querySelector('[data-report-hero="spending"]');
    const chart = hero?.querySelector('[data-report-chart="spending-trend"]');
    const partial = hero?.querySelector('[data-spending-trend-partial]');
    const bounds = node => { const rect = node.getBoundingClientRect(); return {left:rect.left,right:rect.right,width:rect.width,height:rect.height}; };
    const neutralColors = ['text-foreground','text-muted-foreground','report-hero-muted'].map(className => {
      const probe = document.createElement('span'); probe.className = className; hero.appendChild(probe);
      const color = getComputedStyle(probe).color; probe.remove(); return color;
    });
    const attributes = node => [node, ...node.querySelectorAll('*')].flatMap(element => [...element.attributes].map(attribute => [attribute.name,attribute.value]));
    return {
      viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth,
      heroText:hero?.innerText, heroMoney:hero?.querySelector('[data-spending-money="total"]')?.textContent,
      placeholderCount:hero?.querySelectorAll('[data-placeholder],.animate-pulse,canvas').length,
      controls:hero?.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]').length,
      comparisonAvailable:[...document.querySelectorAll('[data-report-section="comparison-detail"] tbody tr')].some(node => node.firstElementChild.textContent.trim()==='Gasto'),
      pointCount:hero?.querySelectorAll('[data-spending-trend-point]').length,
      svgCount:hero?.querySelectorAll('svg').length,
      listCount:hero?.querySelectorAll('ol,ul').length,
      partial:partial ? {text:partial.textContent,range:{start:partial.dataset.spendingWindowStart,end:partial.dataset.spendingWindowEnd},coverage:partial.dataset.spendingCoverage,isCurrent:partial.dataset.spendingCurrent==='true',bounds:bounds(partial),ariaHidden:Boolean(partial.closest('[aria-hidden="true"]')),attributes:attributes(partial)} : null,
      chart:chart ? {
        text:chart.innerText, bounds:bounds(chart), attributes:attributes(chart),
        svgHidden:[...chart.querySelectorAll('svg')].every(node => node.closest('[aria-hidden="true"]')),
        svgText:[...chart.querySelectorAll('svg text,svg title')].map(node=>node.textContent).join(' '),
        animated:chart.getAnimations({subtree:true}).length,
        points:[...chart.querySelectorAll('[data-spending-trend-point]')].map(node => ({
          range:{start:node.dataset.spendingWindowStart,end:node.dataset.spendingWindowEnd},
          coverage:node.dataset.spendingCoverage,isCurrent:node.dataset.spendingCurrent==='true',
          text:node.innerText,money:node.querySelector('[data-spending-trend-money]')?.textContent,
          moneyBounds:node.querySelector('[data-spending-trend-money]') ? bounds(node.querySelector('[data-spending-trend-money]')) : null,
          bounds:bounds(node),markerWeight:getComputedStyle(node.firstElementChild).fontWeight,
          color:getComputedStyle(node).color,borderColor:getComputedStyle(node).borderColor,
        })),
        bars:[...chart.querySelectorAll('[data-spending-trend-bar]')].map(node => ({
          isCurrent:node.dataset.spendingCurrent==='true',coverage:node.dataset.spendingCoverage,
          fill:getComputedStyle(node).fill,opacity:node.getAttribute('fill-opacity') || getComputedStyle(node).fillOpacity,
          strokeWidth:node.getAttribute('stroke-width') || getComputedStyle(node).strokeWidth,
          stroke:getComputedStyle(node).stroke,dash:node.getAttribute('stroke-dasharray') || getComputedStyle(node).strokeDasharray,
          title:node.querySelector('title')?.textContent || '',bounds:bounds(node),
        })),
      } : null,
      neutralColors:[...neutralColors,getComputedStyle(hero).color],
    };
  })()`);
}

function assertTrend(view, expected, hidden) {
  assert.ok(view && view.heroMoney, 'P3 conserva hero P2');
  assert.ok(view.scrollWidth <= view.viewport + 1, 'P3 sin overflow horizontal');
  assert.equal(view.controls, 0, 'P3 no añade controles al hero');
  assert.equal(view.placeholderCount, 0, 'P3 no fabrica placeholder ni loading dentro del hero');
  assert.equal(view.comparisonAvailable, true, 'P3 tabla exacta de comparación disponible bajo demanda');
  assert.equal(Boolean(view.chart), expected.length >= 2, 'P3 tendencia visual solo con dos o más ventanas observadas');
  const total = expected.find(point => point.isCurrent)?.total ?? 0;
  assert.equal(view.heroMoney, hidden ? '••••••' : money(total), 'P3 ventana actual igual al hero canónico');
  if (!view.chart) {
    assert.equal(view.pointCount,0,'P3 una ventana o ninguna sin lista de tendencia');
    assert.equal(view.listCount,0,'P3 una ventana o ninguna sin lista anticipada');
    assert.equal(view.svgCount,0,'P3 una ventana o ninguna sin SVG de tendencia');
    const point = expected.length===1 && expected[0].coverage==='partial' ? expected[0] : null;
    assert.equal(Boolean(view.partial),Boolean(point),'P3 fallback solo para una ventana parcial');
    if(point) {
      assert.deepEqual({range:view.partial.range,coverage:view.partial.coverage,isCurrent:view.partial.isCurrent},{range:point.range,coverage:point.coverage,isCurrent:point.isCurrent},'P3 indicador parcial conserva ventana canónica');
      assert.equal(view.partial.text,'Historial parcial','P3 copy exacto del indicador parcial');
      assert.equal(view.partial.ariaHidden,false,'P3 indicador parcial accesible');
      const rect=view.partial.bounds;
      assert.ok(rect.width>0 && rect.height>0 && rect.left>=-1 && rect.right<=view.viewport+1,'P3 indicador parcial visible y contenido');
      assert.doesNotMatch(view.partial.text+JSON.stringify(view.partial.attributes),moneyPattern,'P3 indicador parcial sin importes');
    }
    if(hidden) assert.doesNotMatch(view.heroText,moneyPattern,'P3 hero privado también sin gráfico');
    return;
  }
  assert.equal(view.partial,null,'P3 gráfico con lista conserva indicador parcial dentro del punto');
  assert.equal(view.chart.svgHidden, true, 'P3 SVG decorativo fuera del árbol accesible');
  assert.equal(view.chart.attributes.some(([name,value])=>/^(?:aria-value(?:now|min|max)|data-(?:amount|total|value|payload))$/.test(name) && /\d/.test(value)),false,'P3 no serializa importes crudos en atributos del chart');
  assert.deepEqual(view.chart.points.map(({range,coverage,isCurrent})=>({range,coverage,isCurrent})), expected.map(({range,coverage,isCurrent})=>({range,coverage,isCurrent})), 'P3 orden, rangos y cobertura canónicos');
  assert.equal(view.chart.points.filter(point=>point.isCurrent).length, 1, 'P3 una ventana actual');
  for (let index=0; index<expected.length; index+=1) {
    const point = view.chart.points[index];
    assert.equal(point.money, hidden ? '••••••' : money(expected[index].total), 'P3 importe canónico privado del punto');
    assert.match(point.text, point.isCurrent ? /Actual/ : /Anterior/, 'P3 marcador de ventana');
    assert.ok(point.text.includes(windowLabel(point.range)), 'P3 etiqueta visible del rango canónico');
    if (point.coverage === 'partial') assert.match(point.text, /Historial parcial/, 'P3 indicación accesible exacta de cobertura parcial');
    else assert.doesNotMatch(point.text, /Historial parcial/, 'P3 full sin etiqueta parcial');
    for (const rect of [point.bounds,point.moneyBounds]) assert.ok(rect && rect.width>0 && rect.height>0 && rect.left>=-1 && rect.right<=view.viewport+1, 'P3 lista exacta contenida');
  }
  assert.ok(view.chart.bounds.width>0 && view.chart.bounds.height>0 && view.chart.bounds.left>=-1 && view.chart.bounds.right<=view.viewport+1, 'P3 chart contenido');
  const current = view.chart.bars.find(bar=>bar.isCurrent);
  const previous = view.chart.bars.find(bar=>!bar.isCurrent);
  const currentPoint = view.chart.points.find(point=>point.isCurrent);
  const previousPoint = view.chart.points.find(point=>!point.isCurrent);
  if(previousPoint) assert.ok(currentPoint.markerWeight!==previousPoint.markerWeight || currentPoint.color!==previousPoint.color || currentPoint.borderColor!==previousPoint.borderColor,'P3 actual destacada también con cero real');
  for (const bar of view.chart.bars) {
    assert.ok(view.neutralColors.includes(bar.fill), 'P3 barras neutrales sin semántica good/bad');
    if (bar.coverage==='partial') {
      assert.match(bar.title, /Historial parcial/);
      assert.equal(bar.dash,'4 3','P3 borde parcial discontinuo exacto');
      assert.ok(view.neutralColors.includes(bar.stroke),'P3 borde parcial neutral');
      assert.equal(Number.parseFloat(bar.strokeWidth),2,'P3 borde parcial visible');
    } else assert.ok(!bar.dash || bar.dash==='none','P3 cobertura full sin borde discontinuo');
    assert.match(bar.title, bar.isCurrent ? /Actual/ : /Anterior/);
  }
  if (current && previous) assert.ok(current.fill!==previous.fill || current.opacity!==previous.opacity || current.strokeWidth!==previous.strokeWidth, 'P3 ventana actual visualmente destacada');
  if (hidden) assert.doesNotMatch(view.heroText + view.chart.svgText + JSON.stringify(view.chart.attributes), moneyPattern, 'P3 sin dinero en texto, SVG o atributos');
}

async function assertPrivate(client) {
  const ax = await client.command('Accessibility.getFullAXTree');
  assert.doesNotMatch(JSON.stringify(ax.nodes.map(node=>({name:node.name?.value,description:node.description?.value,value:node.value?.value}))), moneyPattern, 'P3 sin dinero en árbol accesible');
}

async function hoverCurrent(client, waitFor, expected, hidden) {
  await client.evaluate(`document.querySelector('[data-report-chart="spending-trend"]').scrollIntoView({block:'center'});`);
  const target = await client.evaluate(`(() => {
    const rect = document.querySelector('[data-spending-trend-bar][data-spending-current="${expected.isCurrent}"]${expected.coverage==='partial' ? '[data-spending-coverage="partial"]' : ''}')?.getBoundingClientRect();
    return rect ? {x:rect.x+rect.width/2,y:rect.y+rect.height/2,width:rect.width,height:rect.height} : null;
  })()`);
  assert.ok(target && target.width>0 && target.height>0, 'P3 hover sobre barra canónica real');
  await client.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:target.x,y:target.y});
  await waitFor(client, `(() => { const node=document.querySelector('[data-report-chart="spending-trend"] .recharts-tooltip-wrapper'); return node && getComputedStyle(node).visibility!=='hidden' && node.innerText.includes(${JSON.stringify(expected.isCurrent ? 'Actual' : 'Anterior')}) && node.innerText.includes(${JSON.stringify(windowLabel(expected.range))}) && node.innerText.includes(${JSON.stringify(hidden ? '••••••' : money(expected.total))}); })()`, 'P3 tooltip real privado');
  const tooltip = await client.evaluate(`(() => { const node=document.querySelector('[data-report-chart="spending-trend"] .recharts-tooltip-wrapper'); return {text:node.innerText,attributes:[node,...node.querySelectorAll('*')].flatMap(element=>[...element.attributes].map(attribute=>[attribute.name,attribute.value]))}; })()`);
  assert.ok(tooltip.text.includes(hidden ? '••••••' : money(expected.total)), 'P3 tooltip muestra el importe canónico con el hook');
  assert.ok(tooltip.text.includes(windowLabel(expected.range)) && tooltip.text.includes(expected.isCurrent ? 'Actual' : 'Anterior'),'P3 tooltip conserva rango y marcador canónicos');
  if (expected.coverage==='partial') assert.match(tooltip.text,/Historial parcial/);
  if (hidden) {
    assert.doesNotMatch(tooltip.text+JSON.stringify(tooltip.attributes),moneyPattern,'P3 tooltip sin fuga monetaria');
    await assertPrivate(client);
  }
  await client.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
  await client.evaluate('window.scrollTo(0,0);');
  return tooltip;
}

async function captureHero(client, directory, name, width) {
  await client.command('Emulation.setScrollbarsHidden',{hidden:true});
  await client.command('Emulation.setDeviceMetricsOverride',{width,height:1600,deviceScaleFactor:1,mobile:false});
  try {
    await client.evaluate('(async () => { await document.fonts.ready; window.scrollTo(0,0); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); })()',{awaitPromise:true});
    const height = await client.evaluate(`Math.max(1600,Math.ceil(document.querySelector('[data-report-hero="spending"]').getBoundingClientRect().bottom+100))`);
    await client.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await client.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',{awaitPromise:true});
    const clip = await client.evaluate(`(() => { const rect=document.querySelector('[data-report-hero="spending"]').getBoundingClientRect(); return {x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:rect.height,scale:1}; })()`);
    const screenshot = await client.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});
    await writeFile(path.join(directory,name+'.png'),Buffer.from(screenshot.data,'base64'));
  } finally {
    await client.command('Emulation.setScrollbarsHidden',{hidden:false});
    await client.command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
  }
}

export async function verifyFinalUiPolishP3(client, waitFor) {
  const directory = process.env.FINAL_UI_POLISH_P3_CAPTURE_DIR;
  if (directory) await mkdir(directory,{recursive:true});
  const original = await financialRows(client);
  const originalTheme = await client.evaluate('document.documentElement.className');
  const originalHidden = await client.evaluate(`document.documentElement.dataset.balancesHidden === 'true'`);
  const records = [];
  let captures = 0;
  let loadingObserved = false;
  assert.equal(await client.evaluate('new Date().toISOString()'),captureFixture.instant,'P3 reloj P0 fijo');
  assert.equal(history.instant,captureFixture.instant);
  const observer = await client.command('Page.addScriptToEvaluateOnNewDocument',{source:`
    globalThis.__p3LoadingObserved=false;
    new MutationObserver(() => { if(document.querySelector('[data-reports-prisma] .animate-pulse') && !document.querySelector('[data-report-hero="spending"]')) globalThis.__p3LoadingObserved=true; }).observe(document,{subtree:true,childList:true});
  `});
  try {
    await setHidden(client,waitFor,false);
    for (const scenario of scenarios) {
      await financialRows(client,scenario.rows);
      await client.command('Page.reload',{ignoreCache:true});
      await waitFor(client, `document.readyState==='complete' && Boolean(document.querySelector('[data-report-hero="spending"]')) && document.querySelector('[data-report-preset="30d"]')?.getAttribute('aria-pressed')==='true'`, 'P3 fixture '+scenario.name);
      loadingObserved ||= await client.evaluate('globalThis.__p3LoadingObserved===true');
      await dismissAchievementToasts(client,waitFor);
      const selected = scenario.name==='long-history' ? presets : [presets[1]];
      for (const preset of selected) {
        const expected = expectedWindows(scenario.rows,preset);
        await selectPreset(client,waitFor,preset,expected);
        const fullMatrix = preset.name==='30d';
        for (const theme of fullMatrix ? ['light','dark','serious'] : ['light']) {
          await client.evaluate(`document.documentElement.classList.remove('light','dark','serious'); document.documentElement.classList.add('${theme}');`);
          for (const width of fullMatrix ? (theme==='serious' ? [320,1280] : [320,360,390,1280]) : [390]) {
            await client.command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
            await client.evaluate('window.scrollTo(0,0); new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',{awaitPromise:true});
            await waitFor(client,'document.documentElement.scrollWidth<=innerWidth+1','P3 layout estable '+scenario.name+'-'+preset.name+'-'+theme+'-'+width);
            for (const hidden of [false,true]) {
              await setHidden(client,waitFor,hidden);
              const view = await readTrend(client);
              assertTrend(view,expected,hidden);
              if (hidden) await assertPrivate(client);
              const name = `${scenario.name}-${preset.name}-${theme}-${width}-${hidden?'hidden':'visible'}`;
              const record = {name,expected,...view};
              if (preset.name==='30d' && (scenario.name==='long-history' || (scenario.name==='partial-then-zero' && theme==='light' && width===390))) record.tooltip=await hoverCurrent(client,waitFor,expected.find(point=>scenario.name==='partial-then-zero' ? point.coverage==='partial' : point.isCurrent),hidden);
              records.push(record);
              const captureLongHistory = scenario.name==='long-history' && preset.name==='30d' && theme!=='serious' && [320,390,1280].includes(width);
              const capturePartial = ['current-partial','partial-then-zero'].includes(scenario.name) && preset.name==='30d' && ((theme==='light' && width===320 && !hidden) || (theme==='dark' && width===390 && hidden));
              if (directory && (captureLongHistory || capturePartial)) {
                await captureHero(client,directory,name,width); captures+=1;
              }
            }
            await setHidden(client,waitFor,false);
            assertTrend(await readTrend(client),expected,false);
          }
        }
      }
      if(scenario.name==='current-partial') {
        const preset={name:'custom',range:{start:'2026-09-18',end:'2026-10-04'},max:6};
        const expected=expectedWindows(scenario.rows,preset);
        assert.equal(expected.length,1,'P3 probe de una única ventana full');
        assert.equal(expected[0].coverage,'full','P3 probe empieza en el primer gasto');
        await selectPreset(client,waitFor,preset,expected);
        await client.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
        await client.evaluate('window.scrollTo(0,0); new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',{awaitPromise:true});
        await waitFor(client,'document.documentElement.scrollWidth<=innerWidth+1','P3 una ventana full layout estable');
        for(const hidden of [false,true]) {
          await setHidden(client,waitFor,hidden);
          assertTrend(await readTrend(client),expected,hidden);
          if(hidden) await assertPrivate(client);
        }
        await setHidden(client,waitFor,false);
      }
    }
    // Real keyboard/touch interaction remains on the existing range controls.
    await financialRows(client,scenarios[0].rows);
    await client.command('Page.reload',{ignoreCache:true});
    await waitFor(client,`document.readyState==='complete' && Boolean(document.querySelector('[data-report-chart="spending-trend"]')) && document.querySelector('[data-report-preset="30d"]')?.getAttribute('aria-pressed')==='true'`,'P3 interacción con historial real');
    await dismissAchievementToasts(client,waitFor);
    await client.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});
    await client.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab'});
    assert.equal(await client.evaluate(`(() => { const button=document.querySelector('[data-report-preset="30d"]'); button.focus(); const style=getComputedStyle(button); return document.activeElement===button && button.matches(':focus-visible') && (style.boxShadow!=='none' || style.outlineStyle!=='none'); })()`),true,'P3 focus visible conservado');
    assert.equal(await client.evaluate(`(() => { const button=document.querySelector('[data-report-preset="7d"]'); button.focus(); return document.activeElement===button && !button.disabled; })()`),true,'P3 foco real en el rango 7d antes de Enter');
    await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
    await client.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
    await waitFor(client,`document.querySelector('[data-report-preset="7d"]')?.getAttribute('aria-pressed')==='true'`,'P3 rango por teclado real');
    assertTrend(await readTrend(client),expectedWindows(scenarios[0].rows,presets[0]),false);
    assert.equal(await client.evaluate(`document.querySelectorAll('[data-report-hero="spending"] [tabindex="0"], [data-report-hero="spending"] button').length`),0,'P3 gráfico no añade tab stops');
    await client.command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    for (const name of ['7d','30d']) {
      const point = await client.evaluate(`(() => { const button=document.querySelector('[data-report-preset="${name}"]'); button.scrollIntoView({block:'center'}); const rect=button.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2,height:rect.height,enabled:!button.disabled}; })()`);
      assert.ok(point.enabled && point.height>=40,'P3 touch target existente');
      await client.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});
      await client.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await waitFor(client,`document.querySelector('[data-report-preset="${name}"]')?.getAttribute('aria-pressed')==='true'`,'P3 rango real por touch '+name);
      assertTrend(await readTrend(client),expectedWindows(scenarios[0].rows,presets.find(preset=>preset.name===name)),false);
    }
    await client.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await client.evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`),true);
    const reduced = await readTrend(client);
    assertTrend(reduced,expectedWindows(scenarios[0].rows,presets[1]),false);
    assert.equal(reduced.chart.animated,0,'P3 sin animaciones con reduced motion');
    assert.equal(loadingObserved,true,'P3 loading real observado antes del hero');
    assert.equal(records.length,130,'P3 matriz completa');
    if(directory) assert.equal(captures,16,'P3 dieciséis capturas reproducibles');
  } finally {
    await client.command('Page.removeScriptToEvaluateOnNewDocument',{identifier:observer.identifier});
    await financialRows(client,original);
    assert.deepEqual(await financialRows(client),original,'P3 restaura exactamente accounts/incomes/expenses originales');
    await client.command('Page.reload',{ignoreCache:true});
    await waitFor(client,`document.querySelector('article[data-quick-read-kind="cash_flow_change"] h3')?.textContent.trim()==='Hay un nuevo flujo neto comparable' && Boolean(document.querySelector('[data-spending-money="total"]'))`,'P3 restaura Reportes P0');
    await client.evaluate(`document.documentElement.className=${JSON.stringify(originalTheme)}; window.scrollTo(0,0);`);
    await setHidden(client,waitFor,originalHidden);
    await client.command('Emulation.setTouchEmulationEnabled',{enabled:false});
    await client.command('Emulation.setEmulatedMedia',{features:[]});
    await client.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  }
  const result = {presetCount:presets.length,scenarioCount:scenarios.length,checks:records.length,captures,widths:[320,360,390,1280],themes:['light','dark'],legacyWidths:[320,1280],windows:'passed',coverage:'passed',singlePartial:'passed',singleFull:'passed',partialOutline:'passed',unassignedAndRemovedAccountHistory:'passed',accountStartDateDoesNotCutSpending:'passed',noFakeZeros:'passed',realFullZeros:'passed',currentMatchesHero:'passed',privacy:'passed',tooltips:'passed',neutralCurrentHighlight:'passed',keyboard:'passed',touch:'passed',reducedMotion:'passed',loadingObserved,empty:'passed',disabled:'chart has no controls; existing range presets remain enabled',restoredOriginalDataset:true};
  if (directory) await writeFile(path.join(directory,'verification.json'),JSON.stringify({fixture:{version:1,instant:captureFixture.instant,timezone:captureFixture.timezone,sourcepath:'scripts/final-ui-polish-p3-verification.mjs'},result},null,2)+'\n');
  process.stdout.write('FINAL_UI_POLISH_P3 '+JSON.stringify(result)+'\n');
}
