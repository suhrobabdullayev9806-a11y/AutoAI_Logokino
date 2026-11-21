import crypto from 'node:crypto';

/**
 * Telegram WebApp initData tekshiruvi.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Bot API 8.0 dan boshlab initData ichida `signature` maydoni ham keladi.
 * Turli Telegram mijozlari hashni signature bilan yoki signaturesiz hisoblashi
 * mumkin, shuning uchun ikkala variantni ham qabul qilamiz. Qo'shimcha ravishda
 * Telegram'ning Ed25519 public key'i orqali uchinchi tomon tekshiruvi ham
 * qo'llab-quvvatlanadi.
 */

const TELEGRAM_PUBLIC_KEY =
  'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d';

function sortedEntries(params, skip = []) {
  const skipSet = new Set(skip);
  return [...params.entries()]
    .filter(([key]) => !skipSet.has(key))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

function buildCheckString(params, skip) {
  return sortedEntries(params, skip)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

function hmacDigest(botToken, dataCheckString) {
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  return crypto.createHmac('sha256', secretKey).update(dataCheckString).digest();
}

function safeEqualHex(computed, received) {
  const hex = String(received || '');
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length !== 64) return false;
  const a = Buffer.from(computed);
  const b = Buffer.from(hex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyEd25519(botId, params) {
  const signature = params.get('signature');
  if (!signature || !botId) return false;
  try {
    const dataCheckString =
      `${botId}:WebAppData\n` + buildCheckString(params, ['hash', 'signature']);
    const normalized = signature.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const signatureBuffer = Buffer.from(padded, 'base64');
    if (signatureBuffer.length !== 64) return false;
    const der = Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(TELEGRAM_PUBLIC_KEY, 'hex')
    ]);
    const publicKey = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
    return crypto.verify(
      null,
      Buffer.from(dataCheckString, 'utf8'),
      publicKey,
      signatureBuffer
    );
  } catch {
    return false;
  }
}

export function validateInitData(initData, botToken, maxAgeSeconds = 86400) {
  if (!initData || typeof initData !== 'string') throw new Error('initData yo‘q');
  const token = String(botToken || '').trim();
  if (!token) throw new Error('BOT_TOKEN sozlanmagan');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash && !params.get('signature')) throw new Error('hash yo‘q');

  const botId = token.split(':')[0] || '';
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hmac = (skip) =>
    crypto.createHmac('sha256', secret).update(buildCheckString(params, skip)).digest();

  const matchesWithSignature = hash ? safeEqualHex(hmac(['hash']), hash) : false;
  const matchesWithoutSignature = hash ? safeEqualHex(hmac(['hash', 'signature']), hash) : false;
  const matchesEd25519 = verifyEd25519(botId, params);

  if (!matchesWithSignature && !matchesWithoutSignature && !matchesEd25519) {
    let userId = null;
    try {
      userId = JSON.parse(params.get('user') || 'null')?.id || null;
    } catch {
      userId = null;
    }
    console.warn(
      '[auth] initData tekshiruvi muvaffaqiyatsiz:',
      JSON.stringify({
        botId,
        hasHash: Boolean(hash),
        hasSignature: params.has('signature'),
        withSignature: matchesWithSignature,
        withoutSignature: matchesWithoutSignature,
        ed25519: matchesEd25519,
        authDate: params.get('auth_date') || null,
        userId,
        keys: [...new Set(params.keys())].sort()
      })
    );
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
