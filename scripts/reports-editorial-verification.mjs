import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const fixture = JSON.parse(readFileSync(new URL('../tests/fixtures/reports-editorial-composition.json', import.meta.url)));
const money = value => 'RD$ ' + (value / 100).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyPattern = /(?:RD\$|DOP|US\$|USD|\$)\s*-?\d/;
const tables = Object.keys(fixture.rows);

async function financialRows(client, replacement) {
  return client.evaluate(`(async () => {
    const db = await new Promise((resolve,reject) => {
      const request=indexedDB.open('GlitchBudgetDB');
      request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error);
    });
    const tables=${JSON.stringify(tables)};
    const replacement=${JSON.stringify(replacement ?? null)};
    const tx=db.transaction(tables,replacement?'readwrite':'readonly');
    const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    const requests=tables.map(name=>{
      const store=tx.objectStore(name);
      if(replacement){store.clear();for(const row of replacement[name])store.put(row);}
      return new Promise((resolve,reject)=>{const request=store.getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    });
    const rows=await Promise.all(requests);await done;db.close();
    return Object.fromEntries(tables.map((name,index)=>[name,rows[index]]));
  })()`, { awaitPromise:true });
}

async function hiddenState(client, waitFor, hidden) {
  if(await client.evaluate(`document.documentElement.dataset.balancesHidden==='true'`)===hidden)return;
  await client.evaluate(`document.querySelector('button[aria-label="${hidden?'Ocultar':'Mostrar'} importes"]').click()`);
  await waitFor(client,`document.documentElement.dataset.balancesHidden==='${hidden}'`,'editorial privacidad');
}

async function readFrame(client) {
  return client.evaluate(`(() => {
    const root=document.querySelector('[data-reports-prisma]');
    const bounds=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};};
    const visible=node=>Boolean(node?.getClientRects().length);
    const hero=root.querySelector('[data-report-hero]');
    const insights=[...root.querySelectorAll('[data-quick-read-kind]')];
    const primary=insights.find(node=>node.dataset.quickReadPrimary==='true');
    const detail=root.querySelector('#report-detailed-analysis');
    return {
      width:innerWidth,scrollWidth:document.documentElement.scrollWidth,text:root.innerText,
      period:root.querySelector('[data-report-period]').textContent,
      hero:bounds(hero),heroSurface:getComputedStyle(hero).backgroundColor,
      insightSurface:getComputedStyle(root.querySelector('[data-report-section="quick-read"]')).backgroundColor,
      categorySurface:getComputedStyle(root.querySelector('[data-report-visual="categories"]')).backgroundColor,
      total:root.querySelector('[data-spending-money="total"]').textContent,
      previous:root.querySelector('[data-spending-money="previous"]').textContent,
      insights:insights.map(node=>({kind:node.dataset.quickReadKind,title:node.querySelector('h3').textContent,primary:node.dataset.quickReadPrimary==='true',size:parseFloat(getComputedStyle(node.querySelector('h3')).fontSize)})),
      controls:[...root.querySelectorAll('[data-report-preset]')].map(bounds),
      primaryBounds:[hero,primary,root.querySelector('[data-report-visual="categories"]'),root.querySelector('[data-report-visual="comparison"]')].map(bounds),
      legend:[...root.querySelectorAll('[data-category-legend-item]')].map(node=>({other:node.dataset.categoryOther==='true',text:node.innerText,percent:node.querySelector('.tabular-nums').textContent,money:node.querySelector('[data-category-legend-money]')?.textContent.trim()})),
      comparisons:[...root.querySelectorAll('[data-report-comparison]')].map(node=>({label:node.dataset.reportComparison,previous:node.querySelector('[data-comparison-money="previous"]').textContent,current:node.querySelector('[data-comparison-money="current"]').textContent,difference:node.querySelector('[data-comparison-money="difference"]').textContent,change:node.querySelector('[data-comparison-change]').textContent})),
      details:!detail.hidden,tables:detail.querySelectorAll('table').length,
      equations:[...detail.querySelectorAll('[data-report-chart="financial-equation"]')].map(node=>({label:node.getAttribute('aria-label'),values:[...node.querySelectorAll('[data-equation-money]')].map(value=>value.textContent),result:node.querySelector('[data-report-equation-result] [data-equation-money]').textContent,bounds:bounds(node)})),
      listVisible:visible(root.querySelector('[data-report-featured-list]')),tableVisible:visible(root.querySelector('[data-report-featured-table]')),
      movements:[...root.querySelectorAll('[data-report-featured-list] > li')].map(node=>node.innerText),
      moneyBounds:[...root.querySelectorAll('[data-spending-money],[data-comparison-money],[data-equation-money],[data-report-featured-list] [data-money-value]')].filter(visible).map(bounds),
      labels:[...root.querySelectorAll('[aria-label],[aria-description],[title],svg text,svg title')].map(node=>[node.textContent,node.getAttribute('aria-label'),node.getAttribute('aria-description'),node.getAttribute('title')].join(' ')).join(' '),
      animated:root.getAnimations({subtree:true}).length,
    };
  })()`);
}

export async function verifyReportsEditorialComposition(client, waitFor) {
  const original=await financialRows(client);
  const directory=process.env.REPORTS_EDITORIAL_CAPTURE_DIR;
  const originalTheme=await client.evaluate('document.documentElement.className');
  const records=[];
  if(directory)await mkdir(directory,{recursive:true});
  try {
    await hiddenState(client,waitFor,false);
    await financialRows(client,fixture.rows);
    await client.command('Page.reload',{ignoreCache:true});
    await waitFor(client,`document.querySelector('[data-spending-money="total"]')?.textContent===${JSON.stringify(money(fixture.expected.spending))}`,'editorial fixture canónico');
    await client.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await client.evaluate(`(async()=>{for(let i=0;i<20;i++){const close=document.querySelector('[data-achievement-toast-close]');if(!close)break;close.click();await new Promise(resolve=>setTimeout(resolve,50));}})()`,{awaitPromise:true});
    for(const theme of ['light','dark']){
      await client.evaluate(`document.documentElement.classList.remove('light','dark','serious');document.documentElement.classList.add('${theme}');`);
      for(const width of [320,360,390,1280]){
        await client.command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
        await client.evaluate('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))',{awaitPromise:true});
        for(const hidden of [false,true]){
          await hiddenState(client,waitFor,hidden);
          for(const expanded of [false,true]){
            const state=await client.evaluate(`document.querySelector('button[aria-controls="report-detailed-analysis"]').getAttribute('aria-expanded')==='true'`);
            if(state!==expanded)await client.evaluate(`document.querySelector('button[aria-controls="report-detailed-analysis"]').click()`);
            await client.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',{awaitPromise:true});
            const frame=await readFrame(client);
            assert.equal(frame.details,expanded);
            assert.equal(frame.tables,4);
            assert.ok(frame.scrollWidth<=width+1,'editorial página contenida');
            for(const rect of [...frame.primaryBounds,...frame.moneyBounds,...(expanded?frame.equations.map(row=>row.bounds):[])])assert.ok(rect.width>0&&rect.height>0&&rect.left>=-1&&rect.right<=width+1,'editorial contenido y dinero contenidos');
            assert.equal(frame.controls.length,6);
            assert.ok(frame.controls.every(rect=>rect.width>=44&&rect.height>=44&&rect.right<=width+1),'editorial targets 44px');
            assert.notEqual(frame.heroSurface,frame.insightSurface);
            assert.notEqual(frame.insightSurface,frame.categorySurface);
            assert.equal(frame.insights.filter(row=>row.primary).length,1);
            assert.deepEqual(frame.insights.map(({kind,title})=>({kind,title})),fixture.expected.quickRead);
            assert.ok(frame.insights.slice(1).every(row=>frame.insights[0].size>row.size));
            assert.equal(frame.total,hidden?'••••••':money(fixture.expected.spending));
            assert.equal(frame.previous,hidden?'••••••':money(fixture.expected.previousSpending));
            assert.deepEqual(frame.legend.map(row=>row.percent),fixture.expected.categoryPercentages);
            assert.equal(frame.legend.at(-1).other,true);
            for(const [index,row] of frame.comparisons.entries()){
              const expected=fixture.expected.comparison[index];
              assert.equal(row.label,expected.label);
              for(const key of ['previous','current','difference'])assert.equal(row[key],hidden?'••••••':(key==='difference'&&expected[key]>0?'+':'')+money(expected[key]));
              assert.ok(row.change.includes(String(expected.percentChange)+'%'),'editorial porcentaje canónico visible');
            }
            if(expanded){
              assert.deepEqual(frame.equations.map(row=>row.result),hidden?['••••••','••••••']:[money(fixture.expected.cashFlow.netCashFlow),money(fixture.expected.netWorth.netWorth)]);
              assert.deepEqual(frame.equations[0].values,hidden?Array(4).fill('••••••'):[300000,40000,115000,145000].map(money));
              assert.deepEqual(frame.equations[1].values,hidden?Array(6).fill('••••••'):[1325000,200000,300000,30000,100000,1755000].map(money));
              assert.equal(frame.listVisible,width<640);
              assert.equal(frame.tableVisible,width>=640);
              if(width<640){assert.equal(frame.movements.length,5);assert.ok(frame.movements[0].includes('Movimiento de prueba con un concepto extenso'));}
            }
            if(hidden){
              assert.doesNotMatch(frame.text+frame.labels,moneyPattern);
              const ax=await client.command('Accessibility.getFullAXTree');
              assert.doesNotMatch(JSON.stringify(ax.nodes.map(node=>({name:node.name?.value,description:node.description?.value,value:node.value?.value}))),moneyPattern);
            }
            assert.equal(frame.animated,0,'editorial reduced motion');
            records.push({theme,width,hidden,expanded,heroSurface:frame.heroSurface,insightSurface:frame.insightSurface,primary:frame.insights[0].kind});
            if(directory&&!expanded&&(width===320||width===1280)){
              await client.evaluate('window.scrollTo(0,0)');
              const shot=await client.command('Page.captureScreenshot',{format:'png'});
              await writeFile(path.join(directory,`${theme}-${width}-${hidden?'hidden':'visible'}.png`),Buffer.from(shot.data,'base64'));
            }
          }
        }
      }
    }
    await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});
    await client.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab'});
    const button=await client.evaluate(`(() => {const button=document.querySelector('button[aria-controls="report-detailed-analysis"]');button.focus();return {expanded:button.getAttribute('aria-expanded'),shadow:getComputedStyle(button).boxShadow};})()`);
    assert.notEqual(button.shadow,'none','editorial foco visible');
    await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
    await client.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
    await waitFor(client,`document.querySelector('button[aria-controls="report-detailed-analysis"]').getAttribute('aria-expanded')!==${JSON.stringify(button.expanded)}`,'editorial disclosure por teclado');
    // Custom remains contextual and only expands the date fields on demand.
    await client.evaluate(`document.querySelector('[data-report-preset="custom"]').click()`);
    await waitFor(client,`document.querySelectorAll('[data-report-range-controls] input[type="date"]').length===2`,'editorial Custom');
    await client.evaluate(`document.querySelector('[data-report-preset="30d"]').click()`);
    await waitFor(client,`document.querySelectorAll('[data-report-range-controls] input[type="date"]').length===0`,'editorial cierre fechas Custom');
  } finally {
    await hiddenState(client,waitFor,false);
    await financialRows(client,original);
    assert.deepEqual(await financialRows(client),original,'editorial restaura filas originales');
    await client.command('Page.reload',{ignoreCache:true});
    await waitFor(client,`Boolean(document.querySelector('[data-report-hero]'))`,'editorial restaura Reportes');
    await client.evaluate(`document.documentElement.className=${JSON.stringify(originalTheme)};window.scrollTo(0,0);`);
    await client.command('Emulation.setEmulatedMedia',{features:[]});
    await client.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  }
  const result={checks:records.length,widths:[320,360,390,1280],themes:['light','dark'],privacy:'passed',canonicalValues:'passed',categoryOther:'passed',equations:'passed',movements:'passed',keyboard:'passed',reducedMotion:'passed',restoredOriginalDataset:true};
  if(directory)await writeFile(path.join(directory,'verification.json'),JSON.stringify({result,records},null,2)+'\n');
  process.stdout.write('REPORTS_EDITORIAL_COMPOSITION '+JSON.stringify(result)+'\n');
}
