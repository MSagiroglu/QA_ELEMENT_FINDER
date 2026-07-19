# QA Element Finder

**Cross-browser QA test aracı — Element Inspector, Selector Engine, Action Recorder, Replay ve POM Code Generator.**

> Bu uzantı, QA mühendislerinin element seçici (selector) bulma, test aksiyonu kaydetme, kaydı tekrar oynatma ve Playwright / Cypress / Selenium için Page Object Model (POM) kodu üretme işlemlerini tek bir araçta birleştirir.

---

## 📋 İçindekiler

- [Nedir? Ne işe yarar?](#-nedir-ne-işe-yarar)
- [Özellikler](#-özellikler)
- [Kurulum](#-kurulum)
- [Gizli Mod (Incognito)](#-gizli-mod-incognito)
- [Kullanım Kılavuzu](#-kullanım-kılavuzu)
- [Uygulamalarıma Entegrasyon](#-uygulamalarıma-entegrasyon)
- [Mimari ve Çalışma Prensibi](#-mimari-ve-çalışma-prensibi)
- [Yapılandırma](#-yapılandırma)
- [Güvenlik](#-güvenlik)
- [Test Edilen Platformlar](#-test-edilen-platformlar)
- [Geliştirme](#-geliştirme)
- [Proje Yapısı](#-proje-yapısı)

---

## 🧠 Nedir? Ne işe yarar?

**QA Element Finder** bir **Manifest V3 tarayıcı uzantısıdır** (Chrome, Edge, Firefox). Bir QA mühendisinin günlük iş akışındaki şu adımları saniyelere indirir:

1. **Element Seçme** — Sayfada bir elementi hover ile vurgula, tıkla, tüm selector alternatiflerini gör
2. **Selector Doğrulama** — Üretilen her selector sayfada tekil mi diye otomatik kontrol edilir
3. **Aksiyon Kaydetme** — Tıklama, yazma, seçme, sayfa değişimi gibi adımları kaydet
4. **Replay (Tekrar Oynatma)** — Kaydettiğin testi tarayıcı içinde yeniden çalıştır
5. **POM Kod Üretme** — Kayıttan Playwright/Cypress/Selenium POM kodu üret, kopyala veya dışa aktar

Tüm veriler **lokal** kalır — hiçbir sunucuya veri gönderilmez, telemetri yoktur.

---

## ✨ Özellikler

### 🏆 Piyasa Karşılaştırması

| Özellik | QA Element Finder | Katalon Recorder | Selenium IDE | BugBug | Playwright codegen |
|---------|:---:|:---:|:---:|:---:|:---:|
| **Ücretsiz ve açık kaynak** | ✅ | ✅ | ✅ | ⚠️ Freemium | ✅ |
| **Element Inspector** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **6 Stratejili Selector Engine** | ✅ | ❌ (XPath/CSS) | ❌ (XPath/CSS) | ❌ | ❌ |
| **Self-Healing Selector** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Multi-Tab Recording** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **DevTools Panel** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Keyboard DOM Walking (↑↓)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Selector Lab (Verify & Highlight)** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Step Editor (Reorder/Delete)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Selector Stress Test** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Playwright POM** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Cypress POM** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Selenium POM** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Real Typing Simulation** | ✅ | ❌ (JS inject) | ❌ (JS inject) | ✅ | ✅ |
| **Manifest V3** | ✅ | ✅ | ❌ (V2) | ❌ | N/A |
| **Cross-browser (Chrome/Edge/Firefox)** | ✅ | ✅ | ⚠️ (Chrome/Firefox) | ❌ (Chrome only) | ✅ |
| **Gizli Mod (Incognito) Desteği** | ✅ | ✅ | ❌ | ❌ | N/A |
| **Şifre Maskeleme** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **JSON Export/Import** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **IndexedDB Storage** | ✅ | ❌ | ❌ | ❌ | N/A |

### Yeni Eklenen Özellikler (v2.0)

#### ⌨️ Keyboard DOM Walking
Element seçici modunda iken **↑/↓** tuşları ile sayfadaki tüm interaktif elementler arasında gezinebilir, **Enter** ile seçim yapabilirsiniz. Mouse ile seçimi zor olan dropdown, tooltip gibi elementler için idealdir.

#### 🩹 Self-Healing Selector (Kendini Onaran Seçici)
Replay sırasında bir element birincil selector ile bulunamazsa, kayıt sırasında üretilen alternatif selector'lar otomatik olarak (score sırasına göre) denenir. Başarılı olursa adım "healed" olarak işaretlenir ve replay devam eder. Piyasada sadece Katalon Recorder'da bulunan bu özellik artık sizde ücretsiz.

#### 🔬 Selector Lab (Seçici Doğrulama Laboratuvarı)
Herhangi bir CSS selector veya XPath ifadesini yapıştırın, sayfada eşleşen tüm elementler mavi outline ile vurgulansın. DevTools panelindeki "Lab" sekmesinden erişilir. Selector'larınızı teste koymadan önce doğrulayın.

#### 📝 Step Editor (Adım Düzenleyici)
Kaydedilen test adımlarını kayıt sonrası düzenleyin: sıralamayı değiştirmek için ↑↓ okları, gereksiz adımları silmek için 🗑️ butonu. Yeniden kaydetmeye gerek kalmadan testlerinizi optimize edin.

#### 💪 Selector Stress Test (Seçici Dayanıklılık Testi)
Bir elementin ID veya class olmadan benzersiz şekilde seçilip seçilemeyeceğini test eder. Dinamik ID/class kullanan sayfalarda selector'larınızın ne kadar dayanıklı olduğunu görün.

### 🎯 Element Inspector (Eleman Denetçisi)

| Özellik | Açıklama |
|---------|----------|
| Hover vurgulama | Fareyle üzerine gelince element yeşil overlay ile vurgulanır |
| Tooltip bilgisi | Tag, id, class ve en iyi selector anlık gösterilir |
| Tek tık seçim | Tıklayınca tüm selector stratejileri listelenir |
| Escape ile iptal | Picker modundan çıkmak için Escape tuşu |
| Copy butonu | Her selector için tek tıkla panoya kopyalama |

### 🔍 Selector Engine (Seçici Motoru)

6 farklı strateji ile selector üretir, yalnızca **tekil (unique)** olanları gösterir:

| Öncelik | Strateji | Örnek | Puan |
|---------|----------|-------|------|
| 1 | Data attribute | `[data-testid="login-btn"]` | 100 |
| 2 | ARIA role | `[role="button"][aria-label="Submit"]` | 80 |
| 3 | Görünür text | `button` ("Login" metni ile) | 60 |
| 4 | Semantic CSS | `#unique-section > .btn.primary` | 40 |
| 5 | Complex CSS | `div:nth-child(2) > button:nth-child(1)` | 20 |
| 6 | XPath | `/html/body/div[2]/button[1]` | 20 |

**Akıllı tespit:** Dinamik/hash'lenmiş class'ları (`css-1x2y3z`, `ember123`, `sc-...`) otomatik tanır ve skorlarını düşürür.

### ⏺ Action Recorder (Aksiyon Kaydedici)

- **click**: Her tıklama yakalanır
- **fill/type**: Input alanları debounce (300ms) ile yakalanır
- **select**: Dropdown seçimleri
- **submit**: Form gönderimleri
- **navigate**: URL değişimleri, SPA route değişimleri (`pushState`, `popstate`)
- **Güvenlik**: Şifre alanları maskelenir, hassas URL parametreleri temizlenir

### ▶ Test Player (Test Oynatıcı)

- Kaydedilen adımları sırayla tarayıcıda çalıştırır
- React/Angular kontrollu inputlar için native setter pattern
- Assertion tipleri: `visible`, `text`, `attribute`, `value`, `exists`
- Fail modu: hata durumunda dur veya devam et
- Zaman aşımı sınırlaması (60 sn tavan)

### 📄 POM Code Generator (POM Kod Üretici)

| Framework | Dil | Class | Test |
|-----------|-----|-------|------|
| **Playwright** | TypeScript | `AppPage` class + typed locators | `test()` blokları |
| **Cypress** | TypeScript | `AppPage` class + getter | `describe()`/`it()` blokları |
| **Selenium** | Python | `AppPage` class + `By` tuple | `pytest` class |

### 🖥 UI Panelleri

| Panel | Yer | Kullanım |
|-------|-----|----------|
| **Popup** | Araç çubuğu (256×450) | Hızlı aksiyon: Pick, Record, Recent Tests, Settings |
| **DevTools** | F12 → QA Finder | Tam IDE: Inspector, Generator, Recorder, Player |
| **Options** | Uzantı ayarları | Framework, timeout, veri yönetimi |

---

## 🚀 Kurulum

### Chrome / Edge / Brave

```
npm install
npm run build
```

Ardından:
1. `chrome://extensions` adresine git
2. Sağ üstten **Developer mode** (Geliştirici modu) aç
3. **Load unpacked** (Paketlenmemiş öğe yükle) tıkla
4. Proje içindeki `dist/` klasörünü seç
5. ✅ Araç çubuğunda QA ikonu belirdi — hazır!

### Firefox

```
npm run build
```

Ardından:
1. `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on** tıkla
3. `dist/manifest.json` seç

---

## 🕶 Gizli Mod (Incognito)

Chrome'da uzantılar gizli modda **varsayılan olarak çalışmaz**. Aktif etmek için:

1. `chrome://extensions` adresine git
2. QA Element Finder kartında **Detaylar** (Details) tıkla
3. Aşağı kaydır → **"Allow in incognito" / "Gizli modda izin ver"** seçeneğini AÇ

Artık gizli pencerede de uzantı aktif.

> **Not:** Firefox'ta Temporary Add-On'lar gizli modda otomatik çalışır, ek ayar gerekmez.

---

## 📖 Kullanım Kılavuzu

### 1. Element Seçme (Element Picker)

**Amaç:** Sayfadaki herhangi bir HTML elementinin tüm selector alternatiflerini görme.

```
Popup → "Pick Element" butonu
```

- Fareyi elementlerin üzerinde gezdirin → yeşil overlay + tooltip (tag, id, class, en iyi selector) gösterilir
- Tıklayın → Popup'ta tüm selector alternatifleri puan sırasına göre listelenir
- **↑/↓ tuşları** ile sayfadaki tüm interaktif elementler arasında gezinebilirsiniz (shadow DOM ve iframe içindekiler dahil)
- **Enter** ile seçim yapın, **Escape** ile picker modundan çıkın
- Her selector'un yanındaki 📋 butonu ile panoya kopyalayın

### 2. Selector Doğrulama (Inspector)

**Amaç:** Seçtiğiniz elementin selector'larının benzersiz (unique) olup olmadığını görme.

Element seçildiğinde Popup/DevTools'da gösterilen her selector:
- ✅ **Yeşil** — sayfada tek bir elementi hedefler (güvenli)
- ⚠️ **Sarı** — birden fazla element eşleşir (riskli)
- ❌ **Kırmızı** — hiçbir element bulamaz (kırık)

**Selector Stress Test (Dayanıklılık Testi):**

DevTools → Inspector sekmesinde "Stress Test" butonu:
- ID'siz halde selector unique mi?
- Class'sız halde selector unique mi?
- Sadece semantik selector'lar (tag + pozisyon) ile unique mi?
- Sonuç: ✅ Başarılı / ⚠️ Zayıf / ❌ Başarısız

### 3. Selector Lab (Laboratuvar)

**Amaç:** Kendi yazdığınız CSS selector veya XPath ifadesini sayfada test etme.

```
DevTools → "Lab" sekmesi
```

1. CSS selector (örn. `[data-testid="login-btn"]`) veya XPath (`//button[text()="Gönder"]`) yazın
2. "Highlight" butonuna tıklayın
3. Sayfada eşleşen tüm elementler **mavi outline** ile vurgulanır, sayı gösterilir
4. Shadow DOM ve iframe içindeki elementler de taranır

### 4. Aksiyon Kaydetme (Recorder)

**Amaç:** Tarayıcıda yaptığınız işlemleri adım adım kaydetme.

```
Popup → "Record" butonu (veya DevTools → Recorder → Record)
```

**Otomatik yakalanan aksiyonlar:**

| Aksiyon | Tetiklenme | Örnek |
|---------|-----------|-------|
| `click` | Her tıklama | Buton, link, checkbox tıklaması |
| `fill` | Input alanına yazı (300ms debounce) | Arama kutusuna "laptop" yazmak |
| `type` | Input alanına gerçek tuş vuruşu | React/Angular kontrollü inputlar |
| `select` | Dropdown seçimi | Select elementinde option seçimi |
| `submit` | Form gönderimi | Login formu submit |
| `navigate` | URL değişimi | Sayfa değiştirme, SPA route geçişi |

**Önemli:** Sayfa değiştirmeden (navigate) önce kaydı durdurun, yoksa state kaybolur.

```
Kaydı Başlat → İşlemleri yap (tıkla, yaz, seç, sayfa değiştir) → "Stop" ile durdur
```

**Güvenlik:** Şifre alanları otomatik maskelenir, storage'da `********` olarak saklanır.

### 5. Adım Düzenleme (Step Editor)

**Amaç:** Kayıt sonrası adımları yeniden sıralama veya silme.

```
DevTools → Recorder sekmesi
```

- **↑↓ okları** ile adımların sırasını değiştirin
- **🗑️ çöp kutusu** ile gereksiz adımları silin
- Yeniden kaydetmeye gerek kalmadan test akışını düzenleyin

### 6. URL'ye Gitme (Navigate)

**Amaç:** Belirli bir URL'ye gitme adımı ekleme veya kaydetme.

- **Otomatik:** Sayfa değiştirdiğinizde `navigate` adımı otomatik kaydedilir
- **Manuel ekleme:** Player sekmesinde "Navigate" butonu ile URL girip adım ekleyebilirsiniz
- **POM çıktısı:** Playwright → `page.goto('url')`, Cypress → `cy.visit('url')`, Selenium → `driver.get('url')`

### 7. Test Oynatma (Player)

**Amaç:** Kaydedilen testi tarayıcıda yeniden çalıştırma.

```
DevTools → Player sekmesi → "Play" butonu
```

**Self-Healing (Kendini Onarma):**

Oynatma sırasında bir element bulunamazsa:
1. Kayıt sırasında üretilen yedek selector'lar sırayla (puan sırasına göre) denenir
2. Başarılı olursa adım "🩹 healed" olarak işaretlenir
3. Oynatma kaldığı yerden devam eder
4. Hiçbir selector çalışmazsa adım "❌ failed" olarak işaretlenir

**Ayarlar:**
- **Fail Mode:** `stop` (hatada dur) veya `continue` (hatayı geç)
- **Timeout:** Her adım için maksimum bekleme süresi (varsayılan: 5000ms)
- Shadow DOM ve iframe içindeki elementler de otomatik taranır

### 8. Doğrulama Ekleme (Assertion)

**Amaç:** Test adımları arasına kontrol noktaları ekleme.

```
DevTools → Recorder → Bir adım seç → "Add Assertion"
```

**Desteklenen assertion tipleri:**

| Tip | Açıklama | Örnek |
|-----|----------|-------|
| `visible` | Element görünür mü? | Buton ekranda görünüyor |
| `not-visible` | Element görünmez mi? | Loading spinner kayboldu |
| `exists` | DOM'da var mı? | Hata mesajı eklendi |
| `not-exists` | DOM'da yok mu? | Popup kapandı |
| `text` | Metin eşleşiyor mu? | "Hoşgeldiniz" yazısı |
| `contains-text` | Metin içeriyor mu? | "başarılı" kelimesi geçiyor |
| `value` | Input değeri doğru mu? | Email alanı "test@x.com" |
| `attribute` | Attribute doğru mu? | Link href'i "/home" |
| `css-property` | CSS değeri doğru mu? | font-size: 16px, opacity: 1 |
| `css-color` | Renk doğru mu? | background: #3B82F6 |
| `dimension` | Boyut doğru mu? | width >= 200px |
| `position` | Pozisyon doğru mu? | x = 100, y = 200 |
| `state` | Element durumu? | disabled, checked, focused |
| `count` | Kaç tane var? | 3 tane li elementi |
| `class` | Class'ı var mı? | "active" class'ı |
| `not-class` | Class'ı yok mu? | "error" class'ı yok |

**Operatörler:** `=` (eşit), `≠`, `>`, `≥`, `<`, `≤`, `içerir`, `regex eşleşmesi`, `yaklaşık` (±tolerans)

### 9. POM Kod Üretme (Generator)

**Amaç:** Kayıttan otomatik Page Object Model test kodu oluşturma.

```
DevTools → Generator sekmesi
```

1. **Framework seçin:** Playwright (TS), Cypress (TS) veya Selenium (Python)
2. **"Generate POM"** butonuna tıklayın
3. **Her assertion tipi için** framework'e uygun assertion kodu üretilir:
   - Playwright: `await expect(page.locator(...)).toBeVisible()`
   - Cypress: `cy.get(...).should('be.visible')`
   - Selenium: `assert element.is_displayed()`
4. **📋 Kopyala** veya **💾 İndir** (JSON)

**Output yapısı:**
- `AppPage` class'ı (locator'lar)
- `test()` bloğu (aksiyonlar + assertionlar)
- Bağımsız çalıştırılabilir, CI/CD'ya hazır

### 10. Shadow DOM ve Iframe İşlemleri

**Amaç:** Gölge DOM (web component) ve iframe içindeki elementleri seçme/kaydetme.

- Element picker, shadow DOM ve iframe içindeki elementleri otomatik bulur
- Seçici olarak `>>` pierce chain kullanılır (örn. `my-component >> button`)
- Kayıt, oynatma ve doğrulama tüm bağlamlarda çalışır
- **Sınırlama:** Cross-origin iframe'ler incelenemez (tarayıcı güvenlik politikası)

### 11. Dışa/İçe Aktarma (Export/Import)

**Amaç:** Testleri JSON olarak kaydetme ve paylaşma.

```
Popup → Settings → Export / Import
```

- **Export:** Tüm testler → JSON dosyası indir
- **Import:** JSON dosyası yükle → testler otomatik yüklenir
- Takım arkadaşlarınızla JSON paylaşarak test aktarımı

### 12. Headless/CI Kullanımı (Playwright ile)

**Amaç:** Extension'ı Playwright testlerinde kullanma.

```typescript
// headed-test.ts içinde:
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`]
});
// NOT: --load-extension headed modda çalışmaz.
// Workaround: context.addInitScript(fs.readFileSync('./dist/content-script-standalone.js', 'utf-8'));
```

Detaylı örnek için proje kökündeki `headed-test.ts` dosyasına bakın.

### İlk Çalıştırma Senaryosu (Amazon'da)

```javascript
// 1. Popup → "Pick Element"
//    Amazon logo'ya tıkla → selector listesini gör
//    Çıktı: [role="navigation"][aria-label="Primary"] (score:80)

// 2. Popup → "Record"
//    Arama kutusuna tıkla, "laptop" yaz, ara butonuna tıkla
//    Sayfa değişince "Stop" → kayıt durur

// 3. DevTools → Recorder
//    Adımları kontrol et, sıralamayı düzenle, gereksizleri sil

// 4. DevTools → Recorder → "Add Assertion"
//    Assertion tipi: contains-text → değer: "sonuç"
//    Arama sonuçlarının geldiğini doğrula

// 5. DevTools → Player → "Play"
//    Self-healing ile oynat, varsa healed adımları gör

// 6. DevTools → Generator → Playwright seç → "Generate POM"
//    Çıktı:
//      await page.locator('#twotabsearchtextbox').click();
//      await page.locator('#twotabsearchtextbox').fill('laptop');
//      await page.locator('#nav-search-submit-button').click();
//      await expect(page.locator('[data-component-type="s-search-result"]')).toContainText('sonuç');
```

---

## 🔗 Uygulamalarıma Entegrasyon

### 1. Selector'ları Test Kodunda Kullanma

Üretilen selector'ları doğrudan test dosyanda kullan:

```typescript
// Playwright
await page.locator('[data-testid="login-btn"]').click();

// Cypress
cy.get('[data-cy="submit-order"]').click();

// Selenium Python
self.driver.find_element(By.CSS_SELECTOR, "#email-input").send_keys("test@x.com")
```

### 2. POM Kodunu Projene Ekle

Generator sekmesinden üretilen `AppPage` class'ını projene kopyala:

```typescript
// app-page.ts — test projene ekle
import { Page, Locator } from '@playwright/test';
export class AppPage {
  constructor(private page: Page) {}
  get searchBox(): Locator {
    return page.locator('#twotabsearchtextbox');
  }
  get searchButton(): Locator {
    return page.locator('#nav-search-submit-button');
  }
}
```

### 3. JSON Export/Import ile Test Paylaşımı

- **Export:** Settings → Export → JSON dosyası indir
- **Import:** Settings → Import → JSON dosyası yükle
- Takım arkadaşlarınla JSON dosyasını paylaşarak testleri aktarabilirsin

### 4. CI/CD Pipeline'ında Kullanma

Üretilen POM kodunu doğrudan CI'nda çalıştırabilirsin. Kod, bağımsız bir test dosyası olarak çalışmaya hazırdır.

---

## 🏗 Mimari ve Çalışma Prensibi

```
                     ╔═══════════════╗
                     ║   Popup UI   ║
                     ║  (React SPA) ║
                     ╚═════╤════════╝
                           │ chrome.runtime.sendMessage
                     ╔═════▼════════╗
                     ║  Background  ║
                     ║  (SW)        ║
                     ╚═════╤════════╝
              ┌────────────┼────────────┐
         chrome.tabs.  chrome.tabs.    chrome.runtime
         sendMessage   sendMessage     .connect
              │             │              │
     ╔════════▼═══╗  ╔═════▼══════╗  ╔════▼═══════╗
     ║ Content    ║  ║ Content    ║  ║ DevTools   ║
     ║ Script     ║  ║ Script     ║  ║ Panel      ║
     ║ (page ctx) ║  ║ (page ctx) ║  ║ (React)    ║
     ╚════════════╝  ╚════════════╝  ╚════════════╝
```

- **Selector Engine**: Content script içinde çalışır, DOM'a erişir, `querySelectorAll` ile tekillik doğrular
- **Recorder**: Content script içinde DOM event listener'larla çalışır
- **Player**: Content script içinde adımları DOM API ile yürütür (native setter + event dispatch)
- **POM Generator**: Tamamen izole modül, `shared/adapters/` altında framework başına ayrı adapter
- **Storage**: IndexedDB (`idb` kütüphanesi) ile lokal persistans
- **Popup/DevTools**: React SPA, `chrome.runtime` API ile content script'le iletişim

### Veri Akışı (Kayıt)

```
Kullanıcı tıklar → DOM event → Recorder (content script)
  → extractRecordedStep() → selector-engine.ts ile selector üret
  → { action: "click", target: "#id", timestamp } step olarak kaydet
  → chrome.runtime.sendMessage → Background → DevTools/Popup'a durum ilet
```

### Veri Akışı (Replay)

```
Play tuşu → chrome.runtime.sendMessage → Background → tabs.sendMessage → Content Script
  → player.ts → findElement() → executeStep()
  → Her adım: focus → click / native setter + dispatchEvent
  → Sonuç: { passed, stepResults, duration }
```

---

## ⚙ Yapılandırma

| Ayar | Varsayılan | Açıklama |
|------|------------|----------|
| Framework | Playwright (TS) | POM kodu hangi framework'te üretilsin |
| Timeout | 5000 ms | Element işlemleri için maksimum bekleme |
| Debounce | 300 ms | Input kaydında gecikme süresi |
| Fail Mode | stop | Replay'de hata olursa dur veya devam et |
| Mask Passwords | ✅ | Şifre alanlarını kod çıktısında maskele |
| Indentation | 2 spaces | Kod girinti stili |

---

## 🔒 Güvenlik

| Özellik | Açıklama |
|---------|----------|
| 🏠 Lokal çalışma | Hiçbir uzak sunucuya veri gönderilmez |
| 📡 Telemetri yok | Veri toplama, analitik, reklam yok |
| 🔑 Şifre maskeleme | Password alanları storage'da/kodda maskelenir |
| 🧹 URL temizleme | Token, key, secret gibi parametreler temizlenir |
| 🧊 Isolated world | Content script sayfanın JS'inden erişilemez |

---

## 🧪 Test Edilen Platformlar

| Tarayıcı | Durum | Not |
|----------|-------|-----|
| Chrome 116+ | ✅ Tam destek | Manifest V3 |
| Edge 116+ | ✅ Tam destek | Chromium tabanlı |
| Brave | ✅ Çalışır | Chromium tabanlı |
| Opera | ✅ Çalışır | Chromium tabanlı |
| Firefox 120+ | ✅ Tam destek | Manifest V3 |
| Safari | 🚧 Planlandı | Developer Program gerekli |

---

## 🛠 Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme build (watch mode)
npm run dev

# Production build (tüm tarayıcılar)
npm run build

# TypeScript tip kontrolü
npm run typecheck

# Testleri çalıştır
npm test

# Paketle (zip)
npm run package:chrome
npm run package:firefox
```

---

## 🏗 Proje Yapısı

```
qa-element-finder/
├── src/
│   ├── background/          # Service worker
│   ├── content-script/      # DOM enjeksiyonu
│   │   ├── index.ts         # Ana giriş, postMessage bridge
│   │   ├── element-picker.ts # Picker + overlay (↑↓ keyboard DOM walking)
│   │   ├── recorder.ts      # Aksiyon kaydedici
│   │   ├── player.ts        # Replay motoru (self-healing selector)
│   │   ├── selector-verify.ts # Selector doğrulama ve highlight
│   │   └── standalone.ts    # Self-contained bundle (Playwright addInitScript)
│   ├── devtools/            # DevTools panel (React)
│   │   ├── panel.tsx        # Ana panel (4 sekme)
│   │   └── devtools-init.ts # DevTools başlatma
│   ├── popup/               # Popup UI (React)
│   │   └── PickerPopup.tsx  # Popup bileşeni
│   ├── options/             # Ayarlar sayfası
│   └── shared/              # Paylaşılan modüller
│       ├── selector-engine.ts   # Selector motoru
│       ├── pom-generator.ts     # POM arayüzü
│       ├── storage.ts           # IndexedDB
│       ├── types.ts             # TypeScript tipleri
│       ├── utils.ts             # Yardımcı fonksiyonlar
│       └── adapters/            # Framework adapterları
│           ├── playwright.ts
│           ├── cypress.ts
│           └── selenium-python.ts
├── dist/                   # Build çıktısı (yükle)
├── docs/                   # Dokümantasyon
│   └── factory/            # PRD, mimari, UX, threat model
├── scripts/
│   ├── build-all.js        # Build orchestrator
│   └── zip-browser.js      # Paketleme
├── test-amazon.spec.ts     # Entegrasyon testleri
├── vite.config.ts          # Vite yapılandırması
└── package.json
```

---

## ⚠️ Bilinen Sınırlamalar

- Shadow DOM elementleri kısmi destek
- Cross-origin iframe elementleri incelenemez
- Safari desteği Apple Developer Program üyeliği gerektirir
- Text tabanlı selector'lar dinamik içerikte sınırlı güvenilirlik
- Headless Chromium'da content script enjeksiyonu çalışmayabilir (normal tarayıcıda sorunsuz)

---

MIT © 2026 Mustafa Sagiroglu
