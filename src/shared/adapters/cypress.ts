import type { PageElement, Test } from '../types';

function escapeValue(val: string): string {
  return JSON.stringify(val);
}

export function generatePageClass(elements: PageElement[], options?: { maskPasswords?: boolean }): string {
  const className = 'AppPage';
  const lines: string[] = [`class ${className} {`, ''];
  for (const el of elements) {
    const name = el.name.replace(/[^a-zA-Z0-9_]/g, '_');
    const best = el.selectors?.[0];
    const sel = best?.selector || el.tagName;
    lines.push(`  get ${name}() {`);
    lines.push(`    return cy.get('${sel.replace(/'/g, "\\'")}');`);
    lines.push(`  }`);
    lines.push('');
  }
  lines.push(`}`);
  lines.push('');
  lines.push(`export default ${className};`);
  return lines.join('\n');
}

export function generateTest(test: Test, options?: { maskPasswords?: boolean }): string {
  const lines: string[] = [
    `describe('${test.name.replace(/'/g, "\\'")}', () => {`,
    `  it('performs recorded actions', () => {`,
  ];
  for (const s of test.steps) {
    const target = s.target.replace(/'/g, "\\'");
    const safeValue = options?.maskPasswords && s.action === 'fill' ? '********' : (s.value || '').replace(/'/g, "\\'");
    switch (s.action) {
      case 'click': lines.push(`    cy.get('${target}').click();`); break;
      case 'fill': lines.push(`    cy.get('${target}').clear().type('${safeValue}', { delay: 50 });`); break;
      case 'hover': lines.push(`    cy.get('${target}').trigger('mouseover');`); break;
      case 'navigate': lines.push(`    cy.visit('${safeValue}');`); break;
      case 'wait': lines.push(`    cy.wait(${parseInt(s.value || '1000')});`); break;
      case 'select': lines.push(`    cy.get('${target}').select('${safeValue}');`); break;
      case 'assert':
        if (s.assertion?.type === 'visible') lines.push(`    cy.get('${target}').should('be.visible');`);
        else if (s.assertion?.type === 'text') lines.push(`    cy.get('${target}').should('have.text', '${(s.assertion.expected || '').replace(/'/g, "\\'")}');`);
        else lines.push(`    cy.get('${target}').should('exist');`);
        break;
      default: lines.push(`    cy.get('${target}').click();`);
    }
  }
  lines.push(`  });`);
  lines.push(`});`);
  return lines.join('\n');
}
