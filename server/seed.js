import { buildDemoSeries } from './story.js';
import { addWork, ensureUser, getWorks } from './store.js';

const DEMO_ID = process.env.DEMO_USER_ID || '8606829795';

export function seedDemo() {
  ensureUser({
    id: DEMO_ID,
    firstName: 'Suhrob',
    lastName: '',
    username: 'suhrob',
    credits: 300,
    demo: true
  });

  if (getWorks(DEMO_ID).length > 0) return;

  const story = buildDemoSeries();
  const now = Date.now();

  addWork({
    id: 'demo_neo',
    ownerId: DEMO_ID,
    type: 'serial',
    title: story.title,
    prompt: story.logline,
    poster: '/media/frame-1.jpg',
    posterFallback: '/media/frame-1.jpg',
    story,
    createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString()
  });

  const imageWorks = [
    {
      id: 'demo_desert',
      title: 'CHO‘L SAYYOHI',
      prompt: 'alien desert traveler, orange sky, epic sci-fi',
      images: ['/media/desert.jpg']
    },
    {
      id: 'demo_portrait',
      title: 'KECHKI PORTRET',
      prompt: 'cinematic portrait, teal and amber light',
      images: ['/media/style-real.jpg']
    },
    {
      id: 'demo_comic',
      title: 'QAHARMON',
      prompt: 'comic book hero, bold ink, halftone',
      images: ['/media/style-comic.jpg']
    },
    {
      id: 'demo_abstract',
      title: 'NEO SHAKL',
      prompt: 'abstract chrome shapes, violet gradient',
      images: ['/media/abstract.jpg']
    }
  ];

  imageWorks.forEach((item, index) => {
    addWork({
      id: item.id,
      ownerId: DEMO_ID,
      type: 'image',
      title: item.title,
      prompt: item.prompt,
      poster: item.images[0],
      posterFallback: item.images[0],
      images: item.images.map((url) => ({ url, fallback: url, ratio: '9:16' })),
      createdAt: new Date(now - 1000 * 60 * (30 + index * 50)).toISOString()
    });
  });
}
