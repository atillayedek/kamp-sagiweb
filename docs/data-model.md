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
| `needs/{needId}` | `authorUid`, `universityId` (yazarın profilinden), `visibility`, `rawText` (**maskelenmiş** metin), `parsed{title, category, tags[], requiredSkills[], participants{min,max}, when{kind, startIso, endIso, rawText}, locationHint}`, `parseStatus` (`parsed`/`failed` — Claude mı elle mi), `edited` (öneri değiştirildi mi), `status` (`open`/`closed`), `matchStatus` (`pending`/`done`/`failed`, S), `matchCount` (S), `matchedAt` (S), `createdAt`, `updatedAt`. Belge kimliği = taslak kimliği | Doğrulanmış + (genel veya aynı üniversite) | S (`v1-publishNeed`); ilan sahibi yalnızca `open → closed` geçişini yapar (`status` + `updatedAt == request.time`), geri açma yok |
| `needDrafts/{draftId}` | `uid`, `textHash`, `maskedText`, `maskedKinds[]`, `status` (`pending`/`parsed`/`failed`), `failReason`, `parsed`, `confidence`, `clarifications[]`, `publishable`, `publishedNeedId`, `model`, `attempts`, `createdAt`, `updatedAt`, `expiresAt` (+24 saat) | **Hiç kimse (istemci)** | S (`v1-parseNeed`, `v1-publishNeed`) |
| `needs/{needId}/matches/{candidateUid}` | `candidateUid`, `needId`, `needAuthorUid`, `score` (0–100), `breakdown{campus, category, tags, skills, department, reliability}` (puan; uygulanamayan bileşen `null`), `reasons[]` (Türkçe), `weightsVersion`, `status` (`suggested`/`dismissed`), `createdAt` — hepsi S | İlan sahibi (hepsi); aday yalnızca `status == "suggested"` iken (tekil okuma ve collection-group sorgusu) | S (tetikleyici); ilan sahibi yalnızca `status: "dismissed"` yapabilir |
| `needs/{needId}/interests/{uid}` | `uid`, `needId`, `createdAt` | Kendisi; ilan sahibi (liste). Kullanıcı kendi ilgilerini collection-group ile sorgular | K: yalnızca kendi `uid`'i, ilanı görebiliyor, ilan açık, kendi ilanı değil, iki yönde engel yok; silme: kendisi (her zaman) |
| `savedNeeds/{uid}/items/{needId}` | `needId`, `createdAt` | Sahibi | K: sahibi oluşturur/siler (doğrulanmış) |
| `posts/{postId}` | `authorUid`, `universityId`, `visibility`, `text`, `likeCount` (S), `commentCount` (S), `createdAt` | Doğrulanmış + görünürlük | K oluşturma (sayaçlar 0); **değiştirilemez**; silme: S |
| `posts/{postId}/comments/{commentId}` | `authorUid`, `text`, `createdAt` | Gönderiyi okuyabilen | K oluşturma; **değiştirilemez**; silme: S |
| `posts/{postId}/likes/{uid}` | `createdAt` | Gönderiyi okuyabilen | K (yalnızca kendi `uid` belgesi; oluşturma/silme) |
| `clubs/{clubId}` | `name`, `description`, `universityId`, `visibility`, `memberCount` (S), `createdBy`, `createdAt` | Doğrulanmış + görünürlük | S (Faz 9 kararı) |
| `clubs/{clubId}/members/{uid}` | `joinedAt` | Kulübü okuyabilen | K (yalnızca kendi `uid`; katıl/ayrıl) |
| `events/{eventId}` | `title`, `description`, `universityId`, `visibility`, `startsAt`, `endsAt`, `location`, `clubId?`, `attendeeCount` (S), `createdBy`, `createdAt` | Doğrulanmış + görünürlük | S (Faz 9 kararı) |
| `events/{eventId}/attendees/{uid}` | `joinedAt` | Etkinliği okuyabilen | K (yalnızca kendi `uid`) |
| `conversations/{conversationId}` | `participants[2]`, `lastMessage{text, senderUid, at}` (S), `unreadCounts{uid: n}` (S), `createdAt`, `updatedAt` (S; oluşturmada da yazılır, liste sıralaması) | Katılımcılar (doğrulanmış) | S (başlatma callable'ı, Faz 10) |
| `conversations/{id}/messages/{messageId}` | `senderUid`, `text`, `createdAt` | Katılımcılar | K oluşturma: katılımcı, doğrulanmış, tam 2 katılımcı, iki yönde engel yok, alıcının `userPrivate.messaging.allowFrom` tercihi (`everyone` veya aynı üniversite için `campus`); düzenleme/silme yok |
| `notifications/{uid}/items/{notificationId}` | `type`, `payload{…}`, `read`, `createdAt`. Eşleşme bildirimi: kimlik `match_{needId}`, `type: "need-match"`, `payload{needId, title, score}`. İlgi bildirimi: kimlik `interest_{needId}_{uid}`, `type: "need-interest"`, `payload{needId, title, fromUid}`; ilgi geri alınınca silinir | Sahibi | S oluşturma; sahibi yalnızca `read: true` yapar |
| `blocks/{uid}/blocked/{targetUid}` | `createdAt` | Sahibi | K (kendisi için; kendini engelleyemez) |
| `reports/{reportId}` | `reporterUid`, `targetType`, `targetPath`, `targetSnapshot` (S), `reason` (enum), `details`, `status`, `createdAt` | Moderatör | **S** — rapor callable'ı (Faz 9) hedefin varlığını ve raporlayanın görebildiğini doğrular, içeriğin anlık görüntüsünü alır, tekrarları engeller |
| `moderationLogs/{logId}` | `action`, `actorUid`, `targetUid`, `targetRef`, `reason`, `createdAt` | Moderatör | S |
| `config/{doc}` (ör. `config/matching`) | `config/matching` (isteğe bağlı): `version`, `weights{…}`, `minScore`, `maxMatches`, `maxCandidates`, `neutralReliability`, `categoryTerms{kategori: terimler[]}`; eksik alanlar varsayılandan tamamlanır (D-058). Kotalar Firebase params'ta (D-047) | **Hiç kimse (istemci)** | S |
| `dataExports/{uid}/jobs/{jobId}` | `status`, `storagePath`, `expiresAt`, `createdAt` | Sahibi | S |
| `rateLimits/{key}` | `needs_{uid}_{gün}`: `drafts`, `aiParses`, `publishes`; `aiTokens_{gün}_{0-9}`: `tokens` (parçalı günlük bütçe); hepsinde `expiresAt` (+48 saat). Gün = Europe/Istanbul | Hiç kimse | S |

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
| `users` | `universityId` ↑, `verificationStatus` ↑, `interests` / `skills` (array-contains) | Eşleştirme aday havuzu (sunucu) |
| `matches` (koleksiyon) | `status` ↑, `score` ↓ | İlan sahibinin önerilen eşleşme listesi |
| `matches` (collection group) | `candidateUid` ↑, `status` ↑, `createdAt` ↓ | Adayın "sana uygun ilanlar" listesi |
| `interests` (collection group, tek alan) | `uid` ↑ (`fieldOverrides`) | Kullanıcının kendi ilgileri |

Sorgular Rules'u kanıtlayabilmek için her zaman görünürlük filtresi içerir (`universityId == benim` veya `visibility == "global"`).
