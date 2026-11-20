import { useState } from 'react';
import { Artwork, Button, TopBar } from '../components.jsx';
import { Icon } from '../icons.jsx';
import { GENRES, IDEAS, SERIAL_STYLES } from '../data.js';
import { createSerial } from '../api.js';

const STEP_TITLES = ['G‘oya', 'Uslub', 'Tekshirish'];

export default function SerialWizard({ user, costs, onBack, onCreated, onNeedCredits, notify }) {
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState('');
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('fantasy');
  const [style, setStyle] = useState('anime');
  const [episodes, setEpisodes] = useState(3);
  const [duration, setDuration] = useState(60);
  const [voice, setVoice] = useState('female');
  const [busy, setBusy] = useState(false);

  const selectedStyle = SERIAL_STYLES.find((s) => s.id === style) || SERIAL_STYLES[0];
  const selectedGenre = GENRES.find((g) => g.id === genre) || GENRES[0];
  const cost = costs?.serial || 150;
  const canNext = step > 0 || idea.trim().length >= 4;

  const next = () => {
    if (!canNext) return notify('Avval serial g‘oyasini yozing');
    if (step < 2) setStep(step + 1);
    else generate();
  };

  const generate = async () => {
    setBusy(true);
    try {
      const data = await createSerial({
        idea,
        title,
        genre,
        style,
        episodes,
        duration,
        voice
      });
      onCreated(data.job, data.user);
    } catch (err) {
      if (err.status === 402) onNeedCredits(err.data?.need || cost);
      else notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen wizard-screen">
      <TopBar
        onBack={step === 0 ? onBack : () => setStep(step - 1)}
        title={`${step + 1} / 3`}
        right={<span className="wiz-step-label">{STEP_TITLES[step]}</span>}
      />

      <div className="wiz-progress">
        {[0, 1, 2].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}
      </div>

      {step === 0 ? (
        <section className="wiz-section">
          <span className="eyebrow">MINI SERIAL</span>
          <h1 className="wiz-title">Qanday serial<br />yaratamiz?</h1>
          <p className="wiz-sub">G‘oyani bir-ikki jumlada yozing. Qolganini AI bajaradi.</p>

          <div className="field">
            <div className="field-top">
              <label>Serial g‘oyasi</label>
              <span>{idea.length}/500</span>
            </div>
            <textarea
              className="textarea"
              maxLength={500}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Masalan: Yomg‘irli Toshkentda hacker qiz shaharni boshqarayotgan sun’iy intellektning sirini ochadi..."
            />
            <button className="idea-btn" onClick={() => setIdea(IDEAS[Math.floor(Math.random() * IDEAS.length)])}>
              <Icon name="wand" size={15} /> G‘oya taklif qil
            </button>
          </div>

          <div className="field">
            <label>Nomi <span className="muted">(ixtiyoriy)</span></label>
            <input
              className="input"
              maxLength={28}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="NEO-TOSHKENT"
            />
          </div>

          <div className="field">
            <label>Janr</label>
            <div className="genre-grid">
              {GENRES.map((g) => (
                <button key={g.id} className={`genre-chip ${genre === g.id ? 'active' : ''}`} onClick={() => setGenre(g.id)}>
                  <span>{g.label}</span>
                  <small>{g.hint}</small>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="wiz-section">
          <span className="eyebrow">VIZUAL USLUB</span>
          <h1 className="wiz-title">Serial qanday<br />ko‘rinadi?</h1>
          <p className="wiz-sub">Uslub butun seriya davomida saqlanadi.</p>

          <div className="style-grid">
            {SERIAL_STYLES.map((s) => (
              <button
                key={s.id}
                className={`style-card ${style === s.id ? 'active' : ''}`}
                onClick={() => setStyle(s.id)}
              >
                <Artwork src={s.img} alt={s.label} className="fill" />
                <div className="style-shade" />
                <div className="style-text">
                  <strong>{s.label}</strong>
                  <small>{s.desc}</small>
                </div>
              </button>
            ))}
          </div>

          <div className="setting-block">
            <label>Epizodlar soni</label>
            <div className="segmented">
              {[1, 3, 5].map((n) => (
                <button key={n} className={episodes === n ? 'active' : ''} onClick={() => setEpisodes(n)}>{n} ta</button>
              ))}
            </div>
          </div>

          <div className="setting-block">
            <label>Har bir epizod</label>
            <div className="segmented">
              {[30, 60, 90].map((n) => (
                <button key={n} className={duration === n ? 'active' : ''} onClick={() => setDuration(n)}>{n} soniya</button>
              ))}
            </div>
          </div>

          <div className="setting-block">
            <label>Ovoz</label>
            <div className="voice-grid">
              <button className={`voice-card ${voice === 'female' ? 'active' : ''}`} onClick={() => setVoice('female')}>
                <span className="voice-avatar female">L</span>
                <div><strong>Laylo</strong><small>Ayol ovozi</small></div>
                {voice === 'female' ? <Icon name="check" size={17} /> : null}
              </button>
              <button className={`voice-card ${voice === 'male' ? 'active' : ''}`} onClick={() => setVoice('male')}>
                <span className="voice-avatar male">T</span>
                <div><strong>Temur</strong><small>Erkak ovozi</small></div>
                {voice === 'male' ? <Icon name="check" size={17} /> : null}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="wiz-section">
          <span className="eyebrow">TAYYORMI?</span>
          <h1 className="wiz-title">Tekshirib<br />oling</h1>
          <p className="wiz-sub">Keyingi qadamda AI ssenariy, kadr, ovoz va haqiqiy MP4 video yaratadi.</p>

          <div className="preview-card">
            <Artwork src={selectedStyle.img} alt="" className="preview-poster" />
            <div className="preview-shade" />
            <div className="preview-text">
              <span className="preview-badge">{selectedGenre.label} · {selectedStyle.label}</span>
              <h2>{title.trim() ? title.toUpperCase() : 'YANGI SERIAL'}</h2>
              <p>{idea.trim() || `${selectedGenre.label} janridagi yangi mini serial.`}</p>
            </div>
          </div>

          <div className="review-list">
            <div><span>Epizodlar</span><strong>{episodes} ta</strong></div>
            <div><span>Davomiylik</span><strong>{duration} soniya</strong></div>
            <div><span>Ovoz</span><strong>{voice === 'female' ? 'Laylo' : 'Temur'}</strong></div>
            <div><span>Format</span><strong>9:16 · MP4</strong></div>
          </div>

          <div className="cost-box">
            <div>
              <Icon name="star" size={18} />
              <div><strong>{cost} kredit</strong><span>Hisobingizda {user.credits} kredit</span></div>
            </div>
            <span className="cost-note">MP4 + OVOZ</span>
          </div>
        </section>
      ) : null}

      <div className="wizard-footer">
        <div className="wizard-footer-info">
          <Icon name="clock" size={15} />
          <span>~2–4 daqiqa</span>
          <span className="sep">•</span>
          <span>{cost} kredit</span>
        </div>
        <Button onClick={next} loading={busy} icon={step === 2 ? 'sparkles' : 'arrowRight'}>
          {step === 2 ? 'Serialni yaratish' : 'Davom etish'}
        </Button>
      </div>
    </div>
  );
}
