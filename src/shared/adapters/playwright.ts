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
        if (s.assertion?.type === 'visible') lines.push(`  await expect(page.locator('${target}')).toBeVisible();`);
        else if (s.assertion?.type === 'text') lines.push(`  await expect(page.locator('${target}')).toHaveText('${(s.assertion.expected || '').replace(/'/g, "\\'")}');`);
        else if (s.assertion?.type === 'attribute') lines.push(`  await expect(page.locator('${target}')).toHaveAttribute('${(s.assertion.expected || '').replace(/'/g, "\\'")}');`);
        else lines.push(`  await expect(page.locator('${target}')).toBeVisible();`);
        break;
      default: lines.push(`  await page.locator('${target}').click();`);
    }
  }
  lines.push('});');
  return lines.join('\n');
}
