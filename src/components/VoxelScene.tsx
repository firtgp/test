import {useEffect, useRef, useState} from 'react';
import {SKY, buildWorld, type ScenePreset} from '../scenes/worlds';

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
        const matte = world.voxels.filter(v => !v.glow);
        const lit = world.voxels.filter(v => v.glow);
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const hsl = {h: 0, s: 0, l: 0};
        const fill = (mesh: import('three').InstancedMesh, list: typeof matte, jitter: number) => {
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
        const matteMat = new THREE.MeshLambertMaterial();
        const matteMesh = new THREE.InstancedMesh(geometry, matteMat, matte.length);
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
        const glowMats: import('three').SpriteMaterial[] = [];
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

        const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
        let distance = 80;
        const resize = () => {
          const w = host.clientWidth || 1;
          const h = host.clientHeight || 1;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          const v = (camera.fov * Math.PI) / 360;
          const hFov = Math.atan(Math.tan(v) * camera.aspect);
          // Мир вписывается по высоте; по ширине допускается обрезка краёв острова.
          distance = Math.max((world.halfHeight * 1.45) / Math.tan(v), (world.halfWidth * 1.02) / Math.tan(hFov));
          camera.updateProjectionMatrix();
          draw(performance.now());
        };
        const draw = (t: number) => {
          const a = 0.55 + (reduce ? 0 : Math.sin(t / 9000) * 0.28);
          const lift = 0.2 + (reduce ? 0 : Math.sin(t / 13000) * 0.04);
          camera.position.set(Math.sin(a) * distance, world.focusY + distance * lift, Math.cos(a) * distance);
          // Мир стоит в верхней части кадра: нижнюю треть панели занимает подпись.
          camera.lookAt(0, world.focusY - world.halfHeight * 0.42, 0);
          renderer.render(scene, camera);
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
          geometry.dispose();
          matteMat.dispose();
          litMat.dispose();
          glowTex.dispose();
          glowMats.forEach(m => m.dispose());
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
