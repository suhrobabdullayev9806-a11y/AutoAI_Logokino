import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { EdgeTTS } from 'node-edge-tts';
import { buildSeries, pollinationsUrl } from './story.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MEDIA_ROOT = path.join(ROOT, 'web', 'public', 'media');
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function getGeminiKey(settings) {
  return String(settings?.ai?.geminiApiKey || '').trim();
}

export function aiConfigured(settings) {
  return Boolean(getGeminiKey(settings));
}

async function geminiCall(settings, model, body, timeout = 120000) {
  const key = getGeminiKey(settings);
  if (!key) throw new Error('Gemini API kaliti sozlanmagan');
  const res = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Gemini ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

function parseJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('AI bo‘sh javob qaytardi');
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error('AI javobini JSON qilib o‘qib bo‘lmadi');
  }
}

function cleanText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function normalizeScript(data, input, base) {
  const episodesSource = Array.isArray(data?.episodes) ? data.episodes : [];
  const charactersSource = Array.isArray(data?.characters) ? data.characters : [];
  const wantedEpisodes = base.episodes.length;
  const wantedScenes = base.episodes[0]?.scenes.length || 6;

  const characters = base.characters.map((fallback, index) => {
    const item = charactersSource[index] || {};
    return {
      ...fallback,
      name: cleanText(item.name, fallback.name).slice(0, 36),
      role: cleanText(item.role, fallback.role).slice(0, 48),
      look: cleanText(item.look, fallback.look).slice(0, 300)
    };
  });

  const episodes = Array.from({ length: wantedEpisodes }, (_, epIndex) => {
    const fallbackEp = base.episodes[epIndex];
    const sourceEp = episodesSource[epIndex] || {};
    const sourceScenes = Array.isArray(sourceEp.scenes) ? sourceEp.scenes : [];
    return {
      ...fallbackEp,
      title: cleanText(sourceEp.title, fallbackEp.title).slice(0, 80),
      hook: cleanText(sourceEp.hook, fallbackEp.hook).slice(0, 240),
      scenes: Array.from({ length: wantedScenes }, (_, sceneIndex) => {
        const fallbackScene = fallbackEp.scenes[sceneIndex];
        const sourceScene = sourceScenes[sceneIndex] || {};
        const caption = cleanText(sourceScene.caption, fallbackScene.caption).slice(0, 220);
        return {
          ...fallbackScene,
          n: sceneIndex + 1,
          caption,
          imagePrompt: cleanText(
            sourceScene.imagePrompt || sourceScene.image_prompt,
            `${base.styleLabel} style, ${caption}, cinematic vertical frame, detailed`
          ).slice(0, 900),
          duration: fallbackScene.duration
        };
      })
    };
  });

  return {
    ...base,
    title: cleanText(data?.title, base.title).toUpperCase().slice(0, 64),
    logline: cleanText(data?.logline, base.logline).slice(0, 500),
    characters,
    episodes,
    provider: 'gemini',
    promptUsed: input.idea
  };
}

export async function generateScript(input, settings) {
  const base = buildSeries(input);
  const provider = settings?.ai?.scriptProvider || 'auto';
  if (provider === 'demo' || !getGeminiKey(settings)) {
    return { ...base, provider: 'demo' };
  }

  const model = settings.ai.textModel || 'gemini-2.5-flash';
  const genreLabel = base.genreLabel;
  const styleLabel = base.styleLabel;
  const episodes = base.episodes.length;
  const scenes = base.episodes[0]?.scenes.length || 6;

  const prompt = `Sen MiniStudio uchun o'zbek tilida professional mini-serial ssenariy yozuvchi rejissyorsan.
Foydalanuvchi g'oyasi: "${input.idea || base.logline}"
Janr: ${genreLabel}
Vizual uslub: ${styleLabel}
Epizodlar soni: ${episodes}
Har bir epizodda kadrlar soni: ${scenes}
Har bir kadr davomiyligi: ${Math.round((base.duration || 60) / scenes)} soniya

Talablar:
1. Butun ssenariy o'zbek tilida (lotin alifbosida) bo'lsin.
2. Har bir epizod qiziqarli hook bilan boshlansin va keyingi epizodga savol qoldirsin.
3. Har bir kadr caption'i 7-18 so'zdan iborat, ovoz bilan o'qiladigan tabiiy gap bo'lsin.
4. imagePrompt ingliz tilida, juda batafsil: personaj tashqi ko'rinishi, joy, yorug'lik, kamera, uslub. Har bir epizodda personajlar bir xil ko'rinishda qolsin.
5. Faqat JSON qaytar, boshqa matn yozma.

JSON formati:
{
  "title": "QISQA NOM",
  "logline": "1-2 jumlada syujet",
  "characters": [
    { "name": "Ism", "role": "Rol", "look": "English visual description" }
  ],
  "episodes": [
    {
      "title": "1-qism. Sarlavha",
      "hook": "Epizod hooki",
      "scenes": [
        { "caption": "O'zbekcha ovoz matni", "imagePrompt": "English cinematic image prompt" }
      ]
    }
  ]
}`;

  try {
    const data = await geminiCall(settings, model, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    });
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || '')
      .join('');
    const script = parseJson(text);
    return normalizeScript(script, input, base);
  } catch (err) {
    console.error('[ai] ssenariy xatosi:', err.message);
    return { ...base, provider: 'demo', aiWarning: err.message };
  }
}

/* --------------------------------- images -------------------------------- */

function resolveFallback(fallbackPath) {
  const raw = String(fallbackPath || '').trim();
  if (!raw) return path.join(MEDIA_ROOT, 'abstract.jpg');
  if (raw.startsWith('/media/')) return path.join(MEDIA_ROOT, raw.slice('/media/'.length));
  if (path.isAbsolute(raw)) return raw;
  return path.join(ROOT, raw);
}

async function copyFallback(fallbackPath, outPath) {
  const source = resolveFallback(fallbackPath);
  try {
    await fsp.mkdir(path.dirname(outPath), { recursive: true });
    await fsp.copyFile(source, outPath);
    return true;
  } catch {
    return false;
  }
}

async function downloadImage(url, outPath, timeout = 75000) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MiniStudio/1.0 (+https://github.com/)',
        Accept: 'image/*'
      },
      signal: AbortSignal.timeout(timeout)
    });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 2048) return false;
    await fsp.mkdir(path.dirname(outPath), { recursive: true });
    await fsp.writeFile(outPath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function geminiImage(settings, prompt, outPath) {
  const model = settings.ai.imageModel || 'gemini-2.5-flash-image';
  const data = await geminiCall(
    settings,
    model,
    {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    },
    150000
  );
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  if (!imagePart) throw new Error('Gemini rasm qaytarmadi');
  const inline = imagePart.inlineData || imagePart.inline_data;
  const buffer = Buffer.from(inline.data, 'base64');
  if (buffer.length < 2048) throw new Error('Gemini rasm juda kichik');
  await fsp.mkdir(path.dirname(outPath), { recursive: true });
  await fsp.writeFile(outPath, buffer);
  return true;
}

export async function generateImageFile({
  settings,
  prompt,
  outPath,
  fallbackPath,
  seed = crypto.randomBytes(3).readUIntBE(0, 3),
  width = 720,
  height = 1280
}) {
  const provider = settings?.ai?.imageProvider || 'auto';
  const hasKey = Boolean(getGeminiKey(settings));

  if (hasKey && (provider === 'auto' || provider === 'gemini')) {
    try {
      const fullPrompt = `${prompt}. Vertical ${width}x${height} composition, high detail, no text, no watermark.`;
      await geminiImage(settings, fullPrompt, outPath);
      return { path: outPath, provider: 'gemini' };
    } catch (err) {
      console.error('[ai] Gemini rasm xatosi:', err.message);
      if (provider === 'gemini') {
        const copied = await copyFallback(fallbackPath, outPath);
        if (copied) return { path: outPath, provider: 'local' };
        throw err;
      }
    }
  }

  if (provider !== 'local' && provider !== 'gemini') {
    const url = pollinationsUrl(prompt, seed, width, height);
    if (await downloadImage(url, outPath)) return { path: outPath, provider: 'pollinations' };
  }

  if (await copyFallback(fallbackPath, outPath)) return { path: outPath, provider: 'local' };
  throw new Error('Rasm faylini tayyorlab bo‘lmadi');
}

/* ---------------------------------- voice -------------------------------- */

function wavHeader(dataLength, sampleRate = 24000, channels = 1, bits = 16) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bits / 8), 28);
  header.writeUInt16LE(channels * (bits / 8), 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

async function geminiSpeech(settings, text, outPath, voice) {
  const model = settings.ai.ttsModel || 'gemini-2.5-flash-preview-tts';
  const voiceName =
    voice === 'male'
      ? settings.ai.geminiMaleVoice || 'Puck'
      : settings.ai.geminiFemaleVoice || settings.ai.ttsVoice || 'Kore';
  const data = await geminiCall(
    settings,
    model,
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: `O‘zbek tilida, tabiiy va ifodali ovoz bilan o‘qing: ${text}` }]
        }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        }
      }
    },
    150000
  );
  const part = (data.candidates?.[0]?.content?.parts || []).find(
    (p) => p.inlineData?.data || p.inline_data?.data
  );
  if (!part) throw new Error('Gemini ovoz qaytarmadi');
  const inline = part.inlineData || part.inline_data;
  const mime = String(inline.mimeType || inline.mime_type || '');
  const buffer = Buffer.from(inline.data, 'base64');
  if (buffer.length < 1000) throw new Error('Gemini ovoz juda kichik');

  if (mime.includes('wav') || mime.includes('mpeg') || mime.includes('mp3')) {
    await fsp.writeFile(outPath, buffer);
    return outPath;
  }

  const wavPath = outPath.replace(/\.(mp3|wav|m4a)$/i, '.wav');
  await fsp.writeFile(wavPath, Buffer.concat([wavHeader(buffer.length), buffer]));
  return wavPath;
}

async function edgeSpeech(settings, text, outPath, voice) {
  const female = settings.ai.edgeFemaleVoice || 'uz-UZ-MadinaNeural';
  const male = settings.ai.edgeMaleVoice || 'uz-UZ-SardorNeural';
  const candidates = [
    voice === 'male' ? male : female,
    'tr-TR-EmelNeural',
    'ru-RU-SvetlanaNeural'
  ];
  let lastError = null;

  for (const voiceName of [...new Set(candidates)]) {
    const lang = voiceName.slice(0, 5);
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const tts = new EdgeTTS({
          voice: voiceName,
          lang,
          outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
          rate: voice === 'male' ? '-2%' : '+0%',
          timeout: 90000
        });
        await tts.ttsPromise(text, outPath);
        const size = (await fsp.stat(outPath)).size;
        if (size < 1000) throw new Error('Edge TTS bo‘sh fayl qaytardi');
        return outPath;
      } catch (err) {
        lastError = err;
        if (attempt < 4) await new Promise((r) => setTimeout(r, 1800 * attempt));
      }
    }
  }

  throw lastError || new Error('Edge TTS xatosi');
}

function cleanSpeechText(text) {
  return String(text || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[*#_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 900);
}

export async function synthesizeSpeech({ settings, text, outPath, voice = 'female' }) {
  const cleaned = cleanSpeechText(text);
  if (!cleaned) return null;
  const provider = settings?.ai?.voiceProvider || 'auto';
  const hasKey = Boolean(getGeminiKey(settings));

  if (hasKey && (provider === 'auto' || provider === 'gemini')) {
    try {
      const file = await geminiSpeech(settings, cleaned, outPath.replace(/\.[a-z0-9]+$/i, '.wav'), voice);
      return { file, provider: 'gemini' };
    } catch (err) {
      console.error('[ai] Gemini TTS xatosi:', err.message);
      if (provider === 'gemini') return null;
    }
  }

  if (provider === 'gemini') return null;

  try {
    const file = await edgeSpeech(settings, cleaned, outPath.replace(/\.[a-z0-9]+$/i, '.mp3'), voice);
    return { file, provider: 'edge' };
  } catch (err) {
    console.error('[ai] Edge TTS xatosi:', err.message);
    return null;
  }
}

/* ---------------------------------- test --------------------------------- */

export async function testGemini(settings) {
  const key = getGeminiKey(settings);
  if (!key) return { ok: false, error: 'Gemini API kaliti kiritilmagan' };
  const res = await fetch(`${GEMINI_BASE}/models?pageSize=50`, {
    headers: { 'x-goog-api-key': key },
    signal: AbortSignal.timeout(30000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  const names = (data.models || []).map((m) => String(m.name || '').replace(/^models\//, ''));
  const wanted = [settings.ai.textModel, settings.ai.imageModel, settings.ai.ttsModel].filter(Boolean);
  return {
    ok: true,
    models: names.slice(0, 30),
    missing: wanted.filter((m) => !names.includes(m)),
    message: `Ulanish muvaffaqiyatli. ${names.length} model topildi.`
  };
}
