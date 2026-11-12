import {useEffect, useState, type CSSProperties, type PointerEvent} from 'react';
import {Link} from 'react-router';
import {ArrowRightIcon, CalendarBlankIcon, GameControllerIcon, PuzzlePieceIcon} from '@phosphor-icons/react';
import {BorderBeam} from '@/components/ui/border-beam';
import {formatDateTime, serverAddress} from '../../app/format';
import {deriveStatus, type DisplayStatus} from '../../data/status';
import {LOADER_LABEL, type ServerView, type SiteSettings} from '../../data/types';
import {SKY} from '../../scenes/meta';
import {startPath} from '../CtaLink';
import {SceneIcon} from '../sceneIcon';
import {accentStyle, packLine} from '../ServerCard';
import {StatusLine} from '../StatusLine';
import {WorldPoster} from '../VoxelScene';

/** Обратный отсчёт до вайпа. Точная дата продублирована текстом рядом. */
function Countdown({to}: {to: string}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    let id = setInterval(tick, 1000);
    const onVis = () => {
      clearInterval(id);
      if (!document.hidden) {
        tick();
        id = setInterval(tick, 1000);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  const left = Math.max(0, Date.parse(to) - now);
  const parts: [number, string][] = [
    [Math.floor(left / 86_400_000), 'дн'],
    [Math.floor(left / 3_600_000) % 24, 'ч'],
    [Math.floor(left / 60_000) % 60, 'мин'],
    [Math.floor(left / 1000) % 60, 'сек'],
  ];
  return (
    <span className="mc-count" role="timer" aria-label={`До вайпа: ${parts.map(([v, u]) => `${v} ${u}`).join(' ')}`}>
      {parts.map(([v, u]) => (
        <span className="mc-count__cell" key={u} aria-hidden="true">
          <span className="mc-count__value">{String(v).padStart(2, '0')}</span>
          <span className="mc-count__unit">{u}</span>
        </span>
      ))}
    </span>
  );
}

/** Заполненность сервера. Показывается только при свежем снимке «онлайн». */
function OnlineMeter({status}: {status: DisplayStatus}) {
  if (status.kind !== 'online' || status.players == null || !status.max) return null;
  const share = Math.min(1, status.players / status.max);
  return (
    <span className="mc-meter" role="img" aria-label={`Занято ${status.players} из ${status.max} мест`}>
      <i style={{width: `${Math.max(4, Math.round(share * 100))}%`}} />
    </span>
  );
}

/** Пятно света под указателем: координаты уходят в CSS-переменные, без перерисовки React. */
function spotlight(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

function Tile({server, settings, now, featured, rows}: {server: ServerView; settings: SiteSettings; now: number; featured: boolean; rows: number}) {
  const status = deriveStatus(server, server.status, now);
  const wipeSoon = server.next_wipe_at && Date.parse(server.next_wipe_at) > now ? server.next_wipe_at : null;
  const pack = server.modpack;
  const scene = server.scene ?? 'survival';
  const sky = SKY[scene];
  const style: CSSProperties = {...accentStyle(server.accent), ...(featured ? {['--rows' as string]: rows} : {})};
  return (
    <li className={`mc-srv${featured ? ' mc-srv--lead' : ''}`} style={style} onPointerMove={spotlight}>
      <span className="mc-srv__art" style={{background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 58%, ${sky[2]} 100%)`}} aria-hidden="true">
        <WorldPoster
          world={scene}
          className="mc-srv__poster"
          width={featured ? 1100 : 560}
          height={featured ? 720 : 760}
          shot={{angle: featured ? 0.5 : 0.75, lift: 0.2, fit: featured ? 0.86 : 0.98}}
        />
      </span>
      <span className="mc-srv__body">
        <span className="mc-srv__top">
          <span className="mc-srv__icon">
            <SceneIcon scene={scene} size={20} />
          </span>
          <span className="mc-srv__pack">{packLine(server)}</span>
        </span>
        <h3 className="mc-srv__name">
          <Link to={`/servers/${server.slug}`}>{server.name}</Link>
        </h3>
        {server.tagline ? <p className="mc-srv__tagline">{server.tagline}</p> : null}
        <span className="mc-srv__status">
          <StatusLine status={status} settings={settings} />
          <OnlineMeter status={status} />
        </span>
        {featured && wipeSoon ? (
          <span className="mc-srv__wipe">
            <span className="mc-srv__label">До вайпа · {formatDateTime(wipeSoon, settings)}</span>
            <Countdown to={wipeSoon} />
          </span>
        ) : null}
        <ul className="mc-srv__meta">
          {!featured && wipeSoon ? (
            <li>
              <CalendarBlankIcon size={16} weight="fill" aria-hidden="true" />
              <span className="mc-srv__label">Вайп</span>
              <span>{formatDateTime(wipeSoon, settings)}</span>
            </li>
          ) : null}
          {pack ? (
            <li>
              <GameControllerIcon size={16} weight="fill" aria-hidden="true" />
              <span className="mc-srv__label">Версия</span>
              <span>
                {pack.mc_version}
                {featured ? ` · ${LOADER_LABEL[pack.loader]}${pack.java_version ? `, Java ${pack.java_version}` : ''}` : ''}
              </span>
            </li>
          ) : null}
          {server.mod_count > 0 ? (
            <li>
              <PuzzlePieceIcon size={16} weight="fill" aria-hidden="true" />
              <span className="mc-srv__label">Модов</span>
              <span>{server.mod_count}</span>
            </li>
          ) : null}
        </ul>
        {!wipeSoon && server.wipe_policy ? (
          <p className="mc-srv__policy">
            <CalendarBlankIcon size={16} weight="fill" aria-hidden="true" />
            {server.wipe_policy}
          </p>
        ) : null}
        {server.key_mods.length > 0 ? (
          <ul className="mc-srv__mods" aria-label="Ключевые моды">
            {server.key_mods.slice(0, featured ? 5 : 3).map(m => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}
        <span className="mc-srv__foot">
          <Link className="mc-btn mc-btn--accent" to={startPath(server.slug)} aria-label={`Играть на «${server.name}»`}>
            Играть <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
          </Link>
          <Link className="mc-srv__more" to={`/servers/${server.slug}`} aria-label={`О сервере «${server.name}»`}>
            О сервере
          </Link>
          {featured ? (
            <span className="mc-srv__addr">
              <span className="mc-srv__label">Адрес</span>
              {serverAddress(server.host, server.port)}
            </span>
          ) : null}
        </span>
      </span>
      {featured ? <BorderBeam size={180} duration={10} borderWidth={2} colorFrom={server.accent} colorTo="transparent" /> : null}
    </li>
  );
}

/** Серверы плиткой: крупная карточка — у сервера с ближайшим вайпом. У каждой карточки постер её мира. */
export function ServerBento({servers, settings, now}: {servers: ServerView[]; settings: SiteSettings; now: number}) {
  const withWipe = servers
    .filter(s => s.next_wipe_at && Date.parse(s.next_wipe_at) > now)
    .sort((a, b) => Date.parse(a.next_wipe_at!) - Date.parse(b.next_wipe_at!))[0];
  const lead = withWipe ?? servers[0];
  const ordered = [lead, ...servers.filter(s => s.id !== lead.id)];
  return (
    <ul className={`mc-bento${ordered.length === 1 ? ' mc-bento--solo' : ''}`}>
      {ordered.map(s => (
        <Tile key={s.id} server={s} settings={settings} now={now} featured={s.id === lead.id} rows={Math.max(1, ordered.length - 1)} />
      ))}
    </ul>
  );
}
