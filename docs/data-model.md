# Veri Modeli

> Durum: **Kesinleşmiş taslak (Faz 5, 2026-09-25)** — kullanıcı "otomatik devam" dediği için geçici olarak kesinleştirildi (D-012). Tek gerçek kaynaklar: `firebase/firestore.rules` (erişim) ve `packages/contracts` (şemalar; özellik fazlarında eklenir). Bu belge ikisinin özetidir.

## 1. Temel kurallar

- **Yazar etiketi:** `S` = yalnızca sunucu (Admin SDK / callable), `K` = istemci Rules'a göre yazar.
- **Görünürlük:** Kampüs içeriği `visibility: "campus"` + `universityId` (yazarın üniversitesi). Genel içerik `visibility: "global"`. Kampüs içeriğini yalnızca **aynı üniversitedeki doğrulanmış** öğrenciler, genel içeriği **tüm doğrulanmış** öğrenciler okur. Doğrulanmamış kullanıcı hiçbir topluluk/ihtiyaç içeriğini okuyamaz.
- **Kimlik:** `authorUid`/`senderUid`/`reporterUid` her zaman `request.auth.uid` ile eşleşmek zorundadır.
- **Zaman:** İstemci yazımlarında `createdAt == request.time` zorunludur.
- **Sayaçlar ve skorlar:** `likeCount`, `commentCount`, `memberCount`, `attendeeCount`, `unreadCounts`, `score`, `breakdown`, `reasons`, `reputationScore`, `verificationStatus` yalnızca sunucuda yazılır.
- **"Kampüs" tanımı:** `universityId` eşitliği (S-05).

## 2. Koleksiyonlar

| Yol | Alanlar | Okuma | Yazma |
|---|---|---|---|
| `universities/{universityId}` | `name`, `city` | Oturum açmış | S |
| `users/{uid}` | `displayName`, `universityId`, `department`, `interests[]`, `skills[]`, `bio`, `verificationStatus` (S), `reputationScore` (S), `createdAt`, `updatedAt` | Sahibi, moderatör, aynı üniversitedeki doğrulanmış | S (callable) |
| `userPrivate/{uid}` | `legal{acceptedTermsVersion, acceptedAt}`, `privacy{profileVisibility}`, `messaging{allowFrom}`, `verification{…}`, `createdAt` | Sahibi | S (callable) |
| `verificationRequests/{requestId}` | `uid`, `universityId`, `storagePath`, `status`, `rejectReason`, `note`, `reviewedBy`, `reviewedAt`, `createdAt`, `purgeAt`, `fileDeletedAt` | Sahibi, moderatör | S |
| `needs/{needId}` | `authorUid`, `universityId`, `visibility`, `rawText`, `parsed{title, category, tags[], requiredSkills[], participants{min,max}, when{…}, locationHint}`, `status` (`open`/`closed`), `createdAt`, `updatedAt` | Doğrulanmış + (genel veya aynı üniversite) | S (`parseNeed` / ilan callable'ları) |
| `needs/{needId}/matches/{candidateUid}` | `score` (S), `breakdown{…}` (S), `reasons[]` (S), `weightsVersion` (S), `status` (`suggested`/`dismissed`), `createdAt` | İlan sahibi ve aday (doğrulanmış) | S; ilan sahibi yalnızca `status: "dismissed"` yapabilir |
| `posts/{postId}` | `authorUid`, `universityId`, `visibility`, `text`, `likeCount` (S), `commentCount` (S), `createdAt`, `editedAt` | Doğrulanmış + görünürlük | K oluşturma (sayaçlar 0), yazar yalnızca `text`/`editedAt` düzenler; silme: S |
| `posts/{postId}/comments/{commentId}` | `authorUid`, `text`, `createdAt`, `editedAt` | Gönderiyi okuyabilen | K oluşturma; yazar `text`/`editedAt` düzenler; silme: S |
| `posts/{postId}/likes/{uid}` | `createdAt` | Gönderiyi okuyabilen | K (yalnızca kendi `uid` belgesi; oluşturma/silme) |
| `clubs/{clubId}` | `name`, `description`, `universityId`, `visibility`, `memberCount` (S), `createdBy`, `createdAt` | Doğrulanmış + görünürlük | S (Faz 9 kararı) |
| `clubs/{clubId}/members/{uid}` | `joinedAt` | Kulübü okuyabilen | K (yalnızca kendi `uid`; katıl/ayrıl) |
| `events/{eventId}` | `title`, `description`, `universityId`, `visibility`, `startsAt`, `endsAt`, `location`, `clubId?`, `attendeeCount` (S), `createdBy`, `createdAt` | Doğrulanmış + görünürlük | S (Faz 9 kararı) |
| `events/{eventId}/attendees/{uid}` | `joinedAt` | Etkinliği okuyabilen | K (yalnızca kendi `uid`) |
| `conversations/{conversationId}` | `participants[2]`, `universityIds[]`, `lastMessage{text, senderUid, at}` (S), `unreadCounts{uid: n}` (S), `createdAt` | Katılımcılar (doğrulanmış) | S (başlatma callable'ı, Faz 10) |
| `conversations/{id}/messages/{messageId}` | `senderUid`, `text`, `createdAt` | Katılımcılar | K oluşturma (katılımcı, doğrulanmış, engel yok); düzenleme/silme yok |
| `notifications/{uid}/items/{notificationId}` | `type`, `payload{…}`, `read`, `createdAt` | Sahibi | S oluşturma; sahibi yalnızca `read: true` yapar |
| `blocks/{uid}/blocked/{targetUid}` | `createdAt` | Sahibi | K (kendisi için; kendini engelleyemez) |
| `reports/{reportId}` | `reporterUid`, `targetType` (`user`/`need`/`post`/`comment`/`message`), `targetPath`, `reason` (enum), `details`, `status` (`open`), `createdAt` | Moderatör | K oluşturma (doğrulanmış, `status: "open"`); işleme S |
| `moderationLogs/{logId}` | `action`, `actorUid`, `targetUid`, `targetRef`, `reason`, `createdAt` | Moderatör | S |
| `config/{doc}` (ör. `config/matching`) | Ağırlıklar, eşikler, kotalar | **Hiç kimse (istemci)** | S |
| `dataExports/{uid}/jobs/{jobId}` | `status`, `storagePath`, `expiresAt`, `createdAt` | Sahibi | S |
| `rateLimits/{key}` | Sayaçlar | Hiç kimse | S |

## 3. Taslak modelden sapmalar

| Konu | Taslak | Kesin | Gerekçe |
|---|---|---|---|
| Gönderi görünürlüğü | `universityId \| null` | `universityId` her zaman + `visibility` | İlan, kulüp ve etkinlikle aynı kalıp; Rules ve indeksler tek tip (D-039) |
| `verificationRequests` oluşturma | K | S | Dosya içeriği yalnızca sunucuda doğrulanabilir (D-033) |
| `userPrivate` e-posta | Var | Yok | Veri minimizasyonu (D-029) |
| Profil yazımı | K (kısıtlı alan) | S (callable) | Liste alanları Rules'ta doğrulanamaz (D-027) |
| Eşleşme belgesinde kullanıcı alanı | `dismissed` benzeri | `status: "suggested" \| "dismissed"`; yalnızca ilan sahibi `dismissed` yapar | Tek alan, net geçiş |

## 4. İndeksler (`firebase/firestore.indexes.json`)

| Koleksiyon | Alanlar | Sorgu |
|---|---|---|
| `verificationRequests` | `status` ↑, `createdAt` ↑ | Moderatör kuyruğu |
| `needs` | `universityId` ↑, `status` ↑, `createdAt` ↓ | Kampüs ilan akışı |
| `needs` | `visibility` ↑, `status` ↑, `createdAt` ↓ | Genel ilan akışı |
| `posts` | `universityId` ↑, `createdAt` ↓ | Kampüs akışı |
| `posts` | `visibility` ↑, `createdAt` ↓ | Genel akış |
| `clubs`, `events` | `universityId` ↑, `createdAt` ↓ / `startsAt` ↑ | Kampüs listeleri |
| `conversations` | `participants` (array-contains), `lastMessage.at` ↓ | Konuşma listesi |

Sorgular Rules'u kanıtlayabilmek için her zaman görünürlük filtresi içerir (`universityId == benim` veya `visibility == "global"`).
