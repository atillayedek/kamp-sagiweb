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
| `posts/{postId}` | `authorUid`, `universityId`, `visibility`, `text` (1–1000), `likeCount` (S), `commentCount` (S), `createdAt` | Doğrulanmış + görünürlük | K oluşturma (sayaçlar 0); **değiştirilemez**; silme: S (`v1-deletePost`, yalnızca yazar; yorum ve beğenileriyle birlikte) |
| `posts/{postId}/comments/{commentId}` | `authorUid`, `authorUniversityId` (Rules: `== claim`; başka kampüsten yorumcunun profilini okumadan etiketlemek için), `text` (1–500), `createdAt` | Gönderiyi okuyabilen | K oluşturma: gönderiyi görebilen, iki yönde engel yok; **değiştirilemez**; silme: S (`v1-deleteComment`: yorum yazarı veya gönderi sahibi) |
| `posts/{postId}/likes/{uid}` | `createdAt` | Gönderiyi okuyabilen | K (yalnızca kendi `uid` belgesi; oluşturmada iki yönde engel yok; silme her zaman) |
| `clubs/{clubId}` | `name` (3–60, en az iki harf/rakam), `description` (10–500), `universityId`, `visibility`, `founderUid`, `memberCount` (S), `createdAt`. Kimlik istemcinin ürettiği UUID (idempotency) | Doğrulanmış + görünürlük | S (`v1-createClub`; kurucu otomatik üye; ad üniversite başına tekil) |
| `clubs/{clubId}/members/{uid}` | `joinedAt` | Kulübü okuyabilen | K (yalnızca kendi `uid`; katıl/ayrıl) |
| `clubNames/{sha256(universityId:normalizedName)[0:40]}` | `clubId`, `universityId`, `createdAt` | Hiç kimse (istemci) | S — kulüp adı kilidi (NFKC, `tr-TR` küçük harf; boşluk ve sık ayraçlar (nokta, virgül, noktalı virgül, iki nokta, ünlem, soru işareti, tırnaklar, parantezler, tire, alt çizgi, bölü, ters bölü, dikey çizgi) tek boşluğa indirgenir; `C++` ile `C#` farklı kalır) |
| `events/{eventId}` | `title` (3–80), `description` (≤ 1000), `location` (2–80), `startsAt` (Timestamp; en erken 15 dk, en geç 180 gün sonra), `endsAt` (Timestamp \| `null`; en fazla 72 saat), `universityId`, `visibility`, `organizerUid`, `attendeeCount` (S), `createdAt`. Kimlik istemcinin ürettiği UUID | Doğrulanmış + görünürlük | S (`v1-createEvent`; düzenleyen otomatik katılımcı) |
| `events/{eventId}/attendees/{uid}` | `joinedAt` | Etkinliği okuyabilen | K (yalnızca kendi `uid`; katılım etkinlik başlamadan, `startsAt > request.time`; geri alma her zaman) |
| `conversations/{conversationId}` | `participants[2]`, `lastMessage{text, senderUid, at}` (S), `unreadCounts{uid: n}` (S), `createdAt`, `updatedAt` (S; oluşturmada da yazılır, liste sıralaması) | Katılımcılar (doğrulanmış) | S (başlatma callable'ı, Faz 10) |
| `conversations/{id}/messages/{messageId}` | `senderUid`, `text`, `createdAt` | Katılımcılar | K oluşturma: katılımcı, doğrulanmış, tam 2 katılımcı, iki yönde engel yok, alıcının `userPrivate.messaging.allowFrom` tercihi (`everyone` veya aynı üniversite için `campus`); düzenleme/silme yok |
| `notifications/{uid}/items/{notificationId}` | `type`, `payload{…}`, `read`, `createdAt`. Eşleşme bildirimi: kimlik `match_{needId}`, `type: "need-match"`, `payload{needId, title, score}`. İlgi bildirimi: kimlik `interest_{needId}_{uid}`, `type: "need-interest"`, `payload{needId, title, fromUid}`; ilgi geri alınınca silinir | Sahibi | S oluşturma; sahibi yalnızca `read: true` yapar |
| `blocks/{uid}/blocked/{targetUid}` | `createdAt` | Sahibi | K (kendisi için; kendini engelleyemez) |
| `reports/{sha256(reporterUid:targetKey)[0:40]}` | `reporterUid`, `reporterUniversityId`, `targetType` (`post`/`comment`/`club`/`event`/`need`), `targetPath`, `targetKey` (sha256(targetPath@hedefin oluşturulma zamanı) — aynı hedefin raporlarını gruplamak için; aynı yolda yeniden oluşturulan içerik ayrı hedeftir), `targetOwnerUid`, `targetUniversityId` (içerik sahibinin üniversitesi; yorumda `authorUniversityId`), `reason` (enum), `details` (≤ 500, kişisel bilgi maskelenir), `snapshot{title, text, visibility, createdAt}` (bildirim anındaki içerik, maskesiz), `status` (`open`/`resolved`/`dismissed`), `createdAt` | Moderatör | **S** — `v1-reportContent` hedefin varlığını ve raporlayanın görebildiğini doğrular, anlık görüntü alır; kullanıcı-hedef başına tek rapor |
| `moderationLogs/{logId}` | `action`, `actorUid`, `targetUid`, `targetRef`, `reason`, `createdAt` | Moderatör | S |
| `config/{doc}` (ör. `config/matching`) | `config/matching` (isteğe bağlı): `version`, `weights{…}`, `minScore`, `maxMatches`, `maxCandidates`, `neutralReliability`, `categoryTerms{kategori: terimler[]}`; eksik alanlar varsayılandan tamamlanır (D-058). Kotalar Firebase params'ta (D-047) | **Hiç kimse (istemci)** | S |
| `dataExports/{uid}/jobs/{jobId}` | `status`, `storagePath`, `expiresAt`, `createdAt` | Sahibi | S |
| `rateLimits/{key}` | `needs_{uid}_{gün}`: `drafts`, `aiParses`, `publishes`; `aiTokens_{gün}_{0-9}`: `tokens` (parçalı günlük bütçe); `community_{uid}_{gün}`: `clubs`, `events`, `reports`; hepsinde `expiresAt` (+48 saat). Gün = Europe/Istanbul | Hiç kimse | S |
| `counterEvents/{sha256(eventId)[0:40]}` | `expiresAt` (+6 saat; tetikleyici en fazla 1 saat yeniden denenir) — sayaç tetikleyicisinin işlediği olayın işareti (tekrar teslimde çift sayımı önler) | Hiç kimse | S |

## 3. Taslak modelden sapmalar

| Konu | Taslak | Kesin | Gerekçe |
|---|---|---|---|
| Gönderi görünürlüğü | `universityId \| null` | `universityId` her zaman + `visibility` | İlan, kulüp ve etkinlikle aynı kalıp; Rules ve indeksler tek tip (D-039) |
| `verificationRequests` oluşturma | K | S | Dosya içeriği yalnızca sunucuda doğrulanabilir (D-033) |
| `userPrivate` e-posta | Var | Yok | Veri minimizasyonu (D-029) |
| Kulüp/etkinlik oluşturan | `createdBy` | `founderUid` / `organizerUid` | Rolü açık adlandırma (D-073) |
| Etkinliğin kulübü | `clubId?` | Yok (ertelendi) | Kulüp yönetimi (yöneticiler, kulüp etkinliği) henüz kapsamda değil (S-34) |
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
| `reports` | `status` ↑, `createdAt` ↑ | Moderatör rapor kuyruğu (en eski önce) |

Sorgular Rules'u kanıtlayabilmek için her zaman görünürlük filtresi içerir (`universityId == benim` veya `visibility == "global"`).
