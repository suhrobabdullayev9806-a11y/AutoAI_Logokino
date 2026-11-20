import { useEffect, useState } from 'react';
import { Button, EmptyState, StatCard, TopBar } from '../components.jsx';
import { Icon } from '../icons.jsx';
import {
  adminApproveOrder,
  adminBlockUser,
  adminOverview,
  adminRejectOrder,
  adminUserCredits,
  saveAdminSettings,
  testAdminAi
} from '../api.js';
import { formatDate, formatNum } from '../data.js';

const TABS = [
  { id: 'ai', label: 'AI Studio', icon: 'sparkles' },
  { id: 'pricing', label: 'Narxlar', icon: 'star' },
  { id: 'payment', label: 'To‘lov', icon: 'shield' },
  { id: 'users', label: 'Userlar', icon: 'users' },
  { id: 'jobs', label: 'Joblar', icon: 'chart' }
];

function Field({ label, hint, children }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select className="admin-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

export default function Admin({ onBack, notify }) {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState('ai');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [test, setTest] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const next = await adminOverview();
      setData(next);
      setSettings(next.settings);
      setError('');
    } catch (err) {
      setError(err.message);
      notify?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setAI = (key, value) => setSettings((s) => ({ ...s, ai: { ...s.ai, [key]: value } }));
  const setPayment = (key, value) => setSettings((s) => ({ ...s, payment: { ...s.payment, [key]: value } }));
  const setCost = (key, value) => setSettings((s) => ({ ...s, costs: { ...s.costs, [key]: Number(value) } }));
  const setLimit = (key, value) => setSettings((s) => ({ ...s, limits: { ...s.limits, [key]: Number(value) } }));
  const setPackage = (index, key, value) => {
    setSettings((s) => {
      const packages = s.packages.map((item, i) => (i === index ? { ...item, [key]: value } : item));
      return { ...s, packages };
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const ai = { ...settings.ai };
      delete ai.hasGeminiKey;
      delete ai.geminiKeyMasked;
      if (keyInput.trim()) ai.geminiApiKey = keyInput.trim();
      else delete ai.geminiApiKey;
      const payment = { ...settings.payment };
      delete payment.network;
      const payload = {
        ai,
        costs: settings.costs,
        packages: settings.packages,
        payment,
        limits: settings.limits
      };
      const res = await saveAdminSettings(payload);
      setSettings(res.settings);
      setKeyInput('');
      notify?.('Sozlamalar saqlandi ✅');
      await load();
    } catch (err) {
      setError(err.message);
      notify?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTest({ loading: true });
    try {
      const result = await testAdminAi();
      setTest(result);
    } catch (err) {
      setTest({ ok: false, error: err.message });
    }
  };

  const changeCredits = async (user, amount) => {
    try {
      await adminUserCredits(user.id, amount, 'Admin panel');
      notify?.(`${user.firstName}: ${amount > 0 ? '+' : ''}${amount} kredit`);
      await load();
    } catch (err) {
      notify?.(err.message);
    }
  };

  const toggleBlock = async (user) => {
    try {
      await adminBlockUser(user.id, !user.blocked);
      notify?.(user.blocked ? 'Blokdan chiqarildi' : 'Foydalanuvchi bloklandi');
      await load();
    } catch (err) {
      notify?.(err.message);
    }
  };

  const approve = async (order) => {
    try {
      await adminApproveOrder(order.id);
      notify?.(`${order.credits} kredit qo‘shildi ✅`);
      await load();
    } catch (err) {
      notify?.(err.message);
    }
  };

  const reject = async (order) => {
    try {
      await adminRejectOrder(order.id);
      notify?.('Buyurtma rad etildi');
      await load();
    } catch (err) {
      notify?.(err.message);
    }
  };

  const s = data?.stats;
  const pending = data?.orders?.filter((o) => o.status === 'review' || o.status === 'pending') || [];

  return (
    <div className="screen admin-screen">
      <TopBar
        onBack={onBack}
        title="ADMIN PANEL"
        right={<button className="icon-btn" onClick={load} aria-label="Yangilash"><Icon name="refresh" size={18} /></button>}
      />

      {loading ? (
        <div className="admin-loading"><span className="spinner dark" /><p>Yuklanmoqda...</p></div>
      ) : !s || !settings ? (
        <EmptyState icon="lock" title="Ruxsat yo‘q" text="Bu bo‘lim faqat adminlar uchun." />
      ) : (
        <>
          <div className="admin-hero">
            <span className="live-badge"><span className="dot" /> LIVE</span>
            <h1>Studio<br />nazorati</h1>
            <p>AI kalit, narxlar, karta va foydalanuvchilar — hammasi shu yerda.</p>
          </div>

          <div className="stat-grid">
            <StatCard label="Foydalanuvchi" value={s.users} icon="users" />
            <StatCard label="Ishlar" value={s.works} icon="sparkles" />
            <StatCard label="Sarflangan kredit" value={s.creditsSpent} icon="zap" />
            <StatCard label="Kutilayotgan to‘lov" value={pending.length} icon="star" />
          </div>

          <div className="admin-tabs">
            {TABS.map((item) => (
              <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
                <Icon name={item.icon} size={14} />
                {item.label}
              </button>
            ))}
          </div>

          {error ? <p className="admin-alert">{error}</p> : null}

          {tab === 'ai' ? (
            <section className="admin-section">
              <div className="admin-section-head">
                <div>
                  <h2>Google AI Studio</h2>
                  <p>Gemini API kaliti, model va render sozlamalari.</p>
                </div>
                <span className={`admin-status ${settings.ai.hasGeminiKey ? 'on' : ''}`}>
                  {settings.ai.hasGeminiKey ? 'ULANGAN' : 'KALIT YO‘Q'}
                </span>
              </div>

              <Field label="Gemini API key" hint="Bo‘sh qoldirsangiz mavjud kalit saqlanadi.">
                <input
                  className="admin-input"
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={settings.ai.geminiKeyMasked || 'AIza...'}
                  autoComplete="off"
                />
              </Field>

              <div className="admin-grid two">
                <Field label="Ssenariy">
                  <Select
                    value={settings.ai.scriptProvider}
                    onChange={(v) => setAI('scriptProvider', v)}
                    options={[
                      { value: 'auto', label: 'Auto (Gemini → demo)' },
                      { value: 'gemini', label: 'Faqat Gemini' },
                      { value: 'demo', label: 'Demo shablon' }
                    ]}
                  />
                </Field>
                <Field label="Rasm">
                  <Select
                    value={settings.ai.imageProvider}
                    onChange={(v) => setAI('imageProvider', v)}
                    options={[
                      { value: 'auto', label: 'Auto (Gemini → Pollinations)' },
                      { value: 'gemini', label: 'Faqat Gemini' },
                      { value: 'pollinations', label: 'Pollinations' },
                      { value: 'local', label: 'Lokal namuna' }
                    ]}
                  />
                </Field>
                <Field label="Ovoz">
                  <Select
                    value={settings.ai.voiceProvider}
                    onChange={(v) => setAI('voiceProvider', v)}
                    options={[
                      { value: 'auto', label: 'Auto (Gemini → Edge)' },
                      { value: 'gemini', label: 'Faqat Gemini TTS' },
                      { value: 'edge', label: 'Edge TTS (bepul)' }
                    ]}
                  />
                </Field>
                <Field label="Video">
                  <Select
                    value={settings.ai.videoProvider}
                    onChange={(v) => setAI('videoProvider', v)}
                    options={[
                      { value: 'ffmpeg', label: 'FFmpeg MP4 (ishlaydi)' },
                      { value: 'veo', label: 'Veo (keyingi bosqich)' }
                    ]}
                  />
                </Field>
              </div>

              <div className="admin-grid two">
                <Field label="Matn modeli">
                  <input className="admin-input" value={settings.ai.textModel} onChange={(e) => setAI('textModel', e.target.value)} />
                </Field>
                <Field label="Rasm modeli">
                  <input className="admin-input" value={settings.ai.imageModel} onChange={(e) => setAI('imageModel', e.target.value)} />
                </Field>
                <Field label="TTS modeli">
                  <input className="admin-input" value={settings.ai.ttsModel} onChange={(e) => setAI('ttsModel', e.target.value)} />
                </Field>
                <Field label="Gemini ovozi">
                  <input className="admin-input" value={settings.ai.ttsVoice} onChange={(e) => setAI('ttsVoice', e.target.value)} />
                </Field>
                <Field label="Edge ayol ovozi">
                  <input className="admin-input" value={settings.ai.edgeFemaleVoice} onChange={(e) => setAI('edgeFemaleVoice', e.target.value)} />
                </Field>
                <Field label="Edge erkak ovozi">
                  <input className="admin-input" value={settings.ai.edgeMaleVoice} onChange={(e) => setAI('edgeMaleVoice', e.target.value)} />
                </Field>
              </div>

              <div className="admin-grid three">
                <Field label="Kenglik">
                  <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={settings.ai.renderWidth} onChange={(e) => setAI('renderWidth', Number(e.target.value))} />
                </Field>
                <Field label="Balandlik">
                  <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={settings.ai.renderHeight} onChange={(e) => setAI('renderHeight', Number(e.target.value))} />
                </Field>
                <Field label="FPS">
                  <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={settings.ai.fps} onChange={(e) => setAI('fps', Number(e.target.value))} />
                </Field>
              </div>

              <div className="admin-actions">
                <Button variant="ghost" icon="zap" onClick={runTest} loading={test?.loading}>AI ulanishni test qilish</Button>
                <Button icon="check" onClick={save} loading={saving}>Saqlash</Button>
              </div>

              {test && !test.loading ? (
                <div className={`admin-test ${test.ok ? 'ok' : 'fail'}`}>
                  <strong>{test.ok ? 'Ulanish ishlaydi ✅' : 'Ulanish xatosi ❌'}</strong>
                  <p>{test.ok ? test.message : test.error}</p>
                  {test.ok && test.missing?.length ? <p>Topilmadi: {test.missing.join(', ')}</p> : null}
                </div>
              ) : null}

              <div className="admin-note">
                <Icon name="shield" size={15} />
                <p>Kalit faqat serverda saqlanadi va API javobida ko‘rsatilmaydi. Render’da env yoki shu panel orqali bering.</p>
              </div>
            </section>
          ) : null}

          {tab === 'pricing' ? (
            <section className="admin-section">
              <div className="admin-section-head">
                <div><h2>Narxlar</h2><p>Kredit narxi va paketlar.</p></div>
              </div>

              <div className="admin-grid three">
                <Field label="Serial (MP4)">
                  <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={settings.costs.serial} onChange={(e) => setCost('serial', e.target.value)} />
                </Field>
                <Field label="Rasm">
                  <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={settings.costs.image} onChange={(e) => setCost('image', e.target.value)} />
                </Field>
                <Field label="Logotip">
                  <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={settings.costs.logo} onChange={(e) => setCost('logo', e.target.value)} />
                </Field>
              </div>

              <div className="admin-grid two">
                <Field label="Maks. epizod">
                  <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={settings.limits.maxEpisodes} onChange={(e) => setLimit('maxEpisodes', e.target.value)} />
                </Field>
                <Field label="Har epizod kadr">
                  <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={settings.limits.maxScenes} onChange={(e) => setLimit('maxScenes', e.target.value)} />
                </Field>
              </div>

              <div className="packages admin-packages">
                {settings.packages.map((item, index) => (
                  <div key={item.id} className="admin-package">
                    <div className="admin-package-head">
                      <strong>{item.title}</strong>
                      <span className="count-badge">{item.id}</span>
                    </div>
                    <div className="admin-grid two">
                      <Field label="Nomi">
                        <input className="admin-input" value={item.title} onChange={(e) => setPackage(index, 'title', e.target.value)} />
                      </Field>
                      <Field label="Kredit">
                        <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={item.credits} onChange={(e) => setPackage(index, 'credits', Number(e.target.value))} />
                      </Field>
                      <Field label="Stars">
                        <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={item.stars} onChange={(e) => setPackage(index, 'stars', Number(e.target.value))} />
                      </Field>
                      <Field label="So‘m">
                        <input className="admin-input" type="number" onWheel={(e) => e.currentTarget.blur()} value={item.uzs} onChange={(e) => setPackage(index, 'uzs', Number(e.target.value))} />
                      </Field>
                    </div>
                    <Field label="Izoh">
                      <input className="admin-input" value={item.note} onChange={(e) => setPackage(index, 'note', e.target.value)} />
                    </Field>
                  </div>
                ))}
              </div>

              <div className="admin-actions">
                <Button icon="check" onClick={save} loading={saving}>Narxlarni saqlash</Button>
              </div>
            </section>
          ) : null}

          {tab === 'payment' ? (
            <section className="admin-section">
              <div className="admin-section-head">
                <div><h2>To‘lov</h2><p>Karta, Stars yoki demo rejimi.</p></div>
                <span className={`admin-status ${settings.payment.mode === 'card' ? 'on' : ''}`}>{settings.payment.mode.toUpperCase()}</span>
              </div>

              <Field label="To‘lov usuli">
                <Select
                  value={settings.payment.mode}
                  onChange={(v) => setPayment('mode', v)}
                  options={[
                    { value: 'demo', label: 'Demo — bepul kredit' },
                    { value: 'stars', label: 'Telegram Stars' },
                    { value: 'card', label: 'Karta (qo‘lda tasdiqlash)' }
                  ]}
                />
              </Field>

              <div className="card-admin-preview">
                <div className="card-top">
                  <span>QABUL QILUVCHI KARTA</span>
                  <span className={`network-badge ${String(settings.payment.network || '').toLowerCase()}`}>
                    {settings.payment.network || 'Karta'}
                  </span>
                </div>
                <strong>{settings.payment.cardNumber || '8600 0000 0000 0000'}</strong>
                <div className="card-bottom">
                  <div><span>EGASI</span><strong>{settings.payment.cardHolder || 'ISM FAMILIYA'}</strong></div>
                  <div><span>MUDDAT</span><strong>{settings.payment.cardExpiry || 'MM/YY'}</strong></div>
                </div>
              </div>

              <div className="admin-grid two">
                <Field label="Karta raqami" hint="Humo 9860 / UzCard 8600 avtomatik aniqlanadi.">
                  <input className="admin-input" value={settings.payment.cardNumber} onChange={(e) => setPayment('cardNumber', e.target.value)} placeholder="8600 0000 0000 0000" />
                </Field>
                <Field label="Karta egasi">
                  <input className="admin-input" value={settings.payment.cardHolder} onChange={(e) => setPayment('cardHolder', e.target.value)} placeholder="ISM FAMILIYA" />
                </Field>
                <Field label="Amal qilish muddati">
                  <input className="admin-input" value={settings.payment.cardExpiry} onChange={(e) => setPayment('cardExpiry', e.target.value)} placeholder="12/28" />
                </Field>
                <Field label="Avtomatik tasdiqlash">
                  <button
                    className={`admin-toggle ${settings.payment.autoApprove ? 'on' : ''}`}
                    onClick={() => setPayment('autoApprove', !settings.payment.autoApprove)}
                  >
                    <span /> {settings.payment.autoApprove ? 'Yoqilgan' : 'O‘chirilgan'}
                  </button>
                </Field>
              </div>

              <Field label="To‘lov yo‘riqnomasi">
                <textarea className="admin-input admin-textarea" value={settings.payment.instructions} onChange={(e) => setPayment('instructions', e.target.value)} />
              </Field>

              <div className="admin-actions">
                <Button icon="check" onClick={save} loading={saving}>To‘lovni saqlash</Button>
              </div>

              <div className="admin-section-head mt-16">
                <div><h2>Buyurtmalar</h2><p>Karta to‘lovlari navbati.</p></div>
                <span className="count-badge">{pending.length}</span>
              </div>

              <div className="admin-orders">
                {data.orders.length ? data.orders.map((order) => {
                  const owner = data.users.find((u) => u.id === order.userId);
                  return (
                    <div key={order.id} className={`admin-order ${order.status}`}>
                      <div className="admin-order-top">
                        <div>
                          <strong>{owner?.firstName || order.userId}</strong>
                          <span>{order.code} · {formatDate(order.createdAt)}</span>
                        </div>
                        <span className={`admin-order-status ${order.status}`}>{order.status.toUpperCase()}</span>
                      </div>
                      <div className="admin-order-info">
                        <span>{order.credits} kredit</span>
                        <span>{formatNum(order.amountUzs)} so‘m</span>
                        <span>{order.card?.network || 'Karta'}</span>
                      </div>
                      {order.paymentCode ? <p className="admin-order-code">Kod: {order.paymentCode}</p> : null}
                      {order.status === 'review' || order.status === 'pending' ? (
                        <div className="admin-order-actions">
                          <button className="mini-btn ok" onClick={() => approve(order)}><Icon name="check" size={14} /> Tasdiqlash</button>
                          <button className="mini-btn bad" onClick={() => reject(order)}><Icon name="x" size={14} /> Rad etish</button>
                        </div>
                      ) : null}
                    </div>
                  );
                }) : <p className="muted small">Hozircha buyurtma yo‘q.</p>}
              </div>
            </section>
          ) : null}

          {tab === 'users' ? (
            <section className="admin-section">
              <div className="admin-section-head">
                <div><h2>Foydalanuvchilar</h2><p>Kredit berish va bloklash.</p></div>
                <span className="count-badge">{data.users.length}</span>
              </div>

              <div className="admin-users">
                {data.users.map((u) => (
                  <div key={u.id} className={`admin-user ${u.blocked ? 'blocked' : ''}`}>
                    <span className="admin-avatar">{(u.firstName || 'M')[0]}</span>
                    <div>
                      <strong>{u.firstName} {u.lastName} {u.isAdmin ? <em>ADMIN</em> : null} {u.blocked ? <em className="bad">BLOCK</em> : null}</strong>
                      <span>ID {u.id} · {formatNum(u.works)} ish · {formatNum(u.credits)} kredit</span>
                    </div>
                    <div className="admin-user-actions">
                      <button className="mini-btn" onClick={() => changeCredits(u, 100)}>+100</button>
                      <button className="mini-btn" onClick={() => changeCredits(u, -50)}>−50</button>
                      {!u.isAdmin ? (
                        <button className={`mini-btn ${u.blocked ? 'ok' : 'bad'}`} onClick={() => toggleBlock(u)}>
                          {u.blocked ? 'Unblock' : 'Block'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {tab === 'jobs' ? (
            <section className="admin-section">
              <div className="admin-section-head">
                <div><h2>Render joblar</h2><p>Oxirgi AI vazifalar.</p></div>
                <span className="count-badge">{data.jobs.length}</span>
              </div>

              <div className="admin-jobs">
                {data.jobs.length ? data.jobs.map((job) => (
                  <div key={job.id} className="admin-job">
                    <span className={`job-type ${job.type}`}><Icon name={job.type === 'serial' ? 'film' : 'image'} size={14} /></span>
                    <div>
                      <strong>{job.title || (job.type === 'serial' ? 'Mini serial' : 'Rasm')}</strong>
                      <span>{job.stage} · {formatDate(job.createdAt)}</span>
                    </div>
                    <div className="admin-job-right">
                      <span className={job.status === 'done' ? 'status-done' : job.status === 'error' ? 'status-error' : 'status-live'}>
                        {job.status === 'done' ? 'TAYYOR' : job.status === 'error' ? 'XATO' : `${job.progress}%`}
                      </span>
                      <small>{job.cost} kr</small>
                    </div>
                  </div>
                )) : <p className="muted small">Hozircha job yo‘q.</p>}
              </div>

              <div className="admin-note">
                <Icon name="shield" size={16} />
                <p>Adminlar: {data.env.adminIds.join(', ')}. Bot: {data.env.botEnabled ? 'yoqilgan' : 'o‘chirilgan'} · Public URL: {data.env.publicUrl || 'sozlanmagan'}</p>
              </div>
            </section>
          ) : null}

          <Button variant="ghost" icon="refresh" onClick={load} className="mt-16">Yangilash</Button>
        </>
      )}
    </div>
  );
}
