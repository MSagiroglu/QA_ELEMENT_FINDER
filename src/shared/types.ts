export type ActionType = 'click' | 'fill' | 'type' | 'hover' | 'select' | 'assert' | 'wait' | 'navigate' | 'scroll';

export type Framework = 'playwright-ts' | 'cypress-ts' | 'selenium-python';

export type StepResult = 'pending' | 'running' | 'passed' | 'failed' | 'error';

export type FailMode = 'stop' | 'continue';

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
  assertion?: { type: string; expected: string; kind: string };
}

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
