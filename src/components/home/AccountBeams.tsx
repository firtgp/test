import {useRef} from 'react';
import {CubeIcon, GlobeIcon, RocketLaunchIcon, UserIcon} from '@phosphor-icons/react';
import {AnimatedBeam} from '@/components/ui/animated-beam';
import type {ServerView} from '../../data/types';
import {accentStyle} from '../ServerCard';

/** Схема «один аккаунт»: сайт и лаунчер → аккаунт → серверы. Лучи — Magic UI AnimatedBeam. */
export function AccountBeams({servers, nick}: {servers: ServerView[]; nick: string | null}) {
  const box = useRef<HTMLDivElement>(null);
  const site = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLDivElement>(null);
  const account = useRef<HTMLDivElement>(null);
  const s0 = useRef<HTMLDivElement>(null);
  const s1 = useRef<HTMLDivElement>(null);
  const s2 = useRef<HTMLDivElement>(null);
  const refs = [s0, s1, s2];
  const list = servers.slice(0, 3);
  const beam = {pathColor: 'var(--color-border-emphasized)', pathWidth: 2, pathOpacity: 0.9, duration: 3.2};

  return (
    <div className="mc-beams" ref={box} role="img" aria-label={`Сайт и лаунчер входят в один аккаунт, аккаунт открывает серверы: ${list.map(s => s.name).join(', ')}`}>
      <div className="mc-beams__col">
        <div className="mc-node" ref={site}>
          <GlobeIcon size={22} weight="bold" aria-hidden="true" />
          Сайт
        </div>
        <div className="mc-node" ref={launcher}>
          <RocketLaunchIcon size={22} weight="bold" aria-hidden="true" />
          Лаунчер
        </div>
      </div>
      <div className="mc-beams__col">
        <div className="mc-node mc-node--core" ref={account}>
          <UserIcon size={28} weight="fill" aria-hidden="true" />
          <span className="mc-node__nick">{nick ?? 'Ваш ник'}</span>
          <span className="mc-node__sub">аккаунт</span>
        </div>
      </div>
      <div className="mc-beams__col">
        {list.map((s, i) => (
          <div className="mc-node mc-node--server" ref={refs[i]} key={s.id} style={accentStyle(s.accent)}>
            <CubeIcon size={22} weight="fill" aria-hidden="true" />
            {s.name}
          </div>
        ))}
      </div>
      <AnimatedBeam containerRef={box} fromRef={site} toRef={account} curvature={-30} gradientStartColor="var(--color-accent)" gradientStopColor="var(--mc-cta-top)" {...beam} />
      <AnimatedBeam containerRef={box} fromRef={launcher} toRef={account} curvature={30} delay={1} gradientStartColor="var(--color-accent)" gradientStopColor="var(--mc-cta-top)" {...beam} />
      {list.map((s, i) => (
        <AnimatedBeam
          key={s.id}
          containerRef={box}
          fromRef={account}
          toRef={refs[i]}
          curvature={(i - (list.length - 1) / 2) * -24}
          delay={0.6 + i * 0.5}
          gradientStartColor={s.accent}
          gradientStopColor={s.accent}
          {...beam}
        />
      ))}
    </div>
  );
}
