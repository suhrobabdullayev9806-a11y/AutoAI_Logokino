import { Artwork, Button, TopBar } from '../components.jsx';
import { Icon } from '../icons.jsx';
import { openExternal, shareText } from '../telegram.js';

export default function SerialResult({ work, onBack, onPlay, onTopup, notify }) {
  const story = work.story;
  if (!story) {
    return (
      <div className="screen">
        <TopBar onBack={onBack} title="SERIAL" />
        <p className="muted">Serial ma’lumoti topilmadi.</p>
      </div>
    );
  }

  const share = () => {
    shareText(`🎬 ${story.title}\n\n${story.logline}\n\nMiniStudio’da yaratildi.`);
  };

  const download = () => {
    if (!work.video?.url) {
      notify('Bu ish demo versiyada — MP4 mavjud emas');
      return;
    }
    openExternal(new URL(work.video.url, window.location.origin).href);
    notify('MP4 yangi oynada ochildi — saqlab oling');
  };

  const voiceLabel = story.voice === 'female' ? 'Laylo' : 'Temur';

  return (
    <div className="screen result-screen">
      <TopBar
        onBack={onBack}
        title="SERIAL"
        right={<button className="icon-btn" onClick={share} aria-label="Ulashish"><Icon name="share" size={18} /></button>}
      />

      <div className="serial-hero">
        <Artwork src={work.poster} fallback={work.posterFallback || story.posterFallback} alt={story.title} className="fill" />
        <div className="serial-hero-shade" />
        <div className="serial-hero-top">
          <span className="pill-dark"><Icon name="film" size={12} /> {story.episodeCount} EPIZOD</span>
          <span className="pill-dark">{story.styleLabel}</span>
          {work.video?.url ? <span className="pill-dark video-ready"><span className="dot" /> MP4</span> : null}
        </div>
        <button className="video-hero-play" onClick={() => onPlay(0)} aria-label="Seriali ko‘rish">
          <Icon name="play" size={26} />
        </button>
        <div className="serial-hero-text">
          <span className="eyebrow">AI MINI SERIAL</span>
          <h1>{story.title}</h1>
          <p>{story.logline}</p>
        </div>
      </div>

      <div className="serial-meta">
        <span><Icon name="clock" size={14} /> {work.video?.duration || story.duration} soniya</span>
        <span><Icon name="film" size={14} /> {story.genreLabel}</span>
        <span><Icon name="volume" size={14} /> {voiceLabel} · AI ovoz</span>
      </div>

      <Button icon="play" onClick={() => onPlay(0)} className="mt-16">
        {work.video?.url ? 'Serialni ko‘rish' : '1-qismni ko‘rish'}
      </Button>

      <div className="action-row">
        <button className="action-btn" onClick={download}><Icon name="download" size={18} /> MP4</button>
        <button className="action-btn" onClick={share}><Icon name="share" size={18} /> Ulashish</button>
        <button className="action-btn" onClick={onTopup}><Icon name="star" size={18} /> Kredit</button>
      </div>

      <div className="section-title"><h2>Epizodlar</h2><span className="count-badge">{story.episodes.length}</span></div>
      <div className="episode-list">
        {story.episodes.map((ep, i) => (
          <button key={ep.n} className="episode-row" onClick={() => onPlay(i)}>
            <div className="episode-thumb">
              <Artwork src={ep.scenes[0]?.img} fallback={ep.scenes[0]?.fallback} alt="" className="fill" />
              <span className="episode-play"><Icon name="play" size={13} /></span>
            </div>
            <div className="episode-info">
              <strong>{ep.title}</strong>
              <small>
                {ep.scenes.length} kadr · {ep.durationSec ? `${Math.round(ep.durationSec)} soniya` : `${story.duration} soniya`}
              </small>
              <p>{ep.hook}</p>
            </div>
            <Icon name="chevron" size={17} className="episode-chevron" />
          </button>
        ))}
      </div>

      <div className="section-title"><h2>Qahramonlar</h2></div>
      <div className="hscroll characters">
        {story.characters.map((c) => (
          <div className="character-card" key={c.name}>
            <Artwork src={c.img} alt={c.name} className="character-img" />
            <strong>{c.name}</strong>
            <span>{c.role}</span>
          </div>
        ))}
      </div>

      <div className="result-note">
        <Icon name={work.video?.url ? 'film' : 'sparkles'} size={16} />
        <p>
          {work.video?.url
            ? `Haqiqiy MP4 tayyor: ${work.video.provider}. Ovoz, subtitr va harakat effekti bilan.`
            : 'Bu eski demo ish — yangi seriallar haqiqiy MP4, AI ovoz va subtitr bilan yaratiladi.'}
        </p>
      </div>
    </div>
  );
}
