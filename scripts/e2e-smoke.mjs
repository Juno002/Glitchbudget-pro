import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

async function waitFor(client, expression, label, timeoutMs = 15_000) {
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
        && node.getAttribute('aria-disabled') !== 'true');
    if (!(tab instanceof HTMLElement)) return false;
    tab.focus();
    tab.click();
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

async function createMovement(client, type, amount) {
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
  await client.evaluate(setControlExpression('[aria-label="Monto"]', String(amount)));
  await waitFor(
    client,
    `Boolean(document.querySelector('[aria-label="Categoría"] option:not([value=""])'))`,
    'categorías de ' + type,
  );
  await client.evaluate(selectFirstOptionExpression('[aria-label="Categoría"]'));

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

  try {
    await waitForHttp(APP_URL);

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
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    failOnEarlyExit(chrome, 'chrome');

    await waitForHttp(DEBUG_URL + '/json/version');
    const targetResponse = await fetch(
      DEBUG_URL + '/json/new?' + encodeURIComponent(APP_URL),
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

    await waitFor(client, `document.readyState === 'complete' && document.body.innerText.includes('Resumen')`, 'app inicial');

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
          && getComputedStyle(mobileNav).display === 'none';
      })()`,
      'shell desktop',
    );
    await waitFor(
      client,
      `(() => {
        const home = document.querySelector('[data-home-prisma="true"]');
        const modules = document.querySelector('[data-home-layout="module-grid"]');
        const metrics = document.querySelector('[data-home-layout="position-metrics"]');
        if (!home || !modules || !metrics) return false;
        const moduleColumns = getComputedStyle(modules).gridTemplateColumns.split(' ').filter(Boolean).length;
        const metricColumns = getComputedStyle(metrics).gridTemplateColumns.split(' ').filter(Boolean).length;
        return moduleColumns === 2 && metricColumns === 4;
      })()`,
      'Home Prisma desktop',
    );

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
        return sidebar && mobileNav && mobileFab
          && getComputedStyle(sidebar).display === 'none'
          && getComputedStyle(mobileNav).display !== 'none'
          && getComputedStyle(mobileFab).display !== 'none';
      })()`,
      'shell móvil',
    );
    await waitFor(
      client,
      `(() => {
        const modules = document.querySelector('[data-home-layout="module-grid"]');
        const metrics = document.querySelector('[data-home-layout="position-metrics"]');
        if (!modules || !metrics) return false;
        const moduleColumns = getComputedStyle(modules).gridTemplateColumns.split(' ').filter(Boolean).length;
        const metricColumns = getComputedStyle(metrics).gridTemplateColumns.split(' ').filter(Boolean).length;
        return moduleColumns === 1 && metricColumns === 1;
      })()`,
      'Home Prisma móvil',
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
      'retorno a shell desktop',
    );

    // Fresh install: create actual data through the public UI, not by touching Dexie.
    await createMovement(client, 'Ingreso', 1000);
    await createMovement(client, 'Gasto', 100);

    if (!await client.evaluate(clickButtonExpression('Movimientos'))) {
      throw new Error('No se pudo abrir Movimientos.');
    }
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
        && Boolean(document.querySelector('[data-movement-history="list"]'))`,
      'Movimientos Prisma',
    );

    if (!await client.evaluate(clickButtonExpression('Plan'))) {
      throw new Error('No se pudo abrir Plan.');
    }
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-plan-prisma="true"]'))
        && Boolean(document.querySelector('[data-plan-navigation="prisma"]'))`,
      'Plan Prisma',
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
      `Boolean(document.querySelector('[data-plan-goals="prisma"]'))`,
      'Metas Prisma',
    );

    if (!await client.evaluate(activateTabExpression('Planificados'))) {
      throw new Error('No se pudo abrir Planificados.');
    }
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-plan-planned="prisma"]'))
        && Boolean(document.querySelector('[data-plan-planned-manager="prisma"]'))`,
      'Planificados Prisma',
    );

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

    process.stdout.write('E2E smoke passed: responsive shell + Prisma Home + Prisma Movimientos/composer + Prisma Plan + movement mutation + navigation + offline reload.\n');
  } finally {
    await cleanup();
  }
}

await main();
