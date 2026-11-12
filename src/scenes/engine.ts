// Общий движок сцен: собирает мир из блоков и ставит камеру.
// Им пользуются живые сцены первого экрана и статичные постеры остальных блоков.
import type * as Three from 'three';
import {buildWorld, type World, type WorldId} from './worlds';

type T = typeof Three;

export interface Shot {
  /** Поворот камеры вокруг мира, радианы. */
  angle?: number;
  /** Высота камеры относительно расстояния. */
  lift?: number;
  /** Запас по кадру: больше — мир мельче. */
  fit?: number;
  /** Смещение точки взгляда вниз в долях высоты мира: мир поднимается в кадре. */
  drop?: number;
}

export function createWorldScene(THREE: T, world: World) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(world.fog, 90, 260);
  scene.add(new THREE.HemisphereLight(world.hemi[0], world.hemi[1], 1.5));
  const sun = new THREE.DirectionalLight(world.sun, 2.4);
  sun.position.set(-14, 22, 16);
  scene.add(sun);
  for (const l of world.lights) {
    const p = new THREE.PointLight(l.color, l.intensity, l.distance, 1.6);
    p.position.set(l.x, l.y, l.z);
    scene.add(p);
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const hsl = {h: 0, s: 0, l: 0};
  const fill = (mesh: Three.InstancedMesh, list: World['voxels'], jitter: number) => {
    list.forEach((v, i) => {
      dummy.position.set(v.x, v.y, v.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(v.color).getHSL(hsl);
      // Лёгкий разброс яркости, чтобы плоскости не выглядели залитыми.
      const n = (Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453) % 1;
      color.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + n * jitter)));
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  const matte = world.voxels.filter(v => !v.glow);
  const lit = world.voxels.filter(v => v.glow);
  const matteMat = new THREE.MeshLambertMaterial();
  const matteMesh = new THREE.InstancedMesh(geometry, matteMat, Math.max(1, matte.length));
  matteMesh.count = matte.length;
  fill(matteMesh, matte, 0.035);
  scene.add(matteMesh);
  const litMat = new THREE.MeshBasicMaterial({toneMapped: false});
  const litMesh = new THREE.InstancedMesh(geometry, litMat, Math.max(1, lit.length));
  litMesh.count = lit.length;
  fill(litMesh, lit, 0.05);
  scene.add(litMesh);

  // Мягкое свечение вокруг источников: спрайты с радиальным градиентом.
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const g = glowCanvas.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  const glowMats: Three.SpriteMaterial[] = [];
  for (const gl of world.glows) {
    const m = new THREE.SpriteMaterial({
      map: glowTex, color: gl.color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, fog: false,
    });
    glowMats.push(m);
    const s = new THREE.Sprite(m);
    s.position.set(gl.x, gl.y, gl.z);
    s.scale.setScalar(gl.size);
    scene.add(s);
  }

  return {
    scene,
    dispose() {
      geometry.dispose();
      matteMat.dispose();
      litMat.dispose();
      glowTex.dispose();
      glowMats.forEach(m => m.dispose());
      matteMesh.dispose();
      litMesh.dispose();
    },
  };
}

/** Расстояние, с которого мир помещается в кадр с данным соотношением сторон. */
export function fitDistance(camera: Three.PerspectiveCamera, world: World, fit: number, fitWidth: number) {
  const v = (camera.fov * Math.PI) / 360;
  const hFov = Math.atan(Math.tan(v) * camera.aspect);
  return Math.max((world.halfHeight * fit) / Math.tan(v), (world.halfWidth * fitWidth) / Math.tan(hFov));
}

export function aimCamera(camera: Three.PerspectiveCamera, world: World, distance: number, shot: Required<Pick<Shot, 'angle' | 'lift' | 'drop'>>) {
  camera.position.set(Math.sin(shot.angle) * distance, world.focusY + distance * shot.lift, Math.cos(shot.angle) * distance);
  camera.lookAt(0, world.focusY - world.halfHeight * shot.drop, 0);
}

// ---------- постеры ----------
const posters = new Map<string, Promise<string | null>>();
let shared: {THREE: T; renderer: Three.WebGLRenderer} | null | undefined;
let queue: Promise<unknown> = Promise.resolve();

/**
 * Рисует мир в картинку с прозрачным фоном. Один общий WebGL-контекст на все постеры,
 * результат кешируется. Без WebGL возвращает null — блок остаётся с цветным фоном.
 */
export function renderPoster(id: WorldId, width: number, height: number, shot: Shot = {}): Promise<string | null> {
  const key = `${id}|${width}x${height}|${JSON.stringify(shot)}`;
  let job = posters.get(key);
  if (!job) {
    // Сбой одного постера не останавливает очередь: функция всегда возвращает значение.
    const run = async (): Promise<string | null> => {
      try {
        if (shared === undefined) {
          try {
            const THREE = await import('three');
            const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
            renderer.setClearColor(0x000000, 0);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.15;
            shared = {THREE, renderer};
          } catch {
            shared = null;
          }
        }
        if (!shared) return null;
        const {THREE, renderer} = shared;
        const world = buildWorld(id);
        const built = createWorldScene(THREE, world);
        built.scene.fog = null; // постер стоит на цветном поле — дымка не нужна
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        const camera = new THREE.PerspectiveCamera(30, width / height, 1, 600);
        const distance = fitDistance(camera, world, shot.fit ?? 1.15, shot.fit ?? 1.15);
        aimCamera(camera, world, distance, {angle: shot.angle ?? 0.55, lift: shot.lift ?? 0.2, drop: shot.drop ?? 0});
        renderer.render(built.scene, camera);
        const url = await new Promise<string | null>(resolve =>
          renderer.domElement.toBlob(b => resolve(b ? URL.createObjectURL(b) : null), 'image/png'),
        );
        built.dispose();
        return url;
      } catch {
        return null;
      }
    };
    job = queue.then(run, run);
    queue = job;
    posters.set(key, job);
  }
  return job;
}
