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
        lines.push(generateCypressAssert(target, s.assertion));
        break;
      default: lines.push(`    cy.get('${target}').click();`);
    }
  }
  lines.push(`  });`);
  lines.push(`});`);
  return lines.join('\n');
}

function escapeStr(v: string) { return (v || '').replace(/'/g, "\\'"); }

function generateCypressAssert(target: string, assertion?: { type: string; operator?: string; expected?: string; property?: string }): string {
  if (!assertion) return `    cy.get('${escapeStr(target)}').should('exist');`;
  const loc = `cy.get('${escapeStr(target)}')`;
  const exp = escapeStr(assertion.expected || '');
  const prop = assertion.property || '';

  switch (assertion.type) {
    case 'visible': return `    ${loc}.should('be.visible');`;
    case 'not-visible': return `    ${loc}.should('not.be.visible');`;
    case 'exists': return `    ${loc}.should('exist');`;
    case 'not-exists': return `    ${loc}.should('not.exist');`;
    case 'text': return `    ${loc}.should('have.text', '${exp}');`;
    case 'not-text': return `    ${loc}.should('not.have.text', '${exp}');`;
    case 'contains-text': return `    ${loc}.should('contain.text', '${exp}');`;
    case 'not-contains-text': return `    ${loc}.should('not.contain.text', '${exp}');`;
    case 'value': return `    ${loc}.should('have.value', '${exp}');`;
    case 'not-value': return `    ${loc}.should('not.have.value', '${exp}');`;
    case 'attribute': return `    ${loc}.should('have.attr', '${escapeStr(prop)}', '${exp}');`;
    case 'not-attribute': return `    ${loc}.should('not.have.attr', '${escapeStr(prop)}');`;
    case 'css-property': return `    ${loc}.should('have.css', '${escapeStr(prop)}', '${exp}');`;
    case 'css-color': return `    ${loc}.should('have.css', '${escapeStr(prop)}', '${exp}');`;
    case 'state': {
      const s = escapeStr(prop);
      if (s === 'disabled') return `    ${loc}.should('be.disabled');`;
      if (s === 'enabled') return `    ${loc}.should('be.enabled');`;
      if (s === 'checked') return `    ${loc}.should('be.checked');`;
      if (s === 'focused') return `    ${loc}.focused();`;
      if (s === 'readonly') return `    ${loc}.should('have.attr', 'readonly');`;
      return `    ${loc}.should('have.attr', '${s}');`;
    }
    case 'count': {
      const op = assertion.operator || 'eq';
      const matcher = op === 'gt' ? 'be.greaterThan' : op === 'gte' ? 'be.at.least' : op === 'lt' ? 'be.lessThan' : op === 'lte' ? 'be.at.most' : 'eq';
      return `    ${loc}.should('have.length', '${matcher}', ${parseInt(exp)});`;
    }
    case 'class': return `    ${loc}.should('have.class', '${exp}');`;
    case 'not-class': return `    ${loc}.should('not.have.class', '${exp}');`;
    default: return `    ${loc}.should('exist');`;
  }
}
