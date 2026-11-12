import {useEffect, useRef, useState} from 'react';
import {aimCamera, createWorldScene, fitDistance, renderPoster, type Shot} from '../scenes/engine';
import {SKY, buildWorld, type ScenePreset, type WorldId} from '../scenes/worlds';

/**
 * Живая сцена из блоков. Один приём движения — медленный облёт камеры.
 * Three.js подгружается отдельно; без WebGL остаётся градиент неба.
 * Сцена не рисуется вне экрана и в скрытой вкладке; при reduced motion — один кадр.
 */
export function VoxelScene({preset, className}: {preset: ScenePreset; className?: string}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const sky = SKY[preset];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    import('three')
      .then(THREE => {
        if (disposed) return;
        let renderer: import('three').WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance'});
        } catch {
          return; // WebGL недоступен: остаётся градиент.
        }
        const world = buildWorld(preset);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        const canvas = renderer.domElement;
        canvas.setAttribute('aria-hidden', 'true');
        host.appendChild(canvas);
        const built = createWorldScene(THREE, world);

        const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
        let distance = 80;
        const draw = (t: number) => {
          aimCamera(camera, world, distance, {
            angle: 0.55 + (reduce ? 0 : Math.sin(t / 9000) * 0.28),
            lift: 0.2 + (reduce ? 0 : Math.sin(t / 13000) * 0.04),
            // Мир стоит в верхней части кадра: нижнюю треть панели занимает подпись.
            drop: 0.42,
          });
          renderer.render(built.scene, camera);
        };
        const resize = () => {
          const w = host.clientWidth || 1;
          const h = host.clientHeight || 1;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          // Мир вписывается по высоте; по ширине допускается обрезка краёв острова.
          distance = fitDistance(camera, world, 1.45, 1.02);
          camera.updateProjectionMatrix();
          draw(performance.now());
        };

        let frame = 0;
        let visible = false;
        const loop = (t: number) => {
          draw(t);
          frame = requestAnimationFrame(loop);
        };
        const update = () => {
          const run = visible && !document.hidden && !reduce;
          cancelAnimationFrame(frame);
          frame = 0;
          if (run) frame = requestAnimationFrame(loop);
        };
        const io = new IntersectionObserver(entries => {
          visible = entries.some(e => e.isIntersecting);
          update();
        });
        io.observe(host);
        const ro = new ResizeObserver(resize);
        ro.observe(host);
        document.addEventListener('visibilitychange', update);
        resize();
        setReady(true);

        cleanup = () => {
          cancelAnimationFrame(frame);
          io.disconnect();
          ro.disconnect();
          document.removeEventListener('visibilitychange', update);
          built.dispose();
          renderer.dispose();
          canvas.remove();
        };
      })
      .catch(() => {});

    return () => {
      disposed = true;
      cleanup();
    };
  }, [preset]);

  return (
    <div
      ref={hostRef}
      className={`mc-scene${ready ? ' mc-scene--ready' : ''}${className ? ` ${className}` : ''}`}
      style={{background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 52%, ${sky[2]} 100%)`}}
      aria-hidden="true"
    />
  );
}

/**
 * Статичный постер мира с прозрачным фоном: тот же движок, но один кадр в картинку.
 * Не держит WebGL-контекст, поэтому постеров на странице может быть сколько угодно.
 * Рисуется, когда блок подходит к экрану.
 */
export function WorldPoster({
  world, width = 900, height = 900, shot, className,
}: {world: WorldId; width?: number; height?: number; shot?: Shot; className?: string}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const shotKey = JSON.stringify(shot ?? {});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        io.disconnect();
        renderPoster(world, width, height, JSON.parse(shotKey)).then(url => {
          if (cancelled) return;
          if (url) setSrc(url);
          else setFailed(true); // нет WebGL: блок остаётся с цветным фоном
        });
      },
      {rootMargin: '600px 0px'},
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [world, width, height, shotKey]);

  return (
    <span ref={ref} className={`mc-poster${src ? ' mc-poster--ready' : ''}${failed ? ' mc-poster--failed' : ''}${className ? ` ${className}` : ''}`} aria-hidden="true">
      {src ? <img src={src} alt="" width={width} height={height} decoding="async" /> : null}
    </span>
  );
}
