import {GlobeIcon, IdentificationBadgeIcon, RocketLaunchIcon, UserCircleIcon} from '@phosphor-icons/react';
import {DotPattern} from '@/components/ui/dot-pattern';
import {OrbitingCircles} from '@/components/ui/orbiting-circles';
import {useMedia} from '../../app/hooks';
import type {ServerView} from '../../data/types';
import {SceneIcon} from '../sceneIcon';
import {accentStyle} from '../ServerCard';
import {WorldPoster} from '../VoxelScene';

const POINTS = [
  {icon: GlobeIcon, label: 'Сайт'},
  {icon: RocketLaunchIcon, label: 'Лаунчер'},
  {icon: UserCircleIcon, label: 'Кабинет'},
];

/**
 * Схема «один аккаунт»: золотой куб-ключ в центре, вокруг по орбитам — сайт, лаунчер, кабинет
 * и серверы проекта (Magic UI OrbitingCircles). Смысл продублирован списком слева, поэтому
 * сама схема для вспомогательных технологий — одна картинка с описанием.
 */
export function AccountOrbit({servers, nick}: {servers: ServerView[]; nick: string | null}) {
  const small = useMedia('(max-width: 48rem)');
  const inner = small ? 88 : 138;
  const outer = small ? 146 : 232;
  const worlds = servers.slice(0, 4);
  return (
    <figure
      className="mc-orbit"
      role="img"
      aria-label={`Схема: один аккаунт связывает сайт, лаунчер, кабинет и серверы${worlds.length ? ` ${worlds.map(s => `«${s.name}»`).join(', ')}` : ''}`}
      style={{['--r1' as string]: `${inner}px`, ['--r2' as string]: `${outer}px`}}>
      <DotPattern className="mc-orbit__dots" width={22} height={22} cr={1} />
      <span className="mc-orbit__glow" />
      <span className="mc-orbit__ring mc-orbit__ring--1" />
      <span className="mc-orbit__ring mc-orbit__ring--2" />
      <span className="mc-orbit__tracks">
        <OrbitingCircles radius={inner} duration={64} path={false} iconSize={44}>
          {POINTS.map(p => (
            <span className="mc-orbit__chip" key={p.label}>
              <span className="mc-orbit__chip-icon">
                <p.icon size={16} weight="fill" />
              </span>
              {p.label}
            </span>
          ))}
        </OrbitingCircles>
        <OrbitingCircles radius={inner} duration={9} path={false} iconSize={8}>
          <i className="mc-orbit__spark" />
        </OrbitingCircles>
        {worlds.length > 0 ? (
          <OrbitingCircles radius={outer} duration={96} reverse path={false} iconSize={44}>
            {worlds.map(s => (
              <span className="mc-orbit__chip mc-orbit__chip--world" key={s.id} style={accentStyle(s.accent)}>
                <span className="mc-orbit__chip-icon">
                  <SceneIcon scene={s.scene ?? 'survival'} size={16} />
                </span>
                <span className="mc-orbit__chip-name">{s.name}</span>
              </span>
            ))}
          </OrbitingCircles>
        ) : null}
        <OrbitingCircles radius={outer} duration={14} reverse path={false} iconSize={8}>
          <i className="mc-orbit__spark" />
        </OrbitingCircles>
      </span>
      <WorldPoster world="cube" className="mc-orbit__cube mc-float" width={720} height={720} shot={{angle: 0.62, lift: 0.26, fit: 1.02}} />
      <figcaption className="mc-orbit__id" aria-hidden="true">
        <IdentificationBadgeIcon size={18} weight="fill" />
        <span className="mc-orbit__nick">{nick ?? 'Ваш ник'}</span>
        <span className="mc-orbit__uuid">UUID не меняется</span>
      </figcaption>
    </figure>
  );
}
