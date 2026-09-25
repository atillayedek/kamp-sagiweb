# KampüsAğı Web — Proje Hedefleri

> Durum: **Faz 0 ve Faz 1 tamamlandı; Faz 2 sürüyor** · Son güncelleme: 2026-09-25
> Bu dosyadaki "ÖNERİ" etiketli her şey kesin karar değildir. "BELİRSİZ / KARAR BEKLİYOR" maddeleri §11'de listelidir; kararlar `memory-bank/Memory_Bank.md` içinde kayıt altına alınır.

---

## 1. Tek cümleyle

KampüsAğı, doğrulanmış üniversite öğrencilerinin kampüsteki ihtiyaçlarını doğal Türkçe ile paylaşmasını, Claude destekli yapılandırma ve backend tabanlı eşleştirme ile doğru öğrencilerle buluşmasını, ardından topluluk ve mesajlaşma üzerinden iletişim kurmasını sağlayan bir sosyal platformdur.

Vaat: **"Gerçek üniversite öğrencileri, gerçek kampüsler."**

## 2. Amaç

- Öğrencinin ihtiyacını serbest Türkçe metinle yazıp ("Cuma akşamı basketbol oynayacak 2 kişi arıyorum.", "Cumartesi proje için Python bilen bir arkadaş arıyorum.") uygun öğrencilerle eşleşmesini sağlamak.
- Eşleşmeyi şeffaf yapmak: yalnızca yüzde değil, **neden** eşleştiğini göstermek.
- Kampüs içeriğini yalnızca doğrulanmış öğrencilere açarak güvenli bir ortam kurmak.

## 3. Hedef kullanıcı

- Türkiye'deki üniversite öğrencileri (doğrulanmış öğrenci belgesi ile).
- Moderatörler (öğrenci belgesi inceleme, rapor işleme).
- Yaş sınırı ve 18 yaş altı kullanıcılar: **BELİRSİZ (S-19)**.
- Kitle ağırlıkla telefondan erişir → web arayüzü **mobile-first** (kesin).

## 4. Kapsam

Bu proje **web sürümüdür**: landing page + tam işlevli web uygulaması + moderatör paneli.

- Backend iOS sürümüyle **birebir aynıdır**: aynı Firebase projesi/ortamları, aynı Firestore/Storage Security Rules, aynı Cloud Functions, aynı veri modeli.
- iOS istemcisi (Swift + SwiftUI) ayrı geliştirilir; bu projenin kapsamı dışındadır. Web ile iOS arasındaki sözleşme `docs/api-contract.md` ile tanımlanır (Faz 15).

## 5. Temel özellikler

| Alan | İçerik |
|---|---|
| **Keşfet** | İhtiyaç ilanları (`NeedCard` + `TearOffStrip`), eşleşmeler (`MatchCard`: yüzde + "neden eşleştin"), öneriler |
| **Topluluklar** | Üniversite/kampüs akışı (gönderi, beğeni, yorum), kulüpler, etkinlikler |
| **Mesajlar** | Eşleşilen/iletişime geçilen öğrencilerle gerçek zamanlı sohbet |
| **Profil** | Kullanıcı bilgileri, öğrenci doğrulaması, gizlilik, hesap yönetimi |
| **Öğrenci doğrulaması** | e-Devlet öğrenci belgesi PDF'i → Firebase Storage → moderatör incelemesi → onay/red |
| **İhtiyaç yapılandırma** | Türkçe metin → Cloud Function → Claude API → yapılandırılmış ilan (kullanıcı onaylar/düzenler) |
| **Eşleştirme motoru** | Sunucu tarafı skor + deterministik gerekçe şablonları |
| **Bildirim merkezi** | Uygulama içi bildirimler (sunucu yazar); web push **BELİRSİZ (S-13)** |
| **Gizlilik / KVKK** | Verilerimi indir, Hesabımı sil, Görünürlük ayarları, Mesajlaşma ayarları, Engellenen kullanıcılar |
| **Moderasyon** | Doğrulama kuyruğu, rapor kuyruğu, içerik/kullanıcı aksiyonları, denetim izi |
| **Landing page** | Ürün tanıtımı, doğrulama vaadi, şeffaf eşleşme örneği, KVKK bölümü, SSS, yasal sayfalar (TASLAK) |

## 6. Temel akış

```
Öğrenci ── ihtiyacını Türkçe yazar
   ↓
Firebase Cloud Function (callable: parseNeed)
   ↓
Claude API  (yalnızca metni anlamlandırır / yapılandırır)
   ↓
Yapılandırılmış ihtiyaç ── sunucuda şema doğrulaması
   ↓
Firestore
   ↓
Eşleştirme motoru (backend)
   ↓
Uygun öğrenciler → Eşleşme (skor + gerekçe) → Bildirim
   ↓
Mesajlaşma
```

**En kritik ilke:** Claude eşleşmeye karar veren sistem değildir. Skor, gerekçe, yetki ve moderasyon kararları backend'de üretilir; istemci bunları değiştiremez.

## 7. Eşleşme sistemi (taslak)

Kaynaktaki taslak ağırlıklar:

| Bileşen | Ham puan | Normalize (geçici) |
|---|---|---|
| Aynı kampüs | 30 | 28,57 |
| Kategori / ilgi | 20 | 19,05 |
| Etiketler | 20 | 19,05 |
| Beceri | 25 | 23,81 |
| Bölüm | 5 | 4,76 |
| Güvenilirlik | 5 | 4,76 |
| **Toplam** | **105** | **100,00** |

- **HATA/BELİRSİZ (S-03):** Ham toplam 105. Geçici karar: ağırlıklar sunucu tarafı config'te (`config/matching`) tutulur ve `ham_ağırlık / toplam_ağırlık × 100` ile normalize edilir. Kullanıcı düzeltilmiş ağırlıkları verene kadar geçerlidir.
- "Aynı kampüs" şimdilik `universityId` eşitliği (S-05).
- "Güvenilirlik" formülü belirsiz; onaylanana kadar herkes için sabit nötr değer (S-12).
- Gerekçe metinleri ("Aynı kampüstesiniz", "Basketbol ilginiz ortak", "Spor alanında deneyimin var") skor bileşenlerinden **deterministik şablonlarla backend'de** üretilir; Claude'a bırakılmaz.

## 8. Kapsam dışı

- iOS istemcisi (ayrı proje; yalnızca sözleşme paritesi bu projede).
- Öğrenci belgesinin otomatik doğrulanması (OCR, e-Devlet doğrulama kodu sorgusu) — ileride ayrı karar (S-07).
- Gönderi/yorum/mesaj için otomatik içerik filtresi — şimdilik yalnızca rapor + moderatör (S-15).
- Koyu tema (S-22).
- Doğrulanamayan pazarlama iddiaları (kullanıcı sayısı, üniversite logoları, ödüller).
- Claude'un yetkilendirme, skorlama veya moderasyon kararı vermesi.

## 9. Teknoloji yığını

**Kesin (kullanıcı belirtti):** Firebase Auth, Cloud Firestore, Cloud Functions, Cloud Storage, Firestore/Storage Security Rules, Firebase Auth custom claims, Anthropic Claude API (yalnızca backend üzerinden).

**Web tarafı (ÖNERİ — onay bekler, S-01/S-02/S-26):**

| Katman | Öneri |
|---|---|
| Dil | TypeScript (strict) |
| Web framework | Next.js (App Router) + React; landing SSG/SEO, uygulama istemci ağırlıklı |
| Stil | Tailwind CSS, token tabanlı |
| Doğrulama | Zod (paylaşılan `contracts` paketi) |
| Firebase istemci | Firebase Web SDK (modular) + App Check (web sağlayıcısı BELİRSİZ) |
| Backend | Cloud Functions (Node.js + TypeScript), Anthropic TypeScript SDK (`@anthropic-ai/sdk`) |
| Test | Vitest, Firebase Emulator Suite + `@firebase/rules-unit-testing`, Playwright, axe, Lighthouse CI |
| CI | GitHub Actions |
| Hosting | Firebase App Hosting veya Vercel; dev/staging/prod ayrı Firebase projeleri |
| Monorepo | pnpm workspaces (ortamda pnpm 10 mevcut) |

## 10. Veri modeli taslağı (ÖNERİ — Faz 2'de başlar, Faz 5'te kesinleşir)

"S" = yalnızca sunucu (Admin SDK) yazar · "K" = sahibi/ilgili kullanıcı kuralla yazabilir.

| Koleksiyon | Ana alanlar | Yazma |
|---|---|---|
| `universities/{id}` | name, city | S/admin |
| `users/{uid}` (herkese açık profil) | displayName, universityId, department, interests[], skills[], bio, photoURL | K (kısıtlı alanlar) |
| `users/{uid}` sunucu alanları | verificationStatus, reputationScore | **S** |
| `userPrivate/{uid}` | email, privacySettings, messagingSettings | K |
| `verificationRequests/{id}` | uid, storagePath, status, reviewedBy, reviewedAt, rejectReason | oluşturma K; durum **S** |
| `needs/{needId}` | authorUid, universityId, rawText, parsed{…}, parseStatus, visibility (campus/global), status, createdAt | oluşturma Function; `parsed` **S** |
| `needs/{needId}/matches/{uid}` | score, breakdown{…}, reasons[], status | **S** (kullanıcı yalnızca izinli alan, ör. `dismissed`) |
| `posts/{id}` | authorUid, universityId \| null, text, likeCount, commentCount | içerik K; sayaçlar **S** |
| `posts/{id}/comments/{cid}`, `posts/{id}/likes/{uid}` | … | K (sayaç **S**) |
| `clubs/{id}`, `clubs/{id}/members/{uid}` | … | K/S |
| `events/{id}`, `events/{id}/attendees/{uid}` | … | K/S |
| `conversations/{id}` | participants[], lastMessage, unreadCounts | oluşturma Function |
| `conversations/{id}/messages/{mid}` | senderUid, text, createdAt | K (katılımcı + engelleme kontrolü) |
| `notifications/{uid}/items/{nid}` | type, payload, read | oluşturma **S**; `read` K |
| `blocks/{uid}/blocked/{targetUid}` | createdAt | K |
| `reports/{id}` | reporterUid, target, reason | oluşturma K; işleme **S** |
| `moderationLogs/{id}` | action, actorUid, targetRef | **S** |
| `config/matching` | weights, thresholds | **S** (istemci okuyamaz) |
| `dataExports/{uid}/…` | dışa aktarım işleri | **S** |

Custom claim taslağı: `moderator: boolean`, `verified: boolean`, `universityId: string` (geçici karar ve gerekçesi: Memory Bank D-007).

## 11. Belirsizlikler (kullanıcı kararı bekleyenler)

| # | Konu | Durum | Geçici varsayılan / öneri | Karar fazı |
|---|---|---|---|---|
| S-01 | Web frontend framework'ü | KARAR BEKLİYOR | ÖNERİ: Next.js (App Router) + TypeScript + Tailwind | Faz 1 öncesi |
| S-02 | Hosting / dağıtım | KARAR BEKLİYOR | ÖNERİ: Firebase App Hosting veya Vercel; dev/staging/prod ayrı projeler | Faz 2 |
| S-03 | Eşleşme ağırlıkları toplamı 105 | HATA/BELİRSİZ | Config + 100'e normalize | Faz 7 öncesi |
| S-04 | Kimlik doğrulama yöntemi (e-posta+şifre, Google, Apple, telefon, üniversite e-postası) | KARAR BEKLİYOR | Firebase Auth kesin; yöntem belirsiz | Faz 3 |
| S-05 | Kampüs = `universityId` mi, üniversite içinde birden çok kampüs mü? | BELİRSİZ | "Aynı kampüs" = `universityId` eşitliği | Faz 5 |
| S-06 | Üniversite listesini kim yönetir | BELİRSİZ | `universities` koleksiyonu, yalnızca admin yazar | Faz 3 |
| S-07 | Öğrenci belgesi doğrulaması yalnızca manuel mi | Kaynakta "moderatör inceler" | Manuel; otomatik doğrulama kapsam dışı | Faz 4 |
| S-08 | Moderatör arayüzü nerede | BELİRSİZ | Web'de `/admin` (custom claim + sunucu kontrolü) | Faz 4 |
| S-09 | İlk moderatör nasıl atanır | BELİRSİZ | Sahibin yerelde çalıştırdığı, commit edilmeyen tek seferlik Admin SDK betiği | Faz 3 |
| S-10 | Claude modeli, token/maliyet limiti, günlük kullanıcı kotası | BELİRSİZ | Model adı config'ten (geçici varsayılan `claude-opus-5`, bkz. D-004); kota parametrik | Faz 6 |
| S-11 | İhtiyaç kategori listesi | BELİRSİZ | Kaynakta yalnızca örnekler (spor, ders/proje); taslak liste Faz 6'da onaya sunulur | Faz 6 |
| S-12 | İtibar/güvenilirlik puanı formülü | BELİRSİZ | Sunucu alanı; onaylanana kadar sabit nötr değer | Faz 7 |
| S-13 | Web push (FCM) / e-posta bildirimi | BELİRSİZ | Önce uygulama içi bildirim merkezi | Faz 10 |
| S-14 | Mesajlaşma başlatma kuralı | KISMEN BELİRSİZ | Taraflar doğrulanmış + engelleme yok; eşleşme/karşılıklı ilgi şartı onay bekler | Faz 8 |
| S-15 | Otomatik içerik moderasyonu | BELİRSİZ | Yalnızca rapor + moderatör | Faz 12 |
| S-16 | KVKK: veri sorumlusu, VERBİS, yurt dışı aktarım (Firebase/Anthropic), saklama süreleri | HUKUKİ İNCELEME GEREKLİ | Yasal metinler TASLAK; hukuk onayı olmadan yayınlanmaz | Faz 1 / 11 |
| S-17 | Firebase bölgesi (veri yerleşimi) | BELİRSİZ | ÖNERİ: Avrupa bölgesi; hukuki değerlendirmeyle netleşir. **Firestore konumu sonradan değiştirilemez.** | Faz 2 öncesi |
| S-18 | Hesap silme: bekleme süresi, anonimleştirme kapsamı | BELİRSİZ | Ayrıntılı taslak Faz 11'de onaya sunulur | Faz 11 |
| S-19 | Yaş sınırı / 18 yaş altı | BELİRSİZ | Kullanıcıya sorulacak | Faz 3 |
| S-20 | Analitik ve çerez/rıza yönetimi | BELİRSİZ | Zorunlu olmayan çerez/analitik rıza olmadan çalışmaz | Faz 1 |
| S-21 | PWA / mobil tarayıcı deneyimi | BELİRSİZ | Mobile-first kesin; PWA ayrı karar | Faz 8 |
| S-22 | Koyu tema | BELİRSİZ | Yalnızca açık tema | Faz 1 |
| S-23 | Landing CTA: kayıt / erken erişim / waitlist / iOS mağaza linki | BELİRSİZ | CTA'lar yer tutucu; veri toplama akışı onaysız eklenmez | Faz 1 |
| S-24 | `TearOffStrip` şerit aksiyonları | BELİRSİZ | ÖNERİ: "İlgileniyorum" / "Kaydet" | Faz 1 |
| S-25 | Tasarım token'larının kesin değerleri | BELİRSİZ | Faz 1'de ÖNERİ sunulur, kontrastla doğrulanır | Faz 1 |
| S-26 | Test/CI araçları | ÖNERİ | Vitest, Emulator + rules-unit-testing, Playwright, axe, Lighthouse CI, GitHub Actions | Faz 2 |
| S-27 | Katalogdaki (allinone) yerel skill'ler bu bulut ortamında yok (ör. `office-hours`, `frontend-design`, `design:accessibility-review`, `searchfit-seo:*`, `legal:*`, Firebase plugin'i) | KARAR BEKLİYOR | Genel en iyi uygulama + resmi doküman doğrulaması; istenirse eksik alanlar için proje skill'i yazılır (Memory Bank → Missing Skills) | Faz 1 öncesi |
| S-28 | Anthropic API veri yerleşimi | HUKUKİ İNCELEME GEREKLİ | `inference_geo` belgelenmiş değerleri yalnızca `us` / `global`; AB/TR seçeneği yok → Claude'a giden metin yurt dışına aktarılır. PII maskeleme zorunlu | Faz 6 öncesi |
| S-29 | İş/ürün başarı metrikleri (aktivasyon, eşleşme oranı vb.) | BELİRSİZ | Kaynakta tanımlı değil; uydurulmadı. Kullanıcıdan istenecek | Faz 13 |
| S-30 | Firebase projeleri (dev/staging/prod) ve GitHub varsayılan dalı | BELİRSİZ | Proje yok; repo boş (varsayılan dal yok). Faz 2'ye kadar emulator yeterli | Faz 2 |

## 12. Başarı kriterleri

Ürün metrikleri tanımlı değildir (S-29) ve uydurulmamıştır. Teknik başarı kriterleri:

1. Her fazın "Bitti Kriteri" (§13) doğrulanmış ve Memory Bank'e işlenmiş olmalı.
2. İstemcinin yazamayacağı alanlar (`verificationStatus`, `reputationScore`, `score`/`breakdown`/`reasons`, sayaçlar, bildirim içeriği, moderasyon kayıtları, custom claim'ler) için **hiçbir** istemci yazma yolu yok; rules testleriyle kanıtlı.
3. Çapraz üniversite okuma/yazma denemelerinin tamamı rules testlerinde reddediliyor.
4. Tarayıcı bundle'ında Anthropic anahtarı, SDK'sı veya endpoint'i yok (CI kontrolüyle).
5. Doğrulanmamış hesap kampüs içeriğine ve eşleşmeye erişemiyor (Rules + Functions).
6. WCAG 2.2 AA; Lighthouse hedef değerleri Faz 1'de belirlenip Memory Bank'e yazılır.
7. Hesap silindiğinde öğrenci belgesi ve kişisel veriler kalmıyor; anonimleştirme kararları kayıtlı.
8. Repo'da hiçbir sır yok (CI secret scan).

## 13. Faz planı

| Faz | Başlık | Bitti Kriteri (özet) |
|---|---|---|
| 0 | Dokümantasyon temeli + skill keşfi (kod yok) | Üç ana doküman + iki iskelet; Active Skills dolu; Missing Skill'ler işaretli; belirsizlikler listeli; kullanıcı onayı |
| 1 | Tasarım sistemi + Landing page | Mobil/masaüstü hatasız; WCAG 2.2 AA kontrast; Lighthouse hedefleri kayıtlı; yasal sayfalar TASLAK; tasarım onaylı |
| 2 | İskelet, Firebase, connector katmanı | Boş uygulama emulator'e bağlanıyor; CI yeşil; repo'da sır yok; connector arayüzleri dokümante |
| 3 | Kimlik doğrulama, profil, üniversite | Kayıt→onboarding→profil çalışıyor; yetkisiz alan yazımı reddediliyor; hatalar Türkçe ve erişilebilir |
| 4 | Öğrenci doğrulaması | Uçtan uca doğrulama; belgeye yalnızca sahibi+moderatör erişiyor; istemci doğrulama durumunu değiştiremiyor |
| 5 | Üniversite izolasyonu + Rules sertleştirme | Çapraz üniversite denemeleri reddediliyor; sayaç/skor/doğrulama alanları kilitli; threat model gözden geçirildi |
| 6 | İhtiyaç yazma + Claude yapılandırma | Basketbol/Python örnekleri doğru; injection sızdırmıyor; bundle'da Anthropic izi yok; hata/kota durumları doğru iletiliyor |
| 7 | Eşleştirme motoru | Beklenen aday/sıra/gerekçe; skor yalnızca sunucudan; testler yeşil; performans ölçümü kayıtlı |
| 8 | Keşfet sekmesi | Hızlı ve erişilebilir akış; skor salt-okunur; sayfalama ve hata durumları ele alınmış; E2E |
| 9 | Topluluklar | Sayaçlar istemciden değişmiyor; izolasyon testleri yeşil; rapor akışı moderatör kuyruğuna düşüyor |
| 10 | Mesajlar + bildirim merkezi | Yetkisiz erişim yok; engellenen kullanıcı mesaj atamıyor; bildirim/sayaç manipülasyonu reddediliyor |
| 11 | Profil, Gizlilik, KVKK akışları | Dışa aktarma tüm veriyi kapsıyor; silme sonrası belge ve kişisel veri kalmıyor; yasal metinler hukuk onayına hazır |
| 12 | Moderasyon ve yönetim | Tüm aksiyonlar denetim izi bırakıyor; moderatör olmayan hiçbir yolla erişemiyor |
| 13 | Kalite, güvenlik, performans denetimi | Kritik/yüksek bulgu yok; erişilebilirlik ve performans hedefleri karşılandı; rapor Memory Bank'te |
| 14 | Dağıtım ve yayına hazırlık | Staging'de tam akış doğrulandı; prod checklist tamam; geri alma planı belgeli. **Prod deploy öncesi kullanıcı onayı zorunlu** |
| 15 | iOS paritesi + API sözleşmesi | iOS geliştiricisi yalnızca `docs/api-contract.md` ile bağlanabiliyor; kırıcı değişiklik süreci tanımlı |

Her fazın ayrıntılı iş listesi ve skill eşleşmesi: `memory-bank/Memory_Bank.md` → "Skill → Faz Matrisi". Çalışma kuralları: `AI_Guidelines.md`.

## 14. Tasarım dili (özet)

Kampüs ilan panosu + çay bahçesi: açık sıcak zemin, beyaz kartlar, koyu yeşil ana renk, az miktarda kehribar, sade tipografi, kart tabanlı yapı. İmza bileşen: **`TearOffStrip`** (kartın altından kopan ilan kâğıdı). Ayrıntılar ve kurallar: `AI_Guidelines.md` §13.
