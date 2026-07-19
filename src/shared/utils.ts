import { generateUniqueSelectorsDeep, getBestSelector } from './selector-engine';

export function extractQuickSelector(el: Element): string {
  const best = getBestSelector(el);
  if (best) return best.selector;

  const attrs = ['data-testid', 'data-test-id', 'data-cy', 'data-qa', 'data-test'];
  for (const attr of attrs) {
    const val = el.getAttribute(attr);
    if (val) return `[${attr}="${val}"]`;
  }
  if (el.id) return `#${CSS.escape(el.id)}`;
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).slice(0, 2);
  if (classes.length > 0) return `${tag}.${classes.join('.')}`;
  return tag;
}

export function extractRecordedStep(el: Element, action: string, value?: string) {
  const selectors = generateUniqueSelectorsDeep(el);
  const best = selectors[0];
  return {
    action,
    target: best?.selector || extractQuickSelector(el),
    value,
    selectors,
    isUnique: best !== undefined,
    timestamp: Date.now(),
  };
}
