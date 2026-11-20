import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS, deepMerge } from './settings.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function freshDb() {
  return {
    users: {},
    works: [],
    payments: [],
    orders: [],
    settings: deepMerge({}, DEFAULT_SETTINGS),
    stats: { creditsSpent: 0, serials: 0, images: 0 },
    createdAt: new Date().toISOString()
  };
}

function load() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const base = freshDb();
    return {
      ...base,
      ...parsed,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      works: Array.isArray(parsed.works) ? parsed.works : [],
      settings: deepMerge(base.settings, parsed.settings || {}),
      stats: { ...base.stats, ...(parsed.stats || {}) }
    };
  } catch {
    return freshDb();
  }
}

const db = load();
let saveTimer = null;

function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error('[store] saqlash xatosi:', err.message);
    }
  }, 120);
}

/* -------------------------------- users --------------------------------- */

export function ensureUser(profile) {
  const id = String(profile.id);
  if (!db.users[id]) {
    db.users[id] = {
      id,
      firstName: profile.firstName || 'Do‘stim',
      lastName: profile.lastName || '',
      username: profile.username || '',
      photoUrl: profile.photoUrl || '',
      credits: profile.credits ?? 300,
      demo: Boolean(profile.demo),
      blocked: false,
      createdAt: new Date().toISOString()
    };
    persist();
  } else {
    const user = db.users[id];
    if (profile.firstName) user.firstName = profile.firstName;
    if (profile.lastName) user.lastName = profile.lastName;
    if (profile.username) user.username = profile.username;
    if (profile.photoUrl) user.photoUrl = profile.photoUrl;
    persist();
  }
  return db.users[id];
}

export function getUser(id) {
  return db.users[String(id)] || null;
}

export function allUsers() {
  return Object.values(db.users);
}

export function updateUser(id, patch = {}) {
  const user = getUser(id);
  if (!user) return null;
  if (patch.firstName !== undefined) user.firstName = patch.firstName;
  if (patch.lastName !== undefined) user.lastName = patch.lastName;
  if (patch.username !== undefined) user.username = patch.username;
  if (patch.credits !== undefined) user.credits = Math.max(0, Number(patch.credits) || 0);
  if (patch.blocked !== undefined) user.blocked = Boolean(patch.blocked);
  persist();
  return user;
}

export function addCredits(userId, amount) {
  const user = getUser(userId);
  if (!user) return null;
  user.credits = Math.max(0, (user.credits || 0) + Number(amount || 0));
  persist();
  return user;
}

export function spendCredits(userId, amount, reason = 'generation') {
  const user = getUser(userId);
  if (!user) throw new Error('Foydalanuvchi topilmadi');
  if (user.credits < amount) throw new Error('Kredit yetarli emas');
  user.credits -= amount;
  db.stats.creditsSpent += amount;
  if (reason === 'serial') db.stats.serials += 1;
  if (reason === 'image') db.stats.images += 1;
  persist();
  return user;
}

/* -------------------------------- works --------------------------------- */

export function addWork(work) {
  const existing = db.works.findIndex((w) => w.id === work.id);
  if (existing >= 0) db.works[existing] = work;
  else db.works.unshift(work);
  if (db.works.length > 500) db.works.length = 500;
  persist();
  return work;
}

export function getWorks(userId) {
  return db.works.filter((w) => String(w.ownerId) === String(userId));
}

export function getWork(id) {
  return db.works.find((w) => w.id === id) || null;
}

export function allWorks() {
  return db.works;
}

/* ------------------------------- payments -------------------------------- */

export function recordPayment(payment) {
  db.payments.unshift({ ...payment, createdAt: new Date().toISOString() });
  if (db.payments.length > 1000) db.payments.length = 1000;
  persist();
}

export function listPayments(limit = 50) {
  return db.payments.slice(0, limit);
}

/* -------------------------------- orders --------------------------------- */

export function createOrder(order) {
  db.orders.unshift(order);
  if (db.orders.length > 1000) db.orders.length = 1000;
  persist();
  return order;
}

export function getOrder(id) {
  return db.orders.find((o) => o.id === id) || null;
}

export function updateOrder(id, patch = {}) {
  const order = getOrder(id);
  if (!order) return null;
  Object.assign(order, patch, { updatedAt: new Date().toISOString() });
  persist();
  return order;
}

export function listOrders(limit = 60) {
  return db.orders.slice(0, limit);
}

/* -------------------------------- settings ------------------------------- */

export function getSettings() {
  return db.settings;
}

export function saveSettings(patch = {}) {
  db.settings = deepMerge(db.settings, patch);
  db.settings.updatedAt = new Date().toISOString();
  persist();
  return db.settings;
}

export function resetSettings() {
  db.settings = deepMerge({}, DEFAULT_SETTINGS);
  db.settings.updatedAt = new Date().toISOString();
  persist();
  return db.settings;
}

/* --------------------------------- stats --------------------------------- */

export function stats() {
  const users = allUsers();
  return {
    users: users.length,
    works: db.works.length,
    serials: db.works.filter((w) => w.type === 'serial').length,
    images: db.works.filter((w) => w.type === 'image').length,
    videos: db.works.filter((w) => w.video?.url).length,
    creditsSpent: db.stats.creditsSpent,
    creditsLeft: users.reduce((sum, u) => sum + (u.credits || 0), 0),
    payments: db.payments.length,
    stars: db.payments.reduce((sum, p) => sum + (p.stars || 0), 0),
    orders: db.orders.length,
    pendingOrders: db.orders.filter((o) => o.status === 'review' || o.status === 'pending').length
  };
}
