import { Artwork, CreditPill, SectionTitle, WorkCard, Wordmark } from '../components.jsx';
import { Icon } from '../icons.jsx';
import { INSPIRATION } from '../data.js';

export default function Home({ user, works, costs, onSerial, onImage, onOpenWork, onTopup, onLibrary, onSoon }) {
  const recent = works.slice(0, 6);
  const list = recent.length ? recent : INSPIRATION;
  const isSample = !recent.length;

  return (
    <div className="screen home">
      <div className="home-head">
        <Wordmark />
        <CreditPill credits={user.credits} onClick={onTopup} />
      </div>

      <div className="greeting">
        <p>Salom, {user.firstName || 'do‘stim'} 👋</p>
        <h1>Qanday olam<br />yaratamiz?</h1>
      </div>

      <button className="hero-serial" onClick={onSerial}>
        <Artwork src="/media/frame-1.jpg" fallback="/media/frame-3.jpg" alt="" className="hero-bg" />
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-top">
            <span className="hero-badge"><span className="dot" /> YANGI</span>
            <span className="hero-cost"><Icon name="star" size={12} /> {costs?.serial ?? 150}</span>
          </div>
          <div className="hero-bottom">
            <div>
              <span className="eyebrow">AI VIDEO</span>
              <h2>Mini serial</h2>
              <p>G‘oyangizdan haqiqiy MP4: personajlar, AI ovoz va subtitrlar bilan.</p>
            </div>
            <span className="round-cta"><Icon name="arrowRight" size={22} /></span>
          </div>
        </div>
      </button>

      <div className="quick-grid">
        <button className="quick-card image-card" onClick={onImage}>
          <div className="quick-art">
            <Artwork src="/media/style-real.jpg" fallback="/media/abstract.jpg" alt="" className="fill" />
          </div>
          <div className="quick-content">
            <span className="quick-icon"><Icon name="image" size={18} /></span>
            <div>
              <h3>Rasm</h3>
              <p>Har qanday g‘oya, 4 xil variant</p>
            </div>
            <span className="quick-arrow"><Icon name="arrowRight" size={16} /></span>
          </div>
        </button>

        <button className="quick-card logo-card" onClick={onSoon}>
          <div className="quick-art">
            <Artwork src="/media/abstract.jpg" fallback="/media/desert.jpg" alt="" className="fill" />
          </div>
          <div className="quick-content">
            <span className="quick-icon"><Icon name="logo" size={18} /></span>
            <div>
              <h3>Logotip</h3>
              <p>SVG + brand-kit</p>
            </div>
            <span className="soon">TEZ KUNDA</span>
          </div>
        </button>
      </div>

      <SectionTitle action={works.length ? 'Kutubxona' : null} onAction={onLibrary}>
        {isSample ? 'Namunalar' : 'So‘nggi ishlar'}
      </SectionTitle>

      <div className="hscroll">
        {list.map((item, index) => {
          if (isSample) {
            return (
              <button
                key={item.id}
                className="work-card"
                onClick={() => (item.type === 'serial' ? onSerial() : onImage())}
              >
                <div className="work-poster">
                  <Artwork src={item.poster} alt={item.title} className="fill" />
                  <span className={`type-badge ${item.type}`}>
                    <Icon name={item.type === 'serial' ? 'film' : 'image'} size={11} />
                    {item.type === 'serial' ? 'SERIAL' : 'RASM'}
                  </span>
                  <span className="sample-tag">NAMUNA</span>
                </div>
                <div className="work-title">{item.title}</div>
                <div className="work-meta">{item.meta}</div>
              </button>
            );
          }
          return <WorkCard key={item.id || index} work={item} onClick={() => onOpenWork(item)} />;
        })}
      </div>

      <div className="how-card">
        <div className="how-head">
          <span className="how-icon"><Icon name="wand" size={18} /></span>
          <div>
            <h3>Qanday ishlaydi?</h3>
            <p>3 qadamda tayyor natija</p>
          </div>
        </div>
        <div className="how-steps">
          <div><b>01</b><span>G‘oyani yozing</span></div>
          <div><b>02</b><span>Uslubni tanlang</span></div>
          <div><b>03</b><span>AI yaratadi</span></div>
        </div>
      </div>

      <p className="home-footnote">MiniStudio · haqiqiy MP4, AI ovoz va admin boshqaruvi</p>
    </div>
  );
}
