# KampüsAğı Web

Bu repoda çalışmaya başlamadan önce sırayla oku ve uygula:

1. `AI_Guidelines.md` — bağlayıcı çalışma, güvenlik, KVKK, Claude API ve test kuralları.
2. `memory-bank/Memory_Bank.md` — güncel faz, kararlar, Active/Missing Skills, açık sorular.
3. `project-goals.md` — kapsam, faz planı ve belirsizlikler.

Kısa özet (ayrıntı `AI_Guidelines.md` §3):
- Kullanıcıyla ve dokümanlarda Türkçe; kod tanımlayıcıları İngilizce.
- Claude yalnızca Cloud Functions'tan çağrılır; tarayıcıda Anthropic izi olmaz.
- Yetki yalnızca Firebase Auth custom claim'den gelir; skor, sayaç, doğrulama durumu ve bildirimler yalnızca sunucuda yazılır (tek istisna: bildirim sahibi yalnızca `read: true` işaretleyebilir).
- Hiçbir sır repoya, log'a veya dokümana yazılmaz.
- Her faz sonunda Memory Bank güncellenir ve sonraki faz için onay istenir.

Sık kullanılan komutlar (kök dizinde): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:bundle`, `pnpm test:rules`, `pnpm test:emulator`; e2e için `pnpm --filter @kampusagi/web test:e2e` (önce build; bu ortamda `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`).
