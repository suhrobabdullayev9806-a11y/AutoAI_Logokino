# AutoAI Logokino (MiniStudio)

Telegram Mini App: **AI mini serial (haqiqiy MP4 + ovoz)**, rasm va logotip studiyasi.
Bot — launcher va kassir. Barcha Sozlamalar, narxlar, AI kalitlari va karta to‘lovi **admin panel**dan boshqariladi.

---

## Nima ishlaydi

- Telegram Mini App (mobil-first, 9:16) + demo rejim (brauzerda sinash uchun)
- **3 vizual tur:** Multfilm, Odamli (realistik), Anime
- Serial: g‘oya → AI ssenariy → kadrlar → AI ovoz → **FFmpeg bilan haqiqiy MP4**
- Har bir epizod alohida MP4 + butun serial uchun `full.mp4`, subtitrlar kadrga yozilgan
- Ovoz: **Gemini TTS** (Google AI Studio) yoki bepul **Edge TTS** (o‘zbek ovozi)
- Rasmlar: **Gemini image** → Pollinations → lokal namuna (zaxira)
- Rasm studiyasi: 5 uslub, 3 format, 1 yoki 4 variant
- Kutubxona, kredit tizimi, job progress, xato bo‘lsa avtomatik refund
- To‘lov: **demo**, **Telegram Stars**, **karta (qo‘lda tasdiqlash)**
- Admin panel: AI kalit/model/render, narxlar, paketlar, karta, buyurtmalar, userlar, joblar

---

## Lokal ishga tushirish

```bash
npm install
copy .env.example .env
npm run build
npm start
```

- MiniApp va API: http://localhost:8787
- Dev rejim: `npm run dev` (web 5173, API 8787)

`.env` (minimal):

```
PORT=8787
BOT_TOKEN=...
BOT_USERNAME=Sunnexai_bot
ADMIN_IDS=8606829795,6816038229
PUBLIC_URL=
ENABLE_BOT=false
ALLOW_DEMO=true
SESSION_SECRET=uzun-tasodifiy-matn
```

`data/db.json` o‘chirilsa, demo ishlar va default sozlamalar qayta yaratiladi.

---

## Google AI Studio (Gemini) kalitini olish

1. https://aistudio.google.com ga Google akkaunt bilan kiring.
2. Chap pastda **Get API key** → **Create API key**.
3. Loyiha tanlang (yoki yangi yarating) va kalitni nusxalang (`AIza...`).
4. MiniApp → **Profil → Admin panel → AI Studio**.
5. Kalitni **Gemini API key** maydoniga qo‘ying → **Saqlash**.
6. **AI ulanishni test qilish** tugmasini bosing — “Ulanish ishlaydi ✅” chiqishi kerak.

Admin panelda tanlanadi:

| Bo‘lim | Variantlar |
|---|---|
| Ssenariy | Auto (Gemini → demo shablon), faqat Gemini, demo |
| Rasm | Auto (Gemini → Pollinations → lokal), Gemini, Pollinations, lokal |
| Ovoz | Auto (Gemini → Edge), Gemini TTS, Edge TTS |
| Video | FFmpeg MP4 (ishlaydi), Veo (kelajakda) |

Model nomlari ham shu yerda o‘zgartiriladi. Kalit faqat serverda saqlanadi va API javobida maskalanadi.

> Gemini API bepul kvotasi bor, lekin video/ovoz uchun limit tez tugashi mumkin. Google Cloud billing ulansa limit oshadi.

---

## Admin panel

Faqat `ADMIN_IDS` dagi Telegram ID’lar kira oladi:

- `8606829795`
- `6816038229`

Bo‘limlar:

- **AI Studio** — Gemini kaliti, provayderlar, modellar, ovozlar, render o‘lchami/FPS, ulanish testi
- **Narxlar** — serial/rasm/logotip krediti, epizod va kadr limiti, paketlar (kredit, Stars, so‘m)
- **To‘lov** — demo/Stars/karta rejimi, qabul qiluvchi karta (Humo/UzCard avtomatik aniqlanadi), amal muddati, avtomatik tasdiqlash, yo‘riqnoma, buyurtmalar navbati
- **Userlar** — kredit qo‘shish/ayirish, bloklash
- **Joblar** — render jarayoni, xatolar

Karta oqimi: foydalanuvchi paketni tanlaydi → karta va summa ko‘rsatiladi → bank ilovasida o‘tkazadi → chekdagi to‘lov kodini kiritadi → admin tasdiqlaydi (yoki `autoApprove` yoqilgan bo‘lsa darhol qo‘shiladi). **Foydalanuvchining karta raqami, CVV yoki OTP kodi hech qachon so‘ralmaydi.**

---

## Render’ga deploy

### 1-usul — Blueprint (qo‘lda)

1. Kodni GitHub repo’ga yuklang.
2. Render Dashboard → **New → Blueprint** → repo tanlang.
3. `render.yaml` avtomatik o‘qiladi.
4. Env’larni kiriting:
   - `BOT_TOKEN` — BotFather’dan **yangi** token
   - `BOT_USERNAME` — bot username
   - `PUBLIC_URL` — deploy URL (masalan `https://autoai-logokino.onrender.com`)
   - `ENABLE_BOT=true`
   - `ADMIN_IDS=8606829795,6816038229`
   - `ALLOW_DEMO=true`
   - `SESSION_SECRET` — Render `generateValue: true` qiladi
5. Deploy tugagach URL’ni `PUBLIC_URL`ga yozib qayta deploy qiling.
6. BotFather → bot → **Bot Settings → Menu Button → Web App URL** (yoki bot o‘zi `setChatMenuButton` qiladi).

### 2-usul — Render API key bilan (men deploy qilaman)

**Render API key olish:**

1. https://dashboard.render.com ga kiring.
2. Yuqori o‘ng burchakdagi avatar → **Account Settings**.
3. Chap menyuda **API Keys**.
4. **Create API Key** → nom bering (masalan `opencode-deploy`).
5. Kalitni nusxalang (`rnd_...`) — u faqat bir marta ko‘rinadi.

Keyin menga yuboring. Menga yana **GitHub repo manzili** kerak (kod shu repo’ga push qilinishi kerak), masalan:

```
https://github.com/suxrob/autoai-logokino
```

Agar repo’ga push huquqi kerak bo‘lsa — GitHub **Personal Access Token** (repo scope) bering yoki repo’ni public qilib, men API orqali deploy qilaman.

Render API bilan nima qilaman:

1. `POST https://api.render.com/v1/services` — web service yarataman (Node, `npm install && npm run build`, start `npm start`).
2. Env o‘zgaruvchilarni qo‘shaman.
3. Deploy boshlanadi va loglarni tekshiraman.
4. URL’ni `PUBLIC_URL`ga yozib qayta deploy qilaman.
5. MiniApp’ni Telegram’da tekshiraman.

> **Muhim:** Render free plan 15 daqiqa harakatsizlikdan keyin uxlaydi. Bot polling ham to‘xtaydi. Doimiy ishlash uchun Starter plan yoki tashqi keep-alive kerak. Render disk — ephemeral: `data/generated` MP4’lar qayta deployda o‘chadi. Doimiy saqlash uchun Render Disk yoki S3 kerak.

---

## To‘lov haqida ogohlantirish

Karta raqami, amal muddati va SMS/OTP kodini MiniApp ichida yig‘ish xavfsiz va qonuniy emas. Shu loyihada faqat **qabul qiluvchi admin kartasi** ko‘rsatiladi va foydalanuvchi **bank chekidagi to‘lov kodini** kiritadi. Merchant API (Payme/Click/Uzum) keyingi bosqichda ulanadi.

---

## Texnologiyalar

- Frontend: React 19 + Vite 6 + custom CSS
- Backend: Node.js + Express
- AI: Google AI Studio / Gemini (matn, rasm, TTS) + Edge TTS fallback
- Video: FFmpeg (`ffmpeg-static`) + `ffprobe-static`
- Auth: Telegram `initData` HMAC + JWT
- Storage: JSON (`data/db.json`)
- Bot: Telegram Bot API (long polling)
- Deploy: Render (`render.yaml`)

## Xavfsizlik

- `.env` git’ga tushmasin.
- Chatda ko‘rsatilgan bot tokenini BotFather orqali **revoke** qiling.
- Gemini/Render kalitlarini chatda uzoq saqlamang — testdan keyin yangilang.
- Foydalanuvchi kartasi/OTP’sini hech qachon saqlamang.
