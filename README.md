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

### TR — Adım Adım

```
1. Popup'tan "Pick Element" tıkla
2. Sayfada istediğin elemanın üzerine gel → yeşil overlay gör
3. Tıkla → selector listesi DevTools/Popup'ta açılır
4. İstediğin selector'ı 📋 ile kopyala
5. "Record" tıkla → sayfada işlemlerini yap → "Stop" ile durdur
6. "Play" ile testi tekrar oynat
7. Generator sekmesinden framework seç → "Generate POM" → kodu al
```

### İlk Çalıştırma Senaryosu (Amazon'da)

```javascript
// Popup → Pick Element
// Amazon logo'ya tıkla → selector listesini gör
// Çıktı: [role="navigation"][aria-label="Primary"] (score:80)

// Popup → Record
// Arama kutusuna tıkla, "laptop" yaz, ara butonuna tıkla
// Popup → Stop
// DevTools → Generator → Playwright seç → Generate POM
// Çıktı:
//   page.locator('#twotabsearchtextbox').click();
//   page.locator('#twotabsearchtextbox').fill('laptop');
//   page.locator('#nav-search-submit-button').click();
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
│   │   ├── element-picker.ts # Picker + overlay
│   │   ├── recorder.ts      # Aksiyon kaydedici
│   │   └── player.ts        # Replay motoru
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
