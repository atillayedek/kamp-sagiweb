# Connector Katmanı

> Son güncelleme: 2026-09-25 (Faz 2). Kaynak: `apps/web/src/connectors/`, `packages/contracts/`, `functions/src/lib/`.

Web iş mantığı Firebase SDK'sına doğrudan bağlanmaz; `Connectors` arayüzlerini kullanır. Her connector'ın gerçek (Firebase) ve bellek içi (mock) implementasyonu vardır. Bileşenler connector'lara `ConnectorsProvider` / `useConnectors()` ile erişir.

## 1. İstemci connector'ları

| Arayüz | Sorumluluk | Firebase implementasyonu | Mock |
|---|---|---|---|
| `AuthConnector` | Oturumu izleme, token'ı zorla yenileyip claim'leri okuma, çıkış. Claim'ler **salt-okunur** ve `customClaimsSchema` ile doğrulanır | `FirebaseAuthConnector` (`onIdTokenChanged`, `getIdTokenResult`) | `InMemoryAuthConnector` |
| `FunctionsConnector` | Callable çağrısı: istek ve yanıt `contracts` şemasıyla doğrulanır | `FirebaseFunctionsConnector` (`httpsCallable`) | `MockFunctionsConnector` |
| `DocumentSource` | Belge okuma/izleme, sorgu (filtre değeri `string`/`number`/`boolean`/`Date` — `Date` Timestamp alanlarıyla karşılaştırılır), imleçli sayfa (`queryPage`: `limit + 1` ile "daha var mı" bilgisi; `collectionGroup` seçeneği), collection-group sorgusu; her belge Zod şemasıyla ayrıştırılır, sözleşme dışı veri `AppError("internal")` olur | `FirebaseDocumentSource` (`getDoc`, `getDocs`, `startAfter`, `onSnapshot`) | `InMemoryDocumentSource` |
| `DocumentWriter` | Rules'un istemciye izin verdiği dar yazımlar: `createDocument` (otomatik kimlik, ör. gönderi/yorum), `setDocument`, `updateFields`, `deleteDocument`; `serverTime` değeri sunucu zamanına çevrilir (Rules `== request.time`) | `FirebaseDocumentWriter` (`addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `serverTimestamp`) | `InMemoryDocumentWriter` |
| `StorageConnector` | İlerleme bildirimli ve iptal edilebilir yükleme | `FirebaseStorageConnector` (`uploadBytesResumable`) | `MockStorageConnector` |
| `AnalyticsConnector` | Olay takibi — **BELİRSİZ (S-20)**; yalnızca rıza sonrası | — | `noopAnalytics` |

Kimlik doğrulama yöntemleri (giriş/kayıt) Faz 3'te S-04 kararıyla `AuthConnector`'a eklenecek. Özellik bazlı repository'ler (profil, ilan, mesaj…) `DocumentSource` üzerine kurulur.

### Arayüzler (`apps/web/src/connectors/types.ts`)

```ts
interface AuthConnector {
  observeSession(listener: (session: Session | null) => void): Unsubscribe;
  refreshSession(): Promise<Session | null>;
  signOut(): Promise<void>;
}

interface FunctionsConnector {
  call<K extends CallableKey>(key: K, input: CallableRequest<K>): Promise<CallableResponse<K>>;
}

interface DocumentSource {
  getDocument<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S> | null>;
  watchDocument<S extends z.ZodType>(path, schema, onNext, onError): Unsubscribe;
}

interface StorageConnector {
  upload(path: string, file: Blob, options: { contentType: string; onProgress?: (percent: number) => void }): {
    done: Promise<{ path: string }>;
    cancel: () => void;
  };
}
```

## 2. Hata eşleme

Tüm connector'lar hatayı `AppError`'a çevirir (`apps/web/src/connectors/errors.ts`):

1. Callable hatasındaki `details.appCode` (sunucu `{ appCode }` gönderir, `callableErrorDetailsSchema` ile doğrulanır) önceliklidir.
2. Bilinen Auth/Storage kodları özel Türkçe mesajla eşlenir (ör. `auth/email-already-in-use` → `already-exists`, "Bu e-posta adresiyle zaten bir hesap var.").
3. Firestore ve `functions/` kodları doğrudan `AppErrorCode`'a eşlenir.
4. Diğer her şey `unknown` olur; ham hata mesajı kullanıcıya gösterilmez (`cause` içinde kalır).

`AppErrorCode` listesi `packages/contracts/src/errors.ts` içindedir; iOS aynı listeyi kullanır. `not-verified`, sunucuda HTTP düzeyinde `permission-denied` olarak döner ve `details.appCode` ile ayırt edilir.

## 3. Callable sözleşmesi

| Anahtar | Fonksiyon adı | Erişim | İstek | Yanıt |
|---|---|---|---|---|
| `ping` | `v1-ping` | Oturum açmış | `{}` (fazla alan reddedilir) | `{ ok: true, serverTime: ISO-8601, contractVersion: number }` |

- Bölge: `europe-west1` (`FUNCTIONS_REGION`, S-17 kararına bağlı, geçici).
- Adlandırma: `v<sürüm>-<ad>`. Kırıcı değişiklik yeni sürüm grubu açar (`v2-…`); eski sürüm iOS geçişi tamamlanana kadar yaşar.
- Sunucu tarafı sarmalayıcı (`functions/src/lib/callable.ts` → `defineCallable`): oturum ve claim kontrolü → Zod ile istek doğrulama → işleyici → yanıtın sözleşmeyle doğrulanması → PII içermeyen log. App Check üretimde her zaman zorunlu, yalnızca emulator'de kapalı.

- Zaman aşımı sözleşmede: `callables.<ad>.timeoutSeconds` (yoksa 30 sn). Sunucu bu değeri, web istemcisi bu değer + 10 sn'yi kullanır (`callableTimeoutSeconds`). Tüm callable'ların listesi: `docs/api-contract.md`.

## 4. Sunucu tarafı AI connector'ı (Faz 6)

Claude yalnızca Cloud Functions'tan çağrılır; web paketinde Anthropic SDK'sı yoktur (`pnpm check:bundle`).

| Parça | Dosya | Görev |
|---|---|---|
| `NeedExtractor` arayüzü | `functions/src/ai/types.ts` | `extractNeed({ text, now })` → `{ ok: true, output, usage, model }` veya `{ ok: false, reason, usage }` |
| Anthropic uygulaması | `functions/src/ai/anthropic.ts` | Resmî SDK, `beta.messages.create` + structured outputs + `fallbacks: "default"`; `stop_reason` kontrolü; son metin bloğunun Zod doğrulaması; tipli hata sınıflarıyla eşleme |
| Sahte uygulama | `functions/src/ai/fake.ts` | Yalnızca emulator'de (`AI_PROVIDER` ≠ `anthropic`); deterministik; `#sahte-hata`, `#sahte-ret` |
| Prompt | `functions/src/ai/prompt.ts` | Sabit Türkçe sistem istemi; kullanıcı mesajında sunucu tarihi + saat dilimi + `<ilan_metni>` bloğu |

Hata eşleme (`classifyAnthropicError`):

| SDK hatası | `reason` | Kullanıcıya etkisi |
|---|---|---|
| `APIConnectionTimeoutError` | `timeout` | Elle doldurma (`failReason: "ai-error"`) |
| `RateLimitError` | `rate-limited` | Elle doldurma |
| `AuthenticationError`, `PermissionDeniedError`, `NotFoundError` | `misconfigured` | Elle doldurma + hata logu |
| `BadRequestError`, `UnprocessableEntityError` | `rejected` | Elle doldurma |
| Diğer `APIError` (5xx, 529, bağlantı) | `unavailable` | Elle doldurma |
| `stop_reason: "refusal"` (yedek model de reddetti) | `refusal` | Yayımlanamaz, metne dön |
| `stop_reason: "max_tokens"` | `truncated` | Elle doldurma |
| Bozuk JSON / şema dışı | `invalid-output` | 1 kez yeniden deneme, sonra elle doldurma |

## 5. Firebase istemcisi ve ortam

- `createFirebaseClients(options, { emulators })`: uygulama, Auth, Firestore, Functions (bölgeli) ve Storage istemcilerini oluşturur; emulator bağlantısını bir kez kurar.
- `readFirebaseEnvironment()`: `NEXT_PUBLIC_FIREBASE_*` değişkenlerini okur (ad listesi: `.env.example`). `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` iken `demo-kampusagi` projesi ve yerel emulator'ler kullanılır.
- App Check: `NEXT_PUBLIC_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY` tanımlıysa ve emulator kullanılmıyorsa reCAPTCHA Enterprise sağlayıcısıyla başlatılır (sağlayıcı seçimi ÖNERİ).

## 6. Testler

| Katman | Komut | Kapsam |
|---|---|---|
| Birim | `pnpm test` | Hata eşleme, mock connector'lar, sözleşmeler, erişim kontrolü, Anthropic connector'ı (mock'lanmış SDK yanıtları) |
| Security Rules | `pnpm test:rules` | Default deny (Firestore + Storage), emulator |
| Entegrasyon | `pnpm test:emulator` | Gerçek Firebase connector'ları → Auth/Firestore/Storage/Functions emulator'leri (`v1-ping`, varsayılan ret → `AppError`) |
