import {useEffect, useRef, useState} from 'react';
import type {Shot} from '../scenes/engine';
import {SKY, type ScenePreset, type WorldId} from '../scenes/meta';

// Движок с three.js грузится отдельным файлом при первом обращении.
const loadEngine = () => import('../scenes/engine');

/**
 * Живая сцена из блоков. Один приём движения — медленный облёт камеры.
 * Без WebGL остаётся градиент неба. Сцена не рисуется вне экрана и в скрытой вкладке;
 * при reduced motion — один кадр.
 */
export function VoxelScene({
  world: worldId, className, stage = false,
}: {
  world: WorldId;
  className?: string;
  /** Режим сцены персонажа: без неба, с полным оборотом и поворотом перетаскиванием. */
  stage?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const sky = !stage && worldId in SKY ? SKY[worldId as ScenePreset] : null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    loadEngine()
      .then(engine => {
        if (disposed) return;
        let renderer: ReturnType<typeof engine.createRenderer>;
        try {
          // Мягкие тени в живой сцене считаются в каждом кадре. Три мира первого экрана на телефоне
          // и на слабом процессоре идут без них; сцена персонажа одна, ей тени оставлены.
          const light = window.innerWidth < 1024 || (navigator.hardwareConcurrency ?? 4) < 6;
          renderer = engine.createRenderer({shadows: stage || !light});
        } catch {
          return; // WebGL недоступен: остаётся градиент.
        }
        const world = engine.buildWorld(worldId);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canvas = renderer.domElement;
        canvas.setAttribute('aria-hidden', 'true');
        host.appendChild(canvas);
        const built = engine.createWorldScene(world);
        renderer.shadowMap.needsUpdate = true;

        const camera = engine.createCamera();
        let distance = 80;
        // Поворот сцены персонажа: сам медленно вращается, перетаскивание и стрелки поворачивают вручную.
        let spin = 0.5;
        let last = performance.now();
        let dragging = false;
        let idleUntil = 0;
        const draw = (t: number) => {
          if (stage) {
            const dt = Math.min(64, t - last);
            last = t;
            if (!reduce && !dragging && t > idleUntil) spin += dt * 0.00035;
            engine.aimCamera(camera, world, distance, {angle: spin, lift: 0.1, drop: 0.04});
          } else {
            engine.aimCamera(camera, world, distance, {
              angle: 0.55 + (reduce ? 0 : Math.sin(t / 9000) * 0.28),
              lift: 0.2 + (reduce ? 0 : Math.sin(t / 13000) * 0.04),
              // Мир стоит в верхней части кадра: нижнюю треть панели занимает подпись.
              drop: 0.42,
            });
          }
          renderer.render(built.scene, camera);
        };
        const resize = () => {
          const w = host.clientWidth || 1;
          const h = host.clientHeight || 1;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          // Мир вписывается по высоте; по ширине допускается обрезка краёв острова.
          distance = stage ? engine.fitDistance(camera, world, 1.06, 1.06) : engine.fitDistance(camera, world, 1.45, 1.02);
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

        // Ручной поворот: указатель и клавиатура. При reduced motion кадр перерисовывается по событию.
        let startX = 0;
        let startSpin = 0;
        const redraw = () => {
          if (!frame) draw(performance.now());
        };
        const onDown = (e: PointerEvent) => {
          dragging = true;
          startX = e.clientX;
          startSpin = spin;
          host.setPointerCapture(e.pointerId);
        };
        const onMove = (e: PointerEvent) => {
          if (!dragging) return;
          spin = startSpin + (e.clientX - startX) * 0.012;
          redraw();
        };
        const onUp = () => {
          dragging = false;
          idleUntil = performance.now() + 2500;
        };
        const onKey = (e: KeyboardEvent) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          spin += e.key === 'ArrowLeft' ? -0.3 : 0.3;
          idleUntil = performance.now() + 2500;
          redraw();
        };
        if (stage) {
          host.addEventListener('pointerdown', onDown);
          host.addEventListener('pointermove', onMove);
          host.addEventListener('pointerup', onUp);
          host.addEventListener('pointercancel', onUp);
          host.addEventListener('keydown', onKey);
        }
        resize();
        setReady(true);

        cleanup = () => {
          cancelAnimationFrame(frame);
          io.disconnect();
          ro.disconnect();
          document.removeEventListener('visibilitychange', update);
          host.removeEventListener('pointerdown', onDown);
          host.removeEventListener('pointermove', onMove);
          host.removeEventListener('pointerup', onUp);
          host.removeEventListener('pointercancel', onUp);
          host.removeEventListener('keydown', onKey);
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
  }, [worldId, stage]);

  return (
    <div
      ref={hostRef}
      className={`mc-scene${ready ? ' mc-scene--ready' : ''}${stage ? ' mc-scene--stage' : ''}${className ? ` ${className}` : ''}`}
      style={sky ? {background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 52%, ${sky[2]} 100%)`} : undefined}
      {...(stage
        ? {tabIndex: 0, role: 'img', 'aria-label': 'Трёхмерная модель персонажа. Перетащите или нажимайте стрелки влево и вправо, чтобы повернуть.'}
        : {'aria-hidden': true})}
    />
  );
}

/** Готовит постер заранее. Ключ кеша тот же, что у WorldPoster с такими же параметрами. */
export function preloadPoster(world: WorldId, width: number, height: number, shot: Shot = {}) {
  loadEngine()
    .then(engine => engine.renderPoster(world, width, height, JSON.parse(JSON.stringify(shot)), true))
    .catch(() => null);
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
        loadEngine()
          .then(engine => engine.renderPoster(world, width, height, JSON.parse(shotKey)))
          .catch(() => null)
          .then(url => {
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
    <span
      ref={ref}
      className={`mc-poster${src ? ' mc-poster--ready' : ''}${failed ? ' mc-poster--failed' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden="true">
      {src ? <img src={src} alt="" width={width} height={height} decoding="async" /> : null}
    </span>
  );
}
