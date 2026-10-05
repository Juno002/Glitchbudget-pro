import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyFinalUiPolishP0 } from './final-ui-polish-p0-baseline.mjs';
import { verifyFinalUiPolishP1 } from './final-ui-polish-p1-verification.mjs';
import { verifyFinalUiPolishP2 } from './final-ui-polish-p2-verification.mjs';
import { verifyFinalUiPolishP3 } from './final-ui-polish-p3-verification.mjs';
import { captureFixture, fixedClockSource } from './final-ui-polish-p0-fixture.mjs';

const APP_PORT = 9011;
const DEBUG_PORT = 9223;
const APP_URL = `http://127.0.0.1:${APP_PORT}/`;
const DEBUG_URL = `http://127.0.0.1:${DEBUG_PORT}`;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function chromeBinary() {
  const candidates = [
    process.env.CHROME_PATH,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes('/')) return candidate;
    const found = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error('Chrome/Chromium no está disponible para el smoke E2E.');
}

async function waitForHttp(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Timeout esperando ${url}: ${String(lastError || 'sin respuesta')}`);
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    if (typeof WebSocket !== 'function') {
      throw new Error('Node debe exponer WebSocket global para el smoke E2E.');
    }
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout conectando CDP.')), 10_000);
      this.ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.ws.addEventListener('error', event => {
        clearTimeout(timer);
        reject(new Error('Error conectando CDP: ' + String(event?.message || event)));
      }, { once: true });
    });

    this.ws.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      const callbacks = this.listeners.get(message.method) || [];
      for (const callback of callbacks) callback(message.params);
    });
  }

  on(method, callback) {
    const callbacks = this.listeners.get(method) || [];
    callbacks.push(callback);
    this.listeners.set(method, callbacks);
  }

  command(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }

  async evaluate(expression, { awaitPromise = false } = {}) {
    const result = await this.command('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description
        || result.exceptionDetails.text
        || 'Error evaluando código en el navegador.',
      );
    }
    return result.result?.value;
  }

  close() {
    this.ws?.close();
  }
}

async function waitFor(client, expression, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await client.evaluate(expression)) return;
    await delay(100);
  }
  throw new Error('Timeout esperando: ' + label);
}

function clickButtonExpression(label) {
  return `(() => {
    const button = [...document.querySelectorAll('button')]
      .find(node => node.textContent?.trim() === ${JSON.stringify(label)} && !node.disabled);
    if (!button) return false;
    button.click();
    return true;
  })()`;
}

function activateTabExpression(label) {
  return `(() => {
    const tab = [...document.querySelectorAll('[role="tab"]')]
      .find(node => node.textContent?.trim() === ${JSON.stringify(label)}
        && node.getAttribute('aria-disabled') !== 'true'
        && node.getClientRects().length > 0);
    if (!(tab instanceof HTMLElement)) return false;
    tab.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    }));
    return true;
  })()`;
}

function setControlExpression(selector, value) {
  return `(() => {
    const control = document.querySelector(${JSON.stringify(selector)});
    if (!control) return false;
    const proto = control instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!setter) return false;
    setter.call(control, ${JSON.stringify(value)});
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`;
}

const selectFirstOptionExpression = selector => `(() => {
  const control = document.querySelector(${JSON.stringify(selector)});
  if (!(control instanceof HTMLSelectElement)) return false;
  const option = [...control.options].find(row => row.value);
  if (!option) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  if (!setter) return false;
  setter.call(control, option.value);
  control.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`;


async function runPostRoadmap4Benchmark(client) {
  const sizes = [5_000, 25_000, 50_000];
  const results = [];

  for (const size of sizes) {
    await client.command('Page.navigate', { url: APP_URL + '?tab=movements&perf=1' });
    await waitFor(client, `document.readyState === 'complete'`, 'carga benchmark ' + size, 30_000);
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-movement-filter-panel="advanced"] input[type="date"]'))`,
      'filtros benchmark ' + size,
      30_000,
    );
    const benchmarkDate = await client.evaluate(`(() => {
      const inputs = [...document.querySelectorAll('[data-movement-filter-panel="advanced"] input[type="date"]')];
      const value = inputs.find(input => input instanceof HTMLInputElement && input.value)?.value;
      return value || new Date().toISOString().slice(0, 10);
    })()`);

    await client.evaluate(`(async () => {
      const open = () => new Promise((resolve, reject) => {
        const request = indexedDB.open('GlitchBudgetDB');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      const db = await open();
      const tx = db.transaction(['expenses','incomes'], 'readwrite');
      const expenses = tx.objectStore('expenses');
      const incomes = tx.objectStore('incomes');
      expenses.clear();
      incomes.clear();
      const size = ${size};
      for (let i = 0; i < size; i += 1) {
        expenses.put({
          id: 'perf-expense-' + i,
          nature: 'Variable',
          concept: 'Benchmark ' + i,
          amount: 100 + (i % 5000),
          date: ${JSON.stringify(benchmarkDate)},
          categoryId: 'perf-category',
          month: ${JSON.stringify(String(benchmarkDate).slice(0, 7))},
          currency: 'DOP',
          fxRate: 1,
          amountBase: 100 + (i % 5000),
          paymentMethod: 'cash',
        });
      }
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
      globalThis.__prismaPerfCounters = {};
      return true;
    })()`, { awaitPromise: true });

    const started = Date.now();
    await client.command('Page.reload', { ignoreCache: true });
    await waitFor(
      client,
      `document.readyState === 'complete'
        && window.location.search.includes('tab=movements')
        && Boolean(document.querySelector('[data-movement-history="list"]'))`,
      'Movimientos benchmark ' + size,
      60_000,
    );

    const metrics = await client.evaluate(`(() => {
      const list = document.querySelector('[data-movement-history="list"]');
      const counters = globalThis.__prismaPerfCounters || {};
      return {
        renderedRows: list ? list.children.length : 0,
        counters,
        heap: performance.memory?.usedJSHeapSize ?? null,
      };
    })()`);
    const elapsedMs = Date.now() - started;
    const expectedRows = Math.min(size, 100);
    const financeCounter = metrics.counters?.financeContext;
    if (metrics.renderedRows !== expectedRows) {
      throw new Error(`Benchmark ${size}: se esperaban ${expectedRows} filas DOM y se obtuvieron ${metrics.renderedRows}.`);
    }
    if (!financeCounter || financeCounter.calls !== 1 || !Number.isFinite(financeCounter.totalMs)) {
      throw new Error(`Benchmark ${size}: contador financeContext inválido.`);
    }
    if (metrics.counters?.accountOverview || metrics.counters?.investmentManager) {
      throw new Error(`Benchmark ${size}: reaparecieron lecturas duplicadas.`);
    }
    const row = { size, ready: true, elapsedMs, ...metrics };
    results.push(row);
    process.stdout.write('POST_ROADMAP_4_BENCHMARK ' + JSON.stringify(row) + '\\n');
  }

  const originalThemeClass = await client.evaluate('document.documentElement.className');
  await client.evaluate(`(() => {
    const html = document.documentElement;
    html.classList.remove('light', 'dark', 'serious');
    html.classList.add('dark');
    return true;
  })()`);
  await waitFor(
    client,
    `(() => {
      const ambient = document.querySelector('.ambient-background');
      if (!(ambient instanceof HTMLElement)) return false;
      const style = getComputedStyle(ambient);
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number.parseFloat(style.opacity || '0') > 0;
    })()`,
    'fondo ambiental visible en Neón oscuro',
  );
  await client.command('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.command('Emulation.setCPUThrottlingRate', { rate: 4 });
  const sampleFrames = async hidden => client.evaluate(
    '(async () => {' +
      'const ambient=document.querySelector(".ambient-background");' +
      'if(!(ambient instanceof HTMLElement)) return null;' +
      'ambient.style.display=' + JSON.stringify(hidden ? 'none' : '') + ';' +
      'await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));' +
      'return await new Promise(resolve=>{' +
        'const frames=[];' +
        'const tick=time=>{' +
          'frames.push(time);' +
          'if(frames.length>=91){' +
            'const deltas=frames.slice(1).map((value,index)=>value-frames[index]);' +
            'const total=deltas.reduce((sum,value)=>sum+value,0);' +
            'resolve({averageFrameMs:total/deltas.length,maxFrameMs:Math.max(...deltas),slowFrames:deltas.filter(value=>value>20).length});' +
            'return;' +
          '}' +
          'requestAnimationFrame(tick);' +
        '};' +
        'requestAnimationFrame(tick);' +
      '});' +
    '})()',
    { awaitPromise: true },
  );
  const ambientVisible = await sampleFrames(false);
  const ambientHidden = await sampleFrames(true);
  await client.evaluate(`(() => {
    const ambient = document.querySelector('.ambient-background');
    if (ambient instanceof HTMLElement) ambient.style.display = '';
    document.documentElement.className = ${JSON.stringify(originalThemeClass)};
    return true;
  })()`);
  await client.command('Emulation.setCPUThrottlingRate', { rate: 1 });
  await client.command('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  process.stdout.write('POST_ROADMAP_4_AMBIENT ' + JSON.stringify({ visible:ambientVisible, hidden:ambientHidden }) + '\\n');

  return results;
}

async function createMovement(client, type, fixture) {
  if (!await client.evaluate(`(() => {
    const button = document.querySelector('[aria-label="Nuevo movimiento"]');
    if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
    button.click();
    return true;
  })()`)) {
    throw new Error('No se encontró la acción global Nuevo movimiento.');
  }
  await waitFor(client, `Boolean(document.querySelector('[aria-label="Monto"]'))`, 'Quick Add');
  await waitFor(client, `Boolean(document.querySelector('[data-global-composer="prisma"]'))`, 'compositor Prisma');

  if (!await client.evaluate(clickButtonExpression(type))) {
    throw new Error('No se pudo seleccionar ' + type + '.');
  }
  await client.evaluate(setControlExpression('[aria-label="Monto"]', String(fixture.amount / 100)));
  await waitFor(
    client,
    `Boolean(document.querySelector('[aria-label="Categoría"] option:not([value=""])'))`,
    'categorías de ' + type,
  );
  await client.evaluate(setControlExpression('[aria-label="Categoría"]', fixture.categoryId));
  await waitFor(client, `document.querySelector('[aria-label="Categoría"]').value === ${JSON.stringify(fixture.categoryId)}`, 'categoría fija de ' + type);

  await waitFor(
    client,
    `[...document.querySelectorAll('button')].some(node => node.textContent?.trim() === 'Guardar' && !node.disabled)`,
    'Guardar habilitado',
  );
  await client.evaluate(clickButtonExpression('Guardar'));
  await waitFor(
    client,
    `document.body.innerText.includes(${JSON.stringify(type + ' registrado')})`,
    type + ' registrado',
  );
  await waitFor(
    client,
    `!document.querySelector('[aria-label="Monto"]')`,
    'cierre de Quick Add',
    5_000,
  );
}

async function main() {
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'glitchbudget-e2e-'));
  const server = spawn(process.execPath, ['scripts/serve-static.mjs', '--port', String(APP_PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let chrome;
  let client;

  const stop = async child => {
    if (!child || child.exitCode !== null) return;
    child.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      delay(2_000),
    ]);
    if (child.exitCode === null) child.kill('SIGKILL');
  };

  const cleanup = async () => {
    client?.close();
    await stop(chrome);
    await stop(server);
    await rm(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  };

  const failOnEarlyExit = (child, name) => {
    child.once('exit', code => {
      if (code && code !== 0) process.stderr.write(`${name} terminó con código ${code}.\n`);
    });
  };
  failOnEarlyExit(server, 'static server');

  const launchChrome = async () => {
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      chrome = spawn(chromeBinary(), [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-first-run',
        '--no-default-browser-check',
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${path.join(userDataDir, 'chrome-' + attempt)}`,
        'about:blank',
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      failOnEarlyExit(chrome, 'chrome');
      try {
        await waitForHttp(DEBUG_URL + '/json/version', 30_000);
        return;
      } catch (error) {
        lastError = error;
        await stop(chrome);
        chrome = undefined;
        if (attempt < 2) await delay(500);
      }
    }
    throw lastError;
  };

  try {
    await waitForHttp(APP_URL);
    await launchChrome();
    const targetResponse = await fetch(
      DEBUG_URL + '/json/new?' + encodeURIComponent('about:blank'),
      { method: 'PUT' },
    );
    if (!targetResponse.ok) throw new Error('No se pudo crear el target CDP.');
    const target = await targetResponse.json();

    client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    await client.command('Page.enable');
    await client.command('Runtime.enable');
    await client.command('Network.enable');

    const requests = [];
    client.on('Network.requestWillBeSent', params => requests.push(params.request.url));

    await client.command('Emulation.setTimezoneOverride', { timezoneId: captureFixture.timezone });
    await client.command('Page.addScriptToEvaluateOnNewDocument', { source: fixedClockSource() });
    await client.command('Page.navigate', { url: APP_URL });
    await waitFor(client, `document.readyState === 'complete' && document.body.innerText.includes('Resumen')`, 'app inicial');

    // Phase 20.9.3: both premium themes must resolve the shared depth system.
    await waitFor(
      client,
      `(() => {
        const html = document.documentElement;
        const original = html.className;
        const snapshot = theme => {
          html.classList.remove('light', 'dark', 'serious');
          html.classList.add(theme);
          const style = getComputedStyle(html);
          return {
            backdrop: style.getPropertyValue('--backdrop').trim(),
            cardShadow: style.getPropertyValue('--shadow-card').trim(),
            modalShadow: style.getPropertyValue('--shadow-modal').trim(),
            popoverShadow: style.getPropertyValue('--shadow-popover').trim(),
            navBlur: style.getPropertyValue('--blur-navigation').trim(),
          };
        };
        const light = snapshot('light');
        const dark = snapshot('dark');
        html.className = original;
        return light.backdrop && dark.backdrop
          && light.cardShadow && dark.cardShadow
          && light.modalShadow && dark.modalShadow
          && light.popoverShadow && dark.popoverShadow
          && light.navBlur === '18px'
          && dark.navBlur === '18px'
          && light.backdrop !== dark.backdrop
          && light.modalShadow !== dark.modalShadow;
      })()`,
      'profundidad Prisma y Neón',
    );

    // Phase 20.2: verify the shared shell at desktop and mobile widths in a real browser.
    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitFor(
      client,
      `(() => {
        const sidebar = document.querySelector('[data-shell-sidebar="desktop"]');
        const mobileNav = document.querySelector('[data-shell-nav="mobile"]');
        return sidebar && mobileNav
          && getComputedStyle(sidebar).display !== 'none'
          && getComputedStyle(mobileNav).display === 'none'
          && sidebar.innerText.includes('Prisma')
          && !sidebar.innerText.includes('GlitchBudget Pro');
      })()`,
      'shell desktop',
    );
    await waitFor(
      client,
      `(() => {
        const home = document.querySelector('[data-home-prisma="true"]');
        const modules = document.querySelector('[data-home-layout="module-grid"]');
        const metrics = document.querySelector('[data-home-layout="position-metrics"]');
        const status = home?.querySelector('[data-home-status-pill]');
        const heading = home?.querySelector('h1');
        if (!home || !modules || !metrics || !(status instanceof HTMLElement) || !(heading instanceof HTMLElement)) return false;
        const moduleColumns = getComputedStyle(modules).gridTemplateColumns.split(' ').filter(Boolean).length;
        const metricColumns = getComputedStyle(metrics).gridTemplateColumns.split(' ').filter(Boolean).length;
        return moduleColumns === 2
          && metricColumns === 4
          && heading.textContent?.trim() === 'Tu panorama financiero.'
          && status.innerText.trim().length > 0
          && home.textContent?.includes('período');
      })()`,
      'Home Prisma desktop',
    );

    if (!await client.evaluate(`(() => {
      const trigger = document.querySelector('[aria-label="Qué significa Disponible líquido"]');
      if (!(trigger instanceof HTMLButtonElement)) return false;
      trigger.click();
      return true;
    })()`)) {
      throw new Error('No se pudo abrir la ayuda contextual del KPI en desktop.');
    }
    await waitFor(
      client,
      `(() => {
        const content = document.querySelector('[data-context-help="Disponible líquido"]');
        const close = content?.querySelector('[data-popover-close="true"]');
        if (!(content instanceof HTMLElement) || !(close instanceof HTMLButtonElement)) return false;
        const rect = content.getBoundingClientRect();
        return content.innerText.includes('Efectivo + bancos registrados en el ledger.')
          && content.innerText.includes('Disponible líquido')
          && rect.left >= 0
          && rect.right <= window.innerWidth
          && close.getAttribute('aria-label') === 'Cerrar explicación de Disponible líquido';
      })()`,
      'ayuda contextual KPI desktop',
    );
    await client.evaluate(`document.querySelector('[data-context-help="Disponible líquido"] [data-popover-close="true"]')?.click()`);
    await waitFor(client, `!document.querySelector('[data-context-help="Disponible líquido"]')`, 'cierre ayuda KPI desktop');

    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitFor(
      client,
      `(() => {
        const sidebar = document.querySelector('[data-shell-sidebar="desktop"]');
        const mobileNav = document.querySelector('[data-shell-nav="mobile"]');
        const mobileFab = document.querySelector('[data-shell-fab="mobile"]');
        const mobileBrand = document.querySelector('a[aria-label="Prisma"]');
        return sidebar && mobileNav && mobileFab && mobileBrand
          && getComputedStyle(sidebar).display === 'none'
          && getComputedStyle(mobileNav).display !== 'none'
          && getComputedStyle(mobileFab).display !== 'none'
          && mobileBrand.textContent?.includes('Prisma');
      })()`,
      'shell móvil',
    );
    await waitFor(
      client,
      `(() => {
        const home = document.querySelector('[data-home-prisma="true"]');
        const modules = document.querySelector('[data-home-layout="module-grid"]');
        const metrics = document.querySelector('[data-home-layout="position-metrics"]');
        const status = home?.querySelector('[data-home-status-pill]');
        if (!home || !modules || !metrics || !(status instanceof HTMLElement)) return false;
        const moduleColumns = getComputedStyle(modules).gridTemplateColumns.split(' ').filter(Boolean).length;
        const metricColumns = getComputedStyle(metrics).gridTemplateColumns.split(' ').filter(Boolean).length;
        return moduleColumns === 1
          && metricColumns === 1
          && status.getBoundingClientRect().right <= window.innerWidth + 1;
      })()`,
      'Home Prisma móvil',
    );

    // Final UI Polish P6: editorial header and unified status must remain contained at the 320px gate.
    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitFor(
      client,
      `(() => {
        const home = document.querySelector('[data-home-prisma="true"]');
        const heading = home?.querySelector('h1');
        const status = home?.querySelector('[data-home-status-pill]');
        if (!(home instanceof HTMLElement) || !(heading instanceof HTMLElement) || !(status instanceof HTMLElement)) return false;
        const statusRect = status.getBoundingClientRect();
        return heading.textContent?.trim() === 'Tu panorama financiero.'
          && status.innerText.trim().length > 0
          && statusRect.left >= -1
          && statusRect.right <= window.innerWidth + 1
          && document.documentElement.scrollWidth <= window.innerWidth + 1;
      })()`,
      'Final UI Polish P6 Home 320',
    );
    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitFor(
      client,
      `getComputedStyle(document.querySelector('[data-shell-nav="mobile"]')).display !== 'none'`,
      'retorno Home móvil 390',
    );

    // Phase 20.9.8: the global composer must remain contained on mobile and request a decimal keyboard.
    if (!await client.evaluate(`(() => {
      const button = document.querySelector('[data-shell-fab="mobile"]');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
      button.click();
      return true;
    })()`)) {
      throw new Error('No se pudo abrir el compositor desde el FAB móvil.');
    }
    await waitFor(
      client,
      `(() => {
        const dialog = document.querySelector('[data-global-composer="prisma"]');
        const amount = document.querySelector('[aria-label="Monto"]');
        if (!(dialog instanceof HTMLElement) || !(amount instanceof HTMLInputElement)) return false;
        const rect = dialog.getBoundingClientRect();
        const style = getComputedStyle(dialog);
        return rect.top >= -1
          && rect.bottom <= window.innerHeight + 1
          && rect.left >= -1
          && rect.right <= window.innerWidth + 1
          && style.overflowY === 'auto'
          && amount.inputMode === 'decimal';
      })()`,
      'compositor móvil contenido + teclado decimal',
    );
    await client.evaluate(`document.querySelector('[data-global-composer="prisma"] [data-dialog-close="true"]')?.click()`);
    await waitFor(client, `!document.querySelector('[data-global-composer="prisma"]')`, 'cierre compositor móvil');

    if (!await client.evaluate(`(() => {
      const trigger = document.querySelector('[aria-label="Qué significa Disponible líquido"]');
      if (!(trigger instanceof HTMLButtonElement)) return false;
      trigger.click();
      return true;
    })()`)) {
      throw new Error('No se pudo abrir la ayuda contextual del KPI en móvil.');
    }
    await waitFor(
      client,
      `(() => {
        const content = document.querySelector('[data-context-help="Disponible líquido"]');
        const close = content?.querySelector('[data-popover-close="true"]');
        if (!(content instanceof HTMLElement) || !(close instanceof HTMLButtonElement)) return false;
        const rect = content.getBoundingClientRect();
        return rect.left >= 0
          && rect.right <= window.innerWidth
          && rect.width <= window.innerWidth - 24;
      })()`,
      'ayuda contextual KPI móvil',
    );
    await client.evaluate(`document.querySelector('[data-context-help="Disponible líquido"] [data-popover-close="true"]')?.click()`);
    await waitFor(client, `!document.querySelector('[data-context-help="Disponible líquido"]')`, 'cierre ayuda KPI móvil');

    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitFor(
      client,
      `getComputedStyle(document.querySelector('[data-shell-sidebar="desktop"]')).display !== 'none'`,
      'retorno a shell desktop',
    );

    // Fresh install: create actual data through the public UI, not by touching Dexie.
    await createMovement(client, 'Ingreso', captureFixture.dataset.incomes[0]);

    // Phase 20.9.5: the first-income achievement must remain readable and above mobile nav.
    await waitFor(
      client,
      `(() => {
        const toast = document.querySelector('[data-achievement-toast="true"]');
        const surface = document.querySelector('[data-achievement-toast-surface="true"]');
        return toast && surface
          && surface.textContent?.includes('Logro desbloqueado')
          && surface.textContent?.includes('Primer Ingreso')
          && surface.textContent?.includes('+10 XP')
          && Boolean(surface.querySelector('[data-achievement-toast-action="dismiss"]'))
          && Boolean(surface.querySelector('[data-achievement-toast-close="true"]'));
      })()`,
      'achievement toast',
    );
    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 700,
      height: 844,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitFor(
      client,
      `(() => {
        const toast = document.querySelector('[data-achievement-toast="true"]');
        const surface = document.querySelector('[data-achievement-toast-surface="true"]');
        const mobileNav = document.querySelector('[data-shell-nav="mobile"]');
        if (!(toast instanceof HTMLElement) || !(surface instanceof HTMLElement) || !(mobileNav instanceof HTMLElement)) return false;
        const toastRect = toast.getBoundingClientRect();
        const navRect = mobileNav.getBoundingClientRect();
        const style = getComputedStyle(surface);
        return getComputedStyle(mobileNav).display !== 'none'
          && toastRect.bottom <= navRect.top
          && toastRect.left >= 0
          && toastRect.right <= window.innerWidth
          && style.backgroundColor !== 'rgba(0, 0, 0, 0)'
          && style.visibility !== 'hidden';
      })()`,
      'achievement toast tablet-safe',
    );
    await client.evaluate(`document.querySelector('[data-achievement-toast-action="dismiss"]')?.click()`);
    await waitFor(client, `!document.querySelector('[data-achievement-toast="true"]')`, 'cierre achievement toast');
    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitFor(
      client,
      `getComputedStyle(document.querySelector('[data-shell-sidebar="desktop"]')).display !== 'none'`,
      'retorno desktop después de achievement toast',
    );

    await createMovement(client, 'Gasto', captureFixture.dataset.expenses[0]);

    if (!await client.evaluate(clickButtonExpression('Movimientos'))) {
      throw new Error('No se pudo abrir Movimientos.');
    }
    await waitFor(client, `window.location.search === '?tab=movements'`, 'URL de Movimientos');
    await waitFor(
      client,
      `document.body.innerText.includes('Ingreso') && document.body.innerText.includes('Gasto')`,
      'movimientos creados visibles',
    );
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-movements-prisma="true"]'))
        && Boolean(document.querySelector('[data-movement-filter-bar="primary"]'))
        && Boolean(document.querySelector('[data-movement-filter-panel="advanced"]'))
        && Boolean(document.querySelector('[data-movement-history="list"]'))
        && Boolean(document.querySelector('[data-accounts-prisma="true"]'))
        && Boolean(document.querySelector('[data-investments-prisma="true"]'))`,
      'Movimientos + cuentas + inversiones Prisma',
    );

    if (!await client.evaluate(`(() => {
      const button = document.querySelector('button[aria-label="Ver logros"]');
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudo abrir Logros.');
    await waitFor(client, `Boolean(document.querySelector('[data-achievements-prisma="true"]'))`, 'Logros Prisma');

    // Phase 20.9.8: the formerly invisible BadgeCard focus must be visibly rendered for keyboard users.
    await client.command('Input.dispatchKeyEvent', { type:'keyDown', key:'Tab', code:'Tab' });
    await client.command('Input.dispatchKeyEvent', { type:'keyUp', key:'Tab', code:'Tab' });
    if (!await client.evaluate(`(() => {
      const badge = document.querySelector('[data-achievement-badge]');
      if (!(badge instanceof HTMLButtonElement)) return false;
      badge.dataset.focusBaselineShadow = getComputedStyle(badge).boxShadow;
      badge.focus();
      return document.activeElement === badge;
    })()`)) throw new Error('No se pudo enfocar una medalla de Logros.');
    await waitFor(
      client,
      `(() => {
        const badge = document.querySelector('[data-achievement-badge]');
        if (!(badge instanceof HTMLButtonElement) || document.activeElement !== badge) return false;
        const style = getComputedStyle(badge);
        const ringShadow = style.getPropertyValue('--tw-ring-shadow').trim();
        const baselineShadow = badge.dataset.focusBaselineShadow || '';
        const glow = style.getPropertyValue('--achievement-glow').trim();
        return badge.matches(':focus-visible')
          && ringShadow.includes('2px')
          && glow.length > 0
          && style.boxShadow !== baselineShadow;
      })()`,
      'focus visible de BadgeCard',
    );

    await client.command('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyUp', key:'Escape', code:'Escape' });

    await client.command('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:5 });
    const settingsMobileWidths = [320, 360, 390];

    for (const width of settingsMobileWidths) {
      await client.command('Emulation.setDeviceMetricsOverride', {
        width,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      });

      if (width === settingsMobileWidths[0]) {
        if (!await client.evaluate(`(() => {
          const button = document.querySelector('button[aria-label="Ajustes"]');
          if (!(button instanceof HTMLButtonElement)) return false;
          button.click();
          return true;
        })()`)) throw new Error('No se pudo abrir Ajustes.');
        await waitFor(client, `Boolean(document.querySelector('[data-settings-prisma="true"]'))`, 'Ajustes Prisma');
      }

      await waitFor(
        client,
        `(() => {
          const dialog = document.querySelector('[data-settings-prisma="true"]');
          const mobileNav = document.querySelector('[data-settings-mobile-navigation="prisma"]');
          const desktopNav = document.querySelector('[data-settings-navigation="prisma"]');
          const baseCurrency = document.querySelector('input[aria-label="Moneda base"]');
          if (!(dialog instanceof HTMLElement)
            || !(mobileNav instanceof HTMLSelectElement)
            || !(desktopNav instanceof HTMLElement)
            || !(baseCurrency instanceof HTMLInputElement)) return false;
          const rect = dialog.getBoundingClientRect();
          const style = getComputedStyle(dialog);
          return rect.top >= -1
            && rect.bottom <= window.innerHeight + 1
            && rect.left >= -1
            && rect.right <= window.innerWidth + 1
            && style.overflowY === 'auto'
            && style.overflowX === 'hidden'
            && dialog.scrollWidth <= dialog.clientWidth + 1
            && mobileNav.scrollWidth <= mobileNav.clientWidth + 1
            && getComputedStyle(mobileNav).display !== 'none'
            && getComputedStyle(desktopNav).display === 'none'
            && baseCurrency.getBoundingClientRect().height >= 43
            && matchMedia('(pointer: coarse)').matches
            && document.documentElement.scrollWidth <= window.innerWidth + 1;
        })()`,
        'Ajustes móvil contenido a ' + width + 'px',
      );
    }

    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    if (!await client.evaluate(setControlExpression('[data-settings-mobile-navigation="prisma"]', 'categories'))) {
      throw new Error('No se pudo abrir Categorías desde navegación móvil.');
    }
    await waitFor(client, `document.querySelectorAll('[data-category-manager="prisma"]').length >= 2`, 'Categorías Prisma');
    await waitFor(
      client,
      `(() => {
        const dialog = document.querySelector('[data-settings-prisma="true"]');
        const managers = [...document.querySelectorAll('[data-category-manager="prisma"]')];
        return dialog instanceof HTMLElement
          && dialog.scrollWidth <= dialog.clientWidth + 1
          && managers.length === 2
          && managers.every(manager => {
            if (!(manager instanceof HTMLElement) || manager.scrollWidth > manager.clientWidth + 1) return false;
            const buttons = [...manager.querySelectorAll('button')];
            const add = buttons.find(button => button.textContent?.trim() === 'Agregar');
            const reset = buttons.find(button => button.textContent?.trim() === 'Restablecer');
            return add instanceof HTMLButtonElement
              && reset instanceof HTMLButtonElement
              && Boolean(add.querySelector('svg'))
              && Boolean(reset.querySelector('svg'))
              && !manager.textContent?.includes('➕')
              && !manager.textContent?.includes('🔄');
          });
      })()`,
      'Categorías Prisma sin overflow a 320px',
    );

    if (!await client.evaluate(`(() => {
      const button = document.querySelector('button[aria-label="Elegir icono de categoría"]');
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudo abrir el selector de iconos.');
    await waitFor(
      client,
      `(() => {
        const buttons = [...document.querySelectorAll('button[aria-label^="Usar icono "]')]
          .filter(button => button.getClientRects().length > 0)
          .slice(0, 5);
        return buttons.length === 5 && buttons.every(button => {
          const rect = button.getBoundingClientRect();
          return button.getAttribute('aria-pressed') !== null
            && rect.width >= 43
            && rect.height >= 43
            && rect.left >= -1
            && rect.right <= window.innerWidth + 1;
        });
      })()`,
      'selector de iconos táctil y contenido',
    );
    await client.command('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyUp', key:'Escape', code:'Escape' });

    // Phase 20.9.9: switch through both premium themes using the real Settings controls.
    if (!await client.evaluate(setControlExpression('[data-settings-mobile-navigation="prisma"]', 'appearance'))) {
      throw new Error('No se pudo abrir Apariencia desde navegación móvil.');
    }
    if (!await client.evaluate(`(() => {
      const radio = document.querySelector('#theme-dark');
      if (!(radio instanceof HTMLElement)) return false;
      radio.click();
      return true;
    })()`)) throw new Error('No se pudo activar Neón oscuro.');
    await waitFor(
      client,
      `document.documentElement.classList.contains('dark')
        && !document.documentElement.classList.contains('light')
        && document.documentElement.scrollWidth <= window.innerWidth + 1`,
      'tema Neón oscuro real',
    );
    if (!await client.evaluate(`(() => {
      const radio = document.querySelector('#theme-light');
      if (!(radio instanceof HTMLElement)) return false;
      radio.click();
      return true;
    })()`)) throw new Error('No se pudo restaurar Prisma claro.');
    await waitFor(
      client,
      `document.documentElement.classList.contains('light')
        && !document.documentElement.classList.contains('dark')
        && document.documentElement.scrollWidth <= window.innerWidth + 1`,
      'tema Prisma claro real',
    );

    if (!await client.evaluate(setControlExpression('[data-settings-mobile-navigation="prisma"]', 'privacy'))) {
      throw new Error('No se pudo abrir Privacidad y seguridad desde navegación móvil.');
    }
    await waitFor(
      client,
      `(() => {
        const lock = document.querySelector('[data-app-lock-settings="prisma"]');
        const autoLock = document.querySelector('[data-auto-lock-settings="prisma"]');
        return lock instanceof HTMLElement
          && autoLock instanceof HTMLElement
          && lock.scrollWidth <= lock.clientWidth + 1
          && autoLock.scrollWidth <= autoLock.clientWidth + 1;
      })()`,
      'Seguridad Prisma sin overflow',
    );

    if (!await client.evaluate(setControlExpression('[data-settings-mobile-navigation="prisma"]', 'data'))) {
      throw new Error('No se pudo abrir Datos y copias desde navegación móvil.');
    }
    await waitFor(client, `Boolean(document.querySelector('[data-persistent-storage-settings="prisma"]'))`, 'Datos Prisma');

    const mobileOverflowBackupName = 'glitchbudget-mobile-overflow-' + 'x'.repeat(72) + '.json';
    await client.evaluate(`(async () => {
      if (!navigator.storage || !('getDirectory' in navigator.storage)) return true;
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle(${JSON.stringify(mobileOverflowBackupName)}, { create:true });
      const writable = await handle.createWritable();
      await writable.write('{}');
      await writable.close();
      return true;
    })()`, { awaitPromise:true });

    if (!await client.evaluate(clickButtonExpression('Copias de seguridad'))) throw new Error('No se pudo abrir Copias de Seguridad.');
    await waitFor(client, `Boolean(document.querySelector('[data-backups-prisma="true"]'))`, 'Backups Prisma');
    await waitFor(
      client,
      `(() => {
        const dialog = document.querySelector('[data-backups-prisma="true"]');
        if (!(dialog instanceof HTMLElement)) return false;
        return [...dialog.querySelectorAll('li')].some(node => node.textContent?.includes(${JSON.stringify(mobileOverflowBackupName)}));
      })()`,
      'backup largo renderizado',
    );
    const mobileBackupLayout = await client.evaluate(`(() => {
      const dialog = document.querySelector('[data-backups-prisma="true"]');
      const row = dialog instanceof HTMLElement
        ? [...dialog.querySelectorAll('li')].find(node => node.textContent?.includes(${JSON.stringify(mobileOverflowBackupName)}))
        : null;
      const details = row instanceof HTMLElement ? row.querySelector('div.min-w-0') : null;
      const actions = row instanceof HTMLElement ? row.querySelector('div.shrink-0') : null;
      const rect = row instanceof HTMLElement ? row.getBoundingClientRect() : null;
      return {
        dialogClientWidth: dialog instanceof HTMLElement ? dialog.clientWidth : null,
        dialogScrollWidth: dialog instanceof HTMLElement ? dialog.scrollWidth : null,
        rowClientWidth: row instanceof HTMLElement ? row.clientWidth : null,
        rowScrollWidth: row instanceof HTMLElement ? row.scrollWidth : null,
        rowLeft: rect?.left ?? null,
        rowRight: rect?.right ?? null,
        viewportWidth: window.innerWidth,
        detailsClientWidth: details instanceof HTMLElement ? details.clientWidth : null,
        detailsScrollWidth: details instanceof HTMLElement ? details.scrollWidth : null,
        actionsClientWidth: actions instanceof HTMLElement ? actions.clientWidth : null,
        actionsScrollWidth: actions instanceof HTMLElement ? actions.scrollWidth : null,
      };
    })()`);

    if (!(mobileBackupLayout
      && mobileBackupLayout.dialogScrollWidth <= mobileBackupLayout.dialogClientWidth + 1
      && mobileBackupLayout.rowScrollWidth <= mobileBackupLayout.rowClientWidth + 1
      && mobileBackupLayout.rowRight <= mobileBackupLayout.viewportWidth + 1)) {
      throw new Error('Backup móvil fuera de contención: ' + JSON.stringify(mobileBackupLayout));
    }

    if (!await client.evaluate(`(() => {
      const button = [...document.querySelectorAll('button')]
        .find(node => node.getAttribute('aria-label') === ${JSON.stringify('Eliminar '+mobileOverflowBackupName)});
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudo abrir confirmación de borrado de copia larga.');
    await waitFor(
      client,
      `(() => {
        const alert = document.querySelector('[role="alertdialog"]');
        return alert instanceof HTMLElement
          && alert.scrollWidth <= alert.clientWidth + 1
          && alert.getBoundingClientRect().left >= -1
          && alert.getBoundingClientRect().right <= window.innerWidth + 1;
      })()`,
      'confirmación de backup largo contenida',
    );
    await client.command('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyUp', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyUp', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyUp', key:'Escape', code:'Escape' });

    await client.evaluate(`(async () => {
      if (!navigator.storage || !('getDirectory' in navigator.storage)) return true;
      const root = await navigator.storage.getDirectory();
      try { await root.removeEntry(${JSON.stringify(mobileOverflowBackupName)}); } catch {}
      return true;
    })()`, { awaitPromise:true });

    await client.command('Emulation.setTouchEmulationEnabled', { enabled:false });
    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitFor(
      client,
      `getComputedStyle(document.querySelector('[data-shell-sidebar="desktop"]')).display !== 'none'`,
      'retorno desktop después de Ajustes',
    );

    if (!await client.evaluate(clickButtonExpression('Plan'))) {
      throw new Error('No se pudo abrir Plan.');
    }
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-plan-prisma="true"]'))
        && Boolean(document.querySelector('[data-plan-navigation="prisma"]'))
        && window.location.search === '?tab=planning&plan=budgets'`,
      'Plan Prisma + URL',
    );

    if (!await client.evaluate(activateTabExpression('Presupuestos'))) {
      throw new Error('No se pudo abrir Presupuestos.');
    }
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-plan-budgets="prisma"]'))
        && Boolean(document.querySelector('[data-budget-period-controls="prisma"]'))`,
      'Presupuestos Prisma',
    );

    if (!await client.evaluate(activateTabExpression('Metas'))) {
      throw new Error('No se pudo abrir Metas.');
    }
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-plan-goals="prisma"]'))
        && window.location.search === '?tab=planning&plan=goals'`,
      'Metas Prisma + URL',
    );

    if (!await client.evaluate(activateTabExpression('Planificados'))) {
      throw new Error('No se pudo abrir Planificados.');
    }
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-plan-planned="prisma"]'))
        && Boolean(document.querySelector('[data-plan-planned-manager="prisma"]'))
        && window.location.search === '?tab=planning&plan=subscriptions'`,
      'Planificados Prisma + URL',
    );

    if (!await client.evaluate(clickButtonExpression('Reportes'))) {
      throw new Error('No se pudo abrir Reportes.');
    }
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-reports-prisma="true"]'))
        && Boolean(document.querySelector('[data-report-range-controls="prisma"]'))
        && Boolean(document.querySelector('[data-report-section="spending"]'))
        && Boolean(document.querySelector('[data-report-section="cash-flow"]'))
        && Boolean(document.querySelector('[data-report-section="net-worth"]'))
        && Boolean(document.querySelector('[data-report-section="comparison"]'))
        && document.querySelectorAll('[data-report-chart]').length >= 5
        && window.location.search === '?tab=reports'`,
      'Reportes Prisma y gráficos',
    );

    await client.evaluate(`history.back(); true`);
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-plan-planned="prisma"]'))
        && window.location.search === '?tab=planning&plan=subscriptions'`,
      'atrás vuelve a Planificados',
    );
    await client.evaluate(`history.forward(); true`);
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-reports-prisma="true"]'))
        && window.location.search === '?tab=reports'`,
      'adelante vuelve a Reportes',
    );

    await verifyFinalUiPolishP0(client, waitFor);
    await verifyFinalUiPolishP1(client, waitFor);
    await verifyFinalUiPolishP2(client, waitFor);
    await verifyFinalUiPolishP3(client, waitFor);

    // Final UI Polish P7: exercise every canonical Reports preset in sequence.
    for (const preset of ['7d','30d','3m','6m','1y']) {
      if (!await client.evaluate(`(() => {
        const button = document.querySelector('[data-report-preset="${preset}"]');
        if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
        button.click();
        return true;
      })()`)) throw new Error('No se pudo activar preset ' + preset + '.');
      await waitFor(
        client,
        `document.querySelector('[data-report-preset="${preset}"]')?.getAttribute('aria-pressed') === 'true'`,
        'Final UI Polish P7 preset ' + preset,
      );
    }

    if (!await client.evaluate(`(() => {
      const button = document.querySelector('[data-report-preset="custom"]');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudo activar Custom.');
    await waitFor(
      client,
      `document.querySelector('[data-report-preset="custom"]')?.getAttribute('aria-pressed') === 'true'
        && document.querySelectorAll('[data-report-range-controls="prisma"] input[type="date"]').length === 2`,
      'Final UI Polish P7 rango Custom',
    );

    // Return to the stable 30d fixture before validating composition and privacy.
    if (!await client.evaluate(`(() => {
      const button = document.querySelector('[data-report-preset="30d"]');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudo restaurar 30D.');
    await waitFor(
      client,
      `document.querySelector('[data-report-preset="30d"]')?.getAttribute('aria-pressed') === 'true'`,
      'Final UI Polish P7 retorno a 30d',
    );

    await waitFor(
      client,
      `(() => {
        const visual = document.querySelector('[data-report-visual="categories"]');
        const donut = visual?.querySelector('[data-report-chart="category-donut"]');
        const legend = visual?.querySelector('[data-category-legend]');
        const button = document.querySelector('button[aria-controls="report-detailed-analysis"]');
        const detail = document.querySelector('#report-detailed-analysis');
        return visual instanceof HTMLElement
          && donut instanceof HTMLElement
          && legend instanceof HTMLOListElement
          && legend.querySelectorAll('[data-category-legend-item]').length > 0
          && !visual.querySelector('table')
          && button instanceof HTMLButtonElement
          && button.getAttribute('aria-expanded') === 'false'
          && detail instanceof HTMLElement
          && detail.hidden;
      })()`,
      'Reportes lectura progresiva compacta',
    );

    if (!await client.evaluate(`(() => {
      const button = document.querySelector('button[aria-controls="report-detailed-analysis"]');
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudo abrir el análisis detallado.');

    await waitFor(
      client,
      `(() => {
        const button = document.querySelector('button[aria-controls="report-detailed-analysis"]');
        const detail = document.querySelector('#report-detailed-analysis');
        const requiredSections = [
          'comparison-detail',
          'spending-detail',
          'cash-flow',
          'net-worth',
          'detail',
          'budget-followup',
        ];
        return button instanceof HTMLButtonElement
          && button.getAttribute('aria-expanded') === 'true'
          && detail instanceof HTMLElement
          && !detail.hidden
          && detail.querySelectorAll('table').length === 4
          && requiredSections.every(section => detail.querySelector('[data-report-section="' + section + '"]'));
      })()`,
      'Reportes análisis detallado completo',
    );

    if (!await client.evaluate(`(() => {
      const button = document.querySelector('button[aria-label="Ocultar importes"]');
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudieron ocultar importes en P7.');
    await waitFor(
      client,
      `document.documentElement.dataset.balancesHidden === 'true'
        && !document.querySelector('[data-category-legend-money]')
        && [...document.querySelectorAll('[data-spending-money]')].every(node => node.textContent?.trim() === '••••••')`,
      'Final UI Polish P7 privacidad de Reportes',
    );

    if (!await client.evaluate(`(() => {
      const button = document.querySelector('button[aria-controls="report-detailed-analysis"]');
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudo cerrar el análisis detallado.');
    await waitFor(
      client,
      `document.querySelector('button[aria-controls="report-detailed-analysis"]')?.getAttribute('aria-expanded') === 'false'
        && document.querySelector('#report-detailed-analysis')?.hidden === true`,
      'Reportes vuelve a lectura compacta',
    );

    // Mobile validates the compact reading surface, not the optional audit sheet.
    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitFor(
      client,
      `(() => {
        const reports = document.querySelector('[data-reports-prisma="true"]');
        const controls = document.querySelector('[data-report-range-controls="prisma"]');
        const mobileNav = document.querySelector('[data-shell-nav="mobile"]');
        const detail = document.querySelector('#report-detailed-analysis');
        const requiredSections = [
          'quick-read',
          'spending',
          'spending-breakdown',
          'comparison',
          'analysis-access',
        ];
        const sections = requiredSections
          .map(section => document.querySelector('[data-report-section="' + section + '"]'));
        const primaryCharts = [...document.querySelectorAll(
          '[data-report-section="spending"] [data-report-chart], [data-report-section="spending-breakdown"] [data-report-chart], [data-report-section="comparison"] [data-report-chart]'
        )];
        const presetButtons = [...document.querySelectorAll('[data-report-preset]')];
        const detailButton = document.querySelector('button[aria-controls="report-detailed-analysis"]');
        const visibleAndContained = node => {
          if (!(node instanceof HTMLElement)) return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number.parseFloat(style.opacity || '1') > 0
            && rect.width > 0
            && rect.height > 0
            && rect.left >= -1
            && rect.right <= window.innerWidth + 1;
        };
        const usableControl = node => {
          if (!visibleAndContained(node)) return false;
          const rect = node.getBoundingClientRect();
          return rect.width >= 32 && rect.height >= 32;
        };
        return reports && controls && mobileNav
          && visibleAndContained(reports)
          && visibleAndContained(controls)
          && getComputedStyle(mobileNav).display !== 'none'
          && sections.every(visibleAndContained)
          && detail instanceof HTMLElement
          && detail.hidden
          && primaryCharts.length >= 2
          && primaryCharts.every(visibleAndContained)
          && presetButtons.length === 6
          && presetButtons.every(usableControl)
          && usableControl(detailButton)
          && document.documentElement.scrollWidth <= window.innerWidth + 1;
      })()`,
      'Reportes Prisma móvil',
    );

    // Final UI Polish P7: switch themes with the real Settings controls, then return to Home.
    if (!await client.evaluate(`(() => {
      const button = document.querySelector('button[aria-label="Ajustes"]');
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudo abrir Ajustes durante P7.');
    await waitFor(client, `Boolean(document.querySelector('[data-settings-prisma="true"]'))`, 'Final UI Polish P7 Ajustes');

    if (!await client.evaluate(setControlExpression('[data-settings-mobile-navigation="prisma"]', 'appearance'))) {
      throw new Error('No se pudo abrir Apariencia durante P7.');
    }
    if (!await client.evaluate(`(() => {
      const radio = document.querySelector('#theme-dark');
      if (!(radio instanceof HTMLElement)) return false;
      radio.click();
      return true;
    })()`)) throw new Error('No se pudo activar Neón durante P7.');
    await waitFor(
      client,
      `document.documentElement.classList.contains('dark')
        && document.documentElement.dataset.balancesHidden === 'true'
        && document.documentElement.scrollWidth <= window.innerWidth + 1`,
      'Final UI Polish P7 Neón',
    );
    if (!await client.evaluate(`(() => {
      const radio = document.querySelector('#theme-light');
      if (!(radio instanceof HTMLElement)) return false;
      radio.click();
      return true;
    })()`)) throw new Error('No se pudo restaurar Prisma durante P7.');
    await waitFor(
      client,
      `document.documentElement.classList.contains('light')
        && !document.documentElement.classList.contains('dark')`,
      'Final UI Polish P7 Prisma',
    );
    await client.evaluate(`document.querySelector('button[aria-label="Cerrar ajustes"]')?.click()`);
    await waitFor(client, `!document.querySelector('[data-settings-prisma="true"]')`, 'Final UI Polish P7 cierre Ajustes');

    if (!await client.evaluate(clickButtonExpression('Resumen'))) {
      throw new Error('No se pudo volver a Resumen durante P7.');
    }
    await waitFor(
      client,
      `(() => {
        const home = document.querySelector('[data-home-prisma="true"]');
        const heading = home?.querySelector('h1');
        const status = home?.querySelector('[data-home-status-pill]');
        return home instanceof HTMLElement
          && heading?.textContent?.trim() === 'Tu panorama financiero.'
          && status instanceof HTMLElement
          && status.innerText.trim().length > 0
          && document.documentElement.dataset.balancesHidden === 'true'
          && document.documentElement.scrollWidth <= window.innerWidth + 1;
      })()`,
      'Final UI Polish P7 regreso a Resumen',
    );

    if (!await client.evaluate(clickButtonExpression('Reportes'))) {
      throw new Error('No se pudo volver a Reportes después de validar Resumen.');
    }
    await waitFor(client, `Boolean(document.querySelector('[data-reports-prisma="true"]'))`, 'Final UI Polish P7 retorno a Reportes');
    if (!await client.evaluate(`(() => {
      const button = document.querySelector('button[aria-label="Mostrar importes"]');
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudieron restaurar importes en P7.');
    await waitFor(
      client,
      `document.documentElement.dataset.balancesHidden === 'false'
        && Boolean(document.querySelector('[data-category-legend-money]'))`,
      'Final UI Polish P7 restaurar importes',
    );

    await client.command('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitFor(
      client,
      `getComputedStyle(document.querySelector('[data-shell-sidebar="desktop"]')).display !== 'none'`,
      'retorno a Reportes desktop',
    );

    // Retroactive income regression: extend account history and save the real income atomically.
    if (!await client.evaluate(`(() => {
      const button = document.querySelector('[aria-label="Nuevo movimiento"]');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudo abrir Nuevo movimiento para ingreso retroactivo.');
    await waitFor(client, `Boolean(document.querySelector('[data-global-composer="prisma"]'))`, 'compositor ingreso retroactivo');

    if (!await client.evaluate(clickButtonExpression('Ingreso'))) {
      throw new Error('No se pudo seleccionar Ingreso retroactivo.');
    }
    await client.evaluate(setControlExpression('[aria-label="Monto"]', '500'));
    await waitFor(client, `Boolean(document.querySelector('[aria-label="Categoría"] option:not([value=""])'))`, 'categoría ingreso retroactivo');
    if (!await client.evaluate(selectFirstOptionExpression('[aria-label="Categoría"]'))) {
      throw new Error('No se pudo seleccionar categoría de ingreso retroactivo.');
    }
    if (!await client.evaluate(`(() => {
      const summary = document.querySelector('[data-quick-add-details="prisma"] summary');
      if (!(summary instanceof HTMLElement)) return false;
      summary.click();
      return true;
    })()`)) throw new Error('No se pudo abrir Más detalles para ingreso retroactivo.');
    await waitFor(client, `Boolean(document.querySelector('[aria-label="Fecha del movimiento"]'))`, 'fecha ingreso retroactivo');
    await client.evaluate(setControlExpression('[aria-label="Fecha del movimiento"]', '2026-09-30'));
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-retroactive-income-extension="true"]'))
        && Boolean(document.querySelector('[aria-label="Saldo al inicio de la fecha retroactiva"]'))`,
      'extensión histórica desde compositor',
    );
    await client.evaluate(setControlExpression('[aria-label="Saldo al inicio de la fecha retroactiva"]', '0'));
    await waitFor(
      client,
      `[...document.querySelectorAll('button')].some(node => node.textContent?.trim() === 'Guardar' && !node.disabled)`,
      'Guardar ingreso retroactivo habilitado',
    );
    await client.evaluate(clickButtonExpression('Guardar'));
    await waitFor(client, `document.body.innerText.includes('Ingreso registrado')`, 'ingreso retroactivo registrado');
    await waitFor(client, `!document.querySelector('[data-global-composer="prisma"]')`, 'cierre compositor retroactivo', 5_000);

    if (!await client.evaluate(clickButtonExpression('Movimientos'))) {
      throw new Error('No se pudo abrir Movimientos tras ingreso retroactivo.');
    }
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-accounts-prisma="true"]'))
        && document.querySelector('[data-accounts-prisma="true"]')?.innerText.includes('Desde 2026-09-30')`,
      'cuenta ampliada a fecha retroactiva',
    );
    if (!await client.evaluate(clickButtonExpression('Reportes'))) {
      throw new Error('No se pudo volver a Reportes tras ingreso retroactivo.');
    }
    await waitFor(client, `Boolean(document.querySelector('[data-reports-prisma="true"]'))`, 'retorno a Reportes tras ingreso retroactivo');

    const postRoadmap4Results = await runPostRoadmap4Benchmark(client);
    if (postRoadmap4Results.length !== 3) throw new Error('Benchmark Post-roadmap 4 incompleto.');
    await client.command('Page.navigate', { url: APP_URL + '?tab=reports' });
    await waitFor(client, `document.readyState === 'complete' && Boolean(document.querySelector('[data-reports-prisma="true"]'))`, 'restaurar Reportes después del benchmark', 30_000);

    const externalRequests = requests.filter(url => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) && parsed.origin !== new URL(APP_URL).origin;
      } catch {
        return false;
      }
    });
    if (externalRequests.length) {
      throw new Error('La app emitió requests externos: ' + externalRequests.join(', '));
    }

    // Wait until the production service worker owns the offline cache.
    const workerReady = await client.evaluate(
      `(async () => {
        if (!('serviceWorker' in navigator)) return false;
        await navigator.serviceWorker.ready;
        return true;
      })()`,
      { awaitPromise: true },
    );
    if (!workerReady) throw new Error('Service worker no disponible.');

    await client.command('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
      connectionType: 'none',
    });
    await client.command('Page.reload', { ignoreCache: true });
    await waitFor(
      client,
      `document.readyState === 'complete' && document.body.innerText.includes('Resumen')`,
      'recarga offline desde service worker',
    );

    process.stdout.write('E2E smoke passed: Prisma branding + premium-theme interaction + secondary surfaces + responsive shell + Home + Movimientos/composer + Plan + Reports/charts + movement mutation + navigation + offline reload.\n');
  } finally {
    await cleanup();
  }
}

await main();