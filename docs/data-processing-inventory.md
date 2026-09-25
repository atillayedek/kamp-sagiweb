# KampüsAğı — Kişisel Veri İşleme Envanteri

> **TASLAK — İSKELET. HUKUKİ İNCELEME GEREKLİ.**
> Bu belge hukuk danışmanı onayı olmadan kesin kabul edilmez ve yasal metinlere kaynak olarak "yayında" sayılmaz.
> Faz 0'da açıldı; her yeni kişisel veri alanında güncellenir; Faz 11'de tamamlanır. Son güncelleme: 2026-09-25 (Faz 6)

## 1. Genel bilgiler

| Alan | Değer |
|---|---|
| Veri sorumlusu | BELİRSİZ (S-16) |
| VERBİS kayıt durumu | BELİRSİZ (S-16) |
| Firebase bölgesi | BELİRSİZ (S-17) |
| Yurt dışı aktarım yöntemi | BELİRSİZ — hukuki değerlendirme (S-16, S-28) |

## 2. Veri kategorileri

| Kategori | Veri | Amaç | Hukuki sebep | Saklama süresi | Alıcılar / aktarım | Silme / anonimleştirme |
|---|---|---|---|---|---|---|
| Kimlik / iletişim | E-posta, görünen ad | Hesap, iletişim | BELİRSİZ | BELİRSİZ | Firebase (Google) | Hesap silmede silinir |
| Öğrenim | Üniversite, bölüm | Kampüs izolasyonu, eşleşme | BELİRSİZ | BELİRSİZ | Firebase (Google) | Hesap silmede silinir |
| Öğrenci belgesi | e-Devlet öğrenci belgesi PDF'i (`verification/{uid}/{requestId}.pdf`; kimlik numarası içermesi beklenir) | Öğrenci doğrulaması | BELİRSİZ | ÖNERİ: karardan 30 gün sonra; başvuruya dönüşmeyen yükleme 24 saat (D-034) — hukuk onayı bekliyor | Firebase Storage (Google); yalnızca inceleyen moderatör (kalıcı bağlantı üretilmez) | Günlük iş siler; hesap silmede anında (Faz 11) |
| Doğrulama kaydı | Başvuru durumu, üniversite, karar, ret sebebi (enum) ve moderatör notu, inceleyen moderatör kimliği, zamanlar | Doğrulama süreci ve denetim | BELİRSİZ | BELİRSİZ (belge silindikten sonra kayıt kalır) | Firebase (Google); ret sebebi yalnızca sahibine (`userPrivate`) | Hesap silmede anonimleştirme kararı Faz 11 |
| Denetim kaydı | Moderatör işlemleri (`moderationLogs`: işlem, moderatör, hedef kullanıcı, sebep, zaman) | Güvenlik ve hesap verebilirlik | BELİRSİZ | BELİRSİZ | Firebase (Google); yalnızca moderatörler | Hesap silmede anonimleştirme kararı Faz 11 |
| Profil | İlgi alanları, beceriler, bio, fotoğraf | Eşleşme, profil | BELİRSİZ | BELİRSİZ | Firebase (Google) | Hesap silmede silinir |
| Kullanıcı içeriği | İhtiyaç ilanları (maskelenmiş metin + yapılandırılmış alanlar + görünürlük), gönderiler, yorumlar | Platform işlevi | BELİRSİZ | BELİRSİZ | Firebase (Google); genel ilanlar tüm doğrulanmış öğrencilere açık | Anonimleştirme kapsamı BELİRSİZ (S-18) |
| İhtiyaç metni → Claude | İhtiyaç metni; gönderilmeden önce e-posta, telefon, TCKN, IBAN ve ≥ 16 haneli hesap/kart numaraları maskelenir (D-045); sunucu tarihi ve saat dilimi | Metni ilan alanlarına dönüştürme önerisi (öğrenci her alanı yayımlamadan önce görür ve düzenler; otomatik karar yok) | BELİRSİZ | Anthropic tarafı saklama koşulları BELİRSİZ (S-16) | **Anthropic (yurt dışı; `inference_geo` yalnızca `us`/`global`)** | Bizde ham (maskelenmemiş) metin saklanmaz |
| İhtiyaç taslağı | Maskelenmiş metin, gizlenen bilgi türleri, Claude önerisi, güven değeri, model adı, kullanıcı kimliği (`needDrafts`) | Önizleme, idempotency, yayına hazırlık | BELİRSİZ | 24 saat (`expiresAt`); günlük temizlik işi + Firestore TTL (Faz 14) — ÖNERİ | Firebase (Google); istemciye kapalı | Süre dolunca silinir; hesap silmede anında (Faz 11) |
| Kullanım sayaçları | Kullanıcı kimliği (belge adında), günlük taslak/ayrıştırma/yayın sayıları; kimliksiz günlük token toplamı (`rateLimits`) | Kötüye kullanım ve maliyet sınırı | BELİRSİZ | 48 saat (`expiresAt`) — ÖNERİ | Firebase (Google); istemciye kapalı | Süre dolunca silinir |
| Mesajlar | Mesaj metni, zaman | Mesajlaşma | BELİRSİZ | BELİRSİZ | Firebase (Google) | BELİRSİZ (karşı tarafın kopyası sorusu) |
| Eşleşme / itibar | Skor, gerekçe, itibar puanı | Eşleşme | BELİRSİZ | BELİRSİZ | Firebase (Google) | Hesap silmede silinir |
| Moderasyon | Raporlar, kararlar, denetim kayıtları | Güvenlik, denetim | BELİRSİZ | BELİRSİZ | Firebase (Google) | Denetim izi saklama kuralı BELİRSİZ |
| Teknik | Oturum token'ları, App Check, sunucu log'ları (PII'siz) | Güvenlik, hata ayıklama | BELİRSİZ | BELİRSİZ | Firebase / Google Cloud | Log saklama süresi BELİRSİZ |
| Analitik / çerez | BELİRSİZ (S-20) | BELİRSİZ | Açık rıza (varsayım, doğrulanacak) | BELİRSİZ | BELİRSİZ | Rıza geri alınınca durur |

## 3. Veri akışları

1. Kayıt → Firebase Auth → `users` / `userPrivate`
2. Belge yükleme → Storage `verification/{uid}/…` → moderatör incelemesi → karar (`verificationRequests`)
3. İhtiyaç metni → `v1-parseNeed` → temizleme + PII maskeleme → kota/bütçe → Anthropic API → şema doğrulama + normalizasyon → `needDrafts` (24 saat) → öğrenci önizler/düzenler → `v1-publishNeed` (yeniden maskeleme) → `needs`
4. Eşleştirme → `needs/{id}/matches` → `notifications`
5. Mesajlaşma → `conversations/{id}/messages`
6. Veri dışa aktarma → `dataExports` → kısa ömürlü indirme bağlantısı → süre sonunda silme
7. Hesap silme → belge silme + kişisel veri silme + içerik anonimleştirme

## 4. İlgili hak talepleri

Verilerimi indir, Hesabımı sil, Görünürlük ayarları, Mesajlaşma ayarları, Engellenen kullanıcılar (Faz 11).

## 5. Hukuki incelemeye gidecek sorular

- Veri sorumlusu kimliği ve VERBİS yükümlülüğü.
- Google (Firebase) ve Anthropic'e yurt dışı aktarımın dayanağı ve usulü (KVKK md. 9; güncel usul hukuk danışmanıyla doğrulanacak).
- Öğrenci belgesinin hangi alanları içerdiği ve kategori değerlendirmesi.
- Her kategori için saklama süreleri.
- Hesap silmede anonimleştirme kapsamı ve mesajların karşı taraftaki kopyası.
- 18 yaş altı kullanıcılar (S-19).
