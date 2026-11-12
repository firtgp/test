// Отдельные сцены-предметы: золотой куб аккаунта, уступ с фонарём, лис-талисман,
// листва переднего плана, «искра» (валюта) и иконки товаров. Всё собрано кодом из блоков.
import {Builder, rng, type World} from './build';
import type {ItemIcon} from './meta';

const STUDIO = {
  sky: ['#10131a', '#1a1f2b', '#2a3142'] as [string, string, string],
  fog: '#1a1f2b',
  sun: '#fff4e0',
  hemi: ['#dfe8ff', '#1a1d26'] as [string, string],
};

/** Золотой куб с эмблемой профиля на каменном постаменте — центр блока «Один аккаунт». */
export function cube(): World {
  const b = new Builder(rng(71));
  const stone = ['#3b4252', '#434b5c', '#353c4a'];
  const dark = ['#252a35', '#2b313d'];
  const moss = ['#4f7f45', '#5b8f4e', '#467240'];

  b.island(9, 7, (x, z) => (Math.hypot(x, z) < 6.4 ? 1 : 0), dy => (dy === 0 ? (b.rand() < 0.38 ? moss : stone) : dy < 3 ? stone : dark));
  b.box(-6, 2, -6, 5, 2, 5, ['#4a5263', '#525b6d', '#444c5c']);

  // Куб 10×10×10. Верх светлее, низ темнее, по граням — пиксельный шум.
  const gold = (_x: number, y: number) => {
    if (y === 12) return b.pick(['#f6c452', '#f2b544', '#ffd06a']);
    if (y <= 4) return b.pick(['#b87a1e', '#a86e1a', '#c48524']);
    return b.pick(['#e0a030', '#d99a2e', '#cf8f28', '#e9a93a']);
  };
  b.box(-5, 3, -5, 4, 12, 4, gold);
  // Рёбра чуть темнее — читается объём.
  for (let i = 3; i <= 12; i++) for (const [x, z] of [[-5, -5], [4, -5], [-5, 4], [4, 4]] as const) b.set(x, i, z, '#a86e1a');

  // Замочная скважина, утопленная в переднюю грань: знак входа в аккаунт.
  const glyph: [number, number][] = [];
  for (const x of [-1, 0]) glyph.push([x, 11]);
  for (const y of [10, 9]) for (const x of [-2, -1, 0, 1]) glyph.push([x, y]);
  for (const y of [8, 7, 6]) for (const x of [-1, 0]) glyph.push([x, y]);
  for (const x of [-2, -1, 0, 1]) glyph.push([x, 5]);
  for (const [x, y] of glyph) {
    b.del(x, y, 4);
    b.set(x, y, 3, '#3a2706');
  }
  // На боковой грани — ромб-клеймо.
  for (const [z, y] of [[-1, 9], [0, 9], [-2, 8], [1, 8], [-1, 7], [0, 7], [-2, 8], [-1, 8], [0, 8]] as const) b.set(4, y, z, '#c98a24');

  // Самородки и трещины света на постаменте.
  for (const [x, z] of [[-7, 2], [6, -3], [3, 7], [-4, -7]] as const) b.set(x, 1, z, '#ffc061', true);
  b.motes(26, 0, 9, 0, 12, 8, ['#ffd98a', '#fff0c8', '#ffb84a'], 0.34);

  b.glowAt(0, 7, -6, '#ffb84a', 40);
  b.glowAt(0, 1, 6, '#ff9d2e', 14);
  return {
    voxels: b.voxels(), glows: b.glows,
    lights: [
      {x: -8, y: 2, z: 8, color: '#ff9d2e', intensity: 70, distance: 22},
      {x: 9, y: 4, z: -4, color: '#8a6bff', intensity: 160, distance: 26},
    ],
    sky: ['#120e06', '#2a1d0a', '#6a4a14'], fog: '#2a1d0a', sun: '#fff1cf', hemi: ['#ffe9c0', '#1c1608'], rim: '#b79bff',
    focusY: 5, halfHeight: 12, halfWidth: 11,
  };
}

/** Остров-терраса с фонарём на столбе: опора под окном лаунчера. */
export function ledge(): World {
  const b = new Builder(rng(83));
  const grass = ['#5fa052', '#6cb05c', '#559648'];
  const dirt = ['#7a5a3c', '#6f5136'];
  const stone = ['#4b5160', '#565d6d', '#424857'];
  const height = (x: number, z: number) => (x > 2 && z < 3 ? 2 : x > -3 ? 1 : 0);
  b.island(11, 8, height, dy => (dy === 0 ? grass : dy < 3 ? dirt : stone));
  // Каменная дорожка и ступень.
  for (const [x, z] of [[-8, 1], [-6, 2], [-4, 1], [-2, 2], [0, 1], [2, 2]] as const) b.set(x, height(x, z), z, b.pick(['#8a93a3', '#7c8595']));
  b.fill(3, 1, 3, 5, 1, 4, ['#6a7282', '#5f6777']);
  // Столб: фонарь висит на перекладине.
  const px = 6, pz = -2, base = height(px, pz);
  b.fill(px, base + 1, pz, px, base + 9, pz, ['#3a2a1e', '#44321f']);
  b.fill(px - 3, base + 9, pz, px, base + 9, pz, ['#3a2a1e']);
  b.set(px - 3, base + 8, pz, '#2a2f3a');
  const lamp = b.lantern(px - 3, base + 2, pz, '#ffc061');
  // Куст, трава и цветы.
  b.blob(-6, 3, -4, 2, ['#3f8a3d', '#4c9b48', '#357a35'], 0.1);
  for (const [x, z] of [[-9, -2], [-1, -5], [1, 5], [8, 2], [5, 6]] as const) b.set(x, height(x, z) + 1, z, b.pick(['#7fc46e', '#8fd17c']));
  for (const [x, z, c] of [[-3, 5, '#ffd166'], [0, -4, '#ff8fb8'], [9, -1, '#c9a6ff']] as const) b.set(x, height(x, z) + 1, z, c);
  b.motes(18, px - 3, base + 6, pz, 8, 5, ['#ffd98a', '#fff0c8'], 0.28);
  return {
    voxels: b.voxels(), glows: b.glows,
    lights: [{x: lamp.x, y: lamp.y + 1, z: lamp.z + 3, color: '#ffb84a', intensity: 240, distance: 24}],
    sky: ['#0a0f1a', '#1b2536', '#3a4a66'], fog: '#1b2536', sun: '#cfe0ff', hemi: ['#b8c8ee', '#161a22'], rim: '#ffc46b',
    focusY: 3, halfHeight: 11, halfWidth: 12,
  };
}

/** Лис-талисман с фонарём на травяном уступе. Собственный персонаж проекта. */
export function fox(): World {
  const b = new Builder(rng(97));
  const grass = ['#5fa052', '#6cb05c', '#559648'];
  const dirt = ['#7a5a3c', '#6f5136'];
  const stone = ['#4b5160', '#565d6d'];
  const fur = ['#e9842c', '#ee8f37', '#e27a24'];
  const white = ['#f7efe4', '#efe5d6'];
  const ink = '#2a1c16';

  b.island(8, 6, () => 0, dy => (dy === 0 ? grass : dy < 3 ? dirt : stone));

  // Туловище сидящего лиса.
  b.box(-3, 1, -3, 2, 7, 1, fur);
  for (const y of [7]) for (const [x, z] of [[-3, -3], [2, -3], [-3, 1], [2, 1]] as const) b.del(x, y, z);
  b.fill(-2, 2, 1, 1, 5, 1, white); // грудка
  // Передние лапы.
  for (const x0 of [-3, 1]) {
    b.fill(x0, 1, 2, x0 + 1, 4, 2, fur);
    b.fill(x0, 1, 2, x0 + 1, 2, 3, [ink, '#3b2a22']);
  }
  // Голова.
  b.box(-4, 8, -2, 3, 13, 3, fur);
  for (const [x, z] of [[-4, -2], [3, -2]] as const) b.del(x, 13, z);
  b.fill(-4, 8, 3, -2, 10, 3, white); // щёки
  b.fill(1, 8, 3, 3, 10, 3, white);
  b.fill(-1, 8, 4, 0, 10, 5, white); // мордочка
  b.fill(-1, 10, 5, 0, 10, 5, [ink]); // нос
  for (const x of [-3, 2]) b.fill(x, 11, 3, x, 12, 3, [ink]); // глаза
  // Уши с тёмными кончиками.
  for (const [x0, tip] of [[-4, -4], [2, 3]] as const) {
    b.fill(x0, 14, 0, x0 + 1, 15, 1, fur);
    b.fill(x0, 14, 1, x0 + 1, 15, 1, ['#f6c9a0']);
    b.fill(tip, 16, 0, tip, 16, 1, [ink]);
  }
  // Хвост огибает лиса справа, кончик белый.
  b.fill(3, 1, -3, 5, 3, -1, fur);
  b.fill(4, 1, -1, 6, 3, 2, fur);
  b.fill(4, 1, 3, 6, 3, 4, white);

  const lamp = b.lantern(-7, 1, 2, '#ffc061');
  for (const [x, z] of [[5, -5], [-5, -4], [1, 6], [-2, 5]] as const) b.set(x, 1, z, b.pick(['#7fc46e', '#8fd17c']));
  for (const [x, z, c] of [[6, 5, '#ffd166'], [-6, -2, '#ff8fb8']] as const) b.set(x, 1, z, c);
  b.motes(16, -4, 8, 2, 9, 6, ['#ffd98a', '#fff0c8'], 0.28);
  return {
    voxels: b.voxels(), glows: b.glows,
    lights: [{x: lamp.x + 1, y: lamp.y + 2, z: lamp.z + 3, color: '#ffb84a', intensity: 230, distance: 24}],
    sky: ['#0a0f1a', '#1b2536', '#3a4a66'], fog: '#1b2536', sun: '#dfe8ff', hemi: ['#c8d4f4', '#161a22'], rim: '#ffc46b',
    focusY: 5, halfHeight: 12, halfWidth: 10,
  };
}

/** Листва переднего плана. В вёрстке размывается: даёт глубину кадра. */
export function foliage(seed: number): World {
  const b = new Builder(rng(200 + seed));
  const sets = [
    ['#3f8a3d', '#4c9b48', '#357a35', '#5aa955'],
    ['#2c6a41', '#245c38', '#33774a', '#3f8a55'],
    ['#6a4fb0', '#7a5cc6', '#5d459e', '#8f73d6'],
  ];
  const leaves = sets[seed % sets.length];
  for (const [cx, cy, cz, r] of [[0, 0, 0, 5], [5, 3, -1, 4], [-5, 2, 1, 4], [1, 6, 2, 3], [-2, -4, 0, 3]] as const) {
    for (let x = -r; x <= r; x++)
      for (let y = -r; y <= r; y++)
        for (let z = -r; z <= r; z++) if (Math.hypot(x, y, z) <= r && b.rand() > 0.42) b.set(cx + x, cy + y, cz + z, b.pick(leaves));
  }
  b.fill(-1, -9, 0, 0, -5, 0, ['#5b3f28', '#6b4a2f']);
  return {
    voxels: b.voxels(), glows: b.glows, lights: [], ...STUDIO, rim: '#ffc46b',
    focusY: 0, halfHeight: 10, halfWidth: 10,
  };
}

/** «Искра» — внутренняя валюта: гранёный светящийся кристалл. */
export function coin(): World {
  const b = new Builder(rng(113));
  for (let x = -5; x <= 5; x++)
    for (let y = -6; y <= 6; y++)
      for (let z = -5; z <= 5; z++) {
        const d = Math.abs(x) + Math.abs(y) * 0.8 + Math.abs(z);
        if (d > 5.2) continue;
        if (d > 3.7) b.set(x, y, z, y > 1 ? b.pick(['#ffe08a', '#ffd978']) : y < -1 ? b.pick(['#d99a2e', '#e0a030']) : b.pick(['#f6c452', '#f2b544']));
        else if (d > 2.4) b.set(x, y, z, '#fff0c8', true);
      }
  b.motes(12, 0, 0, 0, 8, 6, ['#ffd98a', '#fff0c8'], 0.32);
  b.glowAt(0, 0, 3, '#ffc25a', 22);
  return {
    voxels: b.voxels(), glows: b.glows,
    lights: [{x: 0, y: 2, z: 8, color: '#ffb84a', intensity: 120, distance: 20}],
    ...STUDIO, rim: '#b79bff',
    focusY: 0, halfHeight: 8, halfWidth: 8,
  };
}

/** Иконка товара: маленькая модель из блоков. Это иллюстрация, а не текстура из мода. */
export function item(icon: ItemIcon): World {
  const b = new Builder(rng(300 + icon.length * 7 + icon.charCodeAt(0)));
  let rim = '#ffc46b';
  const lights: World['lights'] = [];
  const glow = (color: string, size = 16) => b.glowAt(0, 0, 3, color, size);

  if (icon === 'gear') {
    const brass = ['#c9a14a', '#b8923f', '#d9b25a'];
    for (let x = -7; x <= 7; x++)
      for (let y = -7; y <= 7; y++) {
        const d = Math.hypot(x, y);
        const a = Math.atan2(y, x);
        const tooth = Math.cos(a * 8) > 0.35;
        if (d >= 2.2 && d <= (tooth ? 6.6 : 5.0)) for (const z of [-1, 0]) b.set(x, y, z, b.pick(brass));
      }
    b.fill(-1, -1, -1, 1, 1, 1, ['#6b4a2f', '#5b3f28']);
    b.set(0, 0, 1, '#ffc061', true);
    glow('#ffb84a', 14);
  } else if (icon === 'drill') {
    rim = '#5fe0ff';
    b.box(-3, -3, -5, 2, 2, -1, ['#e07b2f', '#d06f28', '#e88a3d']);
    b.fill(-3, -1, -5, 2, -1, -1, ['#2b2f38']);
    for (let i = 0; i < 6; i++) {
      const r = Math.max(0, 3 - Math.ceil(i * 0.6));
      for (let x = -r; x <= r - (r ? 1 : 0); x++)
        for (let y = -r; y <= r - (r ? 1 : 0); y++) b.set(x, y, i, (x + y + i) % 3 === 0 ? '#d7dee8' : b.pick(['#8a94a3', '#7a8493']));
    }
    b.fill(-1, 3, -4, 0, 3, -2, ['#2b2f38']);
    b.set(0, 3, -5, '#6fe9ff', true);
    glow('#6fe9ff', 12);
  } else if (icon === 'disk') {
    rim = '#5fe0ff';
    b.box(-4, -5, -1, 3, 5, 0, ['#3a4252', '#434b5c', '#343b49']);
    b.fill(-3, 1, 1, 2, 3, 1, ['#6fe9ff', '#a4f3ff'], true);
    b.fill(-3, -4, 1, 2, -1, 1, ['#d7dee8', '#c4ccd8']);
    b.fill(-2, -3, 1, 1, -3, 1, ['#59626f']);
    b.fill(-4, 6, -1, -2, 6, 0, ['#2b2f38']);
    glow('#6fe9ff', 14);
  } else if (icon === 'book') {
    rim = '#c9a6ff';
    b.box(-4, -5, -2, 3, 5, 1, ['#5b3fa0', '#51378f', '#6548b0']);
    b.fill(-3, -4, -1, 4, 4, 0, ['#f0e6d0', '#e6dcc4']); // страницы
    b.fill(-4, -5, -2, -4, 5, 1, ['#3f2c74']); // корешок
    for (const [x, y] of [[0, 1], [-1, 0], [1, 0], [0, -1], [0, 0]] as const) b.set(x, y, 2, '#ffc061', true);
    b.fill(3, -1, -2, 3, 0, 2, ['#ffc061']);
    glow('#c9a6ff', 14);
  } else if (icon === 'flower') {
    rim = '#ff8ae6';
    b.box(-2, -6, -2, 1, -4, 1, ['#b0603a', '#a25632']);
    b.fill(-1, -3, -1, 0, -3, 0, ['#4a3320']);
    b.fill(0, -2, 0, 0, 2, 0, ['#4c9b48', '#3f8a3d']);
    b.fill(1, -1, 0, 2, -1, 0, ['#5aa955']);
    b.fill(-2, 0, 0, -1, 0, 0, ['#5aa955']);
    for (const [x, y] of [[0, 5], [-2, 3], [2, 3], [-1, 4], [1, 4], [-1, 2], [1, 2], [0, 6], [-3, 3], [3, 3]] as const) b.set(x, y, 0, b.pick(['#ff6fd8', '#ff9ae6']), true);
    b.set(0, 3, 1, '#ffd166', true);
    b.set(0, 4, 0, '#ff9ae6', true);
    glow('#ff6fd8', 14);
  } else if (icon === 'scroll') {
    rim = '#c9a6ff';
    for (let x = -5; x <= 4; x++)
      for (let y = -2; y <= 2; y++)
        for (let z = -2; z <= 2; z++) {
          const d = Math.hypot(y, z);
          if (d <= 2.4 && d > 1.2) b.set(x, y, z, Math.abs(x + 0.5) > 4 ? b.pick(['#6b4a2f', '#5b3f28']) : b.pick(['#f0e6d0', '#e6dcc4', '#f6eedc']));
        }
    b.fill(-1, -3, -3, 0, 3, 3, ['#b84a3a', '#a53f31']);
    b.set(-1, 0, 4, '#c9a6ff', true);
    b.set(0, 0, 4, '#c9a6ff', true);
    glow('#c9a6ff', 12);
  } else if (icon === 'basket') {
    const weave = (x: number, y: number, z: number) => ((x + y + z) % 2 === 0 ? '#b8854a' : '#9c6d38');
    b.box(-4, -4, -3, 3, -1, 2, weave);
    for (let x = -3; x <= 2; x++) for (let z = -2; z <= 1; z++) b.del(x, -1, z);
    for (const [x, z, c] of [[-3, -2, '#d9423a'], [-2, 0, '#d9423a'], [0, -1, '#f08a2e'], [1, 1, '#6cb05c'], [2, -2, '#6cb05c'], [-1, 1, '#f0c23a']] as const) {
      b.set(x, -1, z, c);
      b.set(x, 0, z, c);
    }
    for (let a = 0; a <= 8; a++) {
      const t = (a / 8) * Math.PI;
      b.set(Math.round(Math.cos(t) * 4 - 0.5), Math.round(Math.sin(t) * 4) - 1, 0, '#8a5c2c');
    }
    glow('#ffc46b', 10);
  } else if (icon === 'pickaxe') {
    rim = '#5fe0ff';
    for (let i = -6; i <= 3; i++) for (const z of [0]) b.set(i, i, z, b.pick(['#8a5c2c', '#7a5026']));
    const head = ['#cfe9f2', '#a9d6e6', '#8fc4d8'];
    for (const [x, y] of [[1, 6], [2, 6], [3, 6], [4, 5], [5, 5], [6, 4], [6, 3], [6, 2], [6, 1], [5, 4], [4, 4], [3, 5], [2, 5], [5, 3], [5, 2], [0, 6], [-1, 5], [6, 0]] as const)
      for (const z of [0, 1]) b.set(x, y, z, b.pick(head));
    b.set(4, 6, 1, '#6fe9ff', true);
    glow('#6fe9ff', 10);
  } else if (icon === 'sparkles') {
    const star = (cx: number, cy: number, r: number, color: string) => {
      for (let i = -r; i <= r; i++) {
        b.set(cx + i, cy, 0, color, true);
        b.set(cx, cy + i, 0, color, true);
      }
      b.set(cx, cy, 1, '#fff7e0', true);
      b.glowAt(cx, cy, 1, color, r * 4 + 4);
    };
    star(-1, 0, 4, '#ffc061');
    star(4, 4, 2, '#ffe08a');
    star(-4, -4, 2, '#ff9ae6');
    b.motes(14, 0, 0, 0, 7, 6, ['#ffd98a', '#fff0c8'], 0.3);
  } else {
    // chest
    const wood = (x: number, y: number) => (y === 1 ? '#5b3f28' : x % 3 === 0 ? '#7a5026' : b.pick(['#8a5a2b', '#96642f']));
    b.box(-5, -4, -3, 4, 3, 2, wood);
    b.fill(-5, 1, -3, 4, 1, 2, ['#5b3f28']);
    for (const x of [-5, 4]) b.fill(x, -4, -3, x, 3, 2, ['#3a2a1e']);
    b.fill(-1, -1, 3, 0, 1, 3, ['#ffc061', '#ffe08a'], true);
    glow('#ffb84a', 14);
  }
  lights.push({x: 4, y: 5, z: 9, color: '#fff0d8', intensity: 90, distance: 24});
  return {voxels: b.voxels(), glows: b.glows, lights, ...STUDIO, rim, focusY: 0, halfHeight: 8.5, halfWidth: 8.5};
}
