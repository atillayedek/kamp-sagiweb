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
| `users/{uid}` | `displayName`, `universityId`, `department`, `interests[]`, `skills[]`, `bio`, `verificationStatus` (S), `reputationScore` (S), `createdAt`, `updatedAt` | Tekil okuma: sahibi, moderatör, aynı üniversitedeki doğrulanmış. **Liste sorgusu yalnızca moderatör** (öğrenci rehberi çıkarılamaz) | S (callable) |
| `userPrivate/{uid}` | `legal{acceptedTermsVersion, acceptedAt}`, `privacy{profileVisibility}`, `messaging{allowFrom}`, `verification{…}`, `createdAt` | Sahibi | S (callable) |
| `verificationRequests/{requestId}` | `uid`, `universityId`, `storagePath`, `status`, `rejectReason`, `note`, `reviewedBy`, `reviewedAt`, `createdAt`, `purgeAt`, `fileDeletedAt` | Sahibi, moderatör | S |
| `needs/{needId}` | `authorUid`, `universityId`, `visibility`, `rawText`, `parsed{title, category, tags[], requiredSkills[], participants{min,max}, when{…}, locationHint}`, `status` (`open`/`closed`), `createdAt`, `updatedAt` | Doğrulanmış + (genel veya aynı üniversite) | S (`parseNeed` / ilan callable'ları) |
| `needs/{needId}/matches/{candidateUid}` | `score` (S), `breakdown{…}` (S), `reasons[]` (S), `weightsVersion` (S), `status` (`suggested`/`dismissed`), `createdAt` | İlan sahibi ve aday (doğrulanmış) | S; ilan sahibi yalnızca `status: "dismissed"` yapabilir |
| `posts/{postId}` | `authorUid`, `universityId`, `visibility`, `text`, `likeCount` (S), `commentCount` (S), `createdAt` | Doğrulanmış + görünürlük | K oluşturma (sayaçlar 0); **değiştirilemez**; silme: S |
| `posts/{postId}/comments/{commentId}` | `authorUid`, `text`, `createdAt` | Gönderiyi okuyabilen | K oluşturma; **değiştirilemez**; silme: S |
| `posts/{postId}/likes/{uid}` | `createdAt` | Gönderiyi okuyabilen | K (yalnızca kendi `uid` belgesi; oluşturma/silme) |
| `clubs/{clubId}` | `name`, `description`, `universityId`, `visibility`, `memberCount` (S), `createdBy`, `createdAt` | Doğrulanmış + görünürlük | S (Faz 9 kararı) |
| `clubs/{clubId}/members/{uid}` | `joinedAt` | Kulübü okuyabilen | K (yalnızca kendi `uid`; katıl/ayrıl) |
| `events/{eventId}` | `title`, `description`, `universityId`, `visibility`, `startsAt`, `endsAt`, `location`, `clubId?`, `attendeeCount` (S), `createdBy`, `createdAt` | Doğrulanmış + görünürlük | S (Faz 9 kararı) |
| `events/{eventId}/attendees/{uid}` | `joinedAt` | Etkinliği okuyabilen | K (yalnızca kendi `uid`) |
| `conversations/{conversationId}` | `participants[2]`, `lastMessage{text, senderUid, at}` (S), `unreadCounts{uid: n}` (S), `createdAt`, `updatedAt` (S; oluşturmada da yazılır, liste sıralaması) | Katılımcılar (doğrulanmış) | S (başlatma callable'ı, Faz 10) |
| `conversations/{id}/messages/{messageId}` | `senderUid`, `text`, `createdAt` | Katılımcılar | K oluşturma: katılımcı, doğrulanmış, tam 2 katılımcı, iki yönde engel yok, alıcının `userPrivate.messaging.allowFrom` tercihi (`everyone` veya aynı üniversite için `campus`); düzenleme/silme yok |
| `notifications/{uid}/items/{notificationId}` | `type`, `payload{…}`, `read`, `createdAt` | Sahibi | S oluşturma; sahibi yalnızca `read: true` yapar |
| `blocks/{uid}/blocked/{targetUid}` | `createdAt` | Sahibi | K (kendisi için; kendini engelleyemez) |
| `reports/{reportId}` | `reporterUid`, `targetType`, `targetPath`, `targetSnapshot` (S), `reason` (enum), `details`, `status`, `createdAt` | Moderatör | **S** — rapor callable'ı (Faz 9) hedefin varlığını ve raporlayanın görebildiğini doğrular, içeriğin anlık görüntüsünü alır, tekrarları engeller |
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
| Gönderi/yorum düzenleme | Yazar düzenler | Değiştirilemez | Raporlanan içeriğin kanıtı korunur (D-042) |
| Rapor oluşturma | K | S (callable) | Hedef doğrulaması, anlık görüntü, tekrar engeli (D-042) |

## 4. İndeksler (`firebase/firestore.indexes.json`)

| Koleksiyon | Alanlar | Sorgu |
|---|---|---|
| `verificationRequests` | `status` ↑, `createdAt` ↑ | Moderatör kuyruğu |
| `needs` | `universityId` ↑, `status` ↑, `createdAt` ↓ | Kampüs ilan akışı |
| `needs` | `visibility` ↑, `status` ↑, `createdAt` ↓ | Genel ilan akışı |
| `posts` | `universityId` ↑, `createdAt` ↓ | Kampüs akışı |
| `posts` | `visibility` ↑, `createdAt` ↓ | Genel akış |
| `clubs`, `events` | `universityId` ↑, `createdAt` ↓ / `startsAt` ↑ | Kampüs listeleri |
| `clubs`, `events` | `visibility` ↑, `createdAt` ↓ / `startsAt` ↑ | Genel listeler |
| `conversations` | `participants` (array-contains), `updatedAt` ↓ | Konuşma listesi (mesajsız yeni konuşmalar da görünür) |

Sorgular Rules'u kanıtlayabilmek için her zaman görünürlük filtresi içerir (`universityId == benim` veya `visibility == "global"`).
