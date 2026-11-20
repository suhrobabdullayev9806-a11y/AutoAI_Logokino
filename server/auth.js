import crypto from 'node:crypto';

/**
 * Telegram WebApp initData tekshiruvi.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData, botToken, maxAgeSeconds = 86400) {
  if (!initData || typeof initData !== 'string') throw new Error('initData yo‘q');
  if (!botToken) throw new Error('BOT_TOKEN sozlanmagan');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('hash yo‘q');
  params.delete('hash');
  params.delete('signature');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('initData imzosi noto‘g‘ri');
  }

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    throw new Error('initData muddati o‘tgan');
  }

  let user = null;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    throw new Error('user ma’lumoti buzilgan');
  }
  if (!user?.id) throw new Error('user topilmadi');
  return user;
}

export function signSession(payload, secret, days = 30) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${JSON.stringify(payload)}.${Math.floor(Date.now() / 1000)}`)
    .digest('hex');
}
