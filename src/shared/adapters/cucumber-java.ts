import type { Test } from '../types';

export function generatePageClass(_elements: any, _options?: { maskPasswords?: boolean }): string {
  return '';
}

function escapeFeat(v: string): string {
  return (v || '').replace(/"/g, '\\"');
}

function stepText(action: string, target: string, value: string | undefined, assertion?: { type: string; expected?: string; property?: string }, mask?: boolean): { keyword: string; text: string } {
  const t = escapeFeat(target);
  const v = mask && action === 'fill' ? '********' : escapeFeat(value || '');
  switch (action) {
    case 'click':
      return { keyword: 'When', text: `I click on "${t}"` };
    case 'fill':
      return { keyword: 'When', text: `I fill "${v}" into "${t}"` };
    case 'hover':
      return { keyword: 'When', text: `I hover over "${t}"` };
    case 'navigate':
      return { keyword: 'Given', text: `I navigate to "${escapeFeat(value || '')}"` };
    case 'wait':
      return { keyword: 'Then', text: `I wait for ${parseInt(value || '1')} seconds` };
    case 'select':
      return { keyword: 'When', text: `I select "${v}" from "${t}"` };
    case 'assert':
      return assertionStep(assertion, t);
    default:
      return { keyword: 'When', text: `I click on "${t}"` };
  }
}

function assertionStep(assertion?: { type: string; operator?: string; expected?: string; property?: string }, target?: string): { keyword: string; text: string } {
  const t = target || '';
  if (!assertion) return { keyword: 'Then', text: `"${t}" should exist` };
  const exp = escapeFeat(assertion.expected || '');
  const prop = assertion.property || '';

  switch (assertion.type) {
    case 'visible': return { keyword: 'Then', text: `"${t}" should be visible` };
    case 'not-visible': return { keyword: 'Then', text: `"${t}" should not be visible` };
    case 'exists': return { keyword: 'Then', text: `"${t}" should exist` };
    case 'not-exists': return { keyword: 'Then', text: `"${t}" should not exist` };
    case 'text': return { keyword: 'Then', text: `"${t}" should have text "${exp}"` };
    case 'not-text': return { keyword: 'Then', text: `"${t}" should not have text "${exp}"` };
    case 'contains-text': return { keyword: 'Then', text: `"${t}" should contain text "${exp}"` };
    case 'not-contains-text': return { keyword: 'Then', text: `"${t}" should not contain text "${exp}"` };
    case 'value': return { keyword: 'Then', text: `"${t}" should have value "${exp}"` };
    case 'not-value': return { keyword: 'Then', text: `"${t}" should not have value "${exp}"` };
    case 'attribute': return { keyword: 'Then', text: `"${t}" attribute "${escapeFeat(prop)}" should be "${exp}"` };
    case 'not-attribute': return { keyword: 'Then', text: `"${t}" attribute "${escapeFeat(prop)}" should not be "${exp}"` };
    case 'css-property': return { keyword: 'Then', text: `"${t}" CSS property "${escapeFeat(prop)}" should be "${exp}"` };
    case 'css-color': return { keyword: 'Then', text: `"${t}" CSS color "${escapeFeat(prop)}" should be "${exp}"` };
    case 'state': return { keyword: 'Then', text: `"${t}" should be "${escapeFeat(prop)}"` };
    case 'count': return { keyword: 'Then', text: `"${t}" should appear ${assertion.operator || 'exactly'} ${exp} times` };
    case 'class': return { keyword: 'Then', text: `"${t}" should have class "${exp}"` };
    case 'not-class': return { keyword: 'Then', text: `"${t}" should not have class "${exp}"` };
    default: return { keyword: 'Then', text: `"${t}" should exist` };
  }
}

export function generateTest(test: Test, options?: { maskPasswords?: boolean }): string {
  const featureName = test.name.replace(/[^a-zA-Z0-9_ ]/g, '').trim() || 'Recorded Test';
  const mask = options?.maskPasswords ?? true;
  const featLines: string[] = [
    `Feature: ${featureName}`,
    ``,
    `  Scenario: ${featureName} - recorded actions`,
  ];
  let lastKeyword = '';
  const stepDefs: string[] = [
    `import io.cucumber.java.en.Given;`,
    `import io.cucumber.java.en.When;`,
    `import io.cucumber.java.en.Then;`,
    `import org.openqa.selenium.By;`,
    `import org.openqa.selenium.WebDriver;`,
    `import org.openqa.selenium.WebElement;`,
    `import org.openqa.selenium.chrome.ChromeDriver;`,
    `import org.openqa.selenium.support.ui.ExpectedConditions;`,
    `import org.openqa.selenium.support.ui.WebDriverWait;`,
    `import org.openqa.selenium.support.ui.Select;`,
    `import org.openqa.selenium.interactions.Actions;`,
    `import java.time.Duration;`,
    ``,
    `public class StepDefinitions {`,
    `    private WebDriver driver;`,
    `    private WebDriverWait wait;`,
    ``,
    `    public StepDefinitions() {`,
    `        driver = new ChromeDriver();`,
    `        wait = new WebDriverWait(driver, Duration.ofSeconds(10));`,
    `    }`,
    ``,
  ];
  const seenSteps = new Set<string>();
  const stepMethods: string[] = [];

  for (const s of test.steps) {
    const target = escapeFeat(s.target);
    const safeValue = mask && s.action === 'fill' ? '********' : (s.value || '');
    const st = stepText(s.action, s.target, s.value, s.assertion, mask);
    const keyword = s === test.steps[0] ? st.keyword : (st.keyword === lastKeyword ? 'And' : st.keyword);
    lastKeyword = st.keyword;
    featLines.push(`    ${keyword} ${st.text}`);

    const methodBody = buildStepMethodBody(s.action, s.target, safeValue, s.assertion);
    if (!seenSteps.has(st.text)) {
      seenSteps.add(st.text);
      stepMethods.push(`    @${st.keyword}("^${st.text.replace(/"/g, '\\\\"')}$")`);
      stepMethods.push(`    public void ${camelCaseStep(st.text)}() {`);
      stepMethods.push(methodBody);
      stepMethods.push(`    }`);
      stepMethods.push('');
    }
  }

  stepDefs.push(...stepMethods);
  stepDefs.push(`    @Given("I navigate to {string}")`);
  stepDefs.push(`    public void iNavigateTo(String url) {`);
  stepDefs.push(`        driver.get(url);`);
  stepDefs.push(`    }`);
  stepDefs.push('');
  stepDefs.push(`    public void quitDriver() {`);
  stepDefs.push(`        if (driver != null) driver.quit();`);
  stepDefs.push(`    }`);
  stepDefs.push(`}`);

  return [
    `// ===== Feature File (${featureName.replace(/ /g, '_')}.feature) =====`,
    ...featLines,
    ``,
    `// ===== Step Definitions (StepDefinitions.java) =====`,
    ...stepDefs,
  ].join('\n');
}

function buildStepMethodBody(action: string, target: string, value: string, assertion?: { type: string; operator?: string; expected?: string; property?: string }): string {
  const t = target.replace(/"/g, '\\"');
  const v = value.replace(/"/g, '\\"');
  switch (action) {
    case 'click':
      return `        driver.findElement(By.cssSelector("${t}")).click();`;
    case 'fill':
      return `        WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("${t}")));\n        el.clear();\n        el.sendKeys("${v}");`;
    case 'hover':
      return `        new Actions(driver).moveToElement(driver.findElement(By.cssSelector("${t}"))).perform();`;
    case 'navigate':
      return `        driver.get("${v}");`;
    case 'wait':
      return `        try { Thread.sleep(${parseInt(value || '1') * 1000}); } catch (InterruptedException ignored) {}`;
    case 'select':
      return `        new Select(driver.findElement(By.cssSelector("${t}"))).selectByVisibleText("${v}");`;
    case 'assert':
      return `        ${cucumberAssertLine(t, assertion)}`;
    default:
      return `        driver.findElement(By.cssSelector("${t}")).click();`;
  }
}

function cucumberAssertLine(target: string, assertion?: { type: string; operator?: string; expected?: string; property?: string }): string {
  if (!assertion) return `assert driver.findElement(By.cssSelector("${target}")).isDisplayed();`;
  const loc = `driver.findElement(By.cssSelector("${target}"))`;
  const exp = (assertion.expected || '').replace(/"/g, '\\"');
  const prop = (assertion.property || '').replace(/"/g, '\\"');

  switch (assertion.type) {
    case 'visible': return `assert ${loc}.isDisplayed();`;
    case 'not-visible': return `assert !${loc}.isDisplayed();`;
    case 'exists': return `assert ${loc} != null;`;
    case 'not-exists': return `assert driver.findElements(By.cssSelector("${target}")).isEmpty();`;
    case 'text': return `assert ${loc}.getText().equals("${exp}");`;
    case 'not-text': return `assert !${loc}.getText().equals("${exp}");`;
    case 'contains-text': return `assert ${loc}.getText().contains("${exp}");`;
    case 'not-contains-text': return `assert !${loc}.getText().contains("${exp}");`;
    case 'value': return `assert ${loc}.getAttribute("value").equals("${exp}");`;
    case 'not-value': return `assert !${loc}.getAttribute("value").equals("${exp}");`;
    case 'attribute': return `assert ${loc}.getAttribute("${prop}").equals("${exp}");`;
    case 'not-attribute': return `assert ${loc}.getAttribute("${prop}") == null || !${loc}.getAttribute("${prop}").equals("${exp}");`;
    case 'css-property': return `assert ${loc}.getCssValue("${prop}").equals("${exp}");`;
    case 'css-color': return `assert ${loc}.getCssValue("${prop}").equals("${exp}");`;
    case 'state': {
      if (prop === 'disabled') return `assert !${loc}.isEnabled();`;
      if (prop === 'enabled') return `assert ${loc}.isEnabled();`;
      if (prop === 'checked') return `assert ${loc}.isSelected();`;
      if (prop === 'focused') return `assert ${loc}.equals(driver.switchTo().activeElement());`;
      if (prop === 'readonly') return `assert ${loc}.getAttribute("readonly") != null;`;
      return `assert ${loc}.getAttribute("${prop}") != null;`;
    }
    case 'class': return `assert ${loc}.getAttribute("class").contains("${exp}");`;
    case 'not-class': return `assert !${loc}.getAttribute("class").contains("${exp}");`;
    default: return `assert ${loc}.isDisplayed();`;
  }
}

function camelCaseStep(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}
