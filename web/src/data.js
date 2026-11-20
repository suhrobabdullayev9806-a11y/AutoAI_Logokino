export const GENRES = [
  { id: 'fantasy', label: 'Fantastika', hint: 'Portallar va boshqa olamlar' },
  { id: 'adventure', label: 'Sarguzasht', hint: 'Yo‘l, xavf va kashfiyot' },
  { id: 'mystery', label: 'Sirli', hint: 'Sir, iz va kutilmagan burilish' },
  { id: 'drama', label: 'Drama', hint: 'Hislar va qiyin tanlovlar' },
  { id: 'comedy', label: 'Komediya', hint: 'Kulgi va kutilmagan holatlar' }
];

export const SERIAL_STYLES = [
  { id: 'anime', label: 'Anime', img: '/media/frame-1.jpg', desc: 'Neon, yorqin, emotsional' },
  { id: '3d', label: '3D', img: '/media/abstract.jpg', desc: 'Hajmli, kinematik, silliq' },
  { id: 'comic', label: 'Komiks', img: '/media/style-comic.jpg', desc: 'Qalin chiziqlar, kuchli kontrast' },
  { id: 'real', label: 'Realistik', img: '/media/style-real.jpg', desc: 'Film kadr, tabiiy yorug‘lik' }
];

export const IMAGE_STYLES = [
  { id: 'cinematic', label: 'Kinematik', img: '/media/style-real.jpg' },
  { id: 'anime', label: 'Anime', img: '/media/frame-1.jpg' },
  { id: '3d', label: '3D', img: '/media/abstract.jpg' },
  { id: 'comic', label: 'Komiks', img: '/media/style-comic.jpg' },
  { id: 'minimal', label: 'Minimal', img: '/media/desert.jpg' }
];

export const RATIOS = [
  { id: '9:16', label: 'Story', w: 9, h: 16 },
  { id: '1:1', label: 'Kvadrat', w: 1, h: 1 },
  { id: '16:9', label: 'Kino', w: 16, h: 9 }
];

export const IDEAS = [
  'Yomg‘irli Toshkentda hacker qiz sun’iy intellektning sirini ochadi.',
  'Marsdagi yolg‘iz koloniyada g‘alati signal paydo bo‘ladi.',
  'Eski metro bekati ostida vaqtni to‘xtatadigan darvoza topiladi.',
  'Qishloqdan kelgan yigit shaharda o‘zining ikkinchi nusxasini uchratadi.'
];

export const IMAGE_IDEAS = [
  'Neon yomg‘irda anime qahramon, kinematik portret',
  'Toshkent ustida uchayotgan kosmik kema, epik konsept',
  'Minimalistik logotip uslubidagi 3D shakl',
  'Quyosh botayotgan cho‘lda yolg‘iz sayyoh'
];

export const INSPIRATION = [
  { id: 'insp_1', type: 'serial', title: 'NEO-TOSHKENT', poster: '/media/frame-1.jpg', meta: '3 epizod · Anime' },
  { id: 'insp_2', type: 'image', title: 'CHO‘L SAYYOHI', poster: '/media/desert.jpg', meta: 'Kinematik' },
  { id: 'insp_3', type: 'image', title: 'QAHARMON', poster: '/media/style-comic.jpg', meta: 'Komiks' },
  { id: 'insp_4', type: 'image', title: 'KECHKI PORTRET', poster: '/media/style-real.jpg', meta: 'Realistik' }
];

export const TIPS = [
  'Yaxshi g‘oya bitta jumlada aytiladi: qahramon + muammo + maqsad.',
  'Serial davomiy bo‘lishi uchun har epizod oxirida savol qoldiring.',
  'Personajning tashqi belgisini bir xil saqlang — bu seriyani birlashtiradi.',
  'Rasm uchun yorug‘lik, uslub va kayfiyatni promptda aniq yozing.'
];

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'hozir';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} daq oldin`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} soat oldin`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} kun oldin`;
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
}

export function formatNum(n) {
  return new Intl.NumberFormat('uz-UZ').format(Number(n || 0));
}
