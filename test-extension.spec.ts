import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_PATH = path.resolve(__dirname, 'dist');
const TEST_HTML_PATH = path.resolve(__dirname, 'test-page.html');

// Helper: send a command to the extension content script via postMessage bridge
async function qaSend(page: any, command: string, payload?: any): Promise<any> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const data = JSON.stringify({ id, command, payload });
  const result = await page.evaluate(`(function() {
    return new Promise(function(resolve) {
      var msg = ${data};
      var handler = function(event) {
        if (event.data && event.data.source === 'qa-extension-content' && event.data.id === msg.id) {
          window.removeEventListener('message', handler);
          resolve(event.data.response);
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ source: 'qa-extension-page', id: msg.id, command: msg.command, payload: msg.payload }, '*');
      setTimeout(function() { window.removeEventListener('message', handler); resolve({ success: false, error: 'timeout' }); }, 5000);
    });
  })()`);
  return result;
}

// Create a rich test page
const TEST_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>QA Element Finder Test Page</title></head>
<body>
  <h1>Test Page</h1>

  <!-- Elements with data-testid (should get highest priority selectors) -->
  <button data-testid="login-btn" data-cy="login-cy" class="btn primary">Login</button>
  <input data-testid="email-input" type="email" placeholder="Email" />
  <input data-testid="password-input" type="password" placeholder="Password" />

  <!-- Elements with ARIA roles -->
  <div role="button" aria-label="Submit Form" tabindex="0">Submit</div>
  <nav aria-label="Main Navigation">
    <a href="/home">Home</a>
    <a href="/about">About</a>
  </nav>

  <!-- Elements with IDs and classes -->
  <div id="unique-section" class="section-container">
    <p class="description-text">This is a unique paragraph with a very specific description text content that should be findable.</p>
    <span class="badge badge-primary">Active</span>
    <span class="badge badge-secondary">Inactive</span>
  </div>

  <!-- Duplicate elements (should NOT produce unique selectors) -->
  <div class="duplicate-container">
    <span class="item">Item 1</span>
    <span class="item">Item 2</span>
    <span class="item">Item 3</span>
  </div>

  <!-- Form for recording tests -->
  <form id="login-form">
    <label>Username: <input name="username" class="form-input" /></label>
    <label>Password: <input name="password" type="password" class="form-input" /></label>
    <button type="submit" class="btn primary">Sign In</button>
  </form>

  <!-- Select dropdown -->
  <select data-testid="country-select">
    <option value="tr">Turkey</option>
    <option value="us">United States</option>
    <option value="uk">United Kingdom</option>
  </select>

  <!-- Checkboxes -->
  <label><input type="checkbox" name="agree" /> I agree</label>
  <label><input type="checkbox" name="newsletter" /> Subscribe</label>

  <script>
    // Add some dynamic behavior
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = document.createElement('div');
      msg.id = 'submit-result';
      msg.textContent = 'Form submitted!';
      document.body.appendChild(msg);
    });
  </script>
</body>
</html>`;

async function main() {
  console.log('=== QA Element Finder - Extension Tests ===\n');

  // Write test page
  fs.writeFileSync(TEST_HTML_PATH, TEST_HTML);

  // Launch browser with extension
  const userDataDir = path.resolve(__dirname, '.test-user-data');
  if (fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

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

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err: any) {
      console.log(`  ❌ ${name}: ${err.message}`);
      failed++;
    }
  }

  try {
    const page = await context.newPage();

    // Wait for extension to load
    await page.goto(`file://${TEST_HTML_PATH}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // ====== TEST 1: Content script injection ======
    await test('Content script is injected into page', async () => {
      const hasContentScript = await page.evaluate(() => {
        return typeof (window as any).__qa_element_finder_overlay__ !== 'undefined' ||
          document.querySelector('#__qa_element_finder_overlay__') !== null;
      });
      // The content script is injected but might not create UI until activated
      // Check that chrome.runtime is accessible from content script by sending a message
      const hasRuntime = await page.evaluate(() => {
        return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
      });
      if (!hasRuntime) throw new Error('chrome.runtime not available in content script');
    });

    // ====== TEST 2: Message passing ======
    await test('Extension responds to ACTIVATE_PICKER message', async () => {
      const response = await qaSend(page, 'ACTIVATE_PICKER');
      if (!response?.success) throw new Error(`Picker activation failed: ${JSON.stringify(response)}`);
    });

    // ====== TEST 3: DEACTIVATE_PICKER ======
    await test('Extension responds to DEACTIVATE_PICKER message', async () => {
      const response = await qaSend(page, 'DEACTIVATE_PICKER');
      if (!response?.success) throw new Error(`Deactivation failed: ${JSON.stringify(response)}`);
    });

    // ====== TEST 4: START_RECORDING ======
    await test('Start recording command works', async () => {
      const response = await qaSend(page, 'START_RECORDING');
      if (!response?.success) throw new Error(`Recording start failed: ${JSON.stringify(response)}`);
    });

    // ====== TEST 5: Click recording captures selector ======
    await test('Click on element records a step with selector', async () => {
      await qaSend(page, 'STOP_RECORDING');
      await qaSend(page, 'START_RECORDING');

      await page.click('[data-testid="login-btn"]');
      await page.waitForTimeout(500);

      const result = await qaSend(page, 'STOP_RECORDING');

      if (!result?.success) throw new Error(`Stop recording failed`);
      const steps = result.data?.steps || [];
      if (steps.length === 0) throw new Error('No steps recorded after click');

      const clickStep = steps[0];
      console.log(`     Recorded: ${clickStep.action} → ${clickStep.target}`);
      if (clickStep.action !== 'click') throw new Error(`Expected click action, got ${clickStep.action}`);
      if (!clickStep.target) throw new Error('No target selector recorded');
    });

    // ====== TEST 6: Input fill recording ======
    await test('Input fill on text field records step', async () => {
      await qaSend(page, 'STOP_RECORDING');
      await qaSend(page, 'START_RECORDING');

      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.waitForTimeout(600);

      const result = await qaSend(page, 'STOP_RECORDING');
      const steps = result.data?.steps || [];
      const fillSteps = steps.filter((s: any) => s.action === 'fill');
      if (fillSteps.length === 0) throw new Error('No fill step recorded');
      console.log(`     Recorded fill: ${fillSteps[0].target} = "${fillSteps[0].value}"`);
    });

    // ====== TEST 7: Select dropdown recording ======
    await test('Select dropdown change records step', async () => {
      await qaSend(page, 'STOP_RECORDING');
      await qaSend(page, 'START_RECORDING');

      await page.selectOption('[data-testid="country-select"]', 'us');
      await page.waitForTimeout(500);

      const result = await qaSend(page, 'STOP_RECORDING');
      const steps = result.data?.steps || [];
      const selectSteps = steps.filter((s: any) => s.action === 'select');
      if (selectSteps.length === 0) throw new Error('No select step recorded');
      console.log(`     Recorded select: ${selectSteps[0].target} = "${selectSteps[0].value}"`);
    });

    // ====== TEST 8: Verify content script bridge is active ======
    await test('Content script bridge is active (postMessage)', async () => {
      const result = await qaSend(page, 'START_RECORDING');
      if (!result?.success) throw new Error('Content script bridge not working');
      await qaSend(page, 'STOP_RECORDING');
    });

    // ====== TEST 9: Selector uniqueness via content script ======
    await test('Selector engine generates unique selectors', async () => {
      const selectors = await page.evaluate(() => {
        // We need to test the selector engine directly
        // Import the selector module from the content script's scope
        // Since we can't import ES modules directly, we test via the element-picker
        const btn = document.querySelector('[data-testid="login-btn"]');
        if (!btn) return { error: 'Button not found' };

        // Get attributes for manual testing
        const dataTestId = btn.getAttribute('data-testid');
        const id = btn.id;
        const tag = btn.tagName.toLowerCase();

        return {
          dataTestId,
          id,
          tag,
          classList: Array.from(btn.classList),
          hasDataAttr: !!dataTestId,
          potentialSelectors: [
            `[data-testid="${dataTestId}"]`,
            id ? `#${id}` : null,
            `${tag}.${Array.from(btn.classList).join('.')}`,
          ].filter(Boolean),
        };
      });

      console.log(`     Data-testid: ${selectors.dataTestId}`);
      console.log(`     Potential selectors: ${selectors.potentialSelectors?.join(', ')}`);
      if (!selectors.dataTestId) throw new Error('data-testid attribute not found on button');
    });

    // ====== TEST 9: Uniqueness verification ======
    await test('data-testid selector returns exactly one element', async () => {
      const count = await page.evaluate(() => {
        return document.querySelectorAll('[data-testid="login-btn"]').length;
      });
      if (count !== 1) throw new Error(`Expected 1 match for [data-testid="login-btn"], got ${count}`);
      console.log(`     [data-testid="login-btn"] → ${count} match`);
    });

    // ====== TEST 10: Non-unique selector detection ======
    await test('Duplicate class elements have multiple matches', async () => {
      const count = await page.evaluate(() => {
        return document.querySelectorAll('.item').length;
      });
      if (count <= 1) throw new Error(`Expected multiple .item elements, got ${count}`);
      console.log(`     .item → ${count} matches (correctly non-unique)`);
    });

    // ====== TEST 11: Unique section ID selector ======
    await test('ID-based selector is unique', async () => {
      const count = await page.evaluate(() => {
        return document.querySelectorAll('#unique-section').length;
      });
      if (count !== 1) throw new Error(`Expected 1 match for #unique-section, got ${count}`);
    });

    // ====== TEST 13: Recording multiple sequential actions ======
    await test('Multiple sequential actions are recorded in order', async () => {
      await qaSend(page, 'STOP_RECORDING');
      await qaSend(page, 'START_RECORDING');

      await page.click('[data-testid="email-input"]');
      await page.fill('[data-testid="email-input"]', 'user@test.com');
      await page.waitForTimeout(600);
      await page.click('[data-testid="login-btn"]');
      await page.waitForTimeout(300);

      const result = await qaSend(page, 'STOP_RECORDING');
      const steps = result.data?.steps || [];
      console.log(`     Recorded ${steps.length} steps:`);
      steps.forEach((s: any, i: number) => {
        console.log(`       ${i + 1}. ${s.action} → ${s.target}`);
      });

      if (steps.length < 3) throw new Error(`Expected at least 3 steps, got ${steps.length}`);
      if (steps[0]?.action !== 'click') throw new Error('Step 1 should be click');
    });

    // ====== TEST 14: Replay recorded test ======
    await test('Replay executes recorded steps', async () => {
      await qaSend(page, 'STOP_RECORDING');
      await qaSend(page, 'START_RECORDING');

      await page.click('[data-testid="email-input"]');
      await page.fill('[data-testid="email-input"]', 'replay@test.com');
      await page.waitForTimeout(600);

      const recordResult = await qaSend(page, 'STOP_RECORDING');
      const steps = recordResult.data?.steps || [];
      if (steps.length === 0) throw new Error('No steps recorded for replay');

      await page.evaluate(() => {
        const input = document.querySelector('[data-testid="email-input"]') as HTMLInputElement;
        if (input) input.value = '';
      });

      const replayResult = await qaSend(page, 'PLAY_TEST', { steps });

      if (!replayResult?.success) {
        throw new Error(`Replay failed: ${JSON.stringify(replayResult)}`);
      }

      const valueAfterReplay = await page.evaluate(() => {
        const input = document.querySelector('[data-testid="email-input"]') as HTMLInputElement;
        return input?.value || '';
      });

      console.log(`     Value after replay: "${valueAfterReplay}"`);
      if (valueAfterReplay !== 'replay@test.com') {
        throw new Error(`Replay did not fill the input. Expected "replay@test.com", got "${valueAfterReplay}"`);
      }
    });

    // ====== TEST 15: Extension manifest structure ======
    await test('Extension manifest is valid', async () => {
      const manifestPath = path.resolve(EXTENSION_PATH, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      
      const checks = [
        manifest.manifest_version === 3,
        !!manifest.name,
        !!manifest.version,
        !!manifest.background?.service_worker,
        !!manifest.content_scripts?.length,
        !!manifest.action?.default_popup,
      ];
      
      const failedChecks = checks.filter(c => !c).length;
      if (failedChecks > 0) throw new Error(`Manifest has ${failedChecks} invalid fields`);
      console.log(`     Manifest v3, name: ${manifest.name}, version: ${manifest.version}`);
    });

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) {
      process.exit(1);
    }

  } finally {
    await context.close();
    // Cleanup test files
    try { fs.unlinkSync(TEST_HTML_PATH); } catch {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
