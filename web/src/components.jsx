import { useEffect, useState } from 'react';
import { Icon } from './icons.jsx';
import { formatDate, formatNum } from './data.js';

export function Artwork({ src, fallback, alt = '', className = '', children }) {
  const [current, setCurrent] = useState(src || fallback || '');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrent(src || fallback || '');
    setFailed(false);
  }, [src, fallback]);

  const onError = () => {
    if (fallback && current !== fallback) setCurrent(fallback);
    else setFailed(true);
  };

  return (
    <div className={`artwork ${className}`}>
      {!failed && current ? <img src={current} alt={alt} loading="lazy" onError={onError} /> : null}
      {failed || !current ? (
        <div className="art-fallback" aria-hidden="true">
          <Icon name="sparkles" size={26} />
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function Wordmark() {
  return (
    <div className="wordmark">
      <span className="logo-mark"><Icon name="sparkles" size={15} strokeWidth={2.2} /></span>
      <span>MINI<em>STUDIO</em></span>
    </div>
  );
}

export function TopBar({ onBack, title, right }) {
  return (
    <div className="topbar">
      <div className="topbar-side">
        {onBack ? (
          <button className="icon-btn" onClick={onBack} aria-label="Orqaga">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : (
          <Wordmark />
        )}
      </div>
      {title ? <div className="topbar-title">{title}</div> : null}
      <div className="topbar-side right">{right}</div>
    </div>
  );
}

export function CreditPill({ credits, onClick }) {
  return (
    <button className="credit-pill" onClick={onClick} aria-label="Kreditlar">
      <Icon name="star" size={14} />
      <span>{formatNum(credits)}</span>
      <span className="credit-plus"><Icon name="plus" size={12} strokeWidth={2.4} /></span>
    </button>
  );
}

export function Button({ children, variant = 'primary', icon, loading, disabled, onClick, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <span className="spinner" /> : icon ? <Icon name={icon} size={19} /> : null}
      <span>{children}</span>
    </button>
  );
}

export function SectionTitle({ children, action, onAction }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {action ? <button onClick={onAction} className="link-btn">{action}</button> : null}
    </div>
  );
}

export function WorkCard({ work, onClick }) {
  return (
    <button className="work-card" onClick={onClick}>
      <div className="work-poster">
        <Artwork src={work.poster} fallback={work.posterFallback} alt={work.title} className="fill" />
        <span className={`type-badge ${work.type}`}>
          <Icon name={work.type === 'serial' ? 'film' : 'image'} size={11} />
          {work.type === 'serial' ? 'SERIAL' : 'RASM'}
        </span>
      </div>
      <div className="work-title">{work.title}</div>
      <div className="work-meta">{formatDate(work.createdAt)}</div>
    </button>
  );
}

export function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Yopish">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon = 'sparkles', title, text, action, onAction }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <Button variant="ghost" onClick={onAction}>{action}</Button> : null}
    </div>
  );
}

export function ProgressOrb({ value }) {
  return (
    <div className="orb-wrap">
      <div className="orb" />
      <div className="orb-core">
        <div>
          <strong>{value}%</strong>
          <span>AI ishlamoqda</span>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <span className="stat-icon"><Icon name={icon} size={16} /></span>
      <strong>{formatNum(value)}</strong>
      <span>{label}</span>
    </div>
  );
}
