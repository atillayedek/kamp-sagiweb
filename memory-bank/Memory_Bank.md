# KampüsAğı Web — Memory Bank

> Projenin kalıcı hafızası. Her faz sonunda güncellenir.
> Son güncelleme: 2026-09-25 · Aktif faz: **Faz 0 (tamamlandı, onay bekliyor)**

---

## 1. Proje özeti

KampüsAğı; doğrulanmış üniversite öğrencilerinin ihtiyaçlarını doğal Türkçe ile yazdığı, Claude'un (yalnızca backend'den) metni yapılandırdığı, eşleşmenin backend'de hesaplandığı ve öğrencilerin topluluk + mesajlaşma ile iletiştiği bir sosyal platformdur. Bu repo **web sürümüdür** (landing + uygulama + moderatör paneli); backend iOS ile ortaktır (Firebase + Cloud Functions + Claude API). Ayrıntı: `project-goals.md`.

## 2. Mevcut durum

| Alan | Durum |
|---|---|
| Faz | 0 — Dokümantasyon temeli + skill keşfi: **tamamlandı, kullanıcı onayı bekliyor** |
| Uygulama kodu | Yok (Faz 0 kuralı) |
| Repo | Başlangıçta boştu (commit yok, uzak repoda dal yok) |
| Çalışma dalı | `claude/upbeat-maxwell-9mivgs` |
| Ortam | Node 22, npm 10, pnpm 10, Java (emulator için) mevcut; Firebase CLI kurulu değil; Chromium + Playwright hazır (`/opt/pw-browsers`) |
| Firebase projeleri | Yok (S-30) |

## 3. Active Skills

Keşif tarihi: 2026-09-25. "Active" = projede kullanılacak; "Koşullu" = yalnızca belirtilen durumda; "Kapsam dışı" = bu projeyle ilgisiz.

| Skill | Kaynak | Kullanım Alanı | Durum |
|---|---|---|---|
| `allinone` | Kullanıcı özel skill'i (`~/.claude/skills/synced/…/allinone/SKILL.md`) | Tüm fazlarda koordinasyon: önce anla → skill seç → planla/uygula/doğrula; SOLID, QA atlama yok, yıkıcı işlemde güvenli davran, dış bilgiyi doğrula, olmayan skill'i çalıştırmış gibi yapma | Active |
| `claude-api` | Yerleşik (Claude Code) | Faz 6 (`parseNeed`, `AIConnector`), Faz 13 (maliyet), Faz 14 (kota/alarm). Kurallar `AI_Guidelines.md` §7'ye işlendi | Active |
| `security-review` | Yerleşik | Her faz sonunda bekleyen değişikliklerin güvenlik incelemesi; özellikle Faz 2–6, 10–14 | Active |
| `code-review` | Yerleşik | Her faz sonunda doğruluk incelemesi | Active |
| `simplify` | Yerleşik | Kod içeren faz sonlarında sadeleştirme/yeniden kullanım | Active |
| `run` | Yerleşik | Faz 1'den itibaren uygulamayı başlatıp değişikliği gerçek tarayıcıda doğrulama | Active |
| `startup-hook-skill` (session-start-hook) | Kullanıcı düzeyi (`~/.claude/skills/session-start-hook`) | Faz 2: Claude Code web oturumlarında bağımlılık kurulumu, test ve lint'in çalışması için SessionStart hook | Active (Faz 2) |
| `init` | Yerleşik | Faz 2 sonrası `CLAUDE.md`'nin kod tabanına göre güncellenmesi | Koşullu |
| `pdf` | Anthropic skill'i | Faz 4: test fixture PDF'leri üretme ve PDF yapısını inceleme (Python araçları). Üretimdeki doğrulama Node tarafında yazılır | Koşullu |
| `skill-creator` | Anthropic skill'i | Missing Skill'ler için proje skill'i yazmak istenirse (S-27) | Koşullu |
| `update-config` | Yerleşik | Hook/izin ayarı gerekirse (ör. commit öncesi kontrol) | Koşullu |
| `fewer-permission-prompts` | Yerleşik | İzin istemleri çoğalırsa | Koşullu |
| `artifact-design`, `artifact-diagramming`, `artifact-capabilities` | Yerleşik | Yalnızca claude.ai Artifact sayfası üretilirse (ör. Faz 1 token onayı için önizleme sayfası). Ürün UI'ı için geçerli değil | Koşullu |
| `dataviz` | Yerleşik | Grafik/dashboard üretilirse (ör. moderatör paneli istatistikleri, Faz 13 raporları) | Koşullu |
| `loop` | Yerleşik | Tekrarlayan izleme gerekirse | Koşullu |
| `docs` | Anthropic skill'i (Claude Docs connector) | Repo dokümanı için değil (skill'in kendi kuralı: "repo docs, not a doc"). Kullanıcı paylaşılabilir doküman isterse | Koşullu |
| `docx`, `pptx`, `xlsx` | Anthropic skill'leri | Yalnızca kullanıcı bu dosya biçimlerini isterse (ör. hukuka .docx yasal taslak) | Koşullu |
| `import-memory` | Anthropic skill'i | — | Kapsam dışı |
| `morning` | Anthropic skill'i | — | Kapsam dışı |
| `keybindings-help` | Yerleşik | — | Kapsam dışı |

## 4. Skill envanteri (kaynak bazlı tarama sonucu)

| Kaynak | Bulunan |
|---|---|
| Repo: `.skills/`, `skill/`, `skills/`, `.claude/`, `.claude/skills/`, `.cursor/`, `.cursor/skills/`, `.github/`, `docs/`, `tools/`, `prompts/`, `agents/`, `workflows/` | **Hiçbiri yoktu** (repo boş) |
| Repo: `SKILL.md`, `AGENTS.md`, `CLAUDE.md`, `.cursorules`, `.cursorrules`, `rules`, `guidelines`, `workflow` | **Yoktu** |
| `~/.claude/skills/` | `session-start-hook` |
| `~/.claude/skills/synced/` (claude.ai hesabı) | `allinone`, `docs`, `docx`, `import-memory`, `morning`, `pdf`, `pptx`, `skill-creator`, `xlsx` |
| Plugin'ler (`~/.claude/plugins/synced`, ListPlugins) | **Yok** |
| Yerleşik (oturum) | `claude-api`, `code-review`, `security-review`, `simplify`, `run`, `init`, `update-config`, `keybindings-help`, `fewer-permission-prompts`, `loop`, `dataviz`, `artifact-design`, `artifact-diagramming`, `artifact-capabilities` |
| `allinone` kataloğu | 354 skill listeler (kullanıcının yerel Windows makinesindeki gstack + 28 plugin). **Bu bulut ortamında kurulu değiller.** Örn. `office-hours`, `spec`, `plan-eng-review`, `qa`, `design-consultation`, `design-review`, `frontend-design`, `cso`, `engineering:*`, `design:*`, `searchfit-seo:*`, `legal:*`, `figma:*`, `claude-mem:*`. Kataloğa göre `firebase` ve `playwright` harici plugin'leri kullanıcının makinesinde de "henüz kurulmamış" |

Not: Kullanıcının mesajı `/office-hours` ile başladı; bu komut bu oturumda yok, çalıştırılmadı.

### 4.1 Kategori eşleşmesi

| Kategori | Karşılayan skill | Sonuç |
|---|---|---|
| Architecture | `allinone` (genel ilkeler) | Kısmi — mimari skill'i yok |
| TypeScript, JavaScript | — | Skill bulunamadı |
| React, Next.js / Web Framework | — | Skill bulunamadı |
| HTML/CSS, Tailwind/CSS, Frontend | — (`artifact-design` yalnızca Artifact sayfaları için) | Skill bulunamadı |
| Web (çalıştırma/doğrulama) | `run` | Active |
| Firebase, Firestore, Cloud Functions, Security Rules | — | Skill bulunamadı |
| Backend, API | — (`claude-api` yalnızca Anthropic API) | Skill bulunamadı |
| Claude / Anthropic, AI | `claude-api` | Active |
| Security | `security-review`, `allinone` (kural 6) | Active |
| Authentication, Authorization | — | Skill bulunamadı |
| Storage | — | Skill bulunamadı |
| Push Notifications / Web Push | — | Skill bulunamadı |
| Networking, Concurrency / Async | — | Skill bulunamadı |
| State Management, Repository / Adapter | — | Skill bulunamadı |
| Testing, E2E, UI Testing | — (`run` gerçek uygulama doğrulaması için; ortamda Playwright mevcut) | Skill bulunamadı (kısmi: `run`) |
| Accessibility | — | Skill bulunamadı |
| Performance | — | Skill bulunamadı |
| SEO | — | Skill bulunamadı |
| Privacy, KVKK | — | Skill bulunamadı |
| Localization, Turkish | — | Skill bulunamadı |
| Design System | — | Skill bulunamadı |
| Git | — | Skill bulunamadı (sistem git kuralları geçerli) |
| CI/CD, Deployment / Hosting | `startup-hook-skill` (yalnızca Claude Code web oturum hook'u) | Kısmi |
| Documentation | `allinone`, `init` | Kısmi |
| Debugging, Error Handling | `code-review` (doğruluk hataları) | Kısmi |
| Data Modeling, Database | — | Skill bulunamadı |
| Offline / Caching / PWA | — | Skill bulunamadı |
| Navigation / Routing, Deep Linking | — | Skill bulunamadı |
| Analytics | — | Skill bulunamadı |
| Crash / Error Reporting | — | Skill bulunamadı |
| PDF / File Validation | `pdf` | Kısmi (test fixture / inceleme) |
| Moderation | — | Skill bulunamadı |
| Realtime / Messaging | — | Skill bulunamadı |
| Code Review | `code-review`, `simplify` | Active |

## 5. Missing Skills

Aşağıdaki alanlarda **skill bulunamadı**. Bu alanlarda genel en iyi uygulama + resmi dokümantasyon doğrulaması kullanılır (D-010). Kritik olanlar için proje skill'i yazılması önerilir (S-27).

| Missing Skill | Etkilenen fazlar | Kritiklik | Telafi yöntemi |
|---|---|---|---|
| Firebase / Firestore / Security Rules / Cloud Functions | 2–7, 9–12, 14 | **Kritik** | Firebase resmi dokümanı; rules-unit-testing ile kanıt; ÖNERİ: proje skill'i `firebase-rules` |
| Authentication / Authorization | 3, 4, 12 | **Kritik** | Firebase Auth dokümanı; claim testleri |
| Privacy / KVKK | 1, 4, 6, 11 | **Kritik** | Resmi mevzuat + hukuk danışmanı; ÖNERİ: proje skill'i `kvkk-privacy` |
| Next.js / React / TypeScript | 1–3, 8–12 | Yüksek | Next.js/React resmi dokümanı; `run` ile doğrulama |
| Testing / E2E / UI Testing | Tümü | Yüksek | Vitest/Playwright dokümanı; kalite kapıları (`AI_Guidelines.md` §9) |
| Accessibility | 1, 3, 4, 8–12 | Yüksek | WCAG 2.2; axe; manuel klavye/ekran okuyucu |
| Design System / Frontend / HTML/CSS / Tailwind | 1, 8–10 | Orta | `AI_Guidelines.md` §13; token disiplini |
| Storage / PDF / File Validation | 4, 11 | Yüksek | Storage Rules dokümanı; magic bytes kontrolü; `pdf` skill'i yalnızca fixture için |
| Realtime / Messaging / Notifications / Web Push | 10 | Orta | Firestore realtime + FCM dokümanı |
| Moderation | 4, 9, 12 | Orta | Denetim izi kuralları |
| Data Modeling / Database | 2, 5, 7 | Yüksek | Firestore veri modelleme dokümanı |
| Performance / SEO | 1, 7, 8, 13 | Orta | Lighthouse CI, Core Web Vitals |
| CI/CD / Deployment / Hosting | 2, 14 | Orta | GitHub Actions + seçilen hosting dokümanı |
| Localization / Turkish | Tümü | Orta | `tr-TR` locale kuralları (`AI_Guidelines.md` §5) |
| State Management / Repository / Routing / Offline-PWA / Analytics / Crash Reporting / Concurrency / Networking / Git / Debugging | İlgili fazlar | Düşük–Orta | Genel en iyi uygulama |

## 6. Skill → Faz Matrisi

"Active skill" = bu ortamda mevcut ve uygulanacak. "Missing" = gerekli ama skill yok; genel en iyi uygulama.

| Faz | Active skill'ler | Missing (genel en iyi uygulama) |
|---|---|---|
| 0 Doküman + skill keşfi | `allinone`, `claude-api` (AI kuralları için) | Architecture, Privacy/KVKK, Documentation |
| 1 Tasarım sistemi + Landing | `allinone`, `run`, `code-review`, `simplify`, (koşullu) `artifact-design` | Design System, Frontend, Accessibility, SEO, Performance, Turkish, KVKK (yasal sayfalar) |
| 2 İskelet + Firebase + connector | `allinone`, `startup-hook-skill`, `security-review`, `code-review`, `init` | Architecture, Firebase, TypeScript, CI/CD, Testing |
| 3 Auth, profil, üniversite | `allinone`, `security-review`, `code-review`, `run` | Authentication, Authorization, Firebase Auth, Error Handling, Testing, Accessibility |
| 4 Öğrenci doğrulaması | `allinone`, `security-review`, `code-review`, `run`, `pdf` (fixture) | Storage, File Validation, Privacy, KVKK, Authorization, Testing, Accessibility |
| 5 İzolasyon + Rules sertleştirme | `allinone`, `security-review`, `code-review` | Firestore Rules, Authorization, Data Modeling, Testing |
| 6 İhtiyaç + Claude | `allinone`, **`claude-api`**, `security-review`, `code-review`, `run` | Cloud Functions, Backend, Privacy (PII maskeleme), Testing, Accessibility |
| 7 Eşleştirme motoru | `allinone`, `security-review`, `code-review`, `simplify` | Backend, Algorithms, Firestore, Performance, Testing |
| 8 Keşfet | `allinone`, `run`, `code-review` | Frontend, State Management, Performance, Accessibility, E2E |
| 9 Topluluklar | `allinone`, `run`, `security-review`, `code-review` | Firestore, Data Modeling, Moderation, Accessibility, Testing |
| 10 Mesajlar + bildirim | `allinone`, `run`, `security-review`, `code-review` | Realtime/Messaging, Notifications, Security Rules, Accessibility, Testing |
| 11 Gizlilik + KVKK akışları | `allinone`, `security-review`, `code-review`, (koşullu) `docx` | Privacy, KVKK, Cloud Functions, Storage, Testing |
| 12 Moderasyon | `allinone`, `security-review`, `code-review`, `run`, (koşullu) `dataviz` | Moderation, Authorization, Frontend, Testing |
| 13 Kalite denetimi | `allinone`, `code-review`, `security-review`, `simplify`, `run`, `claude-api` (maliyet), (koşullu) `dataviz` | Testing, Performance, Accessibility, SEO |
| 14 Dağıtım | `allinone`, `security-review`, `claude-api` (kota/alarm) | CI/CD, Deployment/Hosting |
| 15 iOS paritesi + API sözleşmesi | `allinone`, `code-review` | API, Architecture, Documentation |

## 7. Skill çakışma kayıtları

| # | Çakışma | Çözüm | Öncelik gerekçesi |
|---|---|---|---|
| K-01 | `allinone` kural 9: "skill seçimini kullanıcıya gereksiz ayrıntı olarak verme" ↔ ana prompt: skill envanteri ve Active Skills tablosu raporlanmalı | Envanter ve tablolar **Memory Bank'te tam**; sohbet raporu kısa özet | Kullanıcının bu projeye özel açık talimatı (proje kuralı) genel skill kuralından önce gelir |
| K-02 | `claude-api`: "kullanıcı başka model adı vermedikçe `claude-opus-5`; maliyet için düşürme kullanıcı kararıdır" ↔ ana prompt #10: model adı config'ten, maliyet limiti belirsiz | Uyumlu çözüm: config geçici varsayılanı `claude-opus-5`; model değişikliği yalnızca kullanıcı kararıyla (D-004) | Çelişki yok; iki kural birleştirildi |
| K-03 | `claude-api`: `claude-opus-5` kodunda sunucu tarafı `fallbacks: "default"` varsayılan olarak açılır ↔ ana prompt: Claude çıktısı katı şemayla doğrulanır | Fallback açılır, ama hangi model yanıt verirse versin çıktı aynı sunucu şema doğrulamasından geçer (D-006) | Güvenlik ilkesi (şema doğrulaması) korunur |
| K-04 | `docs` skill'i paylaşılabilir claude.ai dokümanı ister ↔ ana prompt repo'da `.md` dosyaları ister | `docs` skill'inin kendi kuralı repo dokümanlarını kapsam dışı bırakıyor; repo `.md` kullanıldı | Çakışma yok |

## 8. Alınan kararlar

Format: `Decision / Why / Alternative / Risk`. "Geçici" kararlar kullanıcı onayı bekler.

**D-001 — Faz 0'da yalnızca doküman**
- Decision: Faz 0'da uygulama kodu yazılmadı. Yalnızca dokümanlar, `.gitignore` (sır koruması) ve AI oturumlarını kurallara yönlendiren kısa `CLAUDE.md` eklendi.
- Why: Ana prompt kuralı; `.gitignore` sır ilkesinin (`.env*` git'e girmez) ilk günden uygulanması; `CLAUDE.md` gelecekteki oturumların bu kuralları otomatik yüklemesi için.
- Alternative: `.gitignore` ve `CLAUDE.md`'yi Faz 2'ye bırakmak.
- Risk: Düşük. `CLAUDE.md` Faz 2 sonrası `init` ile genişletilebilir.

**D-002 — Dil**
- Decision: Doküman ve arayüz Türkçe; kod tanımlayıcıları İngilizce.
- Why: Ana prompt kuralı.
- Alternative: —
- Risk: —

**D-003 — Eşleşme ağırlıkları normalizasyonu (geçici)**
- Decision: Ağırlıklar `config/matching` belgesinde; skor `ham/toplam × 100`.
- Why: Kaynak ağırlıkların toplamı 105; skor %100'ü aşmamalı.
- Alternative: Kullanıcıdan 100'e düzeltilmiş ağırlık almak.
- Risk: Ağırlık değişirse eski eşleşmelerin skorları tutarsız görünür → eşleşme belgesine `weightsVersion` yazılması önerilir.

**D-004 — Claude modeli (geçici)**
- Decision: Model adı sunucu config/env'den; geçici varsayılan `claude-opus-5`.
- Why: `claude-api` skill kuralı + ana prompt "hard-code yok" kuralı.
- Alternative: Maliyet için daha küçük model — yalnızca kullanıcı kararı ve ölçüm sonrası.
- Risk: Maliyet; kota ve günlük tavan zorunlu (S-10).

**D-005 — Claude çıktı doğrulaması (ÖNERİ, Faz 6)**
- Decision: `messages.parse()` + `output_config.format` (Zod) ile yapılandırılmış çıktı; ardından `contracts` şemasıyla sunucuda yeniden doğrulama; en fazla 1 yeniden deneme.
- Why: İki katmanlı güvence; Claude karar verici değil.
- Alternative: Yalnızca prompt talimatıyla JSON istemek (daha kırılgan).
- Risk: Şema değişikliklerinde iki yerin senkron tutulması → tek kaynak `contracts`.

**D-006 — Refusal fallback (Faz 6)**
- Decision: `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) etkinleştirilecek.
- Why: `claude-api` skill varsayılanı; sınıflandırıcı kaynaklı reddetmelerde kullanıcı deneyimini korur.
- Alternative: Kapalı bırakıp `refusal`'da doğrudan hata göstermek.
- Risk: Yanıt başka bir Claude modelinden gelebilir → yine aynı şema doğrulaması (K-03). Kullanıcı reddederse kapatılır.

**D-007 — Custom claim modeli (geçici)**
- Decision: Hibrit. `moderator`, `verified`, `universityId` custom claim olarak (Rules bunlara dayanır); `users/{uid}.verificationStatus` UI için ayna alan. İkisini de yalnızca aynı Function yazar. Hesap kısıtlama/ban gibi anlık etkisi gereken durumlarda refresh token iptali + hassas yazımlarda belge kontrolü.
- Why: Rules'ta her istekte `get()` okuma maliyeti ve istek başına erişim sınırından kaçınmak; claim boyutu (~1000 bayt sınırı) bu üç alan için yeterli.
- Alternative: Yalnızca Rules `get()` ile `users` belgesinden okumak (anlık tutarlı, ama her istekte ek okuma).
- Risk: Claim'ler token yenilenene kadar (en fazla ~1 saat) eski kalabilir → onay sonrası istemci token'ı zorla yeniler; iptal senaryosu yukarıdaki gibi ele alınır.

**D-008 — Klasör yapısı ve paket yöneticisi (ÖNERİ)**
- Decision: `apps/web`, `functions`, `packages/contracts`, `firebase/`, `docs/`; pnpm workspaces.
- Why: Web ve Functions arasında tek sözleşme kaynağı; ortamda pnpm 10 mevcut.
- Alternative: npm workspaces; ayrı repolar.
- Risk: Cloud Functions dağıtımında workspace bağımlılıklarının paketlenmesi Faz 2'de doğrulanmalı.

**D-009 — Skill çakışmaları** — K-01…K-04 (§7) kayıt altında.

**D-010 — Missing Skill telafisi**
- Decision: Skill olmayan alanlarda genel en iyi uygulama + resmi doküman doğrulaması; kritik alanlar (Firebase Rules, KVKK) için proje skill'i yazılması önerildi (S-27).
- Why: `allinone` kural 7 ve 10; ana prompt "uydurma yok".
- Alternative: Kullanıcının yerel skill'lerini (gstack, plugin'ler) bu ortama eklemek.
- Risk: Skill disiplini olmadan tutarlılık düşebilir → kalite kapıları ve faz sonu incelemeleri zorunlu.

**D-011 — Firebase bölgesi uyarısı**
- Decision: Firebase projesi oluşturulmadan önce bölge kararı (S-17) alınmalı.
- Why: Firestore konumu proje oluşturulduktan sonra değiştirilemez.
- Alternative: —
- Risk: Yanlış bölge → KVKK/gecikme sorunu ve taşıma maliyeti.

## 9. Tamamlanan işler

- [x] Skill kaynakları tarandı (repo, kullanıcı düzeyi, synced, plugin, yerleşik, `allinone` kataloğu).
- [x] Skill envanteri, kategori eşleşmesi, Active Skills ve Missing Skills tabloları.
- [x] Skill → Faz matrisi.
- [x] `claude-api` skill'i okunup AI kuralları `AI_Guidelines.md` §7'ye işlendi.
- [x] `project-goals.md`, `AI_Guidelines.md`, `memory-bank/Memory_Bank.md` oluşturuldu.
- [x] `docs/threat-model.md` ve `docs/data-processing-inventory.md` iskeletleri (TASLAK).
- [x] `.gitignore` (sır koruması) ve `CLAUDE.md` (kural yönlendirmesi).
- [x] Belirsizlikler (S-01…S-30) iki dokümana taşındı.

## 10. Sonraki adımlar

1. Kullanıcı Faz 0'ı onaylar; öncelikli kararlar: **S-01** (framework), **S-25/S-22/S-24** (tasarım), **S-23** (landing CTA), **S-27** (eksik skill'ler).
2. Faz 1: token önerisi → onay → temel bileşenler + `TearOffStrip` → landing → yasal sayfa iskeletleri (TASLAK) → SEO → Lighthouse/axe/responsive testleri.
3. Faz 1 başında Lighthouse hedef değerleri ve paket boyutu bütçesi bu dosyaya yazılır.

## 11. Açık sorular

Tam tablo ve karar fazları: `project-goals.md` §11. Özet:

| # | Konu | Geçici varsayılan |
|---|---|---|
| S-01 | Web framework | ÖNERİ: Next.js (App Router) + TS + Tailwind |
| S-02 | Hosting | ÖNERİ: Firebase App Hosting veya Vercel; dev/staging/prod |
| S-03 | Ağırlık toplamı 105 | Config + normalize (D-003) |
| S-04 | Auth yöntemi | Firebase Auth; yöntem Faz 3'te |
| S-05 | Kampüs tanımı | `universityId` eşitliği |
| S-06 | Üniversite listesi yönetimi | Yalnızca admin yazar |
| S-07 | Belge doğrulaması manuel mi | Manuel |
| S-08 | Moderatör arayüzü | Web `/admin` |
| S-09 | İlk moderatör | Yerel, commit edilmeyen Admin SDK betiği |
| S-10 | Claude modeli / kota | Config; `claude-opus-5`; kota parametrik |
| S-11 | Kategori listesi | Faz 6'da taslak |
| S-12 | İtibar formülü | Sabit nötr değer |
| S-13 | Web push / e-posta | Önce uygulama içi |
| S-14 | Mesaj başlatma kuralı | Doğrulanmış + engel yok |
| S-15 | Otomatik moderasyon | Yalnızca rapor + moderatör |
| S-16 | KVKK hukuki konular | TASLAK; hukuk onayı |
| S-17 | Firebase bölgesi | Avrupa (ÖNERİ); sonradan değişmez |
| S-18 | Hesap silme ayrıntıları | Faz 11'de taslak |
| S-19 | Yaş sınırı | Kullanıcıya sorulacak |
| S-20 | Analitik / çerez rızası | Rızasız çalışmaz |
| S-21 | PWA | Mobile-first kesin; PWA ayrı karar |
| S-22 | Koyu tema | Yalnızca açık tema |
| S-23 | Landing CTA | Yer tutucu |
| S-24 | `TearOffStrip` aksiyonları | "İlgileniyorum" / "Kaydet" |
| S-25 | Token değerleri | Faz 1'de öneri |
| S-26 | Test/CI araçları | Vitest, Emulator, Playwright, axe, Lighthouse CI, GitHub Actions |
| S-27 | Eksik skill'ler | Genel en iyi uygulama; proje skill'i önerisi |
| S-28 | Anthropic veri yerleşimi | `us`/`global` dışında seçenek yok → yurt dışı aktarım; PII maskeleme |
| S-29 | Ürün başarı metrikleri | Tanımlı değil |
| S-30 | Firebase projeleri / varsayılan dal | Yok; Faz 2'ye kadar emulator |

## 12. Değişiklik günlüğü

| Tarih | Faz | Değişiklik |
|---|---|---|
| 2026-09-25 | 0 | Memory Bank oluşturuldu; skill keşfi ve Faz 0 dokümanları |
