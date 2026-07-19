export type ActionType = 'click' | 'fill' | 'type' | 'hover' | 'select' | 'assert' | 'wait' | 'navigate' | 'scroll';

export type Framework = 'playwright-ts' | 'cypress-ts' | 'selenium-python' | 'selenium-java' | 'cucumber-java';

export type StepResult = 'pending' | 'running' | 'passed' | 'failed' | 'error';

export type FailMode = 'stop' | 'continue';

export type AssertionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not-contains' | 'matches' | 'color-eq' | 'approx';

export interface SelectorSet {
  strategy: 'data-attribute' | 'role' | 'text' | 'css' | 'xpath';
  selector: string;
  score: number;
  matchCount: number;
}

export interface PageElement {
  name: string;
  tagName: string;
  selectors: SelectorSet[];
  attributes: Record<string, string>;
  text?: string;
}

export interface TestStep {
  id: string;
  action: ActionType;
  target: string;
  value?: string;
  assertion?: AssertionConfig;
}

export interface AssertionConfig {
  type: AssertionType;
  operator: AssertionOperator;
  expected: string;
  property?: string;
}

export type AssertionType =
  | 'visible' | 'not-visible'
  | 'exists' | 'not-exists'
  | 'text' | 'not-text' | 'contains-text' | 'not-contains-text'
  | 'value' | 'not-value'
  | 'attribute' | 'not-attribute'
  | 'css-property'
  | 'css-color'
  | 'dimension'
  | 'position'
  | 'state'
  | 'count'
  | 'class' | 'not-class';

export interface Test {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  steps: TestStep[];
  result?: TestResult;
}

export interface TestResult {
  passed: boolean;
  duration: number;
  stepResults: Array<{ stepId: string; passed: boolean; error?: string }>;
}

export interface PageModel {
  id: string;
  name: string;
  url: string;
  elements: PageElement[];
}

export interface AppSettings {
  framework: Framework;
  timeout: number;
  debounceMs: number;
  failMode: FailMode;
  maskPasswords: boolean;
  indentSpaces: number;
  screenshotEveryStep: boolean;
}

export const ASSERTION_LABELS: Record<AssertionType, string> = {
  'visible': 'Visible',
  'not-visible': 'Not Visible',
  'exists': 'Exists in DOM',
  'not-exists': 'Not in DOM',
  'text': 'Text Equals',
  'not-text': 'Text Not Equals',
  'contains-text': 'Text Contains',
  'not-contains-text': 'Text Not Contains',
  'value': 'Value Equals',
  'not-value': 'Value Not Equals',
  'attribute': 'Attribute Equals',
  'not-attribute': 'Attribute Not Equals',
  'css-property': 'CSS Property',
  'css-color': 'CSS Color',
  'dimension': 'Dimension',
  'position': 'Position',
  'state': 'Element State',
  'count': 'Match Count',
  'class': 'Has CSS Class',
  'not-class': 'No CSS Class',
};

export const ASSERTION_OPERATORS: Record<string, AssertionOperator[]> = {
  'visible': ['eq'],
  'not-visible': ['eq'],
  'exists': ['eq'],
  'not-exists': ['eq'],
  'text': ['eq', 'neq', 'contains', 'not-contains', 'matches'],
  'not-text': ['eq'],
  'contains-text': ['contains', 'matches'],
  'not-contains-text': ['contains'],
  'value': ['eq', 'neq', 'contains', 'not-contains'],
  'not-value': ['eq'],
  'attribute': ['eq', 'neq', 'contains', 'not-contains', 'matches'],
  'not-attribute': ['eq'],
  'css-property': ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'matches', 'approx'],
  'css-color': ['eq', 'neq', 'color-eq'],
  'dimension': ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'approx'],
  'position': ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
  'state': ['eq', 'neq'],
  'count': ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
  'class': ['eq', 'contains', 'matches'],
  'not-class': ['eq'],
};

export function normalizeColor(value: string): string {
  const s = value.trim().toLowerCase();
  // Named colors (subset)
  const named: Record<string, string> = {
    red: '#ff0000', green: '#008000', blue: '#0000ff',
    white: '#ffffff', black: '#000000', gray: '#808080',
    yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
    pink: '#ffc0cb', brown: '#a52a2a', cyan: '#00ffff',
    transparent: 'rgba(0,0,0,0)',
  };
  if (named[s]) return named[s];

  // Hex shorthand #fff -> #ffffff
  if (/^#[0-9a-f]{3}$/.test(s)) return '#' + s[1]+s[1]+s[2]+s[2]+s[3]+s[3];

  // rgb/rgba normalization
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    const r = (+rgb[1]).toString(16).padStart(2,'0');
    const g = (+rgb[2]).toString(16).padStart(2,'0');
    const b = (+rgb[3]).toString(16).padStart(2,'0');
    return `#${r}${g}${b}`;
  }

  return s;
}

export const ASSERTION_PROPERTIES: Record<string, string[]> = {
  'css-property': [
    'color', 'background-color', 'background', 'border-color',
    'font-size', 'font-weight', 'font-family', 'line-height',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin', 'margin-top', 'margin-left', 'margin-right', 'margin-bottom',
    'padding', 'padding-top', 'padding-left', 'padding-right', 'padding-bottom',
    'border-width', 'border-radius', 'border-style',
    'opacity', 'display', 'visibility', 'overflow',
    'position', 'top', 'left', 'right', 'bottom',
    'z-index', 'transform', 'box-shadow', 'text-align',
    'justify-content', 'align-items', 'flex-direction', 'gap',
    'outline', 'outline-color', 'outline-width',
    'cursor', 'pointer-events', 'user-select',
    'transition', 'animation', 'white-space',
  ],
  'css-color': [
    'color', 'background-color', 'border-color', 'outline-color',
    'text-decoration-color', 'caret-color',
  ],
  'dimension': ['width', 'height'],
  'position': ['top', 'left', 'right', 'bottom'],
  'state': ['disabled', 'enabled', 'checked', 'unchecked', 'focused', 'readonly', 'required', 'selected', 'indeterminate'],
  'class': ['class'],
};
