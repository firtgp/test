import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {BorderBeam} from '@/components/ui/border-beam';
import {MagicCard} from '@/components/ui/magic-card';
import {formatDateTime} from '../../app/format';
import {deriveStatus, type DisplayStatus} from '../../data/status';
import type {ServerView, SiteSettings} from '../../data/types';
import {startPath} from '../CtaLink';
import {accentStyle, packLine} from '../ServerCard';
import {StatusLine} from '../StatusLine';
import {VoxelScene} from '../VoxelScene';

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

/** Заполненность сервера блоками. Показывается только при свежем снимке «онлайн». */
function OnlineMeter({status}: {status: DisplayStatus}) {
  if (status.kind !== 'online' || status.players == null || !status.max) return null;
  const cells = 16;
  const filled = Math.min(cells, Math.round((status.players / status.max) * cells));
  return (
    <span className="mc-meter" role="img" aria-label={`Занято ${status.players} из ${status.max} мест`}>
      {Array.from({length: cells}, (_, i) => (
        <i key={i} className={i < filled ? 'mc-meter__on' : undefined} />
      ))}
    </span>
  );
}

function Tile({server, settings, now, featured}: {server: ServerView; settings: SiteSettings; now: number; featured: boolean}) {
  const status = deriveStatus(server, server.status, now);
  const wipeSoon = server.next_wipe_at && Date.parse(server.next_wipe_at) > now ? server.next_wipe_at : null;
  return (
    <li className={`mc-tile2${featured ? ' mc-tile2--lead' : ''}`} style={accentStyle(server.accent)}>
      {featured ? <VoxelScene preset={server.scene ?? 'survival'} className="mc-tile2__art" /> : null}
      <MagicCard className="mc-tile2__card" gradientColor={`${server.accent}26`} gradientFrom={server.accent} gradientTo={server.accent} gradientSize={featured ? 420 : 280}>
        <span className="mc-tile2__inner">
          <span className="mc-tile2__head">
            <span className="mc-tile2__pack">{packLine(server)}</span>
            <h3 className="mc-tile2__name">
              <Link to={`/servers/${server.slug}`}>{server.name}</Link>
            </h3>
          </span>
          {server.tagline ? <p className="mc-tile2__tagline">{server.tagline}</p> : null}
          <span className="mc-tile2__status">
            <StatusLine status={status} settings={settings} />
            <OnlineMeter status={status} />
          </span>
          {featured && wipeSoon ? (
            <span className="mc-tile2__wipe">
              <span className="mc-tile2__label">До вайпа · {formatDateTime(wipeSoon, settings)}</span>
              <Countdown to={wipeSoon} />
            </span>
          ) : (
            <span className="mc-tile2__wipe">
              <span className="mc-tile2__label">Вайп</span>
              <span>{wipeSoon ? formatDateTime(wipeSoon, settings) : server.wipe_policy || 'Не указано'}</span>
            </span>
          )}
          {server.key_mods.length > 0 ? (
            <ul className="mc-tile2__mods" aria-label="Ключевые моды">
              {server.key_mods.slice(0, featured ? 5 : 3).map(m => (
                <li key={m}>{m}</li>
              ))}
              {server.mod_count > server.key_mods.length ? <li className="mc-tile2__more">+{server.mod_count - server.key_mods.length}</li> : null}
            </ul>
          ) : null}
          <Link className="mc-tile2__go" to={startPath(server.slug)} aria-label={`Играть на «${server.name}»`}>
            Играть <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
          </Link>
        </span>
      </MagicCard>
      {featured ? <BorderBeam size={160} duration={9} borderWidth={2} colorFrom={server.accent} colorTo="transparent" /> : null}
    </li>
  );
}

/** Серверы плиткой: крупная карточка — у сервера с ближайшим вайпом. */
export function ServerBento({servers, settings, now}: {servers: ServerView[]; settings: SiteSettings; now: number}) {
  const withWipe = servers
    .filter(s => s.next_wipe_at && Date.parse(s.next_wipe_at) > now)
    .sort((a, b) => Date.parse(a.next_wipe_at!) - Date.parse(b.next_wipe_at!))[0];
  const lead = withWipe ?? servers[0];
  const ordered = [lead, ...servers.filter(s => s.id !== lead.id)];
  return (
    <ul className="mc-bento">
      {ordered.map(s => (
        <Tile key={s.id} server={s} settings={settings} now={now} featured={s.id === lead.id} />
      ))}
    </ul>
  );
}
