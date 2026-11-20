import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(process.cwd(), 'web', 'public', 'media');
fs.mkdirSync(outDir, { recursive: true });

const samples = [
  {
    file: 'frame-1.jpg',
    prompt: 'cinematic anime key visual, young Central Asian female hacker with short dark hair and amber eyes, black techwear jacket, standing on a rainy neon-lit Tashkent street at night, purple and cyan lights, wet reflections, ultra detailed, dramatic composition, vertical 9:16'
  },
  {
    file: 'frame-2.jpg',
    prompt: 'cinematic anime close-up portrait of the same young Central Asian female hacker, short dark hair, amber eyes, neon reflections on her face, determined expression, rainy cyberpunk city bokeh background, purple and cyan, ultra detailed, vertical 9:16'
  },
  {
    file: 'frame-3.jpg',
    prompt: 'cinematic anime, young Central Asian female hacker in black techwear walking through a futuristic night bazaar in Tashkent, holographic signs, neon rain, steam, crowd silhouettes, purple cyan palette, ultra detailed, vertical 9:16'
  },
  {
    file: 'frame-4.jpg',
    prompt: 'cinematic anime, young Central Asian female hacker facing a giant glowing blue portal between old Soviet apartment buildings, energy particles, rain, dramatic scale, night, ultra detailed, vertical 9:16'
  },
  {
    file: 'frame-5.jpg',
    prompt: 'cinematic anime, young Central Asian female hacker on a rooftop at night overlooking a futuristic Tashkent skyline, holding a glowing data chip, wind in her hair, purple and cyan neon, ultra detailed, vertical 9:16'
  },
  {
    file: 'frame-6.jpg',
    prompt: 'cinematic anime, mysterious android villain in a long dark coat with glowing red eyes, standing in a rainy neon alley, smoke, ominous mood, purple and red lighting, ultra detailed, vertical 9:16'
  },
  {
    file: 'style-3d.jpg',
    prompt: 'stylized 3D animated character portrait, young Central Asian explorer with a red scarf, Pixar-like rendering, warm rim light, dark cinematic background, vertical 9:16'
  },
  {
    file: 'style-comic.jpg',
    prompt: 'comic book illustration, young Central Asian hero with a leather jacket, bold ink lines, halftone dots, dramatic purple and orange lighting, vertical 9:16'
  },
  {
    file: 'style-real.jpg',
    prompt: 'cinematic realistic portrait of a young Central Asian man, film still, moody teal and amber lighting, shallow depth of field, 35mm, vertical 9:16'
  },
  {
    file: 'desert.jpg',
    prompt: 'cinematic wide shot, lone traveler in a red scarf on an alien desert, giant ringed planet in an orange sky, epic sci-fi concept art, vertical 9:16'
  },
  {
    file: 'forest.jpg',
    prompt: 'mysterious glowing blue forest at night, bioluminescent plants, fantasy concept art, cinematic fog, vertical 9:16'
  },
  {
    file: 'abstract.jpg',
    prompt: 'abstract 3D chrome and glass shapes, violet and cyan gradient, dark studio background, premium modern logo aesthetic, vertical 9:16'
  }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [i, s] of samples.entries()) {
  const target = path.join(outDir, s.file);
  if (fs.existsSync(target) && fs.statSync(target).size > 10000) {
    console.log(`[${i + 1}/${samples.length}] skip ${s.file}`);
    continue;
  }
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(s.prompt)}?width=720&height=1280&seed=${100 + i * 17}&nologo=true&referrer=ministudio`;
  let ok = false;
  for (let attempt = 1; attempt <= 5 && !ok; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000) throw new Error(`too small: ${buf.length}`);
      fs.writeFileSync(target, buf);
      console.log(`[${i + 1}/${samples.length}] saved ${s.file} (${Math.round(buf.length / 1024)} KB)`);
      ok = true;
    } catch (err) {
      console.log(`[${i + 1}/${samples.length}] attempt ${attempt} failed ${s.file}: ${err.message}`);
      await sleep(3500 * attempt);
    }
  }
  if (!ok) console.log(`[${i + 1}/${samples.length}] GAVE UP ${s.file}`);
  await sleep(1200);
}
console.log('Samples done.');
