import { COSTS, PACKAGES } from './packages.js';

export const DEFAULT_SETTINGS = {
  ai: {
    scriptProvider: 'auto', // auto | gemini | demo
    imageProvider: 'auto', // auto | gemini | pollinations | local
    voiceProvider: 'auto', // auto | gemini | edge
    geminiApiKey: '',
    textModel: 'gemini-2.5-flash',
    imageModel: 'gemini-2.5-flash-image',
    ttsModel: 'gemini-2.5-flash-preview-tts',
    ttsVoice: 'Kore',
    geminiFemaleVoice: 'Kore',
    geminiMaleVoice: 'Puck',
    edgeFemaleVoice: 'uz-UZ-MadinaNeural',
    edgeMaleVoice: 'uz-UZ-SardorNeural',
    renderWidth: 720,
    renderHeight: 1280,
    fps: 24,
    videoProvider: 'ffmpeg', // ffmpeg | veo (veo keyingi bosqichda)
    veoModel: 'veo-3.1-fast-generate-preview'
  },
  costs: { ...COSTS },
  packages: PACKAGES.map((p) => ({ ...p })),
  payment: {
    mode: 'demo', // demo | stars | card
    cardNumber: '',
    cardHolder: '',
    cardExpiry: '',
    autoApprove: false,
    instructions:
      'Kartaga o‘tkazma qiling, so‘ng bank chekidagi to‘lov kodini kiriting. Admin tekshirgandan keyin kredit qo‘shiladi.'
  },
  limits: {
    maxEpisodes: 5,
    maxScenes: 6,
    demoTopup: true
  },
  updatedAt: null
};

export function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch.map((item) => (item && typeof item === 'object' ? deepMerge({}, item) : item));
  if (!patch || typeof patch !== 'object') return patch;
  const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function detectCardNetwork(number) {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.startsWith('9860')) return 'Humo';
  if (digits.startsWith('8600')) return 'UzCard';
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  return 'Karta';
}

export function normalizeCardNumber(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();
}

export function maskSecret(value) {
  const raw = String(value || '');
  if (!raw) return '';
  if (raw.length <= 8) return '••••••••';
  return `${raw.slice(0, 4)}••••••••${raw.slice(-4)}`;
}

export function publicSettings(settings) {
  const payment = settings.payment || {};
  const configured =
    String(payment.cardNumber || '').replace(/\D/g, '').length >= 16 && Boolean(payment.cardHolder);

  return {
    costs: settings.costs,
    packages: settings.packages,
    payment: {
      mode: payment.mode || 'demo',
      configured,
      cardNumber: configured ? payment.cardNumber : '',
      cardHolder: configured ? payment.cardHolder : '',
      cardExpiry: configured ? payment.cardExpiry : '',
      network: configured ? detectCardNetwork(payment.cardNumber) : '',
      autoApprove: Boolean(payment.autoApprove),
      instructions: payment.instructions || ''
    },
    ai: {
      configured: Boolean(String(settings.ai?.geminiApiKey || '').trim()),
      textModel: settings.ai?.textModel || '',
      imageModel: settings.ai?.imageModel || '',
      ttsModel: settings.ai?.ttsModel || '',
      imageProvider: settings.ai?.imageProvider || 'auto',
      voiceProvider: settings.ai?.voiceProvider || 'auto',
      scriptProvider: settings.ai?.scriptProvider || 'auto'
    },
    limits: {
      maxEpisodes: Number(settings.limits?.maxEpisodes) || 5,
      maxScenes: Number(settings.limits?.maxScenes) || 6
    }
  };
}

export function adminSettingsView(settings) {
  return {
    ...settings,
    ai: {
      ...settings.ai,
      geminiApiKey: '',
      hasGeminiKey: Boolean(String(settings.ai?.geminiApiKey || '').trim()),
      geminiKeyMasked: maskSecret(settings.ai?.geminiApiKey)
    },
    payment: {
      ...settings.payment,
      network: detectCardNetwork(settings.payment?.cardNumber)
    }
  };
}
