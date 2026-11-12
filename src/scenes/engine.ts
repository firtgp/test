// Общий движок сцен: собирает мир из блоков и ставит камеру.
// Им пользуются живые сцены первого экрана и статичные постеры остальных блоков.
// Модуль подгружается только динамически (import('../scenes/engine')), вместе с three.js:
// в основной файл сайта он не попадает. Из three берутся именованные части, чтобы сборщик
// отбросил неиспользуемое.
import {
  ACESFilmicToneMapping, AdditiveBlending, BoxGeometry, CanvasTexture, Color, DirectionalLight, Fog,
  HemisphereLight, InstancedMesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, PCFSoftShadowMap,
  PerspectiveCamera, PointLight, Scene, Sprite, SpriteMaterial, WebGLRenderer,
} from 'three';
import type {World} from './build';
import type {WorldId} from './meta';
import {buildWorld} from './registry';

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

/** Создаёт WebGL-рендерер с общими настройками; бросает исключение, если WebGL недоступен. */
export function createRenderer({shadows = true, ...options}: {preserveDrawingBuffer?: boolean; shadows?: boolean} = {}) {
  const renderer = new WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance', ...options});
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  // Миры неподвижны, а свет не движется: карта теней считается один раз на сцену.
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  return renderer;
}

export function createCamera(aspect = 1) {
  return new PerspectiveCamera(30, aspect, 1, 600);
}

export function createWorldScene(world: World, shadowSize = 2048) {
  const scene = new Scene();
  scene.fog = new Fog(world.fog, 90, 260);
  scene.add(new HemisphereLight(world.hemi[0], world.hemi[1], 1.5));
  // Ключевой свет с тенями: блоки затеняют друг друга, сцена получает объём.
  const reach = Math.max(world.halfWidth, world.halfHeight) * 1.5 + 4;
  const sun = new DirectionalLight(world.sun, 2.4);
  sun.position.set(-0.5 * reach * 2.2, world.focusY + 0.95 * reach * 2.2, 0.62 * reach * 2.2);
  sun.target.position.set(0, world.focusY, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -reach;
  sun.shadow.camera.right = reach;
  sun.shadow.camera.top = reach;
  sun.shadow.camera.bottom = -reach;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = reach * 6;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.08;
  scene.add(sun, sun.target);
  // Контровой свет сзади даёт цветную кромку по силуэту.
  const rim = new DirectionalLight(world.rim ?? world.sun, 1.5);
  rim.position.set(reach, world.focusY + reach * 0.5, -reach * 1.4);
  rim.target.position.set(0, world.focusY, 0);
  scene.add(rim, rim.target);
  for (const l of world.lights) {
    const p = new PointLight(l.color, l.intensity, l.distance, 1.6);
    p.position.set(l.x, l.y, l.z);
    scene.add(p);
  }

  const geometry = new BoxGeometry(1, 1, 1);
  const dummy = new Object3D();
  const color = new Color();
  const hsl = {h: 0, s: 0, l: 0};
  const fill = (mesh: InstancedMesh, list: World['voxels'], jitter: number) => {
    list.forEach((v, i) => {
      dummy.position.set(v.x, v.y, v.z);
      dummy.scale.setScalar(v.s ?? 1);
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
  const matteMat = new MeshLambertMaterial();
  const matteMesh = new InstancedMesh(geometry, matteMat, Math.max(1, matte.length));
  matteMesh.count = matte.length;
  matteMesh.castShadow = true;
  matteMesh.receiveShadow = true;
  fill(matteMesh, matte, 0.035);
  scene.add(matteMesh);
  const litMat = new MeshBasicMaterial({toneMapped: false});
  const litMesh = new InstancedMesh(geometry, litMat, Math.max(1, lit.length));
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
  const glowTex = new CanvasTexture(glowCanvas);
  const glowMats: SpriteMaterial[] = [];
  for (const gl of world.glows) {
    const m = new SpriteMaterial({
      map: glowTex, color: gl.color, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, fog: false,
    });
    glowMats.push(m);
    const s = new Sprite(m);
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
export function fitDistance(camera: PerspectiveCamera, world: World, fit: number, fitWidth: number) {
  const v = (camera.fov * Math.PI) / 360;
  const hFov = Math.atan(Math.tan(v) * camera.aspect);
  return Math.max((world.halfHeight * fit) / Math.tan(v), (world.halfWidth * fitWidth) / Math.tan(hFov));
}

export function aimCamera(camera: PerspectiveCamera, world: World, distance: number, shot: Required<Pick<Shot, 'angle' | 'lift' | 'drop'>>) {
  camera.position.set(Math.sin(shot.angle) * distance, world.focusY + distance * shot.lift, Math.cos(shot.angle) * distance);
  camera.lookAt(0, world.focusY - world.halfHeight * shot.drop, 0);
}

export {buildWorld};

// ---------- постеры ----------
const posters = new Map<string, Promise<string | null>>();
let shared: WebGLRenderer | null | undefined;
// Очередь постеров. Берётся последний запрошенный: это тот, к которому посетитель только что
// подошёл. Заготовки «на потом» (low) встают в начало и ждут, пока видимое не будет готово.
const pending: (() => Promise<void>)[] = [];
const tasks = new Map<string, () => Promise<void>>();
let pumping = false;
async function pump() {
  if (pumping) return;
  pumping = true;
  while (pending.length > 0) {
    await pending.pop()!();
    // Между постерами страница успевает отрисовать кадр и ответить на прокрутку.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  pumping = false;
}

/**
 * Рисует мир в картинку с прозрачным фоном. Один общий WebGL-контекст на все постеры,
 * результат кешируется. Без WebGL возвращает null — блок остаётся с цветным фоном.
 */
export function renderPoster(id: WorldId, width: number, height: number, shot: Shot = {}, low = false): Promise<string | null> {
  const key = `${id}|${width}x${height}|${JSON.stringify(shot)}`;
  let job = posters.get(key);
  if (job && !low) {
    // Заготовка понадобилась на экране: её задание переезжает в начало очереди.
    const task = tasks.get(key);
    const at = task ? pending.indexOf(task) : -1;
    if (task && at >= 0) {
      pending.splice(at, 1);
      pending.push(task);
    }
  }
  if (!job) {
    // Сбой одного постера не останавливает очередь: функция всегда возвращает значение.
    const run = async (): Promise<string | null> => {
      try {
        if (shared === undefined) {
          try {
            shared = createRenderer({preserveDrawingBuffer: true});
          } catch {
            shared = null;
          }
        }
        if (!shared) return null;
        const renderer = shared;
        const world = buildWorld(id);
        // Маленькой картинке хватает маленькой карты теней: иконка предмета рисуется в разы быстрее.
        const side = Math.max(width, height);
        const built = createWorldScene(world, side <= 400 ? 512 : side <= 1000 ? 1024 : 2048);
        built.scene.fog = null; // постер стоит на цветном поле — дымка не нужна
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        const camera = createCamera(width / height);
        const distance = fitDistance(camera, world, shot.fit ?? 1.15, shot.fit ?? 1.15);
        aimCamera(camera, world, distance, {angle: shot.angle ?? 0.55, lift: shot.lift ?? 0.2, drop: shot.drop ?? 0});
        renderer.shadowMap.needsUpdate = true;
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
    job = new Promise<string | null>(resolve => {
      const task = async () => {
        tasks.delete(key);
        resolve(await run());
      };
      tasks.set(key, task);
      if (low) pending.unshift(task);
      else pending.push(task);
    });
    posters.set(key, job);
    void pump();
  }
  return job;
}
