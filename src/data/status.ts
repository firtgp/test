import type {Server, ServerStatus} from './types';

/** Снимок старше этого считается устаревшим: воркер опрашивает раз в минуту. */
export const STALE_AFTER_MS = 3 * 60 * 1000;

export type DisplayStatus =
  | {kind: 'online'; players: number | null; max: number | null; checkedAt: string}
  | {kind: 'offline'; checkedAt: string}
  | {kind: 'maintenance'; note: string}
  | {kind: 'stale'; since: string}
  | {kind: 'unknown'};

/**
 * Что показывать посетителю. Онлайн никогда не дорисовывается:
 * нет свежего снимка — пишем «нет данных», а не последнее известное число.
 */
export function deriveStatus(
  server: Pick<Server, 'status_mode' | 'maintenance_note'>,
  status: ServerStatus | null,
  now: number,
  staleAfterMs = STALE_AFTER_MS,
): DisplayStatus {
  if (server.status_mode === 'maintenance') {
    return {kind: 'maintenance', note: server.maintenance_note};
  }
  if (!status) return {kind: 'unknown'};
  const age = now - new Date(status.checked_at).getTime();
  if (!Number.isFinite(age) || age > staleAfterMs) {
    return {kind: 'stale', since: status.checked_at};
  }
  if (!status.online) return {kind: 'offline', checkedAt: status.checked_at};
  return {
    kind: 'online',
    players: status.players_online,
    max: status.players_max,
    checkedAt: status.checked_at,
  };
}

/** Суммарный онлайн считается только по серверам со свежим снимком «онлайн». */
export function totalOnline(statuses: DisplayStatus[]): {players: number; servers: number} | null {
  const live = statuses.filter(s => s.kind === 'online');
  if (live.length === 0) return null;
  return {
    players: live.reduce((sum, s) => sum + (s.kind === 'online' ? (s.players ?? 0) : 0), 0),
    servers: live.length,
  };
}
