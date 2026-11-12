// Проверки SQL-гарантий на локальном PostgreSQL (см. tests/sql/run.sh и shim.sql).
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import pg from 'pg';
import {createHash, randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';

const url = process.env.PGURL!;
const pool = new pg.Pool({connectionString: url, max: 8});
const SRV_A = '20000000-0000-4000-8000-000000000001';
const SRV_B = '20000000-0000-4000-8000-000000000002';

async function signUp(nick: string, email = `${nick.toLowerCase()}-${randomBytes(3).toString('hex')}@example.org`) {
  const r = await pool.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('nick', $2::text)) returning id`,
    [email, nick],
  );
  return r.rows[0].id as string;
}

/** Выполняет запросы от имени пользователя, как это делает PostgREST: роль + sub из JWT. */
async function as<T>(userId: string | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query(`select set_config('role', $1, true), set_config('request.jwt.claim.sub', $2, true)`, [
      userId ? 'authenticated' : 'anon',
      userId ?? '',
    ]);
    const out = await fn(c);
    await c.query('commit');
    return out;
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    c.release();
  }
}

let owner: string, modA: string, player: string, victim: string;

beforeAll(async () => {
  owner = await signUp('OwnerOne');
  modA = await signUp('ModOfA');
  player = await signUp('PlainPlayer');
  victim = await signUp('Victim_1');
  await pool.query(`insert into public.staff_roles (user_id, role) values ($1, 'owner')`, [owner]);
  await pool.query(`insert into public.staff_roles (user_id, role, server_id) values ($1, 'moderator', $2)`, [modA, SRV_A]);
});
afterAll(() => pool.end());

describe('ник', () => {
  it('две одновременные регистрации одного ника в разном регистре: проходит ровно одна', async () => {
    const results = await Promise.allSettled([
      signUp('RaceNick', 'race1@example.org'),
      signUp('racenick', 'race2@example.org'),
      signUp('RACENICK', 'race3@example.org'),
    ]);
    const ok = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(2);
    for (const f of failed) expect(String(f.reason.message)).toContain('nick_taken');
    // Проигравшие не оставили «половинных» аккаунтов.
    const users = await pool.query(`select count(*)::int n from auth.users where email like 'race%@example.org'`);
    expect(users.rows[0].n).toBe(1);
  });

  it('недопустимый ник отклоняется на уровне БД', async () => {
    await expect(signUp('ab')).rejects.toThrow(/nick_invalid/);
    await expect(signUp('имя_кириллицей')).rejects.toThrow(/nick_invalid/);
    await expect(signUp('way_too_long_nickname_x')).rejects.toThrow(/nick_invalid/);
  });

  it('nick_available учитывает регистр', async () => {
    const r = await as(null, c => c.query(`select public.nick_available('plainplayer') a, public.nick_available('Free_Nick1') b`));
    expect(r.rows[0]).toEqual({a: false, b: true});
  });

  it('смена ника сохраняет UUID, резервирует старый ник и ограничена по времени', async () => {
    const u = await signUp('OldName');
    const before = await pool.query(`select mc_uuid from public.profiles where id = $1`, [u]);
    const changed = await as(u, c => c.query(`select * from public.change_nick('NewName')`));
    expect(changed.rows[0].nick).toBe('NewName');
    expect(changed.rows[0].mc_uuid).toBe(before.rows[0].mc_uuid);
    // Старый ник 30 дней нельзя занять другому игроку.
    await expect(signUp('oldname')).rejects.toThrow(/nick_taken/);
    // Повторная смена раньше срока запрещена.
    await expect(as(u, c => c.query(`select public.change_nick('Another1')`))).rejects.toThrow(/nick_cooldown/);
    // Занятый ник получить нельзя.
    const u2 = await signUp('SecondGuy');
    await expect(as(u2, c => c.query(`select public.change_nick('newname')`))).rejects.toThrow(/nick_taken/);
  });
});

describe('права', () => {
  it('аноним и обычный игрок не могут менять контент', async () => {
    const anon = await as(null, c => c.query(`update public.servers set name = 'x' where id = $1`, [SRV_A]).catch(e => e));
    expect(String(anon.message ?? '')).toMatch(/permission denied/);
    const upd = await as(player, c => c.query(`update public.servers set name = 'hacked' where id = $1`, [SRV_A]));
    expect(upd.rowCount).toBe(0);
    await expect(
      as(player, c => c.query(`insert into public.news (slug, title) values ('hack', 'hack')`)),
    ).rejects.toThrow(/row-level security/);
  });

  it('владелец меняет контент, изменение попадает в журнал', async () => {
    const upd = await as(owner, c => c.query(`update public.servers set tagline = tagline where id = $1`, [SRV_A]));
    expect(upd.rowCount).toBe(1);
    const log = await pool.query(`select actor from public.audit_log where action = 'update:servers' order by id desc limit 1`);
    expect(log.rows[0].actor).toBe(owner);
  });

  it('прямой запрос к чужому профилю, банам и журналу ничего не возвращает', async () => {
    const r = await as(player, c => c.query(`select id from public.profiles`));
    expect(r.rows.map(x => x.id)).toEqual([player]);
    const audit = await as(player, c => c.query(`select count(*)::int n from public.audit_log`));
    expect(audit.rows[0].n).toBe(0);
    await expect(as(player, c => c.query(`select * from public.game_sessions`))).rejects.toThrow(/permission denied/);
    await expect(as(player, c => c.query(`select * from auth.users`))).rejects.toThrow(/permission denied/);
  });

  it('модератор сервера A банит на A, но не на B и не глобально', async () => {
    const ban = await as(modA, c => c.query(`select * from public.staff_ban($1, $2, 'гриферство', null)`, [victim, SRV_A]));
    expect(ban.rows[0].server_id).toBe(SRV_A);
    await expect(as(modA, c => c.query(`select public.staff_ban($1, $2, 'гриферство', null)`, [victim, SRV_B]))).rejects.toThrow(/forbidden/);
    await expect(as(modA, c => c.query(`select public.staff_ban($1, null, 'гриферство', null)`, [victim]))).rejects.toThrow(/forbidden/);
    await expect(as(player, c => c.query(`select public.staff_ban($1, $2, 'гриферство', null)`, [victim, SRV_A]))).rejects.toThrow(/forbidden/);
    const log = await pool.query(`select actor from public.audit_log where action = 'ban' order by id desc limit 1`);
    expect(log.rows[0].actor).toBe(modA);
  });

  it('роли: игрок не выдаёт роли, единственного владельца снять нельзя', async () => {
    await expect(as(player, c => c.query(`select public.grant_staff_role('PlainPlayer', 'owner', null)`))).rejects.toThrow(/forbidden/);
    await expect(as(modA, c => c.query(`select public.grant_staff_role('PlainPlayer', 'support', null)`))).rejects.toThrow(/forbidden/);
    const id = (await pool.query(`select id from public.staff_roles where user_id = $1 and role = 'owner'`, [owner])).rows[0].id;
    await expect(as(owner, c => c.query(`select public.revoke_staff_role($1)`, [id]))).rejects.toThrow(/last_owner/);
  });

  it('правила публикует только администратор, номер версии выдаёт база', async () => {
    await expect(as(player, c => c.query(`select public.publish_rules('текст', '')`))).rejects.toThrow(/forbidden/);
    const v = await as(owner, c => c.query(`select * from public.publish_rules('## Новая редакция', 'уточнения')`));
    expect(v.rows[0].version).toBe(2);
  });
});

describe('лаунчер', () => {
  const hash = (t: string) => createHash('sha256').update(t).digest();

  it('вход → join → hasJoined; серверный бан не пускает на свой сервер', async () => {
    const token = randomBytes(32).toString('hex');
    const s = await pool.query(`select * from public.launcher_create_session($1, $2)`, [player, hash(token)]);
    expect(s.rows[0].nick).toBe('PlainPlayer');
    const joined = await pool.query(`select public.launcher_join($1, $2, 'srvhash') ok`, [hash(token), s.rows[0].mc_uuid]);
    expect(joined.rows[0].ok).toBe(true);
    const has = await pool.query(`select * from public.launcher_has_joined('plainplayer', 'srvhash', $1)`, [SRV_A]);
    expect(has.rows[0].mc_uuid).toBe(s.rows[0].mc_uuid);
    // Чужой токен и чужой сервер не проходят.
    const bad = await pool.query(`select public.launcher_join($1, $2, 'srvhash') ok`, [hash('other'), s.rows[0].mc_uuid]);
    expect(bad.rows[0].ok).toBe(false);
    expect((await pool.query(`select * from public.launcher_has_joined('plainplayer', 'another', $1)`, [SRV_A])).rowCount).toBe(0);

    // victim забанен на сервере A: в лаунчер войдёт, на A не попадёт, на B попадёт.
    const vt = randomBytes(32).toString('hex');
    const vs = await pool.query(`select * from public.launcher_create_session($1, $2)`, [victim, hash(vt)]);
    await pool.query(`select public.launcher_join($1, $2, 'h2')`, [hash(vt), vs.rows[0].mc_uuid]);
    expect((await pool.query(`select * from public.launcher_has_joined('Victim_1', 'h2', $1)`, [SRV_A])).rowCount).toBe(0);
    expect((await pool.query(`select * from public.launcher_has_joined('Victim_1', 'h2', $1)`, [SRV_B])).rowCount).toBe(1);
  });

  it('забаненный на всём проекте не входит в лаунчер, действующие сессии закрываются', async () => {
    const u = await signUp('BannedGuy');
    const t = randomBytes(32).toString('hex');
    await pool.query(`select public.launcher_create_session($1, $2)`, [u, hash(t)]);
    await as(owner, c => c.query(`select public.staff_ban($1, null, 'читы', null)`, [u]));
    expect((await pool.query(`select count(*)::int n from public.game_sessions where user_id = $1`, [u])).rows[0].n).toBe(0);
    await expect(pool.query(`select public.launcher_create_session($1, $2)`, [u, hash('t2')])).rejects.toThrow(/banned/);
  });

  it('перебор паролей: после 5 неудач вход по нику блокируется', async () => {
    for (let i = 0; i < 4; i++) await pool.query(`select public.launcher_record_attempt('BruteTarget', '203.0.113.7', false)`);
    expect((await pool.query(`select public.launcher_login_allowed('brutetarget', '203.0.113.7') ok`)).rows[0].ok).toBe(true);
    await pool.query(`select public.launcher_record_attempt('BruteTarget', '203.0.113.7', false)`);
    expect((await pool.query(`select public.launcher_login_allowed('brutetarget', '203.0.113.8') ok`)).rows[0].ok).toBe(false);
  });

  it('истёкшая сессия не проходит join', async () => {
    const t = randomBytes(32).toString('hex');
    const s = await pool.query(`select * from public.launcher_create_session($1, $2, interval '-1 second')`, [player, hash(t)]);
    const j = await pool.query(`select public.launcher_join($1, $2, 'x') ok`, [hash(t), s.rows[0].mc_uuid]);
    expect(j.rows[0].ok).toBe(false);
  });
});

describe('мониторинг и seed', () => {
  it('снимок пишет только service role; более старый снимок не затирает свежий', async () => {
    await expect(
      as(player, c => c.query(`select public.record_server_status($1, true, 5, 100, 20, '1.21.1', null)`, [SRV_A])),
    ).rejects.toThrow(/permission denied/);
    await pool.query(`select public.record_server_status($1, true, 12, 100, 20, '1.21.1', null, now())`, [SRV_A]);
    await pool.query(`select public.record_server_status($1, false, null, null, null, null, 'timeout', now() - interval '5 minutes')`, [SRV_A]);
    const r = await as(null, c => c.query(`select online, players_online from public.server_status where server_id = $1`, [SRV_A]));
    expect(r.rows[0]).toEqual({online: true, players_online: 12});
  });

  it('повторный seed не затирает живые изменения', async () => {
    await pool.query(`update public.servers set name = 'Техно (изменено)' where id = $1`, [SRV_A]);
    await pool.query(readFileSync(new URL('../../supabase/seed.sql', import.meta.url), 'utf8'));
    const r = await pool.query(`select name from public.servers where id = $1`, [SRV_A]);
    expect(r.rows[0].name).toBe('Техно (изменено)');
    expect((await pool.query(`select count(*)::int n from public.servers`)).rows[0].n).toBe(3);
  });
});
