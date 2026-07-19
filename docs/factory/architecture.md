# QA Element Finder — Mimari Dokümanı

> **Sürüm:** 1.0.0  
> **Son Güncelleme:** 2026-07-19  
> **Durum:** Taslak / İnceleme Aşamasında

Bu doküman QA Element Finder eklentisinin mimari kararlarını, bileşen yapısını, protokol tanımlarını ve teknik detaylarını kapsar. Tüm İngilizce terimler (değişken adları, fonksiyonlar, tipler, dosya yolları) özgün halleriyle korunmuştur; açıklamalar Türkçedir.

---

## İçindekiler

1. [Proje Genel Bakış](#1-proje-genel-bakış)
2. [Mimari Karar Kayıtları (ADR)](#2-mimari-karar-kayıtları-adr)
3. [Bileşen Mimarisi](#3-bileşen-mimarisi)
4. [Katmanlı Mimari ve Bağımlılıklar](#4-katmanlı-mimari-ve-bağımlılıklar)
5. [Mesajlaşma Protokolü](#5-mesajlaşma-protokolü)
6. [Selector Motoru (shared/selector-engine.ts)](#6-selector-motoru-sharedselector-enginets)
7. [POM Generator (shared/pom-generator.ts)](#7-pom-generator-sharedpom-generatorts)
8. [Recorder (content-script/recorder.ts)](#8-recorder-content-scriptrecorderts)
9. [Player (content-script/player.ts)](#9-player-content-scriptplayerts)
10. [Storage Katmanı (shared/storage.ts)](#10-storage-katmanı-sharedstoragets)
11. [State Yönetimi (Zustand Store)](#11-state-yönetimi-zustand-store)
12. [Popup Bileşen Mimarisi](#12-popup-bileşen-mimarisi)
13. [DevTools Panel Mimarisi](#13-devtools-panel-mimarisi)
14. [Options Sayfası](#14-options-sayfası)
15. [Adaptör Arayüzleri ve Çıktı Formatları](#15-adaptör-arayüzleri-ve-çıktı-formatları)
16. [Güvenlik Modeli](#16-güvenlik-modeli)
17. [Hata Yönetimi ve Logging](#17-hata-yönetimi-ve-logging)
18. [Performans Hedefleri ve Kısıtlar](#18-performans-hedefleri-ve-kısıtlar)
19. [Test Stratejisi](#19-test-stratejisi)
20. [Gelecek Genişletmeler](#20-gelecek-genişletmeler)

---

## 1. Proje Genel Bakış

QA Element Finder, kalite güvence mühendislerinin tarayıcı üzerinde element seçmesine, kayıt yapmasına, test senaryolarını oynatmasına ve Page Object Model (POM) dosyalarını otomatik üretmesine olanak tanıyan bir tarayıcı eklentisidir.

**Temel Yetenekler:**
- Görsel element seçici (hover + highlight + tooltip)
- Çoklu framework desteği (Playwright, Cypress, Selenium Python)
- Kullanıcı etkileşimlerini kaydetme ve oynatma
- Page Object Model dosyalarının otomatik oluşturulması
- Selector stratejilerinin akıllı sıralaması ve puanlaması
- IndexedDB tabanlı kalıcı depolama
- Service worker üzerinden durum yönetimi

**Hedef Kitle:**
- QA mühendisleri
- Test otomasyonu geliştiricileri
- SDET'ler (Software Development Engineer in Test)
- Frontend geliştiricileri (test yazımını hızlandırmak için)

---

## 2. Mimari Karar Kayıtları (ADR)

### ADR-1: Manifest V3 Extension

**Durum:** Kabul Edildi  
**Tarih:** 2026-07-19

#### Bağlam

Tarayıcı eklentisi geliştirmek için çağdaş ve geleceğe dönük bir platform seçilmelidir. Chrome, Manifest V2'yi 2024 itibarıyla kullanımdan kaldırma sürecine girmiştir. Yeni eklentiler Manifest V3 ile geliştirilmek zorundadır.

#### Karar

Manifest V3 specifikasyonu kullanılacaktır.

#### Alternatifler

| Alternatif | Dezavantaj |
|---|---|
| Electron uygulaması | Ağır (~150MB+), kurulum gerektirir, tarayıcı bağlamından yoksun |
| Standalone CLI (Node.js) | Element seçmek için görsel arayüz yok, karmaşık kurulum |
| Manifest V2 | Chrome tarafından 2024 sonrası engellenecek, yeni eklentilere izin verilmiyor |
| Web uygulaması | Tarayıcı içi element seçimi mümkün değil (CORS, DOM erişimi yok) |

#### Sonuçlar

- **Olumlu:** Tüm modern tarayıcılarda çalışır (Chrome, Firefox, Edge, Safari)
- **Olumlu:** Sandbox güvenlik modeli sayesinde izole çalışma
- **Olumsuz:** Service worker 30 saniye sonra uyku moduna geçer (Alarm API ile aşılabilir)
- **Olumsuz:** Service worker DOM'a erişemez, content script üzerinden iletişim gerekir
- **Olumsuz:** chrome.extension.getBackgroundPage() kullanılamaz


#### Manifest V3 Temel Yapılandırması

```json
{
  "manifest_version": 3,
  "name": "QA Element Finder",
  "version": "1.0.0",
  "permissions": [
    "storage",
    "activeTab",
    "tabs",
    "scripting",
    "alarms",
    "unlimitedStorage"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": "assets/icon-128.png"
  },
  "devtools_page": "src/devtools/index.html",
  "options_ui": {
    "page": "src/options/index.html",
    "open_in_tab": true
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["src/content-script/main.ts"],
    "run_at": "document_idle",
    "world": "ISOLATED"
  }],
  "web_accessible_resources": [{
    "resources": ["src/content-script/injected.js"],
    "matches": ["<all_urls>"]
  }]
}
```

---

### ADR-2: TypeScript + React + Vite + Zustand

**Durum:** Kabul Edildi  
**Tarih:** 2026-07-19

#### Bağlam

Eklentinin kullanıcı arayüzü katmanı (popup, devtools panel, options sayfası) için modern, hızlı ve tip güvenli bir teknoloji yığını seçilmelidir.

#### Karar

- **TypeScript:** Tüm proje tip güvenli olacak
- **React 18:** Bileşen tabanlı UI modeli
- **Vite:** Hızlı geliştirme ve build süreci
- **Zustand:** Hafif state management (Redux alternatifi)

#### Alternatifler

| Alternatif | Dezavantaj |
|---|---|
| Vanilla JavaScript | Tip güvenliği yok, selector engine edge case'leri yakalanamaz |
| Angular | Ağır (~65KB minified), build süresi uzun |
| Vue.js | Küçük ekosistem, TypeScript desteği sınırlı |
| Redux | Çok fazla boilerplate, Zustand'a göre 3x kod hacmi |
| Webpack | Yavaş HMR, karmaşık konfigürasyon |

#### Sonuçlar

- **Olumlu:** TypeScript sayesinde selector engine hataları derleme anında yakalanır
- **Olumlu:** Vite sayesinde geliştirme sunucusu <300ms başlatma süresi
- **Olumlu:** Zustand sayesinde minimal state management kodu (<50 satır store)
- **Olumsuz:** Build step'i gereklidir (TypeScript → JavaScript derlemesi)
- **Olumsuz:** React + Zustand bundle boyutu ~45KB (gzip: ~15KB)


### ADR-3: IndexedDB

**Durum:** Kabul Edildi  
**Tarih:** 2026-07-19

#### Bağlam

Eklenti, kullanıcının test modellerini, test suitelerini ve ayarlarını kalıcı olarak saklamalıdır. Veri miktarı zamanla büyüyebilir (yüzlerce element, onlarca test, screenshot'lar).

#### Karar

IndexedDB kullanılacaktır. İşlemleri kolaylaştırmak için idb kütüphanesi (promise-based wrapper) tercih edilmiştir.

#### Alternatifler

| Alternatif | Sınırlama |
|---|---|
| chrome.storage.local | 8MB kota, yavaş yazma, sadece JSON |
| chrome.storage.sync | 102KB kota, sadece senkronizasyon verisi |
| localStorage | 5-10MB, eklenti context'inde her zaman erişilemez |
| Dosya sistemi (File API) | Karmaşık, asenkron, eklenti API'leriyle uyumsuz |

#### Sonuçlar

- **Olumlu:** Sınırsız depolama (unlimitedStorage izni ile)
- **Olumlu:** Eklenti yeniden başlasa bile veri korunur
- **Olumlu:** Büyük veri kümeleri (screenshot'lar, uzun test senaryoları) sorunsuz saklanır
- **Olumsuz:** Async API, tüm işlemler promise tabanlı
- **Olumsuz:** Schema versioning ve migration stratejisi gerektirir
- **Olumsuz:** IndexedDB tarayıcılar arası tutarsızlıklar gösterebilir

---

### ADR-4: Service Worker Tabanlı Background Script

**Durum:** Kabul Edildi  
**Tarih:** 2026-07-19

#### Bağlam

Manifest V3, background page yerine service worker kullanımını zorunlu kılar. Service worker'lar DOM'a erişemez ve belirli bir süre işlem yapılmazsa sonlandırılır.

#### Karar

Background katmanı service worker olarak implemente edilecek. Uzun süreli bağlantılar için chrome.runtime.connect (port) kullanılacak. Service worker'ın uyku moduna geçmesini engellemek için chrome.alarms API kullanılacak.

#### Sonuçlar

- **Olumlu:** Daha az bellek tüketimi
- **Olumlu:** Güvenlik açısından daha izole çalışma
- **Olumsuz:** Service worker 30 saniye işlem yapmazsa sonlanır (kurtarma: her 20 saniyede bir keep-alive alarm)
- **Olumsuz:** Service worker DOM'a erişemez → content script ile iletişim şart
- **Olumsuz:** XMLHttpRequest yerine fetch API kullanılmalı

```typescript
// background/service-worker.ts
let keepAlivePorts: Set<chrome.runtime.Port> = new Set();

chrome.runtime.onConnect.addListener((port) => {
  keepAlivePorts.add(port);
  port.onDisconnect.addListener(() => keepAlivePorts.delete(port));
});

chrome.alarms.create('keep-alive', { periodInMinutes: 0.33 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    chrome.storage.local.get(['_keepAlive']);
  }
});
```

---

### ADR-5: Content Script Isolation

**Durum:** Kabul Edildi  
**Tarih:** 2026-07-19

#### Bağlam

Content script, hedef sayfanın DOM'una erişmelidir ancak sayfanın JavaScript bağlamından izole edilmelidir. Element seçici, recorder ve player content script içinde çalışır.

#### Karar

Content script ISOLATED world'de çalışacaktır. Sayfanın kendi JS'i ile etkileşim gerektiğinde (injected.js) web_accessible_resources üzerinden enjekte edilecektir.

#### Sonuçlar

- **Olumlu:** Sayfanın JS'i çökse bile eklenti çalışmaya devam eder
- **Olumlu:** Çakışma riski minimumdur
- **Olumsuz:** window nesnesine doğrudan erişilemez (injected script gerekir)
- **Olumsuz:** Sayfanın global değişkenlerine erişim için postMessage bridge gerekir

---

### ADR-6: Adapter Pattern ile Çoklu Framework Desteği

**Durum:** Kabul Edildi  
**Tarih:** 2026-07-19

#### Bağlam

Kullanıcılar farklı test otomasyon framework'leri kullanır. Her framework'ün kendi syntax'ı, locator stratejisi ve page object model yapısı vardır. Eklenti birden çok framework'ü desteklemelidir.

#### Karar

Adapter pattern kullanılacaktır. Her framework için ayrı bir adapter dosyası shared/adapters/ altında bulunur. Ortak bir arayüz (interface) tüm adapter'lar için contract tanımlar.

#### Alternatifler

| Alternatif | Dezavantaj |
|---|---|
| Tek framework desteği | Pazarın büyük kısmı kaybedilir |
| Template engine (EJS/Handlebars) | Tip güvenliği yok, karmaşık şablonlar |
| Code generation library | Bağımlılık artar, esneklik azalır |

#### Sonuçlar

- **Olumlu:** Yeni framework desteği kolayca eklenebilir
- **Olumlu:** Her framework kendi best practice'ine göre kod üretir
- **Olumlu:** Adapter'lar birbirinden bağımsız test edilebilir
- **Olumsuz:** Her adapter ayrı yazılmalı ve bakımı yapılmalı
- **Olumsuz:** Tüm framework'lerin tüm özelliklerini desteklemek zordur


---

## 3. Bileşen Mimarisi

Proje, fonksiyonel katmanlarına göre aşağıdaki gibi yapılandırılmıştır. Her katman kendi sorumluluk alanına sahiptir ve diğer katmanlarla sadece tanımlı arayüzler üzerinden iletişim kurar.

```
qa-element-finder/
├── src/
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ElementPicker.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   ├── RecorderControl.tsx
│   │   │   ├── RecentElements.tsx
│   │   │   └── StatusBar.tsx
│   │   └── styles/
│   │       └── popup.css
│   │
│   ├── devtools/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── panels/
│   │   │   ├── ElementInspector.tsx
│   │   │   ├── SelectorList.tsx
│   │   │   ├── RecorderPanel.tsx
│   │   │   ├── PlayerPanel.tsx
│   │   │   ├── PageModelPanel.tsx
│   │   │   ├── TestSuitePanel.tsx
│   │   │   └── ExportPanel.tsx
│   │   ├── components/
│   │   │   ├── ElementTree.tsx
│   │   │   ├── SelectorPreview.tsx
│   │   │   ├── CodePreview.tsx
│   │   │   ├── TestStepEditor.tsx
│   │   │   └── FrameworkSelector.tsx
│   │   └── styles/
│   │       └── devtools.css
│   │
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── message-router.ts
│   │   ├── tab-manager.ts
│   │   └── state-bridge.ts
│   │
│   ├── content-script/
│   │   ├── main.ts
│   │   ├── element-picker.ts
│   │   ├── recorder.ts
│   │   ├── player.ts
│   │   ├── highlighter.ts
│   │   ├── bridge.ts
│   │   ├── observers.ts
│   │   └── styles.ts
│   │
│   ├── shared/
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   ├── element.types.ts
│   │   │   ├── recorder.types.ts
│   │   │   ├── player.types.ts
│   │   │   ├── storage.types.ts
│   │   │   ├── messages.types.ts
│   │   │   └── adapter.types.ts
│   │   ├── selector-engine.ts
│   │   ├── selector-scorer.ts
│   │   ├── pom-generator.ts
│   │   ├── storage.ts
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   ├── utils.ts
│   │   ├── stores/
│   │   │   ├── extension-store.ts
│   │   │   └── ui-store.ts
│   │   └── adapters/
│   │       ├── index.ts
│   │       ├── playwright.ts
│   │       ├── cypress.ts
│   │       ├── selenium-python.ts
│   │       └── adapter-interface.ts
│   │
│   ├── options/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── sections/
│   │   │   ├── GeneralSettings.tsx
│   │   │   ├── FrameworkSettings.tsx
│   │   │   ├── RecorderSettings.tsx
│   │   │   ├── StorageSettings.tsx
│   │   │   └── ShortcutSettings.tsx
│   │   └── styles/
│   │       └── options.css
│   │
│   └── assets/
│       ├── icons/
│       └── fonts/
│
├── dist/
├── tests/
│   ├── unit/
│   │   ├── selector-engine.test.ts
│   │   ├── pom-generator.test.ts
│   │   ├── storage.test.ts
│   │   └── adapters/
│   │       ├── playwright.test.ts
│   │       ├── cypress.test.ts
│   │       └── selenium-python.test.ts
│   ├── integration/
│   │   ├── popup-interaction.test.ts
│   │   ├── devtools-panel.test.ts
│   │   └── content-script.test.ts
│   └── e2e/
│       └── extension-flow.test.ts
│
├── docs/
│   ├── architecture.md
│   ├── selector-strategy.md
│   └── adapter-development.md
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── manifest.json
└── README.md
```


---

## 4. Katmanlı Mimari ve Bağımlılıklar

Mimari, aşağıdaki katmanlardan oluşur ve bağımlılık yönü yukarıdan aşağıyadır. Hiçbir alt katman üst katmana bağımlı değildir.

```
┌─────────────────────────────────────────────────────────┐
│                     UI Katmanı                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Popup   │  │  DevTools    │  │     Options       │  │
│  │ (360x480)│  │  (Full IDE)  │  │  (Settings Page)  │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
│       │               │                    │              │
└───────┼───────────────┼────────────────────┼──────────────┘
        │               │                    │
        ▼               ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                 Background (Service Worker)              │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │  Message Router   │  │      Tab Manager          │   │
│  └──────────────────┘  └────────────────────────────┘   │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │   State Bridge    │  │     Keep-Alive Handler    │   │
│  └──────────────────┘  └────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                Content Script (ISOLATED World)            │
│  ┌────────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │ Element    │  │ Recorder │  │      Player        │   │
│  │ Picker     │  │          │  │                    │   │
│  ├────────────┤  ├──────────┤  ├────────────────────┤   │
│  │Highlighter │  │Observers │  │   Bridge (postMsg) │   │
│  └────────────┘  └──────────┘  └────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Shared Katmanı                          │
│  ┌────────────────┐  ┌──────────────────────────────┐   │
│  │ Selector Engine │  │       POM Generator          │   │
│  ├────────────────┤  ├──────────────────────────────┤   │
│  │   Storage      │  │   Adapterlar (PW/CY/SP)     │   │
│  ├────────────────┤  ├──────────────────────────────┤   │
│  │   Zustand      │  │       Types, Utils           │   │
│  └────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Katman Kuralları

1. **UI Katmanı** sadece Background ve Shared katmanına erişebilir. Asla doğrudan content script'e DOM erişimi yapmaz.
2. **Background** hem UI hem de Content Script arasında köprü görevi görür. Tüm mesajlaşma onun üzerinden yapılır.
3. **Content Script** sadece Shared katmanını kullanır. Background ile chrome.runtime.sendMessage üzerinden iletişim kurar.
4. **Shared katmanı** hiçbir tarayıcı API'sine bağımlı değildir (izole edilmiştir). Bu sayede birim testleri kolayca yazılabilir.
5. **Adapter'lar** Shared katmanı içindedir ancak sadece POM Generator tarafından çağrılır.

---

## 5. Mesajlaşma Protokolü

Eklentinin farklı bileşenleri arasındaki tüm iletişim, aşağıda tanımlanan mesaj tipleri ve yönlendirme kurallarına tabidir.

### İletişim Kanalları

| Bağlantı | Yöntem | Kapsam |
|---|---|---|
| popup ↔ background | runtime.sendMessage (tek seferlik) | Tekil istek-yanıt |
| background ↔ content | tabs.sendMessage | Belirli bir sekmeye mesaj |
| devtools ↔ background | runtime.connect (port) | Sürekli bağlantı, streaming |
| devtools ↔ content | background üzerinden relay | Doğrudan bağlantı yok |
| content → background | runtime.sendMessage | Event bazlı bildirimler |

### Mesaj Tipleri (Enum)

```typescript
enum MessageType {
  PICK_ELEMENT, ELEMENT_SELECTED, CANCEL_PICK,
  RECORD_START, RECORD_STOP, RECORD_PAUSE,
  RECORD_STEP_CAPTURED, RECORD_STATE_CHANGED,
  PLAY_START, PLAY_PAUSE, PLAY_STOP,
  PLAY_STEP_RESULT, PLAY_COMPLETE, PLAY_ERROR,
  EXECUTE_STEP, STEP_RESULT, QUERY_ELEMENT, QUERY_RESULT,
  GET_PAGE_MODEL, SAVE_PAGE_MODEL, UPDATE_PAGE_MODEL,
  DELETE_PAGE_MODEL, PAGE_MODEL_LIST, PAGE_MODEL_SAVED,
  GET_TEST_SUITES, SAVE_TEST_SUITE, DELETE_TEST_SUITE,
  EXPORT_TEST, IMPORT_TEST, EXPORT_COMPLETE, IMPORT_COMPLETE,
  GET_SETTINGS, UPDATE_SETTINGS, SETTINGS_UPDATED, RESET_SETTINGS,
  GET_STATE, STATE_SNAPSHOT, ERROR, LOG,
}
```

### Mesaj Payload Yapısı

```typescript
interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
  source?: 'popup' | 'devtools' | 'background' | 'content' | 'options';
  target?: 'popup' | 'devtools' | 'background' | 'content' | 'options';
  timestamp?: number;
  requestId?: string;
  error?: string;
}
```

**Element Seçme Akışı:**
- Popup → Background: PICK_ELEMENT mesajı gönderir
- Background → Content Script: tabs.sendMessage ile PICK_ELEMENT iletir
- Content Script: element-picker.ts başlatılır, kullanıcı tıklayana kadar bekler
- Content Script → Background: ELEMENT_SELECTED mesajı (PageElement + screenshot)
- Background → Popup: ELEMENT_SELECTED mesajı, state güncellenir

**Kayıt Akışı:**
- DevTools → Background: RECORD_START mesajı gönderir
- Background → Content Script: tabs.sendMessage ile RECORD_START iletir
- Content Script: recorder.ts başlatılır, event listener'lar eklenir
- Her adımda Content Script → Background: RECORD_STEP_CAPTURED mesajı
- Background → DevTools: RECORD_STEP_CAPTURED (port üzerinden stream)

**DevTools Port Bağlantısı:**
```typescript
const port = chrome.runtime.connect({
  name: devtools-\,
});
port.onMessage.addListener((msg) => handleMessage(msg));
```


---

## 6. Selector Motoru (shared/selector-engine.ts)

Selector motoru, bir DOM elementi için en güvenilir ve benzersiz CSS/XPath selector'ünü üretir. Altı farklı stratejiyi belirli bir öncelik sırasına göre dener ve her biri için bir puan hesaplar.

### Selector Stratejileri ve Puanlama

| Strateji | Adı | Puan | Koşul |
|---|---|---|---|
| 1 | data-attribute | 100 | [data-testid], [data-cy], [data-qa], [data-test] mevcut |
| 2 | aria-role | 80 | Elementin WAI-ARIA rolü ve accessible name'i varsa |
| 3 | text-content | 60 | Unique text content, label, placeholder |
| 4 | semantic-css | 40 | Anlamlı ID veya class (generate edilmemiş) |
| 5 | complex-css | 20 | nth-child, attribute partial match |
| 6 | xpath | 10 | Absolute veya relative XPath |

### SelectorSet Arayüzü

```typescript
interface SelectorSet {
  dataAttribute?: SelectorResult;
  ariaRole?: SelectorResult;
  textContent?: SelectorResult;
  semanticCss?: SelectorResult;
  complexCss?: SelectorResult;
  xpath?: SelectorResult;
  best: SelectorResult;
  matchCount: number;
  isUnique: boolean;
}

interface SelectorResult {
  strategy: SelectorStrategy;
  value: string;
  cssValue?: string;
  xpathValue?: string;
  score: number;       // 0-100
  matchCount: number;
  duration: number;
}

enum SelectorStrategy {
  DATA_ATTRIBUTE = 'data-attribute',
  ARIA_ROLE = 'aria-role',
  TEXT_CONTENT = 'text-content',
  SEMANTIC_CSS = 'semantic-css',
  COMPLEX_CSS = 'complex-css',
  XPATH = 'xpath',
}
```

### PageElement (Seçilen Elementin Temsili)

```typescript
interface PageElement {
  id: string;
  name: string;
  tagName: string;
  elementType: string;
  textContent?: string;
  attributes: Record<string, string>;
  selectors: SelectorSet;
  selectedSelector: SelectorResult;
  boundingBox: BoundingBox | null;
  pageUrl: string;
  screenshot?: string;
  timestamp: number;
  framework?: FrameworkType;
  isPassword?: boolean;
  isDynamic?: boolean;
  isIframe?: boolean;
  iframeSelector?: string;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### Selector Engine Çekirdek Algoritması

SelectorEngine sınıfı şu adımları izler:

1. **Data attribute**: Elementin data-testid, data-cy, data-qa, data-test attribute'larını kontrol eder. Varsa ve DOM'da unique ise 100 puan verir.
2. **ARIA role**: Elementin role attribute'ü ve accessible name'ini (aria-label, aria-labelledby, label for) kontrol eder.
3. **Text content**: Elementin textContent'ini kullanarak getByText formatında selector üretir.
4. **Semantic CSS**: ID varsa ve generated değilse (#id), anlamlı class'ları varsa (tag.class) kullanır.
5. **Complex CSS**: nth-child veya unique attribute partial match ile selector oluşturur.
6. **XPath**: Absolute XPath (kökten itibaren) veya relative XPath (en yakın id'li ancestor'dan) üretir.

Her strateji sonucu SelectorResult olarak döndürülür. Sadece matchCount > 0 olan sonuçlar SelectorSet'e eklenir. En yüksek puanlı sonuç best olarak atanır.

### Generated ID Tespiti

SelectorEngine, framework'lerin otomatik ürettiği ID'leri şu pattern'lerle tespit eder:
- react-XXXXX, vue-XXXX formatları
- Radix UI :rXX: formatı
- Angular form control pattern'leri
- Material UI, Element UI pattern'leri
- Hash tabanlı ID'ler

### Selector Doğrulama (Validator)

Validator sınıfı, üretilen selector'ün DOM'da geçerliliğini kontrol eder:
- matchCount === 0: Element DOM'da yok
- matchCount > 1: Selector benzersiz değil, öneriler üretilir
- matchCount === 1: Element görünürlük ve enable durumu kontrol edilir


---

## 7. POM Generator (shared/pom-generator.ts)

POM Generator, seçilen elementleri kullanarak framework-specific Page Object Model sınıfları üretir. Adapter pattern ile her framework için ayrı kod üreteci kullanılır.

### PageModel Yapısı

```typescript
interface PageModel {
  id: string;
  name: string;
  url: string;
  description?: string;
  elements: PageElement[];
  framework: FrameworkType;
  createdAt: number;
  updatedAt: number;
  version: number;
  tags?: string[];
}

enum FrameworkType {
  PLAYWRIGHT = 'playwright',
  CYPRESS = 'cypress',
  SELENIUM_PYTHON = 'selenium-python',
}
```

### Adapter Interface

```typescript
interface TestFrameworkAdapter {
  name: FrameworkType;
  version: string;
  generatePageClass(model: PageModel): string;
  generateElementDeclaration(element: PageElement): string;
  generateNavigationMethod(model: PageModel): string;
  generateTest(test: TestDefinition, model: PageModel): string;
  generateVisibilityAssertion(selector: string): string;
  generateTextAssertion(selector: string, expected: string): string;
}
```

### Playwright Adapter

Playwright adapter'ı şu pattern'de kod üretir:

```typescript
// Playwright Page Object
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: /password/i });
    this.loginButton = page.getByRole('button', { name: 'Sign In' });
  }

  async navigate(): Promise<void> {
    await this.page.goto('https://example.com/login');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

### Cypress Adapter

Cypress adapter'ı fluent interface pattern'inde kod üretir:

```typescript
// Cypress Page Object
class LoginPage {
  usernameInput = '[data-testid="username-input"]';
  passwordInput = '[data-testid="password-input"]';
  loginButton = '[data-testid="login-button"]';

  visit() { cy.visit('/login'); return this; }
  fillUsername(username: string) { cy.get(this.usernameInput).clear().type(username); return this; }
  fillPassword(password: string) { cy.get(this.passwordInput).clear().type(password); return this; }
  clickLogin() { cy.get(this.loginButton).click(); return this; }
  login(username: string, password: string) {
    return this.fillUsername(username).fillPassword(password).clickLogin();
  }
}
```

### Selenium Python Adapter

Selenium Python adapter'ı WebDriverWait ve expected_conditions ile kod üretir:

```python
# Selenium Python Page Object
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class LoginPage:
    USERNAME_INPUT = (By.CSS_SELECTOR, '[data-testid="username-input"]')
    PASSWORD_INPUT = (By.CSS_SELECTOR, '[data-testid="password-input"]')
    LOGIN_BUTTON = (By.CSS_SELECTOR, '[data-testid="login-button"]')

    def __init__(self, driver: WebDriver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    def navigate(self) -> 'LoginPage':
        self.driver.get('https://example.com/login')
        return self

    def login(self, username: str, password: str) -> 'LoginPage':
        self.wait.until(EC.element_to_be_clickable(self.USERNAME_INPUT)).send_keys(username)
        self.wait.until(EC.element_to_be_clickable(self.PASSWORD_INPUT)).send_keys(password)
        self.wait.until(EC.element_to_be_clickable(self.LOGIN_BUTTON)).click()
        return self
```

### POMGenerator Sınıfı

POMGenerator, adapter registry üzerinden framework seçimi yapar. generatePageClass(model) ve generateTest(test, model) metodlarını sunar. Ayrıca tüm elementler için selector özeti üreten generateSelectorSummary(model) metodu bulunur.


---

## 8. Recorder (content-script/recorder.ts)

Recorder, kullanıcının tarayıcıdaki etkileşimlerini izler ve bunları adım adım test senaryosuna dönüştürür.

### RecordedStep Arayüzü

```typescript
enum StepAction {
  CLICK, DOUBLE_CLICK, RIGHT_CLICK, HOVER,
  FILL, SELECT, CHECK, UNCHECK, FOCUS, BLUR,
  NAVIGATE, SELECT_OPTION, SCROLL, KEY_PRESS,
  WAIT, ASSERTION, SUBMIT, FILE_CHOOSE, DRAG_AND_DROP, CUSTOM,
}

interface RecordedStep {
  id: string;
  action: StepAction;
  selector: SelectorResult;
  value?: string;
  previousValue?: string;
  key?: string;
  keyModifiers?: string[];
  tagName?: string;
  elementType?: string;
  isPassword?: boolean;
  isSubmit?: boolean;
  timestamp: number;
  duration?: number;
  delay?: number;
  pageUrl: string;
  screenshot?: string;
  beforeSnapshot?: string;
  afterSnapshot?: string;
  assertions?: StepAssertion[];
}

interface StepAssertion {
  type: 'visible' | 'hidden' | 'enabled' | 'disabled' | 'text' | 'value' | 'attribute' | 'url' | 'count';
  expected?: string;
  actual?: string;
  selector?: SelectorResult;
}
```

### Recorder Özellikleri

**Event Dinleyicileri:**
- click, dblclick, contextmenu (capture phase)
- input, change, focus, blur
- submit (form)
- mouseenter (opsiyonel: hover kaydı)
- scroll (opsiyonel: scroll kaydı)
- keydown (sadece Enter, Tab, Escape, ok tuşları, F tuşları)

**Debounce Mekanizması:**
- input/change olayları 300ms debounce ile tekilleştirilir
- Her tuş vuruşu ayrı adım olarak kaydedilmez
- Kullanıcı yazmayı bıraktıktan 300ms sonra tek bir fill adımı oluşturulur
- Her input alanı için ayrı debounce timer tutulur

**SPA Navigasyon Dedektörü (HistoryObserver):**
- history.pushState ve history.replaceState monkey-patch
- popstate event listener
- URL değişikliğinde NAVIGATE adımı oluşturulur
- Observer pattern ile URL değişikliği bildirimi

**DOM Mutation Observer:**
- childList değişiklikleri izlenir
- Dynamic content (modal, toast) tespiti
- Yeni eklenen elementler loglanır
- Recorder'a doğrudan etkisi yoktur, debug amaçlıdır

**Güvenlik:**
- Password alanları isPassword=true olarak işaretlenir
- Password değerleri masked (************) olarak saklanır
- Export sırasında password değerleri placeholder ile değiştirilir
- QA Element Finder overlay elementleri otomatik atlanır

---

## 9. Player (content-script/player.ts)

Player, kaydedilmiş test adımlarını sırayla çalıştırır ve her adımın sonucunu raporlar.

### PlayResult Arayüzü

```typescript
interface PlayResult {
  id: string;
  testName: string;
  startTime: number;
  endTime: number;
  duration: number;
  totalSteps: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  passed: boolean;
  stepResults: StepResult[];
  error?: string;
  screenshot?: string;
  logs: string[];
}

interface StepResult {
  stepId: string;
  stepIndex: number;
  action: StepAction;
  passed: boolean;
  error?: string;
  errorType?: 'selector' | 'timeout' | 'assertion' | 'execution' | 'unknown';
  actualValue?: string;
  expectedValue?: string;
  selector?: string;
  screenshot?: string;
  duration: number;
  timestamp: number;
  retryCount: number;
  warnings: string[];
}
```

### Player Özellikleri

**Adım Yürütme Döngüsü:**
1. Element bul (querySelector + retry loop)
2. Görünürlük kontrolü (display, visibility, opacity, offset)
3. Enable kontrolü (disabled attribute)
4. Auto-scroll (scrollIntoView + smooth behavior)
5. Highlight (geçici outline stili)
6. Action'ı gerçekleştir (fill, click, select, vb.)
7. Inline assertion'ları kontrol et
8. Screenshot al (opsiyonel)
9. Step sonucunu background'a bildir

**Retry Mekanizması:**
- Her adım için config.retryCount kadar tekrar deneme
- Başarısız adımda config.retryDelay kadar bekleme
- Sadece element bulma hatasında değil, tüm hata tiplerinde retry

**Assertion Tipleri:**
- visible: Element görünür mü? (display, visibility, opacity kontrolü)
- text: expectedText ile elementin textContent'i eşleşiyor mu?
- value: expectedValue ile input/select element value'su eşleşiyor mu?
- url: current URL expected ile eşleşiyor mu?
- attribute: Element attribute'ü expected ile eşleşiyor mu?

**Hata Kategorizasyonu:**
- selector: Element DOM'da bulunamadı veya selector geçersiz
- timeout: Element bekleme süresi aşıldı
- assertion: Beklenen değer gerçek değerle eşleşmedi
- execution: Action sırasında hata (görünmez element, disable element)
- unknown: Kategorize edilemeyen hatalar


---

## 10. Storage Katmanı (shared/storage.ts)

Storage katmanı, IndexedDB üzerinde bir wrapper olarak çalışır. Tüm veritabanı işlemleri promise tabanlıdır ve idb kütüphanesini kullanır.

### IndexedDB Schema

```
Database: qa-element-finder (v1)

Object Stores:
├── testSuites
│   ├── keyPath: id (string, UUID)
│   ├── indexes: by_name, by_createdAt
│   └── value: TestSuite
│
├── pageModels
│   ├── keyPath: id (string, UUID)
│   ├── indexes: by_name, by_url, by_updatedAt
│   └── value: PageModel
│
├── settings
│   ├── keyPath: key (string)
│   └── value: { key, value, updatedAt }
│
└── testResults (future)
    ├── keyPath: id (string, UUID)
    └── indexes: by_testSuiteId
```

### Storage API

Storage sınıfı singleton pattern ile uygulanmıştır. Temel CRUD operasyonlarının yanı sıra şu özellikleri sunar:

- **getAllTestSuites / getTestSuite / saveTestSuite / deleteTestSuite**: Test suite CRUD
- **getAllPageModels / getPageModel / getPageModelByUrl / savePageModel / deletePageModel**: Page model CRUD
- **duplicatePageModel**: Varolan page modeli kopyalama
- **getSetting / setSetting / deleteSetting / getAllSettings**: Key-value ayar yönetimi
- **importSettings / exportSettings**: Ayarları içe/dışa aktarma
- **exportAllData / importAllData**: Tüm veriyi JSON olarak içe/dışa aktarma
- **clearAllData**: Tüm veritabanını temizleme
- **getStorageStats**: Depolama istatistikleri (element sayısı, tahmini boyut)

### Default Settings

```typescript
const defaultSettings = {
  framework: 'playwright',
  timeout: 30000,
  recordingDebounce: 300,
  failMode: 'stop',        // 'stop' | 'continue' | 'skip-on-fail'
  captureScreenshots: false,
  showOnlyUnique: true,
  defaultSelectorStrategy: 'data-attribute',
  theme: 'system',         // 'light' | 'dark' | 'system'
  language: 'en',
  telemetryEnabled: false,
  autoSaveInterval: 60000,
  maxRecentElements: 50,
};
```

### Schema Migration

Veritabanı versiyonlaması idb'nin upgrade callback'i ile yönetilir:
- v1: İlk schema (testSuites, pageModels, settings)
- v2: testResults store eklenecek (future)
- Her versiyon geçişinde eski veri korunur veya migrate edilir

---

## 11. State Yönetimi (Zustand Store)

Global state, Zustand store'ları üzerinden yönetilir. Her bileşen kendi ihtiyacı olan state'e abone olur ve gereksiz re-render'ları önler.

### Extension Store (Global State)

ExtensionStore aşağıdaki state alanlarını yönetir:

- **Bağlantı Durumu**: isConnected, activeTabId, activeTabUrl
- **Picker State**: pickerActive, pickerMode (single/multi), pickerColor
- **Recorder State**: recorderStatus (idle/recording/paused), recordedSteps[], recordingStartTime
- **Player State**: playerStatus (idle/playing/paused/complete), playerProgress, lastPlayResult
- **Element State**: selectedElement, recentElements[]
- **Page Model State**: currentPageModel, pageModelList[]
- **Test Suite State**: activeTestSuite, activeTestIndex, testSuiteList[]
- **Settings**: framework, timeout, recordingDebounce, failMode, vb.

Middleware'ler:
- **devtools**: Redux DevTools entegrasyonu (geliştirme sırasında state debugging)
- **persist**: recentElements ve settings sadece localStorage'da kalıcı olarak saklanır

### UI Store (UI State)

UIStore aşağıdaki state alanlarını yönetir:
- Panel görünürlükleri (elementInspector, codePreview, exportDialog, importDialog, settingsDialog)
- Notification yönetimi (ekleme, otomatik kapatma, temizleme)
- Sidebar durumu (collapsed/expanded)


---

## 12. Popup Bileşen Mimarisi

Popup, hızlı aksiyonlar için 360x480 piksel boyutunda bir açılır penceredir.

### Popup Bileşenleri

| Bileşen | Sorumluluk |
|---|---|
| ElementPicker.tsx | Element seçici başlatma butonu, durum göstergesi |
| QuickActions.tsx | Hızlı aksiyon butonları (seç, kaydet, DevTools aç) |
| RecorderControl.tsx | Kayıt başlat/durdur, süre göstergesi |
| RecentElements.tsx | Son seçilen 5 elementin listesi |
| StatusBar.tsx | Eklenti durumu (hazır, kayıt aktif, hata) |

### Popup Aksiyonları

1. **Element Seç**: PICK_ELEMENT mesajı → background → content script → popup kapanır
2. **Kayda Başla/Durdur**: RECORD_START/RECORD_STOP mesajı → background → content script
3. **DevTools Aç**: DevTools panelini açar (chrome.devtools.panels.create ile kayıtlı)
4. **Ayarlar**: Options sayfasını açar (chrome.runtime.openOptionsPage)

Popup, aksiyon gönderildikten sonra window.close() ile kapanır. Kullanıcı content script üzerinden çalışmaya devam eder.

---

## 13. DevTools Panel Mimarisi

DevTools paneli, tam teşekküllü bir IDE benzeri arayüz sunar. Element inceleme, selector listesi, kayıt/oynatma, page model düzenleme ve dışa aktarma gibi tüm gelişmiş özellikleri içerir.

### DevTools Panelleri

| Panel | Sorumluluk |
|---|---|
| ElementInspector | Element bilgileri, selector alternatifleri, kopyalama, page model'e kaydetme |
| SelectorList | Tüm selector stratejilerini görüntüleme, karşılaştırma, önizleme |
| RecorderPanel | Kayıt kontrolü, adım listesi, adım düzenleme, silme, yeniden sıralama |
| PlayerPanel | Oynatma kontrolü, progress, canlı sonuçlar, log görüntüleme |
| PageModelPanel | Page model oluşturma/düzenleme, element ekleme/çıkarma, framework seçimi |
| TestSuitePanel | Test suite yönetimi, test sıralaması, batch oynatma |
| ExportPanel | Kod önizleme (Monaco Editor), framework seçimi, kopyalama/indirme |

### DevTools Port Bağlantısı

DevTools, background ile chrome.runtime.connect ile sürekli bir port bağlantısı kurar. Bu port üzerinden:
- Canlı element seçimi sonuçları
- Kayıt adımları (stream)
- Oynatma sonuçları (stream)
- State güncellemeleri

Port bağlantısı sayesinde DevTools paneli açık kaldığı sürece service worker canlı kalır.

---

## 14. Options Sayfası

Options sayfası, kullanıcının eklenti ayarlarını yapılandırması için bir arayüz sunar.

### Options Bölümleri

| Bölüm | Ayarlar |
|---|---|
| GeneralSettings | Tema (light/dark/system), dil, telemetry |
| FrameworkSettings | Varsayılan framework, timeout, fail mode |
| RecorderSettings | Debounce aralığı, screenshot capture, hover/scroll kaydı |
| StorageSettings | Veri yönetimi, import/export, temizleme |
| ShortcutSettings | Klavye kısayolları (Ctrl+Shift+S, Ctrl+Shift+R, Ctrl+Shift+I) |

---

## 15. Adaptör Arayüzleri ve Çıktı Formatları

### Adapter Registry

```typescript
class POMGenerator {
  private adapterRegistry: Map<FrameworkType, TestFrameworkAdapter>;

  constructor() {
    this.adapterRegistry.set(FrameworkType.PLAYWRIGHT, new PlaywrightAdapter());
    this.adapterRegistry.set(FrameworkType.CYPRESS, new CypressAdapter());
    this.adapterRegistry.set(FrameworkType.SELENIUM_PYTHON, new SeleniumPythonAdapter());
  }

  generatePageClass(model: PageModel): string {
    return this.getAdapter(model.framework).generatePageClass(model);
  }
}
```

### Yeni Adapter Ekleme

Yeni bir framework desteği eklemek için:
1. shared/adapters/ altında yeni dosya oluştur
2. TestFrameworkAdapter interface'ini implemente et
3. Adapter'ı POMGenerator registry'sine ekle
4. Birim testlerini yaz


---

## 16. Güvenlik Modeli

### Content Script Güvenliği

- Content script ISOLATED world'de çalışır, sayfanın JS context'ine erişemez
- Sayfanın global değişkenlerine erişim sadece postMessage bridge ile
- Bridge mesajları source ve origin doğrulaması yapar
- Eklenti overlay elementleri data-qa-element-finder attribute'ü ile işaretlenir

### Veri Güvenliği

- Password field değerleri asla düz metin olarak saklanmaz
- Export sırasında password değerleri placeholder ile değiştirilir
- Screenshot'lar sadece kullanıcı izni ile alınır
- Tüm veri local IndexedDB'de saklanır, harici bir servise gönderilmez

### Manifest V3 Güvenlik Politikaları

- eval() kullanımı yasaktır
- unsafe-inline script'lere izin verilmez
- Content Security Policy (CSP) header'ı ile koruma
- host_permissions <all_urls> kullanıcı onayı gerektirir

---

## 17. Hata Yönetimi ve Logging

### Logger Sistemi

Logger, tüm bileşenlerde kullanılan merkezi bir logging sistemidir:

```typescript
enum LogLevel { DEBUG, INFO, WARN, ERROR }

class Logger {
  private static level: LogLevel = LogLevel.INFO;

  static debug(message: string, data?: unknown): void {
    if (Logger.level <= LogLevel.DEBUG) {
      console.debug(\[QA-Finder] \\, data);
      // Background'a log mesajı gönder
    }
  }

  static info(message: string): void { /* ... */ }
  static warn(message: string): void { /* ... */ }
  static error(message: string, error?: unknown): void { /* ... */ }
}
```

### Hata Kategorileri

| Hata Türü | Açıklama | Recovery |
|---|---|---|
| SELECTOR_NOT_FOUND | Element DOM'da bulunamadı | Retry, wait, sonra skip |
| SELECTOR_NOT_UNIQUE | Selector birden fazla element eşleştirdi | Alternatif selector dene |
| ELEMENT_NOT_VISIBLE | Element görünür değil | Scroll, wait, sonra warning |
| ELEMENT_DISABLED | Element disabled | Warning ile devam et |
| ASSERTION_FAILED | Beklenen değer eşleşmedi | Testi durdur (failMode=stop) veya devam et |
| TIMEOUT | İşlem zaman aşımına uğradı | Retry, sonra skip |
| MESSAGE_ERROR | Bileşenler arası iletişim hatası | Yeniden gönder |
| STORAGE_ERROR | IndexedDB işlem hatası | Kullanıcıya bildir |

---

## 18. Performans Hedefleri ve Kısıtlar

### Hedefler

| Metrik | Hedef | Ölçüm Yöntemi |
|---|---|---|
| Popup açılış süresi | < 200ms | Chrome performance timeline |
| Element seçme süresi | < 100ms | SelectorEngine timer |
| Selector üretme süresi | < 50ms | Performance.now() |
| Kayıt başlatma süresi | < 50ms | Event listener setup |
| Adım oynatma süresi | < gerçek etkileşim süresi | StepResult.duration |
| Bundle boyutu (popup) | < 100KB | Vite build report |
| Bundle boyutu (devtools) | < 200KB | Vite build report |
| Bundle boyutu (content) | < 50KB | Vite build report |
| IndexedDB sorgu süresi | < 10ms | IDB transaction timer |

### Kısıtlar

- Service worker 30 saniye idle sonrası sonlanır (keep-alive alarm ile aşılır)
- Content script tekil mesaj boyutu 64MB ile sınırlıdır
- Popup 360x480 piksel ile sınırlıdır
- DevTools paneli sadece geliştirici araçları açıkken çalışır
- IndexedDB tarayıcı depolama limitine tabidir (genelde > 1GB)

---

## 19. Test Stratejisi

### Birim Testleri (Unit)

| Test Dosyası | Kapsam |
|---|---|
| selector-engine.test.ts | Her strateji için DOM mock'ları, generateSelectors testi |
| pom-generator.test.ts | Her adapter için çıktı formatı, PageModel dönüşümü |
| storage.test.ts | CRUD, import/export, migration testleri |
| playwright.test.ts | Playwright kod üretimi, syntax doğrulama |
| cypress.test.ts | Cypress kod üretimi, fluent chain testi |
| selenium-python.test.ts | Python kod üretimi, WebDriverWait pattern testi |

### Entegrasyon Testleri (Integration)

| Test Dosyası | Kapsam |
|---|---|
| popup-interaction.test.ts | Mesaj gönderme, state güncelleme, UI rendering |
| devtools-panel.test.ts | Port bağlantısı, panel geçişleri, element seçme akışı |
| content-script.test.ts | DOM enjeksiyonu, event handling, observer'lar |

### Uçtan Uca Testler (E2E)

| Test | Kapsam |
|---|---|
| extension-flow.test.ts | Tam kullanıcı akışı: element seç → page model oluştur → export → import et |

### Test Araçları

- **Vitest**: Birim ve entegrasyon testleri için
- **Playwright**: E2E testleri için (test uzantısını yükleyerek)
- **Sinon.js**: Mock ve stub'lar için
- **istanbul/v8**: Kod kapsama analizi için


---

## 20. Gelecek Genişletmeler

### Kısa Vade (v1.1 - v1.5)

- **Iframe Desteği**: İframe içindeki elementleri seçme ve recorder/player desteği
- **Shadow DOM**: Shadow DOM içindeki elementleri seçme
- **SVG Elementleri**: SVG elementleri için selector desteği
- **Drag & Drop**: Drag and drop action'larını kaydetme ve oynatma
- **Test Raporu**: HTML/PDF formatında test raporu oluşturma
- **CI/CD Entegrasyonu**: CLI mode ile CI pipeline'ında çalıştırma

### Orta Vade (v2.0)

- **Yeni Framework Adapter'ları**: Puppeteer, TestCafe, WebDriverIO
- **Visual Regression**: Görsel karşılaştırma ile selector doğrulama
- **Test Verisi Yönetimi**: CSV/JSON test verisi import, data-driven test
- **Collaboration**: Page model ve test suite paylaşımı (cloud sync)
- **Record & Playback Profiler**: Hangi selector'ların yavaş/kırılgan olduğunu analiz

### Uzun Vade (v3.0+)

- **AI Destekli Selector**: ML modeli ile en stabil selector'ü tahmin etme
- **Self-Healing Selector**: DOM değişikliklerinde selector'leri otomatik güncelleme
- **Cross-Browser Cloud Test**: Birden fazla tarayıcıda eşzamanlı test
- **Performance Testing**: Lighthouse entegrasyonu ile performance assertion
- **Accessibility Testing**: Axe/core entegrasyonu ile a11y kontrolü

---

## Ek A: Mimari Diyagramlar

### Bileşen Etkileşim Diyagramı

```
Popup           Background         Content Script      IndexedDB
  │                 │                   │                 │
  │── pick ────────►│── tabs.msg ──────►│                 │
  │                 │                   │── element seç  │
  │                 │◄── selected ──────│                 │
  │◄── result ─────│                   │                 │
  │                 │                   │                 │
  │── record ──────►│── tabs.msg ──────►│                 │
  │                 │                   │── event listen │
  │                 │◄── step ─────────│                 │
  │◄── step ───────│                   │                 │
  │                 │                   │                 │
  │── save ────────►│──────────────────────────────────►│
  │◄── saved ──────│◄──────────────────────────────────│
```

### Selector Strateji Karar Ağacı

```
                  Element
                     │
                     ▼
            ┌─── data-testid? ───┐
            │ yes                │ no
            ▼                    ▼
        Score: 100       ┌─── data-cy? ───┐
                         │ yes            │ no
                         ▼                ▼
                     Score: 100     ┌─── data-qa? ───┐
                                    │ yes            │ no
                                    ▼                ▼
                                Score: 100    ┌─── ARIA role? ───┐
                                              │ yes              │ no
                                              ▼                  ▼
                                          Score: 80     ┌─── text content? ───┐
                                                         │ yes                │ no
                                                         ▼                    ▼
                                                     Score: 60       ┌─── semantic CSS? ───┐
                                                                      │ yes                │ no
                                                                      ▼                    ▼
                                                                  Score: 40       ┌─── complex CSS? ───┐
                                                                                   │ yes                │ no
                                                                                   ▼                    ▼
                                                                                Score: 20          XPath (Score: 10)
```

---

## Ek B: Kısaltmalar ve Terimler

| Kısaltma | Açıklama |
|---|---|
| ADR | Architecture Decision Record |
| POM | Page Object Model |
| SW | Service Worker |
| CSP | Content Security Policy |
| SPA | Single Page Application |
| WAI-ARIA | Web Accessibility Initiative - Accessible Rich Internet Applications |
| HMR | Hot Module Replacement |
| IDB | IndexedDB |
| UUID | Universally Unique Identifier |
| E2E | End-to-End (test) |
| CI/CD | Continuous Integration / Continuous Deployment |

---

## Ek C: Referanslar

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Playwright Test API](https://playwright.dev/docs/api/class-page)
- [Cypress API](https://docs.cypress.io/api/table-of-contents)
- [Selenium Python Documentation](https://selenium-python.readthedocs.io/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [idb (IndexedDB Promise Wrapper)](https://github.com/jakearchibald/idb)
- [Vite Documentation](https://vitejs.dev/guide/)
