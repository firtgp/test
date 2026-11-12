import {describe, expect, it} from 'vitest';
import {deriveStatus, totalOnline, STALE_AFTER_MS} from '../../src/data/status';
import {nickSchema} from '../../src/data/types';

const now = Date.parse('2026-11-12T12:00:00Z');
const auto = {status_mode: 'auto' as const, maintenance_note: ''};
const snap = (ageMs: number, online: boolean, players: number | null = 10) => ({
  server_id: 's', checked_at: new Date(now - ageMs).toISOString(), online,
  players_online: players, players_max: 100, latency_ms: 20, version_name: null, error: null,
});

describe('статус сервера', () => {
  it('свежий снимок онлайн', () => {
    expect(deriveStatus(auto, snap(20_000, true, 37), now)).toMatchObject({kind: 'online', players: 37});
  });
  it('устаревший снимок — «нет данных», а не последнее число', () => {
    const s = deriveStatus(auto, snap(STALE_AFTER_MS + 1, true, 99), now);
    expect(s.kind).toBe('stale');
    expect(s).not.toHaveProperty('players');
  });
  it('офлайн и отсутствие снимка различаются', () => {
    expect(deriveStatus(auto, snap(10_000, false), now).kind).toBe('offline');
    expect(deriveStatus(auto, null, now).kind).toBe('unknown');
  });
  it('техработы важнее снимка', () => {
    expect(deriveStatus({status_mode: 'maintenance', maintenance_note: 'до 18:00'}, snap(1000, true), now))
      .toEqual({kind: 'maintenance', note: 'до 18:00'});
  });
  it('суммарный онлайн считает только живые серверы', () => {
    const list = [deriveStatus(auto, snap(1000, true, 30), now), deriveStatus(auto, snap(STALE_AFTER_MS * 2, true, 500), now), deriveStatus(auto, snap(1000, false), now)];
    expect(totalOnline(list)).toEqual({players: 30, servers: 1});
    expect(totalOnline([deriveStatus(auto, null, now)])).toBeNull();
  });
});

describe('ник', () => {
  it.each(['abc', 'Player_01', 'A_B_C_D_E_F_G_H1'])('допустим: %s', n => expect(nickSchema.safeParse(n).success).toBe(true));
  it.each(['ab', 'имя', 'with space', 'way_too_long_nick1', 'bad-dash', ''])('недопустим: %s', n => expect(nickSchema.safeParse(n).success).toBe(false));
});
