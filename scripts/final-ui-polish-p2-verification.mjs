import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { captureFixture } from './final-ui-polish-p0-fixture.mjs';

const history = JSON.parse(readFileSync(new URL('../tests/fixtures/final-ui-polish-p1-history.json', import.meta.url), 'utf8'));
const moneyPattern = /(?:RD\$|DOP|US\$|USD|\$)\s*-?\d/;
const categories = ['vivienda', 'transporte', 'alimentacion'];
const cases = [
  { name: 'prev-zero', current: [100], previous: [], total: 100, previousTotal: 0, variation: 'Sin gasto anterior con el que comparar' },
  { name: 'up', current: [200, 200, 200], previous: [100, 100, 100], total: 600, previousTotal: 300, variation: '↑ +100% frente al rango comparable' },
  { name: 'down', current: [100, 100, 100], previous: [200, 200, 200], total: 300, previousTotal: 600, variation: '↓ -50% frente al rango comparable' },
  { name: 'stable', current: [100], previous: [100], total: 100, previousTotal: 100, variation: '↔ Sin cambio frente al rango comparable' },
  { name: 'empty', current: [], previous: [], total: 0, previousTotal: 0, variation: 'Sin gasto anterior con el que comparar' },
];
const normalize = value => value.replace(/\s+/g, ' ').trim();
const money = cents => 'RD$ ' + (cents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function caseRows(scenario) {
  const rows = { accounts: history.accounts, incomes: [], expenses: [] };
  for (const [period, date, amounts] of [['current', history.currentDate, scenario.current], ['previous', history.previousDate, scenario.previous]]) {
    const income = amounts.reduce((total, amount) => total + amount, 0);
    if (income) rows.incomes.push({ ...history.incomeTemplate, id: 'p2-income-' + period, accountId: history.accounts[0].id, amount: income, amountBase: income, date, month: date.slice(0, 7) });
    amounts.forEach((amount, index) => rows.expenses.push({ ...history.expenseTemplate, id: 'p2-expense-' + period + '-' + index, accountId: history.accounts[0].id, categoryId: categories[index], amount, amountBase: amount, date, month: date.slice(0, 7) }));
  }
  return rows;
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
    await complete;
    db.close();
    return rows ? Object.fromEntries(names.map((name, index) => [name, rows[index]])) : true;
  })()`, { awaitPromise: true });
}

async function setHidden(client, waitFor, hidden) {
  if (await client.evaluate(`document.documentElement.dataset.balancesHidden === 'true'`) === hidden) return;
  const label = hidden ? 'Ocultar importes' : 'Mostrar importes';
  assert.equal(await client.evaluate(`(() => { const button = document.querySelector('button[aria-label=${JSON.stringify(label)}]'); if (!button) return false; button.click(); return true; })()`), true, 'P2 control real de privacidad');
  await waitFor(client, `document.documentElement.dataset.balancesHidden === '${hidden}'`, 'P2 privacidad ' + hidden);
}

async function readHero(client) {
  return client.evaluate(`(() => {
    const hero = document.querySelector('[data-report-hero="spending"]');
    if (!hero) return null;
    const bounds = node => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width, height: rect.height }; };
    const token = key => {
      const node = hero.querySelector('[data-spending-money="'+key+'"]');
      const range = document.createRange(); range.selectNodeContents(node);
      const style = getComputedStyle(node);
      return { text: node.textContent, whiteSpace: style.whiteSpace, lines: range.getClientRects().length, fontSize: parseFloat(style.fontSize), fontFamily: style.fontFamily, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing, bounds: bounds(node), color: style.color };
    };
    const variation = hero.querySelector('[data-spending-variation]');
    const count = hero.querySelector('[data-spending-count]');
    const neutralColors = ['text-foreground','text-muted-foreground'].map(className => {
      const probe = document.createElement('span'); probe.className = className; hero.appendChild(probe);
      const color = getComputedStyle(probe).color; probe.remove(); return color;
    });
    const row = [...document.querySelectorAll('[data-report-section="comparison-detail"] table tbody tr')].find(node => node.firstElementChild.textContent.trim() === 'Gasto');
    const formatter = new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short',year:'numeric'});
    const rangeLabel = (start,end) => formatter.format(new Date(start+'T12:00:00'))+' – '+formatter.format(new Date(end+'T12:00:00'));
    const primary = document.querySelector('[data-quick-read-primary="true"]');
    const primaryBodyStyle = getComputedStyle(primary.querySelector('h3 + p'));
    return {
      viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      bounds: bounds(hero), text: hero.innerText,
      total: token('total'), previous: token('previous'),
      bodyFontFamily: getComputedStyle(document.body).fontFamily,
      displayFontFamily: getComputedStyle(primary.querySelector('h3')).fontFamily,
      quickReadBody: { fontFamily: primaryBodyStyle.fontFamily, fontSize: parseFloat(primaryBodyStyle.fontSize), moneyTokens: [...primary.querySelectorAll('[data-quick-read-money]')].map(node => node.textContent) },
      variation: variation.textContent, variationBounds: bounds(variation), variationColor: getComputedStyle(variation).color,
      variationFontSize: parseFloat(getComputedStyle(variation).fontSize), count: count.textContent,
      neutralColors,
      labels: [...hero.querySelectorAll('[aria-label],[aria-description],[title],svg text')].map(node => [node.textContent,node.getAttribute('aria-label'),node.getAttribute('aria-description'),node.getAttribute('title')].join(' ')).join(' '),
      prohibitedContent: [...hero.querySelectorAll('svg,canvas,table,button,input,[data-report-chart],[data-placeholder],.animate-pulse')].filter(node => !node.closest('[data-report-chart="spending-trend"]')).length,
      spendingTrendCharts: hero.querySelectorAll('[data-report-chart="spending-trend"]').length,
      spendingTrendPartials: [...hero.querySelectorAll('[data-spending-trend-partial]')].map(node=>({text:node.textContent,coverage:node.dataset.spendingCoverage,isCurrent:node.dataset.spendingCurrent})),
      trendControls: hero.querySelectorAll('[data-report-chart="spending-trend"] button,[data-report-chart="spending-trend"] input,[data-report-chart="spending-trend"] table,[data-report-chart="spending-trend"] [data-placeholder]').length,
      tabStops: hero.querySelectorAll('[tabindex="0"],a[href],button,input,select,textarea').length,
      animated: hero.getAnimations({ subtree: true }).length,
      comparison: row ? { previous: row.children[1].textContent.trim(), current: row.children[2].textContent.trim(), visible: row.getClientRects().length > 0 } : null,
      currentRange: rangeLabel('2026-09-05','2026-10-04'), previousRange: rangeLabel('2026-08-06','2026-09-04'),
    };
  })()`);
}

function assertHero(view, scenario, hidden) {
  assert.ok(view, 'P2 hero visible');
  assert.match(view.text, /Gasto del rango/i);
  assert.equal(normalize(view.variation), scenario.variation, 'P2 variación real y dirección explícita');
  assert.equal(normalize(view.count), scenario.current.length + (scenario.current.length === 1 ? ' movimiento' : ' movimientos'), 'P2 conteo canónico y concordancia');
  assert.equal(view.prohibitedContent, 0, 'P2 solo admite el chart canónico autorizado por P3, sin placeholders ni controles');
  assert.equal(view.spendingTrendCharts, scenario.previous.length ? 1 : 0, 'P3 solo muestra tendencia con al menos dos ventanas observadas');
  assert.deepEqual(view.spendingTrendPartials,scenario.name==='prev-zero' ? [{text:'Historial parcial',coverage:'partial',isCurrent:'true'}] : [],'P3 una única ventana parcial mantiene la indicación accesible');
  assert.equal(view.trendControls, 0, 'P3 tendencia sin tabla oculta, placeholders ni controles nuevos');
  assert.equal(view.tabStops, 0, 'P2 hero no añade controles');
  assert.ok(view.scrollWidth <= view.viewport + 1, 'P2 sin overflow horizontal');
  assert.ok(view.neutralColors.includes(view.variationColor), 'P2 variación neutral');
  assert.ok(view.neutralColors.includes(view.total.color), 'P2 importe principal neutral');
  if (hidden) {
    assert.equal(view.total.fontFamily, view.previous.fontFamily, 'P2 máscaras del hero con la misma fuente');
    for (const token of [view.total,view.previous]) {
      assert.equal(token.fontSize, 16, 'P2 máscaras con tamaño body text-base');
      assert.equal(token.fontSize, view.quickReadBody.fontSize, 'P2 máscaras del tamaño del cuerpo de Quick Read');
      assert.equal(token.fontWeight, '400', 'P2 máscaras sin peso display');
      assert.ok(token.letterSpacing === 'normal' || token.letterSpacing === '0px', 'P2 máscaras sin tracking display');
      assert.equal(token.fontFamily, view.bodyFontFamily, 'P2 máscaras heredan la fuente body del tema');
      assert.equal(token.fontFamily, view.quickReadBody.fontFamily, 'P2 máscaras con la fuente body de Quick Read');
      assert.deepEqual([...token.text].map(character => character.codePointAt(0)), Array(6).fill(0x2022), 'P2 conserva seis bullets U+2022 del hook');
    }
    for (const text of view.quickReadBody.moneyTokens) assert.equal(view.total.text, text, 'P2 conserva el mismo enmascarado que Quick Read');
  } else {
    assert.ok(view.total.fontSize > view.variationFontSize && view.total.fontSize > view.previous.fontSize, 'P2 importe visible principal protagonista');
    assert.equal(view.total.fontFamily, view.displayFontFamily, 'P2 total visible conserva la fuente display');
    assert.equal(view.previous.fontFamily, view.bodyFontFamily, 'P2 comparable visible hereda body sin mono');
  }
  assert.ok(view.text.includes(view.currentRange) && view.text.includes(view.previousRange), 'P2 etiquetas de ambos rangos conservadas');
  assert.ok(view.comparison && !view.comparison.visible, 'P2 evidencia exacta permanece disponible bajo demanda');
  assert.equal(view.total.text, view.comparison.current, 'P2 importe igual al canónico en tabla');
  assert.equal(view.previous.text, view.comparison.previous, 'P2 anterior igual al canónico en tabla');
  assert.equal(view.total.text, hidden ? '••••••' : money(scenario.total));
  assert.equal(view.previous.text, hidden ? '••••••' : money(scenario.previousTotal));
  for (const token of [view.total, view.previous]) {
    assert.equal(token.whiteSpace, 'nowrap', 'P2 símbolo e importe indivisibles');
    assert.equal(token.lines, 1, 'P2 token monetario en una línea');
  }
  for (const rect of [view.bounds,view.total.bounds,view.previous.bounds,view.variationBounds]) {
    assert.ok(rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.right <= view.viewport + 1, 'P2 geometría contenida');
  }
}

export async function verifyFinalUiPolishP2(client, waitFor) {
  const directory = process.env.FINAL_UI_POLISH_P2_CAPTURE_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const original = await financialRows(client);
  const records = [];
  const colors = new Map();
  let captures = 0;
  let loadingObserved = false;
  assert.equal(await client.evaluate('new Date().toISOString()'), captureFixture.instant, 'P2 reloj P0 fijo');
  assert.equal(history.instant, captureFixture.instant);
  const observer = await client.command('Page.addScriptToEvaluateOnNewDocument', { source: `
    globalThis.__p2LoadingObserved = false;
    new MutationObserver(() => { if (document.querySelector('[data-reports-prisma] .animate-pulse') && !document.querySelector('[data-report-hero="spending"]')) globalThis.__p2LoadingObserved = true; }).observe(document,{subtree:true,childList:true});
  ` });
  try {
    await setHidden(client, waitFor, false);
    for (const scenario of cases) {
      await financialRows(client, caseRows(scenario));
      await client.command('Page.reload', { ignoreCache: true });
      await waitFor(client, `document.readyState === 'complete' && document.querySelector('[data-spending-money="total"]')?.textContent === ${JSON.stringify(money(scenario.total))} && document.querySelector('[data-spending-money="previous"]')?.textContent === ${JSON.stringify(money(scenario.previousTotal))} && document.querySelector('[data-report-preset="30d"]')?.getAttribute('aria-pressed') === 'true'`, 'P2 fixture ' + scenario.name);
      loadingObserved ||= await client.evaluate('globalThis.__p2LoadingObserved === true');
      for (const theme of ['light','dark','serious']) {
        await client.evaluate(`document.documentElement.classList.remove('light','dark','serious'); document.documentElement.classList.add('${theme}');`);
        for (const width of theme === 'serious' ? [320,1280] : [320,360,390,1280]) {
          await client.command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false });
          await client.evaluate('window.scrollTo(0,0); new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))', { awaitPromise: true });
          await waitFor(client, 'document.documentElement.scrollWidth <= innerWidth + 1', 'P2 layout estable ' + scenario.name + '-' + theme + '-' + width);
          for (const hidden of [false,true]) {
            await setHidden(client, waitFor, hidden);
            const view = await readHero(client);
            assertHero(view, scenario, hidden);
            if (hidden) {
              assert.doesNotMatch(view.text + view.labels, moneyPattern, 'P2 sin fuga en texto, atributos ni SVG');
              const ax = await client.command('Accessibility.getFullAXTree');
              assert.doesNotMatch(JSON.stringify(ax.nodes.map(node => ({name:node.name?.value,description:node.description?.value,value:node.value?.value}))), moneyPattern, 'P2 sin fuga en árbol accesible');
            } else assert.match(view.text, moneyPattern, 'P2 control positivo de importes visibles');
            const colorKey = `${theme}-${width}-${hidden}`;
            if (scenario.name === 'up') colors.set(colorKey, view.variationColor);
            if (scenario.name === 'down') assert.equal(view.variationColor, colors.get(colorKey), 'P2 subida y bajada comparten color neutral');
            const name = `${scenario.name}-${theme}-${width}-${hidden ? 'hidden' : 'visible'}`;
            records.push({name,...view});
            if (directory && ['prev-zero','up','down'].includes(scenario.name) && theme !== 'serious' && [320,1280].includes(width)) {
              // Capture hides scrollbars; do it before measuring so preceding text cannot reflow after the crop is chosen.
              await client.command('Emulation.setScrollbarsHidden', { hidden: true });
              await client.command('Emulation.setDeviceMetricsOverride', { width, height: 1600, deviceScaleFactor: 1, mobile: false });
              try {
                await client.evaluate('(async () => { await document.fonts.ready; window.scrollTo(0,0); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); })()', { awaitPromise: true });
                const clip = await client.evaluate(`(() => { const rect = document.querySelector('[data-report-hero="spending"]').getBoundingClientRect(); return {x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:rect.height,scale:1}; })()`);
                const screenshot = await client.command('Page.captureScreenshot', { format:'png', captureBeyondViewport:true, clip });
                await writeFile(path.join(directory,name+'.png'),Buffer.from(screenshot.data,'base64'));
                captures += 1;
              } finally {
                await client.command('Emulation.setScrollbarsHidden', { hidden: false });
                await client.command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
              }
            }
          }
          await setHidden(client, waitFor, false);
          assertHero(await readHero(client), scenario, false);
        }
      }
    }
    assert.equal(records.length,100,'P2 matriz completa y legado');
    assert.equal(loadingObserved,true,'P2 loading real observado antes del hero');
    await client.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});
    await client.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab'});
    assert.equal(await client.evaluate(`(() => { const button = document.querySelector('[data-report-preset="30d"]'); button.focus(); const style = getComputedStyle(button); return document.activeElement === button && button.matches(':focus-visible') && (style.boxShadow !== 'none' || style.outlineStyle !== 'none'); })()`),true,'P2 focus de controles conservado');
    await client.command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    for (const preset of ['7d','30d']) {
      const point = await client.evaluate(`(() => { const button = document.querySelector('[data-report-preset="${preset}"]'); button.scrollIntoView({block:'center'}); const rect = button.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2,height:rect.height,enabled:!button.disabled}; })()`);
      assert.ok(point.enabled && point.height >= 40,'P2 touch target del sistema');
      await client.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});
      await client.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await waitFor(client,`document.querySelector('[data-report-preset="${preset}"]').getAttribute('aria-pressed') === 'true'`,'P2 preset por touch ' + preset);
    }
    await client.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await client.evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`),true);
    assert.equal((await readHero(client)).animated,0,'P2 hero estático con reduced motion');
  } finally {
    await client.command('Page.removeScriptToEvaluateOnNewDocument',{identifier:observer.identifier});
    await financialRows(client, original);
    assert.deepEqual(await financialRows(client), original, 'P2 restaura exactamente el dataset original');
    await client.command('Page.reload',{ignoreCache:true});
    await waitFor(client,`document.querySelector('article[data-quick-read-kind="cash_flow_change"] h3')?.textContent.trim() === 'Hay un nuevo flujo neto comparable' && Boolean(document.querySelector('[data-spending-money="total"]'))`,'P2 restaura Reportes P0');
    await client.evaluate(`document.querySelector('[data-report-preset="30d"]').click(); document.documentElement.classList.remove('light','dark','serious'); document.documentElement.classList.add('light'); window.scrollTo(0,0);`);
    await setHidden(client, waitFor, false);
    await client.command('Emulation.setTouchEmulationEnabled',{enabled:false});
    await client.command('Emulation.setEmulatedMedia',{features:[]});
    await client.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  }
  const result = { cases:cases.map(row=>row.name), checks:records.length, captures, widths:[320,360,390,1280], themes:['light','dark'], legacyWidths:[320,1280], canonicalValues:'passed', privacy:'passed', moneyTypography:'passed', visibilityTransitions:'passed', neutralDirection:'passed', keyboard:'passed', touch:'passed', reducedMotion:'passed', empty:'passed', loadingObserved, disabled:'hero has no controls', restoredOriginalDataset:true };
  if (directory) await writeFile(path.join(directory,'verification.json'),JSON.stringify({fixture:{instant:captureFixture.instant,timezone:captureFixture.timezone,preset:captureFixture.preset,scenarios:cases.map(scenario=>({...scenario,rows:caseRows(scenario)}))},result,records},null,2)+'\n');
  process.stdout.write('FINAL_UI_POLISH_P2 ' + JSON.stringify(result) + '\n');
}
