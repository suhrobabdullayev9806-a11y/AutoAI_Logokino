const P = {
  home: <path d="M3.2 10.8 12 3l8.8 7.8V20a1 1 0 0 1-1 1h-4.9v-6.4H9.1V21H4.2a1 1 0 0 1-1-1z" />,
  film: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <path d="M7.5 4.5v4M16.5 4.5v4M7.5 15.5v4M16.5 15.5v4M3 10h18M3 14h18" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3.5" width="18" height="17" rx="3.5" />
      <circle cx="8.5" cy="9" r="1.6" />
      <path d="m4.5 17 4.7-4.4a2 2 0 0 1 2.7 0l2.2 2 1.8-1.6a2 2 0 0 1 2.6 0l1 1" />
    </>
  ),
  library: (
    <>
      <rect x="4" y="3.5" width="4" height="17" rx="1.4" />
      <rect x="10" y="3.5" width="4" height="17" rx="1.4" />
      <path d="m16.6 5 2.5-.7a1.5 1.5 0 0 1 1.8 1l3 14a1.5 1.5 0 0 1-1 1.7l-1.6.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.2a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
      <path d="m5 14 .7 1.8 1.8.7-1.8.7L5 19l-.7-1.8L2.5 16.5l1.8-.7z" />
    </>
  ),
  arrowRight: <path d="M5 12h14m-5-5 5 5-5 5" />,
  arrowLeft: <path d="M19 12H5m5-5-5 5 5 5" />,
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.6" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  download: <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16" />,
  share: (
    <>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="m8.4 10.8 7.2-4.2M8.4 13.2l7.2 4.2" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-2.5 7-2.5 8.5h17C20.5 16 18 16 18 9" />
      <path d="M10.2 20a2 2 0 0 0 3.6 0" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v6c0 4.5 3 7.6 7.5 9 4.5-1.4 7.5-4.5 7.5-9V6z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  zap: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  star: <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.1-5.6-3-5.6 3 1.1-6.1L3 9.7l6.2-.9z" />,
  refresh: (
    <>
      <path d="M20 8a8 8 0 1 0 .6 7" />
      <path d="M20 3v5h-5" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5h3L12 5v14l-5-4.5H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3L12 5v14l-5-4.5H4z" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.3 2" />
    </>
  ),
  wand: (
    <>
      <path d="m4 20 11-11M14.5 3.5l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
      <path d="m19 14 .6 1.8 1.9.7-1.9.7L19 19l-.6-1.8-1.9-.7 1.9-.7z" />
    </>
  ),
  logo: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="m7.5 15 2.6-6 2.4 4 1.6-2.5L17 15" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3.2 3.2 0 0 1 0 6M18 14a6 6 0 0 1 3 5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8" />
    </>
  ),
  expand: <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
};

export function Icon({ name, size = 22, strokeWidth = 1.8, className = '', style }) {
  const path = P[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
