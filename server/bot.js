import { PACKAGE_MAP } from './packages.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const botStatus = {
  running: false,
  startedAt: null,
  lastPollAt: null,
  lastUpdateAt: null,
  lastError: null
};

async function tgCall(token, method, payload = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(40000)
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`${method}: ${data.description || res.status}`);
  return data.result;
}

export async function createStarsInvoiceLink({ botToken, pkg, packageId, userId }) {
  const pack = pkg || PACKAGE_MAP[packageId];
  if (!pack) throw new Error('Tarif topilmadi');
  return tgCall(botToken, 'createInvoiceLink', {
    title: `AutoAI Logokino — ${pack.credits} kredit`,
    description: `${pack.title}: ${pack.note}`,
    payload: `credits:${pack.credits}:${userId}:${pack.id}`,
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: `${pack.credits} kredit`, amount: pack.stars }]
  });
}

function normalizeUrl(url) {
  return String(url || '').replace(/\/$/, '');
}

function appKeyboard(publicUrl, isAdmin = false) {
  const base = normalizeUrl(publicUrl);
  if (!base) return undefined;
  const rows = [[{ text: "🎬 MiniApp'ni ochish", web_app: { url: base } }]];
  if (isAdmin) {
    rows.push([{ text: '🎛 Admin panel', web_app: { url: `${base}?screen=admin` } }]);
  }
  return { inline_keyboard: rows };
}

function adminKeyboard(publicUrl) {
  const base = normalizeUrl(publicUrl);
  if (!base) return undefined;
  return {
    inline_keyboard: [
      [{ text: '🎛 Admin panelni ochish', web_app: { url: `${base}?screen=admin` } }],
      [{ text: '🎬 MiniApp', web_app: { url: base } }],
      [
        { text: '📊 Statistika', callback_data: 'stats' },
        { text: '🔄 Yangilash', callback_data: 'stats' }
      ]
    ]
  };
}

function statsText(s) {
  return (
    `📊 AutoAI Logokino statistikasi\n\n` +
    `👥 Foydalanuvchilar: ${s.users}\n` +
    `🎬 Ishlar: ${s.works}\n` +
    `   • serial: ${s.serials}\n` +
    `   • rasm: ${s.images}\n` +
    `⚡ Sarflangan kredit: ${s.creditsSpent}\n` +
    `💳 To'lovlar: ${s.payments} ta\n` +
    `⭐ Stars: ${s.stars}\n` +
    `🕓 Kutilayotgan karta to'lovlari: ${s.pendingOrders || 0}`
  );
}

function welcomeText(firstName, isAdmin) {
  return (
    `🎬 AutoAI Logokino\n\n` +
    `Salom, ${firstName || "do'stim"}! 👋\n\n` +
    `AI yordamida yaratamiz:\n` +
    `• 🎞 Mini serial — haqiqiy MP4 + ovoz\n` +
    `• 🖼 Rasm — 1 yoki 4 variant\n` +
    `• 🎨 Logotip va brand-kit\n\n` +
    `Pastdagi tugma orqali MiniApp'ga kiring.\n` +
    `Hisobingiz shaxsiy Telegram akkauntingizga bog'lanadi.` +
    (isAdmin ? `\n\n🛡 Siz adminsiz — admin panel tugmasi ham mavjud.` : '')
  );
}

export async function startBot({ botToken, botUsername, publicUrl, adminIds, store, getPackage, packages }) {
  const base = normalizeUrl(publicUrl);
  const packageMap = Object.fromEntries((packages || []).map((p) => [p.id, p]));
  const findPackage = (id) => (typeof getPackage === 'function' ? getPackage(id) : packageMap[id] || PACKAGE_MAP[id]);
  const isAdmin = (id) => adminIds.map(String).includes(String(id));

  let botReady = false;
  for (let attempt = 1; attempt <= 20 && !botReady; attempt += 1) {
    try {
      const me = await tgCall(botToken, 'getMe');
      console.log(`[bot] @${me.username} ulandi`);
      await tgCall(botToken, 'setMyCommands', {
        commands: [
          { command: 'start', description: "MiniApp'ni ochish" },
          { command: 'app', description: "MiniApp'ni qayta ochish" },
          { command: 'admin', description: 'Admin panel (faqat adminlar)' },
          { command: 'help', description: 'Yordam' }
        ]
      }).catch(() => {});
      if (base) {
        await tgCall(botToken, 'setChatMenuButton', {
          menu_button: { type: 'web_app', text: 'AutoAI', web_app: { url: base } }
        }).catch(() => {});
      }
      botReady = true;
    } catch (err) {
      console.error(`[bot] ishga tushmadi (urinish ${attempt}/20):`, err.message);
      await sleep(5000);
    }
  }
  if (!botReady) return;
  botStatus.running = true;
  botStatus.startedAt = new Date().toISOString();
  botStatus.lastError = null;

  const sendWelcome = async (chatId, firstName, userId, payload = '') => {
    const admin = isAdmin(userId);
    let text = welcomeText(firstName, admin);
    if (payload === 'admin' && admin) {
      text = `🛡 Admin rejimi yoqildi.\n\n` + text;
    }
    await tgCall(botToken, 'sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: appKeyboard(base, admin)
    }).catch((err) => console.error('[bot] sendWelcome:', err.message));
  };

  const sendAdminPanel = async (chatId) => {
    const s = store.stats();
    await tgCall(botToken, 'sendMessage', {
      chat_id: chatId,
      text:
        `🛡 ADMIN MARKAZI\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `${statsText(s)}\n\n` +
        `Quyidagi tugmalar orqali boshqaring 👇`,
      reply_markup: adminKeyboard(base)
    }).catch((err) => console.error('[bot] sendAdminPanel:', err.message));
  };

  const sendInvoice = async (chatId, pkg) => {
    await tgCall(botToken, 'sendInvoice', {
      chat_id: chatId,
      title: `AutoAI Logokino — ${pkg.credits} kredit`,
      description: `${pkg.title}: ${pkg.note}`,
      payload: `credits:${pkg.credits}:0:${pkg.id}`,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: `${pkg.credits} kredit`, amount: pkg.stars }]
    }).catch((err) => console.error('[bot] sendInvoice:', err.message));
  };

  let offset = 0;
  while (true) {
    try {
      botStatus.lastPollAt = new Date().toISOString();
      const updates = await tgCall(botToken, 'getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query', 'pre_checkout_query']
      });
      botStatus.lastError = null;
      for (const update of updates) {
        offset = update.update_id + 1;
        botStatus.lastUpdateAt = new Date().toISOString();
        try {
          if (update.pre_checkout_query) {
            await tgCall(botToken, 'answerPreCheckoutQuery', {
              pre_checkout_query_id: update.pre_checkout_query.id,
              ok: true
            });
            continue;
          }

          if (update.callback_query) {
            const cq = update.callback_query;
            const userId = String(cq.from?.id || '');
            const chatId = cq.message?.chat?.id;
            if (cq.data === 'stats' && isAdmin(userId)) {
              await tgCall(botToken, 'answerCallbackQuery', {
                callback_query_id: cq.id,
                text: 'Statistika yangilandi ✅'
              }).catch(() => {});
              await sendAdminPanel(chatId);
            } else {
              await tgCall(botToken, 'answerCallbackQuery', {
                callback_query_id: cq.id,
                text: isAdmin(userId) ? 'OK' : 'Faqat adminlar uchun'
              }).catch(() => {});
            }
            continue;
          }

          const msg = update.message;
          if (!msg) continue;
          const chatId = msg.chat.id;
          const userId = String(msg.from?.id || chatId);
          const text = msg.text || '';

          if (msg.successful_payment) {
            const payload = msg.successful_payment.invoice_payload || '';
            const [, creditsRaw, payloadUserId, pkgId] = payload.split(':');
            const credits = Number(creditsRaw);
            const targetId = payloadUserId && payloadUserId !== '0' ? payloadUserId : userId;
            const pkg = findPackage(pkgId);
            if (credits > 0) {
              store.addCredits(targetId, credits);
              store.recordPayment({
                userId: targetId,
                credits,
                stars: msg.successful_payment.total_amount || pkg?.stars || 0,
                currency: msg.successful_payment.currency || 'XTR',
                packageId: pkgId || '',
                source: 'stars'
              });
              await tgCall(botToken, 'sendMessage', {
                chat_id: chatId,
                text: `✅ To'lov qabul qilindi. Hisobingizga ${credits} kredit qo'shildi.`
              }).catch(() => {});
            }
            continue;
          }

          if (text.startsWith('/start')) {
            const payload = text.split(' ')[1] || '';
            if (payload.startsWith('buy_')) {
              const pkg = findPackage(payload.replace('buy_', ''));
              if (pkg) {
                await sendInvoice(chatId, pkg);
                continue;
              }
            }
            if (payload === 'admin' && isAdmin(userId)) {
              await sendAdminPanel(chatId);
              continue;
            }
            await sendWelcome(chatId, msg.from?.first_name, userId, payload);
            continue;
          }

          if (text.startsWith('/app')) {
            await sendWelcome(chatId, msg.from?.first_name, userId);
            continue;
          }

          if (text.startsWith('/admin')) {
            if (isAdmin(userId)) {
              await sendAdminPanel(chatId);
            } else {
              await tgCall(botToken, 'sendMessage', {
                chat_id: chatId,
                text:
                  `⛔ Bu bo'lim faqat adminlar uchun.\n\n` +
                  `MiniApp'ga kirish uchun /start buyrug'ini bosing.`,
                reply_markup: appKeyboard(base, false)
              }).catch(() => {});
            }
            continue;
          }

          if (text.startsWith('/stats')) {
            if (isAdmin(userId)) {
              await sendAdminPanel(chatId);
            } else {
              await tgCall(botToken, 'sendMessage', {
                chat_id: chatId,
                text: `⛔ Statistika faqat adminlar uchun.`
              }).catch(() => {});
            }
            continue;
          }

          if (text.startsWith('/help')) {
            await tgCall(botToken, 'sendMessage', {
              chat_id: chatId,
              text:
                `AutoAI Logokino yordam:\n\n` +
                `1. /start — MiniApp'ni ochish\n` +
                `2. MiniApp ichida "Serial" yoki "Rasm" bo'limini tanlang\n` +
                `3. Kreditlar Telegram Stars yoki admin sozlagan karta orqali xarid qilinadi\n` +
                `4. /admin — admin panel (faqat adminlar)\n\n` +
                `Savollar: @${botUsername || 'Sunnexai_bot'}`,
              reply_markup: appKeyboard(base, isAdmin(userId))
            }).catch(() => {});
            continue;
          }
        } catch (inner) {
          console.error('[bot] update xatosi:', inner.message);
        }
      }
    } catch (err) {
      botStatus.lastError = err.message;
      console.error('[bot] polling xatosi:', err.message);
      await sleep(3000);
    }
  }
}

export { tgCall };
