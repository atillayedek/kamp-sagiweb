# KampüsAğı Web — AI ve Geliştirme Kuralları

> Bu dosya, bu repoda çalışan her AI oturumu ve geliştirici için bağlayıcıdır.
> Okuma sırası: `AI_Guidelines.md` → `memory-bank/Memory_Bank.md` → `project-goals.md`.
> Son güncelleme: 2026-09-25 (Faz 0)

---

## 1. AI çalışma kuralları

1. **Dil:** Kullanıcıyla, dokümanlarda ve arayüz metinlerinde Türkçe. Kod tanımlayıcıları (değişken, fonksiyon, koleksiyon, alan adı) İngilizce.
2. **Kod yorumu:** Yazılmaz. Yalnızca "neden" koddan anlaşılmıyorsa tek satır.
3. **Uydurma yok:** Teknoloji, mimari, veri modeli, klasör yapısı veya iş kuralı kesin değilse varsayılmaz. "BELİRSİZ / KARAR BEKLİYOR" olarak işaretlenir; gerekirse gerekçeli ÖNERİ sunulur ve karar Memory Bank'e yazılır. SDK/API kullanımı tahmin edilmez; resmi dokümandan doğrulanır.
4. **Sır yok:** API anahtarı, şifre, token, service account JSON'u veya secret değer hiçbir dokümana, koda, commit'e, log'a, ekran görüntüsüne girmez. Yalnızca değişken **adları** ve `.env.example` içinde boş/placeholder değerler.
5. **Faz disiplini:** Faz 0 bitmeden uygulama kodu yazılmaz. Her faz sonunda: (a) Bitti Kriteri doğrulanır, (b) Memory Bank güncellenir, (c) kısa rapor verilir, (d) sonraki faz için onay istenir. Kullanıcı "otomatik devam" derse durmadan ilerlenir, rapor yine verilir.
6. **Soru eşiği:** Yalnızca kullanıcıya ait bir karar veya eksik girdi yüzünden bloke olunduğunda sorulur. Diğer durumlarda makul karar verilir, kaydedilir, devam edilir.
7. **Onay gerektiren işlemler:** Prod deploy, veri silme, force push, yayın, yasal metinlerin "yayında" sayılması, dış servise veri gönderimi.
8. **Rapor:** Sonuç, bulgular, riskler ve doğrulama sonuçları. İç skill yönlendirmesi raporda yalnızca özet olarak yer alır (ayrıntı Memory Bank'te).

## 2. Skill protokolü

### 2.1 Keşif
Her oturum başında ve her büyük görevden önce skill kaynakları taranır: `.skills/`, `skill/`, `skills/`, `.claude/`, `.claude/skills/`, `.cursor/`, `.cursor/skills/`, `.github/`, `docs/`, `tools/`, `prompts/`, `agents/`, `workflows/`; ayrıca `SKILL.md`, `skill.md`, `AGENTS.md`, `CLAUDE.md`, `.cursorules`, `.cursorrules`, `rules`, `guidelines`, `workflow` benzeri dosyalar. Kullanıcı düzeyi (`~/.claude/skills/`), plugin ve yerleşik skill'ler de envantere dahildir. Dosya adına değil içeriğe bakılır; referans verilen dosyalar takip edilir.

### 2.2 Akış
**Görev → gereken yetenekler → ilgili skill'ler → skill kuralları → uygulama.** Skill sayısı yapay olarak sınırlanmaz. Skill'ler yalnızca okunmaz, kuralları uygulanır ("önce X kontrolünü yap" diyorsa yapılır).

### 2.3 Otomatik aktivasyon haritası
| Görev | Etkinleşen yetenekler |
|---|---|
| UI | UI / Web Frontend / Design System / Accessibility |
| Firebase | Firebase / Firestore / Auth / Storage / Security Rules |
| Claude | AI / Anthropic (`claude-api`) / API / Backend / Security |
| Mesajlaşma | Messaging / Firestore / Notifications / Security |
| Öğrenci belgesi | Storage / PDF / Validation / Privacy / Security / KVKK |
| Eşleşme | Backend / Algorithms / Firestore / Security / Performance |
| KVKK | Privacy / Security / Data / Documentation |
| Deploy / Yayın | Web / Release / CI/CD / Hosting |
| Test | Unit / E2E / Integration / Firebase Emulator / Accessibility |

### 2.4 Çakışma önceliği
1. Proje-specific skill → 2. Security-critical skill → 3. Architecture skill → 4. Feature-specific skill → 5. General development skill.
Hiçbir kural sessizce yok sayılmaz; çakışma Memory Bank → "Skill Çakışma Kayıtları"na yazılır.

### 2.5 Aykırı karar ve eksik skill
- Skill önerisine aykırı karar: Memory Bank'e `Decision / Why / Alternative / Risk` formatında.
- İhtiyaç duyulan konuda skill yoksa açıkça **"Skill bulunamadı."** denir; Memory Bank'te **Missing Skill** olarak işaretlenir. Skill varmış gibi davranılmaz. Bu durumda genel en iyi uygulama + resmi dokümantasyon (Firebase, Next.js, W3C/WCAG, KVKK mevzuatı) doğrulaması kullanılır.
- Kullanıcının `allinone` kataloğunda adı geçen ama bu ortamda kurulu olmayan skill'ler (ör. `office-hours`, `frontend-design`, `cso`) **çalıştırılmış sayılmaz**.

### 2.6 Geliştirme döngüsü (her özellikte)
1. İlgili skill'leri keşfet 2. Skill dokümanlarını oku 3. Mevcut kodu incele 4. Mimari etkisini analiz et 5. Güvenlik etkisini analiz et 6. Uygula 7. Test et 8. Skill doğrulama kurallarını uygula (`code-review`, `security-review`, gerekiyorsa `run`) 9. Sonucu doğrula 10. Memory Bank'i güncelle.

### 2.7 Tamamlanma kriteri (Definition of Done)
Bir özellik, gerekiyorsa şunların **hepsi** uygulanıp doğrulandıktan sonra biter: UI + Business Logic + Data Layer + Backend + Security + Error Handling + Testing + Accessibility + Performance + Documentation. Ekranın çalışması tek başına yeterli değildir.

## 3. Değişmez ilkeler (asla ihlal edilmez)

1. **Backend tek gerçek kaynaktır.** Web istemcisi iş mantığı içermez; skor, itibar, doğrulama durumu, sayaç, bildirim, moderasyon kaydı sunucuda üretilir/yazılır.
2. **Claude yalnızca backend'den çağrılır.** Tarayıcı bundle'ında Anthropic anahtarı, SDK'sı veya endpoint'i bulunmaz. Anahtar yalnızca sunucu tarafı secret store'da (Firebase/Google Secret Manager) yaşar.
3. **Claude karar verici değildir.** Çıktısı sunucuda katı şemayla doğrulanır; yetkilendirme, skorlama, moderasyon kararı için kullanılmaz.
4. **Yetki kaynağı custom claim'dir.** `moderator` yetkisi yalnızca Admin SDK ile atanan custom claim'den gelir. İstemci bayrakları (`isAdmin` vb.) yetki değildir.
5. **Üniversite izolasyonu Security Rules'ta zorlanır**, UI filtresiyle yetinilmez.
6. **Varsayılan-reddet (default deny)** Rules; her koleksiyon için açık izin yazılır ve emulator testiyle doğrulanır.
7. **İstemcinin yazamayacağı alanlar:** `verificationStatus`, `reputationScore`, `score`/`breakdown`/`reasons`, sayaçlar (`likeCount`, `commentCount`, `unreadCount` vb.), `notifications` içeriği, moderasyon kayıtları, custom claim'ler.
8. **Öğrenci belgesi yüksek hassasiyetli kişisel veridir.** Yalnızca sahibi ve moderatör erişir; süreli saklanır; hesap silinince / red sonrası saklama politikasına göre silinir.
9. **Veri minimizasyonu.** Claude'a giden metinden telefon/TCKN/IBAN/e-posta gibi kişisel veri kalıpları önce temizlenir/maskelenir.
10. **Gerçek üniversite öğrencileri.** Doğrulanmamış hesap kampüs içeriğine ve eşleşmeye erişemez (Rules + Functions'ta zorunlu).

## 4. Mimari kuralları

### 4.1 Connector (adapter) katmanı
Her dış servis tek bir connector arayüzünün arkasında durur. Web iş mantığı Firebase SDK'sına doğrudan değil, bu arayüzlere bağlanır. ("Connectors mantığı" yorumu kullanıcı ifadesinden çıkarılmıştır; yanlışsa Memory Bank'te düzeltilir.)

| Connector | Sorumluluk | Çalıştığı yer |
|---|---|---|
| `AuthConnector` | Oturum, kayıt/giriş, token yenileme, claim okuma (salt-okunur) | İstemci |
| `FirestoreConnector` (repository'ler) | Tip güvenli okuma/yazma, realtime dinleyiciler, sayfalama | İstemci |
| `StorageConnector` | Belge yükleme (tür/boyut doğrulama, ilerleme, iptal) | İstemci |
| `FunctionsConnector` | Callable çağrıları (`parseNeed`, `requestDataExport`, `deleteAccount`, …) | İstemci |
| `AIConnector` (Claude) | Prompt, şema, retry, timeout, maliyet limiti | **Yalnızca Cloud Functions** |
| `MatchingService` | Skor, gerekçe üretimi | **Yalnızca Cloud Functions** |
| `NotificationConnector` | Uygulama içi bildirim yazımı (+ push: BELİRSİZ) | **Yalnızca Cloud Functions** |
| `ModerationConnector` | Doğrulama kuyruğu, rapor işleme, claim atama | **Yalnızca Cloud Functions / Admin SDK** |
| `AnalyticsConnector` | Olay takibi (BELİRSİZ) | İstemci, yalnızca rıza sonrası |

Her connector: (1) TypeScript arayüzü, (2) gerçek implementasyon, (3) emulator/mock implementasyonu, (4) hata eşleme (Firebase hata kodu → uygulama hata türü → Türkçe kullanıcı mesajı), (5) Zod ile doğrulanan giriş/çıkış DTO'ları.

### 4.2 Sözleşme paketi
`packages/contracts`: Zod şemaları, TS tipleri, callable isim/versiyon sabitleri. Web ve Functions buradan import eder. iOS için callable şemaları `docs/api-contract.md` içinde JSON Schema olarak dökülür.

### 4.3 Klasör yapısı (ÖNERİ — onay bekler)
```
apps/web/                 istemci (landing + uygulama + /admin)
functions/                Cloud Functions (TypeScript)
packages/contracts/       Zod şemaları, tipler, sabitler
firebase/                 firestore.rules, firestore.indexes.json, storage.rules, firebase.json
docs/                     api-contract.md, data-processing-inventory.md, threat-model.md
memory-bank/Memory_Bank.md
project-goals.md
AI_Guidelines.md
.env.example              yalnızca değişken ADLARI
```

### 4.4 Bağımlılık kuralı
Her yeni bağımlılık için gerekçe + lisans + bakım durumu kontrol edilir ve Memory Bank'e yazılır. Aynı işi yapan ikinci bir kütüphane eklenmez.

## 5. Kodlama kuralları

- TypeScript `strict`; `any` yok (zorunluysa gerekçeli `unknown` + daraltma).
- Tüm dış girdiler (callable girdisi, Firestore'dan okunan belge, Claude çıktısı, URL parametresi) Zod ile doğrulanır.
- Kullanıcı içeriği ham HTML olarak render edilmez (`dangerouslySetInnerHTML` yok). Tek istisna: statik JSON-LD, `<` kaçışlanarak (D-019).
- Next.js 16 önceki sürümlerden farklıdır: kod yazmadan önce `apps/web/node_modules/next/dist/docs/` altındaki ilgili rehber okunur (`apps/web/AGENTS.md`).
- Renkler yalnızca token'lardan (`globals.css` → `@theme`); Tailwind varsayılan paleti kapalıdır. Yeni renk eklenirse `src/design/contrast-pairs.ts`'e kontrast çifti de eklenir.
- Türkçe büyük/küçük harf dönüşümleri `toLocaleUpperCase('tr-TR')` / `toLocaleLowerCase('tr-TR')`; sıralama `Intl.Collator('tr')`; tarih/saat `Europe/Istanbul`.
- Hata akışı: hata kodu → uygulama hata türü → Türkçe, eyleme dönük kullanıcı mesajı. Ham hata/stack kullanıcıya gösterilmez.
- Log'lar yapılandırılmış ve PII içermez (uid kabul, e-posta/metin/belge içeriği yok).
- Adlandırma: koleksiyonlar camelCase çoğul (`needs`, `verificationRequests`), alanlar camelCase, bileşenler PascalCase.

## 6. Güvenlik kuralları

### 6.1 Firestore Rules
- Default deny. Yardımcılar: `isSignedIn()`, `isVerified()`, `isModerator()`, `sameUniversity(resource)`.
- Alan bazlı yazma kısıtı: `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`.
- Sayaç/skor/doğrulama alanlarına istemci yazımı yasak.
- Her kural için `@firebase/rules-unit-testing` ile hem izinli hem yasak senaryo testi.
- Rules içinde `get()`/`exists()` kullanımı maliyet ve istek başına erişim sınırı açısından değerlendirilir.

### 6.2 Storage Rules
- Öğrenci belgesi yolu `verification/{uid}/…`; yalnızca `application/pdf`; boyut üst sınırı parametrik.
- Yazma yalnızca sahibi; okuma yalnızca sahibi + moderatör; genel okuma yok.
- Sunucuda ek doğrulama: gerçek PDF imzası (magic bytes `%PDF-`), boyut, sayfa sayısı sınırı. Antivirüs taraması BELİRSİZ.

### 6.3 Callable Functions kontrol listesi
Her callable'da: (1) `auth` zorunlu, (2) gerekli claim kontrolü, (3) App Check zorunlu, (4) Zod ile giriş doğrulama, (5) kullanıcı başına hız/kota sınırı, (6) idempotency anahtarı, (7) yapılandırılmış, PII içermeyen log.

### 6.4 Web'e özgü
CSP ve güvenlik başlıkları; XSS'e karşı kaçışlama; açık yönlendirme (open redirect) kontrolü (yalnızca göreli/izinli yönlendirme); bağımlılık zafiyet taraması; oturum Firebase ID token ile.

### 6.5 Gizli bilgi yönetimi
Anahtarlar yalnızca secret store'da. `.env*` git'e girmez (`.gitignore`), `.env.example` hariç. CI'da secret scanning.

### 6.6 Denetim izi
`moderationLogs` ve kritik işlemler (hesap silme, claim atama, doğrulama kararı) için değiştirilemez kayıt.

## 7. Claude / AI entegrasyon kuralları

Kaynak: `claude-api` skill'i (2026-09-25'te okundu). Faz 6'da kod yazılmadan önce skill tekrar okunur; SDK çağrıları yalnızca skill dosyaları veya resmi SDK dokümanından alınır.

1. **Yalnızca resmi SDK:** Cloud Functions'ta `@anthropic-ai/sdk` (TypeScript). Ham `fetch` veya OpenAI-uyumlu ara katman yok.
2. **Model config'ten:** Model adı kodda sabit değil; sunucu config/env'den okunur. Geçici varsayılan `claude-opus-5` (skill kuralı). Daha ucuz modele geçiş (ör. `claude-sonnet-5`, `claude-haiku-4-5`) **yalnızca kullanıcı kararıyla** ve ölçümle yapılır. Model ID'lerine tarih eki eklenmez.
3. **Yapılandırılmış çıktı:** `client.messages.parse()` + `output_config.format` (`zodOutputFormat(schema)`, `@anthropic-ai/sdk/helpers/zod`). Eski `output_format` parametresi kullanılmaz. Dönen veri sunucuda `contracts` şemasıyla **yeniden** doğrulanır; izinli enum dışı değer reddedilir.
4. **Prefill yok:** Güncel modellerde asistan prefill'i 400 döndürür; biçim kontrolü structured outputs ile yapılır.
5. **Durma nedenleri:** `stop_reason` her zaman içerik okunmadan önce kontrol edilir (`refusal`, `max_tokens`). `refusal` durumunda kullanıcıya anlaşılır hata; ilan kaydedilmez veya `parseStatus: "failed"`.
6. **Refusal fallback:** Skill varsayılanı olarak sunucu tarafı `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) Faz 6'da etkinleştirilir; kullanıcı reddederse kapatılır (D-006).
7. **Thinking / effort:** `claude-opus-5` için adaptive thinking varsayılan açık; `temperature`/`budget_tokens` gönderilmez. Metin çıkarımı işi için efor seviyesi (`output_config.effort`) ölçümle seçilir; düşük efor adayı ÖNERİ'dir, karar ölçüm sonrası.
8. **Timeout / retry:** TypeScript SDK'da `timeout` **milisaniye**; `maxRetries` varsayılan 2. Toplam süre `timeout × (maxRetries+1)`'e ulaşabileceği için Function zaman aşımıyla uyumlu ayarlanır. Uygulama katmanında şema uyuşmazlığında **en fazla 1** yeniden deneme.
9. **Hata yakalama:** Tek geniş `catch` yerine SDK'nın tipli hata sınıflarıyla spesifikten genele zincir (ör. rate limit → API status → bağlantı hatası). Hata mesajında string eşleme yapılmaz.
10. **Prompt injection:** Kullanıcı metni **güvensiz veri**dir. Sistem prompt'u sabit; kullanıcı metni açıkça sınırlandırılmış veri bloğu olarak verilir. Araç/URL çağırma yok (tool tanımlanmaz). Çıktı yalnızca şema alanlarını taşır; "beni admin yap" gibi talimatlar hiçbir yan etki üretemez çünkü Claude çıktısı yetki/durum alanına yazılmaz.
11. **Bağlam:** Türkçe, `Europe/Istanbul` zaman dilimi ve **sunucu tarihi** kullanıcı mesajında verilir (göreceli tarih "Cuma akşamı" → somut aralık). Sabit sistem prompt'u önde, değişken içerik sonda (prompt caching önek kuralı; önek kısa kalırsa önbellek devreye girmeyebilir — ölçülür).
12. **Ön işleme:** Uzunluk sınırı, PII maskeleme (telefon, TCKN, IBAN, e-posta kalıpları), gürültü temizleme — Claude çağrısından **önce**.
13. **Maliyet:** Kullanıcı başına günlük kota ve toplam günlük maliyet tavanı config'te; aşımda anlaşılır hata. `usage` alanları (PII içermeden) loglanır.
14. **Veri yerleşimi:** `inference_geo` belgelenmiş değerleri `us` / `global`; AB/TR seçeneği yok. Claude'a giden metin yurt dışı aktarımdır (S-28, hukuki inceleme).
15. **Test:** Birim/entegrasyon testlerinde Claude **mock**'lanır (sözleşme testleri). Canlı Claude yalnızca ayrı işaretli, elle çalıştırılan entegrasyon testinde; her çalıştırma gerçek maliyet olduğu için kullanıcı onayıyla.
16. **Bundle kontrolü:** CI, web build çıktısında `@anthropic-ai`, `api.anthropic.com` ve anahtar kalıplarını arar; bulursa build kırılır.

## 8. Gizlilik / KVKK kuralları

- Yeni bir kişisel veri alanı eklenmeden önce `docs/data-processing-inventory.md` güncellenir (kategori, amaç, hukuki sebep, saklama, alıcı, aktarım).
- Yurt dışı aktarım yapan her servis (Firebase/Google, Anthropic) envanterde ve aydınlatma metninde yer alır.
- Yasal metinler (Aydınlatma Metni, Gizlilik Politikası, Kullanım Şartları, Çerez Politikası) **TASLAK** etiketi taşır; hukuk danışmanı onayı olmadan yayında sayılmaz.
- Zorunlu olmayan çerez/analitik rıza olmadan çalışmaz.
- Hesap silme: kişisel belgeler silinir; gerekli içerik anonimleştirilir; kararlar Memory Bank'e yazılır.
- Mevzuat bilgisi (KVKK, yurt dışı aktarım usulü, VERBİS) güncel resmi kaynaktan doğrulanmadan kesin bilgi gibi yazılmaz.

## 9. Test ve kalite kapıları (her özellik)

1. **Unit:** iş mantığı, skor, şema doğrulama, PII maskeleme.
2. **Rules:** Emulator + `@firebase/rules-unit-testing`; izinli ve yasak senaryolar.
3. **Function entegrasyonu:** Emulator; Claude mock.
4. **E2E (Playwright):** kayıt → doğrulama → ilan → eşleşme → mesaj → hesap silme.
5. **Erişilebilirlik:** WCAG 2.2 AA; klavye, odak, kontrast, ekran okuyucu, reduced-motion; axe.
6. **Performans:** Core Web Vitals hedefleri, paket boyutu bütçesi, Firestore okuma maliyeti.
7. **Güvenlik:** secret tarama, bağımlılık taraması, Rules ve claim testleri; faz sonunda `security-review`.
8. **Kod incelemesi:** faz sonunda `code-review`; gerekirse `simplify`.
9. **Dokümantasyon:** Memory Bank ve ilgili doküman güncel.

## 10. Erişilebilirlik kuralları

- `<html lang="tr">`; anlamlı başlık hiyerarşisi; her etkileşimli öğe gerçek `<button>`/`<a>`.
- Dokunmatik hedef ≥ 44×44 px; görünür odak göstergesi; klavye ile tam kullanım.
- Metin kontrastı WCAG 2.2 AA; renk tek başına bilgi taşımaz.
- `prefers-reduced-motion` desteklenir; animasyonsuz durum eşdeğer işlevlidir.
- Hata mesajları alanla ilişkilendirilir (`aria-describedby`) ve ekran okuyucuya duyurulur.

## 11. Performans kuralları

- Landing SSG; uygulama rotalarında kod bölme.
- Firestore: indeksli, sayfalı sorgular; tam koleksiyon taraması yok; dinleyiciler ekrandan çıkınca kapatılır.
- Lighthouse hedefleri ve paket bütçesi: Memory Bank §2.2 (Performans ≥ 90, Erişilebilirlik = 100, En iyi uygulamalar ≥ 95, SEO ≥ 95, CLS ≤ 0,1, TBT ≤ 200 ms, LCP ≤ 2,5 sn; ana sayfa ≤ 300 KB).

## 12. SEO kuralları (landing)

title/description/OG, `sitemap`, `robots`, kanonik URL; yapılandırılmış veri yalnızca doğru bilgiyle. Doğrulanamayan iddia (kullanıcı sayısı, üniversite listesi, ödül) yazılmaz. Uygulama içi (oturumlu) sayfalar indekslenmez.

## 13. Tasarım kuralları

- Konsept: kampüs ilan panosu + çay bahçesi. Sakin, sıcak, güvenilir; sosyal medya klonu hissi yok.
- Kart tabanlı; açık zeminde beyaz kartlar; koyu yeşil ana renk; kehribar yalnızca vurgu; sade tipografi; yalnızca açık tema (S-22).
- Başlangıç token önerisi (ÖNERİ, Faz 1'de kontrastla doğrulanır): zemin `#F7F5EF`, kart `#FFFFFF`, ana `#1F4D3A`, vurgu `#D9922B`.
- Font Türkçe karakterleri (ğ, ş, ı, İ, ö, ç, ü) tam desteklemeli.
- Bileşenler yalnızca token kullanır; token'lar tek dosyada.
- **`TearOffStrip`:** perfore ayrım, dikey şeritler, hover/dokunmada hafif kıvrılma; gerçek `<button>` öğeleri, ekran okuyucu etiketi, ≥ 44 px hedef, reduced-motion'da animasyonsuz. Aksiyonlar BELİRSİZ (S-24).
- Kaçınılacaklar: jenerik "AI slop" düzenler, gereksiz gradient/cam efekti, sahte istatistik veya yetkisiz logo, "lorem ipsum" bırakmak.

## 14. Git kuralları

- Geliştirme dalı ortam tarafından belirlenir (şu an `claude/upbeat-maxwell-9mivgs`); başka dala izinsiz push yok.
- Commit mesajları açık ve tek amaca yönelik; sır içermez.
- Force push, history rewrite ve prod'a etki eden işlemler yalnızca açık onayla.
