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
        if (!home || !modules || !metrics) return false;
        const moduleColumns = getComputedStyle(modules).gridTemplateColumns.split(' ').filter(Boolean).length;
        const metricColumns = getComputedStyle(metrics).gridTemplateColumns.split(' ').filter(Boolean).length;
        return moduleColumns === 2 && metricColumns === 4;
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
        const modules = document.querySelector('[data-home-layout="module-grid"]');
        const metrics = document.querySelector('[data-home-layout="position-metrics"]');
        if (!modules || !metrics) return false;
        const moduleColumns = getComputedStyle(modules).gridTemplateColumns.split(' ').filter(Boolean).length;
        const metricColumns = getComputedStyle(metrics).gridTemplateColumns.split(' ').filter(Boolean).length;
        return moduleColumns === 1 && metricColumns === 1;
      })()`,
      'Home Prisma móvil',
    );

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
    await createMovement(client, 'Ingreso', 1000);

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
    await client.command('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyUp', key:'Escape', code:'Escape' });

    if (!await client.evaluate(`(() => {
      const button = document.querySelector('button[aria-label="Ajustes"]');
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`)) throw new Error('No se pudo abrir Ajustes.');
    await waitFor(client, `Boolean(document.querySelector('[data-settings-prisma="true"]'))`, 'Ajustes Prisma');

    if (!await client.evaluate(activateTabExpression('Categorías'))) throw new Error('No se pudo abrir Categorías.');
    await waitFor(client, `document.querySelectorAll('[data-category-manager="prisma"]').length >= 2`, 'Categorías Prisma');

    if (!await client.evaluate(activateTabExpression('Privacidad y seguridad'))) throw new Error('No se pudo abrir Privacidad y seguridad.');
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-app-lock-settings="prisma"]'))
        && Boolean(document.querySelector('[data-auto-lock-settings="prisma"]'))`,
      'Seguridad Prisma',
    );

    if (!await client.evaluate(activateTabExpression('Datos y copias'))) throw new Error('No se pudo abrir Datos y copias.');
    await waitFor(client, `Boolean(document.querySelector('[data-persistent-storage-settings="prisma"]'))`, 'Datos Prisma');

    if (!await client.evaluate(clickButtonExpression('Copias de Seguridad'))) throw new Error('No se pudo abrir Copias de Seguridad.');
    await waitFor(client, `Boolean(document.querySelector('[data-backups-prisma="true"]'))`, 'Backups Prisma');
    await client.command('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyUp', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' });
    await client.command('Input.dispatchKeyEvent', { type:'keyUp', key:'Escape', code:'Escape' });

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
        && document.querySelectorAll('[data-report-chart]').length >= 5`,
      'Reportes Prisma y gráficos',
    );

    if (!await client.evaluate(`(() => {
      const button = document.querySelector('[data-report-preset="7d"]');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
      button.click();
      return true;
    })()`)) {
      throw new Error('No se pudo activar 7D.');
    }
    await waitFor(
      client,
      `document.querySelector('[data-report-preset="7d"]')?.getAttribute('aria-pressed') === 'true'`,
      'rango 7D',
    );

    if (!await client.evaluate(`(() => {
      const button = document.querySelector('[data-report-preset="custom"]');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
      button.click();
      return true;
    })()`)) {
      throw new Error('No se pudo activar Custom.');
    }
    await waitFor(
      client,
      `document.querySelector('[data-report-preset="custom"]')?.getAttribute('aria-pressed') === 'true'
        && document.querySelectorAll('[data-report-range-controls="prisma"] input[type="date"]').length === 2`,
      'rango Custom',
    );

    // Phase 20.8.8: exercise the complete Reports hierarchy at a mobile viewport.
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
        const requiredSections = [
          'quick-read',
          'spending',
          'comparison',
          'spending-breakdown',
          'cash-flow',
          'net-worth',
          'detail',
        ];
        const sections = requiredSections
          .map(section => document.querySelector('[data-report-section="' + section + '"]'));
        const charts = [...document.querySelectorAll('[data-report-chart]')];
        const presetButtons = [...document.querySelectorAll('[data-report-preset]')];
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
          && charts.length >= 5
          && charts.every(visibleAndContained)
          && presetButtons.length === 6
          && presetButtons.every(usableControl)
          && document.documentElement.scrollWidth <= window.innerWidth + 1;
      })()`,
      'Reportes Prisma móvil',
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

    process.stdout.write('E2E smoke passed: Prisma branding + secondary surfaces + responsive shell + Home + Movimientos/composer + Plan + Reports/charts + movement mutation + navigation + offline reload.\n');
  } finally {
    await cleanup();
  }
}

await main();
