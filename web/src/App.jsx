import { useEffect, useRef, useState } from 'react';
import { auth, getConfig, loadMe } from './api.js';
import { getTg, haptic, initTelegram, openExternal, showBackButton } from './telegram.js';
import { Icon } from './icons.jsx';
import { CreditPill, Wordmark } from './components.jsx';
import Home from './screens/Home.jsx';
import SerialWizard from './screens/SerialWizard.jsx';
import JobScreen from './screens/JobScreen.jsx';
import SerialResult from './screens/SerialResult.jsx';
import Player from './screens/Player.jsx';
import ImageStudio from './screens/ImageStudio.jsx';
import ImageResult from './screens/ImageResult.jsx';
import Library from './screens/Library.jsx';
import Profile from './screens/Profile.jsx';
import PaymentSheet from './screens/PaymentSheet.jsx';
import Admin from './screens/Admin.jsx';

const TABS = [
  { id: 'home', label: 'Asosiy', icon: 'home' },
  { id: 'library', label: 'Kutubxona', icon: 'library' },
  { id: 'profile', label: 'Profil', icon: 'user' }
];

export default function App() {
  const [boot, setBoot] = useState('loading');
  const [bootError, setBootError] = useState('');
  const [user, setUser] = useState(null);
  const [works, setWorks] = useState([]);
  const [config, setConfig] = useState(null);
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [needCost, setNeedCost] = useState(0);
  const [toast, setToast] = useState('');
  const toastRef = useRef(null);
  const deepLinkRef = useRef(false);

  const notify = (message) => {
    setToast(message);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 3200);
  };

  const refresh = async () => {
    try {
      const data = await loadMe();
      setUser(data.user);
      setWorks(data.works || []);
      return data;
    } catch (err) {
      notify(err.message);
      return null;
    }
  };

  const bootApp = async () => {
    setBoot('loading');
    setBootError('');
    try {
      initTelegram();
      const cfg = await getConfig();
      setConfig(cfg);
      await auth();
      const me = await loadMe();
      setUser(me.user);
      setWorks(me.works || []);
      setBoot('ready');
    } catch (err) {
      setBootError(err.message || 'Ulanishda xatolik');
      setBoot('error');
    }
  };

  useEffect(() => {
    bootApp();
    return () => clearTimeout(toastRef.current);
  }, []);

  useEffect(() => {
    if (boot !== 'ready' || !user || deepLinkRef.current) return;
    deepLinkRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const target =
      params.get('screen') ||
      params.get('tgWebAppStartParam') ||
      window.Telegram?.WebApp?.initDataUnsafe?.start_param ||
      '';
    if (target === 'admin') {
      if (user.isAdmin) setStack([{ name: 'admin', params: {} }]);
      else notify('Admin panel faqat adminlar uchun');
    }
  }, [boot, user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [tab, stack.length]);

  useEffect(() => {
    return showBackButton(stack.length > 0, () => setStack((s) => s.slice(0, -1)));
  }, [stack.length]);

  const push = (name, params = {}) => {
    haptic('light');
    setStack((s) => [...s, { name, params }]);
  };
  const back = () => {
    haptic('light');
    setStack((s) => s.slice(0, -1));
  };
  const goTab = (id) => {
    haptic('select');
    setStack([]);
    setTab(id);
  };

  const openSerial = () => push('serial');
  const openImage = (prefill = '') => push('image', { prefill });
  const openWork = (work) => push(work.type === 'serial' ? 'serial-result' : 'image-result', { work });
  const openPay = (cost = 0) => {
    setNeedCost(cost);
    setPayOpen(true);
  };

  const startJob = (job, freshUser, kind) => {
    if (freshUser) setUser(freshUser);
    push('job', { job, kind });
  };

  const finishJob = (result) => {
    if (!result) return notify('Natija olinmadi, qayta urinib ko‘ring');
    haptic('success');
    setStack((s) => {
      const next = [...s];
      next[next.length - 1] = {
        name: result.type === 'serial' ? 'serial-result' : 'image-result',
        params: { work: result }
      };
      return next;
    });
    notify(result.type === 'serial' ? 'Serial tayyor! 🎬' : 'Rasm tayyor! 🖼');
    refresh();
  };

  const handlePaid = async (freshUser) => {
    if (freshUser) setUser(freshUser);
    else await refresh();
    setPayOpen(false);
    haptic('success');
  };

  if (boot !== 'ready') {
    return (
      <div className="app">
        <div className="app-bg" />
        {boot === 'loading' ? (
          <div className="boot">
            <div className="boot-logo"><Icon name="sparkles" size={34} /></div>
            <Wordmark />
            <div className="boot-bar"><span /></div>
            <p>Studiya yuklanmoqda...</p>
          </div>
        ) : (
          <div className="boot">
            <div className="boot-logo error"><Icon name="x" size={30} /></div>
            <h2>Ulanish xatosi</h2>
            <p>{bootError}</p>
            <button className="btn btn-primary boot-retry" onClick={bootApp}>Qayta urinish</button>
            {/telegram|initData|imzo/i.test(bootError) ? (
              <button className="btn btn-ghost boot-retry" onClick={() => openExternal('https://t.me/Sunnexai_bot')}>
                Telegram botni ochish
              </button>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  const view = stack[stack.length - 1];
  const hideNav = stack.length > 0;

  let content = null;
  if (view) {
    const p = view.params || {};
    if (view.name === 'serial') {
      content = (
        <SerialWizard
          user={user}
          costs={config?.costs}
          onBack={back}
          onCreated={(job, freshUser) => startJob(job, freshUser, 'serial')}
          onNeedCredits={openPay}
          notify={notify}
        />
      );
    } else if (view.name === 'image') {
      content = (
        <ImageStudio
          user={user}
          costs={config?.costs}
          prefill={p.prefill || ''}
          onBack={back}
          onCreated={(job, freshUser) => startJob(job, freshUser, 'image')}
          onNeedCredits={openPay}
          notify={notify}
        />
      );
    } else if (view.name === 'job') {
      content = (
        <JobScreen
          job={p.job}
          kind={p.kind}
          onDone={finishJob}
          onUser={setUser}
          notify={notify}
        />
      );
    } else if (view.name === 'serial-result') {
      content = (
        <SerialResult
          work={p.work}
          onBack={back}
          onPlay={(ep) => push('player', { work: p.work, startEpisode: ep })}
          onTopup={() => openPay(0)}
          notify={notify}
        />
      );
    } else if (view.name === 'image-result') {
      content = (
        <ImageResult
          work={p.work}
          onBack={back}
          onNew={(prompt) => {
            setStack((s) => s.slice(0, -1));
            push('image', { prefill: prompt });
          }}
          notify={notify}
        />
      );
    } else if (view.name === 'player') {
      content = (
        <Player
          work={p.work}
          startEpisode={p.startEpisode || 0}
          onClose={back}
          notify={notify}
        />
      );
    } else if (view.name === 'admin') {
      content = <Admin onBack={back} notify={notify} />;
    }
  } else if (tab === 'home') {
    content = (
      <Home
        user={user}
        works={works}
        costs={config?.costs}
        onSerial={openSerial}
        onImage={() => openImage()}
        onOpenWork={openWork}
        onTopup={() => openPay(0)}
        onLibrary={() => goTab('library')}
        onSoon={() => notify('Logotip generatori keyingi bosqichda qo‘shiladi')}
      />
    );
  } else if (tab === 'library') {
    content = (
      <Library
        works={works}
        onOpenWork={openWork}
        onSerial={openSerial}
        onImage={() => openImage()}
      />
    );
  } else if (tab === 'profile') {
    content = (
      <Profile
        user={user}
        works={works}
        onTopup={() => openPay(0)}
        onAdmin={() => push('admin')}
        onSoon={notify}
        notify={notify}
      />
    );
  }

  return (
    <div className="app">
      <div className="app-bg" />
      {content}

      {!hideNav ? (
        <nav className="bottom-nav">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => goTab(t.id)}>
              <Icon name={t.icon} size={22} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      ) : null}

      <PaymentSheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        config={config}
        user={user}
        onPaid={handlePaid}
        isTelegram={Boolean(getTg()?.initData)}
        notify={notify}
      />

      {needCost && payOpen ? (
        <div className="need-note">Bu amal uchun {needCost} kredit kerak</div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
