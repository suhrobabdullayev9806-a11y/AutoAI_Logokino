import { useEffect, useRef, useState } from 'react';
import { Button, ProgressOrb, TopBar } from '../components.jsx';
import { Icon } from '../icons.jsx';
import { getJob } from '../api.js';
import { TIPS } from '../data.js';

export default function JobScreen({ job: initialJob, kind, onDone, onUser, notify }) {
  const [job, setJob] = useState(initialJob);
  const [error, setError] = useState('');
  const doneRef = useRef(false);

  useEffect(() => {
    let stop = false;
    let timer = null;

    const tick = async () => {
      try {
        const data = await getJob(initialJob.id);
        if (stop) return;
        setError('');
        setJob(data.job);
        if (data.user) onUser?.(data.user);
        if (data.job.status === 'done' && !doneRef.current) {
          doneRef.current = true;
          timer = setTimeout(() => onDone(data.job.result), 650);
        }
      } catch (err) {
        if (!stop) setError(err.message || 'Ulanish xatosi');
      }
    };

    tick();
    const interval = setInterval(tick, 700);

    return () => {
      stop = true;
      clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, [initialJob.id]);

  const isSerial = kind === 'serial';
  const title = isSerial ? 'Serial yaratilmoqda' : 'Rasm chizilmoqda';
  const sub = isSerial
    ? 'AI ssenariy, personaj va kadrlarni tayyorlayapti. Bu 15–20 soniya oladi.'
    : 'AI promptni tahlil qilib, tasvirni yaratyapti. Bir necha soniya.';

  return (
    <div className="screen job-screen">
      <TopBar title={isSerial ? 'SERIAL' : 'RASM'} right={<span className="live-badge"><span className="dot" /> LIVE</span>} />
      <div className="job-body">
        <ProgressOrb value={job.progress || 0} />
        <h1 className="job-title">{title}</h1>
        <p className="job-sub">{job.stage || 'Navbatda...'}</p>

        <div className="stage-list">
          {(job.stages || []).map((stage, i) => (
            <div key={i} className={`stage-row ${stage.done ? 'done' : ''} ${stage.active ? 'active' : ''}`}>
              <span className="stage-dot">{stage.done ? <Icon name="check" size={13} strokeWidth={2.6} /> : null}</span>
              <span>{stage.label}</span>
              {stage.active ? <span className="stage-pulse" /> : null}
            </div>
          ))}
        </div>

        <div className="tip-card">
          <span className="tip-icon"><Icon name="sparkles" size={17} /></span>
          <p>{TIPS[isSerial ? 1 : 3]}</p>
        </div>

        {error ? <p className="job-error">{error} — qayta urinilmoqda...</p> : null}
        <p className="job-note">Bu ekran yopilsa ham jarayon serverda davom etadi.</p>

        <div className="job-skeleton">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}
