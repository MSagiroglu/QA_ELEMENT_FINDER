import type { PageElement, Test } from '../types';

export function generatePageClass(elements: PageElement[], options?: { maskPasswords?: boolean }): string {
  const lines: string[] = [
    `import org.openqa.selenium.By;`,
    `import org.openqa.selenium.WebDriver;`,
    `import org.openqa.selenium.WebElement;`,
    `import org.openqa.selenium.support.FindBy;`,
    `import org.openqa.selenium.support.PageFactory;`,
    `import org.openqa.selenium.support.ui.WebDriverWait;`,
    `import java.time.Duration;`,
    ``,
    `public class AppPage {`,
    `    private final WebDriver driver;`,
    `    private final WebDriverWait wait;`,
    ``,
    `    public AppPage(WebDriver driver) {`,
    `        this.driver = driver;`,
    `        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));`,
    `        PageFactory.initElements(driver, this);`,
    `    }`,
    ``,
    `    // Element Locators`,
    ``,
  ];
  for (const el of elements) {
    const name = el.name.replace(/[^a-zA-Z0-9_]/g, '_');
    const best = el.selectors?.[0];
    const by = best?.strategy === 'xpath' ? "xpath" : "cssSelector";
    const sel = best?.selector || el.tagName;
    const safeSel = sel.replace(/"/g, '\\"');
    lines.push(`    private By ${name} = By.${by}("${safeSel}");`);
  }
  lines.push(``);
  for (const el of elements) {
    const name = el.name.replace(/[^a-zA-Z0-9_]/g, '_');
    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    lines.push(`    public WebElement ${name}() {`);
    lines.push(`        return driver.findElement(${name});`);
    lines.push(`    }`);
    lines.push(``);
  }
  lines.push(`    public AppPage navigate() {`);
  lines.push(`        return this;`);
  lines.push(`    }`);
  lines.push(`}`);
  return lines.join('\n');
}

export function generateTest(test: Test, options?: { maskPasswords?: boolean }): string {
  const className = `RecordedTest`;
  const lines: string[] = [
    `import org.junit.jupiter.api.AfterEach;`,
    `import org.junit.jupiter.api.BeforeEach;`,
    `import org.junit.jupiter.api.Test;`,
    `import org.openqa.selenium.By;`,
    `import org.openqa.selenium.WebDriver;`,
    `import org.openqa.selenium.WebElement;`,
    `import org.openqa.selenium.chrome.ChromeDriver;`,
    `import org.openqa.selenium.support.ui.ExpectedConditions;`,
    `import org.openqa.selenium.support.ui.WebDriverWait;`,
    `import org.openqa.selenium.interactions.Actions;`,
    `import java.time.Duration;`,
    ``,
    `public class ${className} {`,
    `    private WebDriver driver;`,
    `    private WebDriverWait wait;`,
    ``,
    `    @BeforeEach`,
    `    public void setUp() {`,
    `        driver = new ChromeDriver();`,
    `        wait = new WebDriverWait(driver, Duration.ofSeconds(10));`,
    `        driver.get("${test.url.replace(/"/g, '\\"')}");`,
    `    }`,
    ``,
    `    @AfterEach`,
    `    public void tearDown() {`,
    `        if (driver != null) driver.quit();`,
    `    }`,
    ``,
    `    @Test`,
    `    public void testActions() {`,
  ];
  for (const s of test.steps) {
    const target = s.target.replace(/"/g, '\\"');
    const safeValue = options?.maskPasswords && s.action === 'fill' ? '********' : (s.value || '').replace(/"/g, '\\"');
    switch (s.action) {
      case 'click':
        lines.push(`        driver.findElement(By.cssSelector("${target}")).click();`);
        break;
      case 'fill':
        lines.push(`        WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("${target}")));`);
        lines.push(`        el.clear();`);
        lines.push(`        el.sendKeys("${safeValue}");`);
        break;
      case 'hover':
        lines.push(`        WebElement el = driver.findElement(By.cssSelector("${target}"));`);
        lines.push(`        new Actions(driver).moveToElement(el).perform();`);
        break;
      case 'navigate':
        lines.push(`        driver.get("${safeValue}");`);
        break;
      case 'wait':
        lines.push(`        try { Thread.sleep(${parseInt(s.value || '1') * 1000}); } catch (InterruptedException ignored) {}`);
        break;
      case 'select':
        lines.push(`        new org.openqa.selenium.support.ui.Select(driver.findElement(By.cssSelector("${target}"))).selectByVisibleText("${safeValue}");`);
        break;
      case 'assert':
        lines.push(generateJavaAssert(target, s.assertion));
        break;
      default:
        lines.push(`        driver.findElement(By.cssSelector("${target}")).click();`);
    }
  }
  lines.push(`    }`);
  lines.push(`}`);
  return lines.join('\n');
}

function esc(v: string) { return (v || '').replace(/"/g, '\\"'); }

function generateJavaAssert(target: string, assertion?: { type: string; operator?: string; expected?: string; property?: string }): string {
  if (!assertion) return `        assert driver.findElement(By.cssSelector("${esc(target)}")).isDisplayed();`;
  const loc = `driver.findElement(By.cssSelector("${esc(target)}"))`;
  const exp = esc(assertion.expected || '');
  const prop = assertion.property || '';

  switch (assertion.type) {
    case 'visible': return `        assert ${loc}.isDisplayed();`;
    case 'not-visible': return `        assert !${loc}.isDisplayed();`;
    case 'exists': return `        assert ${loc} != null;`;
    case 'not-exists': return `        assert driver.findElements(By.cssSelector("${esc(target)}")).isEmpty();`;
    case 'text': return `        assert ${loc}.getText().equals("${exp}");`;
    case 'not-text': return `        assert !${loc}.getText().equals("${exp}");`;
    case 'contains-text': return `        assert ${loc}.getText().contains("${exp}");`;
    case 'not-contains-text': return `        assert !${loc}.getText().contains("${exp}");`;
    case 'value': return `        assert ${loc}.getAttribute("value").equals("${exp}");`;
    case 'not-value': return `        assert !${loc}.getAttribute("value").equals("${exp}");`;
    case 'attribute': return `        assert ${loc}.getAttribute("${esc(prop)}").equals("${exp}");`;
    case 'not-attribute': return `        assert ${loc}.getAttribute("${esc(prop)}") == null || !${loc}.getAttribute("${esc(prop)}").equals("${exp}");`;
    case 'css-property': return `        assert ${loc}.getCssValue("${esc(prop)}").equals("${exp}");`;
    case 'css-color': return `        assert ${loc}.getCssValue("${esc(prop)}").equals("${exp}");`;
    case 'state': {
      const s = esc(prop);
      if (s === 'disabled') return `        assert !${loc}.isEnabled();`;
      if (s === 'enabled') return `        assert ${loc}.isEnabled();`;
      if (s === 'checked') return `        assert ${loc}.isSelected();`;
      if (s === 'focused') return `        assert ${loc}.equals(driver.switchTo().activeElement());`;
      if (s === 'readonly') return `        assert ${loc}.getAttribute("readonly") != null;`;
      return `        assert ${loc}.getAttribute("${s}") != null;`;
    }
    case 'class': return `        assert ${loc}.getAttribute("class").contains("${exp}");`;
    case 'not-class': return `        assert !${loc}.getAttribute("class").contains("${exp}");`;
    default: return `        assert ${loc}.isDisplayed();`;
  }
}
