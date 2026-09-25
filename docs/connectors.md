# Connector Katmanı

> Son güncelleme: 2026-09-25 (Faz 2). Kaynak: `apps/web/src/connectors/`, `packages/contracts/`, `functions/src/lib/`.

Web iş mantığı Firebase SDK'sına doğrudan bağlanmaz; `Connectors` arayüzlerini kullanır. Her connector'ın gerçek (Firebase) ve bellek içi (mock) implementasyonu vardır. Bileşenler connector'lara `ConnectorsProvider` / `useConnectors()` ile erişir.

## 1. İstemci connector'ları

| Arayüz | Sorumluluk | Firebase implementasyonu | Mock |
|---|---|---|---|
| `AuthConnector` | Oturumu izleme, token'ı zorla yenileyip claim'leri okuma, çıkış. Claim'ler **salt-okunur** ve `customClaimsSchema` ile doğrulanır | `FirebaseAuthConnector` (`onIdTokenChanged`, `getIdTokenResult`) | `InMemoryAuthConnector` |
| `FunctionsConnector` | Callable çağrısı: istek ve yanıt `contracts` şemasıyla doğrulanır | `FirebaseFunctionsConnector` (`httpsCallable`) | `MockFunctionsConnector` |
| `DocumentSource` | Belge okuma/izleme; her belge Zod şemasıyla ayrıştırılır, sözleşme dışı veri `AppError("internal")` olur | `FirebaseDocumentSource` (`getDoc`, `onSnapshot`) | `InMemoryDocumentSource` |
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

## 4. Firebase istemcisi ve ortam

- `createFirebaseClients(options, { emulators })`: uygulama, Auth, Firestore, Functions (bölgeli) ve Storage istemcilerini oluşturur; emulator bağlantısını bir kez kurar.
- `readFirebaseEnvironment()`: `NEXT_PUBLIC_FIREBASE_*` değişkenlerini okur (ad listesi: `.env.example`). `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` iken `demo-kampusagi` projesi ve yerel emulator'ler kullanılır.
- App Check: `NEXT_PUBLIC_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY` tanımlıysa ve emulator kullanılmıyorsa reCAPTCHA Enterprise sağlayıcısıyla başlatılır (sağlayıcı seçimi ÖNERİ).

## 5. Testler

| Katman | Komut | Kapsam |
|---|---|---|
| Birim | `pnpm test` | Hata eşleme, mock connector'lar, sözleşmeler, erişim kontrolü |
| Security Rules | `pnpm test:rules` | Default deny (Firestore + Storage), emulator |
| Entegrasyon | `pnpm test:emulator` | Gerçek Firebase connector'ları → Auth/Firestore/Storage/Functions emulator'leri (`v1-ping`, varsayılan ret → `AppError`) |
