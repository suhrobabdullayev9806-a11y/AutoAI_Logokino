import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateInitData } from './auth.js';
import { PACKAGES } from './packages.js';
import { buildSeries, pollinationsUrl } from './story.js';
import { seedDemo } from './seed.js';
import { createStarsInvoiceLink, startBot, tgCall } from './bot.js';
import { generateScript, testGemini } from './ai.js';
import { renderImages, renderSerial, GENERATED_ROOT } from './render.js';
import {
  addCredits,
  addWork,
  allUsers,
  createOrder,
  ensureUser,
  getOrder,
  getSettings,
  getWorks,
  getUser,
  listOrders,
  listPayments,
  recordPayment,
  resetSettings,
  saveSettings,
  spendCredits,
  stats,
  updateOrder,
  updateUser
} from './store.js';
import {
  adminSettingsView,
  detectCardNetwork,
  normalizeCardNumber,
  publicSettings
} from './settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT || 8787);
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const BOT_USERNAME = process.env.BOT_USERNAME || 'Sunnexai_bot';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ALLOW_DEMO = process.env.ALLOW_DEMO !== 'false';
const ENABLE_BOT = process.env.ENABLE_BOT === 'true';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(24).toString('hex');
const DEMO_ID = process.env.DEMO_USER_ID || '8606829795';

seedDemo();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/media/generated', express.static(GENERATED_ROOT, { maxAge: '1h', fallthrough: true }));

function isAdminId(id) {
  return ADMIN_IDS.includes(String(id));
}

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    photoUrl: user.photoUrl,
    credits: user.credits,
    demo: Boolean(user.demo),
    blocked: Boolean(user.blocked),
    isAdmin: isAdminId(user.id),
    createdAt: user.createdAt
  };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Avtorizatsiya kerak' });
  try {
    const payload = jwt.verify(token, SESSION_SECRET);
    const user = getUser(payload.id);
    if (!user) throw new Error('Foydalanuvchi topilmadi');
    if (user.blocked) return res.status(403).json({ error: 'Hisob bloklangan' });
    req.user = user;
    req.session = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Sessiya eskirgan. Qayta kiring.' });
  }
}

function requireAdmin(req, res, next) {
  if (!isAdminId(req.user.id)) return res.status(403).json({ error: 'Faqat admin uchun' });
  next();
}

function getPackages() {
  return getSettings().packages?.length ? getSettings().packages : PACKAGES;
}

function getPackage(packageId) {
  return getPackages().find((p) => p.id === packageId) || null;
}

function getCosts() {
  return getSettings().costs || { serial: 150, image: 5, logo: 40 };
}

/* ------------------------------- jobs ---------------------------------- */

const jobs = new Map();

const JOB_STAGES = {
  serial: [
    { label: 'Ssenariy Google AI Studio’da yozilmoqda' },
    { label: 'Kadrlar generatsiya qilinmoqda' },
    { label: 'Ovoz sintez qilinmoqda' },
    { label: 'MP4 video render qilinmoqda' },
    { label: 'Yakunlanmoqda' }
  ],
  image: [
    { label: 'Navbatda' },
    { label: 'Prompt tayyorlanmoqda' },
    { label: 'Rasm chizilmoqda' },
    { label: 'Yakunlanmoqda' }
  ]
};

function newJobId() {
  return `job_${crypto.randomBytes(6).toString('hex')}`;
}

function createJob({ userId, type, work, cost, input }) {
  const id = newJobId();
  const job = {
    id,
    userId: String(userId),
    type,
    work,
    input,
    cost,
    status: 'running',
    progress: 2,
    stageIndex: 0,
    stage: JOB_STAGES[type][0].label,
    error: '',
    createdAt: Date.now(),
    finishedAt: null,
    finalized: false
  };
  jobs.set(id, job);
  return job;
}

function setJobProgress(job, progress, stageIndex, stage) {
  job.progress = Math.max(0, Math.min(100, Math.round(progress)));
  job.stageIndex = Math.max(0, Math.min(JOB_STAGES[job.type].length - 1, stageIndex));
  job.stage = stage || JOB_STAGES[job.type][job.stageIndex]?.label || '';
}

function jobView(job) {
  const done = job.status === 'done';
  const failed = job.status === 'error';
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: failed ? Math.min(99, job.progress) : done ? 100 : Math.max(2, job.progress),
    stageIndex: job.stageIndex,
    stage: failed ? 'Xatolik' : job.stage,
    error: job.error || '',
    stages: JOB_STAGES[job.type].map((s, i) => ({
      label: s.label,
      done: done || i < job.stageIndex,
      active: !done && !failed && i === job.stageIndex
    })),
    result: done ? job.work : null,
    cost: job.cost,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt
  };
}

function finishJob(job) {
  if (job.finalized) return;
  job.finalized = true;
  job.status = 'done';
  job.progress = 100;
  job.stageIndex = JOB_STAGES[job.type].length - 1;
  job.stage = 'Tayyor';
  job.finishedAt = Date.now();
  addWork(job.work);
}

function failJob(job, err) {
  console.error(`[job ${job.id}] xato:`, err?.message || err);
  job.status = 'error';
  job.error = err?.message || 'Render xatosi';
  job.finishedAt = Date.now();
  try {
    addCredits(job.userId, job.cost);
    recordPayment({
      userId: job.userId,
      credits: job.cost,
      stars: 0,
      source: 'refund',
      note: `Job ${job.id} xatosi uchun qaytarildi`
    });
  } catch {
    /* ignore */
  }
}

async function runSerialJob(job) {
  try {
    setJobProgress(job, 4, 0, 'Ssenariy Google AI Studio’da yozilmoqda');
    const settings = getSettings();
    const story = await generateScript(job.input, settings);
    Object.assign(job.work, {
      title: story.title,
      prompt: story.logline,
      poster: story.poster,
      posterFallback: story.posterFallback,
      story,
      provider: story.provider,
      aiWarning: story.aiWarning || ''
    });
    setJobProgress(job, 10, 1, 'Kadrlar generatsiya qilinmoqda');
    await renderSerial({
      work: job.work,
      settings,
      onProgress: (progress, stageIndex, stage) => setJobProgress(job, progress, stageIndex, stage)
    });
    finishJob(job);
  } catch (err) {
    failJob(job, err);
  }
}

async function runImageJob(job) {
  try {
    setJobProgress(job, 6, 1, 'Prompt tayyorlanmoqda');
    const settings = getSettings();
    await renderImages({
      work: job.work,
      settings,
      onProgress: (progress, stageIndex, stage) => setJobProgress(job, progress, stageIndex, stage)
    });
    finishJob(job);
  } catch (err) {
    failJob(job, err);
  }
}

/* ------------------------------- image --------------------------------- */

const IMAGE_STYLE_PROMPTS = {
  cinematic: 'cinematic film still, dramatic lighting, ultra detailed',
  anime: 'anime key visual, vibrant colors, detailed line art',
  '3d': 'stylized 3D render, soft studio lighting, high detail',
  comic: 'comic book illustration, bold ink lines, halftone texture',
  minimal: 'minimalist graphic design, clean shapes, premium poster'
};

const RATIO_SIZES = {
  '9:16': [720, 1280],
  '1:1': [1024, 1024],
  '16:9': [1280, 720]
};

const FALLBACK_IMAGES = [
  '/media/abstract.jpg',
  '/media/desert.jpg',
  '/media/style-real.jpg',
  '/media/style-comic.jpg',
  '/media/frame-1.jpg',
  '/media/frame-6.jpg'
];

function buildImages({ prompt, style, ratio, count }) {
  const stylePrompt = IMAGE_STYLE_PROMPTS[style] || IMAGE_STYLE_PROMPTS.cinematic;
  const [width, height] = RATIO_SIZES[ratio] || RATIO_SIZES['9:16'];
  const seed = crypto.randomBytes(3).readUIntBE(0, 3);
  const total = count === 4 ? 4 : 1;
  return Array.from({ length: total }, (_, i) => {
    const variation = total > 1 ? `, variation ${i + 1}, different composition` : '';
    const fullPrompt = `${stylePrompt}, ${prompt}${variation}, high quality, detailed`;
    return {
      url: '',
      remoteUrl: pollinationsUrl(fullPrompt, seed + i * 13, width, height),
      fallback: FALLBACK_IMAGES[(seed + i) % FALLBACK_IMAGES.length],
      prompt: fullPrompt,
      ratio
    };
  });
}

/* ------------------------------- routes -------------------------------- */

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ministudio',
    ffmpeg: fs.existsSync(path.join(ROOT, 'node_modules', 'ffmpeg-static')),
    time: new Date().toISOString()
  });
});

app.get('/api/config', (_req, res) => {
  const settings = getSettings();
  res.json({
    appName: 'MiniStudio',
    botUsername: BOT_USERNAME,
    publicUrl: PUBLIC_URL,
    demoMode: ALLOW_DEMO,
    ...publicSettings(settings),
    textModel: settings.ai?.textModel || 'demo',
    version: '0.3.0'
  });
});

app.post('/api/auth', (req, res) => {
  const { initData } = req.body || {};
  let profile = null;
  let demo = false;

  if (initData) {
    try {
      const tgUser = validateInitData(initData, BOT_TOKEN);
      profile = {
        id: tgUser.id,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
        photoUrl: tgUser.photo_url
      };
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }
  } else if (ALLOW_DEMO) {
    demo = true;
    profile = {
      id: DEMO_ID,
      firstName: 'Suhrob',
      lastName: '',
      username: 'suhrob',
      credits: 300,
      demo: true
    };
  } else {
    return res.status(401).json({ error: 'Telegram ichida oching' });
  }

  const user = ensureUser(profile);
  if (user.blocked) return res.status(403).json({ error: 'Hisob bloklangan' });
  const token = jwt.sign({ id: user.id, demo }, SESSION_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(user), demo });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    user: publicUser(req.user),
    works: getWorks(req.user.id).slice(0, 40)
  });
});

app.get('/api/works', requireAuth, (req, res) => {
  res.json({ works: getWorks(req.user.id).slice(0, 40) });
});

app.post('/api/generate/serial', requireAuth, (req, res) => {
  const body = req.body || {};
  const idea = String(body.idea || '').trim().slice(0, 500);
  const cost = Number(getCosts().serial) || 150;
  const limits = getSettings().limits || {};

  if (idea.length > 0 && idea.length < 4) {
    return res.status(400).json({ error: 'G‘oya juda qisqa. Kamida 4 ta belgi yozing.' });
  }
  if (req.user.credits < cost) {
    return res.status(402).json({ error: 'Kredit yetarli emas', need: cost, credits: req.user.credits });
  }

  const episodeCount = Math.min(
    Math.max(1, Number(body.episodes) || 3),
    Number(limits.maxEpisodes) || 5
  );
  const input = {
    idea,
    genre: body.genre,
    style: body.style,
    episodes: episodeCount,
    duration: [30, 60, 90].includes(Number(body.duration)) ? Number(body.duration) : 60,
    voice: body.voice === 'male' ? 'male' : 'female',
    title: body.title
  };

  try {
    const fallback = buildSeries(input);
    const work = {
      id: `w_${crypto.randomBytes(6).toString('hex')}`,
      ownerId: String(req.user.id),
      type: 'serial',
      title: fallback.title,
      prompt: fallback.logline,
      poster: fallback.poster,
      posterFallback: fallback.posterFallback,
      story: fallback,
      provider: 'pending',
      createdAt: new Date().toISOString()
    };

    spendCredits(req.user.id, cost, 'serial');
    const job = createJob({ userId: req.user.id, type: 'serial', work, cost, input });
    setImmediate(() => runSerialJob(job));
    res.json({ job: jobView(job), user: publicUser(getUser(req.user.id)) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Serial yaratishda xatolik' });
  }
});

app.post('/api/generate/image', requireAuth, (req, res) => {
  const body = req.body || {};
  const prompt = String(body.prompt || '').trim().slice(0, 600);
  if (prompt.length < 3) return res.status(400).json({ error: 'Prompt juda qisqa' });

  const count = Number(body.count) === 4 ? 4 : 1;
  const cost = (Number(getCosts().image) || 5) * count;
  if (req.user.credits < cost) {
    return res.status(402).json({ error: 'Kredit yetarli emas', need: cost, credits: req.user.credits });
  }

  try {
    const ratio = RATIO_SIZES[body.ratio] ? body.ratio : '9:16';
    const images = buildImages({
      prompt,
      style: body.style || 'cinematic',
      ratio,
      count
    });
    const [width, height] = RATIO_SIZES[ratio];

    const work = {
      id: `w_${crypto.randomBytes(6).toString('hex')}`,
      ownerId: String(req.user.id),
      type: 'image',
      title: prompt.length > 42 ? `${prompt.slice(0, 42)}…` : prompt,
      prompt,
      poster: images[0].fallback,
      posterFallback: images[0].fallback,
      images,
      imageWidth: width,
      imageHeight: height,
      createdAt: new Date().toISOString()
    };

    spendCredits(req.user.id, cost, 'image');
    const job = createJob({ userId: req.user.id, type: 'image', work, cost, input: { prompt, count } });
    setImmediate(() => runImageJob(job));
    res.json({ job: jobView(job), user: publicUser(getUser(req.user.id)) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Rasm yaratishda xatolik' });
  }
});

app.get('/api/jobs/:id', requireAuth, (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job topilmadi' });
  if (String(job.userId) !== String(req.user.id) && !isAdminId(req.user.id)) {
    return res.status(403).json({ error: 'Ruxsat yo‘q' });
  }
  res.json({ job: jobView(job), user: publicUser(getUser(req.user.id)) });
});

/* ------------------------------- payments ------------------------------- */

function orderView(order) {
  if (!order) return null;
  return {
    id: order.id,
    packageId: order.packageId,
    credits: order.credits,
    amountUzs: order.amountUzs,
    stars: order.stars,
    method: order.method,
    status: order.status,
    code: order.code,
    paymentCode: order.paymentCode || '',
    card: order.card,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt
  };
}

function completeCardOrder(order, source = 'card') {
  if (order.status === 'paid') return order;
  const updated = updateOrder(order.id, { status: 'paid', paidAt: new Date().toISOString() });
  addCredits(order.userId, order.credits);
  recordPayment({
    userId: order.userId,
    credits: order.credits,
    stars: 0,
    amountUzs: order.amountUzs,
    packageId: order.packageId,
    orderId: order.id,
    source,
    note: order.paymentCode || order.code
  });
  if (BOT_TOKEN) {
    tgCall(BOT_TOKEN, 'sendMessage', {
      chat_id: order.userId,
      text: `✅ To‘lov tasdiqlandi. Hisobingizga ${order.credits} kredit qo‘shildi.\nBuyurtma: ${order.code}`
    }).catch(() => {});
  }
  return updated;
}

app.post('/api/topup/demo', requireAuth, (req, res) => {
  const settings = getSettings();
  if (!ALLOW_DEMO || settings.limits?.demoTopup === false) {
    return res.status(403).json({ error: 'Demo rejimi o‘chirilgan' });
  }
  const pkg = getPackage(req.body?.packageId);
  if (!pkg) return res.status(400).json({ error: 'Tarif topilmadi' });
  addCredits(req.user.id, pkg.credits);
  recordPayment({
    userId: String(req.user.id),
    credits: pkg.credits,
    stars: 0,
    packageId: pkg.id,
    source: 'demo'
  });
  res.json({ user: publicUser(getUser(req.user.id)) });
});

app.post('/api/payments/link', requireAuth, async (req, res) => {
  if (!BOT_TOKEN) return res.status(500).json({ error: 'BOT_TOKEN sozlanmagan' });
  const pkg = getPackage(req.body?.packageId);
  if (!pkg) return res.status(400).json({ error: 'Tarif topilmadi' });
  try {
    const url = await createStarsInvoiceLink({
      botToken: BOT_TOKEN,
      pkg,
      userId: req.user.id
    });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Invoice yaratishda xatolik' });
  }
});

app.post('/api/payments/order', requireAuth, (req, res) => {
  const settings = getSettings();
  if (settings.payment?.mode !== 'card') {
    return res.status(400).json({ error: 'Karta to‘lovi admin panelda yoqilmagan' });
  }
  const pkg = getPackage(req.body?.packageId);
  if (!pkg) return res.status(400).json({ error: 'Tarif topilmadi' });
  const cardNumber = String(settings.payment.cardNumber || '').replace(/\D/g, '');
  if (cardNumber.length < 16 || !settings.payment.cardHolder) {
    return res.status(400).json({ error: 'Admin karta ma’lumotlarini sozlamagan' });
  }

  const order = {
    id: `ord_${crypto.randomBytes(6).toString('hex')}`,
    userId: String(req.user.id),
    packageId: pkg.id,
    credits: pkg.credits,
    stars: pkg.stars || 0,
    amountUzs: Number(pkg.uzs) || 0,
    method: 'card',
    status: 'pending',
    code: `MS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    paymentCode: '',
    card: {
      number: settings.payment.cardNumber,
      holder: settings.payment.cardHolder,
      expiry: settings.payment.cardExpiry || '',
      network: detectCardNetwork(settings.payment.cardNumber)
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  createOrder(order);
  res.json({ order: orderView(order) });
});

app.post('/api/payments/confirm', requireAuth, (req, res) => {
  const { orderId, paymentCode } = req.body || {};
  const order = getOrder(String(orderId || ''));
  if (!order || String(order.userId) !== String(req.user.id)) {
    return res.status(404).json({ error: 'Buyurtma topilmadi' });
  }
  if (order.status === 'paid') {
    return res.json({ order: orderView(order), user: publicUser(getUser(req.user.id)) });
  }
  if (order.status === 'rejected') {
    return res.status(400).json({ error: 'Buyurtma rad etilgan' });
  }
  const code = String(paymentCode || '').trim().slice(0, 80);
  if (code.length < 4) return res.status(400).json({ error: 'To‘lov kodini kiriting (kamida 4 belgi)' });

  const settings = getSettings();
  const autoApprove = Boolean(settings.payment?.autoApprove);
  const updated = updateOrder(order.id, {
    paymentCode: code,
    status: 'review',
    reviewedAt: null
  });
  if (autoApprove) {
    completeCardOrder(updated, 'card-auto');
  } else if (BOT_TOKEN) {
    ADMIN_IDS.forEach((adminId) => {
      tgCall(BOT_TOKEN, 'sendMessage', {
        chat_id: adminId,
        text:
          `💳 Yangi to‘lov tekshiruvi\n\n` +
          `Foydalanuvchi: ${req.user.firstName} (${req.user.id})\n` +
          `Paket: ${order.packageId} · ${order.credits} kredit\n` +
          `Summa: ${order.amountUzs} so‘m\n` +
          `Kod: ${order.code}\n` +
          `To‘lov kodi: ${code}`
      }).catch(() => {});
    });
  }

  res.json({ order: orderView(getOrder(order.id)), user: publicUser(getUser(req.user.id)) });
});

app.get('/api/payments/order/:id', requireAuth, (req, res) => {
  const order = getOrder(req.params.id);
  if (!order || String(order.userId) !== String(req.user.id)) {
    return res.status(404).json({ error: 'Buyurtma topilmadi' });
  }
  res.json({ order: orderView(order) });
});

/* -------------------------------- admin --------------------------------- */

function jobSummary(job) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    title: job.work?.title || '',
    cost: job.cost,
    userId: job.userId,
    createdAt: job.createdAt,
    error: job.error || ''
  };
}

app.get('/api/admin/overview', requireAuth, requireAdmin, (_req, res) => {
  const settings = getSettings();
  res.json({
    stats: stats(),
    jobs: [...jobs.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 40)
      .map(jobSummary),
    users: allUsers()
      .sort((a, b) => (b.credits || 0) - (a.credits || 0))
      .map((u) => ({
        ...publicUser(u),
        works: getWorks(u.id).length
      })),
    orders: listOrders(40).map(orderView),
    payments: listPayments(20),
    settings: adminSettingsView(settings),
    env: {
      botEnabled: ENABLE_BOT,
      botConfigured: Boolean(BOT_TOKEN),
      publicUrl: PUBLIC_URL,
      allowDemo: ALLOW_DEMO,
      adminIds: ADMIN_IDS
    }
  });
});

app.get('/api/admin/settings', requireAuth, requireAdmin, (_req, res) => {
  res.json({ settings: adminSettingsView(getSettings()) });
});

app.put('/api/admin/settings', requireAuth, requireAdmin, (req, res) => {
  const body = req.body || {};
  const patch = JSON.parse(JSON.stringify(body));
  delete patch.updatedAt;

  if (patch.ai) {
    if (patch.ai.geminiApiKey === '' || String(patch.ai.geminiApiKey || '').includes('•')) {
      delete patch.ai.geminiApiKey;
    }
    if (patch.ai.clearGeminiKey) {
      patch.ai.geminiApiKey = '';
      delete patch.ai.clearGeminiKey;
    }
    for (const key of ['renderWidth', 'renderHeight', 'fps']) {
      if (patch.ai[key] !== undefined) patch.ai[key] = Number(patch.ai[key]) || 0;
    }
  }
  if (patch.costs) {
    for (const key of Object.keys(patch.costs)) {
      patch.costs[key] = Math.max(0, Number(patch.costs[key]) || 0);
    }
  }
  if (patch.payment) {
    if (patch.payment.cardNumber !== undefined) {
      patch.payment.cardNumber = normalizeCardNumber(patch.payment.cardNumber);
    }
    if (!['demo', 'stars', 'card'].includes(patch.payment.mode)) delete patch.payment.mode;
  }
  if (patch.packages && !Array.isArray(patch.packages)) delete patch.packages;

  const settings = saveSettings(patch);
  res.json({ settings: adminSettingsView(settings) });
});

app.post('/api/admin/settings/reset', requireAuth, requireAdmin, (req, res) => {
  if (!req.body?.resetSettings) {
    return res.status(400).json({ error: 'resetSettings kerak' });
  }
  res.json({ settings: adminSettingsView(resetSettings()) });
});

app.post('/api/admin/test-ai', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await testGemini(getSettings());
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/users/:id/credits', requireAuth, requireAdmin, (req, res) => {
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  const amount = Number(req.body?.amount) || 0;
  if (!amount) return res.status(400).json({ error: 'Summa kiriting' });
  addCredits(user.id, amount);
  recordPayment({
    userId: user.id,
    credits: amount,
    stars: 0,
    source: 'admin',
    note: String(req.body?.note || 'Admin tomonidan')
  });
  res.json({ user: publicUser(getUser(user.id)) });
});

app.post('/api/admin/users/:id/block', requireAuth, requireAdmin, (req, res) => {
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  if (String(user.id) === String(req.user.id)) {
    return res.status(400).json({ error: 'O‘zingizni bloklay olmaysiz' });
  }
  updateUser(user.id, { blocked: Boolean(req.body?.blocked) });
  res.json({ user: publicUser(getUser(user.id)) });
});

app.post('/api/admin/orders/:id/approve', requireAuth, requireAdmin, (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
  const updated = completeCardOrder(order, 'card-admin');
  res.json({ order: orderView(updated) });
});

app.post('/api/admin/orders/:id/reject', requireAuth, requireAdmin, (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
  const updated = updateOrder(order.id, { status: 'rejected', reviewedAt: new Date().toISOString() });
  res.json({ order: orderView(updated) });
});

/* ------------------------------ frontend ------------------------------- */

const DIST = path.join(ROOT, 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/media/generated')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[api] xato:', err);
  res.status(500).json({ error: 'Server xatosi' });
});

app.listen(PORT, () => {
  console.log(`MiniStudio API: http://localhost:${PORT}`);
  console.log(`Demo rejimi: ${ALLOW_DEMO ? 'yoqilgan' : 'o‘chirilgan'}`);
  if (ENABLE_BOT && BOT_TOKEN) {
    startBot({
      botToken: BOT_TOKEN,
      botUsername: BOT_USERNAME,
      publicUrl: PUBLIC_URL,
      adminIds: ADMIN_IDS,
      store: { addCredits, recordPayment, stats },
      getPackage
    }).catch((err) => console.error('[bot] fatal:', err.message));
  } else {
    console.log('[bot] o‘chirilgan (ENABLE_BOT=false)');
  }
});
