export const getTg = () => window.Telegram?.WebApp;

export function initTelegram() {
  const tg = getTg();
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#07080c');
    tg.setBackgroundColor?.('#07080c');
    tg.disableVerticalSwipes?.();
    tg.enableClosingConfirmation?.();
  } catch {
    /* ignore */
  }
}

export function haptic(type = 'light') {
  const tg = getTg();
  try {
    if (type === 'success') tg?.HapticFeedback?.notificationOccurred('success');
    else if (type === 'error') tg?.HapticFeedback?.notificationOccurred('error');
    else if (type === 'select') tg?.HapticFeedback?.selectionChanged();
    else tg?.HapticFeedback?.impactOccurred(type);
  } catch {
    /* ignore */
  }
}

export function showBackButton(visible, onClick) {
  const tg = getTg();
  if (!tg) return () => {};
  try {
    if (visible) {
      tg.BackButton.show?.();
      const handler = () => onClick?.();
      tg.BackButton.onClick(handler);
      return () => {
        tg.BackButton.offClick(handler);
        tg.BackButton.hide?.();
      };
    }
    tg.BackButton.hide?.();
  } catch {
    /* ignore */
  }
  return () => {};
}

export function shareText(text) {
  const url = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/Sunnexai_bot')}&text=${encodeURIComponent(text)}`;
  const tg = getTg();
  try {
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank');
  } catch {
    window.open(url, '_blank');
  }
}

export function openExternal(url) {
  const tg = getTg();
  try {
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank', 'noopener');
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

export function openInvoice(url) {
  return new Promise((resolve) => {
    const tg = getTg();
    if (!tg?.openInvoice) {
      openExternal(url);
      resolve('opened');
      return;
    }
    try {
      tg.openInvoice(url, (status) => resolve(status));
    } catch {
      resolve('failed');
    }
  });
}
