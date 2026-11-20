import { Artwork, TopBar } from '../components.jsx';
import { Icon } from '../icons.jsx';
import { formatNum } from '../data.js';
import { openExternal } from '../telegram.js';

export default function Profile({ user, works, onTopup, onAdmin, onSoon, notify }) {
  const serials = works.filter((w) => w.type === 'serial').length;
  const images = works.filter((w) => w.type === 'image').length;
  const initials = `${(user.firstName || 'M')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase();

  const copyRef = async () => {
    const link = 'https://t.me/Sunnexai_bot';
    try {
      await navigator.clipboard.writeText(link);
      notify('Referal havola nusxalandi');
    } catch {
      openExternal(link);
    }
  };

  const menu = [
    { icon: 'star', label: 'Kreditlar va tariflar', hint: `${formatNum(user.credits)} kredit`, onClick: onTopup },
    { icon: 'share', label: 'Do‘stlarni taklif qilish', hint: '+20%', onClick: copyRef },
    { icon: 'globe', label: 'Til', hint: 'O‘zbekcha', onClick: () => onSoon('Ko‘p tillilik keyingi versiyada') },
    { icon: 'bell', label: 'Bildirishnomalar', hint: 'Yoqilgan', onClick: () => onSoon('Sozlamalar keyingi versiyada') },
    { icon: 'shield', label: 'Maxfiylik va shartlar', hint: '', onClick: () => onSoon('Hujjatlar render bosqichida qo‘shiladi') },
    { icon: 'users', label: 'Yordam', hint: '@Sunnexai_bot', onClick: () => openExternal('https://t.me/Sunnexai_bot') }
  ];

  return (
    <div className="screen profile-screen">
      <TopBar title="PROFIL" right={<span className="version-pill">v0.1</span>} />

      <div className="profile-head">
        <div className="avatar">
          {user.photoUrl ? <img src={user.photoUrl} alt="" /> : <span>{initials || 'M'}</span>}
        </div>
        <div className="profile-name">
          <h1>{user.firstName} {user.lastName}</h1>
          <p>{user.username ? `@${user.username}` : `ID ${user.id}`}</p>
        </div>
        <span className={`role-badge ${user.isAdmin ? 'admin' : ''}`}>{user.isAdmin ? 'ADMIN' : 'CREATOR'}</span>
      </div>

      <button className="balance-card" onClick={onTopup}>
        <div className="balance-glow" />
        <div className="balance-top">
          <span><Icon name="star" size={15} /> KREDIT BALANSI</span>
          <span className="balance-add"><Icon name="plus" size={14} /> To‘ldirish</span>
        </div>
        <strong>{formatNum(user.credits)}</strong>
        <p>1 serial — MP4 + ovoz · narxlar admin panelda</p>
      </button>

      <div className="profile-stats">
        <div><strong>{serials}</strong><span>Serial</span></div>
        <div><strong>{images}</strong><span>Rasm</span></div>
        <div><strong>{formatNum(works.length)}</strong><span>Jami ish</span></div>
      </div>

      <div className="menu-card">
        {menu.map((item) => (
          <button key={item.label} className="menu-row" onClick={item.onClick}>
            <span className="menu-icon"><Icon name={item.icon} size={18} /></span>
            <span className="menu-label">{item.label}</span>
            {item.hint ? <span className="menu-hint">{item.hint}</span> : null}
            <Icon name="chevron" size={16} className="menu-chevron" />
          </button>
        ))}
        {user.isAdmin ? (
          <button className="menu-row admin-row" onClick={onAdmin}>
            <span className="menu-icon"><Icon name="chart" size={18} /></span>
            <span className="menu-label">Admin panel</span>
            <span className="menu-hint">LIVE</span>
            <Icon name="chevron" size={16} className="menu-chevron" />
          </button>
        ) : null}
      </div>

      {user.demo ? (
        <div className="demo-banner">
          <Icon name="sparkles" size={17} />
          <div>
            <strong>Demo rejimi</strong>
            <p>Kreditlar demo rejimida bepul qo‘shiladi. Karta va Stars to‘lovi admin panelda sozlanadi.</p>
          </div>
        </div>
      ) : null}

      <div className="profile-art">
        <Artwork src="/media/frame-5.jpg" fallback="/media/abstract.jpg" alt="" className="fill" />
        <div className="profile-art-shade" />
        <div>
          <span>MINISTUDIO</span>
          <p>Har bir g‘oya — yangi olam.</p>
        </div>
      </div>

      <p className="profile-footer">MiniStudio Demo · 2026</p>
    </div>
  );
}
