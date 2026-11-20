import { PACKAGE_MAP } from './packages.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    title: `MiniStudio — ${pack.credits} kredit`,
    description: `${pack.title}: ${pack.note}`,
    payload: `credits:${pack.credits}:${userId}:${pack.id}`,
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: `${pack.credits} kredit`, amount: pack.stars }]
  });
}

function appKeyboard(publicUrl) {
  if (!publicUrl) return undefined;
  return {
    inline_keyboard: [[{ text: '🎬 MiniStudio’ni ochish', web_app: { url: publicUrl } }]]
  };
}

export async function startBot({ botToken, botUsername, publicUrl, adminIds, store, getPackage, packages }) {
  const menu = appKeyboard(publicUrl);
  const packageMap = Object.fromEntries((packages || []).map((p) => [p.id, p]));
  const findPackage = (id) => (typeof getPackage === 'function' ? getPackage(id) : packageMap[id] || PACKAGE_MAP[id]);

  try {
    const me = await tgCall(botToken, 'getMe');
    console.log(`[bot] @${me.username} ulandi`);
    await tgCall(botToken, 'setMyCommands', {
      commands: [
        { command: 'start', description: 'MiniStudio’ni ochish' },
        { command: 'app', description: 'MiniApp’ni qayta ochish' },
        { command: 'help', description: 'Yordam' }
      ]
    }).catch(() => {});
    if (publicUrl) {
      await tgCall(botToken, 'setChatMenuButton', {
        menu_button: { type: 'web_app', text: 'MiniStudio', web_app: { url: publicUrl } }
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[bot] ishga tushmadi:', err.message);
    return;
  }

  const sendWelcome = async (chatId, firstName = 'do‘stim') => {
    await tgCall(botToken, 'sendMessage', {
      chat_id: chatId,
      text:
        `Salom, ${firstName}! 👋\n\n` +
        `MiniStudio — AI yordamida ovozli mini serial, rasm va logotip yaratadigan studiya.\n\n` +
        `Pastdagi tugma orqali MiniApp’ni oching.`,
      reply_markup: menu
    }).catch((err) => console.error('[bot] sendWelcome:', err.message));
  };

  const sendInvoice = async (chatId, pkg) => {
    await tgCall(botToken, 'sendInvoice', {
      chat_id: chatId,
      title: `MiniStudio — ${pkg.credits} kredit`,
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
      const updates = await tgCall(botToken, 'getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message', 'pre_checkout_query']
      });
      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          if (update.pre_checkout_query) {
            await tgCall(botToken, 'answerPreCheckoutQuery', {
              pre_checkout_query_id: update.pre_checkout_query.id,
              ok: true
            });
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
                text: `✅ To‘lov qabul qilindi. Hisobingizga ${credits} kredit qo‘shildi.`
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
            await sendWelcome(chatId, msg.from?.first_name || 'do‘stim');
            continue;
          }

          if (text.startsWith('/app')) {
            await sendWelcome(chatId, msg.from?.first_name || 'do‘stim');
            continue;
          }

          if (text.startsWith('/stats') && adminIds.includes(userId)) {
            const s = store.stats();
            await tgCall(botToken, 'sendMessage', {
              chat_id: chatId,
              text:
                `📊 MiniStudio statistikasi\n\n` +
                `Foydalanuvchilar: ${s.users}\n` +
                `Ishlar: ${s.works} (serial: ${s.serials}, rasm: ${s.images})\n` +
                `Sarflangan kredit: ${s.creditsSpent}\n` +
                `To‘lovlar: ${s.payments} ta, ${s.stars} Stars\n` +
                `Karta buyurtmalari: ${s.pendingOrders || 0} ta kutilmoqda`
            }).catch(() => {});
            continue;
          }

          if (text.startsWith('/help')) {
            await tgCall(botToken, 'sendMessage', {
              chat_id: chatId,
              text:
                `MiniStudio yordam:\n\n` +
                `1. /start — MiniApp’ni ochish\n` +
                `2. MiniApp ichida “Serial” yoki “Rasm” bo‘limini tanlang\n` +
                `3. Kreditlar Telegram Stars yoki admin sozlagan karta orqali xarid qilinadi\n\n` +
                `Savollar: @${botUsername || 'Sunnexai_bot'}`
            }).catch(() => {});
          }
        } catch (inner) {
          console.error('[bot] update xatosi:', inner.message);
        }
      }
    } catch (err) {
      console.error('[bot] polling xatosi:', err.message);
      await sleep(3000);
    }
  }
}

export { tgCall };
