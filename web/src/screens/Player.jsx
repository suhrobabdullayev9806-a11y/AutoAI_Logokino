import { useEffect, useRef, useState } from 'react';
import { Artwork } from '../components.jsx';
import { Icon } from '../icons.jsx';
import { openExternal, shareText } from '../telegram.js';

export default function Player({ work, startEpisode = 0, onClose, notify }) {
  const story = work.story;
  const episodes = story?.episodes || [];
  const [epIndex, setEpIndex] = useState(Math.min(startEpisode, Math.max(0, episodes.length - 1)));
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef(null);

  const episode = episodes[epIndex];
  const scenes = episode?.scenes || [];
  const scene = scenes[sceneIndex];
  const videoUrl = episode?.videoUrl || work.video?.url || '';
  const hasVideo = Boolean(videoUrl) && !videoFailed;

  useEffect(() => {
    if (hasVideo || !playing) return;
    const timer = setInterval(() => {
      setSceneIndex((current) => {
        if (current < scenes.length - 1) return current + 1;
        if (epIndex < episodes.length - 1) {
          setEpIndex((e) => e + 1);
          return 0;
        }
        setPlaying(false);
        return current;
      });
    }, 4300);
    return () => clearInterval(timer);
  }, [hasVideo, playing, epIndex, scenes.length, episodes.length]);

  useEffect(() => {
    setSceneIndex(0);
  }, [epIndex]);

  useEffect(() => {
    if (hasVideo || muted || !playing || !scene?.caption) {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
      return;
    }
    try {
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(scene.caption);
      u.lang = 'uz-UZ';
      u.rate = 0.95;
      const voices = window.speechSynthesis?.getVoices?.() || [];
      const uz = voices.find((v) => /uz|turk/i.test(v.lang));
      if (uz) u.voice = uz;
      window.speechSynthesis?.speak(u);
    } catch { /* ignore */ }
    return () => {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    };
  }, [hasVideo, epIndex, sceneIndex, muted, playing, scene?.caption]);

  useEffect(() => () => {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  }, []);

  if (!story || !episode) return null;

  const goEpisode = (index) => {
    setVideoFailed(false);
    setEpIndex(index);
    setSceneIndex(0);
    setPlaying(true);
  };

  const download = () => {
    if (!videoUrl) return notify('Bu ishda MP4 yo‘q');
    openExternal(new URL(videoUrl, window.location.origin).href);
    notify('MP4 yangi oynada ochildi');
  };

  if (hasVideo) {
    return (
      <div className="player">
        <div className="player-stage video-stage">
          <video
            key={videoUrl}
            ref={videoRef}
            className="player-video"
            src={videoUrl}
            poster={episode.scenes?.[0]?.img || work.poster}
            controls
            autoPlay
            playsInline
            onError={() => setVideoFailed(true)}
            onEnded={() => {
              if (epIndex < episodes.length - 1) goEpisode(epIndex + 1);
            }}
          />
          <div className="video-topbar">
            <button className="player-icon" onClick={onClose} aria-label="Yopish"><Icon name="x" size={20} /></button>
            <div className="player-episode">
              <span>{story.title}</span>
              <strong>{episode.title}</strong>
            </div>
            <button className="player-icon" onClick={download} aria-label="MP4 yuklab olish">
              <Icon name="download" size={18} />
            </button>
            <button className="player-icon" onClick={() => shareText(`🎬 ${story.title} — ${episode.title}`)} aria-label="Ulashish">
              <Icon name="share" size={18} />
            </button>
          </div>

          {episodes.length > 1 ? (
            <div className="player-episode-strip">
              {episodes.map((ep, i) => (
                <button key={ep.n} className={i === epIndex ? 'active' : ''} onClick={() => goEpisode(i)}>
                  {i + 1}-qism
                </button>
              ))}
            </div>
          ) : null}

          <div className="video-foot">
            <span><span className="dot" /> {work.video?.provider || 'AI video'}</span>
            <span>{episode.durationSec ? `${Math.round(episode.durationSec)}s` : ''}</span>
          </div>
        </div>
      </div>
    );
  }

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    }
  };

  return (
    <div className="player">
      <div className="player-stage">
        <Artwork
          key={`${epIndex}-${sceneIndex}`}
          src={scene?.img}
          fallback={scene?.fallback}
          alt=""
          className={`player-art kb-${sceneIndex % 2 === 0 ? 'a' : 'b'}`}
        />

        <div className="player-vignette" />
        <div className="player-grain" />

        <div className="player-top">
          <button className="player-icon" onClick={onClose} aria-label="Yopish"><Icon name="x" size={20} /></button>
          <div className="player-episode">
            <span>{story.title}</span>
            <strong>{episode.title}</strong>
          </div>
          <button className="player-icon" onClick={() => shareText(`🎬 ${story.title} — ${episode.title}`)} aria-label="Ulashish">
            <Icon name="share" size={18} />
          </button>
        </div>

        <div className="player-caption">
          <span className="ai-tag"><span className="dot" /> AI SUBTITR</span>
          <p>{scene?.caption}</p>
        </div>

        {!playing ? (
          <button className="player-center" onClick={() => setPlaying(true)} aria-label="Davom etish">
            <Icon name="play" size={30} />
          </button>
        ) : null}

        <div className="player-controls">
          <div className="segments">
            {scenes.map((_, i) => (
              <span key={i} className={i <= sceneIndex ? 'done' : ''} />
            ))}
          </div>
          <div className="player-actions">
            <button className="player-icon small" onClick={toggleMute} aria-label={muted ? 'Ovozni yoqish' : 'Ovozni o‘chirish'}>
              <Icon name={muted ? 'mute' : 'volume'} size={18} />
            </button>
            <button className="player-main" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pauza' : 'O‘ynatish'}>
              <Icon name={playing ? 'pause' : 'play'} size={22} />
            </button>
            <button className="player-icon small" onClick={download} aria-label="MP4">
              <Icon name="download" size={18} />
            </button>
          </div>
          <div className="player-hint">
            <span>{epIndex + 1}-qism</span>
            <span className="dot" />
            <span>{sceneIndex + 1} / {scenes.length} kadr</span>
            <span className="dot" />
            <span>Demo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
