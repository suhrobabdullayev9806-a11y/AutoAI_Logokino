import { useState } from 'react';
import { Button, Sheet } from '../components.jsx';
import { Icon } from '../icons.jsx';
import { formatNum } from '../data.js';
import { confirmPayment, createPaymentOrder, demoTopup, starsLink } from '../api.js';
import { openInvoice } from '../telegram.js';

export default function PaymentSheet({ open, onClose, config, user, onPaid, isTelegram, notify }) {
  const [busy, setBusy] = useState('');
  const [step, setStep] = useState('list');
  const [order, setOrder] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const payment = config?.payment || { mode: 'demo' };
  const mode = payment.mode || 'demo';
  const packages = config?.packages || [];
  const demoAvailable = Boolean(config?.demoMode) && payment.mode !== 'stars';

  const reset = () => {
    setBusy('');
    setStep('list');
    setOrder(null);
    setPkg(null);
    setCode('');
    setError('');
    setCopied('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(''), 1600);
    } catch {
      notify?.('Nusxalab bo‘lmadi — qo‘lda kiriting');
    }
  };

  const finish = (freshUser) => {
    onPaid?.(freshUser);
    close();
  };

  const buy = async (item) => {
    setError('');
    setBusy(item.id);
    setPkg(item);
    try {
      if (mode === 'card' && payment.configured) {
        const data = await createPaymentOrder(item.id);
        setOrder(data.order);
        setStep('card');
        return;
      }
      if (mode === 'stars' && isTelegram) {
        const { url } = await starsLink(item.id);
        const status = await openInvoice(url);
        if (status === 'paid') {
          finish(null);
          notify?.(`${item.credits} kredit qo‘shildi ✅`);
        } else if (status === 'cancelled') {
          setError('To‘lov bekor qilindi');
        } else if (status === 'failed') {
          setError('To‘lov amalga oshmadi');
        }
        return;
      }
      if (demoAvailable) {
        const data = await demoTopup(item.id);
        finish(data.user);
        notify?.(`${item.credits} kredit qo‘shildi (demo) ✅`);
        return;
      }
      setError('To‘lov usuli admin panelda hali sozlanmagan');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const submitCode = async () => {
    if (!order) return;
    setError('');
    setBusy('confirm');
    try {
      const data = await confirmPayment(order.id, code);
      setOrder(data.order);
      if (data.order.status === 'paid') {
        notify?.(`${data.order.credits} kredit qo‘shildi ✅`);
        finish(data.user);
      } else {
        setStep('review');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const title = step === 'list' ? 'Kreditlar' : step === 'review' ? 'Tekshiruvda' : 'Karta to‘lovi';

  return (
    <Sheet open={open} onClose={close} title={title}>
      {step === 'list' ? (
        <>
          <div className="pay-balance">
            <div>
              <span>Joriy balans</span>
              <strong>{formatNum(user?.credits)} kredit</strong>
            </div>
            <span className="pay-star"><Icon name="star" size={22} /></span>
          </div>

          <div className="pay-mode-note">
            <Icon name={mode === 'card' ? 'shield' : mode === 'stars' ? 'star' : 'sparkles'} size={15} />
            <span>
              {mode === 'card'
                ? 'Karta orqali to‘lov · admin tasdiqlaydi'
                : mode === 'stars'
                  ? 'Telegram Stars orqali xavfsiz to‘lov'
                  : 'Demo rejimi · kreditlar bepul qo‘shiladi'}
            </span>
          </div>

          <div className="packages">
            {packages.map((item) => (
              <div key={item.id} className={`pkg ${item.popular ? 'popular' : ''}`}>
                <div className="pkg-info">
                  <div className="pkg-title">
                    <strong>{item.title}</strong>
                    {item.popular ? <span className="popular-badge">TOP</span> : null}
                  </div>
                  <span className="pkg-credits">{formatNum(item.credits)} kredit</span>
                  <small>{item.note}</small>
                  {mode === 'card' ? <small className="pkg-price">{formatNum(item.uzs)} so‘m</small> : null}
                </div>
                <Button
                  variant={item.popular ? 'primary' : 'ghost'}
                  loading={busy === item.id}
                  onClick={() => buy(item)}
                  className="pkg-btn"
                >
                  {mode === 'card' ? 'To‘lash' : mode === 'stars' ? `${item.stars} ⭐` : 'Demo'}
                </Button>
              </div>
            ))}
          </div>

          {error ? <p className="pay-error">{error}</p> : null}

          <div className="pay-note">
            <Icon name="shield" size={16} />
            <p>
              {mode === 'card'
                ? 'Karta raqami va muddati faqat qabul qiluvchi admin kartasi. Sizning karta raqamingiz, CVV yoki OTP kodi hech qachon so‘ralmaydi va saqlanmaydi.'
                : 'To‘lovdan keyin kreditlar avtomatik qo‘shiladi. Muammo bo‘lsa admin panel orqali tekshiriladi.'}
            </p>
          </div>

          <div className="pay-usage">
            <div><span>1 rasm</span><strong>{config?.costs?.image ?? 5} kredit</strong></div>
            <div><span>1 mini serial (MP4 + ovoz)</span><strong>{config?.costs?.serial ?? 150} kredit</strong></div>
            <div><span>Logotip</span><strong>{config?.costs?.logo ?? 40} kredit</strong></div>
          </div>
        </>
      ) : null}

      {step === 'card' && order ? (
        <>
          <div className="checkout-head">
            <span className="pkg-credits">{formatNum(order.credits)} kredit</span>
            <strong>{formatNum(order.amountUzs)} so‘m</strong>
            <small>Buyurtma: {order.code}</small>
          </div>

          <div className="card-preview">
            <div className="card-glow" />
            <div className="card-top">
              <span>TO‘LOV KARTASI</span>
              <span className={`network-badge ${order.card.network.toLowerCase()}`}>{order.card.network}</span>
            </div>
            <button className="card-number" onClick={() => copy(order.card.number.replace(/\s/g, ''), 'number')}>
              {order.card.number}
              <span>{copied === 'number' ? <Icon name="check" size={15} /> : <Icon name="copy" size={15} />}</span>
            </button>
            <div className="card-bottom">
              <div><span>EGASI</span><strong>{order.card.holder}</strong></div>
              <div><span>MUDDAT</span><strong>{order.card.expiry || '—'}</strong></div>
            </div>
          </div>

          <div className="checkout-steps">
            <div><b>1</b><span>Kartaga {formatNum(order.amountUzs)} so‘m o‘tkazing</span></div>
            <div><b>2</b><span>To‘lov izohida <strong>{order.code}</strong> kodini yozing</span></div>
            <div><b>3</b><span>Bank chekidagi to‘lov kodini quyida kiriting</span></div>
          </div>

          <div className="field pay-code-field">
            <label>To‘lov kodi</label>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Masalan: 123456 yoki chek raqami"
              maxLength={80}
            />
          </div>

          {error ? <p className="pay-error">{error}</p> : null}

          <Button onClick={submitCode} loading={busy === 'confirm'} icon="shield">To‘lovni tasdiqlash</Button>
          <button className="pay-back" onClick={() => { setStep('list'); setError(''); }}>Orqaga</button>

          <div className="pay-note">
            <Icon name="shield" size={16} />
            <p>{payment.instructions || 'To‘lov admin tomonidan tekshirilgach kredit qo‘shiladi.'}</p>
          </div>
        </>
      ) : null}

      {step === 'review' && order ? (
        <div className="review-state">
          <div className="review-icon"><Icon name="clock" size={28} /></div>
          <h3>To‘lov tekshirilmoqda</h3>
          <p>Buyurtma <strong>{order.code}</strong> admin panelga yuborildi. Tasdiqlangach {formatNum(order.credits)} kredit avtomatik qo‘shiladi.</p>
          <div className="review-row"><span>Summa</span><strong>{formatNum(order.amountUzs)} so‘m</strong></div>
          <div className="review-row"><span>To‘lov kodi</span><strong>{order.paymentCode}</strong></div>
          <Button variant="ghost" onClick={close}>Yopish</Button>
        </div>
      ) : null}
    </Sheet>
  );
}
