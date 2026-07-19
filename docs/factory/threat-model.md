# Manifest V3 Browser Extension Threat Model (STRIDE)

**Hedef:** QA_ELEMENT_FINDER — yerel çalışan, telemetrisiz, bulut senkronizasyonsuz tarayıcı uzantısı.
**Kapsam:** Chrome / Firefox / Edge / Safari (cross-browser Manifest V3).
**Tarih:** 2026-07-19
**Yöntem:** STRIDE (Microsoft Threat Modeling).

---

## 1. Sistem Özeti

QA_ELEMENT_FINDER tamamen yerel çalışan bir QA otomasyon aracıdır. Hiçbir uzak sunucuyla
iletişim kurmaz, telemetri toplamaz, bulut senkronizasyonu sunmaz. Üç ana bileşenden oluşur:

1. **Content Script** — Sayfa DOM'una erişir, selector'ları analiz eder, kullanıcı etkileşimlerini kaydeder.
2. **Background Service Worker (MV3)** — Mesaj yönlendirme (message routing) ve IndexedDB kalıcılığı (persistence) görevlerini yürütür.
3. **Popup / DevTools UI** — React tabanlı arayüz; kayıt oynatım, selector önizleme ve dışa aktarım sağlar.

Önemli güvenlik varsayımları:
- Tüm veriler tarayıcı profilinde yerel olarak saklanır (`IndexedDB` + `storage.local`).
- Hiçbir third-party analitik veya tracking SDK'sı yoktur.
- Uzantı yalnızca `activeTab` ve minimum gerekli `host_permissions` ile çalışır.

---

## 2. STRIDE Threat Model Tablosu

| # | Kategori (STRIDE) | Tehdit Senaryosu | Etki | Mitigasyon | Severity |
|---|---|---|---|---|---|
| S | **Spoofing** | Kötü niyetli sayfa context'i, `window.postMessage` ile uzantıya sahte komut gönderir (örn. "kaydı durdur", "tüm veriyi sil"). | Yanlış komut çalıştırma, veri kaybı. | Tüm mesajlaşma **yalnızca `chrome.runtime.sendMessage` / `browser.runtime.sendMessage** üzerinden yapılır. `window` mesajları yok sayılır. Receiver'da `sender.id` uzantı kimliğiyle karşılaştırılır; eşleşmeyen mesajlar reddedilir. Sender origin doğrulanır. | **High** |
| S | **Spoofing** | Zararlı sayfa, `externally_connectable` üzerinden uzantıya bağlanmaya çalışır. | Yetkisiz erişim. | `manifest.json` içinde `externally_connectable` tanımlı değil (veya yalnızca boş `ids: []`). Hiçbir web sayfası `connect()` çağrısı yapamaz. | Medium |
| T | **Tampering** | IndexedDB'deki kayıt verisi bir başka uzantı veya profile-dışı işlem tarafından bozulur; geçersiz selector formatı enjeksiyonu. | Hatalı再生, çökmeler. | Her veri okumasında **schema versioning** + **validation on read**: kaydedilen her objede `schemaVersion` alanı; okurken `zod`/tip güvencesi doğrulaması; uyumsuz kayıt reddedilir veya migrate edilir. Migration adımları geri-almalı (idempotent) yazılır. | High |
| T | **Tampering** | Export edilen test scripti üçüncü taraf tarafından değiştirilip yeniden import edilir. | Komut enjeksiyonu. | Import sırasında script **AST/deterministik parser** ile doğrulanır; tanınmayan komut türleri reddedilir. Import öncesi checksum (SHA-256) hesaplanır ve kullanıcıya gösterilir. | Medium |
| R | **Repudiation** | Kullanıcı, kaydedilen bir testin sonucunu inkar eder; hangi eylemin hangi zaman damgasıyla çalıştığı belirsizdir. | Denetim eksikliği. | Her test çalıştırması **deterministik execution trace** üretir: adım no, selector, aksiyon, timestamp (ms), sonuç, ekran görüntüsü hash. Trace `IndexedDB`'ye append-only yazılır; kullanıcı tarafından silinemez, yalnızca tüm-testidir. | Medium |
| R | **Repudiation** | Service worker çökme sonrası yarım kalmış işlem durumu. | Belirsiz durum. | Her uzun iş öncesi `pending_ops` tablosuna intent yazılır; işlem bitince durum `completed`/`failed` olarak işaretlenir. Yeniden başlatmada bekleyen işler idempotent olarak yeniden denenir. | Low |
| I | **Information Disclosure** | Kaydedilen test scriptinde `input[type=password]` veya hassas alanların düz metin değeri export dosyasına sızar. | Kimlik bilgisi sızıntısı. | Export öncesi **otomatik maskeleme**: `type="password"`, `autocomplete="current-password"`, `name` heuristiği (`password`, `pwd`, `secret`, `token`, `otp`) içeren alanlar `***` ile değiştirilir. Kullanıcıya maskeleme özeti gösterilir ve onay istenir. Tüm export'lar `meta.maskedFields: string[]` listesi içerir. | **Critical** |
| I | **Information Disclosure** | DevTools / popup React state'inde hassas veriler ekranda açık kalır ( shoulder-surfing ). | Görsel sızıntı. | Hassas alanlar UI'da varsayılan `••••` ile gösterilir; "göster" toggle'ı kullanıcı isteğine bağlı ve 10 sn sonra otomatik kapanır. | Medium |
| I | **Information Disclosure** | Hata log'larına (console) DOM değeri, cookies veya selector içeren tam sayfa HTML'i yazılır. | Log sızıntısı. | Production build'lerinde `console.*` çağrıları kaldırılır (build strip). Hata raporları yalnızca `error.code` + `error.module` taşır; ham DOM veya değer içermez. | High |
| I | **Information Disclosure** | MutationObserver, sayfanın `localStorage` / `sessionStorage` içeriğini yakalayıp kayıt verisine gömer. | Yanlışlıkla veri yakalama. | Kayıt sırasında yalnızca kullanıcı etkileşim olayları (`click`, `input`, `change`, `keydown` vb.) ve selector context'i saklanır. `storage` event'leri, `fetch`/`XHR` payload'ları, network body'leri **kaydedilmez**. Allow-list tabanlı olay filtresi. | High |
| D | **Denial of Service** | Sayfa dev dev cycle ile DOM mutation üretir; MutationObserver callback havuzu şişer, uzantı çöker/tarayıcı kilitlenir. | Uzantı kullanılamaz. | Observer batch processing: max 1000 mutation/flush, flush arası 50ms debounce, callback 200ms timeout'a bağlanır; limit aşılırasında observer geçici olarak `disconnect()` edilir, kullanıcıya uyarı gösterilir. | High |
| D | **Denial of Service** | Çok büyük DOM (>500k node) selector sorgusu sırasında O(n) tarama CPU'yu doyurur. | UI donması. | `querySelector` öncesi node count sanity-check; eşik aşılırsa headless-off moduna geçilir ve iş parça parça `requestIdleCallback` ile yürütülür. Max selector resolve süresi 2 sn timeout. | Medium |
| D | **Denial of Service** | Sayfa sonsuz `alert()` / `prompt()` döngüsü ile popup'ı bloke eder. | Tespit imkansız. | Content script, sayfa yüklendiğinde `window.alert/prompt/confirm`'i opsiyonel olarak stub'lar (kullanıcı ayarı). Varsayılan devre-dışı. | Low |
| E | **Elevation of Privilege** | Sayfa context JS'i, uzantının content script `window` objesini değiştirerek extension state'e erişir. | Veri sızıntısı. | **Isolated world**: content script, sayfanın JS world'ünden ayrı bir isolated world'de çalışır; sayfa `window`'una yazdığı wrapper'lar extension tarafından görülmez. Extension state hiçbir zaman `window`'a asla yazılmaz; yalnızca `chrome.storage` / `IndexedDB` ve module-scope closure'da tutulur. | **Critical** |
| E | **Elevation of Privilege** | Üçüncü taraf uzantı, `storage.local`'a yazmaya çalışır veya `runtime.sendMessage` ile sahte port açar. | Yetki aşımı. | Extension ID doğrulaması her mesaj `sender.id === chrome.runtime.id` ile yapılır. `externally_connectable` kapalı. `storage` API'leri uzantı başına izolelidir; üçüncü parti doğrudan erişemez. | High |
| E | **Elevation of Privilege** | Export edilen test scripti, kobalt/eval tabanlı runtime'da `window.eval` çağrısı yapar. | Keyfi kod çalıştırma. | Test再生 motorunda `eval` / `Function()` yasaktır. Komutlar saf data-driven interpreter ile çalıştırılır (saf dizi uygulanır). Allow-list: `click`, `type`, `assert`, `wait` vb. sabit komut kümesi. | High |

---

## 3. Manifest V3 Security Considerations

### 3.1 Service Worker Lifecycle
MV3, service worker'ları kısa ömürlü ve event-driven yapar (Chrome'da ~30 sn idle).
Bu durum aşağıdaki güvenlik etkilerini taşır:

- **State persistence için `window` global'i kullanılamaz.** Tüm state `chrome.storage.session` (geçici) veya `IndexedDB` (kalıcı) içinde tutulur. Bu sayede worker yeniden başlatılsa da state bozulmaz.
- **Long-running işler `chrome.alarms` + idempotent adımlar** ile bölünür. Bir görev parçası çökerse aynı adım güvenli biçimde yeniden denenebilir.
- **Message handler timeout'ları** zorunludur: 5 sn içinde cevap vermeyen handler abort edilir; askıdawa serbest bırakılır. Aksi halde saldırgan sayfa, uzun iş ile service worker'ı kilitler (DoS).

### 3.2 Minimum Permissions (Principle of Least Privilege)
- `host_permissions`: Yalnızca `"<all_urls>"` yerine **kullanıcı tarafında onaylanmış** aktif sekme kapsamı tercih edilir; cross-browser uyumluluk için Firefox'ta `activeTab` + opsiyonel `optional_host_permissions` kullanılır.
- `permissions`: Sadece `storage`, `scripting`, `activeTab`, `devtools`, `identity`(kullanıcıysa). `tabs`, `webRequest`, `webRequestBlocking` ** yok** .
- `content_security_policy`: `"script-src 'self'; object-src 'self'; base-uri 'self'"` . Inline script, `eval`, `unsafe-inline` tamamen yasak. React build'i CSR'de `unsafe-inline` gerektiriyorsa nonces/hash-based CSP kullanılır.
- `web_accessible_resources`: Yalnızca gerçeken ihtiyaç duyulan varlıklar (örn. kayıt overlay ikonu) listelenir; `extension_ids: []` ile diğer uzantılarla paylaşım engellenir. Aksi halde fingerprinting vektörü olur.

### 3.3 Cross-Browser Notlar
- Firefox `browser.*` namespace'i promise dönerken, Chrome `chrome.*` callback tabanlıdır. `webextension-polyfill` kullanılır ama **yalnızca bu tek bağımlılık** (bkz. Dependency Hygiene).
- Safari MV3 desteği sınırlı; `service_worker` tipinde `background` Safari'de desteklenmez, `background.scripts` fallback'i gerekir. Bu farklar build-time feature-flag ile yönetilir, raw runtime branching değil.

---

## 4. Content Script Isolation Notes

### 4.1 Isolated World Mekanizması
Browser, content script'leri sayfanın main world'ünden **ayrı bir isolated JS world**'unda çalıştırır. Bu, iki kritik güvenlik özelliği sağlar:

1. **Sayfa, content script'in global'lerini göremez.** Extension'ın `let recordingState = true;` gibi değişkenleri sayfa context'inde görünmez; sayfa `window.recordingState'` okuyamaz.
2. **Sayfa, content script'in DOM element listener'larını override edemez.** Sayfa `Element.prototype.addEventListener`'ı patch'lese bile isolated world bu patch'ten etkilenmez (her world kendi prototype kopyasına sahiptir).

### 4.2 Yaşayabilecek Tek Risk: DOM Paylaşımı
İki world **aynı DOM'u** paylaşır. Yani sayfa, input'value'sunu değiştirebilir, bir element'in `data-qa-selector` attribute'unu silebilir, veya sahte bir element ekleyip selector'ı yönlendirebilir. Koruma:

- Selector'lar kararlılık için `id > data-testid > data-qa > role+name > class path > nth-child` sıralı öncelikle üretilir ama **kayıt anında selector fingerprint** (element tag + parent chain hash) de saklanır.
-再生 sırasında selector'a ek olarak fingerprint doğrulanır; mismatch'te kullanıcı uyarılır (sahte element tespiti).
- Kritik assert'ler için `textDigest` (içeriğin SHA-1 kısa hash) de kullanılır; sayfa metni değiştirse再生 başarısız olur.

### 4.3 `page_world`'e Yanlışlıkla Veri Yazmama Kuralları
- Content script hiçbir zaman `window.__qa_ef_*` gibi global açmaz.
- Sayfaya enjekte edilen UI (overlay) bir **Shadow DOM** içinde包裹; sayfanın CSS'i sızsam bile boxShadow ile korunur.
- DOM verisi okurken sayfanın `Object.defineProperty` trap'lerine karşı `Element.prototype.*` yerine doğrudan IDL getter'ları kullanılır (örn. `Element.prototype.getAttribute.call(el, 'id')`).

---

## 5. Dependency Hygiene (Minimal Bağımlılıklar)

Uzantı çok küçük bağımlılık ayak izi hedefler. İzin verilen paketler:

| Paket | Amaç | Audit Sıklığı |
|---|---|---|
| `webextension-polyfill` | cross-browser API uyumu | her release |
| `zod` | IndexedDB verisi doğrulama | her release |
| `react`, `react-dom` | Popup/DevTools UI | her release |
| (build-only) `vite`, `@crxjs/vite-plugin`, `typescript` | Build tooling; bundle edilmez | her release |

**İzin verilmeyen kategoriler:**
- Analitik/tracking (` Sentry`, `amplitude`, `mixpanel`, vb.) — yok.
- UI kitleri (`MUI`, `antd`, `chakra`) — yok; uzantı boyutu şişirir ve geniş bağımlılık grafiği Walmart saldırı yüzeyini büyütür.
- `lodash` full import — yok; gerekirse tek fonksiyon import (tree-shake).
- Eval tabanlı template motorları (`ejs`, `pug-runtime`) — yok.

**Tedarik zinciri kontrolü:**
- `package-lock.json` commit'lenir, `npm ci` ile kurulur.
- `npm audit --omit=dev --production` her CI'da çalışır; hata varsa build durur.
- Tüm direct dependencies `pinned` (caret yok) son patch sürüme.
- `lockfile-lint` ile `lockfileVersion` ve integrity hash doğrulanır.
- Yeni bağımlılık ekleme `PR review + tek-discipline + bundle size +100KB limit` içinde yapılır.

---

## 6. Must-Have Security Tests Checklist

Aşağıdaki testler CI'da zorunludur; herhangi biri başarısız olursa release engellenir.

- [ ] **TEST-SEC-01 — Sender verification**: Content script'ten geldiği iddia edilen tüm mesajlar için, `sender.id === chrome.runtime.id` kontrolü birim test ile doğrulanır. Sahte `runtime.sendMessage` (mock) reddedilir.
- [ ] **TEST-SEC-02 — IndexedDB schema validation**: Eski `schemaVersion` ile yazılmış bozuk kayıt okunduğunda parser hata fırlatır ve veri migrate edilmeden kullanılmaz. Aykırı durum testleri (`null`, `undefined`, yanlış tip) tüm alanlar için.
- [ ] **TEST-SEC-03 — Password field masking**: `input[type=password]`, `input[autocomplete=current-password]` ve `name` alanı `password|pwd|secret|token|otp` içeren input'lar export'ta `***`'e dönüşür; örnek test scriptinde 10 farklı form fixture ile assertion.
- [ ] **TEST-SEC-04 — MutationObserver DoS limit**: 100k mutation/dakika üreten sentetik sayfa altında observer 200ms içinde disconnect olur, kullanıcı uyarısı tetiklenir, memory 20MB üzerinde kalmaz. Lighthouse/CPU profiler ölçümü CI'a eklenir.
- [ ] **TEST-SEC-05 — Isolated world leakage**: Test sayfası `window.recordingState = "spoofed"` yazar; content script'in kendi `recordingState` değeri etkilenmez. Puppeteer tabanlı entegrasyon testi.
- [ ] **TEST-SEC-06 — CSP compliance**: Build çıktısı `script-src 'self'` ihlal etmez; inline script, `eval`, `unsafe-inline`, `unsafe-eval` bulunmaz. `web-ext lint` + custom CSP header check CI'a eklenir.
- [ ] **TEST-SEC-07 — Export determinism**: Aynı test kaydı iki kez export edildiğinde SHA-256 hash'i birebir aynıdır; üretici fonksiyon zaman damgası veya rastgele ID içermez (dosya metadata hariç). Bu, sahte再生 kanıtı forgery'sini engeller.

---

## 7. Sonuç

Mevzi belge per quarter gözden geçirilir. Yeni özellik (özellikle network, dosya import veya
üçüncü parti entegrasyon) eklenirse bu tabloda karşılık gelen satır güncellenmeli veya yeni satır
eklenmelidir. STRIDE kategorilerinden hiçbiri boş bırakılmaz. Tüm **Critical** maddeleri çözülmeden
release branch'e merge edilemez.
