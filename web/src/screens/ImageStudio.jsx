import { useState } from 'react';
import { Artwork, Button, TopBar } from '../components.jsx';
import { Icon } from '../icons.jsx';
import { IMAGE_IDEAS, IMAGE_STYLES, RATIOS } from '../data.js';
import { createImage } from '../api.js';

export default function ImageStudio({ user, costs, prefill = '', onBack, onCreated, onNeedCredits, notify }) {
  const [prompt, setPrompt] = useState(prefill);
  const [style, setStyle] = useState('cinematic');
  const [ratio, setRatio] = useState('9:16');
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);

  const cost = (costs?.image || 5) * count;

  const generate = async () => {
    if (prompt.trim().length < 3) return notify('Prompt yozing');
    setBusy(true);
    try {
      const data = await createImage({ prompt, style, ratio, count });
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
      <TopBar onBack={onBack} title="RASM STUDIYASI" right={<span className="wiz-step-label">AI</span>} />

      <section className="wiz-section">
        <span className="eyebrow">TEXT → IMAGE</span>
        <h1 className="wiz-title">Nima chizamiz?</h1>
        <p className="wiz-sub">Tasvirni so‘z bilan tasvirlab bering. AI qolganini bajaradi.</p>

        <div className="field">
          <div className="field-top">
            <label>Prompt</label>
            <span>{prompt.length}/600</span>
          </div>
          <textarea
            className="textarea image-textarea"
            maxLength={600}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Neon yomg‘irda anime qahramon, kinematik portret, yorqin ko‘zlar..."
          />
        </div>

        <div className="idea-chips">
          {IMAGE_IDEAS.map((idea) => (
            <button key={idea} className="idea-chip" onClick={() => setPrompt(idea)}>{idea}</button>
          ))}
        </div>

        <div className="field">
          <label>Uslub</label>
          <div className="image-styles">
            {IMAGE_STYLES.map((s) => (
              <button key={s.id} className={`image-style ${style === s.id ? 'active' : ''}`} onClick={() => setStyle(s.id)}>
                <Artwork src={s.img} alt={s.label} className="fill" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-block">
          <label>Format</label>
          <div className="ratio-row">
            {RATIOS.map((r) => (
              <button key={r.id} className={`ratio-card ${ratio === r.id ? 'active' : ''}`} onClick={() => setRatio(r.id)}>
                <span className="ratio-shape" style={{ aspectRatio: `${r.w}/${r.h}` }} />
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-block">
          <label>Variantlar</label>
          <div className="segmented">
            <button className={count === 1 ? 'active' : ''} onClick={() => setCount(1)}>1 rasm · {costs?.image ?? 5} kredit</button>
            <button className={count === 4 ? 'active' : ''} onClick={() => setCount(4)}>4 rasm · {(costs?.image ?? 5) * 4} kredit</button>
          </div>
        </div>

        <div className="prompt-tip">
          <Icon name="wand" size={16} />
          <p>Yaxshi prompt: subyekt + muhit + yorug‘lik + uslub. Masalan: “qizil sharfdagi sayyoh, cheksiz cho‘l, oltin quyosh, kinematik kadr”.</p>
        </div>
      </section>

      <div className="wizard-footer">
        <div className="wizard-footer-info">
          <Icon name="star" size={15} />
          <span>{cost} kredit</span>
          <span className="sep">•</span>
          <span>{user.credits} mavjud</span>
        </div>
        <Button onClick={generate} loading={busy} icon="sparkles">Yaratish</Button>
      </div>
    </div>
  );
}
