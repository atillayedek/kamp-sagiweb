# KampüsAğı Web — Memory Bank

> Projenin kalıcı hafızası. Her faz sonunda güncellenir.
> Son güncelleme: 2026-09-25 · Aktif faz: **Faz 7** (Faz 0–6 tamamlandı; kullanıcı "otomatik devam" dedi)

---

## 1. Proje özeti

KampüsAğı; doğrulanmış üniversite öğrencilerinin ihtiyaçlarını doğal Türkçe ile yazdığı, Claude'un (yalnızca backend'den) metni yapılandırdığı, eşleşmenin backend'de hesaplandığı ve öğrencilerin topluluk + mesajlaşma ile iletiştiği bir sosyal platformdur. Bu repo **web sürümüdür** (landing + uygulama + moderatör paneli); backend iOS ile ortaktır (Firebase + Cloud Functions + Claude API). Ayrıntı: `project-goals.md`.

## 2. Mevcut durum

| Alan | Durum |
|---|---|
| Faz 0 | Tamamlandı. Kullanıcı "otomatik devam" dedi; açık sorulara yanıt verilmediği için geçici varsayılanlar uygulanıyor (D-012) |
| Faz 1 | **Tamamlandı**: tasarım token'ları, bileşen kütüphanesi + `TearOffStrip`, `/tasarim` galerisi, landing, yasal sayfa taslakları, SEO, testler |
| Faz 2 | **Tamamlandı**: `packages/contracts`, `functions/` (callable sarmalayıcı + `v1-ping`), `firebase/` (default deny + rules testleri), web connector katmanı, CSP, CI, SessionStart hook |
| Faz 3 | **Tamamlandı**: e-posta/şifre ile kimlik doğrulama (geçici, S-04), onboarding ve profil callable'ları, `users`/`userPrivate`/`universities` Rules, dinamik `(app)` rota grubu, dört sekmeli kabuk, profil sayfası |
| Faz 4 | **Tamamlandı**: belge yükleme + sunucu doğrulaması, moderatör paneli (`/admin`), onay/red + claim, denetim kaydı, kilitler, saklama/temizlik işi |
| Faz 5 | **Tamamlandı**: veri modeli kesinleşti (`docs/data-model.md`), tüm koleksiyonlar için alan bazlı Rules, kampüs/genel görünürlük, indeksler, STRIDE |
| Faz 6 | **Tamamlandı**: ihtiyaç yazma → Claude ile yapılandırma (yalnızca sunucu) → önizleme/düzenleme → yayınlama; PII maskeleme, kota + günlük token tavanı, idempotent taslaklar, ilan detay sayfası |
| Faz 7 | Başlıyor (eşleştirme motoru) |
| Uygulama kodu | `apps/web` (Next.js 16.3.6, App Router, Tailwind 4, TypeScript 6.0) |
| Repo | pnpm workspace (`apps/*`, `packages/*`, `functions`, `firebase`) |
| Çalışma dalı | `claude/upbeat-maxwell-9mivgs` (uzak repoda tek dal; varsayılan dal yok, PR açılamadı — S-30) |
| Ortam | Node 22, pnpm 10, Java mevcut; Firebase CLI global kurulu değil; Chromium `/opt/pw-browsers/chromium` (Playwright için `PW_CHROMIUM_PATH`) |
| Firebase projeleri | Yok (S-30) |

### 2.1 Komutlar (`apps/web`)

| Komut | Açıklama |
|---|---|
| `pnpm dev` | Geliştirme sunucusu |
| `pnpm build` | Üretim derlemesi (tip kontrolü dahil) |
| `pnpm lint` / `pnpm typecheck` | ESLint 9 (flat config) / `tsc --noEmit` |
| `pnpm test` | Vitest birim testleri (`src/**/*.test.ts`) |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm test:e2e` | Playwright + axe; önce `pnpm build` gerekir; 360/768/1440 px projeleri |

### 2.1.1 Komutlar (kök)

| Komut | Açıklama |
|---|---|
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | Tüm paketlerde |
| `pnpm check:bundle` | Web build çıktısında Anthropic/sır izi taraması |
| `pnpm test:rules` | Firestore + Storage emulator'de Security Rules testleri (Java gerekir) |
| `pnpm test:emulator` | Functions build + Auth/Firestore/Storage/Functions emulator'lerinde web connector entegrasyon testi |
| `pnpm test:e2e` | Functions build + web'in emulator bayrağıyla build'i + emulator'ler üzerinde tüm Playwright testleri (seed dahil) |
| `pnpm dev:local` | Emulator'ler + demo üniversite seed'i + `next dev` (tek komutla yerel geliştirme) |

Emulator komutları `scripts/emulators-exec.mjs` üzerinden çalışır (Windows uyumlu; bu ortamdaki `JAVA_TOOL_OPTIONS` Storage rules çalışma zamanını bozduğu için alt süreçten kaldırılır).

### 2.2 Faz 1 kalite ölçümleri (2026-09-25)

Lighthouse 13.5 (mobil emülasyon, simüle yavaş 4G), indeksleme açık derlemeyle ölçüldü:

| Sayfa | Performans | Erişilebilirlik | En iyi uygulamalar | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` | 97 | 100 | 100 | 100 | 2,6 sn | 0 | 50 ms |
| `/aydinlatma-metni` | 97 | 100 | 100 | 100 | 2,5 sn | 0 | 40 ms |
| `/tasarim` | 96 | 100 | 100 | 63 (bilerek `noindex`) | 2,6 sn | 0 | 100 ms |

**Hedefler (bundan sonra her faz için):** Performans ≥ 90, Erişilebilirlik = 100, En iyi uygulamalar ≥ 95, SEO ≥ 95 (indekslenen sayfalar), CLS ≤ 0,1, TBT ≤ 200 ms, LCP ≤ 2,5 sn. **LCP sınırda** (2,5–2,6 sn; LCP öğesi hero paragrafı, render gecikmesi ~130 ms) → Faz 13'te izlenecek.
**Paket bütçesi (ana sayfa, aktarılan):** toplam ≤ 300 KB (ölçülen 271), JS ≤ 160 KB (142), CSS ≤ 16 KB (8), font ≤ 100 KB (88).
axe (WCAG 2.2 AA etiketleri): tüm sayfalarda 0 ihlal (Playwright, 3 görünüm).

## 3. Active Skills

Keşif tarihi: 2026-09-25. "Active" = projede kullanılacak; "Koşullu" = yalnızca belirtilen durumda; "Kapsam dışı" = bu projeyle ilgisiz.

| Skill | Kaynak | Kullanım Alanı | Durum |
|---|---|---|---|
| `allinone` | Kullanıcı özel skill'i (`~/.claude/skills/synced/…/allinone/SKILL.md`) | Tüm fazlarda koordinasyon: önce anla → skill seç → planla/uygula/doğrula; SOLID, QA atlama yok, yıkıcı işlemde güvenli davran, dış bilgiyi doğrula, olmayan skill'i çalıştırmış gibi yapma | Active |
| `claude-api` | Yerleşik (Claude Code) | Faz 6'da TypeScript README + structured outputs + Opus 5 geçiş notları (fallback, effort) okunarak uygulandı (D-043…D-052). Faz 13 (maliyet, `cost-optimize`/`build-eval`), Faz 14 (kota/alarm) | Active |
| `security-review` | Yerleşik | Her faz sonunda güvenlik incelemesi; özellikle Faz 2–6, 10–14. **Varsayılan dal (`origin/HEAD`) olmadan çalışmıyor** (S-30); o zamana kadar aynı kontrol listesiyle elle inceleme | Active (engelli) |
| `code-review` | Yerleşik | Her faz sonunda doğruluk incelemesi (Faz 1: 3 bulgu; Faz 6: 15 bulgu, 14'ü düzeltildi, 1'i artık risk olarak belgelendi) | Active |
| `simplify` | Yerleşik | Kod içeren faz sonlarında sadeleştirme/yeniden kullanım | Active |
| `run` | Yerleşik | Faz 1'den itibaren uygulamayı başlatıp değişikliği gerçek tarayıcıda doğrulama. Faz 1'de doğrulama doğrudan Playwright (ekran görüntüsü + e2e) ile yapıldı | Active |
| `startup-hook-skill` (session-start-hook) | Kullanıcı düzeyi (`~/.claude/skills/session-start-hook`) | Faz 2: `.claude/hooks/session-start.sh` oluşturuldu (senkron, yalnızca web; `pnpm install`, `PW_CHROMIUM_PATH`) | Active (uygulandı) |
| `init` | Yerleşik | Faz 2 sonrası `CLAUDE.md`'nin kod tabanına göre güncellenmesi | Koşullu |
| `pdf` | Anthropic skill'i | Faz 4'te gerekmedi: e2e için elle yazılmış en küçük geçerli PDF yeterli oldu (Chromium görüntüleyicisi açıyor) | Koşullu |
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

**D-012 — "Otomatik devam" ve geçici varsayılanlar**
- Decision: Kullanıcı Faz 0 sonunda yalnızca "otomatik devam" dedi. Sorulan kararlar (S-01, S-22, S-23, S-24, S-25, S-27) için ÖNERİ'ler geçici olarak uygulandı: Next.js + TS + Tailwind; yalnızca açık tema; landing CTA'sı veri toplamayan yer tutucu; `TearOffStrip` = "İlgileniyorum" / "Kaydet"; token önerisi (aşağıda); eksik skill'ler için genel en iyi uygulama.
- Why: Otomatik devam talimatı; kararlar geri alınabilir.
- Alternative: Her kararda durup sormak.
- Risk: Kullanıcı farklı karar verirse ilgili bileşen/sayfa güncellenir. `main` dalı oluşturma ve PR açma **açık izin gerektirdiği için yapılmadı**.

**D-013 — Tasarım token'ları (geçici, S-25)**
- Decision: zemin `#F7F5EF`, kart `#FFFFFF`, çukur yüzey `#EFECE3`, metin `#1C2B24`, ikincil metin `#56615B`, ana `#1F4D3A` (hover `#173B2C`, yumuşak `#E4EEE8`), kehribar `#D9922B` **yalnızca dekoratif**, kehribar metin `#8A5A12`, kehribar yumuşak `#FBF1E1`, çizgi `#E4DFD3`, form kenarlığı `#7D8781`, hata `#A8322A` / `#FBEAE8`, odak `#1F4D3A` (koyu bölümde beyaz). Font: Source Sans 3 (`latin` + `latin-ext`, `next/font` ile kendi sunucumuzdan).
- Why: Önerilen kehribar beyaz üzerinde 2,59:1 (metin için yetersiz) → metin için koyu ton eklendi; form kenarlığı için 3:1 (WCAG 1.4.11) sağlayan ton eklendi. Tailwind varsayılan paleti `--color-*: initial` ile kapatıldı; bileşenler yalnızca token kullanabilir.
- Alternative: Inter / IBM Plex Sans (Türkçe destekli); kehribarı metinde hiç kullanmamak.
- Risk: Düşük. Kontrast `src/design/tokens.test.ts` ile 26 çift üzerinden otomatik doğrulanıyor.

**D-014 — Bileşen galerisi**
- Decision: Storybook yerine uygulama içinde `/tasarim` rotası (noindex, `robots.txt`'te engelli).
- Why: Ek bağımlılık yok; aynı derleme ve aynı axe/Playwright testleri galeriyi de kapsıyor.
- Alternative: Storybook.
- Risk: Galeri üretimde erişilebilir (gizli bilgi içermez); istenirse Faz 14'te prod'da kapatılır.

**D-015 — URL ve dil**
- Decision: Herkese açık sayfa yolları Türkçe (`/aydinlatma-metni`, `/gizlilik-politikasi`, `/kullanim-sartlari`, `/cerez-politikasi`); kod tanımlayıcıları İngilizce.
- Why: Türkçe kitle ve SEO; yol metni tanımlayıcı değil içeriktir.
- Alternative: İngilizce yollar.
- Risk: Yok.

**D-016 — İndeksleme varsayılan kapalı**
- Decision: `NEXT_PUBLIC_ALLOW_INDEXING=true` ve `NEXT_PUBLIC_SITE_URL` verilmedikçe tüm sayfalar `noindex` ve `robots.txt` her şeyi engeller.
- Why: Yasal metinler taslak, alan adı belirsiz (S-31); yayına hazır olmayan ürünün indekslenmemesi.
- Alternative: Varsayılan açık.
- Risk: Yayında bu iki değişkenin ayarlanması unutulmamalı (Faz 14 kontrol listesi).

**D-017 — Araç sürümleri**
- Decision: TypeScript 6.0.x (7.0 değil), ESLint 9.39 (10 değil), Playwright 1.63 + sistem Chromium'u (`PW_CHROMIUM_PATH`).
- Why: `typescript-eslint` TS `<6.1.0` destekliyor; `eslint-plugin-react` ESLint `^9.7`'ye kadar destekliyor. Ortamdaki Chromium Playwright'ın beklediği yapıdan farklı olduğu için yürütülebilir yol veriliyor; CI'da Playwright kendi tarayıcısını kurar.
- Alternative: TS 7 (yerel derleyici) — ekosistem desteği gelince yeniden değerlendirilir.
- Risk: Düşük.

**D-018 — Güvenlik başlıkları ve CSP**
- Decision: `next.config.ts` ile `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, `HSTS`; `X-Powered-By` kapalı. **CSP Faz 2'de** nonce tabanlı olarak eklenecek.
- Why: Next.js App Router satır içi betikleri için sıkı CSP nonce gerektirir; oturum/Firebase alan adları Faz 2'de netleşir.
- Alternative: Şimdi `'unsafe-inline'` ile zayıf CSP.
- Risk: Faz 2'ye kadar CSP yok (yalnızca statik landing yayında değil).

**D-020 — Callable adlandırma ve sürümleme**
- Decision: Callable'lar `v<sürüm>-<ad>` adıyla (`export const v1 = { ping }` → `v1-ping`) ve `europe-west1` bölgesinde (`FUNCTIONS_REGION`, geçici — S-17). İstek ve yanıt şemaları `packages/contracts` içinde; istemci yanıtı da doğrular.
- Why: iOS ile kırıcı değişiklikleri sürüm grubuyla yönetmek; iki taraflı sözleşme doğrulaması.
- Alternative: İstek gövdesinde sürüm alanı.
- Risk: Bölge S-17 kararıyla değişirse sabit tek yerden güncellenir.

**D-021 — CSP'nin iki katmanlı uygulanması**
- Decision: CSP `src/proxy.ts` içinde üretilir. Tanıtım sayfaları (`/`, yasal, `/tasarim`): `script-src 'self' 'unsafe-inline'` + SRI (`experimental.sri`). Uygulama rotaları (`APP_ROUTE_PREFIXES`: `/giris`, `/kayit`, `/uygulama`, `/kesfet`, `/topluluklar`, `/mesajlar`, `/profil`, `/dogrulama`, `/admin`): istek başına nonce + `'strict-dynamic'`. `style-src 'unsafe-inline'` (satır içi `style` öznitelikleri için). `connect-src`: `'self'`, `*.googleapis.com`, `*.cloudfunctions.net`; yerel adresler yalnızca geliştirme/emulator.
- Why: Katı `script-src 'self'` + SRI denendi; Next.js'in satır içi RSC betikleri engellendi ve hidrasyon bozuldu (e2e testi yakaladı). Nonce ise dinamik render gerektirir; tanıtım sayfalarının statik kalması performans için önemli ve bu sayfalar kullanıcı içeriği göstermez.
- Alternative: Tüm siteyi nonce + dinamik render.
- Risk: **Uygulama rotalarındaki her sayfa dinamik render edilmek zorunda** (statik prerender edilirse betikler nonce'suz kalır ve engellenir). Faz 3'te `(app)` layout'u `connection()` ile dinamikleştirilecek ve e2e CSP testi uygulama rotalarını da kapsayacak.

**D-022 — Functions paketleme**
- Decision: `contracts` Functions'a npm bağımlılığı olarak değil, TS yol takma adıyla (tsconfig `paths`, esbuild `alias`, vitest `alias`) bağlanır ve esbuild ile gömülür; `firebase.json` predeploy ile build. `workspace:*` bağımlılığı yok.
- Why: Cloud Build `npm install` `workspace:` protokolünü desteklemez; temiz kurulum yerelde taklit edilerek doğrulandı.
- Alternative: Deploy öncesi ayrı paket dizini üretmek.
- Risk: Düşük.

**D-023 — App Check**
- Decision: Callable'larda `enforceAppCheck` üretimde her zaman `true`; yalnızca `FUNCTIONS_EMULATOR=true` iken kapalı. Build, `functions/.env*` içinde `FUNCTIONS_EMULATOR` tanımını reddeder. Web sağlayıcısı ÖNERİ: reCAPTCHA Enterprise (`NEXT_PUBLIC_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY`).
- Why: Üretimde kapatılabilecek bir parametre bırakmamak.
- Alternative: `defineBoolean` parametresi.
- Risk: Site anahtarı tanımlanmadan üretime çıkılırsa callable'lar 401 döner (Faz 14 kontrol listesi).

**D-024 — Emulator ortamı**
- Decision: Proje kimliği `demo-kampusagi` (gerçek projeye erişim imkânsız). Emulator'ler `scripts/emulators-exec.mjs` ile `JAVA_TOOL_OPTIONS` olmadan başlatılır.
- Why: Bu ortamda `JAVA_TOOL_OPTIONS` stderr çıktısı Storage rules çalışma zamanını bozuyor; betik Windows'ta da çalışır.
- Alternative: Kabuk `env -u` (Windows'ta yok).
- Risk: Yok.

**D-025 — Sır taraması doğrulaması**
- Decision: gitleaks CI'da çalışır; bu ortamda GitHub indirmeleri ağ politikasıyla engellendiği için yerelde çalıştırılamadı. Yerelde `check:bundle` ve elle desen taraması yapıldı.
- Why: Ortam kısıtı.
- Alternative: —
- Risk: İlk CI koşusunda gitleaks yanlış pozitif verirse `.gitleaksignore` ile, gerekçesi yazılarak ele alınır.

**D-026 — Kimlik doğrulama yöntemi (geçici, S-04)**
- Decision: Firebase Auth e-posta + şifre; kayıttan sonra e-posta doğrulama bağlantısı gönderilir (zorunlu kılınmadı); şifre en az 8 karakter (istemci); şifre sıfırlama hesap varlığını sızdırmaz.
- Why: Evrensel, emulator'de test edilebilir; asıl güvenlik kapısı öğrenci belgesi doğrulaması (Faz 4). Kullanıcı yanıt vermediği için ÖNERİ uygulandı (D-012).
- Alternative: Google/Apple girişi, üniversite e-postası doğrulaması, telefon.
- Risk: Yöntem değişirse `AuthConnector`'a yeni metot eklenir; mevcut hesaplar korunur. E-posta doğrulamasının zorunlu olup olmayacağı açık soru (S-32).

**D-027 — Profil yazımı yalnızca callable ile**
- Decision: `users/{uid}` ve `userPrivate/{uid}` için istemci yazımı Rules'ta tamamen kapalı; oluşturma `v1-completeOnboarding`, düzenleme `v1-updateProfile` ile. `universityId` onboarding sonrası değiştirilemez.
- Why: Rules liste öğelerini tek tek doğrulayamaz (döngü yok); Zod ile tam doğrulama ve sunucu alanlarının (`verificationStatus`, `reputationScore`) güvenli varsayılanla yazılması sunucuda garanti edilir. Üniversite değişikliği izolasyonu bozacağı için doğrulama akışına bağlanacak (Faz 4/5).
- Alternative: Rules ile alan bazlı doğrudan yazım (`affectedKeys().hasOnly`).
- Risk: Her profil düzenlemesi bir Function çağrısı (düşük hacim, kabul edilebilir).

**D-028 — Sunucu tarafı rota koruması (skill/prompt önerisinden sapma)**
- Decision: Rotalar istemcide korunur (oturum → profil kapıları; güvenli `next`). Gerçek güvenlik sınırı Firestore Rules ve callable yetki kontrolüdür. Sunucu tarafı oturum çerezi (Admin SDK ile) **hosting kararına (S-02) kadar ertelendi**.
- Why: Uygulama sayfaları sunucuda veri içermez; tüm veri istemcide Rules altında okunur. Oturum çerezi Next sunucusunda Admin kimlik bilgisi gerektirir (Vercel'de ek sır; App Hosting'de ADC) — hosting belirsizken sır yönetimi eklemek istenmedi.
- Alternative: `__session` çerezi + `proxy.ts`'te doğrulama.
- Risk: Oturumsuz kullanıcı uygulama kabuğunun boş HTML'ini alır (veri yok). Faz 14 öncesi yeniden değerlendirilecek.

**D-029 — Veri minimizasyonu: e-posta Firestore'a kopyalanmaz**
- Decision: E-posta yalnızca Firebase Auth'ta tutulur; `userPrivate`'e yazılmaz. `userPrivate` yalnızca koşul kabulü (sürüm + zaman), gizlilik (`profileVisibility: "campus"`) ve mesajlaşma (`allowFrom: "campus"`) varsayılanlarını içerir.
- Why: KVKK veri minimizasyonu; taslak veri modeli e-postayı `userPrivate`'te öngörüyordu.
- Alternative: E-postayı kopyalamak.
- Risk: Yok. Gizlilik/mesajlaşma varsayılanları S-14 ve Faz 11'de kesinleşecek.

**D-030 — Koşul kabulü**
- Decision: Onboarding'de "Kullanım Şartları'nı kabul ediyorum ve Aydınlatma Metni'ni okudum" kutusu zorunlu; `LEGAL_TERMS_VERSION = "2026-09-taslak"` sunucuda doğrulanır ve `userPrivate.legal`'a zamanla yazılır. Aydınlatma bir **rıza değil bilgilendirmedir**; metin buna göre yazıldı.
- Why: Hangi sürümün kabul edildiğinin kanıtlanabilmesi.
- Alternative: Kayıt ekranında kabul.
- Risk: Metinler taslak; hukuk onayından sonra sürüm değişir ve yeniden kabul akışı gerekir (Faz 11).

**D-031 — Zorunlu alan göstergesi**
- Decision: Etiket yanında `aria-hidden` kırmızı `*` + form başında "* ile işaretli alanlar zorunludur." + `required` özniteliği.
- Why: "(zorunlu)" metni erişilebilir adı kirletiyordu ("Şifre (tekrar) (zorunlu)"); ekran okuyucular `required`'ı zaten duyurur.
- Alternative: İsteğe bağlı alanları işaretlemek.
- Risk: Yok.

**D-032 — Demo üniversite verisi**
- Decision: `firebase/seed/universities.json` (5 gerçek üniversite adı) yalnızca emulator/e2e içindir; `scripts/seed-emulator.mjs` REST ile yazar. Üretim listesi S-06 kararıyla yönetilecek.
- Why: Onboarding'in yerelde ve testte çalışması.
- Alternative: Tam liste (YÖK kaynağından) — doğrulanmadan eklenmedi.
- Risk: Yok.

**D-033 — Doğrulama akışı**
- Decision: İstemci PDF'i `verification/{uid}/{requestId}.pdf` yoluna yükler (Storage Rules: sahibi, yalnızca oluşturma, PDF türü, ≤ 5 MB, ad biçimi, üzerine yazma yok) → `v1-submitVerification` sunucuda tür/boyut/`%PDF-` imzasını kontrol eder, sonra transaction ile `verificationRequests/{id}` (`pending`), `users.verificationStatus = pending` ve `userPrivate.verification` yazar. Başarısız gönderimde yüklenen dosya hemen silinir. Başvuru oluşturma istemciye kapalıdır (taslak modelde "oluşturma K" idi; daha sıkı).
- Why: Storage Rules dosya içeriğini göremez; imza kontrolü yalnızca sunucuda mümkündür. Ret sebebi gibi kişisel bilgiler aynı üniversitedeki öğrencilerin okuyabildiği `users` belgesine değil, yalnızca sahibin okuyabildiği `userPrivate`'e yazılır.
- Alternative: Storage tetikleyicisi (`onObjectFinalized`) ile eşzamansız doğrulama.
- Risk: Düşük.

**D-034 — Saklama ve temizlik (ÖNERİ, hukuk onayı bekliyor)**
- Decision: Karar verilen belgeler karardan `VERIFICATION_RETENTION_DAYS = 30` gün sonra, başvuruya dönüşmemiş yüklemeler 24 saat sonra günlük `jobs-purgeVerificationFiles` (Europe/Istanbul 03:30) ile silinir; başvuru kaydında `fileDeletedAt` tutulur.
- Why: Veri minimizasyonu; itiraz/denetim için kısa bir pencere. Süre hukuk kararıyla değişebilir (S-16).
- Alternative: Karar anında silmek.
- Risk: Süre değişirse sabit tek yerden güncellenir. Hesap silmede anında silme Faz 11'de.

**D-035 — Moderatör önizlemesi**
- Decision: `getBlob` (Storage Rules: sahibi + moderatör) + bellek içi `blob:` URL + `<iframe>`; kalıcı indirme token'ı (`getDownloadURL`) **kullanılmaz**. CSP'de yalnızca uygulama rotalarında `frame-src 'self' blob:`. `object-src 'none'` korunur — Chromium 141'de blob iframe'deki PDF görüntüleyicinin bu politikayla çalıştığı deneyle doğrulandı; e2e testi gömülü `embed[type="application/pdf"]`'i kontrol eder.
- Why: Paylaşılabilir kalıcı bağlantı üretmemek.
- Alternative: Kısa ömürlü imzalı URL (Admin SDK `getSignedUrl`), pdf.js ile çizim.
- Risk: Üretimde `getBlob` için bucket CORS ayarı gerekir (Faz 14 kontrol listesi). Diğer tarayıcılar Faz 13'te denetlenecek.

**D-036 — Storage'da çapraz servis kuralı kullanılmadı**
- Decision: "İncelemede/doğrulanmış kullanıcı yükleyemesin" kuralı Storage Rules'ta `firestore.get()` ile değil, sunucuda (`submitVerification` reddi + dosya silme) ve 24 saatlik yetim temizliğiyle uygulanır.
- Why: Bu ortamdaki Storage emulator'ü en basit çapraz servis kuralını bile reddetti (test edilemedi); üretimde ayrıca IAM izni gerekir ve izin eksikse tüm yüklemeler sessizce reddedilir. Test edilemeyen güvenlik kuralı eklenmedi.
- Alternative: Çapraz servis kuralı + CI'da doğrulama.
- Risk: Kullanıcı App Check'ten geçen istemciyle 24 saat boyunca fazladan dosya yükleyebilir (boyut sınırlı). Faz 13'te yeniden değerlendirilecek.

**D-037 — Claim atama sırası ve kendini onarma**
- Decision: Onayda claim'ler Firestore transaction'ı **başarıyla tamamlandıktan sonra** atanır (geri alma yok); aynı karar tekrar gelirse claim yeniden uygulanır. `v1-syncVerificationClaims` yalnızca sunucunun yazdığı `verificationStatus`'u claim'e yansıtır (doğrulanmışsa verir, değilse `verified`/`universityId`'i kaldırıp refresh token'ları iptal eder). İstemci durum/claim uyuşmazlığını görünce bir kez bu callable'ı çağırıp token'ı yeniler.
- Why: `code-review`: eşzamanlı iki onayda geri alma mantığı kullanıcıyı claim'siz bırakıyordu (emulator testiyle doğrulandı ve düzeltildi).
- Alternative: Transaction içinde claim (mümkün değil — Auth transaction'a katılmaz).
- Risk: Claim atama başarısız olursa durum `verified` ama claim yok olabilir → kullanıcı tarafı onarım veya moderatörün tekrar onayı giderir.

**D-038 — Ret sebepleri ve moderatör kısıtları**
- Decision: Ret sebebi zorunlu enum (`unreadable`, `not-student-document`, `expired`, `university-mismatch`, `other`) + isteğe bağlı ≤ 200 karakter not ("kişisel veri yazma" uyarısı). Moderatör kendi başvurusunu inceleyemez. Her karar `moderationLogs`'a yazılır.
- Why: Tutarlı kullanıcı mesajı, çıkar çatışmasının önlenmesi, denetim izi.
- Risk: Yok.

**D-039 — Görünürlük kalıbı tek tip**
- Decision: İlan, gönderi, kulüp ve etkinlik belgelerinin hepsi `universityId` (yazarın/oluşturanın üniversitesi) + `visibility: "campus" | "global"` taşır. Kampüs içeriği yalnızca aynı üniversitedeki doğrulanmış, genel içerik tüm doğrulanmış öğrencilere açıktır. Taslaktaki `posts.universityId | null` kalıbı bırakıldı.
- Why: Tek Rules yardımcı fonksiyonu (`canSee`), tek indeks kalıbı; istemci üniversite adına gönderi yazamaz (`validVisibility`).
- Alternative: `universityId: null` ile genel içerik.
- Risk: Yok (henüz veri yok).

**D-040 — Moderatör claim'i içerik okuma yetkisi vermez**
- Decision: `moderator` claim'i Rules'ta yalnızca `users`, `verificationRequests`, `moderationLogs`, `reports` okumaya ve Storage'daki belgeye erişime izin verir; kampüs içeriği (ilan, gönderi, mesaj) okuma yetkisi vermez. Raporlanan içeriğin moderasyonu Faz 12'de sunucu tarafı callable ile (yalnızca raporlanan hedef, denetim kaydıyla) yapılacak.
- Why: En az yetki; moderatörün tüm kampüslerin mesajlarını okuyabilmesi gereksiz ve riskli.
- Alternative: Moderatöre tam okuma.
- Risk: Faz 12'de raporlanan içeriğin bağlamını gösterme ihtiyacı sunucu üzerinden çözülecek.

**D-041 — Rules yazım kalıpları**
- Decision: Her istemci yazımında `keys().hasOnly(...)` (fazla alan yok) + zorunlu alanların doğrulanması + `createdAt/editedAt/joinedAt == request.time`; kimlik alanları token uid'ye eşit; sayaçlar oluşturmada 0 ve sonra istemciye kapalı; silme çoğunlukla sunucuda (yorum/gönderi) — beğeni, üyelik, katılım ve engel kaldırma istemcide. Sorgular görünürlük filtresi içermek zorunda.
- Why: Tek kalıp, test edilebilirlik; sayaç manipülasyonunun imkânsız olması.
- Alternative: Yazımların tamamını callable'a taşımak.
- Risk: Gönderi/yorum silme Faz 9'da callable olarak eklenecek.

**D-042 — Faz 5 rules incelemesi sonrası sıkılaştırmalar**
- Decision: (1) Gönderi ve yorumlar değiştirilemez (raporlanan içeriğin kanıtı korunur; düzenleme gerekirse geçmişli callable). (2) Raporlar yalnızca callable ile (Faz 9): hedef varlığı + raporlayanın görebilmesi + anlık görüntü + tekrar engeli. (3) Mesajda alıcının `allowFrom` tercihi, tam 2 katılımcı ve "karşı taraf" üzerinden iki yönlü engel kontrolü (Rules'ta koşullu ifade + `let`). (4) `users` liste sorgusu yalnızca moderatöre (rehber çıkarılamaz). (5) İlan okumada doğrulama şartı istisnasız. (6) Konuşma listesi `updatedAt` ile sıralanır (oluşturmada yazılır). (7) Genel kulüp/etkinlik indeksleri. (8) Claim'ler `token.get(ad, varsayılan)` ile okunur.
- Why: `code-review` (high) 10 bulgu; hepsi değerlendirildi, 9'u düzeltildi, 1'i (bildirimde `read` istisnası) spesifikasyona uygun olduğu için belgelendi (`CLAUDE.md`, `AI_Guidelines.md`).
- Alternative: Düzenlemeye izin verip sürüm geçmişi tutmak.
- Risk: Kullanıcılar gönderiyi düzeltemez (silip yeniden yazabilir — silme Faz 9 callable'ı).

**D-043 — Claude çağrı biçimi (AI_Guidelines §7.3'ten sapma)**
- Decision: `client.beta.messages.create()` + `betas: ["server-side-fallback-2026-07-01"]` + `fallbacks: "default"` + `output_config.format: betaZodOutputFormat(aiNeedOutputSchema)`. Yanıtta önce `stop_reason` (`refusal`, `max_tokens`) kontrol edilir; sonra **son** metin bloğu `JSON.parse` + Zod ile sunucuda doğrulanır. `messages.parse()` kullanılmaz.
- Why: `fallbacks` parametresi yalnızca beta API'de. `parse()` yardımcısı **ilk** metin bloğunu ayrıştırır; yedek modele geçilen yanıtta ilk blok reddeden modelin yarım çıktısı olabilir ve istisna fırlatır. `create()` + kendi doğrulamamız skill'de belgelenmiş kullanım ("create'e verilebilir, ayrıştırmayı kendin yaparsın").
- Alternative: `messages.parse()` ve fallback'siz çağrı.
- Risk: Beta API şekil değişikliği → SDK sürümü sabit (0.128.0), yanıt şekli testlerde mock'lanıyor.

**D-044 — Claude'a verilen şema ile alan şeması ayrı**
- Decision: Claude'a sade bir çıktı şeması verilir (uzunluk/sayı sınırı yok). Sunucu normalizasyonu metni temizler, yeniden maskeler, kısaltır; kişi sayısını 1–50'ye sıkıştırır; tarih/saatin makul olup olmadığını denetler (−1 gün…+366 gün, saat dilimi farkı zorunlu). Zaman türünü tutarlı kılar, sonra katı `parsedNeedSchema`'yı uygular. Düşen tarih için "hangi tarih ve saatte?" sorusu eklenir.
- Why: Structured outputs uzunluk ve aralık kısıtlarını desteklemez (SDK bunları açıklamaya taşır); küçük taşmalar başarısızlığa dönmemeli. Claude karar verici değil, yalnızca öneri üretir.
- Alternative: Katı şemayı doğrudan Claude'a vermek.
- Risk: Sessiz kısaltma. Kullanıcı yayımlamadan önce her alanı görüp düzenler.

**D-045 — PII maskeleme**
- Decision: Metin önce NFKC ile normalleştirilir, yerel rakamlar (Arapça-Hint vb.) ASCII'ye çevrilir, görünmez/yön karakterleri silinir. Maskelenen kalıplar:
  - e-posta;
  - `TR` IBAN;
  - rakam grubu sınıflandırıcısı: ≥ 16 hane hesap/kart numarası; `+` ile başlayan uluslararası telefon; 0/90/0090 önekli ya da öneksiz 10 haneli Türk telefonu; bitişik 11 hane veya sağlama toplamı geçerli bölünmüş TCKN.
  - Maskeleme dört yerde uygulanır: Claude'a giden metin, taslak/ilanda saklanan metin, Claude çıktısı ve kullanıcının düzenlediği alanlar. İlanda **maskelenmiş** metin saklanır.
- Why: Veri minimizasyonu. İlan metni genel görünürlükte tüm üniversitelere açık. Yurt dışı aktarım (S-28).
- Alternative: Yalnızca Claude'a giden metni maskelemek.
- Risk: Sezgisel. Yazıyla yazılmış numaralar, sosyal medya kullanıcı adları ve adresler maskelenmez. Yanlış pozitifler kabul edildi (10 haneli öğrenci numarası, bazı sayı listeleri). Kontrol listesi Faz 13'te yeniden gözden geçirilecek.

**D-046 — Taslak ve yayın akışı**
- Decision: İstemci UUID `draftId` üretir (idempotency anahtarı). Sunucu `needDrafts/{draftId}` belgesini tutar: yalnızca sunucu erişir, 24 saat yaşar. Yayınlanan ilanın kimliği `draftId`'dir; tekrar yayın aynı ilanı döndürür. `parseNeed` şu kurallarla çalışır:
  - Aynı kimlik farklı metin ya da kullanıcıyla gelirse → `already-exists`.
  - Ayrıştırılmış, reddedilmiş ya da yayımlanmış taslak yeniden döndürülür; Claude tekrar çağrılmaz.
  - Başarısız ya da süresi dolmuş taslak yeniden işlenir.
  - İşlenmekte olan taslak kilitlidir; kilit callable süresinden 10 sn sonra devralınır.
  - İlanda `parseStatus` (Claude mı, elle mi) ve `edited` (öneri değişti mi) saklanır: kalite ölçümü ve moderasyon önceliği için.
- Why: Ağ tekrarı ve çift tıklama maliyet üretmesin. Kullanıcı süresi dolan taslakta takılmasın (`code-review` bulgusu).
- Alternative: Taslaksız, tek adımlı yayın.
- Risk: Taslak belgeleri kullanıcı metni içerir → TTL + günlük temizlik (D-047), KVKK envanterinde.

**D-047 — Kotalar ve maliyet tavanı (geçici değerler, S-10)**
- Decision: Tüm sayaçlar gün bazında (Europe/Istanbul) tutulur:
  - Kullanıcı başına 20 Claude ayrıştırması; aşılınca hata yerine elle doldurma formu açılır.
  - Kullanıcı başına 60 taslak ve 10 yayın; bunlar kesin sınırdır.
  - Toplam günlük token bütçesi 2 milyon; 10 parçalı sayaçta tutulur, her ayrıştırma transaction ile 40 bin token ayırır ve gerçek kullanımla mutabakat yapılır. Faturası belirsiz sonuçlar (zaman aşımı, 5xx) ayrılan miktar kadar sayılır. Bütçe dolunca kullanıcının hakkı iade edilir, elle doldurmaya geçilir.
  - Değerler Firebase params'tan gelir: `AI_MODEL` (varsayılan `claude-opus-5`), `AI_DAILY_USER_PARSES`, `AI_DAILY_TOKEN_BUDGET`, `NEED_DAILY_DRAFTS`, `NEED_DAILY_PUBLISHES`. Anahtar `defineSecret("ANTHROPIC_API_KEY")` ile okunur.
  - `rateLimits` ve `needDrafts` belgelerinde `expiresAt` alanı vardır: günlük iş tükenene kadar siler; ayrıca Firestore TTL politikası (Faz 14).
- Why: `code-review`: tek sayaç ve transaction dışı kontrol eşzamanlı isteklerde tavanı aşıyordu; tüm kullanıcıların paylaştığı tek belge de kilit çakışması üretiyordu.
- Alternative: Tek sayaç veya harici kota servisi.
- Risk: Bütçe token cinsinden, maliyet cinsinden değil. Yedek model adımı ayrılan miktarı biraz aşabilir. Parça dolunca bütçe kalsa bile en fazla ~%10 erken elle doldurmaya düşülebilir.

**D-048 — Zaman aşımı ve yeniden deneme**
- Decision: SDK `timeout` 45 sn, `maxRetries` 1. Uygulama katmanında yalnızca şema uyuşmazlığında (`invalid-output`) ve ilk 30 sn içindeyse **1** yeniden deneme yapılır (§7.8). `max_tokens`, zaman aşımı ve 5xx yeniden denenmez. Callable süresi sözleşmede tanımlı (`callables.parseNeed.timeoutSeconds = 150`); istemci süresi +10 sn.
- Why: `code-review`: istemcinin varsayılan 70 sn süresi sunucudan kısaydı; kesilen yanıtı aynı `max_tokens` ile tekrar denemek boşa maliyetti.
- Risk: Nadir uzun yanıtlarda kullanıcı elle doldurmaya düşer.

**D-049 — Reddetme (refusal) işleme**
- Decision: Sunucu tarafı yedek model açık (D-006). Zincirin tamamı reddederse taslak `publishable: false` olur ve kullanıcı metne döner. Aynı taslak Claude'a yeniden gönderilmez.
- Why: Açık içerik sinyali; kullanıcıya anlaşılır mesaj.
- Alternative: Reddi yok saymak.
- Risk: **Güvenlik kontrolü değildir.** Elle doldurma yolu (kota, bütçe, AI hatası) Claude'dan geçmez; asıl kontrol rapor + moderasyon (Faz 12). Artık risk R-07.

**D-050 — İhtiyaç kategorileri (S-11 taslağı)**
- Decision: `ders`, `proje`, `spor`, `etkinlik`, `ulasim`, `esya`, `yardim`, `diger` (etiketler: Ders çalışma, Proje / takım, Spor, Etkinlik, Yol arkadaşlığı, Eşya paylaşımı, Yardım, Diğer). `contracts` içinde enum.
- Why: Kaynakta yalnızca örnekler vardı (spor, ders/proje); kampüs ihtiyaçlarının yaygın türleri.
- Alternative: Serbest metin kategori.
- Risk: Liste değişirse eski ilanlar için geçiş gerekir. **Kullanıcı onayı bekliyor.**

**D-051 — Emulator'de sahte sağlayıcı**
- Decision: Emulator'de `AI_PROVIDER` değeri `anthropic` değilse deterministik sahte ayrıştırıcı kullanılır: anahtar kelimelerle çalışır; `#sahte-hata` ve `#sahte-ret` tetikleyicileri vardır. Üretimde her zaman Anthropic kullanılır (`FUNCTIONS_EMULATOR` koruması, D-024). CI'da canlı Claude çağrılmaz.
- Why: e2e deterministik ve ücretsiz olmalı. Canlı çağrı gerçek maliyettir (§7.15).
- Risk: Gerçek model davranışı (Türkçe göreli tarih, injection direnci) otomatik testte ölçülmüyor → S-33.

**D-052 — Thinking ve effort ayarı**
- Decision: `thinking` ve `effort` gönderilmez; API varsayılanları geçerlidir (Opus 5: adaptive thinking açık, effort `high`).
- Why: Skill kuralı: effort değeri ölçümsüz düşürülmez; `low` ve `medium` bu modelde etkili olabilir ama bu bir değerlendirme sonucu olmalı.
- Alternative: `effort: "low"` ile gecikmeyi ve maliyeti azaltmak.
- Risk: Gecikme. Canlı değerlendirme seti ve effort taraması kullanıcı onayı bekliyor (S-33, gerçek maliyet).

**D-053 — Tarayıcı PDF desteğine göre önizleme**
- Decision: Moderatör önizlemesi `navigator.pdfViewerEnabled === false` ise belgeyi indirmez; güncel masaüstü tarayıcı kullanılmasını söyleyen bir mesaj gösterir. e2e testi bu yeteneğe göre iki daldan birini doğrular.
- Why: Bazı tarayıcılar (headless, bazı mobil tarayıcılar) PDF'i sayfa içinde gösteremez; boş çerçeve yerine anlaşılır durum gerekir. Görüntüleyici olmayan ortamda belgeyi indirmek veri minimizasyonuna aykırı.
- Alternative: Belgeyi indirme bağlantısı sunmak (moderatör cihazında kalıcı kopya bırakır); pdf.js ile çizim (ek bağımlılık, Faz 13'te yeniden değerlendirilebilir).
- Risk: CI'da görüntüleyici dalı (CSP altında gömülü görüntüleyici) çalışmaz; bu dal yerelde tam Chromium ile doğrulanıyor.

**D-019 — JSON-LD istisnası**
- Decision: `dangerouslySetInnerHTML` yalnızca statik JSON-LD için, `<` kaçışlanarak kullanılır (Next.js dokümanındaki yöntem). Kullanıcı içeriği için yasak kuralı sürer.
- Why: Yapılandırılmış veri `<script type="application/ld+json">` gerektirir.
- Alternative: JSON-LD kullanmamak.
- Risk: Düşük; içerik sabit ve kaçışlı.

## 8.1 Bağımlılıklar

| Paket | Sürüm | Lisans | Gerekçe | Bakım |
|---|---|---|---|---|
| `next` | 16.3.6 | MIT | Web framework (S-01 geçici) | Aktif (Vercel) |
| `react`, `react-dom` | 19.3.0 | MIT | UI | Aktif (Meta) |
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.3 | MIT | Token tabanlı stil | Aktif |
| `postcss` | 8.5 | MIT | Tailwind derleme hattı | Aktif |
| `typescript` | 6.0.3 | Apache-2.0 | Tip güvenliği (D-017) | Aktif (Microsoft) |
| `eslint`, `eslint-config-next` | 9.39 / 16.3.6 | MIT | Lint (Next.js önerisi) | Aktif |
| `vitest` | 5.0.2 | MIT | Birim test | Aktif |
| `@playwright/test` | 1.63.0 | Apache-2.0 | E2E | Aktif (Microsoft) |
| `@axe-core/playwright` (+ `axe-core`) | 4.13.0 | MPL-2.0 | Otomatik erişilebilirlik testi; yalnızca geliştirme bağımlılığı, dağıtılmaz | Aktif (Deque) |
| `@types/node`, `@types/react`, `@types/react-dom` | — | MIT | Tip tanımları | Aktif |

Font: Source Sans 3 (SIL Open Font License 1.1), `next/font/google` ile derleme anında indirilip kendi sunucumuzdan servis edilir; tarayıcı Google'a istek atmaz.

**Faz 2 bağımlılıkları**

| Paket | Sürüm | Lisans | Gerekçe |
|---|---|---|---|
| `firebase` | 12.19.0 | Apache-2.0 | Web SDK (modular) |
| `zod` | 4.6.5 | MIT | Paylaşılan şemalar; `z.toJSONSchema` ile iOS için JSON Schema |
| `firebase-admin` | 14.5.0 | Apache-2.0 | Functions Admin SDK |
| `firebase-functions` | 7.4.0 | MIT | Callable (v2) |
| `firebase-tools` | 15.31.0 | MIT | Emulator Suite, deploy (kök devDependency) |
| `@firebase/rules-unit-testing` | 5.0.2 | Apache-2.0 | Rules testleri |
| `esbuild` | 0.28.2 | MIT | Functions paketleme (contracts gömülür) |

pnpm derleme betikleri: yalnızca `esbuild`'e izin var; `@firebase/util`, `protobufjs`, `re2`, `unrs-resolver` bilinçli olarak engelli (`package.json > pnpm`).

**Bağımlılık denetimi (2026-09-25, `pnpm audit --prod`):** 0 yüksek/kritik. 2 orta: (1) `firebase <10.9.0` uyarısı — kurulu tek sürüm 12.19.0, **yanlış pozitif**; (2) `uuid <11.1.1` (`firebase-admin > @google-cloud/storage > gaxios`), yalnızca `buf` parametresiyle v3/v5/v6 çağrısında etkili — **kabul edilen risk**, üst paket güncellemesiyle izlenecek.

**Faz 6 bağımlılıkları**

| Paket | Sürüm | Lisans | Gerekçe |
|---|---|---|---|
| `@anthropic-ai/sdk` | 0.128.0 | MIT | Resmî Claude SDK'sı (yalnızca `functions`; web paketinde yok, `check:bundle` doğrular). esbuild'de harici bırakılır, deploy'da `npm install` ile kurulur |

## 9. Tamamlanan işler

- [x] Skill kaynakları tarandı (repo, kullanıcı düzeyi, synced, plugin, yerleşik, `allinone` kataloğu).
- [x] Skill envanteri, kategori eşleşmesi, Active Skills ve Missing Skills tabloları.
- [x] Skill → Faz matrisi.
- [x] `claude-api` skill'i okunup AI kuralları `AI_Guidelines.md` §7'ye işlendi.
- [x] `project-goals.md`, `AI_Guidelines.md`, `memory-bank/Memory_Bank.md` oluşturuldu.
- [x] `docs/threat-model.md` ve `docs/data-processing-inventory.md` iskeletleri (TASLAK).
- [x] `.gitignore` (sır koruması) ve `CLAUDE.md` (kural yönlendirmesi).
- [x] Belirsizlikler (S-01…S-30) iki dokümana taşındı.

**Faz 1 (2026-09-25)**
- [x] Tasarım token'ları `apps/web/src/app/globals.css` (`@theme`); 26 kontrast çifti `src/design/tokens.test.ts` ile doğrulanıyor.
- [x] Bileşenler (`src/components/ui`): Button/ButtonLink, IconButton, Icon (24 ikon, bağımlılıksız), Card, Tag, Chip, Avatar (tr-TR baş harf), Badge/VerifiedBadge, Banner, Tabs (WAI-ARIA, ok/Home/End), TextField/TextArea (sayaç, hata ilişkilendirme), FileDropzone (PDF türü + boyut + `%PDF-` imzası), UploadProgress, Modal/Sheet (yerel `<dialog>`), Toast (canlı bölge), Skeleton/LoadingRegion, EmptyState, ErrorState.
- [x] İmza bileşen `TearOffStrip` + `NeedCard` + `MatchCard` (`src/components/need`).
- [x] `/tasarim` bileşen galerisi (noindex).
- [x] Landing: hero (statik örnek dönüşüm), Nasıl çalışır (Python örneği), Doğrulama vaadi, dört bölüm sekmeleri, şeffaf eşleşme, Gizlilik/KVKK, SSS, kapanış; header (içeriğe geç bağlantısı, mobil menü), footer.
- [x] Yasal sayfa taslakları (TASLAK bandı + `[hukuk onayı bekleniyor]` alanları): Aydınlatma Metni (KVKK md. 10–11 yapısı), Gizlilik Politikası, Kullanım Şartları, Çerez Politikası.
- [x] SEO: metadata, OG, kanonik URL, `sitemap.xml`, `robots.txt`, WebSite JSON-LD; indeksleme varsayılan kapalı (D-016).
- [x] Güvenlik başlıkları (D-018).
- [x] Testler: Vitest 40 test; Playwright 70 test (3 görünüm, axe WCAG 2.2 AA, klavye, taşma, başlıklar, robots).
- [x] Lighthouse ölçümü (§2.2).
- [x] Faz sonu `code-review` (medium): 3 bulgu (robots testi gevşekti, Modal `onClose` çift çağrı, Tabs geçersiz varsayılan sekme) → üçü de düzeltildi ve testle doğrulandı.

**Faz 2 (2026-09-25)**
- [x] Monorepo: `tsconfig.base.json` (strict + `noUncheckedIndexedAccess`), `packages/contracts`, `functions`, `firebase` (rules test paketi).
- [x] `contracts`: `AppErrorCode` listesi, `callableErrorDetailsSchema`, `customClaimsSchema`, `universityIdSchema`, `FUNCTIONS_REGION`, `callables` kaydı (`ping` → `v1-ping`); JSON Schema'ya dönüştürülebilirlik testi.
- [x] Functions: `defineCallable` (auth + claim + Zod istek + yanıt sözleşme doğrulaması + PII'siz log + güvenli hata), `resolveCaller`/`parseRequest` (10 test), esbuild paketleme, `firebase.json` predeploy build, `.env*` içinde `FUNCTIONS_EMULATOR` yasağı.
- [x] Firebase: `firebase.json` (emulator portları, `demo-kampusagi`), default deny `firestore.rules` / `storage.rules`, rules testleri (9, var olan veriye karşı).
- [x] Web connector katmanı (`src/connectors`): arayüzler, Firebase + mock implementasyonları, `AppError` + Türkçe hata eşleme, `ConnectorsProvider`; birim testleri + emulator entegrasyon testi (5). Dokümantasyon: `docs/connectors.md`.
- [x] CSP (D-021): `src/proxy.ts` — tanıtım sayfaları SRI + `'unsafe-inline'`, uygulama rotaları nonce + `'strict-dynamic'`; diğer güvenlik başlıkları `next.config.ts`.
- [x] `.env.example` (yalnızca adlar), `scripts/check-client-bundle.mjs`.
- [x] CI: `.github/workflows/ci.yml` (quality, emulator, e2e, gitleaks).
- [x] SessionStart hook (`startup-hook-skill` kurallarıyla; senkron, yalnızca web oturumunda; doğrulandı).
- [x] Faz sonu `code-review`: 4 bulgu → functions deploy paketleme, `observeSession` yarış durumu (3 test), Storage bucket varsayılanı düzeltildi; nonce CSP + statik sayfa uyumsuzluğu Faz 3 kuralı olarak kaydedildi (D-021).
- [x] Güvenlik incelemesi: `security-review` skill'i varsayılan dal olmadığı için çalışamadı (`origin/HEAD` yok, S-30); aynı kontrol listesiyle elle yapıldı → `FUNCTIONS_EMULATOR` ile App Check'in kapatılabilmesi riski build korumasıyla kapatıldı.
- [x] İlk CI koşusu (run 36155929590): 4/4 job yeşil; gitleaks temiz (D-025 doğrulandı).

**Faz 3 (2026-09-25)**
- [x] `contracts`: profil şemaları (kırpma, `tr-TR` küçük harf, tekilleştirme, kontrol karakteri yasağı, sınırlar), `LEGAL_TERMS_VERSION`, `v1-completeOnboarding`, `v1-updateProfile`.
- [x] Functions: onboarding (transaction: üniversite var mı, profil var mı, idempotent, üniversite değiştirilemez) ve profil güncelleme callable'ları.
- [x] Rules: `universities` (oturumlu okur), `users` (sahibi / moderatör / aynı üniversitedeki doğrulanmış öğrenci okur; istemci yazamaz), `userPrivate` (yalnızca sahibi okur). 26 rules testi.
- [x] Web: `AuthConnector` e-posta/şifre metotları, `listCollection`, Timestamp → ISO dönüştürme; `SessionProvider`, `useOwnProfile`, `useUniversities`; `RequireSession`/`RequireProfile`/`RedirectIfSignedIn`; `safeNextPath` (açık yönlendirme koruması); giriş, kayıt, şifre sıfırlama, başlangıç (onboarding), dört sekmeli kabuk (Keşfet/Topluluklar/Mesajlar placeholder), profil görüntüleme/düzenleme/çıkış.
- [x] `(app)` layout'u `connection()` ile dinamik; e2e nonce CSP testi uygulama rotalarında ihlal olmadığını doğruluyor (D-021 kuralı karşılandı).
- [x] Emulator seed/reset betiği, `pnpm dev:local`, `pnpm test:e2e` (CI e2e job'u emulator'lü akışa taşındı).
- [x] Dokümanlar: `docs/api-contract.md` (callable + claim + Firestore erişim sözleşmesi taslağı), `docs/runbooks/ilk-moderator.md` (commit edilmeyen betik talimatı).
- [x] Testler: birim 118, rules 26, emulator 12, e2e 106 (3 görünüm; kayıt→onboarding→profil→düzenleme→çıkış→giriş, açık yönlendirme, `next` korunması, hata mesajları, axe).
- [x] Görsel kontrol (360/1440): mobil profil başlığı ve bant yerleşimi düzeltildi.
- [x] Faz sonu `code-review`: 4 bulgu (seed betiği boşluklu/Türkçe yolda çalışmıyordu, Windows'ta boşluklu yol, kayıt akışında `next` kaybı, çıkış hatasının yutulması) → dördü de düzeltildi, `next` için 2 yeni e2e testi eklendi.
- [x] Faz 3 CI koşusu (run 36159985886) yeşil.

**Faz 4 (2026-09-25)**
- [x] `contracts`: doğrulama şemaları, `VERIFICATION_MAX_BYTES` (5 MB), `VERIFICATION_RETENTION_DAYS` (30), ret sebepleri, `hasPdfSignature` (web + Functions ortak), `v1-submitVerification`, `v1-reviewVerification`, `v1-syncVerificationClaims`.
- [x] Storage Rules: yalnızca sahibi, yalnızca oluşturma (`resource == null`), PDF türü, ≤ 5 MB, dosya adı biçimi; okuma sahibi + moderatör. **Bulgu:** emulator var olan belgenin üzerine yazmaya izin veriyordu → `resource == null` ile kapatıldı.
- [x] Firestore Rules: `verificationRequests` (sahibi/moderatör okur, kimse yazamaz), `moderationLogs` (yalnızca moderatör okur); bileşik indeks (`status`, `createdAt`).
- [x] Functions: gönderim, inceleme (idempotent, kendi başvurusunu inceleyememe, denetim kaydı), claim onarımı, günlük temizlik (süresi dolan + yetim dosyalar). Admin SDK ile emulator entegrasyon testleri (16).
- [x] Web: `/dogrulama` (durum, ret sebebi/notu, yükleme + ilerleme + iptal), `RequireVerified` kilitleri (Keşfet/Topluluklar/Mesajlar), claim eşitleme, profil bantlarında doğrulama bağlantısı, moderatör paneli (`/admin`: kuyruk, PDF önizleme, onay, sebepli ret), `RequireModerator` (403 ekranı).
- [x] Testler: rules 40, birim 136, emulator 28, e2e 121 (yükleme → onay → kilidin açılması; ret → sebep → yeniden yükleme; moderatör olmayana 403; sahte PDF; axe; CSP).
- [x] Faz sonu `code-review`: 3 bulgu → (1) eşzamanlı onayda claim kaybı düzeltildi + test; (2) yetim dosyalar düzeltildi (anında silme + 24 saat temizliği) + test; (3) `object-src 'none'` altında PDF önizlemesinin engellenmesi **Chromium'da yeniden üretilemedi** (deneyle), e2e'ye gömülü görüntüleyici kontrolü eklendi.

**Faz 5 (2026-09-25)**
- [x] `docs/data-model.md`: tüm koleksiyonlar, alanlar, okuma/yazma yetkisi, taslaktan sapmalar, indeksler.
- [x] `firestore.rules` yeniden yazıldı: `needs` (+`matches`), `posts` (+`comments`, `likes`), `clubs` (+`members`), `events` (+`attendees`), `conversations` (+`messages`, iki yönlü engel kontrolü), `notifications`, `blocks`, `reports`, `dataExports`, `config`/`rateLimits` (kapalı).
- [x] Rules testleri 40 → 87: çapraz üniversite okuma/yazma/sorgu, doğrulanmamış/sahte claim/anonim, sayaç ve skor manipülasyonu, kimlik taklidi, zaman damgası, fazla alan, engelleme, bildirim, rapor, sunucuya özel koleksiyonlar.
- [x] `firestore.indexes.json`: ilan, gönderi, kulüp, etkinlik, konuşma indeksleri.
- [x] `docs/threat-model.md`: STRIDE tablosu ve artık riskler.
- [x] Faz sonu `code-review` (high, rules odaklı): 10 bulgu → 9 düzeltme (D-042), 1 belgelenmiş istisna; rules testleri 87 → 94.

**Faz 6 (2026-09-25)**
- [x] `contracts`:
  - İhtiyaç şemaları: kategoriler, zaman türleri, sınırlar, `parsedNeedSchema`, saklanan ilan şeması.
  - `v1-parseNeed` (150 sn) ve `v1-publishNeed`; `callableTimeoutSeconds`.
  - Saat dilimi yardımcıları (`formatZonedIso`, `zonedDayKey`, `zonedLocalToDate`).
  - Ortak metin şemaları (`boundedText`, `tagList`).
- [x] Functions:
  - `ai/`: Anthropic ayrıştırıcısı (D-043), Claude'a verilen şema, sabit Türkçe sistem istemi, sahte sağlayıcı.
  - `needs/`: temizleme + PII maskeleme (D-045), normalizasyon (D-044), servis (taslak, kota, yayın; D-046, D-047), parçalı token bütçesi.
  - Callable'lar (App Check, doğrulanmış kullanıcı, Zod, secret) ve günlük temizlik işi (`needDrafts`, `rateLimits`).
- [x] Web:
  - `/kesfet/yeni` akışı: yaz → hazırlanıyor → kontrol et/düzenle (canlı önizleme `NeedCard`, açıklama soruları, maskeleme bildirimi, düşük güven uyarısı, elle doldurma) → yayında.
  - `/kesfet/ilan/[id]` detay sayfası: görünürlük rozeti, başka kampüsten yazar için genel etiket, bulunamadı durumu.
  - Keşfet'e çağrı kartı; `RadioGroup` bileşeni.
- [x] Seed: `createVerifiedStudent` (e2e'de hazır doğrulanmış öğrenci).
- [x] Testler:
  - Birim 241 (contracts 48, functions 93, web 100).
  - Rules 99 (sunucu iç koleksiyonları istemciye kapalı).
  - Emulator 63 (functions 51, web 12).
  - e2e 139 başarılı + 2 atlanan. Kapsam: yazma → düzenleme → yayın, form hataları, elle doldurma, ret, kampüs izolasyonu, geçersiz kimlik, axe, CSP.
- [x] Faz sonu `code-review` (high): 15 bulgu. Düzeltmeler:
  - Token tavanı parçalı rezervasyon oldu; sayaç yazımı sonucu kaybettirmiyor; tek belge kilit çakışması kalktı.
  - İstemci zaman aşımı sunucuyla uyumlu; yeniden deneme politikası §7.8'e uyduruldu.
  - İç içe sınırlayıcı etiketle prompt'tan kaçış kapatıldı: `<` ve `>` değiştiriliyor.
  - PII maskeleme ayraç ve boşluk varyantları, bölünmüş TCKN ve yerel rakamlarla genişletildi.
  - NFKC sonrası uzunluk kontrolü eklendi.
  - Temizlik işi tükenene kadar siliyor.
  - Süresi dolan ya da başarısız taslakta takılma giderildi; maskeleme sonrası uzayan alan kısaltılıyor.
  - Yazar etiketi yüklenirken yanlış gösterilmiyor.
  - `needDrafts` KVKK envanterine eklendi; SDK istemcisi ve şema bir kez oluşturuluyor.
  - Kalan bulgu (elle doldurma yolunun reddi atlatması) güvenlik kontrolü olmadığı için belgelendi (D-049, R-07).
- [x] e2e axe yardımcısı, Next 16'nın akışla gelen `<title>`'ını bekliyor (yarış durumu giderildi).
- [x] **CI düzeltmesi:** Faz 4 ve 5 koşuları (run 3–5) e2e job'unda kırmızıydı ve fark edilmemişti. Sebep: moderatör önizlemesindeki `embed[type="application/pdf"]` kontrolü tarayıcının gömülü PDF görüntüleyicisine bağlıydı. CI'daki Playwright tarayıcılarında görüntüleyici yok (`navigator.pdfViewerEnabled === false`); yerelde kullanılan tam Chromium'da var. **İlk deneme yanlıştı:** `channel: "chromium"` (run 7) sorunu çözmedi. Yerel doğrulama, CI'nin sürümünü (Chrome for Testing 153) değil eski yerel sürümü kullanmıştı; CI sürümü indirilemedi. **Gerçek düzeltme (D-053):**
  - Ürün: önizleme, tarayıcı PDF'i sayfa içinde gösteremiyorsa belgeyi indirmeden açıklayıcı bir mesaj gösterir.
  - Test: görüntüleyici varsa `embed` + CSP kontrolü, yoksa mesaj ve iframe olmadığı doğrulanır.
  - İki dal da yerelde gerçekten çalıştırıldı: tam Chromium → `true`/embed; headless shell → `false`/mesaj.
  - Kanal değişikliği geri alındı.
  - Ders: her push'tan sonra CI sonucu kontrol edilmeli; "CI benzeri" doğrulamada tarayıcı sürümü de aynı olmalı.

## 10. Sonraki adımlar

1. Faz 7: eşleştirme motoru (sunucuda skor, `breakdown`, Türkçe gerekçeler, `weightsVersion`; S-03 normalize ağırlıklar; ilan yayınlanınca tetikleme; ilan sahibine ve adaya görünürlük).
2. Kullanıcıdan bekleyen kararlar (D-012): S-01, S-04, S-11 (kategori listesi, D-050), S-17 (Firebase bölgesi), S-25, S-30/S-31, S-32, S-33 (canlı Claude değerlendirmesi ve effort taraması — gerçek maliyet).
3. PR açılabilmesi ve `security-review` skill'inin çalışabilmesi için varsayılan dal (`main`) gerekiyor — kullanıcı izni bekleniyor.

**Faz 14 kontrol listesine eklenenler (Faz 6)**
- `firebase functions:secrets:set ANTHROPIC_API_KEY` (değer yalnızca Secret Manager'da; repo, log ve dokümana yazılmaz).
- Firestore TTL politikaları: `needDrafts.expiresAt`, `rateLimits.expiresAt`.
- Params değerlerinin gözden geçirilmesi (`AI_MODEL`, kotalar, günlük token bütçesi) ve Anthropic tarafında harcama limiti/alarmı.
- Anthropic veri saklama koşulları ve yurt dışı aktarım (S-16, S-28) hukuk onayı.

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
| S-10 | Claude modeli / kota | Params; `claude-opus-5`; 20 ayrıştırma/kullanıcı/gün, 2M token/gün (D-047) |
| S-11 | Kategori listesi | Taslak uygulandı (D-050); onay bekliyor |
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
| S-31 | Alan adı (kanonik URL, sitemap) | `NEXT_PUBLIC_SITE_URL` ile verilecek; yoksa `http://localhost:3000` ve indeksleme kapalı |
| S-32 | E-posta doğrulaması zorunlu mu? | Hayır; bilgilendirme bandı gösteriliyor (D-026) |
| S-33 | Canlı Claude değerlendirmesi / effort ayarı | Yapılmadı (gerçek maliyet); API varsayılanları (D-052) |

## 12. Değişiklik günlüğü

| Tarih | Faz | Değişiklik |
|---|---|---|
| 2026-09-25 | 0 | Memory Bank oluşturuldu; skill keşfi ve Faz 0 dokümanları |
| 2026-09-25 | 1 | Tasarım sistemi, landing, yasal taslaklar, SEO, testler, Lighthouse; D-012…D-019 |
| 2026-09-25 | 2 | Contracts, Functions iskeleti, default deny Rules + testler, connector katmanı, CSP, CI, SessionStart hook; D-020…D-025 |
| 2026-09-25 | 3 | Kimlik doğrulama, onboarding, profil, üniversite; Rules + testler; e2e emulator akışı; D-026…D-032 |
| 2026-09-25 | 4 | Öğrenci doğrulaması, moderatör paneli, claim akışı, saklama/temizlik; D-033…D-038 |
| 2026-09-25 | 5 | Veri modeli, tüm koleksiyon Rules'u, 87 rules testi, indeksler, STRIDE; D-039…D-041 |
| 2026-09-25 | 5 | Rules incelemesi sonrası sıkılaştırmalar; D-042 |
| 2026-09-25 | 6 | İhtiyaç yazma + Claude yapılandırma, PII maskeleme, kota/bütçe, taslak/yayın, ilan detayı; D-043…D-052 |
