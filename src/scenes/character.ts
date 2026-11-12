// Персонаж игрока из блоков: аватар на сайте в четырёх образах.
// Пропорции — «блочный человечек» (голова 8³, туловище 8×12×4, руки и ноги 4×12×4).
// Окраска своя; текстуры и скины из игры не используются. Игровой скин этот аватар не меняет.
import {Builder, rng, type World} from './build';
import {TIER_ACCENT, type AvatarStyle} from './meta';

interface Look {
  skin: string[];
  hair: string[];
  top: string[];
  sleeve: string[];
  hands: string[];
  pants: string[];
  boots: string[];
}

const SKIN = ['#e0a67c', '#d99d73'];
const LOOKS: Record<AvatarStyle, Look> = {
  wanderer: {skin: SKIN, hair: ['#6b4a2f', '#5d4028'], top: ['#2f7f8f', '#2a7483'], sleeve: ['#2f7f8f', '#2a7483'], hands: SKIN, pants: ['#3a4252', '#343b49'], boots: ['#5a3d28', '#4d3320']},
  engineer: {skin: SKIN, hair: ['#2b2a33', '#33313c'], top: ['#e07b2f', '#d06f28'], sleeve: ['#59626f', '#515a66'], hands: ['#2b2f38'], pants: ['#2f3a57', '#2a344e'], boots: ['#1f232b']},
  mage: {skin: ['#d3986f', '#cb9068'], hair: ['#5b3fa0', '#51378f'], top: ['#5b3fa0', '#51378f'], sleeve: ['#5b3fa0', '#51378f'], hands: SKIN, pants: ['#51378f', '#48307f'], boots: ['#f2b544', '#e0a030']},
  farmer: {skin: SKIN, hair: ['#d9a84a', '#c99838'], top: ['#b84a3a', '#a94335'], sleeve: ['#b84a3a', '#a94335'], hands: SKIN, pants: ['#3f7a6a', '#377062'], boots: ['#6b4a2f', '#5d4028']},
};

function body(b: Builder, style: AvatarStyle) {
  const L = LOOKS[style];
  const ink = '#26242c';
  const pick = (c: string[]) => b.pick(c);

  // Ноги и ботинки.
  for (const x0 of [-4, 0]) b.box(x0, 0, -2, x0 + 3, 11, 1, (_x, y) => pick(y <= 2 ? L.boots : L.pants));
  // Туловище.
  b.box(-4, 12, -2, 3, 23, 1, () => pick(L.top));
  // Руки: рукав и кисть.
  for (const x0 of [-8, 4]) b.box(x0, 12, -2, x0 + 3, 23, 1, (_x, y) => pick(y <= 14 ? L.hands : L.sleeve));

  // Голова.
  b.box(-4, 24, -4, 3, 31, 3, (x, y, z) => {
    if (y === 31) return pick(L.hair);
    if (z === -4) return y >= 25 ? pick(L.hair) : pick(L.skin);
    if (x === -4 || x === 3) return y >= 28 || (z <= -1 && y >= 26) ? pick(L.hair) : pick(L.skin);
    if (z === 3) {
      if (y >= 30 || (y === 29 && (x === -4 || x === 3))) return pick(L.hair);
      return pick(L.skin);
    }
    return pick(L.skin);
  });
  // Лицо: глаза и рот.
  b.set(-3, 27, 3, '#f4f1ea');
  b.set(-2, 27, 3, ink);
  b.set(1, 27, 3, ink);
  b.set(2, 27, 3, '#f4f1ea');
  b.set(-1, 25, 3, '#b8795a');
  b.set(0, 25, 3, '#b8795a');

  if (style === 'wanderer') {
    // Шарф, значок, ремень и рюкзак со скаткой.
    b.box(-4, 22, -2, 3, 23, 1, ['#f2b544', '#e0a030']);
    b.fill(-3, 18, 2, -3, 21, 2, ['#f2b544', '#e0a030']);
    b.fill(-1, 17, 1, 0, 18, 1, ['#ffd98a'], true);
    b.glowAt(-0.5, 17.5, 2, '#ffc061', 7);
    b.box(-4, 12, -2, 3, 12, 1, ['#26242c']);
    b.box(-3, 14, -4, 2, 21, -3, ['#7a5a3c', '#6f5136']);
    b.fill(-3, 21, -4, 2, 21, -3, ['#8f6c48']);
    b.fill(-3, 22, -4, 2, 23, -3, ['#b8c4d6', '#a9b6c9']);
  } else if (style === 'engineer') {
    // Гогглы на лбу, жилет со светоотражающей полосой, пояс с подсумком.
    b.box(-4, 29, -4, 3, 29, 3, (x, _y, z) => (z === 3 || x === -4 || x === 3 ? '#1f232b' : null));
    for (const x of [-3, -2, 1, 2]) b.set(x, 29, 4, '#6fe9ff', true);
    b.glowAt(-0.5, 29, 5, '#6fe9ff', 8);
    for (const x of [-1, 0]) b.fill(x, 14, 1, x, 23, 1, ['#59626f', '#515a66']);
    b.box(-4, 16, -2, 3, 16, 1, (x, _y, z) => ((z === 1 || z === -2) && (x < -1 || x > 0) ? '#f6e27a' : null));
    b.box(-4, 12, -2, 3, 13, 1, ['#6b4a2f', '#5d4028']);
    b.fill(2, 12, 2, 3, 14, 2, ['#c9a14a', '#b8923f']);
  } else if (style === 'mage') {
    // Капюшон с острым верхом, мантия с золотой каймой, амулет и посох.
    b.box(-4, 24, -4, 3, 31, 3, (x, y, z) => {
      if (z === 3) return y >= 29 || x === -4 || x === 3 ? b.pick(LOOKS.mage.hair) : null;
      if (y === 24) return null;
      return b.pick(LOOKS.mage.hair);
    });
    b.fill(-2, 32, -3, 1, 32, 1, LOOKS.mage.hair);
    b.fill(-1, 33, -3, 0, 33, -1, LOOKS.mage.hair);
    b.fill(-1, 12, 1, 0, 23, 1, ['#f2b544', '#e0a030']);
    for (const x0 of [-8, 4]) b.box(x0, 15, -2, x0 + 3, 15, 1, ['#f2b544', '#e0a030']);
    for (const x0 of [-4, 0]) b.box(x0, 0, -2, x0 + 3, 1, 1, ['#f2b544', '#e0a030']);
    b.fill(-1, 20, 2, 0, 20, 2, ['#c9a6ff'], true);
    b.glowAt(-0.5, 20, 3, '#a070ff', 8);
    b.fill(9, 4, 2, 9, 30, 2, ['#6b4a2f', '#5d4028']);
    b.fill(8, 31, 1, 10, 33, 3, ['#c9a6ff', '#b58cff'], true);
    b.glowAt(9, 32, 3, '#a070ff', 13);
  } else {
    // Соломенная шляпа с лентой, клетчатая рубашка, комбинезон с лямками.
    for (let x = -7; x <= 6; x++)
      for (let z = -7; z <= 6; z++) if (Math.hypot(x + 0.5, z + 0.5) <= 6.6) b.set(x, 32, z, b.pick(['#e3c46a', '#d8b85c']));
    b.box(-3, 33, -3, 2, 34, 2, (_x, y) => (y === 33 ? b.pick(['#b84a3a', '#a94335']) : b.pick(['#e3c46a', '#d8b85c'])));
    b.box(-4, 12, -2, 3, 23, 1, (x, y) => ((x + y) % 3 === 0 ? '#983a2e' : b.pick(LOOKS.farmer.top)));
    for (const x0 of [-8, 4]) b.box(x0, 15, -2, x0 + 3, 23, 1, (x, y) => ((x + y) % 3 === 0 ? '#983a2e' : b.pick(LOOKS.farmer.sleeve)));
    b.box(-4, 12, -2, 3, 19, 1, (_x, _y, z) => (z === 1 || z === -2 ? b.pick(LOOKS.farmer.pants) : null));
    for (const x of [-3, 2]) for (const z of [1, -2]) b.fill(x, 20, z, x, 23, z, LOOKS.farmer.pants);
    b.fill(-1, 14, 1, 0, 16, 1, ['#4f8f7c']);
  }
}

function pedestal(b: Builder, tier: number) {
  const accent = TIER_ACCENT[Math.max(0, Math.min(3, tier))];
  const base = tier === 3 ? ['#f2b544', '#e9a93a', '#ffd06a'] : ['#3b4252', '#434b5c', '#353c4a'];
  for (let x = -9; x <= 9; x++)
    for (let z = -9; z <= 9; z++) {
      const d = Math.hypot(x, z);
      if (d > 9.2) continue;
      b.set(x, -1, z, d > 8 ? '#262b36' : b.pick(base));
      if (d <= 8.2) b.set(x, -2, z, '#262b36');
    }
  if (tier >= 1) {
    for (let a = 0; a < 16; a++) {
      const t = (a / 16) * Math.PI * 2;
      b.set(Math.round(Math.cos(t) * 8), -1, Math.round(Math.sin(t) * 8), accent, true);
    }
  }
  if (tier >= 2) {
    for (let a = 0; a < 5; a++) {
      const t = (a / 5) * Math.PI * 2 + 0.6;
      const x = Math.round(Math.cos(t) * 8);
      const z = Math.round(Math.sin(t) * 8);
      const h = 2 + (a % 3);
      b.fill(x, 0, z, x, h, z, [accent, '#ffffff'], true);
      b.glowAt(x, h, z, accent, 8);
    }
    b.glowAt(0, 16, -6, accent, 44);
  }
  if (tier >= 3) {
    for (let i = 0; i < 30; i++) {
      const t = (i / 30) * Math.PI * 6;
      const r = 9 + Math.sin(i * 1.7) * 1.5;
      b.mote(Math.round(Math.cos(t) * r * 2) / 2, Math.round(i * 1.1), Math.round(Math.sin(t) * r * 2) / 2, i % 3 ? '#ffd98a' : '#fff0c8', 0.4);
    }
    b.glowAt(0, 0, 0, '#ffb84a', 30);
  }
  return accent;
}

export function character(style: AvatarStyle, tier: number): World {
  const b = new Builder(rng(400 + style.length * 13 + tier));
  body(b, style);
  const accent = pedestal(b, tier);
  return {
    voxels: b.voxels(), glows: b.glows,
    lights: [
      {x: 10, y: 22, z: 16, color: '#fff0d8', intensity: 220, distance: 60},
      {x: -10, y: 4, z: -8, color: accent, intensity: 260, distance: 40},
    ],
    sky: ['#0d1017', '#171c27', '#262d3d'], fog: '#171c27', sun: '#fff4e4', hemi: ['#dfe8ff', '#20232c'], rim: accent,
    focusY: 15, halfHeight: 20, halfWidth: 12,
  };
}

/** Персонаж на травяном уступе — для переднего плана финала (снимается со спины). */
export function viewpoint(style: AvatarStyle): World {
  const b = new Builder(rng(500 + style.length));
  b.island(10, 7, () => -1, dy => (dy === 0 ? ['#5fa052', '#6cb05c', '#559648'] : dy < 3 ? ['#7a5a3c', '#6f5136'] : ['#4b5160', '#565d6d']));
  body(b, style);
  for (const [x, z] of [[6, 3], [-7, -2], [4, -6], [-5, 6]] as const) b.set(x, 0, z, b.pick(['#7fc46e', '#8fd17c']));
  return {
    voxels: b.voxels(), glows: b.glows,
    lights: [{x: 0, y: 20, z: -18, color: '#ffb070', intensity: 320, distance: 60}],
    sky: ['#0b1020', '#3a1f5c', '#f08a4b'], fog: '#3a2450', sun: '#ffe2c0', hemi: ['#e8c8ff', '#161020'], rim: '#ffb070',
    focusY: 13, halfHeight: 21, halfWidth: 12,
  };
}
