import type { PageElement, Test, Framework } from './types';
import { getGenerator } from './pom-generator';

export function generatePageModelCode(
  framework: Framework,
  elements: PageElement[]
): string {
  const adapter = getGenerator(framework);
  return adapter.generatePageClass(elements);
}

export function generateTestCode(
  framework: Framework,
  test: Test,
  maskPasswords: boolean = true
): string {
  const adapter = getGenerator(framework);
  return adapter.generateTest(test, { maskPasswords });
}

export function generateCombinedCode(
  framework: Framework,
  elements: PageElement[],
  test: Test,
  maskPasswords: boolean = true
): string {
  const parts: string[] = [];

  if (elements.length > 0) {
    parts.push(generatePageModelCode(framework, elements));
    parts.push('');
  }

  if (test.steps.length > 0) {
    parts.push(generateTestCode(framework, test, maskPasswords));
  }

  return parts.join('\n');
}
