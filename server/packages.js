export const COSTS = {
  serial: 150,
  image: 5,
  logo: 40
};

export const PACKAGES = [
  {
    id: 'start',
    title: 'Start',
    credits: 100,
    stars: 50,
    uzs: 25000,
    note: 'Kichik tajriba uchun'
  },
  {
    id: 'creator',
    title: 'Creator',
    credits: 350,
    stars: 150,
    uzs: 79000,
    note: '1 serial + 40 rasm',
    popular: true
  },
  {
    id: 'studio',
    title: 'Studio',
    credits: 900,
    stars: 350,
    uzs: 189000,
    note: 'Jamoaviy ishlar uchun'
  }
];

export const PACKAGE_MAP = Object.fromEntries(PACKAGES.map((p) => [p.id, p]));
