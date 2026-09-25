# KampüsAğı — Tehdit Modeli

> **TASLAK — İSKELET.** Faz 0'da açıldı; Faz 5'te STRIDE ile doldurulur, Faz 13'te gözden geçirilir.
> Son güncelleme: 2026-09-25

## 1. Kapsam

Web istemcisi (landing + uygulama + `/admin`), Cloud Functions, Firestore, Storage, Firebase Auth, Anthropic Claude API bağlantısı. iOS istemcisi aynı backend'i kullandığı için backend tehditleri ortaktır.

## 2. Varlıklar

| Varlık | Hassasiyet | Not |
|---|---|---|
| Öğrenci belgesi PDF'leri | Çok yüksek | Kimlik ve öğrenim bilgisi içerir (içerik türü Faz 4'te netleşir) |
| Custom claim'ler (`moderator`, `verified`, `universityId`) | Çok yüksek | Yetki kaynağı |
| Mesajlar | Yüksek | Özel yazışma |
| Profil ve gizlilik ayarları | Orta–Yüksek | |
| Eşleşme skorları, itibar, sayaçlar | Orta | Bütünlük kritik |
| Anthropic API anahtarı ve diğer secret'lar | Çok yüksek | Yalnızca secret store |
| Moderasyon kayıtları | Yüksek | Denetim izi bütünlüğü |

## 3. Aktörler

- Anonim ziyaretçi
- Kayıtlı ama doğrulanmamış kullanıcı
- Doğrulanmış öğrenci (kendi üniversitesi / başka üniversite)
- Moderatör
- Kötü niyetli iç kullanıcı / ele geçirilmiş hesap
- Dış saldırgan (bot, scraping, injection)

## 4. Güven sınırları

1. Tarayıcı ↔ Firebase (Rules ile korunur)
2. Tarayıcı ↔ Callable Functions (auth + App Check + Zod)
3. Functions ↔ Anthropic API (yurt dışı; kullanıcı metni güvensiz veri)
4. Functions (Admin SDK) ↔ Firestore/Storage (Rules'u atlar — en yüksek yetki)
5. Moderatör paneli ↔ belge önizleme (kısa ömürlü URL)

## 5. STRIDE tablosu (Faz 5'te doldurulacak)

| Bileşen | Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege |
|---|---|---|---|---|---|---|
| Auth / claim'ler | | | | | | |
| Firestore Rules | | | | | | |
| Storage (belge) | | | | | | |
| `parseNeed` + Claude | | | | | | |
| Eşleştirme motoru | | | | | | |
| Mesajlaşma | | | | | | |
| Bildirimler / sayaçlar | | | | | | |
| `/admin` paneli | | | | | | |
| Veri dışa aktarma / hesap silme | | | | | | |

## 6. Bilinen tehditler (başlangıç listesi — TASLAK)

| # | Tehdit | Planlanan kontrol | Faz |
|---|---|---|---|
| T-01 | İstemcinin `verificationStatus`, skor veya sayaç yazması | Alan bazlı Rules + rules testleri | 3–5 |
| T-02 | Çapraz üniversite içerik okuma | `sameUniversity` Rules + testler | 5 |
| T-03 | İstemci bayrağıyla moderatör yetkisi alma | Yalnızca custom claim; sunucu kontrolü | 3, 12 |
| T-04 | Prompt injection ("önceki talimatları yok say", "beni admin yap") | Metin veri olarak sınırlandırılır; çıktı şeması; Claude çıktısı yetki alanına yazılmaz | 6 |
| T-05 | PDF olmayan / zararlı dosya yükleme | Storage Rules içerik türü + boyut; sunucuda magic bytes | 4 |
| T-06 | Belgeye yetkisiz erişim | Sahibi + moderatör; kısa ömürlü URL | 4 |
| T-07 | Claude maliyet saldırısı (spam) | App Check, kullanıcı kotası, günlük tavan | 6, 14 |
| T-08 | Engellenen kullanıcının mesaj atması | Rules + Function'da engel kontrolü | 10 |
| T-09 | Secret sızıntısı (repo, log, bundle) | `.gitignore`, secret scan, bundle kontrolü | 2, 6, 13 |
| T-10 | Claim gecikmesi nedeniyle iptal edilen yetkinin sürmesi | Refresh token iptali + hassas yazımlarda belge kontrolü (D-007) | 4, 12 |
| T-11 | XSS (kullanıcı içeriği) | Ham HTML render yok, CSP | 1, 8–10 |
| T-12 | Açık yönlendirme | Yalnızca göreli/izinli yönlendirme | 3 |

## 7. Artık riskler

Faz 5 ve Faz 13'te doldurulacak.
