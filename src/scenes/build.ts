// Строитель сцен из блоков: общие типы и приёмы «лепки».

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
  /** Светящийся блок: не затеняется и не отбрасывает тень. */
  glow?: boolean;
  /** Размер блока, по умолчанию 1. Меньше — «искры» и мелкие детали. */
  s?: number;
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
  /** Небо: CSS-градиент под прозрачным холстом (сверху вниз). */
  sky: [string, string, string];
  fog: string;
  sun: string;
  hemi: [string, string];
  /** Цвет контрового света сзади: даёт цветную кромку по силуэту. */
  rim?: string;
  /** Центр и размеры для постановки камеры. */
  focusY: number;
  halfHeight: number;
  halfWidth: number;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Paint = string[] | ((x: number, y: number, z: number) => string | null);

export class Builder {
  private map = new Map<string, Voxel>();
  glows: Glow[] = [];
  constructor(public rand: () => number) {}
  set(x: number, y: number, z: number, color: string, glow = false, s?: number) {
    this.map.set(`${x},${y},${z}`, s === undefined ? {x, y, z, color, glow} : {x, y, z, color, glow, s});
  }
  del(x: number, y: number, z: number) {
    this.map.delete(`${x},${y},${z}`);
  }
  has(x: number, y: number, z: number) {
    return this.map.has(`${x},${y},${z}`);
  }
  pick(colors: string[]) {
    return colors[Math.floor(this.rand() * colors.length)];
  }
  private paint(p: Paint, x: number, y: number, z: number) {
    return typeof p === 'function' ? p(x, y, z) : this.pick(p);
  }
  /** Полый параллелепипед: внутренние блоки не создаются. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, paint: Paint, glow = false) {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) {
          const shell = x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1;
          if (!shell) continue;
          const c = this.paint(paint, x, y, z);
          if (c) this.set(x, y, z, c, glow);
        }
  }
  /** Сплошной параллелепипед — для мелких деталей. */
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, paint: Paint, glow = false) {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) {
          const c = this.paint(paint, x, y, z);
          if (c) this.set(x, y, z, c, glow);
        }
  }
  /** Парящий остров: высота поверхности задаётся функцией, низ сужается конусом. */
  island(radius: number, depth: number, top: (x: number, z: number) => number, layers: (dy: number) => string[], cx = 0, cz = 0) {
    for (let x = -radius; x <= radius; x++)
      for (let z = -radius; z <= radius; z++) {
        const d = Math.hypot(x, z);
        const edge = radius - (this.rand() < 0.5 ? 0.4 : 0);
        if (d > edge) continue;
        const surface = top(x + cx, z + cz);
        const bottom = -Math.round(depth * Math.pow(1 - d / radius, 0.75) + this.rand() * 1.2);
        for (let y = bottom; y <= surface; y++) {
          // Блок нужен, только если он виден снаружи.
          const inner = y > bottom && y < surface && d < radius - 1.6;
          if (!inner) this.set(x + cx, y, z + cz, this.pick(layers(surface - y)));
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
  /** Маленький светящийся кубик — «искра» в воздухе. */
  mote(x: number, y: number, z: number, color: string, s = 0.3) {
    this.set(x, y, z, color, true, s);
  }
  /** Облако искр вокруг точки. */
  motes(n: number, cx: number, cy: number, cz: number, rx: number, ry: number, color: string | string[], s = 0.3) {
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2;
      const r = Math.sqrt(this.rand()) * rx;
      const c = Array.isArray(color) ? this.pick(color) : color;
      this.mote(
        Math.round((cx + Math.cos(a) * r) * 2) / 2,
        Math.round((cy + (this.rand() * 2 - 1) * ry) * 2) / 2,
        Math.round((cz + Math.sin(a) * r) * 2) / 2,
        c,
        s * (0.6 + this.rand() * 0.8),
      );
    }
  }
  /** Фонарь: светящийся куб «стекла» между тёмными крышками. Возвращает точку света. */
  lantern(x: number, y: number, z: number, color = '#ffc061') {
    const frame = '#2a2f3a';
    this.fill(x - 1, y, z - 1, x + 1, y, z + 1, [frame]);
    this.fill(x - 1, y + 4, z - 1, x + 1, y + 4, z + 1, [frame]);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (let dy = 1; dy <= 3; dy++) {
          const corner = Math.abs(dx) === 1 && Math.abs(dz) === 1;
          this.set(x + dx, y + dy, z + dz, corner ? '#e0a030' : dy === 2 ? '#fff0c8' : color, true);
        }
    this.set(x, y + 5, z, frame);
    this.glowAt(x, y + 2, z, color, 15);
    return {x, y: y + 2, z};
  }
  glowAt(x: number, y: number, z: number, color: string, size: number) {
    this.glows.push({x, y, z, color, size});
  }
  voxels() {
    return [...this.map.values()];
  }
}
