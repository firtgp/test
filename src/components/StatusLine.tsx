import {CheckCircleIcon, ClockCounterClockwiseIcon, QuestionIcon, WrenchIcon, XCircleIcon} from '@phosphor-icons/react';
import type {DisplayStatus} from '../data/status';
import type {SiteSettings} from '../data/types';
import {formatTime} from '../app/format';

/** Статус сервера: всегда значок и текст, цвет — только дополнение. */
export function StatusLine({status, settings}: {status: DisplayStatus; settings: SiteSettings}) {
  switch (status.kind) {
    case 'online':
      return (
        <span className="mc-status mc-status--online">
          <CheckCircleIcon size={20} weight="fill" aria-hidden="true" />
          <span>
            Онлайн
            {status.players != null ? (
              <span className="mc-status__detail">
                {' · '}
                {status.players}
                {status.max != null ? ` из ${status.max}` : ''} игроков
              </span>
            ) : null}
          </span>
        </span>
      );
    case 'offline':
      return (
        <span className="mc-status mc-status--offline">
          <XCircleIcon size={20} weight="fill" aria-hidden="true" />
          <span>
            Офлайн<span className="mc-status__detail"> · проверено в {formatTime(status.checkedAt, settings)}</span>
          </span>
        </span>
      );
    case 'maintenance':
      return (
        <span className="mc-status mc-status--maintenance">
          <WrenchIcon size={20} weight="fill" aria-hidden="true" />
          <span>
            Техработы{status.note ? <span className="mc-status__detail"> · {status.note}</span> : null}
          </span>
        </span>
      );
    case 'stale':
      return (
        <span className="mc-status mc-status--stale">
          <ClockCounterClockwiseIcon size={20} weight="bold" aria-hidden="true" />
          <span>Нет данных с {formatTime(status.since, settings)}</span>
        </span>
      );
    default:
      return (
        <span className="mc-status mc-status--unknown">
          <QuestionIcon size={20} weight="bold" aria-hidden="true" />
          <span>Мониторинг ещё не подключён</span>
        </span>
      );
  }
}
