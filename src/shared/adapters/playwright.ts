import type { PageElement, Test } from '../types';

function escapeValue(val: string): string {
  return JSON.stringify(val);
}

function selectorString(sel: PageElement): string {
  const best = sel.selectors?.[0];
  if (!best) return `page.locator('${CSS.escape(sel.tagName)}')`;
  switch (best.strategy) {
    case 'data-attribute': return `page.locator('${best.selector.replace(/'/g, "\\'")}')`;
    case 'role': {
      const match = best.selector.match(/\[role="([^"]+)"\]/);
      const role = match ? match[1] : sel.tagName;
      const nameMatch = best.selector.match(/\[aria-label="([^"]+)"\]/);
      if (nameMatch) return `page.getByRole('${role}', { name: ${escapeValue(nameMatch[1])} })`;
      return `page.getByRole('${role}')`;
    }
    case 'text': return `page.getByText(${escapeValue(sel.text || '')})`;
    default: return `page.locator('${best.selector.replace(/'/g, "\\'")}')`;
  }
}

export function generatePageClass(elements: PageElement[], options?: { maskPasswords?: boolean }): string {
  const className = 'AppPage';
  const lines: string[] = [`import { Page, Locator } from '@playwright/test';`, '', `export class ${className} {`, `  constructor(private page: Page) {}`, ''];
  for (const el of elements) {
    const name = el.name.replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`  get ${name}(): Locator {`);
    lines.push(`    return ${selectorString(el)};`);
    lines.push(`  }`);
    lines.push('');
  }
  lines.push(`}`);
  return lines.join('\n');
}

export function generateTest(test: Test, options?: { maskPasswords?: boolean }): string {
  const lines: string[] = [
    `import { test, expect } from '@playwright/test';`,
    `import { AppPage } from './app-page';`,
    '',
    `test('${test.name.replace(/'/g, "\\'")}', async ({ page }) => {`,
    `  const appPage = new AppPage(page);`,
    `  await page.goto('${test.url.replace(/'/g, "\\'")}');`,
    '',
  ];
  for (const s of test.steps) {
    const target = s.target.replace(/'/g, "\\'");
    const safeValue = options?.maskPasswords && s.action === 'fill' ? '********' : (s.value || '').replace(/'/g, "\\'");
    switch (s.action) {
      case 'click': lines.push(`  await page.locator('${target}').click();`); break;
      case 'fill': lines.push(`  await page.locator('${target}').fill('${safeValue}');`); break;
      case 'hover': lines.push(`  await page.locator('${target}').hover();`); break;
      case 'navigate': lines.push(`  await page.goto('${safeValue}');`); break;
      case 'wait': lines.push(`  await page.waitForTimeout(${parseInt(s.value || '1000')});`); break;
      case 'select': lines.push(`  await page.locator('${target}').selectOption('${safeValue}');`); break;
      case 'assert':
        lines.push(generatePlaywrightAssert(target, s.assertion));
        break;
      default: lines.push(`  await page.locator('${target}').click();`);
    }
  }
  lines.push('});');
  return lines.join('\n');
}

function escapeStr(v: string) { return (v || '').replace(/'/g, "\\'"); }

function generatePlaywrightAssert(target: string, assertion?: { type: string; operator?: string; expected?: string; property?: string }): string {
  if (!assertion) return `  await expect(page.locator('${escapeStr(target)}')).toBeVisible();`;
  const loc = `page.locator('${escapeStr(target)}')`;
  const exp = escapeStr(assertion.expected || '');
  const prop = assertion.property || '';

  switch (assertion.type) {
    case 'visible': return `  await expect(${loc}).toBeVisible();`;
    case 'not-visible': return `  await expect(${loc}).not.toBeVisible();`;
    case 'exists': return `  await expect(${loc}).toBeAttached();`;
    case 'not-exists': return `  await expect(${loc}).not.toBeAttached();`;
    case 'text': return `  await expect(${loc}).toHaveText('${exp}');`;
    case 'not-text': return `  await expect(${loc}).not.toHaveText('${exp}');`;
    case 'contains-text': return `  await expect(${loc}).toContainText('${exp}');`;
    case 'not-contains-text': return `  await expect(${loc}).not.toContainText('${exp}');`;
    case 'value': return `  await expect(${loc}).toHaveValue('${exp}');`;
    case 'not-value': return `  await expect(${loc}).not.toHaveValue('${exp}');`;
    case 'attribute': return `  await expect(${loc}).toHaveAttribute('${escapeStr(prop)}', '${exp}');`;
    case 'not-attribute': return `  await expect(${loc}).not.toHaveAttribute('${escapeStr(prop)}', '${exp}');`;
    case 'css-property': return `  await expect(${loc}).toHaveCSS('${escapeStr(prop)}', '${exp}');`;
    case 'css-color': return `  await expect(${loc}).toHaveCSS('${escapeStr(prop)}', '${exp}');`;
    case 'dimension': {
      const op = assertion.operator || 'eq';
      if (op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte') {
        const fn = op === 'gt' ? 'toBeGreaterThan' : op === 'gte' ? 'toBeGreaterThanOrEqual' : op === 'lt' ? 'toBeLessThan' : 'toBeLessThanOrEqual';
        return `  await expect(${loc}.boundingBox()).resolves.toHaveProperty('${escapeStr(prop)}');\n  await expect(${loc}.boundingBox()).resolves.${fn}(${parseFloat(exp)});`;
      }
      return `  await expect(${loc}).toHaveCSS('${escapeStr(prop)}', '${exp}px');`;
    }
    case 'state': {
      const s = escapeStr(prop);
      if (s === 'disabled') return `  await expect(${loc}).toBeDisabled();`;
      if (s === 'enabled') return `  await expect(${loc}).toBeEnabled();`;
      if (s === 'checked') return `  await expect(${loc}).toBeChecked();`;
      if (s === 'focused') return `  await expect(${loc}).toBeFocused();`;
      if (s === 'readonly') return `  await expect(${loc}).toHaveAttribute('readonly', '');`;
      if (s === 'required') return `  await expect(${loc}).toHaveAttribute('required', '');`;
      return `  await expect(${loc}).toHaveAttribute('${s}', '');`;
    }
    case 'count': {
      const op = assertion.operator || 'eq';
      const matcher = op === 'gt' ? 'toBeGreaterThan' : op === 'gte' ? 'toBeGreaterThanOrEqual' : op === 'lt' ? 'toBeLessThan' : op === 'lte' ? 'toBeLessThanOrEqual' : 'toBe';
      return `  await expect(page.locator('${escapeStr(target)}')).${matcher}(${parseInt(exp)});`;
    }
    case 'class': return `  await expect(${loc}).toHaveClass(/${exp}/);`;
    case 'not-class': return `  await expect(${loc}).not.toHaveClass(/${exp}/);`;
    default: return `  await expect(${loc}).toBeVisible();`;
  }
}
