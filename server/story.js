import crypto from 'node:crypto';

const STYLE_META = {
  anime: { label: 'Anime', prompt: 'cinematic anime key visual, cel shading, detailed line art' },
  '3d': { label: '3D', prompt: 'stylized 3D animation movie still, Pixar-like lighting, soft render' },
  comic: { label: 'Komiks', prompt: 'comic book illustration, bold ink lines, halftone texture' },
  real: { label: 'Realistik', prompt: 'cinematic photorealistic film still, 35mm, shallow depth of field' }
};

const LOCAL_FRAMES = {
  anime: ['/media/frame-1.jpg', '/media/frame-3.jpg', '/media/frame-5.jpg', '/media/frame-6.jpg'],
  '3d': ['/media/abstract.jpg', '/media/style-real.jpg', '/media/desert.jpg'],
  comic: ['/media/style-comic.jpg', '/media/frame-1.jpg', '/media/abstract.jpg'],
  real: ['/media/style-real.jpg', '/media/desert.jpg', '/media/frame-1.jpg']
};

const GENRE_META = {
  fantasy: { label: 'Fantastika', titles: ['YULDUZLAR DARVOZASI', 'KUMUSH SHAHAR', 'OXIRGI PORTAL', 'SAMO SARHADI'] },
  adventure: { label: 'Sarguzasht', titles: ['CHO‘L SAYYOHI', 'YO‘QOLGAN XARITA', 'SHARQ SHAMOLI'] },
  drama: { label: 'Drama', titles: ['KECHKI TOSHKENT', 'IKKI DUNYO', 'SUV OVOZI'] },
  mystery: { label: 'Sirli', titles: ['TUNGI QO‘NG‘IROQ', 'KO‘RINMAS IZ', 'YETTINCHI QAVAT'] },
  comedy: { label: 'Komediya', titles: ['OMADLI DUSHANBA', 'QO‘SHNINING SIRI', 'BAXT KELDI'] }
};

const HEROES = {
  anime: { name: 'Laylo', look: 'young Central Asian woman with short dark hair, amber eyes, black techwear jacket' },
  '3d': { name: 'Temur', look: 'stylized 3D young Central Asian explorer with a red scarf' },
  comic: { name: 'Bek', look: 'young Central Asian hero in a leather jacket, confident' },
  real: { name: 'Nodira', look: 'young Central Asian woman in a dark coat, cinematic realism' }
};

const SIDE_CHARACTERS = [
  { name: 'Orzu', role: 'Sirli android', look: 'mysterious android with glowing eyes in a dark coat' },
  { name: 'Bekzod', role: 'Isyonkor do‘st', look: 'young man with a techwear vest and a holographic tattoo' },
  { name: 'Nodira', role: 'Kuzatuvchi', look: 'elegant woman with silver hair and a glowing data visor' }
];

const EPISODE_NAMES = ['Signal', 'Darvozaga yo‘l', 'Tanlov', 'So‘nggi soniya', 'Yangi tong'];

const BEATS = {
  fantasy: [
    'Ertalab osmonda noma’lum yorug‘lik paydo bo‘ldi.',
    'Qadimiy darvoza shahar markazida ochildi.',
    'Qahramon o‘zini boshqa olamda ko‘rdi.',
    'Darvozani qo‘riqlayotgan kuch uyg‘ondi.',
    'Bir tanlov butun dunyoni o‘zgartirishi mumkin.',
    'Yangi xabar keldi: ortda yana kimdir bor.'
  ],
  adventure: [
    'Xarita oxirgi marta kechasi ko‘rildi.',
    'Yo‘l cho‘lning eng xavfli qismiga burildi.',
    'G‘aroyib begona izlar topildi.',
    'To‘fon yaqinlashmoqda, vaqt tugayapti.',
    'Qahramon tavakkal qilib, yangi yo‘lni tanladi.',
    'Ufqda yo‘qolgan shahar ko‘rindi.'
  ],
  drama: [
    'Shahar yomg‘irga ko‘mildi.',
    'Eski do‘st kutilmagan xabar yubordi.',
    'O‘tgan kunlarning siri yuzaga chiqdi.',
    'Eng qiyin tanlov — yaqin odamni qo‘yib yuborish.',
    'Qahramon kechirim so‘rashga qaror qildi.',
    'Ertangi tong hammasini o‘zgartiradi.'
  ],
  mystery: [
    'Tunda notanish raqamdan qo‘ng‘iroq keldi.',
    'Xonada hech kim yo‘q edi, lekin eshik ochiq qoldi.',
    'Eski yozuvda yashirin kod topildi.',
    'Kuzatuvchi ko‘rinmaydigan joydan kuzatmoqda.',
    'Qahramon tuzoqqa tushganini anglaydi.',
    'Yangi ism aytildi — va u tirik.'
  ],
  comedy: [
    'Oddiy dushanba kutilmaganda g‘alati boshlandi.',
    'Qo‘shni o‘zini film qahramoni deb e’lon qildi.',
    'Reja bir zumda barbod bo‘ldi.',
    'Hamma bitta kichik yolg‘on atrofida aylanadi.',
    'Vaziyatni qutqarish uchun yana bir yolg‘on kerak.',
    'Kutilmagan mehmon eshikni taqillatdi.'
  ]
};

function hashSeed(text) {
  return crypto.createHash('sha256').update(text).digest().readUInt32BE(0);
}

export function pollinationsUrl(prompt, seed, width = 720, height = 1280) {
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: 'true',
    referrer: 'ministudio'
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

export function buildSeries(input = {}) {
  const idea = String(input.idea || '').trim().slice(0, 500);
  const genre = GENRE_META[input.genre] ? input.genre : 'fantasy';
  const style = STYLE_META[input.style] ? input.style : 'anime';
  const episodeCount = Math.min(5, Math.max(1, Number(input.episodes) || 3));
  const duration = [30, 60, 90].includes(Number(input.duration)) ? Number(input.duration) : 60;
  const voice = input.voice === 'male' ? 'male' : 'female';
  const demo = Boolean(input.demo);
  const seedBase = hashSeed(`${idea}|${genre}|${style}|${input.title || ''}|${demo ? 'demo' : Date.now()}`);

  const genreMeta = GENRE_META[genre];
  const styleMeta = STYLE_META[style];
  const hero = HEROES[style] || HEROES.anime;
  const title = String(input.title || pick(genreMeta.titles, seedBase)).toUpperCase();
  const side = SIDE_CHARACTERS[seedBase % SIDE_CHARACTERS.length];
  const beats = BEATS[genre];

  const characters = [
    {
      name: hero.name,
      role: 'Bosh qahramon',
      look: hero.look,
      img: pick(LOCAL_FRAMES[style], seedBase + 1)
    },
    {
      name: side.name,
      role: side.role,
      look: side.look,
      img: pick(LOCAL_FRAMES[style], seedBase + 2)
    },
    {
      name: 'Shahar',
      role: 'Jonli muhit',
      look: 'neon-lit futuristic Central Asian city, rain and holograms',
      img: pick(LOCAL_FRAMES[style], seedBase + 3)
    }
  ];

  const episodes = Array.from({ length: episodeCount }, (_, epIndex) => {
    const scenes = Array.from({ length: 6 }, (_, sceneIndex) => {
      const beat = beats[(sceneIndex + epIndex) % beats.length];
      const local = pick(LOCAL_FRAMES[style], seedBase + epIndex * 7 + sceneIndex);
      const prompt = `${styleMeta.prompt}, ${beat} Character: ${hero.look}. ${genreMeta.label} mini series, cinematic composition, dramatic lighting, ultra detailed, vertical 9:16`;
      return {
        n: sceneIndex + 1,
        caption: beat.replace('Qahramon', hero.name),
        img: demo ? local : pollinationsUrl(prompt, seedBase + epIndex * 31 + sceneIndex),
        fallback: local,
        duration: Math.round(duration / 6)
      };
    });
    return {
      n: epIndex + 1,
      title: `${epIndex + 1}-qism. ${EPISODE_NAMES[epIndex % EPISODE_NAMES.length]}`,
      hook: epIndex === 0 ? idea || beat0(genre) : `Voqealar yangi bosqichga ko‘tariladi: ${beats[(epIndex + 2) % beats.length].toLowerCase()}`,
      scenes
    };
  });

  return {
    id: `series_${Date.now()}_${seedBase.toString(16).slice(0, 6)}`,
    title,
    logline:
      idea ||
      `${hero.name} ${genreMeta.label.toLowerCase()} olamida o‘z taqdirini topishga majbur bo‘ladi. Har bir epizod yangi sirni ochadi.`,
    genre,
    genreLabel: genreMeta.label,
    style,
    styleLabel: styleMeta.label,
    voice,
    duration,
    episodeCount,
    characters,
    episodes,
    poster: episodes[0].scenes[0].img,
    posterFallback: episodes[0].scenes[0].fallback,
    createdAt: new Date().toISOString()
  };
}

function beat0(genre) {
  return `Kutilmagan voqea ${GENRE_META[genre].label.toLowerCase()} olamidagi qahramon hayotini butunlay o‘zgartiradi.`;
}

export function buildDemoSeries() {
  const series = buildSeries({
    idea: 'Yomg‘irli Toshkentda yashovchi hacker qiz shaharni boshqarayotgan sun’iy intellektning sirini ochadi va o‘z o‘tmishi bilan yuzlashadi.',
    genre: 'fantasy',
    style: 'anime',
    episodes: 3,
    duration: 60,
    voice: 'female',
    title: 'NEO-TOSHKENT',
    demo: true
  });

  const frames = ['/media/frame-1.jpg', '/media/frame-3.jpg', '/media/frame-5.jpg', '/media/frame-6.jpg', '/media/frame-3.jpg', '/media/frame-1.jpg'];
  series.characters[0].img = '/media/frame-1.jpg';
  series.characters[1].img = '/media/frame-6.jpg';
  series.characters[2].img = '/media/frame-5.jpg';
  series.poster = '/media/frame-1.jpg';
  series.posterFallback = '/media/frame-1.jpg';
  series.episodes = series.episodes.map((ep, i) => ({
    ...ep,
    scenes: ep.scenes.map((scene, j) => ({
      ...scene,
      img: frames[(j + i) % frames.length],
      fallback: frames[(j + i) % frames.length]
    }))
  }));
  return series;
}
