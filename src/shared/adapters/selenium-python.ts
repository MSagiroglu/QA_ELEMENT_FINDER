import type { PageElement, Test } from '../types';

export function generatePageClass(elements: PageElement[], options?: { maskPasswords?: boolean }): string {
  const lines: string[] = [
    `from selenium.webdriver.common.by import By`,
    `from selenium.webdriver.remote.webdriver import WebDriver`,
    `from selenium.webdriver.support.ui import WebDriverWait`,
    `from selenium.webdriver.support import expected_conditions as EC`,
    '',
    `class AppPage:`,
    '',
    `    def __init__(self, driver: WebDriver):`,
    `        self.driver = driver`,
    `        self.wait = WebDriverWait(driver, 10)`,
    '',
    `    # Element Locators`,
    '',
  ];
  for (const el of elements) {
    const name = el.name.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
    const best = el.selectors?.[0];
    const by = best?.strategy === 'xpath' ? 'XPATH' : 'CSS_SELECTOR';
    const sel = best?.selector || el.tagName;
    lines.push(`    ${name}: tuple = (By.${by}, "${sel.replace(/"/g, '\\"')}")`);
  }
  lines.push('');
  return lines.join('\n');
}

export function generateTest(test: Test, options?: { maskPasswords?: boolean }): string {
  const prefix = `test_${test.name.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const lines: string[] = [
    `import pytest`,
    `from selenium import webdriver`,
    `from selenium.webdriver.common.by import By`,
    `from selenium.webdriver.support.ui import WebDriverWait`,
    `from selenium.webdriver.support import expected_conditions as EC`,
    `from selenium.webdriver.common.action_chains import ActionChains`,
    '',
    `class TestRecorded:`,
    '',
    `    def setup_method(self):`,
    `        self.driver = webdriver.Chrome()`,
    `        self.driver.get("${test.url.replace(/"/g, '\\"')}")`,
    `        self.wait = WebDriverWait(self.driver, 10)`,
    '',
    `    def teardown_method(self):`,
    `        self.driver.quit()`,
    '',
  ];
  lines.push(`    def test_actions(self):`);
  for (const s of test.steps) {
    const target = s.target.replace(/"/g, '\\"');
    const safeValue = options?.maskPasswords && s.action === 'fill' ? '********' : (s.value || '').replace(/"/g, '\\"');
    switch (s.action) {
      case 'click': lines.push(`        self.driver.find_element(By.CSS_SELECTOR, "${target}").click()`); break;
      case 'fill': lines.push(`        el = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "${target}")))\n        el.clear()\n        el.send_keys("${safeValue}")`); break;
      case 'hover': lines.push(`        el = self.driver.find_element(By.CSS_SELECTOR, "${target}")\n        ActionChains(self.driver).move_to_element(el).perform()`); break;
      case 'navigate': lines.push(`        self.driver.get("${safeValue}")`); break;
      case 'wait': lines.push(`        import time; time.sleep(${parseInt(s.value || '1')})`); break;
      case 'select': lines.push(`        from selenium.webdriver.support.ui import Select\n        Select(self.driver.find_element(By.CSS_SELECTOR, "${target}")).select_by_visible_text("${safeValue}")`); break;
      case 'assert':
        lines.push(generateSeleniumAssert(target, s.assertion));
        break;
      default: lines.push(`        self.driver.find_element(By.CSS_SELECTOR, "${target}").click()`);
    }
  }
  return lines.join('\n');
}

function escapeStr(v: string) { return (v || '').replace(/"/g, '\\"'); }

function generateSeleniumAssert(target: string, assertion?: { type: string; operator?: string; expected?: string; property?: string }): string {
  if (!assertion) return `        assert self.driver.find_element(By.CSS_SELECTOR, "${escapeStr(target)}").is_displayed()`;
  const loc = `self.driver.find_element(By.CSS_SELECTOR, "${escapeStr(target)}")`;
  const exp = escapeStr(assertion.expected || '');
  const prop = assertion.property || '';

  switch (assertion.type) {
    case 'visible': return `        assert ${loc}.is_displayed()`;
    case 'not-visible': return `        assert not ${loc}.is_displayed()`;
    case 'exists': return `        assert ${loc}`;
    case 'not-exists': return `        assert len(self.driver.find_elements(By.CSS_SELECTOR, "${escapeStr(target)}")) == 0`;
    case 'text': return `        assert ${loc}.text == "${exp}"`;
    case 'not-text': return `        assert ${loc}.text != "${exp}"`;
    case 'contains-text': return `        assert "${exp}" in ${loc}.text`;
    case 'not-contains-text': return `        assert "${exp}" not in ${loc}.text`;
    case 'value': return `        assert ${loc}.get_attribute("value") == "${exp}"`;
    case 'not-value': return `        assert ${loc}.get_attribute("value") != "${exp}"`;
    case 'attribute': return `        assert ${loc}.get_attribute("${escapeStr(prop)}") == "${exp}"`;
    case 'not-attribute': return `        assert ${loc}.get_attribute("${escapeStr(prop)}") != "${exp}"`;
    case 'css-property': return `        assert ${loc}.value_of_css_property("${escapeStr(prop)}") == "${exp}"`;
    case 'css-color': return `        assert ${loc}.value_of_css_property("${escapeStr(prop)}") == "${exp}"`;
    case 'state': {
      const s = escapeStr(prop);
      if (s === 'disabled') return `        assert not ${loc}.is_enabled()`;
      if (s === 'enabled') return `        assert ${loc}.is_enabled()`;
      if (s === 'checked') return `        assert ${loc}.is_selected()`;
      if (s === 'readonly') return `        assert ${loc}.get_attribute("readonly") is not None`;
      return `        assert ${loc}.get_attribute("${s}") is not None`;
    }
    case 'class': return `        assert "${exp}" in ${loc}.get_attribute("class")`;
    case 'not-class': return `        assert "${exp}" not in ${loc}.get_attribute("class")`;
    default: return `        assert ${loc}.is_displayed()`;
  }
}
