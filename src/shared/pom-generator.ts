import type { PageElement, Test, Framework } from './types';
import * as playwright from './adapters/playwright';
import * as cypress from './adapters/cypress';
import * as selenium from './adapters/selenium-python';
import * as java from './adapters/selenium-java';

export interface POMGeneratorAdapter {
  generatePageClass(elements: PageElement[], options?: { maskPasswords?: boolean }): string;
  generateTest(test: Test, options?: { maskPasswords?: boolean }): string;
}

export interface CombinedOutput {
  pageClass: string;
  testFile: string;
  combined: string;
}

const adapters: Record<Framework, POMGeneratorAdapter> = {
  'playwright-ts': playwright,
  'cypress-ts': cypress,
  'selenium-python': selenium,
  'selenium-java': java,
};

export function getGenerator(framework: Framework): POMGeneratorAdapter {
  const adapter = adapters[framework];
  if (!adapter) throw new Error(`Unknown framework: ${framework}`);
  return adapter;
}

export function generatePageClass(elements: PageElement[], framework: Framework): string {
  return getGenerator(framework).generatePageClass(elements);
}

export function generateTest(test: Test, framework: Framework): string {
  return getGenerator(framework).generateTest(test);
}
