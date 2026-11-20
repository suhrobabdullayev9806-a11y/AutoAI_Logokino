import fs from 'node:fs';
import { EdgeTTS } from 'node-edge-tts';

const voices = ['uz-UZ-MadinaNeural', 'uz-UZ-SardorNeural', 'tr-TR-EmelNeural', 'ru-RU-SvetlanaNeural'];
const text = "Salom, bu MiniStudio. Sun'iy intellekt bilan mini serial yaratamiz.";

for (const voice of voices) {
  const lang = voice.slice(0, 5);
  const file = `tmp-${voice}.mp3`;
  try {
    const tts = new EdgeTTS({
      voice,
      lang,
      timeout: 30000,
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
    });
    await tts.ttsPromise(text, file);
    console.log(voice, fs.statSync(file).size);
  } catch (err) {
    console.log(voice, 'ERR', err.message);
  }
}
