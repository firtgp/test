import {useEffect, useRef} from 'react';

/**
 * ЗАГЛУШКА первого экрана. Это сгенерированный рисунок, а не скриншот мира проекта:
 * замените его собственным рендером (галерея в админке → запись с отметкой «первый экран»
 * пока не реализована; проще всего подставить <img> в Hero). Один приём движения —
 * медленный параллакс слоёв за указателем; при reduced motion он отключён.
 */
function terrain(seed: number, base: number, amp: number, step: number, width = 1600): string {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  let y = base;
  let d = `M0 900 L0 ${base}`;
  for (let x = 0; x < width; x += step) {
    y = Math.max(base - amp, Math.min(base + amp, y + (Math.round(rnd() * 4) - 2) * step * 0.5));
    d += ` L${x} ${y} L${x + step} ${y}`;
  }
  return `${d} L${width} 900 Z`;
}

const FAR = terrain(7, 470, 150, 80);
const MID = terrain(21, 600, 110, 50);
const NEAR = terrain(42, 760, 70, 40);

export function HeroScene() {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--mc-px', ((e.clientX / window.innerWidth - 0.5) * -1).toFixed(3));
        el.style.setProperty('--mc-py', ((e.clientY / window.innerHeight - 0.5) * -1).toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, {passive: true});
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg
      ref={ref}
      className="mc-hero__scene"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false">
      <defs>
        <linearGradient id="mc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-background-body)" />
          <stop offset="0.4" stopColor="color-mix(in srgb, var(--mc-accent-magic) 16%, var(--mc-surface-raised))" />
          <stop offset="0.66" stopColor="color-mix(in srgb, var(--color-accent) 46%, var(--mc-surface-raised))" />
          <stop offset="1" stopColor="var(--mc-surface-raised)" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#mc-sky)" />
      <g className="mc-hero__layer" style={{['--mc-depth' as string]: 6}}>
        <rect x="1180" y="170" width="88" height="88" fill="color-mix(in srgb, var(--color-text-primary) 88%, var(--color-accent))" />
        <g fill="var(--color-text-primary)" opacity="0.55">
          {[[120, 90], [310, 180], [520, 70], [700, 210], [860, 120], [1010, 60], [1420, 110], [1500, 250], [240, 300], [640, 330]].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" />
          ))}
        </g>
      </g>
      <path className="mc-hero__layer" style={{['--mc-depth' as string]: 12}} d={FAR} fill="color-mix(in srgb, var(--mc-accent-magic) 42%, var(--mc-surface-raised))" />
      <path className="mc-hero__layer" style={{['--mc-depth' as string]: 22}} d={MID} fill="color-mix(in srgb, var(--mc-accent-techno) 26%, var(--color-background-surface))" />
      <path className="mc-hero__layer" style={{['--mc-depth' as string]: 36}} d={NEAR} fill="color-mix(in srgb, var(--mc-accent-survival) 16%, var(--color-background-body))" />
    </svg>
  );
}
