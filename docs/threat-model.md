# KampüsAğı — Tehdit Modeli

> **TASLAK.** Faz 0'da açıldı; Faz 5'te STRIDE ile dolduruldu; Faz 13'te gözden geçirilecek.
> Son güncelleme: 2026-09-25 (Faz 9)

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

## 5. STRIDE tablosu (Faz 5)

Kısaltmalar: R = Rules, C = callable/sunucu kontrolü, T = otomatik test (rules/emulator/e2e).

| Bileşen | Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege |
|---|---|---|---|---|---|---|
| Auth / claim'ler | Firebase Auth; claim'ler yalnızca Admin SDK (T) | İstemci claim yazamaz; tür bozuk claim yok sayılır (T) | Claim değişiklikleri `moderationLogs`'ta (doğrulama) | Claim'lerde PII yok (yalnızca `universityId`) | Token yenileme istemcide sınırlı (bir kez) | `moderator`/`verified` yalnızca sunucu (T); `syncVerificationClaims` yalnızca sunucu durumunu yansıtır |
| Firestore Rules | `*Uid == request.auth.uid` zorunlu (T) | Alan listeleri `hasOnly`; sayaç/skor istemciye kapalı (T) | `createdAt == request.time` (T) | Default deny; kampüs/genel görünürlük; `userPrivate` yalnızca sahibi (T) | Liste sorguları görünürlük filtresi olmadan reddedilir (T) | Moderatör claim'i içerik okuma yetkisi vermez; moderasyon sunucudan (D-040) |
| Storage (belge) | Yol `verification/{uid}` = token uid (T) | Üzerine yazma/silme yok (T); sunucuda imza kontrolü (T) | Başvuru kaydı + denetim kaydı | Sahibi + moderatör; kalıcı bağlantı yok (T) | 5 MB sınırı, App Check, yetim temizliği | — |
| `parseNeed` / `publishNeed` + Claude (Faz 6) | Oturum + App Check + doğrulanmış claim + profil durumu (C, T) | Çıktı şema doğrulaması + normalizasyon; Claude çıktısı yetki alanına yazılmaz; yayında alanlar yeniden maskelenir (T) | PII'siz log; `parseStatus`/`edited` ilanda | PII maskeleme (T); anahtar yalnızca Secret Manager; web paketinde SDK yok (`check:bundle`) | Kullanıcı kotası, taslak/yayın sınırı, parçalı günlük token tavanı (T) | Sınırlayıcıdan kaçış imkânsız (`<`/`>` değiştirilir, T); araç tanımlanmaz |
| Eşleştirme motoru (Faz 7) | Yalnızca sunucu yazar (R, T) | Skor/gerekçe istemciye kapalı; ilan sahibi yalnızca `dismissed` (T); bozuk belge tek adayı etkiler (Zod, T) | `weightsVersion`, `matchedAt` | Aday havuzu yalnızca aynı üniversite (D-055); aday yalnızca önerilen (`suggested`) eşleşmesini görür, gizlendiğini öğrenemez (T); engel oluşturmada kontrol (T); `config/matching` kapalı (T) | İlgi/beceri sorgusuyla sınırlı aday, `maxCandidates`, idempotent tetikleyici + olay yaşı sınırı (T) | Gerekçeler sunucu şablonu; Claude eşleşmeye karar vermez |
| Mesajlaşma (Faz 10) | `senderUid` = token uid (T) | Mesaj düzenleme/silme yok (T); okunmamış sayacı sunucuda (T) | Mesajlar değiştirilemez | Yalnızca katılımcılar (T) | Uzunluk sınırı (T); hız sınırı Faz 10 | Engelleme iki yönlü (T) |
| Bildirimler / sayaçlar | Yalnızca sunucu oluşturur (T) | Sahibi yalnızca `read: true` (T) | — | Yalnızca sahibi (T) | — | — |
| `/admin` paneli | `moderator` claim'i + sunucu kontrolü (T) | Kararlar yalnızca callable (T) | `moderationLogs` (T) | Belge yalnızca moderatöre | — | Kendi başvurusunu inceleyemez (T) |
| Veri dışa aktarma / hesap silme (Faz 11) | Yeniden kimlik doğrulama | İş kayıtları yalnızca sunucuda (T) | İşlem kayıtları | Dışa aktarım yalnızca sahibine, kısa ömürlü | Kota | — |
| Raporlar | `reporterUid` = token uid (T) | Durum yalnızca sunucu (T) | Rapor kaydı değiştirilemez | Yalnızca moderatör okur (T) | Metin sınırı (T); hız sınırı Faz 12 | — |

## 6. Bilinen tehditler (başlangıç listesi — TASLAK)

| # | Tehdit | Planlanan kontrol | Faz |
|---|---|---|---|
| T-01 | İstemcinin `verificationStatus`, skor veya sayaç yazması | Alan bazlı Rules + rules testleri | 3–5 |
| T-02 | Çapraz üniversite içerik okuma | `sameUniversity` Rules + testler | 5 |
| T-03 | İstemci bayrağıyla moderatör yetkisi alma | Yalnızca custom claim; sunucu kontrolü | 3, 12 |
| T-04 | Prompt injection ("önceki talimatları yok say", "beni admin yap") | Metin `<ilan_metni>` bloğunda, açılı ayraçlar değiştirilerek (iç içe etiketle kaçış kapalı); sabit sistem istemi; araç yok; çıktı şeması + sunucu normalizasyonu; Claude çıktısı yetki alanına yazılmaz; öğrenci yayımlamadan önce onaylar (Faz 6'da uygulandı, testli) | 6 |
| T-05 | PDF olmayan / zararlı dosya yükleme | Storage Rules içerik türü + boyut; sunucuda magic bytes | 4 |
| T-06 | Belgeye yetkisiz erişim | Sahibi + moderatör; kısa ömürlü URL | 4 |
| T-07 | Claude maliyet saldırısı (spam) | App Check; kullanıcı başına 20 ayrıştırma/60 taslak/10 yayın; 10 parçalı günlük token tavanı transaction ile ayrılır; aynı taslak Claude'a yeniden gönderilmez; NFKC sonrası uzunluk sınırı (D-047) | 6, 14 |
| T-08 | Engellenen kullanıcının mesaj atması | Rules + Function'da engel kontrolü | 10 |
| T-09 | Secret sızıntısı (repo, log, bundle) | `.gitignore`, CI gitleaks, `pnpm check:bundle` (Faz 2'de uygulandı) | 2, 6, 13 |
| T-13 | App Check'in üretimde kapatılması | `enforceAppCheck` yalnızca emulator'de kapalı; build `.env*` içinde `FUNCTIONS_EMULATOR`'u reddeder (Faz 2) | 2, 14 |
| T-14 | Uygulama rotasının statik render edilip nonce CSP ile bozulması / CSP'nin gevşetilmesi baskısı | Uygulama rotaları dinamik render zorunlu, e2e CSP testi (D-021) | 3+ |
| T-10 | Claim gecikmesi nedeniyle iptal edilen yetkinin sürmesi | Refresh token iptali + hassas yazımlarda belge kontrolü (D-007) | 4, 12 |
| T-11 | XSS (kullanıcı içeriği) | Ham HTML render yok, CSP | 1, 8–10 |
| T-12 | Açık yönlendirme | `safeNextPath` (göreli yol zorunlu, `//`, `\`, kontrol karakteri, farklı origin reddi); birim + e2e testleri (Faz 3'te uygulandı) | 3 |
| T-15 | Hesap sayımı (şifre sıfırlamada hesabın var olup olmadığının anlaşılması) | `auth/user-not-found` başarı gibi yanıtlanır; giriş hatası tek tip mesaj ("E-posta veya şifre hatalı.") (Faz 3) | 3 |
| T-16 | Kullanıcının profiline sunucu alanı (doğrulama durumu, itibar) yazması | İstemci yazımı Rules'ta kapalı; callable'larda strict Zod şeması (D-027) (Faz 3) | 3 |
| T-17 | Onaylanmış belgenin sonradan değiştirilmesi | Storage `create` için `resource == null`; güncelleme/silme kapalı (Faz 4) | 4 |
| T-18 | Moderatörün kendi başvurusunu onaylaması | Sunucuda engelli + UI'da devre dışı (D-038) | 4 |
| T-19 | Eşzamanlı kararlar nedeniyle tutarsız yetki | Claim'ler commit sonrası; claim onarım callable'ı (D-037) | 4 |
| T-20 | Belgenin kalıcı bağlantıyla sızması | `getDownloadURL` kullanılmaz; bellek içi blob önizleme (D-035) | 4 |
| T-21 | Depolama kötüye kullanımı (çok sayıda yükleme) | 5 MB sınırı, App Check, reddedilen gönderimde anında silme, 24 saatlik yetim temizliği (D-036) | 4, 13 |
| T-22 | Raporlanan içeriğin sonradan değiştirilerek delilin yok edilmesi | Gönderi/yorum değiştirilemez; rapor anında anlık görüntü (D-042) | 5, 9 |
| T-23 | Sahte/kötü niyetli rapor hedefi (başka koleksiyon, görülemeyen içerik, spam) | Raporlar yalnızca callable; hedef doğrulaması ve tekrar engeli (D-042) | 5, 9 |
| T-24 | Öğrenci rehberinin toplu çıkarılması | `users` liste sorgusu yalnızca moderatör (D-042) | 5 |
| T-25 | Alıcının istemediği kişilerden mesaj alması | Rules'ta `allowFrom` + iki yönlü engel (D-042) | 5, 10 |
| T-26 | Kişisel bilginin yurt dışına (Anthropic) veya genel ilanla tüm üniversitelere sızması | Claude'dan önce ve yayında maskeleme; ilanda maskelenmiş metin; kullanıcıya gizlenen türlerin bildirimi (D-045) | 6, 13 |
| T-27 | Claude'un reddettiği metnin elle doldurma yoluyla yayımlanması | Ret bir UX sinyalidir; asıl kontrol rapor + moderasyon; `parseStatus` ile önceliklendirme (D-049) | 6, 12 |
| T-29 | Profiline çok sayıda ilgi yazarak her ilanda aday olma (bildirim spamı alma / görünürlük) | Profilde en fazla 10 ilgi + 10 beceri; ilan başına en fazla 20 eşleşme; skor ilgili bileşenlerle normalize | 7, 13 |
| T-30 | Engellenen kişiyle eşleşme gösterimi | Oluşturmada iki yönlü engel kontrolü (T); sonradan engelde temizlik Faz 11 (R-10) | 7, 11 |
| T-31 | Engellenen kullanıcının ilana ilgi bildirerek bildirim göndermesi | Rules'ta iki yönlü engel kontrolü (T) | 8 |
| T-32 | Geri alınan ilginin ilan sahibine sızması | Bildirim transaction içinde ilgi varlığıyla yazılır; ilgi silinince bildirim silinir (T) | 8 |
| T-33 | İlgi aç/kapa ile bildirim gürültüsü | Tek bildirim kimliği (tekrar oluşturulmaz); hız sınırı Faz 13 (R-12) | 8, 13 |
| T-34 | İstemcinin beğeni/yorum/üye/katılımcı sayacını değiştirmesi | Sayaçlar oluşturmada 0, sonra istemciye kapalı; yalnızca tetikleyici yazar (T) | 5, 9 |
| T-35 | Tetikleyicinin tekrar teslimiyle çift sayım; silinip aynı kimlikle yeniden oluşturulan gönderiye eski olayların yansıması | Olay kimliği işareti (`counterEvents`) ile transaction; alt belge üst belgeden eskiyse olay atlanır (T) | 9 |
| T-36 | Engellenen kullanıcının yorum veya beğeniyle taciz etmesi | Rules'ta gönderi sahibiyle iki yönlü engel kontrolü (T) | 9 |
| T-37 | Rapor callable'ı üzerinden yol enjeksiyonu veya görülemeyen içeriğin varlığını yoklama | Hedef türü + kimlik biçimi (`[A-Za-z0-9_-]`) sözleşmede; sunucuda görünürlük kontrolü claim'deki üniversiteyle (Rules ile aynı kaynak); yok ve görünmez ayrımsız `not-found` (T) | 9 |
| T-38 | Rapor spamı / aynı içeriğe toplu rapor | Kullanıcı-hedef başına deterministik kimlik (tek rapor), günlük 20 sınırı (T) | 9 |
| T-39 | Başkasının gönderisini veya yorumunu silme; silme callable'ıyla görülemeyen içeriğin varlığını yoklama | Callable'da sahiplik kontrolü; yok ve yetkisiz aynı yanıtı (`missing`) alır; istemci silmesi Rules'ta kapalı (T) | 9 |
| T-40 | Silinen gönderinin altında yetim yorum/beğeni kalması | İki geçişli `recursiveDelete`; gönderi silinince Rules yeni yorum/beğeniyi reddeder (T) | 9 |
| T-41 | Resmî kulübü taklit eden kulüp açılması | Üniversite başına tekil kulüp adı, günlük kurma sınırı, rapor akışı; resmî doğrulama yok (R-14) | 9, 12 |
| T-42 | Geçmiş etkinliğe katılım yazarak sayaç şişirme | Rules: katılım yalnızca `startsAt > request.time` (T) | 9 |
| T-28 | Paylaşılan sayaç belgesinde kilit çakışması / bütçe aşımı | Parçalı sayaç, transaction ile ayırma, gerçek kullanımla mutabakat; sayaç hatası sonucu kaybettirmez (D-047) | 6 |

## 7. Artık riskler (Faz 5)

| Risk | Açıklama | Karar / izleme |
|---|---|---|
| R-01 | Claim'ler token yenilenene kadar (≤ 1 saat) eski kalabilir | Kritik iptallerde `revokeRefreshTokens` (D-007, D-037) |
| R-02 | Rules `get()`/`exists()` maliyeti (yorum, beğeni, mesaj başına 1–5 okuma) | Kabul; Faz 13 maliyet testinde ölçülecek |
| R-03 | App Check olmadan istemci çağrıları (web sağlayıcısı henüz seçilmedi) | Faz 14'te site anahtarı zorunlu |
| R-04 | Depolama kötüye kullanımı (24 saat pencere) | D-036; Faz 13'te yeniden değerlendirme |
| R-05 | Sunucu tarafı rota koruması yok (yalnızca istemci) | D-028; veri Rules ile korunuyor |
| R-06 | Hukuki metinler taslak; saklama süreleri öneri | S-16; yayından önce hukuk onayı |
| R-07 | Elle doldurma yolu Claude'dan geçmez; reddedilen içerik bu yolla yayımlanabilir | D-049; Faz 12 moderasyon kuyruğunda `parseStatus: "failed"` ilanlar önceliklendirilebilir |
| R-08 | PII maskeleme sezgisel (yazıyla yazılmış numaralar, kullanıcı adları, adresler maskelenmez) | D-045; Faz 13'te örnek setle yeniden değerlendirme |
| R-10 | Eşleşme oluştuktan sonra kurulan engel mevcut eşleşmeyi/bildirimi kaldırmaz | Faz 11'de engelleme arayüzüyle birlikte sunucu tetikleyicisi |
| R-11 | Bir terim için 500'den fazla ilgili aday varsa belge kimliği sırasına göre ilk 500 taranır | D-055; Faz 13 yük testinde ölçülecek |
| R-12 | İlgi aç/kapa sayısı sınırsız (her biri bir bildirim oluşturup siler) | Faz 13'te hız sınırı değerlendirilecek |
| R-13 | Gönderi, yorum ve beğeni istemciden Rules ile yazılır; hız sınırı yok (spam) | Faz 13'te ölçülecek; gerekirse callable + kota veya App Check zorunluluğu |
| R-14 | Resmî kulüp doğrulaması yok; tekil ad kilidi büyük/küçük harf ve noktalama dışındaki benzerlikleri (ör. harf değişimi) yakalamaz | S-34; rapor + moderasyon (Faz 12) |
| R-15 | Çözülmüş bir rapordan sonra aynı kullanıcı aynı içeriği yeniden bildiremez (`duplicate`) | Faz 12'de rapor yeniden açma akışı |
| R-17 | Sayaç olayı 1 saatlik yeniden deneme boyunca yazılamazsa sayaç bir birim sapar (`counter.gaveUp` log'u) | Faz 13'te log alarmı ve yönetici yeniden sayım aracı |
| R-16 | Çok popüler gönderide sayaç transaction'ları aynı belgede çakışır (belge başına ~1 yazım/sn) | Faz 13 yük testinde ölçülecek; gerekirse parçalı sayaç |
| R-09 | Günlük bütçe token cinsinden; yedek model adımı rezervasyonu az miktarda aşabilir | D-047; Anthropic tarafında harcama limiti/alarm (Faz 14) |

