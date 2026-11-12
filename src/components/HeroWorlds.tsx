import {Link} from 'react-router';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {deriveStatus} from '../data/status';
import type {ServerView, SiteSettings} from '../data/types';
import {startPath} from './CtaLink';
import {SceneIcon} from './sceneIcon';
import {accentStyle, packLine} from './ServerCard';
import {StatusLine} from './StatusLine';
import {VoxelScene} from './VoxelScene';

/** Панели-миры первого экрана: по одной на сервер, каждая со своей сценой и свечением в цвете сборки. */
export function HeroWorlds({servers, settings, now}: {servers: ServerView[]; settings: SiteSettings; now: number}) {
  return (
    <ul className="mc-worlds" aria-label="Серверы проекта">
      {servers.slice(0, 4).map(s => (
        <li key={s.id} className="mc-world" style={accentStyle(s.accent)}>
          <VoxelScene world={s.scene ?? 'survival'} className="mc-world__scene" />
          <span className="mc-world__shade" aria-hidden="true" />
          <span className="mc-world__body">
            <span className="mc-world__icon">
              <SceneIcon scene={s.scene} />
            </span>
            <h2 className="mc-world__name">{s.name}</h2>
            <span className="mc-world__pack">{packLine(s)}</span>
            <StatusLine status={deriveStatus(s, s.status, now)} settings={settings} />
            <span className="mc-world__actions">
              <Link className="mc-world__play" to={startPath(s.slug)} aria-label={`Играть на «${s.name}»`}>
                Играть
                <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
              </Link>
              <Link className="mc-world__more" to={`/servers/${s.slug}`} aria-label={`О сервере «${s.name}»`}>
                О сервере
              </Link>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
