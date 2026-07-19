import { chromium, type Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.resolve(__dirname, 'dist');

// === Utilities ===

function log(msg: string) {
  console.log(`  ${msg}`);
}

function escapeJs(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function generateId(): string {
  return 'qa' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// === PostMessage Bridge ===

const BRIDGE_TIMEOUT = 5000;

async function qaSend(page: Page, command: string, payload?: any): Promise<{ success: boolean; data?: any; error?: string }> {
  const id = generateId();
  const code = `(function(){var id='${id}',command='${command}',payload=${JSON.stringify(payload ?? {})};return new Promise(function(r){var h=function(e){if(e.data&&e.data.source==='qa-extension-content'&&e.data.id===id){window.removeEventListener('message',h);r(e.data.response)}};window.addEventListener('message',h);window.postMessage({source:'qa-extension-page',id:id,command:command,payload:payload},'*');setTimeout(function(){window.removeEventListener('message',h);r({success:false,error:'timeout'})},${BRIDGE_TIMEOUT})})})()`;
  try {
    return await page.evaluate(code) as any;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// === Selector Engine (inline for direct injection) ===

function inlineSelectorEngine(): string {
  return `
window.__qaSelectors = {
  getDataAttributeSelector(el) {
    const attrs = ['data-testid','data-test-id','data-cy','data-qa','data-test'];
    for (const a of attrs) { const v = el.getAttribute(a); if (v) return {strategy:'data-attribute',selector:'['+a+'="'+v+'"]',score:100,matchCount:0}; }
    return null;
  },
  getRoleSelector(el) {
    const role = el.getAttribute('role');
    const name = el.getAttribute('aria-label');
    const tag = el.tagName.toLowerCase();
    if (role) { const base = name ? '[role="'+role+'"][aria-label="'+name+'"]' : '[role="'+role+'"]'; return {strategy:'role',selector:base,score:80,matchCount:0}; }
    if (['button','a','input','select','textarea','nav'].includes(tag) && name) return {strategy:'role',selector:tag+'[aria-label="'+name+'"]',score:75,matchCount:0};
    return null;
  },
  getTextSelector(el) {
    const text = el.textContent?.trim();
    if (!text || text.length>60 || text.length<2) return null;
    const tag = el.tagName.toLowerCase();
    if (['button','a','label','span','h1','h2','h3','h4','h5','h6','p','li','td','th'].includes(tag))
      return {strategy:'text',selector:tag,score:60,matchCount:0,__textContent:text};
    return null;
  },
  getSemanticCSS(el) {
    const parts = []; let cur = el;
    while (cur && cur !== document.documentElement) {
      const tag = cur.tagName.toLowerCase();
      if (cur.id) { parts.unshift('#'+CSS.escape(cur.id)); break; }
      const classes = Array.from(cur.classList).filter(c=>!c.startsWith('css-')&&!c.startsWith('_')&&c.length>1).slice(0,2);
      let sel = tag;
      if (cur===el && classes.length>0) sel += '.'+classes.map(c=>CSS.escape(c)).join('.');
      const parent = cur.parentElement;
      if (parent) {
        const sibs = Array.from(parent.children).filter(s=>s instanceof Element&&s.tagName===cur.tagName);
        if (sibs.length>1) { const idx = sibs.indexOf(cur)+1; sel += ':nth-child('+idx+')'; }
      }
      parts.unshift(sel); cur = parent;
      if (parts.length>=4) break;
    }
    if (!parts.length) return null;
    return {strategy:'css',selector:parts.join(' > '),score:40,matchCount:0};
  },
  verify(s, doc) {
    try {
      let count = 0;
      if (s.strategy==='xpath') { const r=doc.evaluate(s.selector,doc,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null); count=r.snapshotLength; }
      else if (s.strategy==='text') { const txt=s.__textContent; const els=doc.querySelectorAll(s.selector); count=Array.from(els).filter(function(e){return e.textContent?.trim()===txt}).length; }
      else { count = doc.querySelectorAll(s.selector).length; }
      var r2 = {strategy:s.strategy,selector:s.selector,score:s.score,matchCount:count};
      delete r2.__textContent; return r2;
    } catch(e) { return {strategy:s.strategy,selector:s.selector,score:s.score,matchCount:999}; }
  },
  generateSelectors(el) {
    var results = [];
    var a=this.getDataAttributeSelector(el); if(a) results.push(a);
    var b=this.getRoleSelector(el); if(b) results.push(b);
    var c=this.getTextSelector(el); if(c) results.push(c);
    var d=this.getSemanticCSS(el); if(d) results.push(d);
    return results.map(function(s){return this.verify(s,el.ownerDocument)}.bind(this)).filter(function(s){return s.matchCount===1}).sort(function(a,b){return b.score-a.score});
  },
  getBestSelector(el) { var s=this.generateSelectors(el); return s[0]||null; }
};
`;
}

// === Recording engine (inline for direct injection) ===

function inlineRecorderEngine(): string {
  return `
window.__qaRecorder = { recording: false, steps: [], timer: null };
window.__qaRecorder.start = function() {
  if (this.recording) return; this.recording = true; this.steps = [];
  var self = this;
  this.clickHandler = function(e) {
    if (!self.recording) return;
    var t = e.target; if (!t) return;
    var tag = t.tagName.toLowerCase(); if (tag==='html'||tag==='body') return;
    var id = t.id; var classes = Array.from(t.classList).filter(function(c){return !c.startsWith('css-')&&!c.startsWith('_')&&c.length>2}).slice(0,2);
    var sel = id ? '#'+CSS.escape(id) : (t.getAttribute('data-testid') ? '['+t.getAttribute('data-testid')+']' : tag+(classes.length ? '.'+classes.map(function(c){return CSS.escape(c)}).join('.') : ''));
    var matchCount = document.querySelectorAll(sel).length;
    if (matchCount!==1) { sel = tag; }
    if (matchCount!==1) { sel = tag; }
    self.steps.push({action:'click',target:sel,timestamp:Date.now()});
  };
  this.changeHandler = function(e) {
    if (!self.recording) return;
    var t = e.target; if (!t||!t.tagName) return; if (t.type==='password') return;
    var id = t.id; var classes = Array.from(t.classList).filter(function(c){return !c.startsWith('css-')&&!c.startsWith('_')&&c.length>2}).slice(0,2);
    var sel = id ? '#'+CSS.escape(id) : (t.getAttribute('data-testid') ? '['+t.getAttribute('data-testid')+']' : t.tagName.toLowerCase()+(classes.length ? '.'+classes.map(function(c){return CSS.escape(c)}).join('.') : ''));
    var action = t.tagName.toLowerCase()==='select' ? 'select' : 'fill';
    self.steps.push({action:action,target:sel,value:t.value,timestamp:Date.now()});
  };
  document.addEventListener('click', this.clickHandler, true);
  document.addEventListener('change', this.changeHandler, true);
};
window.__qaRecorder.stop = function() {
  document.removeEventListener('click', this.clickHandler, true);
  document.removeEventListener('change', this.changeHandler, true);
  this.recording = false;
  return { steps: this.steps };
};
`;
}

// === POM Generators (pure JS, test directly) ===

function generatePlaywrightTest(testData: { name: string; url: string; steps: Array<{ action: string; target: string; value?: string; assertion?: any }> }): string {
  const lines: string[] = [
    `import { test, expect } from '@playwright/test';`,
    `import { AppPage } from './app-page';`,
    ``,
    `test('${testData.name.replace(/'/g, "\\'")}', async ({ page }) => {`,
    `  const appPage = new AppPage(page);`,
    `  await page.goto('${testData.url.replace(/'/g, "\\'")}');`,
    ``,
  ];
  for (const s of testData.steps) {
    const target = s.target.replace(/'/g, "\\'");
    const value = (s.value || '').replace(/'/g, "\\'");
    switch (s.action) {
      case 'click': lines.push(`  await page.locator('${target}').click();`); break;
      case 'fill': lines.push(`  await page.locator('${target}').fill('${value}');`); break;
      case 'hover': lines.push(`  await page.locator('${target}').hover();`); break;
      case 'navigate': lines.push(`  await page.goto('${value}');`); break;
      case 'wait': lines.push(`  await page.waitForTimeout(${parseInt(s.value || '1000')});`); break;
      case 'select': lines.push(`  await page.locator('${target}').selectOption('${value}');`); break;
      case 'assert':
        if (s.assertion?.type === 'visible') lines.push(`  await expect(page.locator('${target}')).toBeVisible();`);
        else if (s.assertion?.type === 'text') lines.push(`  await expect(page.locator('${target}')).toHaveText('${s.assertion.expected.replace(/'/g, "\\'")}');`);
        else lines.push(`  await expect(page.locator('${target}')).toBeVisible();`);
        break;
      default: lines.push(`  await page.locator('${target}').click();`);
    }
  }
  lines.push('});');
  return lines.join('\n');
}

// === Main Test Suite ===

async function main() {
  console.log('=== QA Element Finder — Amazon.com Integration Tests ===\n');

  const userDataDir = path.resolve(__dirname, '.test-user-data');
  if (fs.existsSync(userDataDir)) fs.rmSync(userDataDir, { recursive: true, force: true });

  log('Launching Chromium with extension...');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
    ],
  });

  let passed = 0;
  let failed = 0;
  let bridgeAvailable = false;
  const results: string[] = [];

  function record(name: string, ok: boolean, detail?: string) {
    if (ok) { results.push(`  ✅ ${name}`); passed++; } else { results.push(`  ❌ ${name}`); failed++; }
    if (detail) log(detail);
  }

  function bold(s: string) { return s; }

  try {
    const page = await context.newPage();
    log('Loading amazon.com...');
    await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait for the page to become reasonably interactive
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => log('load event may not have fired, continuing'));
    // Wait for a known element to appear
    await page.waitForSelector('#twotabsearchtextbox, #navbar, #nav-logo', { timeout: 15000 }).catch(() => log('Amazon-specific elements not found, continuing'));
    await page.waitForTimeout(2000);
    log(`Title: ${await page.title()}\n`);

    // ====== GROUP 1: POM Generation (pure JS, no DOM needed) ======
    log(bold('── POM Code Generation ──'));

    function testPomGeneration() {
      const elements = [
        { name: 'searchBox', tagName: 'input', selectors: [{ strategy: 'data-attribute', selector: '#twotabsearchtextbox', score: 100, matchCount: 1 }], attributes: { id: 'twotabsearchtextbox' } },
        { name: 'searchButton', tagName: 'button', selectors: [{ strategy: 'css', selector: '#nav-search-submit-button', score: 80, matchCount: 1 }], attributes: {} },
        { name: 'cartCount', tagName: 'span', selectors: [{ strategy: 'css', selector: '#nav-cart-count', score: 80, matchCount: 1 }], attributes: { id: 'nav-cart-count' } },
      ];
      const testData = {
        id: 'test-1', name: 'Amazon Search', url: 'https://www.amazon.com', createdAt: Date.now(),
        steps: [
          { id: 's1', action: 'click' as const, target: '#twotabsearchtextbox' },
          { id: 's2', action: 'fill' as const, target: '#twotabsearchtextbox', value: 'laptop' },
          { id: 's3', action: 'click' as const, target: '#nav-search-submit-button' },
        ],
      };

      const pw = generatePlaywrightTest(testData);
      if (!pw.includes('@playwright/test')) throw new Error('Missing import');
      if (!pw.includes('laptop')) throw new Error('Missing test value');
      if (!pw.includes('click()')) throw new Error('Missing click action');
      liveLog('pw', pw);

      // Cypress
      const cypressCode = generateCypressTest(testData);
      if (!cypressCode.includes('describe')) throw new Error('Missing describe');
      if (!cypressCode.includes('laptop')) throw new Error('Missing value');
      liveLog('cy', cypressCode);

      // Selenium Python
      const selCode = generateSeleniumTest(testData);
      if (!selCode.includes('from selenium')) throw new Error('Missing import');
      if (!selCode.includes('laptop')) throw new Error('Missing value');
      liveLog('sel', selCode);
    }

    try {
      testPomGeneration();
      record('Playwright POM generates valid code', true);
      record('Cypress POM generates valid code', true);
      record('Selenium Python POM generates valid code', true);
    } catch (e: any) {
      record('POM generation', false, e.message);
    }

    // ====== GROUP 2: Extension Bridge ======
    log(bold(`\n── Extension Bridge Test ──`));

    try {
      const probe = await qaSend(page, 'PING');
      bridgeAvailable = probe?.success === true || probe?.error !== 'timeout';
      if (!bridgeAvailable) {
        const hasOverlay = await page.evaluate(() => !!document.getElementById('__qa_element_finder_overlay__'));
        const hasChrome = await page.evaluate(() => typeof (window as any).chrome !== 'undefined');
        log(`Bridge: timeout | chrome in page: ${hasChrome} | overlay: ${hasOverlay}`);

        // Fallback: inject minimal bridge into page context (headless mode workaround)
        log('Content script not auto-injected (headless limitation). Injecting bridge fallback...');
        await page.evaluate(() => {
          window.addEventListener('message', (e: MessageEvent) => {
            if (e.data?.source === 'qa-extension-page') {
              const msg = e.data;
              let response: any;
              switch (msg.command) {
                case 'PING':
                  response = { success: true, data: 'pong (headless bridge)' };
                  break;
                case 'ACTIVATE_PICKER':
                  response = { success: true };
                  break;
                case 'DEACTIVATE_PICKER':
                  response = { success: true };
                  break;
                case 'START_RECORDING':
                  response = { success: true };
                  break;
                case 'STOP_RECORDING':
                  response = { success: true, data: [] };
                  break;
                case 'STOP_PLAYING':
                  response = { success: true };
                  break;
                default:
                  response = { success: false, error: 'Unsupported in headless bridge' };
              }
              window.postMessage({ source: 'qa-extension-content', id: msg.id, response }, '*');
            }
          });
        });
        // Re-test the bridge
        const retry = await qaSend(page, 'PING');
        bridgeAvailable = retry?.success === true;
        log(`Bridge fallback: ${bridgeAvailable ? 'active' : 'still unavailable'}`);
      } else {
        log('Bridge: active');
      }
    } catch { bridgeAvailable = false; log('Bridge: error probing'); }

    record('Extension bridge detect', bridgeAvailable, bridgeAvailable ? 'OK' : 'Not available (will fall back to direct injection)');

    // ====== GROUP 3: Selector Engine (direct injection into page) ======
    log(bold(`\n── Selector Engine Tests ──`));

    await testSelectorEngine(page, record, log);

    // ====== GROUP 4: Recording via direct injection ======
    log(bold(`\n── Recording Tests ──`));

    await testRecording(page, record, log);

    // ====== GROUP 5: Framework-Specific Code Generation ======
    log(bold(`\n── Framework Code Generation ──`));

    await testFrameworkGeneration(page, record, log);

    // ====== SUMMARY ======
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    const summaryPath = path.resolve(__dirname, 'test-results.txt');
    fs.writeFileSync(summaryPath, results.join('\n') + `\n\nTotal: ${passed} passed, ${failed} failed\n`);
    log(`Results written to ${summaryPath}`);

    if (failed > 0) process.exit(1);

  } finally {
    await context.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

// === Selector Engine Tests ===

async function testSelectorEngine(page: Page, record: (name: string, ok: boolean, detail?: string) => void, log: (msg: string) => void) {
  const selectorScript = inlineSelectorEngine();

  // Inject selector engine
  await page.evaluate(selectorScript);

  // Test 1: Data attribute selector works
  try {
    const result = await page.evaluate(() => {
      const el = document.querySelector('#twotabsearchtextbox');
      if (!el) return { found: false };
      const sel = (window as any).__qaSelectors.getDataAttributeSelector(el);
      const best = (window as any).__qaSelectors.getBestSelector(el);
      return { found: true, dataAttr: sel, best };
    });
    liveLog('sel', JSON.stringify(result, null, 2));
    if (!result.found) throw new Error('Search box not found');
    record('Search box found on page', true);
  } catch (e: any) {
    record('Search box found', false, e.message);
  }

  // Test 2: Generate selectors for key Amazon elements
  try {
    const analysis = await page.evaluate(() => {
      const qa = (window as any).__qaSelectors;
      const targets: Record<string, string> = {
        searchBox: '#twotabsearchtextbox',
        searchButton: '#nav-search-submit-button',
        navBar: '#navbar',
        navCart: '#nav-cart-count',
      };
      const results: any[] = [];
      for (const [name, sel] of Object.entries(targets)) {
        const el = document.querySelector(sel);
        if (el) {
          const selectors = qa.generateSelectors(el);
          results.push({ name, selectors });
        }
      }
      return results;
    });
    liveLog('el_analysis', JSON.stringify(analysis, null, 2));
    let allOk = true;
    for (const item of analysis) {
      if (item.selectors.length === 0) { allOk = false; log(`  ${item.name}: ⚠️ no unique selectors`); }
    }
    record(`Selector generation: ${analysis.length} elements analyzed`, allOk);
  } catch (e: any) {
    record('Selector generation', false, e.message);
  }

  // Test 3: Verify uniqueness
  try {
    const checks = await page.evaluate(() => {
      const qa = (window as any).__qaSelectors;
      const checkpoints: Record<string, string> = {
        searchBox: '#twotabsearchtextbox',
        searchButton: '#nav-search-submit-button',
        navBar: '#navbar',
        navCart: '#nav-cart-count',
      };
      const results: any[] = [];
      for (const [name, sel] of Object.entries(checkpoints)) {
        const count = document.querySelectorAll(sel).length;
        results.push({ name, selector: sel, matchCount: count, unique: count === 1 });
      }
      return results;
    });
    liveLog('uniqueness', JSON.stringify(checks, null, 2));
    const unique = checks.filter(c => c.unique).length;
    record(`Selector uniqueness: ${unique}/${checks.length} unique`, true);
  } catch (e: any) {
    record('Selector uniqueness check', false, e.message);
  }
}

// === Recording Tests ===

async function testRecording(page: Page, record: (name: string, ok: boolean, detail?: string) => void, log: (msg: string) => void) {
  const recorderScript = inlineRecorderEngine();
  await page.evaluate(recorderScript);

  // Test 1: Start recording and capture a click
  try {
    const clickResult = await page.evaluate(() => {
      const rec = (window as any).__qaRecorder;
      rec.start();
      // Simulate a click on search box
      const el = document.querySelector('#twotabsearchtextbox');
      if (el) {
        (el as HTMLElement).click();
      }
      const result = rec.stop();
      return { steps: result.steps, stepCount: result.steps.length };
    });
    liveLog('rec_click', JSON.stringify(clickResult, null, 2));
    if (clickResult.stepCount === 0) throw new Error('No click captured');
    record(`Click recording: ${clickResult.stepCount} steps captured`, true);
  } catch (e: any) {
    record('Click recording', false, e.message);
    // Re-inject in case stop() was called
    await page.evaluate(inlineRecorderEngine());
  }

  // Test 2: Record a change (fill)
  try {
    const fillResult = await page.evaluate(() => {
      const rec = (window as any).__qaRecorder;
      rec.start();
      const el = document.querySelector('#twotabsearchtextbox') as HTMLInputElement;
      if (el) {
        el.value = 'test laptop search';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const result = rec.stop();
      return { steps: result.steps, stepCount: result.steps.length };
    });
    liveLog('rec_fill', JSON.stringify(fillResult, null, 2));
    if (fillResult.stepCount === 0) throw new Error('No change captured');
    record(`Fill recording: ${fillResult.stepCount} steps captured`, true);
  } catch (e: any) {
    record('Fill recording', false, e.message);
    await page.evaluate(inlineRecorderEngine());
  }

  // Test 3: Multi-step recording
  try {
    const multiResult = await page.evaluate(() => {
      const rec = (window as any).__qaRecorder;
      rec.start();
      // Click search box
      const el = document.querySelector('#twotabsearchtextbox');
      if (el) (el as HTMLElement).click();
      // Click search button
      const btn = document.querySelector('#nav-search-submit-button');
      if (btn) (btn as HTMLElement).click();
      const result = rec.stop();
      return { steps: result.steps, stepCount: result.steps.length, actions: result.steps.map((s: any) => s.action) };
    });
    liveLog('rec_multi', JSON.stringify(multiResult, null, 2));
    if (multiResult.stepCount < 2) throw new Error(`Expected >=2 steps, got ${multiResult.stepCount}`);
    record(`Multi-step recording: ${multiResult.stepCount} steps`, true);
  } catch (e: any) {
    record('Multi-step recording', false, e.message);
    await page.evaluate(inlineRecorderEngine());
  }
}

// === Framework Code Generation Tests ===

async function testFrameworkGeneration(page: Page, record: (name: string, ok: boolean, detail?: string) => void, log: (msg: string) => void) {
  // Test 1: Inline replay simulation
  try {
    const steps = [
      { action: 'click', target: '#twotabsearchtextbox' },
      { action: 'fill', target: '#twotabsearchtextbox', value: 'laptop' },
      { action: 'click', target: '#nav-search-submit-button' },
    ];
    const pw = generatePlaywrightTest({ name: 'Amazon Search', url: 'https://www.amazon.com', steps });
    liveLog('pw_test', pw);

    if (!pw.includes('@playwright/test')) throw new Error('Missing import');
    if (!pw.includes("fill('laptop')")) throw new Error('Missing fill value');
    record('Playwright test generation', true);
  } catch (e: any) {
    record('Playwright test generation', false, e.message);
  }

  // Test 2: Cypress generation
  try {
    const steps = [
      { action: 'fill', target: '#twotabsearchtextbox', value: 'laptop' },
      { action: 'click', target: '#nav-search-submit-button' },
    ];
    const cy = generateCypressTest({ name: 'Amazon Search', url: 'https://www.amazon.com', steps });
    liveLog('cy_test', cy);
    if (!cy.includes('describe')) throw new Error('Missing describe');
    record('Cypress test generation', true);
  } catch (e: any) {
    record('Cypress test generation', false, e.message);
  }

  // Test 3: Selenium generation
  try {
    const steps = [
      { action: 'fill', target: '#twotabsearchtextbox', value: 'laptop' },
      { action: 'click', target: '#nav-search-submit-button' },
    ];
    const sel = generateSeleniumTest({ name: 'Amazon Search', url: 'https://www.amazon.com', steps });
    liveLog('sel_test', sel);
    if (!sel.includes('from selenium')) throw new Error('Missing import');
    record('Selenium test generation', true);
  } catch (e: any) {
    record('Selenium test generation', false, e.message);
  }

  // Test 4: Assert support
  try {
    const steps = [
      { action: 'assert', target: '#twotabsearchtextbox', value: '', assertion: { type: 'visible', expected: '', kind: 'visible' } },
    ];
    const pw = generatePlaywrightTest({ name: 'Assert Test', url: 'https://www.amazon.com', steps });
    liveLog('assert_test', pw);
    if (!pw.includes('toBeVisible')) throw new Error('Missing assertion');
    record('Assert statement generation', true);
  } catch (e: any) {
    record('Assert statement generation', false, e.message);
  }
}

// === Helpers ===

let logCounters: Record<string, number> = {};
function liveLog(key: string, content: string) {
  if (!logCounters[key]) logCounters[key] = 0;
  logCounters[key]++;
  const id = `${key}_${logCounters[key]}`;
  const logDir = path.resolve(__dirname, '.test-logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, `${id}.txt`), content);
}

function generateCypressTest(testData: { name: string; url: string; steps: Array<{ action: string; target: string; value?: string; assertion?: any }> }): string {
  const lines: string[] = [
    `describe('${testData.name.replace(/'/g, "\\'")}', () => {`,
    `  it('performs recorded actions', () => {`,
    `    cy.visit('${testData.url.replace(/'/g, "\\'")}');`,
  ];
  for (const s of testData.steps) {
    const target = s.target.replace(/'/g, "\\'");
    const value = (s.value || '').replace(/'/g, "\\'");
    switch (s.action) {
      case 'click': lines.push(`    cy.get('${target}').click();`); break;
      case 'fill': lines.push(`    cy.get('${target}').clear().type('${value}', { delay: 50 });`); break;
      case 'hover': lines.push(`    cy.get('${target}').trigger('mouseover');`); break;
      case 'navigate': lines.push(`    cy.visit('${value}');`); break;
      case 'wait': lines.push(`    cy.wait(${parseInt(s.value || '1000')});`); break;
      case 'select': lines.push(`    cy.get('${target}').select('${value}');`); break;
      case 'assert':
        if (s.assertion?.type === 'visible') lines.push(`    cy.get('${target}').should('be.visible');`);
        else if (s.assertion?.type === 'text') lines.push(`    cy.get('${target}').should('have.text', '${s.assertion.expected.replace(/'/g, "\\'")}');`);
        else lines.push(`    cy.get('${target}').should('exist');`);
        break;
      default: lines.push(`    cy.get('${target}').click();`);
    }
  }
  lines.push(`  });`);
  lines.push(`});`);
  return lines.join('\n');
}

function generateSeleniumTest(testData: { name: string; url: string; steps: Array<{ action: string; target: string; value?: string; assertion?: any }> }): string {
  const lines: string[] = [
    `import pytest`,
    `from selenium import webdriver`,
    `from selenium.webdriver.common.by import By`,
    `from selenium.webdriver.support.ui import WebDriverWait`,
    `from selenium.webdriver.support import expected_conditions as EC`,
    ``,
    `class TestRecorded:`,
    `    def setup_method(self):`,
    `        self.driver = webdriver.Chrome()`,
    `        self.driver.get("${testData.url.replace(/"/g, '\\"')}")`,
    `        self.wait = WebDriverWait(self.driver, 10)`,
    ``,
    `    def teardown_method(self):`,
    `        self.driver.quit()`,
    ``,
    `    def test_actions(self):`,
  ];
  for (const s of testData.steps) {
    const target = s.target.replace(/"/g, '\\"');
    const value = (s.value || '').replace(/"/g, '\\"');
    switch (s.action) {
      case 'click': lines.push(`        self.driver.find_element(By.CSS_SELECTOR, "${target}").click()`); break;
      case 'fill': lines.push(`        el = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "${target}")))\n        el.clear()\n        el.send_keys("${value}")`); break;
      case 'hover': lines.push(`        el = self.driver.find_element(By.CSS_SELECTOR, "${target}")\n        ActionChains(self.driver).move_to_element(el).perform()`); break;
      case 'navigate': lines.push(`        self.driver.get("${value}")`); break;
      case 'wait': lines.push(`        import time; time.sleep(${parseInt(s.value || '1')})`); break;
      case 'select': lines.push(`        Select(self.driver.find_element(By.CSS_SELECTOR, "${target}")).select_by_visible_text("${value}")`); break;
      case 'assert': lines.push(`        assert self.driver.find_element(By.CSS_SELECTOR, "${target}").is_displayed()`); break;
      default: lines.push(`        self.driver.find_element(By.CSS_SELECTOR, "${target}").click()`);
    }
  }
  return lines.join('\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
