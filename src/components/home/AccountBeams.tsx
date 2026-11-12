import {useRef} from 'react';
import {CubeIcon, GlobeIcon, RocketLaunchIcon, UserIcon} from '@phosphor-icons/react';
import {AnimatedBeam} from '@/components/ui/animated-beam';
import type {ServerView} from '../../data/types';
import {accentStyle} from '../ServerCard';
import {WorldPoster} from '../VoxelScene';

// Цвета лучей на янтарном поле: «чернила» темы и светлый блик.
const INK = '#1A1406';
const SPARK = '#FFF4D6';

/**
 * Композиция «один аккаунт»: сайт и лаунчер → узел аккаунта → серверы.
 * В центре — сцена узла с порталами в цветах серверов, лучи — Magic UI AnimatedBeam.
 */
export function AccountBeams({servers, nick}: {servers: ServerView[]; nick: string | null}) {
  const box = useRef<HTMLDivElement>(null);
  const site = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLDivElement>(null);
  const core = useRef<HTMLDivElement>(null);
  const s0 = useRef<HTMLDivElement>(null);
  const s1 = useRef<HTMLDivElement>(null);
  const s2 = useRef<HTMLDivElement>(null);
  const refs = [s0, s1, s2];
  const list = servers.slice(0, 3);
  const beam = {pathColor: INK, pathWidth: 3, pathOpacity: 0.3, duration: 3.2, gradientStartColor: SPARK, gradientStopColor: INK};

  return (
    <div
      className="mc-beams"
      ref={box}
      role="img"
      aria-label={`Сайт и лаунчер входят в один аккаунт, аккаунт открывает серверы: ${list.map(s => s.name).join(', ')}`}>
      <div className="mc-beams__col">
        <div className="mc-node" ref={site}>
          <GlobeIcon size={24} weight="bold" aria-hidden="true" />
          <span className="mc-node__text">
            <span className="mc-node__title">Сайт</span>
            <span className="mc-node__sub">кабинет и новости</span>
          </span>
        </div>
        <div className="mc-node" ref={launcher}>
          <RocketLaunchIcon size={24} weight="bold" aria-hidden="true" />
          <span className="mc-node__text">
            <span className="mc-node__title">Лаунчер</span>
            <span className="mc-node__sub">вход и запуск игры</span>
          </span>
        </div>
      </div>
      <div className="mc-beams__core" ref={core}>
        <WorldPoster
          world={`hub:${list.map(s => s.accent).join(',')}`}
          className="mc-beams__art"
          width={800}
          height={800}
          shot={{angle: 0.2, lift: 0.3, fit: 0.98, drop: 0.08}}
        />
        <span className="mc-beams__plate">
          <UserIcon size={22} weight="fill" aria-hidden="true" />
          <span className="mc-node__nick">{nick ?? 'Ваш ник'}</span>
          <span className="mc-node__sub">один аккаунт</span>
        </span>
      </div>
      <div className="mc-beams__col">
        {list.map((s, i) => (
          <div className="mc-node mc-node--server" ref={refs[i]} key={s.id} style={accentStyle(s.accent)}>
            <CubeIcon size={24} weight="fill" aria-hidden="true" />
            <span className="mc-node__text">
              <span className="mc-node__title">{s.name}</span>
              {s.modpack ? <span className="mc-node__sub">{s.modpack.name}</span> : null}
            </span>
          </div>
        ))}
      </div>
      <AnimatedBeam containerRef={box} fromRef={site} toRef={core} curvature={-30} {...beam} />
      <AnimatedBeam containerRef={box} fromRef={launcher} toRef={core} curvature={30} delay={1} {...beam} />
      {list.map((s, i) => (
        <AnimatedBeam
          key={s.id}
          containerRef={box}
          fromRef={core}
          toRef={refs[i]}
          curvature={(i - (list.length - 1) / 2) * -24}
          delay={0.6 + i * 0.5}
          {...beam}
        />
      ))}
    </div>
  );
}
