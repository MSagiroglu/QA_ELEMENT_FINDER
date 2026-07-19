import { chromium, type Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.resolve(__dirname, 'dist');
const STANDALONE_CS_PATH = path.resolve(__dirname, 'dist/content-script-standalone.js');
const userDataDir = path.resolve(__dirname, '.headed-test');
if (fs.existsSync(userDataDir)) fs.rmSync(userDataDir, { recursive: true, force: true });

let page: Page;

const BRIDGE_TIMEOUT = 8000;

function qaSend(command: string, payload?: any): Promise<any> {
  const id = 'qa' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const code = `(function(){var id='${id}',command='${command}',payload=${JSON.stringify(payload ?? {})};return new Promise(function(r){var h=function(e){if(e.data&&e.data.source==='qa-extension-content'&&e.data.id===id){window.removeEventListener('message',h);r(e.data.response)}};window.addEventListener('message',h);window.postMessage({source:'qa-extension-page',id:id,command:command,payload:payload},'*');setTimeout(function(){window.removeEventListener('message',h);r({success:false,error:'timeout'})},${BRIDGE_TIMEOUT})})})()`;
  return page.evaluate(code);
}

async function waitForBridge(retries = 10): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    const r = await qaSend('PING');
    if (r?.success) return true;
    console.log(`  Waiting for bridge... (${i + 1}/${retries})`);
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

async function getSelectorDetails(page: Page, cssSelector: string) {
  return page.evaluate((sel: string) => {
    const qa = (window as any).__qaSelectors;
    if (!qa) return { error: 'Selector engine not loaded', selector: sel };
    const el = document.querySelector(sel);
    if (!el) return { selector: sel, error: 'Element not found on page' };
    const allSelectors = qa.generateSelectors(el);
    const matchCount = document.querySelectorAll(sel).length;
    return {
      selector: sel,
      tagName: el.tagName.toLowerCase(),
      id: el.id || null,
      text: (el.textContent || '').trim().slice(0, 60),
      unique: allSelectors.length > 0,
      matchCount,
      allSelectors,
    };
  }, cssSelector);
}

async function main() {
  console.log('\n=== QA Element Finder — Headed Live Test ===\n');

  const standaloneCS = fs.readFileSync(STANDALONE_CS_PATH, 'utf-8');

  console.log('Launching Chrome (headed) with extension...\n');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--enable-extensions',
      '--no-sandbox',
    ],
  });

  context.addInitScript(standaloneCS + ';' + `
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
`);

  page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('Navigating to Amazon.com...');
  await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await page.waitForSelector('#twotabsearchtextbox, #navbar, #nav-logo', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log(`Title: ${await page.title()}\n`);

  // Wait for bridge
  console.log('Waiting for bridge...');
  const bridgeOk = await waitForBridge();
  console.log(`  Bridge: ${bridgeOk ? 'ACTIVE' : 'FAILED'}\n`);
  if (!bridgeOk) { await context.close(); try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {} process.exit(1); }

  // Dismiss Amazon overlays
  console.log('Dismissing overlays...');
  await page.evaluate(() => {
    document.querySelectorAll('[aria-label="Close"], .glow-toaster-close, .a-button-close, button[data-action="a-popover-close"]')
      .forEach(btn => { if (btn instanceof HTMLElement) btn.click(); });
  });
  await page.waitForTimeout(1500);

  // --- RECORDING ---
  console.log('\n=== RECORDING ===\n');
  await qaSend('START_RECORDING');
  console.log('  Recording started.\n');

  // Perform actions (uses evaluate to dispatch real DOM events for recorder to capture)
  async function doClick(css: string, label: string) {
    console.log(`  ${label}: ${css}`);
    await page.evaluate((sel: string) => {
      document.querySelector(sel)?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
      );
    }, css);
    await page.waitForTimeout(500);
  }

  async function doFill(css: string, value: string, label: string) {
    console.log(`  ${label}: ${css} = "${value}"`);
    await page.evaluate(({ sel, val }: { sel: string; val: string }) => {
      const el = document.querySelector(sel) as HTMLInputElement;
      if (el) {
        el.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, { sel: css, val: value });
    await page.waitForTimeout(800);
  }

  await doClick('#twotabsearchtextbox', '1. Click search box');
  await doFill('#twotabsearchtextbox', 'playwright testing', '2. Type query');

  // Stop recording BEFORE navigation (search button click navigates away)
  const preNav = await qaSend('STOP_RECORDING');
  const steps1: any[] = preNav?.data?.steps || [];
  console.log(`\n  Pre-navigation steps: ${steps1.length}`);
  steps1.forEach((s: any, i: number) => {
    console.log(`    [${i + 1}] ${s.action} \u2192 ${s.target}${s.value ? ` = "${s.value}"` : ''}`);
  });

  // Now click search button (causes navigation)
  console.log('\n  3. Click search button (navigates)...');
  await page.evaluate((sel: string) => {
    document.querySelector(sel)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    );
  }, '#nav-search-submit-button');
  await page.waitForTimeout(3000);

  // Capture steps on the new page
  await qaSend('START_RECORDING');
  const postNav = await qaSend('STOP_RECORDING');
  const steps2: any[] = postNav?.data?.steps || [];

  // Accumulate all steps
  const steps = [...steps1, ...steps2];
  console.log(`\nPost-navigation steps: ${steps2.length}`);
  console.log(`Total steps: ${steps.length}\n`);

  // --- UNIQUE SELECTOR CHECK ---
  console.log('=== UNIQUE SELECTOR VERIFICATION ===\n');
  for (const step of steps) {
    const result = await getSelectorDetails(page, step.target);
    if (result.error) {
      console.log(`  \u274c "${step.action} \u2192 ${step.target}": ${result.error}`);
    } else {
      console.log(`  ${result.unique ? '\u2705' : '\u274c'} "${step.action}" \u2192 ${result.selector}`);
      console.log(`     Element: <${result.tagName}${result.id ? '#' + result.id : ''}> "${result.text}"`);
      if (result.allSelectors.length > 0) {
        console.log(`     Selectors (${result.allSelectors.length} unique):`);
        for (const s of result.allSelectors) {
          console.log(`       \u2705 [${s.strategy}] ${s.selector} (score: ${s.score})`);
        }
      }
      console.log();
    }
  }

  // --- REPLAY ---
  console.log('=== REPLAY ===\n');
  const playRes = await qaSend('PLAY_TEST', { steps });
  console.log(`  Replay: ${JSON.stringify(playRes?.data || playRes)}`);

  // Direct Playwright replay
  console.log('\n  Direct replay (Playwright):');
  await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  let replayOk = 0, replayFail = 0;
  for (const s of steps) {
    try {
      if (s.action === 'click') await page.click(s.target, { timeout: 5000, force: true });
      else if (s.action === 'fill') await page.fill(s.target, s.value, { timeout: 5000 });
      console.log(`    \u2705 ${s.action} \u2192 ${s.target}${s.value ? ` = "${s.value}"` : ''}`);
      replayOk++;
    } catch (e: any) {
      console.log(`    \u274c ${s.action} \u2192 ${s.target}: ${e.message?.slice(0, 60)}`);
      replayFail++;
    }
    await page.waitForTimeout(500);
  }
  console.log(`  Result: ${replayOk} passed, ${replayFail} failed\n`);

  // --- POM CODE ---
  console.log('=== PLAYWRIGHT POM CODE ===\n');
  console.log('```typescript');
  console.log("import { test } from '@playwright/test';");
  console.log("test('Amazon Search', async ({ page }) => {");
  console.log("  await page.goto('https://www.amazon.com');");
  for (const s of steps) {
    const t = s.target.replace(/'/g, "\\'");
    const v = (s.value || '').replace(/'/g, "\\'");
    if (s.action === 'click') console.log(`  await page.locator('${t}').click();`);
    else if (s.action === 'fill') console.log(`  await page.locator('${t}').fill('${v}');`);
  }
  console.log('});');
  console.log('```\n');

  console.log('=== DONE ===');
  await page.waitForTimeout(3000);
  await context.close();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
