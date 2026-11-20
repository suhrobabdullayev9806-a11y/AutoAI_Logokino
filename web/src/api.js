export const tokenKey = 'ms_token';

export function getToken() {
  try {
    return localStorage.getItem(tokenKey) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(tokenKey, token);
    else localStorage.removeItem(tokenKey);
  } catch {
    /* ignore */
  }
}

async function raw(path, options = {}) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Xatolik (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function auth() {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || '';
  const data = await raw('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });
  setToken(data.token);
  return data;
}

export async function api(path, options = {}, retry = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && retry) {
    await auth();
    return api(path, options, false);
  }
  if (!res.ok) {
    const err = new Error(data.error || `Xatolik (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const getConfig = () => raw('/api/config');
export const loadMe = () => api('/api/me');
export const createSerial = (payload) =>
  api('/api/generate/serial', { method: 'POST', body: JSON.stringify(payload) });
export const createImage = (payload) =>
  api('/api/generate/image', { method: 'POST', body: JSON.stringify(payload) });
export const getJob = (id) => api(`/api/jobs/${id}`);
export const demoTopup = (packageId) =>
  api('/api/topup/demo', { method: 'POST', body: JSON.stringify({ packageId }) });
export const starsLink = (packageId) =>
  api('/api/payments/link', { method: 'POST', body: JSON.stringify({ packageId }) });
export const createPaymentOrder = (packageId) =>
  api('/api/payments/order', { method: 'POST', body: JSON.stringify({ packageId }) });
export const confirmPayment = (orderId, paymentCode) =>
  api('/api/payments/confirm', { method: 'POST', body: JSON.stringify({ orderId, paymentCode }) });
export const paymentOrder = (id) => api(`/api/payments/order/${id}`);

export const adminOverview = () => api('/api/admin/overview');
export const adminSettings = () => api('/api/admin/settings');
export const saveAdminSettings = (settings) =>
  api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
export const testAdminAi = () => api('/api/admin/test-ai', { method: 'POST', body: '{}' });
export const adminUserCredits = (id, amount, note = 'Admin') =>
  api(`/api/admin/users/${id}/credits`, { method: 'POST', body: JSON.stringify({ amount, note }) });
export const adminBlockUser = (id, blocked) =>
  api(`/api/admin/users/${id}/block`, { method: 'POST', body: JSON.stringify({ blocked }) });
export const adminApproveOrder = (id) =>
  api(`/api/admin/orders/${id}/approve`, { method: 'POST', body: '{}' });
export const adminRejectOrder = (id) =>
  api(`/api/admin/orders/${id}/reject`, { method: 'POST', body: '{}' });
