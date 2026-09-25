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

Alan kuralları (`packages/contracts/src/schemas/profile.ts`): `displayName` 2–40, `department` 2–80, `bio` ≤ 280, etiket listeleri ≤ 10 öğe (her biri 1–30 karakter; sunucu kırpar, `tr-TR` küçük harfe çevirir, tekilleştirir), kontrol karakteri yasak. `acceptedTermsVersion` = `LEGAL_TERMS_VERSION` (`2026-09-taslak`).

JSON Schema üretimi: `z.toJSONSchema(schema, { io: "input" })` (istek) ve `z.toJSONSchema(schema)` (yanıt); dönüştürülebilirlik `contracts.test.ts` ile güvence altında.

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
| Storage `verification/{uid}/{requestId}.pdf` | Sahibi, moderatör | Yalnızca sahibi, yalnızca oluşturma, PDF, ≤ 5 MB |
| Diğer her şey | Yok | Yok |
