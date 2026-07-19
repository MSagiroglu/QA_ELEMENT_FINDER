# QA Element Finder — UX Design Document

## Renk Paleti

| Token | Hex | Kullanım |
|---|---|---|
| Primary | `#4A90D9` | Butonlar, aktif tablar, odak halkaları |
| Success | `#22C55E` | Geçen test adımları, başarı rozetleri |
| Error | `#EF4444` | Başarısız adımlar, hata mesajları, silme |
| Warning | `#F59E0B` | Uyarılar, beklemedeki adımlar |
| Background | `#1A2332` | Ana arka plan (dark navy) |
| Surface | `#243044` | Panel yüzeyleri, kartlar |
| Surface Elevated | `#2D3B52` | Hover edilen öğeler, aktif paneller |
| Border | `#3A4A62` | Çizgiler, ayırıcılar, kenarlıklar |
| Text Primary | `#E5E7E6` | Başlıklar, birincil metin |
| Text Secondary | `#9CA3AF` | İkincil metin, açıklamalar |
| Text Muted | `#6B7280` | Soluk etiketler, placeholder |
| Accent | `#6EE7B7` | Element seçici vurgu (yeşil parlak) |

## Tipografi

| Kullanım | Font | Weight | Size |
|---|---|---|---|
| UI metinleri | Inter | 400 / 500 / 600 | 11–14px |
| Kod önizleme | JetBrains Mono | 400 | 12px |
| Başlıklar | Inter | 600 | 14–16px |

---

## 1. POPUP PAGE (256×450px)

Popup, tarayıcı araç çubuğundaki eklenti simgesine tıklanınca açılan küçük penceredir. Üç durumu vardır: **IDLE**, **RECORDING**, **PLAYING**.

### 1.1 Header (sabit, 44px)
- Sol: 16×16px uygulama logosu (mavi kare içinde büyüteç + tiklama imleci)
- Orta: "QA Element Finder" — `font-size: 13px`, `font-weight: 600`, `color: Text Primary`
- Sağ: versyon etiketi "v1.0" — `font-size: 10px`, `color: Text Muted`, `padding: 2px 6px`, `border-radius: 4px`, `background: Surface`

### 1.2 Status Bar (28px)
- Sol: durum göstergesi — 8×8px yuvarlak
  - IDLE: `fill: Text Muted` (gri nokta)
  - RECORDING: `fill: Error`, `animation: pulse 1.5s infinite` (kırmızı nabız)
  - PLAYING: `fill: Warning` (amber nokta)
- Sağ: durum metni — "Boşta" / "Kaydediyor..." / "Oynatılıyor..."
  - `font-size: 11px`, `color: Text Secondary`, yanında geçen süre (RECORDING/PLAYING)

### 1.3 Main Action (96×96px alan)
- Orta: büyük yuvarlak buton (`width: 56px`, `height: 56px`, `border-radius: 50%`)
  - IDLE: `background: Primary`, içinde mikrofon ikonu (16px), hover'da `background: lighten(Primary, 10%)`
  - RECORDING: `background: Error`, içinde kare dur ikonu (14px), `animation: pulse-record 1.5s infinite`
  - PLAYING: `background: Warning`, içinde oynat ikonu (14px)
- Sağ: Play butonu (`width: 40px`, `height: 40px`, `border-radius: 50%`, `background: Surface`)
  - IDLE: gizli (`display: none`)
  - RECORDING: görünür, içinde oynat ikonu, hover'da `background: Surface Elevated`
  - PLAYING: devre dışı (`opacity: 0.4`, `pointer-events: none`)
- Tıklama: RECORD → kayıt başlat, IDLE → kaydı durdur, PLAYING → duraklat/devam ettir

### 1.4 Recent Tests Listesi (kalan alan, scroll)
- Başlık: "Son Testler" — `font-size: 11px`, `font-weight: 600`, `color: Text Muted`, `text-transform: uppercase`, `letter-spacing: 0.5px`
- En fazla 5 test gösterilir, her test satırı:
  - Sol: test adı (1 satır, `text-overflow: ellipsis`)
  - Sağ üst: adım sayısı ("3 steps") — `font-size: 10px`, `color: Text Muted`
  - Sağ alt: rozet — geçtiyse "✓ Passed" (`color: Success`), başarısızsa "✗ Failed" (`color: Error`)
  - Tıklanabilir, tıklayınca DevTools panelinde o test açılır
  - `padding: 8px 12px`, `border-bottom: 1px solid Border`
  - Hover: `background: Surface Elevated`

### 1.5 Quick Actions (48px)
- 3 buton yanyana, eşit genişlik:
  - "Export All" — dışa-aktar ikonu
  - "DevTools" — dişli çark + code ikonu
  - "Settings" — ayarlar ikonu
  - `height: 32px`, `background: transparent`, `border: 1px solid Border`, `border-radius: 6px`
  - Hover: `background: Surface Elevated`, `border-color: Primary`
  - Focus: `outline: 2px solid Primary`, `outline-offset: 2px`
  - `aria-label` her butonda tanımlı

### 1.6 Keyboard Navigation
- `Tab` butonlar arasında gezinme
- `Enter` / `Space` aktif butonu tetikleme
- `R` kaydı başlat/durdur (global kısayol, popup açıkken)
- `Escape` popup'ı kapatma

---

## 2. DEVTOOLS PANEL (full width)

Chrome DevTools'a özel bir sekme olarak açılır. Genişlik tarayıcı DevTools genişliğine bağlıdır. Üç ana bölümden oluşur.

### 2.1 Left Sidebar (220px sabit genişlik)

#### 2.1.1 Pages Tree (üst yarı)
- Başlık: "Pages" — `font-size: 11px`, `font-weight: 600`, `color: Text Muted`, `text-transform: uppercase`, `padding: 8px 12px`
- Her sayfa: sekme ikonu (16px) + sayfa başlığı
  - Tıklayınca genişler, altında o sayfada kayıtlı elementler listelenir
  - Context menu (sağ tık):
    - "Rename Page" → inline edit modu
    - "Delete Page" → onay dialog'u
    - "Duplicate Page" → sayfanın elementlerini kopyala
- `padding: 4px 12px`, hover'da `background: Surface Elevated`

#### 2.1.2 Tests Tree (alt yarı)
- Başlık: "Tests" — aynı stil
- Her test: klasör ikonu (16px) + test adı
  - Genişletince altında adımlar görünür
  - Adım ikonu türüne göre:
    - `click` → fare imleci
    - `type` → klavye
    - `assert` → göz
    - `hover` → el
    - `wait` → saat
  - Context menu (sağ tık):
    - "Rename Test"
    - "Delete Test" → onay dialog'u
    - "Duplicate Test"
    - "Export Test" → tek testi dışa aktar
- Yeni test ekleme: alt kısımda "+" butonu

### 2.2 Center Panel (main workspace, flex: 1)
- 4 yatay tab, `background: Background`, `border-bottom: 1px solid Border`
  - Tab: `padding: 8px 16px`, `font-size: 12px`, `font-weight: 500`, `color: Text Muted`
  - Active tab: `color: Primary`, `border-bottom: 2px solid Primary`
  - Hover: `color: Text Primary`, `background: Surface`
  - Tab sırası: Element Inspector | Code Generator | Recorder | Player

#### 2.2.1 Tab 1 — Element Inspector

**Toolbar (40px):**
- "Pick Element" butonu: `background: Primary`, `color: white`, crosshair ikonu (16px)
  - Toggle butonu: basılıyken `background: darken(Primary, 15%)`, `outline: 2px solid Primary`
  - `aria-pressed` ile durum bildirimi
- Arama kutusu (sağ): placeholder "Filter attributes...", `width: 180px`

**Selected Element Info Card:**
- `background: Surface`, `border-radius: 8px`, `padding: 12px`, `margin: 8px 12px`
- Tag: `<button>` — `font-family: JetBrains Mono`, `font-size: 13px`, `color: Primary`
- ID: `#submit-btn` — `font-family: JetBrains Mono`, `color: Accent`
- Classes: `.btn-primary.large` — `font-family: JetBrains Mono`, `color: Text Secondary`
- Attributes: `type="submit" disabled` — gri etiketler, `font-size: 11px`

**Selector List:**
- Başlık: "Selectors" — `font-size: 11px`, `font-weight: 600`, `color: Text Muted`, `text-transform: uppercase`
- Birincil seçici (en iyi): üstte, `background: Surface Elevated`, `border-left: 3px solid Primary`
  - Sol: strateji ikonu (16px)
    - `id` → # ikonu
    - `css` → CSS ikonu
    - `xpath` → XPath ikonu
    - `text` → T ikonu
  - Orta: seçici metni — `font-family: JetBrains Mono`, `font-size: 12px`, `text-overflow: ellipsis`
  - Sağ: kopyala butonu (📋 ikonu) + eşleşme sayısı rozeti (`background: Surface`, `color: Text Muted`, `border-radius: 4px`, `padding: 2px 6px`)
  - Copy animasyonu: tıklayınca "✓ Copied!" yazısı 2 sn görünür, sonra kaybolur (`opacity: 0 → 1 → 0`, `transition: opacity 200ms`)
- Alternatifler dropdown'ı: "2 more alternatives" — tıklayınca aynı formatta liste açılır

#### 2.2.2 Tab 2 — Code Generator

**Toolbar (40px):**
- Framework seçici: dropdown
  - Playwright TypeScript (default)
  - Cypress TypeScript
  - Selenium Python
  - `background: Surface`, `border: 1px solid Border`, `border-radius: 6px`, `padding: 4px 8px`
- "Generate Page Model" butonu: `background: Primary`, `color: white`
- Platform toggles: "Page Object" / "Test File" — segmented control, `background: Surface`, active segment `background: Primary`, `color: white`

**Code Preview:**
- `background: #0D1117` (koyu kod arka planı), `border-radius: 8px`, `padding: 16px`
- `font-family: JetBrains Mono`, `font-size: 12px`, `line-height: 1.6`
- Satır numaraları sol tarafta, `color: Text Muted`, `user-select: none`
- Syntax highlighting: anahtar kelimeler `#FF7B72`, string'ler `#A5D6FF`, yorumlar `#8B949E`
- `overflow: auto`, maksimum yükseklik panel yüksekliği - 120px

**Bottom Bar (40px):**
- "Copy All" butonu: metin + kopyala ikonu
  - Copy sonrası "✓ Copied!" animasyonu (2 sn)
- "Download .ts" / "Download .py" butonu: framework'e göre değişir
  - Dosyayı `Save As` dialog'u ile indirir

#### 2.2.3 Tab 3 — Recorder

**Recording Status Bar (36px):**
- Durum göstergesi + "Recording" metni + timer (mm:ss format)
- `background: Error` (kırmızı), `color: white`, `font-weight: 600`
- Nabız animasyonu: `animation: pulse-bar 2s infinite`
- Sağda "Stop" butonu (beyaz ikon)

**Step List:**
- Her adım satırı:
  - **Drag handle** (sol): 6 noktalı tutmaç (`cursor: grab`)
    - Sürüklerken `cursor: grabbing`, satır `opacity: 0.6`
  - **Step number**: 2 haneli, `font-size: 11px`, `color: Text Muted`, `min-width: 24px`
  - **Action icon**: türüne göre (cursor 14px / keyboard 14px / eye 14px)
  - **Selector short**: ilk 30 karakter, `font-family: JetBrains Mono`, `font-size: 11px`, `text-overflow: ellipsis`
  - **Value**: tırnak içinde değer, `font-size: 11px`, `color: Text Secondary`
  - **Assertion pin**: eğer adımda assertion varsa 📌 ikonu (`color: Warning`)
  - `padding: 6px 12px`, `border-bottom: 1px solid Border`
  - Hover: `background: Surface Elevated`

**Context Menu (sağ tık):**
- "Insert Assertion" — seçili adımdan sonra assertion adımı ekle
- "Insert Step Above / Below"
- "Delete Step" — onaysız sil, `transition: height 200ms, opacity 200ms`
- "Edit Selector" → inline input modu
- "Edit Value" → inline input modu
- `background: Surface`, `border: 1px solid Border`, `border-radius: 8px`, `padding: 4px 0`
- Her öğe: `padding: 6px 16px`, hover'da `background: Surface Elevated`

**"Add Manual Step" butonu:**
- Alt kısımda, `width: 100%`, `padding: 8px`, `background: transparent`, `border: 1px dashed Border`
- `border-radius: 6px`, `color: Text Secondary`, hover'da `border-color: Primary`, `color: Primary`

**Bottom Bar (40px):**
- "Clear" butonu — onay dialog'u ("Tüm adımlar silinecek. Emin misiniz?")
- "Export" butonu — mevcut kaydı export et
- "Insert Assertion" butonu — sona assertion ekle

#### 2.2.4 Tab 4 — Player

**Control Bar (44px):**
- "Play All" butonu — `background: Success`, `color: white`, oynat ikonu
- "Play from Step" butonu — seçili adımdan başlat, `background: Primary`, `color: white`
- "Stop" butonu — `background: Error`, `color: white`, sadece oynatma sırasında aktif
- Hız seçici: 0.5×, 1× (default), 2× — segmented control

**Progress Bar:**
- Her adım için yatay ilerleme çubuğu:
  - Bekliyor: `background: Border` (gri)
  - Çalışıyor: `background: Primary` (mavi)
  - Geçti: `background: Success` (yeşil)
  - Başarısız: `background: Error` (kırmızı)
  - `height: 4px`, `border-radius: 2px`
  - Animasyon: durum değişince arka plan rengi 300ms transition
- Adımlar arasında `gap: 2px`

**Live Console Log:**
- `background: #0D1117`, `border-radius: 8px`, `padding: 8px`, `font-family: JetBrains Mono`, `font-size: 11px`
- Her log satırı: timestamp + seviye (INFO / WARN / ERROR) + mesaj
  - INFO: `color: Text Secondary`
  - WARN: `color: Warning`
  - ERROR: `color: Error`
- `max-height: 200px`, `overflow-y: auto`
- Yeni log eklenince otomatik aşağı kaydır

**Report Card (oynatma sonu):**
- `background: Surface`, `border-radius: 12px`, `padding: 16px`, `margin: 12px`, `border: 1px solid Border`
- İstatistikler:
  - "Passed: 12" (`color: Success`)
  - "Failed: 2" (`color: Error`)
  - "Total: 14"
  - "Duration: 23.4s"
  - "Timestamp: 2026-07-19 14:32:01"
- "Export Report" butonu: `background: Primary`, `color: white`, JSON formatında dışa aktar

---

## 3. ELEMENT PICKER MODE (injected into page)

Kullanıcı "Pick Element" butonuna basınca, element seçici modu hedef sayfaya enjekte edilir.

### 3.1 Overlay
- Tüm sayfayı kaplayan yarı saydam katman
- `background: rgba(0, 0, 0, 0.4)` (%40 opacity)
- `position: fixed`, `inset: 0`, `z-index: 2147483647`
- Seçili/hover elementinin olduğu alan `pointer-events: none` ile delinir, elementin kendisi görünür kalır

### 3.2 Hover Davranışı
- Elementin üzerine gelince `outline: 2px solid #6EE7B7` (Accent yeşil)
- `outline-offset: 0`
- Tooltip belirir:
  - `background: rgba(45, 55, 75, 0.95)` (koyu gri, yarı saydam)
  - `color: white`, `font-size: 11px`, `font-family: JetBrains Mono`
  - İçerik: `tagName.className` ve birincil seçici
  - `padding: 4px 8px`, `border-radius: 4px`
  - `position: fixed`, elementin hemen üstünde veya altında (viewport dışına taşmamak için akıllı konumlandırma)
  - `pointer-events: none`

### 3.3 Tıklama Davranışı
- Tıklayınca:
  - Seçim `outline: 2px solid #4A90D9` olarak değişir (mavi)
  - Tooltip kalıcı hale gelir (kaybolmaz, `pointer-events: auto`)
  - Kısa bip sesi (beep) — WebAudio API ile 800Hz, 100ms
  - Popup/DevTools'a seçilen element bilgisi gönderilir

### 3.4 Çıkış
- `Escape` tuşu: picker modundan çık, overlay kaldır, eski seçim outline'ları temizle
- DevTools panelinde "Pick Element" butonunun toggle'ı kapansın

---

## 4. SETTINGS PAGE (Options)

Tam sayfa, `min-width: 600px`, `max-width: 800px`, ortalanmış.

### 4.1 Framework
- **Varsayılan Framework**: radio group (Playwright TypeScript / Cypress TypeScript / Selenium Python)
  - Seçim `aria-label` ile işaretli
  - Her seçenekte framework logosu (16×16)

### 4.2 Recording Preferences
- **Debounce Delay**: slider 100–1000ms, step 50, değer yanında gösterilir
  - `aria-valuemin="100"`, `aria-valuemax="1000"`, `aria-valuenow="{value}"`
  - Açıklama: "Olay yakalama gecikmesi. Düşük değer daha hassas, yüksek değer daha performanslı."
- **Auto-Save**: toggle switch
  - `role="switch"`, `aria-checked`
  - Açıklama: "Kayıt tamamlanınca testi otomatik kaydet"

### 4.3 Replay Preferences
- **Auto-Wait Timeout**: slider 1–30s, step 1
  - Açıklama: "Element görünene kadar bekleme süresi"
- **Screenshot Every Step**: toggle switch
  - Açıklama: "Her adımda ekran görüntüsü al"
- **Fail Behavior**: radio group (Stop / Continue)
  - Stop: adım başarısız olunca dur
  - Continue: başarısız adımı atlayarak devam et

### 4.4 Export Defaults
- **Indentation**: radio group (2 spaces / 4 spaces)
- **Quotation Marks**: radio group (Single / Double)

### 4.5 Storage
- **Export All Data**: buton → JSON dosyası indir
- **Import Data**: buton → file picker açar, JSON yükler
  - Doğrulama: geçersiz format için hata mesajı (`role="alert"`)
  - Başarılı: "Veriler başarıyla içe aktarıldı" toast
- **Clear All Data**: kırmızı buton → onay dialog'u ("Tüm testler, elementler ve ayarlar silinecek. Bu işlem geri alınamaz.")
  - `background: Error`, `color: white`

### 4.6 Security
- **Password Masking**: toggle switch
  - Açıklama: "input[type=password] alanlarının değerini kayıtta maskele"
- **Sensitive Attributes**: textarea, virgülle ayrılmış liste
  - Default: `token, secret, password, apiKey, authorization`
  - `font-family: JetBrains Mono`, `font-size: 12px`
  - `width: 100%`, `min-height: 60px`, `border: 1px solid Border`, `border-radius: 6px`

### 4.7 Save
- "Save Settings" butonu: `background: Primary`, `color: white`, `width: 100%`
  - Tıklayınca "✓ Ayarlar kaydedildi" toast (2 sn)

---

## 5. ANIMATIONS & MICRO-INTERACTIONS

### 5.1 Record Pulse
```css
@keyframes pulse-record {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
  70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
```
- Süre: 1.5s, sonsuz tekrar

### 5.2 Copy Feedback Toast
- Konum: kopyala butonunun hemen yanı
  - "✓ Copied!"
  - `opacity: 0 → 1` (200ms), 1.8s bekle, `opacity: 1 → 0` (200ms)
  - Sonra DOM'dan kaldır

### 5.3 Tab Switch
- Anında geçiş, transition yok
- Gerekçe: performans kritik, içerik ağır olabilir

### 5.4 Step Status Background Flash
- Adım durumu değişince:
  - Geçti: `background: rgba(34, 197, 94, 0.1)` → Surface'e dönüş (500ms)
  - Başarısız: `background: rgba(239, 68, 68, 0.1)` → Surface'e dönüş (500ms)

### 5.5 Element Highlight Transition
- Pick modunda hover/click:
  - `outline-color: #6EE7B7` → `#4A90D9` (200ms `transition: outline-color 200ms`)
- Geri bildirim anlık değil, yumuşak geçiş

---

## 6. RESPONSIVE & ACCESSIBILITY

### 6.1 Responsive
- **Popup**: 256×450px sabit boyut, scroll çıkmaz
- **DevTools Panel**: `width: 100%` tarayıcı alanına göre
  - Sidebar: 220px sabit
  - Center: `flex: 1`, minimum 400px
  - Daha dar ekranlarda sidebar daraltılabilir (`< 700px` → hamburger menü)
- **Settings Page**: `max-width: 800px`, `margin: 0 auto`

### 6.2 Focus & Hover
- Tüm tıklanabilir öğelerde:
  ```css
  &:focus-visible {
    outline: 2px solid #4A90D9;
    outline-offset: 2px;
  }
  &:hover {
    background: var(--surface-elevated);
  }
  ```

### 6.3 ARIA & Screen Reader
- İkon butonlarda `aria-label` zorunlu
- Kayıt durumu değişikliklerinde `aria-live="polite"` bildirimi
- Hatalar `role="alert"` ile duyurulur
- `role="progressbar"` adım ilerleme çubuklarında, `aria-valuenow` / `aria-valuemin` / `aria-valuemax`
- Switch toggles: `role="switch"`, `aria-checked`

### 6.4 Keyboard Navigation
- Sekme sırası: doğal akış (soldan sağa, yukardan aşağı)
- `Enter` / `Space`: butonları tetikleme
- `Escape`: picker modundan çıkış, modal/dialog kapatma
- `Tab`: panel içinde odak dolaşımı
- `Shift + Tab`: geri dolaşım
- **Focus Trap**: modal/dialog açıkken, Tab dışarı çıkamaz
  - İlk ve son odaklanabilir öğe arasında döngü

### 6.5 Color Contrast
- Tüm metin/arka plan kombinasyonları WCAG AA (4.5:1) standardını karşılar:
  - Text Primary (#E5E7E6) on Background (#1A2332): ~10.5:1
  - Text Secondary (#9CA3AF) on Surface (#243044): ~5.2:1
  - Text Muted (#6B7280) on Surface (#243044): ~4.6:1
  - Primary (#4A90D9) on Surface (#243044): ~4.8:1

### 6.6 Reduced Motion
- `prefers-reduced-motion: reduce` algılandığında:
  - Tüm animasyonlar devre dışı: `transition: none`, `animation: none`
  - Record pulse: yalnızca statik kırmızı arka plan (düz renk, efekt yok)
  - Copy toast: anında göster/kaybol (opaklık geçişi yok)
  - Background flash: atlanır
