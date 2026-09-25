# API Sözleşmesi (Web ↔ iOS ↔ Backend)

> Durum: TASLAK — Faz 3'te başlatıldı, Faz 15'te tamamlanacak. Tek gerçek kaynak: `packages/contracts/src`. Bu belge oradan türetilir.

## 1. Callable'lar

Bölge: `europe-west1` (geçici, S-17). Adlandırma: `v<sürüm>-<ad>`. Tüm callable'lar App Check ister (emulator hariç).

| Callable | Erişim | İstek (özet) | Yanıt | Hata kodları (`details.appCode`) |
|---|---|---|---|---|
| `v1-ping` | Oturum açmış | `{}` | `{ ok: true, serverTime, contractVersion }` | `unauthenticated` |
| `v1-completeOnboarding` | Oturum açmış | `{ displayName, department, interests[], skills[], bio, universityId, acceptedTermsVersion }` | `{ created: boolean }` (tekrar çağrı idempotent: `false`) | `unauthenticated`, `invalid-argument` (şema / olmayan üniversite), `failed-precondition` (farklı üniversiteyle ikinci deneme) |
| `v1-updateProfile` | Oturum açmış | `displayName`, `department`, `interests`, `skills`, `bio` alanlarından en az biri | `{ updated: true }` | `unauthenticated`, `invalid-argument`, `failed-precondition` (profil yok) |

| `v1-submitVerification` | Oturum açmış | `{ requestId }` (dosya önce `verification/{uid}/{requestId}.pdf` yoluna yüklenir) | `{ status: "pending" }` (aynı istekle idempotent) | `failed-precondition` (dosya yok, profil yok, bekleyen/doğrulanmış), `invalid-argument` (PDF değil / boyut), `already-exists` |
| `v1-reviewVerification` | Moderatör | `{ requestId, decision: "approve" \| "reject", rejectReason?, note? }` (red için sebep zorunlu) | `{ status: "approved" \| "rejected" }` (aynı kararla idempotent) | `permission-denied` (moderatör değil / kendi başvurusu), `not-found`, `failed-precondition` (zaten sonuçlanmış) |
| `v1-syncVerificationClaims` | Oturum açmış | `{}` | `{ verified: boolean }` — sunucudaki `verificationStatus`'u claim'e yansıtır | `unauthenticated` |
| `v1-parseNeed` | Doğrulanmış (claim + `users.verificationStatus`) · süre 150 sn | `{ draftId, text }` (`draftId`: istemcinin ürettiği UUID, idempotency anahtarı; `text` 10–1000 karakter, temizleme sonrası da) | `{ draftId, status: "parsed" \| "failed", failReason: "ai-error" \| "refusal" \| "quota" \| "budget" \| null, parsed, confidence, clarifications[], maskedKinds[], maskedText, publishable }` — başarısızlıkta da `parsed` elle doldurma için varsayılanlarla gelir | `not-verified`, `invalid-argument`, `already-exists` (kimlik başka metin/kullanıcı için), `failed-precondition` (taslak işleniyor), `resource-exhausted` (günlük taslak sınırı) |
| `v1-publishNeed` | Doğrulanmış | `{ draftId, visibility: "campus" \| "global", need }` (`need`: düzenlenmiş `parsedNeedSchema`) | `{ needId }` (= `draftId`; tekrar çağrı aynı ilanı döndürür) | `not-verified`, `not-found` (taslak yok / başkasının), `failed-precondition` (işleniyor, yayımlanamaz, süresi dolmuş), `invalid-argument`, `resource-exhausted` (günlük yayın sınırı) |

Alan kuralları (`packages/contracts/src/schemas/profile.ts`): `displayName` 2–40, `department` 2–80, `bio` ≤ 280, etiket listeleri ≤ 10 öğe (her biri 1–30 karakter; sunucu kırpar, `tr-TR` küçük harfe çevirir, tekilleştirir), kontrol karakteri yasak. `acceptedTermsVersion` = `LEGAL_TERMS_VERSION` (`2026-09-taslak`).

İhtiyaç alanları (`packages/contracts/src/schemas/need.ts`): `title` 3–80; `category` ∈ `ders`, `proje`, `spor`, `etkinlik`, `ulasim`, `esya`, `yardim`, `diger`; `tags` ve `requiredSkills` ≤ 8 öğe (1–30 karakter, `tr-TR` küçük harf, tekil); `participants` {min, max} tam sayı 1–50, min ≤ max; `when` {kind: `none` \| `exact` \| `range` \| `flexible`, startIso, endIso (saat dilimi farkıyla ISO 8601), rawText ≤ 80} — `exact` başlangıç ister, `range` başlangıç + bitiş (bitiş ≥ başlangıç), `none`/`flexible` tarih taşımaz; `locationHint` ≤ 80 veya `null`. Sunucu yayında metin alanlarındaki kişisel bilgileri yeniden maskeler.

Zaman aşımı: callable süresi sözleşmede (`timeoutSeconds`, varsayılan 30 sn); istemciler bu süre + 10 sn bekler (`callableTimeoutSeconds`).

JSON Schema üretimi: `z.toJSONSchema(schema, { io: "input" })` (istek) ve `z.toJSONSchema(schema)` (yanıt); dönüştürülebilirlik `contracts.test.ts` ile güvence altında.

## 1.1 Sunucu tetikleyicileri (istemci çağırmaz)

| Fonksiyon | Olay | Etki |
|---|---|---|
| `triggers-matchOnNeedCreated` | `needs/{needId}` oluşturuldu | Aynı üniversitedeki doğrulanmış, ilgili ve engelsiz öğrencilerden en fazla 20 eşleşme (`needs/{id}/matches/{candidateUid}`) ve adaylara bildirim (`notifications/{uid}/items/match_{needId}`) oluşturur; ilanda `matchStatus`, `matchCount`, `matchedAt` günceller. En az bir kez teslim edilir; idempotenttir; geçici hatada yeniden denenir, 1 saatten eski olayda `failed` yazar (`done`'ın üzerine yazmaz) |

| `triggers-notifyOnInterest` | `needs/{needId}/interests/{uid}` oluşturuldu | İlgi hâlâ varsa ve ilan açıksa ilan sahibine `interest_{needId}_{uid}` bildirimi (transaction, idempotent) |
| `triggers-withdrawOnInterestDeleted` | aynı yol silindi | İlgi yoksa ilgili bildirimi siler |

İstemci sorgu biçimleri (Rules bunlara göre yazıldı; iOS aynı biçimi kullanmalı):

- Kampüs akışı: `needs` · `where universityId == <benim>` · `where status == "open"` · `orderBy createdAt desc` · sayfa 20 (imleç).
- Genel akış: `needs` · `where visibility == "global"` · `where status == "open"` · `orderBy createdAt desc` · sayfa 20.
- Kaydedilenler: `savedNeeds/{uid}/items` · `orderBy createdAt desc` · sayfa 20; ilanlar tek tek okunur.
- İlan kapatma: `update needs/{id} { status: "closed", updatedAt: serverTimestamp() }` (yalnızca sahibi).
- İlgileniyorum: `set needs/{id}/interests/{uid} { uid, needId, createdAt: serverTimestamp() }` / `delete`. Kaydet: `set savedNeeds/{uid}/items/{needId} { needId, createdAt: serverTimestamp() }` / `delete`. Var olan belgeye tekrar `set` Rules'ta güncelleme sayılır ve reddedilir; istemci bunu "zaten var" olarak ele alır.
- İlan sahibi: `needs/{id}/matches` · `where status == "suggested"` · `orderBy score desc` · `limit 50`.
- Aday: `collectionGroup("matches")` · `where candidateUid == <uid>` · `where status == "suggested"` · `orderBy createdAt desc` (Faz 8).
- İlan sahibi gizleme: `update needs/{id}/matches/{candidateUid} { status: "dismissed" }` (başka alan değişemez).

## 2. Hata sözleşmesi

Callable hataları `HttpsError(code, message, { appCode })` döner. İstemci `appCode`'u (`AppErrorCode`, `packages/contracts/src/errors.ts`) esas alır ve mesajı kendi yerelleştirmesinden gösterir. `not-verified`, HTTP düzeyinde `permission-denied`'dır.

## 3. Custom claim sözleşmesi (taslak)

| Claim | Tür | Atayan | Kullanım |
|---|---|---|---|
| `moderator` | `boolean` | Yalnızca Admin SDK (ilk atama: `docs/runbooks/ilk-moderator.md`; sonra Faz 12 akışı) | Moderatör paneli, rapor/doğrulama kuyruğu |
| `verified` | `boolean` | Faz 4 doğrulama onayı Function'ı | Kampüs içeriği ve eşleşme erişimi |
| `universityId` | `string` | Faz 4 doğrulama onayı Function'ı (profil `universityId` ile aynı) | Rules'ta üniversite izolasyonu |

Akış (Faz 4'te uygulandı): belge yüklenir → `v1-submitVerification` dosyayı doğrular ve `verificationRequests` oluşturur (`pending`) → moderatör onaylar → Function önce Firestore'u (başvuru, `users.verificationStatus = "verified"`, `userPrivate.verification`, `moderationLogs`) tek transaction'da yazar, **sonra** `setCustomUserClaims({ ...mevcut, verified: true, universityId })` → istemci uyuşmazlığı görünce `v1-syncVerificationClaims` + token yenileme. Yetki kaldırmada `revokeRefreshTokens` çağrılır (D-007, D-037).

İstemciler claim'leri yalnızca okur ve `customClaimsSchema` ile doğrular; beklenmeyen türdeki claim yok sayılır.

## 4. Firestore erişim sözleşmesi

Tam tablo: `docs/data-model.md` (Faz 5). Özet:

| Yol | Okuma | Yazma |
|---|---|---|
| `universities/{id}` | Oturum açmış herkes | Yok (yalnızca Admin SDK) |
| `users/{uid}` | Sahibi, moderatör, aynı üniversitedeki doğrulanmış öğrenci | Yok — yalnızca callable'lar |
| `userPrivate/{uid}` | Yalnızca sahibi | Yok — yalnızca callable'lar |
| `verificationRequests/{id}` | Sahibi, moderatör | Yok — yalnızca callable'lar |
| `moderationLogs/{id}` | Moderatör | Yok — yalnızca sunucu |
| `needs/{id}` | Doğrulanmış + (genel veya aynı üniversite) | Yok — yalnızca `v1-publishNeed` |
| `needDrafts/{id}`, `rateLimits/{key}` | Yok | Yok — yalnızca sunucu |
| Storage `verification/{uid}/{requestId}.pdf` | Sahibi, moderatör | Yalnızca sahibi, yalnızca oluşturma, PDF, ≤ 5 MB |
| Diğer her şey | Yok | Yok |
