import { useState } from 'react';
import { Artwork, EmptyState, TopBar } from '../components.jsx';
import { Icon } from '../icons.jsx';
import { formatDate } from '../data.js';

const TABS = [
  { id: 'all', label: 'Barchasi' },
  { id: 'serial', label: 'Seriallar' },
  { id: 'image', label: 'Rasmlar' }
];

export default function Library({ works, onOpenWork, onSerial, onImage }) {
  const [tab, setTab] = useState('all');
  const filtered = works.filter((w) => tab === 'all' || w.type === tab);

  return (
    <div className="screen library-screen">
      <TopBar title="KUTUBXONA" right={<span className="count-badge">{works.length}</span>} />

      <div className="library-head">
        <h1>Ishlaringiz</h1>
        <p>Yaratilgan serial va rasmlar shu yerda saqlanadi.</p>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {filtered.length ? (
        <div className="library-grid">
          {filtered.map((work) => (
            <button key={work.id} className="lib-card" onClick={() => onOpenWork(work)}>
              <div className="lib-poster">
                <Artwork src={work.poster} fallback={work.posterFallback} alt={work.title} className="fill" />
                <span className={`type-badge ${work.type}`}>
                  <Icon name={work.type === 'serial' ? 'film' : 'image'} size={11} />
                  {work.type === 'serial' ? 'SERIAL' : 'RASM'}
                </span>
                {work.type === 'serial' ? (
                  <span className="lib-play"><Icon name="play" size={13} /></span>
                ) : null}
              </div>
              <strong>{work.title}</strong>
              <span>{formatDate(work.createdAt)}</span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={tab === 'image' ? 'image' : 'film'}
          title={tab === 'image' ? 'Rasmlar hali yo‘q' : tab === 'serial' ? 'Seriallar hali yo‘q' : 'Kutubxona bo‘sh'}
          text="Birinchi ishingizni yarating — u avtomatik shu yerda saqlanadi."
          action="Rasm yaratish"
          onAction={onImage}
        />
      )}

      <div className="library-cta">
        <button onClick={onSerial}><Icon name="film" size={18} /><span>Yangi serial</span><Icon name="plus" size={16} /></button>
        <button onClick={onImage}><Icon name="image" size={18} /><span>Yangi rasm</span><Icon name="plus" size={16} /></button>
      </div>
    </div>
  );
}
