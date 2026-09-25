# KampüsAğı — Kişisel Veri İşleme Envanteri

> **TASLAK — İSKELET. HUKUKİ İNCELEME GEREKLİ.**
> Bu belge hukuk danışmanı onayı olmadan kesin kabul edilmez ve yasal metinlere kaynak olarak "yayında" sayılmaz.
> Faz 0'da açıldı; her yeni kişisel veri alanında güncellenir; Faz 11'de tamamlanır. Son güncelleme: 2026-09-25

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
| Öğrenci belgesi | e-Devlet öğrenci belgesi PDF'i (içeriği Faz 4'te netleşir; kimlik numarası içermesi beklenir) | Öğrenci doğrulaması | BELİRSİZ | BELİRSİZ (red sonrası / onay sonrası ayrı ayrı) | Firebase Storage (Google); moderatör | Süre sonunda ve hesap silmede silinir |
| Profil | İlgi alanları, beceriler, bio, fotoğraf | Eşleşme, profil | BELİRSİZ | BELİRSİZ | Firebase (Google) | Hesap silmede silinir |
| Kullanıcı içeriği | İhtiyaç ilanları, gönderiler, yorumlar | Platform işlevi | BELİRSİZ | BELİRSİZ | Firebase (Google) | Anonimleştirme kapsamı BELİRSİZ (S-18) |
| İhtiyaç metni → Claude | Ham ihtiyaç metni (PII maskelenmiş) | Metni yapılandırma | BELİRSİZ | Anthropic tarafı saklama koşulları BELİRSİZ | **Anthropic (yurt dışı; `inference_geo` yalnızca `us`/`global`)** | Kaynak metin `needs` belgesinde; silme politikası BELİRSİZ |
| Mesajlar | Mesaj metni, zaman | Mesajlaşma | BELİRSİZ | BELİRSİZ | Firebase (Google) | BELİRSİZ (karşı tarafın kopyası sorusu) |
| Eşleşme / itibar | Skor, gerekçe, itibar puanı | Eşleşme | BELİRSİZ | BELİRSİZ | Firebase (Google) | Hesap silmede silinir |
| Moderasyon | Raporlar, kararlar, denetim kayıtları | Güvenlik, denetim | BELİRSİZ | BELİRSİZ | Firebase (Google) | Denetim izi saklama kuralı BELİRSİZ |
| Teknik | Oturum token'ları, App Check, sunucu log'ları (PII'siz) | Güvenlik, hata ayıklama | BELİRSİZ | BELİRSİZ | Firebase / Google Cloud | Log saklama süresi BELİRSİZ |
| Analitik / çerez | BELİRSİZ (S-20) | BELİRSİZ | Açık rıza (varsayım, doğrulanacak) | BELİRSİZ | BELİRSİZ | Rıza geri alınınca durur |

## 3. Veri akışları

1. Kayıt → Firebase Auth → `users` / `userPrivate`
2. Belge yükleme → Storage `verification/{uid}/…` → moderatör incelemesi → karar (`verificationRequests`)
3. İhtiyaç metni → `parseNeed` → PII maskeleme → Anthropic API → şema doğrulama → `needs`
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
