# Runbook: İlk moderatörün atanması

> Durum: TASLAK · S-09 geçici kararı: sahibin yerelde çalıştırdığı, **repoya commit edilmeyen** tek seferlik Admin SDK betiği.

Moderatör yetkisi yalnızca Firebase Auth custom claim'i (`moderator: true`) ile verilir. İstemcideki hiçbir değer yetki kaynağı değildir. İlk moderatör atandıktan sonra sonraki atamalar Faz 12'deki güvenli sunucu akışıyla yapılır.

## Ön koşullar

- Proje sahibinin yerel makinesi; `gcloud auth application-default login` ile oturum (service account JSON dosyası **indirilmez**, repoya konmaz).
- Moderatör olacak kişinin önce uygulamada hesap açmış olması (uid gerekir).

## Adımlar

1. Repo dışında geçici bir klasör oluştur ve `firebase-admin` kur:
   ```bash
   mkdir ~/kampusagi-admin && cd ~/kampusagi-admin && npm init -y && npm i firebase-admin
   ```
2. Aşağıdaki betiği `set-moderator.mjs` olarak **bu klasöre** kaydet (repoya değil):
   ```js
   import { initializeApp, applicationDefault } from "firebase-admin/app";
   import { getAuth } from "firebase-admin/auth";

   const [projectId, uid] = process.argv.slice(2);
   if (!projectId || !uid) throw new Error("Kullanım: node set-moderator.mjs <projectId> <uid>");

   initializeApp({ credential: applicationDefault(), projectId });
   const auth = getAuth();
   const user = await auth.getUser(uid);
   await auth.setCustomUserClaims(uid, { ...(user.customClaims ?? {}), moderator: true });
   await auth.revokeRefreshTokens(uid);
   console.log(`Moderatör yetkisi verildi: ${uid}`);
   ```
3. Çalıştır: `node set-moderator.mjs <projectId> <uid>`
4. Kişiden çıkış yapıp yeniden giriş yapmasını iste (yeni token'da claim görünür).
5. İşlemi ve tarihini Memory Bank'e yaz. (Faz 12'den sonra bu işlemler `moderationLogs`'a otomatik kaydedilir.)
6. Geçici klasörü sil.

## Güvenlik notları

- Mevcut claim'ler korunur (`verified`, `universityId` silinmez).
- `revokeRefreshTokens` eski token'ların süresini kısaltır.
- Emulator'de denemek için: `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node set-moderator.mjs demo-kampusagi <uid>`.
