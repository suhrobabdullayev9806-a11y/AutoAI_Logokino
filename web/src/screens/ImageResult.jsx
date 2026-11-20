import { useState } from 'react';
import { Artwork, Button, TopBar } from '../components.jsx';
import { Icon } from '../icons.jsx';
import { openExternal, shareText } from '../telegram.js';

export default function ImageResult({ work, onBack, onNew, notify }) {
  const images = work.images || [];
  const [lightbox, setLightbox] = useState(null);

  const download = (img) => {
    openExternal(img.url || img);
    notify('Rasm yangi oynada ochildi — saqlab oling');
  };

  return (
    <div className="screen result-screen">
      <TopBar
        onBack={onBack}
        title="NATIJA"
        right={<button className="icon-btn" onClick={() => shareText(`🖼 ${work.title}\n\nMiniStudio’da yaratildi.`)}><Icon name="share" size={18} /></button>}
      />

      <div className="result-head">
        <span className="eyebrow">AI RASM</span>
        <h1>Tayyor.</h1>
        <p>{work.prompt}</p>
      </div>

      <div className={`img-grid ${images.length === 1 ? 'single' : ''}`}>
        {images.map((img, i) => (
          <button key={i} className="img-tile" onClick={() => setLightbox(i)}>
            <Artwork src={img.url} fallback={img.fallback} alt="" className="fill" />
            <span className="img-zoom"><Icon name="expand" size={15} /></span>
          </button>
        ))}
      </div>

      {images.length === 1 ? (
        <div className="action-row">
          <button className="action-btn" onClick={() => download(images[0])}><Icon name="download" size={18} /> Yuklab olish</button>
          <button className="action-btn" onClick={() => shareText(`🖼 ${work.title}`)}><Icon name="share" size={18} /> Ulashish</button>
          <button className="action-btn" onClick={() => onNew(work.prompt)}><Icon name="refresh" size={18} /> Variant</button>
        </div>
      ) : null}

      <div className="prompt-box">
        <span><Icon name="wand" size={15} /> Prompt</span>
        <p>{work.prompt}</p>
        <button onClick={() => onNew(work.prompt)}><Icon name="refresh" size={14} /> Yana yaratish</button>
      </div>

      {images.length === 1 ? null : (
        <Button variant="ghost" icon="arrowLeft" onClick={() => onNew(work.prompt)} className="mt-12">Yangi variant yaratish</Button>
      )}

      <div className="result-note">
        <Icon name="sparkles" size={16} />
        <p>Demo rejimida tasvirlar tashqi AI servisi orqali olinadi. Keyingi bosqichda o‘z render serverimiz ulanadi.</p>
      </div>

      {lightbox !== null && images[lightbox] ? (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="player-icon lightbox-close" onClick={() => setLightbox(null)}><Icon name="x" size={20} /></button>
          <div className="lightbox-img" onClick={(e) => e.stopPropagation()}>
            <Artwork src={images[lightbox].url} fallback={images[lightbox].fallback} alt="" className="fill" />
          </div>
          <div className="lightbox-actions" onClick={(e) => e.stopPropagation()}>
            <Button icon="download" onClick={() => download(images[lightbox])}>Yuklab olish</Button>
            <Button variant="ghost" icon="refresh" onClick={() => { setLightbox(null); onNew(work.prompt); }}>Variant</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
