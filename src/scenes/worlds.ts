// Три «мира» для первого экрана: парящие острова из блоков, собранные кодом.
// Это авторская иллюстрация тем сборок, а не скриншоты настоящих миров проекта.
// Чтобы показать реальный мир, загрузите рендер в галерею и замените сцену картинкой.

export type ScenePreset = 'techno' | 'magic' | 'survival';
export const SCENE_PRESETS: ScenePreset[] = ['techno', 'magic', 'survival'];
export const SCENE_LABEL: Record<ScenePreset, string> = {
  techno: 'Завод (техника)',
  magic: 'Кристаллы (магия)',
  survival: 'Холмы (выживание)',
};

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
  glow?: boolean;
}
export interface Glow {
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
}
export interface World {
  voxels: Voxel[];
  glows: Glow[];
  lights: {x: number; y: number; z: number; color: string; intensity: number; distance: number}[];
  /** Небо рисуется CSS-градиентом под прозрачным холстом. */
  sky: [string, string, string];
  fog: string;
  sun: string;
  hemi: [string, string];
  /** Центр и размеры для постановки камеры. */
  focusY: number;
  halfHeight: number;
  halfWidth: number;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Builder {
  private map = new Map<string, Voxel>();
  glows: Glow[] = [];
  constructor(public rand: () => number) {}
  set(x: number, y: number, z: number, color: string, glow = false) {
    this.map.set(`${x},${y},${z}`, {x, y, z, color, glow});
  }
  has(x: number, y: number, z: number) {
    return this.map.has(`${x},${y},${z}`);
  }
  pick(colors: string[]) {
    return colors[Math.floor(this.rand() * colors.length)];
  }
  /** Полый параллелепипед: внутренние блоки не создаются. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, colors: string[], glow = false) {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) {
          const shell = x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1;
          if (shell) this.set(x, y, z, this.pick(colors), glow);
        }
  }
  /** Парящий остров: высота поверхности задаётся функцией, низ сужается конусом. */
  island(radius: number, depth: number, top: (x: number, z: number) => number, layers: (dy: number) => string[]) {
    for (let x = -radius; x <= radius; x++)
      for (let z = -radius; z <= radius; z++) {
        const d = Math.hypot(x, z);
        const edge = radius - (this.rand() < 0.5 ? 0.4 : 0);
        if (d > edge) continue;
        const surface = top(x, z);
        const bottom = -Math.round(depth * Math.pow(1 - d / radius, 0.75) + this.rand() * 1.2);
        for (let y = bottom; y <= surface; y++) {
          // Блок нужен, только если он виден снаружи.
          const inner = y > bottom && y < surface && d < radius - 1.6;
          if (!inner) this.set(x, y, z, this.pick(layers(surface - y)));
        }
      }
  }
  blob(cx: number, cy: number, cz: number, r: number, colors: string[], hole = 0.12) {
    for (let x = -r; x <= r; x++)
      for (let y = -r; y <= r; y++)
        for (let z = -r; z <= r; z++) {
          const d = Math.hypot(x, y * 1.15, z);
          if (d <= r && d > r - 1.5 && this.rand() > hole) this.set(cx + x, cy + y, cz + z, this.pick(colors));
        }
  }
  glowAt(x: number, y: number, z: number, color: string, size: number) {
    this.glows.push({x, y, z, color, size});
  }
  voxels() {
    return [...this.map.values()];
  }
}

function techno(): World {
  const b = new Builder(rng(11));
  const steel = ['#566779', '#5d6f82', '#4f6072'];
  const dark = ['#2e3a47', '#33404e'];
  const plate = ['#3d4b5a', '#445363', '#384554'];
  const cyan = '#6fe9ff';
  const amber = '#ffc061';

  b.island(11, 9, () => 0, dy => (dy === 0 ? plate : dy < 3 ? dark : ['#1b222b', '#202832']));
  // Разметка площадки.
  for (let i = -9; i <= 9; i += 2) b.set(i, 0, 8, i % 4 === 0 ? '#d6a531' : '#1a1f26');

  // Главный корпус с лентами окон.
  b.box(-6, 1, -4, 2, 9, 2, steel);
  for (let x = -5; x <= 1; x += 2) {
    b.set(x, 3, 2, cyan, true);
    b.set(x, 6, 2, cyan, true);
  }
  for (let z = -3; z <= 1; z += 2) b.set(2, 4, z, cyan, true);
  b.box(-6, 10, -4, 2, 10, 2, dark);
  b.glowAt(-2, 5, 3, cyan, 13);

  // Башня управления.
  b.box(-1, 11, -3, 2, 22, 0, ['#465566', '#4c5c6e']);
  for (let y = 13; y <= 20; y += 3) for (let x = -1; x <= 2; x++) b.set(x, y, 0, cyan, true);
  b.box(-2, 23, -4, 3, 23, 1, dark);
  b.box(0, 24, -2, 1, 28, -1, ['#4a5868']);
  b.set(0, 29, -2, '#ff5a4a', true);
  b.set(1, 29, -1, '#ff5a4a', true);
  b.glowAt(0.5, 29.5, -1.5, '#ff5a4a', 6);
  b.glowAt(0.5, 17, 1, cyan, 12);

  // Дымовые трубы и дым.
  const chimney = (x: number, z: number, h: number) => {
    b.box(x, 10, z, x + 1, h, z + 1, ['#5a4a44', '#63524b']);
    b.box(x, h - 2, z, x + 1, h - 2, z + 1, ['#d9d2c7']);
    b.box(x, h, z, x + 1, h, z + 1, ['#c8452f']);
    for (let i = 0; i < 7; i++) {
      const s = 1 + Math.floor(i / 3);
      b.box(x + i - 1, h + 2 + i * 2, z - Math.floor(i / 2), x + i - 1 + s, h + 2 + i * 2 + s - 1, z - Math.floor(i / 2) + s, ['#8fa2b6', '#9db0c3', '#7f93a8']);
    }
  };
  chimney(-6, -4, 17);
  chimney(-3, -4, 14);

  // Резервуар и трубопровод.
  for (let y = 1; y <= 6; y++)
    for (let x = -2; x <= 2; x++)
      for (let z = -2; z <= 2; z++) {
        const d = Math.hypot(x, z);
        if (d <= 2.3 && d > 1.2) b.set(6 + x, y, 4 + z, y === 4 ? cyan : b.pick(['#2f6d78', '#337783']), y === 4);
      }
  b.box(4, 7, 2, 8, 7, 6, ['#2a5f69']);
  b.glowAt(6, 4, 6.5, cyan, 8);
  for (let x = 3; x <= 5; x++) b.set(x, 8, 0, '#b87333');
  for (let y = 8; y >= 7; y--) b.set(6, y, 0, '#b87333');
  for (let z = 0; z <= 3; z++) b.set(6, 8, z, '#b87333');

  // Шестерня у фасада.
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    const r = a % 3 === 0 ? 4 : 3;
    b.set(-9 + Math.round(Math.cos(t) * r), 5 + Math.round(Math.sin(t) * r), 4, b.pick(['#c9a14a', '#b8923f']));
  }
  b.set(-9, 5, 4, '#8a6d2c');
  b.box(-9, 1, 4, -9, 1, 4, dark);

  // Конвейер с грузом.
  for (let x = -6; x <= 9; x++) b.set(x, 1, 7, x % 2 === 0 ? '#1a1f26' : '#232a33');
  for (let x = -5; x <= 8; x += 3) b.set(x, 2, 7, amber, true);
  b.glowAt(1, 2, 8, amber, 9);
  // Фонари по краю.
  for (const [x, z] of [[-9, -3], [9, -2], [-8, 6], [8, 8]] as const) {
    b.box(x, 1, z, x, 3, z, dark);
    b.set(x, 4, z, cyan, true);
  }

  return {
    voxels: b.voxels(), glows: b.glows,
    lights: [
      {x: -2, y: 6, z: 8, color: cyan, intensity: 260, distance: 26},
      {x: 6, y: 5, z: 9, color: amber, intensity: 120, distance: 18},
    ],
    sky: ['#06121f', '#0f3a52', '#3fb6c8'], fog: '#123a4f', sun: '#d8f4ff', hemi: ['#a8e4f6', '#1c2530'],
    focusY: 10, halfHeight: 22, halfWidth: 12,
  };
}

function magic(): World {
  const b = new Builder(rng(23));
  const moss = ['#6a4fb0', '#7a5cc6', '#5d459e'];
  const stone = ['#3b3354', '#342d4b', '#413a5d'];
  const deep = ['#27213a', '#2d2743'];
  const violet = ['#b58cff', '#c9a6ff', '#9d6eff'];
  const amber = '#ffc46b';
  const pink = '#ff6fd8';

  b.island(10, 11, (x, z) => Math.round(1.6 * Math.exp(-(x * x + z * z) / 40)), dy => (dy === 0 ? moss : dy < 3 ? stone : deep));

  // Главный кристалл.
  for (let y = 2; y <= 24; y++) {
    const w = y < 6 ? 2 : y < 13 ? 1.6 : y < 19 ? 1 : 0.4;
    for (let x = -2; x <= 2; x++)
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) + Math.abs(z) * 0.9 <= w + (b.rand() < 0.25 ? 0.5 : 0)) {
          b.set(x, y, z - 2, violet[Math.min(2, Math.floor(b.rand() * 3))], true);
        }
      }
  }
  b.glowAt(0, 13, -1, '#a070ff', 26);
  b.glowAt(0, 23, -2, '#e6d4ff', 10);

  // Малые кристаллы.
  const spire = (cx: number, cz: number, h: number, color: string) => {
    for (let y = 1; y <= h; y++) {
      const w = y < h * 0.5 ? 1 : 0;
      for (let x = -w; x <= w; x++) for (let z = -w; z <= w; z++) if (Math.abs(x) + Math.abs(z) <= w) b.set(cx + x, y + 1, cz + z, color, true);
    }
    b.glowAt(cx, h * 0.6 + 1, cz + 1, color, h * 0.9);
  };
  spire(-6, 1, 8, amber);
  spire(5, -4, 10, '#b58cff');
  spire(6, 3, 6, pink);
  spire(-4, -5, 6, '#b58cff');

  // Портал.
  for (let a = 0; a < 28; a++) {
    const t = (a / 28) * Math.PI * 2;
    b.set(2 + Math.round(Math.cos(t) * 3.4), 6 + Math.round(Math.sin(t) * 3.4), 6, b.pick(['#1f1a2e', '#2a2340']));
  }
  for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) if (Math.hypot(x, y) <= 2.4) b.set(2 + x, 6 + y, 6, b.rand() < 0.5 ? pink : '#ff9ae6', true);
  b.glowAt(2, 6, 7.5, pink, 15);

  // Дерево с розовой кроной.
  b.box(-6, 2, 5, -6, 7, 5, ['#2a2238']);
  b.set(-5, 6, 5, '#2a2238');
  b.blob(-6, 10, 5, 3, ['#d46bd0', '#e283dd', '#c257c0'], 0.2);

  // Парящие камни.
  for (const [x, y, z, r] of [[-11, 9, -3, 1.6], [11, 14, 2, 1.3], [9, 4, 9, 1.2], [-9, 17, -6, 1], [12, 20, -5, 0.9]] as const) {
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 1; dy++)
        for (let dz = -2; dz <= 2; dz++)
          if (Math.hypot(dx, dy * 1.4, dz) <= r) b.set(x + dx, y + dy, z + dz, dy === 1 || !b.has(x + dx, y + dy + 1, z + dz) ? b.pick(moss) : b.pick(stone));
    b.set(x, y + 2, z, amber, true);
  }
  // Рунное кольцо.
  for (let a = 0; a < 36; a++) {
    if (a % 3 === 2) continue;
    const t = (a / 36) * Math.PI * 2;
    b.set(Math.round(Math.cos(t) * 8), 16 + (a % 2), Math.round(Math.sin(t) * 8) - 2, amber, true);
  }

  return {
    voxels: b.voxels(), glows: b.glows,
    lights: [
      {x: 0, y: 10, z: 5, color: '#a070ff', intensity: 320, distance: 30},
      {x: 3, y: 6, z: 10, color: pink, intensity: 160, distance: 18},
    ],
    sky: ['#12062b', '#6a1b74', '#ff7a5c'], fog: '#5a1a66', sun: '#ffd0f0', hemi: ['#d59bff', '#1a1026'],
    focusY: 8, halfHeight: 20, halfWidth: 12,
  };
}

function survival(): World {
  const b = new Builder(rng(37));
  const grass = ['#5fa052', '#6cb05c', '#559648'];
  const dirt = ['#7a5a3c', '#6f5136'];
  const rock = ['#565a61', '#4c5057', '#60646b'];
  const leaves = ['#3f8a3d', '#4c9b48', '#357a35'];
  const pine = ['#2c6a41', '#245c38', '#33774a'];
  const amber = '#ffc766';

  const height = (x: number, z: number) =>
    Math.max(0, Math.round(5.2 * Math.exp(-((x + 3) * (x + 3) + (z + 3) * (z + 3)) / 34) + 0.8 * Math.sin(x * 0.7) * Math.cos(z * 0.6)));
  b.island(11, 10, height, dy => (dy === 0 ? grass : dy < 3 ? dirt : rock));

  // Пруд.
  for (let x = 3; x <= 8; x++) for (let z = 3; z <= 7; z++) if (Math.hypot(x - 5.5, (z - 5) * 1.3) <= 2.8) b.set(x, height(x, z), z, b.pick(['#3f8fd0', '#4a9bdc']));

  // Высокая сосна на холме — вертикаль кадра.
  const px = -4, pz = -4, base = height(px, pz);
  b.box(px, base + 1, pz, px, base + 15, pz, ['#5b3f28']);
  for (let i = 0; i < 6; i++) {
    const r = Math.max(1, 4 - Math.floor(i * 0.7));
    const y = base + 5 + i * 2;
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (Math.abs(x) + Math.abs(z) <= r + (b.rand() < 0.3 ? 1 : 0)) b.set(px + x, y, pz + z, b.pick(pine));
    for (let x = -r + 1; x <= r - 1; x++) for (let z = -r + 1; z <= r - 1; z++) if (Math.abs(x) + Math.abs(z) <= r - 1) b.set(px + x, y + 1, pz + z, b.pick(pine));
  }
  b.set(px, base + 17, pz, pine[2]);

  // Дубы.
  const oak = (x: number, z: number, h: number, r: number) => {
    const g = height(x, z);
    b.box(x, g + 1, z, x, g + h, z, ['#6b4a2f']);
    b.blob(x, g + h + 1, z, r, leaves, 0.15);
  };
  oak(6, -5, 4, 3);
  oak(-8, 3, 3, 2);
  oak(1, -8, 3, 2);

  // Домик с тёплыми окнами.
  const hx = 1, hz = 3, g = height(hx, hz);
  b.box(hx, g + 1, hz, hx + 5, g + 4, hz + 4, ['#b08a57', '#a57f4e', '#b99363']);
  for (let i = 0; i < 4; i++) b.box(hx - 1 + i, g + 5 + i, hz - 1, hx + 6 - i, g + 5 + i, hz + 5, ['#7b3f2e', '#874634']);
  b.set(hx + 1, g + 2, hz + 4, amber, true);
  b.set(hx + 1, g + 3, hz + 4, amber, true);
  b.set(hx + 4, g + 3, hz + 4, amber, true);
  b.set(hx + 3, g + 1, hz + 4, '#4a3320');
  b.set(hx + 3, g + 2, hz + 4, '#4a3320');
  b.box(hx + 4, g + 6, hz + 1, hx + 4, g + 9, hz + 1, ['#6a6e75']);
  b.glowAt(hx + 2.5, g + 3, hz + 5.5, amber, 10);

  // Костёр.
  const cx = -3, cz = 7, cg = height(cx, cz);
  b.set(cx, cg + 1, cz, '#ff8a2a', true);
  b.set(cx, cg + 2, cz, '#ffd166', true);
  b.set(cx - 1, cg + 1, cz, '#4a3320');
  b.set(cx + 1, cg + 1, cz, '#4a3320');
  b.glowAt(cx, cg + 2, cz + 0.5, '#ff9a3c', 11);

  // Грядка пшеницы.
  for (let x = -9; x <= -6; x++) for (let z = -1; z <= 1; z++) b.set(x, height(x, z) + 1, z, b.pick(['#d8b848', '#c9a93c']));

  // Облака.
  for (const [x, y, z, w] of [[-9, 21, -8, 5], [7, 24, -6, 6], [10, 17, 4, 4]] as const)
    for (let dx = 0; dx < w; dx++) for (let dz = 0; dz < 3; dz++) if (b.rand() > 0.15) b.set(x + dx, y, z + dz, '#eef3f8');

  return {
    voxels: b.voxels(), glows: b.glows,
    lights: [
      {x: -3, y: 4, z: 9, color: '#ff9a3c', intensity: 180, distance: 18},
      {x: 4, y: 6, z: 10, color: amber, intensity: 110, distance: 14},
    ],
    sky: ['#0a2036', '#2b6c7d', '#f3b45a'], fog: '#2f6876', sun: '#ffe2a8', hemi: ['#ffe0b0', '#18241c'],
    focusY: 8, halfHeight: 18, halfWidth: 12,
  };
}

/** Узел аккаунта: маяк на площадке и три портала в цветах серверов. */
function hub(portals: string[]): World {
  const b = new Builder(rng(51));
  const slab = ['#3a3f4b', '#424856', '#353a45'];
  const deep = ['#23262e', '#2a2e37'];
  const amber = '#ffc061';
  b.island(9, 8, () => 0, dy => (dy === 0 ? slab : deep));
  for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 2;
    b.set(Math.round(Math.cos(t) * 5), 0, Math.round(Math.sin(t) * 5), a % 2 ? '#d6a531' : '#8a6d2c');
  }
  // Маяк.
  b.box(-1, 1, -1, 1, 2, 1, ['#2a2e37']);
  for (let y = 3; y <= 15; y++) b.set(0, y, 0, y % 4 === 3 ? '#fff0c8' : amber, true);
  b.box(-1, 16, -1, 1, 16, 1, ['#fff0c8'], true);
  b.glowAt(0, 9, 1, amber, 20);
  b.glowAt(0, 16, 0, '#fff0c8', 9);
  // Порталы.
  portals.slice(0, 3).forEach((color, i) => {
    const t = (-Math.PI / 2) + (i - 1) * 1.15;
    const cx = Math.round(Math.cos(t) * -7.2);
    const cz = Math.round(Math.sin(t) * -7.2) ;
    const alongX = Math.abs(Math.cos(t)) < 0.5;
    for (let a = 0; a < 24; a++) {
      const u = (a / 24) * Math.PI * 2;
      const du = Math.round(Math.cos(u) * 3);
      const dy = Math.round(Math.sin(u) * 3);
      b.set(cx + (alongX ? du : 0), 4 + dy, cz + (alongX ? 0 : du), b.pick(['#1c1f26', '#262a33']));
    }
    for (let du = -2; du <= 2; du++)
      for (let dy = -2; dy <= 2; dy++)
        if (Math.hypot(du, dy) <= 2.3) b.set(cx + (alongX ? du : 0), 4 + dy, cz + (alongX ? 0 : du), color, true);
    b.glowAt(cx, 4, cz, color, 13);
  });
  return {
    voxels: b.voxels(), glows: b.glows,
    lights: [{x: 0, y: 8, z: 4, color: amber, intensity: 240, distance: 26}],
    sky: ['#1a1406', '#4a3410', '#f2b544'], fog: '#3a2a10', sun: '#fff1cf', hemi: ['#ffe6b0', '#20180a'],
    focusY: 6, halfHeight: 14, halfWidth: 11,
  };
}

/** Панорама: три острова в одном кадре — для финального блока. */
function panorama(): World {
  const parts: [World, number, number, number][] = [
    [techno(), -27, -3, 4],
    [magic(), 0, 4, -8],
    [survival(), 27, -2, 5],
  ];
  const voxels: Voxel[] = [];
  const glows: Glow[] = [];
  const lights: World['lights'] = [];
  for (const [w, dx, dy, dz] of parts) {
    for (const v of w.voxels) voxels.push({...v, x: v.x + dx, y: v.y + dy, z: v.z + dz});
    for (const g of w.glows) glows.push({...g, x: g.x + dx, y: g.y + dy, z: g.z + dz});
    for (const l of w.lights) lights.push({...l, x: l.x + dx, y: l.y + dy, z: l.z + dz});
  }
  return {
    voxels, glows, lights,
    sky: ['#0b1020', '#3a1f5c', '#f08a4b'], fog: '#3a2450', sun: '#ffe2c0', hemi: ['#e8c8ff', '#161020'],
    focusY: 9, halfHeight: 22, halfWidth: 42,
  };
}

export type WorldId = ScenePreset | 'panorama' | `hub:${string}`;

const cache = new Map<string, World>();
export function buildWorld(id: WorldId): World {
  let w = cache.get(id);
  if (!w) {
    if (id === 'techno') w = techno();
    else if (id === 'magic') w = magic();
    else if (id === 'survival') w = survival();
    else if (id === 'panorama') w = panorama();
    else w = hub(id.slice(4).split(','));
    cache.set(id, w);
  }
  return w;
}

/** Небо финального блока (панорама трёх миров). */
export const PANORAMA_SKY: [string, string, string] = ['#0b1020', '#3a1f5c', '#f08a4b'];

/** Небо доступно без WebGL: по нему строится запасной фон панели. */
export const SKY: Record<ScenePreset, [string, string, string]> = {
  techno: ['#06121f', '#0f3a52', '#3fb6c8'],
  magic: ['#12062b', '#6a1b74', '#ff7a5c'],
  survival: ['#0a2036', '#2b6c7d', '#f3b45a'],
};
