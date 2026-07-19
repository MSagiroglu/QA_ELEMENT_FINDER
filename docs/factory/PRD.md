# PRD — QA Element Finder

| Alan | Değer |
|---|---|
| Ürün adı | QA Element Finder |
| Sürüm | PRD v1.0 (MVP) |
| Tarih | 2026-07-19 |
| Yazar | Business Analyst (factory) |
| Durum | CTO + Market-Researcher incelemesine hazır |
| Proje dizini | `C:\Users\musta\Desktop\QA_ELEMENT_FINDER` |

---

## 1. Problem ve Vizyon

QA otomasyon mühendisleri zamanlarının önemli bir kısmını DevTools'ta elle selector yazarak, bu selector'ların tekilliğini (uniqueness) elle doğrulayarak ve dinamik id/class kaynaklı kırılgan locator'ları ayıklayarak harcar. Mevcut araçlar ya tek bir framework'e kilitlidir (ör. Selenium IDE), ya kayıt sonrası kod üretimi zayıftır, ya da ürettikleri selector'lar "en sağlam locator" pratiğine uymaz. QA Element Finder, tek tıkla **doğrulanmış tekil** ve **sağlamlık sırasına göre puanlanmış** selector üreten, kullanıcı aksiyonlarını kaydeden, kaydı tarayıcı içinde tekrar oynatabilen ve Playwright/Selenium/Cypress için Page Object Model (POM) kodu üreten bir Manifest V3 tarayıcı eklentisidir. Hedef: bir test mühendisinin "element bul → locator yaz → doğrula → koda dök" döngüsünü dakikalardan saniyelere indirmek.

## 2. Hedef Kullanıcı ve Persona

**Persona: "Otomasyoncu Deniz"** — 25–45 yaş, QA Automation Engineer / SDET. Playwright, Selenium veya Cypress ile web UI testi yazıyor. Günde onlarca kez DevTools'ta selector arıyor; SPA'lardaki dinamik class'lardan (CSS-in-JS, Ember, hashed class) şikayetçi. Kod okur-yazar (TypeScript/Java/Python/JavaScript), POM desenini bilir. Chrome/Edge tabanlı tarayıcıda çalışır; aracın kurumsal ağda, veri dışarı göndermeden, lokal çalışmasını ister.

İkincil persona: **manuel test mühendisi** — otomasyona geçiş sürecinde; kayıt + üretilen kod ile öğrenir. MVP tasarımı birincil personaya optimize edilir.

## 3. Varsayımlar

Kullanıcı "soru sorma" dediği için aşağıdaki belirsizlikler BA tarafından çözülmüştür. Her varsayım mimari fazında CTO tarafından veto edilebilir.

| # | Varsayım | Gerekçe |
|---|---|---|
| A-1 | Dağıtım: store yayını yok; `chrome://extensions` üzerinden "Load unpacked" ile kişisel/ekip içi kurulum. | Gereksinim 10: kişisel/ekip aracı, MVP'de store yok. |
| A-2 | Tüm veri lokalde tutulur (`chrome.storage.local`); hiçbir ağ isteği, telemetri, harici servis yoktur. | Kurumsal QA ortamı + monetizasyon yok. |
| A-3 | "Tekillik" kapsamı = aktif doküman bağlamı: üst sayfa + delik açılmış (pierced) açık shadow root'lar tek bağlam sayılır; her same-origin iframe kendi bağlamında ayrıca tekildir ve adım kaydında iframe zinciri saklanır. | Gereksinim 3'ün teknik netleştirmesi. |
| A-4 | Sağlamlık skoru 0–100 ölçeğindedir; sıralama bölüm 6.2'deki deterministik kural tablosuyla hesaplanır (ML yok). | Öngörülebilirlik ve test edilebilirlik. |
| A-5 | Replay motoru, kaydedilen adımları aynı tarayıcı sekmesinde content script ile çalıştırır; gerçek Playwright/Selenium/Cypress runtime'ı çalıştırmaz. Üretilen framework kodunun çalıştırılması kullanıcının kendi ortamındadır. | Gereksinim 8'in tarayıcı içi yorumu; MV3 kısıtları. |
| A-6 | Desteklenen minimum tarayıcılar: Chrome 116+, Edge 116+, Brave/Opera (Chromium 116+ tabanlı). Firefox 121+ için kod yapısı uyumlu tutulur (`browser` namespace polyfill) fakat MVP'de test edilmez; Safari yalnızca dokümante edilir. | Gereksinim 6; MV3 side panel API kararlılığı. |
| A-7 | Arayüz dili İngilizce'dir (QA araç ekosistemi standardı); bu PRD Türkçe'dir. | Ekip içi kullanım + framework terminolojisi İngilizce. |
| A-8 | Selenium POM çıktısında bekleme stratejisi `WebDriverWait` + `ExpectedConditions` (Java) / `WebDriverWait` + `expected_conditions` (Python) ile üretilir; Playwright ve Cypress kendi auto-wait'ine bırakılır. | Framework best practice. |
| A-9 | Kayıt edilen aksiyon seti MVP'de: `click`, `dblclick`, `type` (input/textarea/contenteditable), `select` (dropdown), `check/uncheck`, `keypress` (Enter/Escape/Tab), `navigate`, `assert-visible` (kullanıcı el ile ekler). Hover, drag-drop, dosya yükleme v2'dir. | Kapsam disiplini. |
| A-10 | "Tipik sayfa" performans referansı: DOM'da ≤ 10.000 element. Üzeri sayfalarda süre hedefi 2 katına esner. | NFR'ları ölçülebilir kılmak. |
| A-11 | Tek kullanıcı, tek makine; senkronizasyon/paylaşım JSON export/import ile yapılır. | Monetizasyon ve backend yok. |
| A-12 | Başarı metrikleri kişisel/ekip aracı bağlamında tanımlanır (gelir metriği yok). | Gereksinim 10. |

## 4. Kapsam — Özellik Listesi ve Öncelik

| ID | Özellik | Öncelik |
|---|---|---|
| F1 | Element Picker (hover highlight + tek tık seçim) | MVP |
| F2 | Selector Engine (tekil + sağlamlık sıralı üretim, dinamik id/class tespiti) | MVP |
| F3 | Çoklu-framework selector çıktısı (Playwright / Selenium / Cypress / CSS / XPath) + skor | MVP |
| F4 | Aksiyon Kaydedici (recorder) | MVP |
| F5 | POM kod üretimi (Playwright TS, Selenium Java, Selenium Python, Cypress JS) | MVP |
| F6 | Tarayıcı içi Replay motoru + koşum raporu | MVP |
| F7 | Side Panel uygulaması (timeline, kopyalama, arama/filtre) | MVP |
| F8 | Proje/test saklama + JSON export/import | MVP |
| F9 | Cross-browser MV3 paketleme (Chromium ailesi; Firefox-uyumlu yapı) | MVP |
| F10 | Assertion editörü (görünürlük ötesi: text-equals, value, attribute) | v2 |
| F11 | Hover, drag-drop, file-upload kaydı | v2 |
| F12 | Closed shadow DOM ve cross-origin iframe desteği | v2 |
| F13 | Firefox resmi test matrisi + Safari (Xcode converter) paketi | v2 |
| F14 | Ekip paylaşımı / senkron (backend) | v2 |

## 5. Fonksiyonel Gereksinimler

Numaralandırma: `FR-<n>`. Her FR tekil (singular) ve doğrulanabilirdir; kabul kriteri (AC) FR'nin hemen altındadır.

### F1 — Element Picker

- **FR-1** Kullanıcı side panel'deki "Pick element" butonuna bastığında eklenti picker moduna girer ve imlecin altındaki element gerçek zamanlı renkli overlay ile vurgulanır.
  - AC: Picker açıkken fare hareketinde overlay hedef elementin bounding box'ını izler; overlay gecikmesi tipik sayfada (A-10) ≤ 50 ms'dir.
- **FR-2** Overlay üzerinde hedef elementin tag'i, `data-testid`/`id`/`class` özeti ve boyutu tooltip olarak gösterilir.
  - AC: Tooltip, seçilmeden önce elementin `tagName` + en az bir tanımlayıcı attribute'unu gösterir.
- **FR-3** Kullanıcı elemente TEK tık yaptığında picker kapanır, element yakalanır ve selector sonuçları panelde görüntülenir; ikinci bir etkileşim gerekmez.
  - AC: Tek tık sonrası panelde birincil selector ve alternatif listesi görünür; sayfadaki orijinal click davranışı (navigasyon vb.) picker modunda bastırılır.
- **FR-4** Picker `Escape` tuşu ile iptal edilebilir.
  - AC: `Escape` sonrası overlay kaybolur ve sayfa etkileşimi normale döner.
- **FR-5** Picker, açık (open) shadow root içindeki elementleri seçebilir (composed path üzerinden gerçek hedefi bulur).
  - AC: Açık shadow root içindeki bir buton seçildiğinde üretilen selector o iç elementi hedefler, host'u değil.
- **FR-6** Picker, same-origin iframe içindeki elementleri seçebilir ve adım kaydına iframe zincirini yazar.
  - AC: Same-origin iframe içindeki element için üretilen çıktıda frame bilgisi yer alır (ör. Playwright `frameLocator`, Selenium `switchTo().frame()`).

### F2 — Selector Engine

- **FR-7** Engine, seçilen element için birincil selector'ı şu sağlamlık sıralamasına göre üretir: (1) `data-testid`/`data-cy`/`data-qa` → (2) kararlı `id` → (3) ARIA role + accessible name → (4) görünür text → (5) `name` attribute → (6) tekil minimal CSS → (7) XPath (son çare).
  - AC: Sıralamadaki daha yüksek kademe tekil sonuç veriyorsa, birincil selector o kademeden üretilir; birim testleri her kademe için en az bir fixture içerir.
- **FR-8** Üretilen her selector (birincil ve alternatifler) sayfada doğrulanır: aktif bağlamda (A-3) tam olarak 1 element eşleşmelidir; eşleşme sayısı ≠ 1 olan aday listeye alınmaz.
  - AC: Panelde gösterilen her selector için eşleşme sayısı = 1'dir ve "verified unique" işareti görünür.
- **FR-9** Engine, otomatik üretilmiş/dinamik id ve class'ları tespit eder ve skorunu düşürür. Tespit kuralları en az şunları kapsar: hash benzeri son ek (`css-1x2y3z`, `sc-`, `jss123`), framework sayaçları (`ember123`, `react-select-2-input`, `:r0:` benzeri React useId), UUID/GUID kalıbı, 8+ karakterlik rastgele alfasayısal blok, salt sayısal id.
  - AC: `id="ember123"` ve `class="css-1x2y3z"` fixture'larında bu değerler birincil selector olarak SEÇİLMEZ; skorları kararlı muadillerinden düşüktür.
- **FR-10** Text tabanlı selector'da text normalize edilir (trim + iç boşluk sadeleştirme) ve 60 karakteri aşan text'ler aday olmaktan çıkarılır.
  - AC: 60+ karakterlik paragraf text'i alternatif listesinde yer almaz.
- **FR-11** Tekil minimal CSS üretiminde engine, en kısa tekil kombinasyonu arar (attribute > nth-of-type; `nth-child` yalnızca başka seçenek yoksa) ve 4 seviyeden derin ancestor zinciri kurmaz; 4 seviyede tekillik sağlanamazsa XPath'e düşer.
  - AC: Üretilen CSS selector'ların ancestor derinliği ≤ 4'tür.
- **FR-12** Selector üretimi + tekillik doğrulaması, tipik sayfada (A-10) element başına p95 < 100 ms'de tamamlanır.
  - AC: 10.000 elementlik sentetik fixture sayfasında 100 ardışık üretim ölçümünün p95'i < 100 ms'dir.

### F3 — Çoklu-framework çıktı

- **FR-13** Seçilen element için panel, birincil selector'ı en üstte, tüm geçerli alternatifleri skor sırasına göre altında listeler.
  - AC: Liste skora göre azalan sıradadır; birincil selector görsel olarak ayrışır.
- **FR-14** Her selector satırı beş sözdiziminde gösterilebilir: Playwright (`page.getByTestId(...)`, `getByRole(...)` vb.), Selenium (`By.cssSelector/By.id/By.name/By.xpath` — Java ve Python biçimi), Cypress (`cy.get(...)`, `cy.contains(...)`), ham CSS, ham XPath.
  - AC: Bir `data-testid`'li element için beş sekmenin/etiketin tamamı sözdizimsel olarak geçerli çıktı üretir (snapshot testleriyle doğrulanır).
- **FR-15** Her selector satırında 0–100 sağlamlık skoru ve kademe etiketi (ör. "test-attribute", "role", "text", "css", "xpath") gösterilir.
  - AC: Skor ve etiket her satırda görünür; aynı element için skor sıralaması FR-7 kademe sıralamasıyla çelişmez (dinamik-id cezası hariç).
- **FR-16** Her selector satırında tek tık "copy" butonu vardır; kopyalama seçili framework sözdiziminde yapılır.
  - AC: Copy sonrası pano içeriği panelde gösterilen string ile birebir aynıdır ve kullanıcıya kısa görsel onay verilir.

### F4 — Aksiyon Kaydedici

- **FR-17** Kullanıcı "Record" butonuyla kayıt başlatıp durdurabilir; kayıt durumu hem panelde hem sayfa üzerinde küçük bir rozetle görünür.
  - AC: Record açık/kapalı durum değişimi ≤ 1 s içinde her iki göstergeye yansır.
- **FR-18** Kayıt sırasında A-9'daki aksiyon seti yakalanır; her adım için hedef elementin selector'ı FR-7/FR-8 kurallarıyla o anda üretilir ve adımla birlikte saklanır.
  - AC: Login senaryosu (navigate → type ×2 → click) kaydedildiğinde timeline'da 4 adım, her adımda doğrulanmış tekil selector bulunur.
- **FR-19** `type` aksiyonlarında ardışık tuş vuruşları tek "fill" adımına birleştirilir (debounce); şifre alanları (`type="password"`) değeri maskelenmiş saklanır ve kod üretiminde placeholder değişken olarak çıkar.
  - AC: 10 karakterlik yazma tek adım üretir; password değeri düz metin olarak ne storage'da ne üretilen kodda yer alır.
- **FR-20** Sayfa navigasyonları (URL değişimi, SPA route değişimi dahil) `navigate` adımı olarak kaydedilir ve kayıt sayfa yenilense bile kesintisiz devam eder.
  - AC: Kayıt sırasında tam sayfa yenilemesi sonrası yapılan click, timeline'a eklenir; kayıt otomatik durmaz.
- **FR-21** Kullanıcı kayıttan sonra timeline'da adımları silebilir, sıralarını değiştirebilir ve bir adımın selector'ını alternatiflerden biriyle değiştirebilir.
  - AC: Adım silme/sıralama/selector değiştirme sonrası kod üretimi ve replay güncel hâli kullanır.

### F5 — POM kod üretimi

- **FR-22** Kaydedilen bir test için tek komutla dört hedefte kod üretilir: Playwright TypeScript, Selenium Java, Selenium Python, Cypress JavaScript.
  - AC: Dört çıktı da üretilir ve her biri kendi dilinin derleyici/parser'ından hatasız geçer (CI'da `tsc --noEmit`, `javac`, `python -m py_compile`, `node --check` ile doğrulanır).
- **FR-23** Üretilen kod Page Object Model desenindedir: her ziyaret edilen sayfa/URL grubu için locator'ları ve aksiyon metotlarını içeren bir page class + bu class'ları kullanan bir test dosyası üretilir.
  - AC: Login senaryosu çıktısında en az bir `LoginPage` page class'ı ve ondan ayrı bir test dosyası vardır; test dosyasında ham selector string'i geçmez.
- **FR-24** Üretilen kod her framework'ün kendi locator idiomunu kullanır (Playwright `getByTestId/getByRole`; Selenium `By.*` + A-8 bekleme stratejisi; Cypress `cy.get/cy.contains`).
  - AC: Playwright çıktısında ham XPath yalnızca engine XPath'e düştüyse görülür; Selenium çıktısında her aksiyondan önce uygun explicit wait vardır.
- **FR-25** Üretilen kod panelden tek tık kopyalanabilir ve dosya olarak dışa aktarılabilir (framework başına doğru uzantı: `.ts`, `.java`, `.py`, `.cy.js`).
  - AC: Export edilen dosya adı ve uzantısı seçilen framework'e uygundur; içerik panel önizlemesiyle aynıdır.

### F6 — Replay motoru

- **FR-26** Kullanıcı kaydedilmiş bir testi "Run" ile aynı tarayıcıda çalıştırabilir; motor adımları sırayla yürütür (A-5).
  - AC: Login senaryosu replay'i, kayıt edilen davranışı uçtan uca yeniden üretir ve "passed" ile biter.
- **FR-27** Her adım öncesi motor auto-wait uygular: hedef element bulunana, görünür ve etkileşilebilir olana kadar bekler; adım başına zaman aşımı varsayılan 10 s'dir ve test düzeyinde ayarlanabilir (1–60 s).
  - AC: 3 s gecikmeyle DOM'a eklenen element için adım başarılı olur; hiç eklenmezse adım 10 s sonunda "failed: timeout" olur.
- **FR-28** Replay sırasında aktif adımın hedef elementi sayfada vurgulanır ve panelde adım durumu canlı güncellenir (running/passed/failed).
  - AC: Koşum sırasında her adım için durum ikonu değişir; failed adımda hata nedeni (not found / not visible / timeout / mismatch) gösterilir.
- **FR-29** Koşum sonunda rapor üretilir: toplam süre, adım başına durum + süre + kullanılan selector, ilk hata detayı; rapor JSON olarak dışa aktarılabilir.
  - AC: Rapor JSON'u şema doğrulamasından geçer ve tüm adımları içerir.
- **FR-30** Bir adım fail olduğunda kullanıcı seçimine göre koşum durur (varsayılan) veya kalan adımlar "skipped" işaretlenerek devam eder.
  - AC: Her iki mod da ayarlardan seçilebilir ve rapora doğru yansır.

### F7 — Side Panel uygulaması

- **FR-31** Eklenti arayüzü tarayıcının side panel API'siyle açılır ve sayfa gezinmeleri arasında açık kalır; ana bölümleri: Inspector (picker sonuçları), Recorder (timeline), Tests (kayıtlı testler), Settings.
  - AC: Panel açıkken sekme içinde navigasyon yapılınca panel kapanmaz ve durumunu korur.
- **FR-32** Kayıtlı testler ve adımlar içinde isim/URL/selector metnine göre arama-filtreleme yapılabilir.
  - AC: Arama kutusuna yazılan metin, eşleşen test/adım listesini ≤ 300 ms'de daraltır.
- **FR-33** Panel klavye ile kullanılabilir ve WCAG 2.1 AA kontrast oranlarına uyar; tüm birincil eylemlerin (pick, record, run, copy) erişilebilir adı vardır.
  - AC: Birincil akışlar yalnızca klavye ile tamamlanabilir; kontrast denetimi (axe) kritik ihlal vermez.

### F8 — Saklama ve taşınabilirlik

- **FR-34** Projeler, testler, adımlar ve ayarlar `chrome.storage.local`'de versiyonlu bir şema ile saklanır; eklenti güncellemesinde şema migration'ı otomatik çalışır.
  - AC: Tarayıcı yeniden başlatıldığında tüm test verisi kayıpsız geri yüklenir; şema sürüm alanı her kayıtta bulunur.
- **FR-35** Kullanıcı bir projeyi veya tek bir testi JSON dosyası olarak export edebilir ve import edebilir; import öncesi şema doğrulanır, geçersiz dosya hata mesajıyla reddedilir.
  - AC: Export → temiz profile import round-trip'i sonrası test verisi birebir aynıdır; bozuk JSON import'u veri kaybına yol açmaz.

### F9 — Cross-browser paketleme

- **FR-36** Eklenti Manifest V3 uyumludur ve tek kod tabanı `webextension-polyfill` (`browser` namespace) üzerinden yazılır; Chromium ailesi (A-6) için tek build üretilir.
  - AC: Aynı build Chrome 116+ ve Edge 116+ üzerinde "Load unpacked" ile kurulup F1–F8 duman testini geçer; kodda çıplak `chrome.*` çağrısı yalnızca polyfill katmanında bulunur.
- **FR-37** Safari dağıtımı MVP'de yalnızca dokümandır: `docs/SAFARI.md` dosyası Xcode `safari-web-extension-converter` adımlarını ve bilinen kısıtları anlatır.
  - AC: `docs/SAFARI.md` mevcut ve adımları eksiksizdir; Safari build'i MVP kapsamında ÜRETİLMEZ.

## 6. Ek Fonksiyonel Tanımlar

### 6.1 Adım veri modeli (özet — mimariye girdi)

```
Step { id, order, action, targetSelector: { primary, alternatives[], frameChain[], shadowPath[] },
       value?, url?, timestamp, timeout? }
Test { id, name, projectId, steps[], createdAt, updatedAt, settings }
```

### 6.2 Sağlamlık skoru kural tablosu (deterministik)

| Kademe | Taban skor |
|---|---|
| data-testid / data-cy / data-qa | 100 |
| Kararlı id | 90 |
| role + accessible name | 80 |
| Görünür text | 65 |
| name attribute | 60 |
| Tekil minimal CSS | 45 |
| XPath | 25 |

Cezalar: dinamik id/class kalıbı −40 · text uzunluğu > 30 karakter −10 · ancestor derinliği başına −5 · `nth-child` kullanımı −15. Skor tabanı 0'ın altına inmez. Tam kalıp listesi mimari dokümanında sabitlenir; FR-9'daki liste asgaridir.

## 7. Fonksiyonel Olmayan Gereksinimler (ISO/IEC 25010)

| # | Karakteristik | Hedef / Karar |
|---|---|---|
| NFR-1 | Performans verimliliği | FR-12 (p95 < 100 ms selector üretimi); side panel ilk açılış < 500 ms; recorder'ın sayfaya eklediği event-capture ek yükü tipik sayfada ana thread'de kesintisiz > 16 ms'lik blok oluşturmaz; storage'da 100 test / 5.000 adım'a kadar arama FR-32 sınırında kalır. |
| NFR-2 | Fonksiyonel uygunluk | Bölüm 5'teki FR seti; kapsam dışı liste bölüm 8. MVP'de F1–F9 eksiksiz. |
| NFR-3 | Uyumluluk (compatibility) | Chrome/Edge 116+ (test edilir), Brave/Opera Chromium 116+ (duman testi), Firefox 121+ (yapısal uyum, test v2), Safari (yalnızca doküman). SPA (React/Vue/Angular), open shadow DOM ve same-origin iframe desteklenir. Eklenti, sayfanın global'lerini kirletmez (isolated world). |
| NFR-4 | Etkileşim yeteneği (usability) | FR-33 (klavye + WCAG 2.1 AA); "element seç → selector kopyala" akışı en fazla 3 kullanıcı etkileşimidir (pick butonu → tık → copy); yeni kullanıcı ilk selector'ını yardım almadan ≤ 2 dakikada kopyalayabilir (5 kişilik ekip içi testte 5/5). |
| NFR-5 | Güvenilirlik | Replay determinizmi: aynı sayfa durumunda aynı kayıt 10 ardışık koşumda aynı sonucu verir; storage yazımları atomiktir, yarıda kesilen yazım veri bozmaz (FR-35 AC); content script hatası sayfayı kırmaz (global error boundary + log). |
| NFR-6 | Güvenlik | Hiçbir uzak sunucuya veri gönderilmez (A-2); manifest izinleri asgaridir (`activeTab`, `scripting`, `storage`, `sidePanel`; geniş `host_permissions` yalnızca recorder için ve gerekçesi dokümante); şifre değerleri maskelenir (FR-19); `eval`/uzak kod yükleme yasaktır (MV3 CSP). Security-expert fazında threat model zorunlu. |
| NFR-7 | Bakım yapılabilirlik | Selector engine, recorder, replay ve codegen ayrı modüllerdir; selector engine ve codegen birim test kapsamı ≥ %80 satır; her framework çıktısı snapshot testlidir; yeni framework eklemek yalnızca yeni bir codegen adapter'ı gerektirir (çekirdekte değişiklik yok). |
| NFR-8 | Esneklik / taşınabilirlik | FR-36 (polyfill, tek kod tabanı); build çıktısı tarayıcı başına ayrı zip üretebilir; Node 20+ ile herhangi bir OS'ta build alınabilir. |
| NFR-9 | Emniyet (safety) | Kapsam dışı — ürün fiziksel/insan emniyeti riski taşımaz; tek ilgili kural picker modunda gerçek sayfa aksiyonlarının bastırılmasıdır (FR-3), bu güvenilirlik altında test edilir. |

## 8. Kapsam Dışı (MVP — bilinçli hariç tutulanlar)

| # | Hariç | Not |
|---|---|---|
| O-1 | Store yayını (Chrome Web Store, AMO, App Store) | v2 adayı; MVP "load unpacked" (A-1). |
| O-2 | Closed shadow root ve cross-origin iframe | v2 (F12). Panelde "unsupported context" uyarısı verilir. |
| O-3 | Firefox/Safari üzerinde test edilmiş resmi destek | v2 (F13); MVP yalnızca yapısal uyum + doküman. |
| O-4 | Gerçek framework runtime'ında koşum (Playwright/Selenium süreci başlatma) | Replay tarayıcı içidir (A-5); üretilen kod kullanıcının CI/lokalinde koşar. |
| O-5 | Hover, drag-drop, file-upload, çoklu sekme senaryoları kaydı | v2 (F11). |
| O-6 | Zengin assertion editörü | MVP'de yalnızca `assert-visible` (A-9); v2 (F10). |
| O-7 | Ekip senkronizasyonu, bulut hesabı, backend | JSON export/import yeterli (A-11). |
| O-8 | Monetizasyon, lisanslama, telemetri/analitik | Gereksinim 10 + A-2. |
| O-9 | Görsel test (screenshot diff), API testi, mobil uygulama testi | Ürün web UI locator/kayıt aracıdır. |
| O-10 | Arayüz yerelleştirmesi (i18n) | UI İngilizce (A-7). |

## 9. Başarı Metrikleri (6 ay, ekip içi kullanım — A-12)

| Metrik | Hedef | Ölçüm |
|---|---|---|
| Selector tekillik doğruluğu | Panelde gösterilen selector'ların %100'ü gösterim anında tekil | FR-8 otomatik doğrulama + regresyon fixture seti |
| Selector sağlamlığı | Fixture regresyon setinde (≥ 50 gerçek sayfa örneği) birincil selector'ların ≥ %90'ı yeniden yüklemede hâlâ tekil eşleşir | Haftalık otomatik regresyon koşumu |
| Kod derlenebilirliği | Üretilen POM çıktılarının %100'ü derleyici/parser'dan geçer | FR-22 CI kontrolü |
| Zaman kazancı | "Element bul → doğrulanmış selector kopyala" ≤ 10 s (DevTools ile elle ~1–2 dk'ya kıyasla) | Ekip içi ölçümlü görev testi, 5 kullanıcı |
| Benimseme | Ekipteki QA mühendislerinin ≥ %80'i haftada ≥ 3 kez kullanıyor | 6. ay ekip anketi (telemetri yok — A-2) |
| Replay güvenilirliği | Stabil demo uygulamada kayıtlı 10 senaryonun 10 ardışık koşumda flake oranı ≤ %2 | NFR-5 koşum matrisi |

## 10. Açık Sorular ve Riskler

| # | Konu | Risk / Soru | MVP kararı |
|---|---|---|---|
| R-1 | MV3 service worker uykusu | Uzun kayıt oturumunda worker sonlanabilir; kayıt durumu kaybolabilir. | Kayıt durumu her adımda `chrome.storage.session`'a yazılır; mimari fazda doğrulanacak. |
| R-2 | `host_permissions` genişliği | Recorder her sitede çalışmalı → `<all_urls>` gerekebilir; kurumsal politika kısıtlayabilir. | `<all_urls>` + doküman; kurum kısıtı çıkarsa opsiyonel site listesi (v2). |
| R-3 | React sentetik event'leri | Replay'de programatik `input` bazı framework'lerde state güncellemeyebilir. | Native setter + `input`/`change` event dispatch tekniği; QA fazında React/Vue/Angular fixture'larıyla test. |
| R-4 | Accessible name hesaplama maliyeti | Tam ARIA algoritması pahalı; FR-12 bütçesini zorlayabilir. | Basitleştirilmiş accname (aria-label, aria-labelledby, label, text) — sapmalar dokümante edilir. |
| R-5 | Side panel API Firefox'ta farklı | Firefox `sidebar_action` kullanır. | Polyfill katmanında adapter; Firefox testi v2 olduğundan MVP riski düşük. |
| R-6 | Kullanıcıya soru | Fixture regresyon setine hangi gerçek iç uygulamalar dahil edilsin? | Mimari fazın başında kullanıcıdan liste istenecek; MVP herkese açık demo sitelerle başlar. |

## 11. İzlenebilirlik

Kaynak gereksinim (görev tanımındaki 1–10) → FR eşlemesi: 1→FR-14 · 2→FR-17..21 · 3→FR-3, FR-8 · 4→FR-7, FR-9, 6.2 · 5→FR-13..16 · 6→FR-36..37, NFR-3 · 7→FR-22..25 · 8→FR-26..30 (kod export FR-25) · 9→FR-1..4, FR-16, FR-31..33, FR-34..35 · 10→A-1, A-2, A-11, O-1, O-8.

---

*Bu PRD, ISO/IEC/IEEE 29148 gereksinim kalitesi ölçütlerine (tekil, doğrulanabilir, izlenebilir, belirsizlik içermeyen) göre öz-denetimden geçirilmiştir. Sonraki adım: CTO fizibilite incelemesi + software-architect mimari tasarımı.*
