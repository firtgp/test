// Гарантии магазина и кошелька на локальном PostgreSQL (см. tests/sql/run.sh и shim.sql).
// Здесь нет Supabase и платёжного провайдера: проверяются функции и политики из 0004_shop.sql.
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import pg from 'pg';
import {randomBytes, randomUUID} from 'node:crypto';

const pool = new pg.Pool({connectionString: process.env.PGURL!, max: 8});
const SRV_TECH = '20000000-0000-4000-8000-000000000001';
const SRV_MAGIC = '20000000-0000-4000-8000-000000000002';
const KIT = '60000000-0000-4000-8000-000000000001'; // 120, сервер «Техно»
const DRILL = '60000000-0000-4000-8000-000000000002'; // 900, сервер «Техно»
const BOOK = '60000000-0000-4000-8000-000000000004'; // 150, сервер «Магия»
const STARTER = '60000000-0000-4000-8000-000000000008'; // 50, сервер выбирает покупатель
const SEEKER = '61000000-0000-4000-8000-000000000001'; // ранг 1, 300
const MASTER = '61000000-0000-4000-8000-000000000002'; // ранг 2, 700

async function signUp(nick: string) {
  const r = await pool.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('nick', $2::text)) returning id`,
    [`${nick.toLowerCase()}-${randomBytes(3).toString('hex')}@example.org`, nick],
  );
  return r.rows[0].id as string;
}
/** Запросы от имени игрока, как их выполняет PostgREST: роль + sub из JWT. */
async function as<T>(userId: string | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query(`select set_config('role', $1, true), set_config('request.jwt.claim.sub', $2, true)`, [userId ? 'authenticated' : 'anon', userId ?? '']);
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
/** Пополнение так, как его проводит обработчик webhook: запись игрока + подтверждение серверной ролью. */
async function fund(userId: string, amount: number) {
  const id = await as(userId, async c => (await c.query(`select public.create_topup($1) id`, [amount])).rows[0].id as string);
  await pool.query(`select public.confirm_payment($1, 'test-pay', $2, $3)`, [id, `pay-${randomUUID()}`, amount]);
}
const buy = (userId: string, product: string, server: string | null, key: string) =>
  as(userId, async c => (await c.query(`select * from public.purchase($1, $2, $3)`, [product, server, key])).rows[0]);
const balance = async (userId: string) =>
  (await pool.query(`select coalesce((select balance from public.wallets where user_id = $1), 0) b`, [userId])).rows[0].b as number;
const key = () => `key-${randomUUID()}`;

let owner: string, alice: string, bob: string;
beforeAll(async () => {
  owner = await signUp('ShopOwner');
  alice = await signUp('ShopAlice');
  bob = await signUp('ShopBob');
  await pool.query(`insert into public.staff_roles (user_id, role) values ($1, 'owner')`, [owner]);
});
afterAll(async () => {
  // Второй владелец не должен мешать проверке «единственного владельца снять нельзя» в соседнем файле.
  await pool.query(`delete from public.staff_roles where user_id = $1`, [owner]);
  await pool.end();
});

describe('покупка', () => {
  it('списывает цену из каталога один раз на ключ и ставит задание в очередь выдачи', async () => {
    await fund(alice, 1000);
    const k = key();
    const first = await buy(alice, KIT, SRV_MAGIC, k); // сервер из запроса игнорируется: у товара свой
    const again = await buy(alice, KIT, SRV_MAGIC, k);
    expect(again.id).toBe(first.id);
    expect(first.price).toBe(120);
    expect(first.server_id).toBe(SRV_TECH);
    expect(first.status).toBe('paid');
    expect(await balance(alice)).toBe(880);
    const ledger = await pool.query(`select delta, balance_after from public.wallet_ledger where order_id = $1`, [first.id]);
    expect(ledger.rows).toEqual([{delta: -120, balance_after: 880}]);
    const tasks = await pool.query(`select server_id, status from public.delivery_tasks where order_id = $1`, [first.id]);
    expect(tasks.rows).toEqual([{server_id: SRV_TECH, status: 'pending'}]);
  });

  it('тот же ключ с другим товаром не подменяет заказ', async () => {
    const k = key();
    await buy(alice, KIT, null, k);
    const before = await balance(alice);
    await expect(buy(alice, BOOK, null, k)).rejects.toThrow(/idempotency_conflict/);
    expect(await balance(alice)).toBe(before);
  });

  it('две одновременные покупки при балансе на одну: проходит ровно одна', async () => {
    const racer = await signUp('ShopRacer');
    await fund(racer, 1000);
    const results = await Promise.allSettled([buy(racer, DRILL, null, key()), buy(racer, DRILL, null, key())]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    expect(String(failed.reason.message)).toContain('insufficient_funds');
    expect(await balance(racer)).toBe(100);
  });

  it('нехватка средств, снятый с продажи товар и предмет без сервера — отказ без списания', async () => {
    await expect(buy(bob, KIT, null, key())).rejects.toThrow(/insufficient_funds/);
    await fund(bob, 500);
    await expect(buy(bob, STARTER, null, key())).rejects.toThrow(/server_required/);
    await pool.query(`update public.products set published = false where id = $1`, [BOOK]);
    await expect(buy(bob, BOOK, null, key())).rejects.toThrow(/product_unavailable/);
    await pool.query(`update public.products set published = true where id = $1`, [BOOK]);
    expect(await balance(bob)).toBe(500);
    expect((await pool.query(`select count(*)::int n from public.orders where user_id = $1`, [bob])).rows[0].n).toBe(0);
    await expect(buy(null as unknown as string, KIT, null, key())).rejects.toThrow(/not_authenticated|permission denied/);
  });

  it('ранг: по заданию на каждый сервер, продление от текущего срока, ранг ниже — отказ', async () => {
    const ranked = await signUp('ShopRanked');
    await fund(ranked, 2000);
    const order = await buy(ranked, MASTER, null, key());
    const servers = (await pool.query(`select count(*)::int n from public.servers where published`)).rows[0].n;
    expect((await pool.query(`select count(*)::int n from public.delivery_tasks where order_id = $1`, [order.id])).rows[0].n).toBe(servers);
    const first = (await pool.query(`select tier, expires_at from public.privileges where user_id = $1`, [ranked])).rows[0];
    expect(first.tier).toBe(2);
    await buy(ranked, MASTER, null, key());
    const second = (await pool.query(`select expires_at from public.privileges where user_id = $1`, [ranked])).rows[0];
    expect(Math.round((second.expires_at - first.expires_at) / 86_400_000)).toBe(30);
    await expect(buy(ranked, SEEKER, null, key())).rejects.toThrow(/privilege_lower/);
    expect(await balance(ranked)).toBe(600);
  });
});

describe('прямой доступ', () => {
  it('игрок не может сам изменить баланс, историю, заказ или очередь', async () => {
    for (const sql of [
      `update public.wallets set balance = 1000000`,
      `insert into public.wallets (user_id, balance) values ('${bob}', 999)`,
      `insert into public.wallet_ledger (user_id, delta, reason, title, balance_after) values ('${bob}', 500, 'grant', 'сам себе', 500)`,
      `update public.orders set status = 'delivered'`,
      `delete from public.orders`,
      `select * from public.delivery_tasks`,
      `select public.confirm_payment('${randomUUID()}', 'x', 'y', 100)`,
      `select * from public.claim_deliveries('${SRV_TECH}', 10)`,
      `select public.confirm_delivery('${randomUUID()}', true, null)`,
      `update public.products set price = 1`,
    ]) {
      // Отказ в правах — ошибка; правка каталога без прав молча не затрагивает ни одной строки.
      const outcome = await as(bob, async c => (await c.query(sql)).rowCount).catch(() => 'denied');
      expect([outcome, sql]).toEqual([sql.startsWith('update public.products') ? 0 : 'denied', sql]);
    }
    expect((await pool.query(`select price from public.products where id = $1`, [KIT])).rows[0].price).toBe(120);
  });

  it('игрок видит только свои деньги и заказы', async () => {
    const seen = await as(bob, async c => ({
      wallets: (await c.query(`select user_id from public.wallets`)).rows.map(r => r.user_id),
      orders: (await c.query(`select distinct user_id from public.orders`)).rows.map(r => r.user_id),
      ledger: (await c.query(`select distinct user_id from public.wallet_ledger`)).rows.map(r => r.user_id),
    }));
    expect(seen.wallets).toEqual([bob]);
    expect(seen.orders).toEqual([]);
    expect(seen.ledger).toEqual([bob]);
    const anon = await as(null, async c => (await c.query(`select count(*)::int n from public.products`)).rows[0].n);
    expect(anon).toBeGreaterThan(0); // витрина каталога открыта
    await expect(as(null, c => c.query(`select * from public.wallets`))).rejects.toThrow(/permission denied/);
  });
});

describe('пополнение', () => {
  it('повторный webhook не зачисляет дважды; другая сумма или другой платёж — отказ', async () => {
    const payer = await signUp('ShopPayer');
    const id = await as(payer, async c => (await c.query(`select public.create_topup(300) id`)).rows[0].id as string);
    expect(await balance(payer)).toBe(0); // запись «ожидает оплаты» денег не даёт
    await expect(pool.query(`select public.confirm_payment($1, 'prov', 'p-1', 3000)`, [id])).rejects.toThrow(/payment_mismatch/);
    expect((await pool.query(`select public.confirm_payment($1, 'prov', 'p-1', 300) ok`, [id])).rows[0].ok).toBe(true);
    expect((await pool.query(`select public.confirm_payment($1, 'prov', 'p-1', 300) ok`, [id])).rows[0].ok).toBe(false);
    await expect(pool.query(`select public.confirm_payment($1, 'prov', 'p-2', 300)`, [id])).rejects.toThrow(/payment_mismatch/);
    expect(await balance(payer)).toBe(300);
    // Один платёж провайдера нельзя привязать ко второй записи.
    const other = await as(payer, async c => (await c.query(`select public.create_topup(300) id`)).rows[0].id as string);
    await expect(pool.query(`select public.confirm_payment($1, 'prov', 'p-1', 300)`, [other])).rejects.toThrow(/duplicate key/);
    expect(await balance(payer)).toBe(300);
  });
});

describe('очередь выдачи', () => {
  it('выключенный сервер: задание ждёт; чужой сервер его не получает; подтверждение закрывает заказ', async () => {
    const buyer = await signUp('ShopQueue');
    await fund(buyer, 500);
    const order = await buy(buyer, BOOK, null, key());
    // «Техно» опрашивает очередь — задания «Магии» ему не отдаются.
    const techno = await pool.query(`select order_id from public.claim_deliveries($1, 50)`, [SRV_TECH]);
    expect(techno.rows.map(r => r.order_id)).not.toContain(order.id);
    expect((await pool.query(`select status from public.orders where id = $1`, [order.id])).rows[0].status).toBe('paid');
    // «Магия» включилась и забрала задание.
    const magic = await pool.query(`select id, order_id, player_uuid, payload from public.claim_deliveries($1, 50)`, [SRV_MAGIC]);
    const task = magic.rows.find(r => r.order_id === order.id);
    expect(task.payload).toMatchObject({product: 'magic-apprentice-book', kind: 'item'});
    const uuid = (await pool.query(`select mc_uuid from public.profiles where id = $1`, [buyer])).rows[0].mc_uuid;
    expect(task.player_uuid).toBe(uuid);
    expect((await pool.query(`select status from public.orders where id = $1`, [order.id])).rows[0].status).toBe('delivering');
    // Пока задание в работе, повторный опрос его не выдаёт.
    const twice = await pool.query(`select id from public.claim_deliveries($1, 50)`, [SRV_MAGIC]);
    expect(twice.rows.map(r => r.id)).not.toContain(task.id);
    // Сервер упал, не ответив: через 5 минут задание выдаётся снова.
    await pool.query(`update public.delivery_tasks set claimed_at = now() - interval '6 minutes' where id = $1`, [task.id]);
    const retry = await pool.query(`select id from public.claim_deliveries($1, 50)`, [SRV_MAGIC]);
    expect(retry.rows.map(r => r.id)).toContain(task.id);
    await pool.query(`select public.confirm_delivery($1, true)`, [task.id]);
    await pool.query(`select public.confirm_delivery($1, true)`, [task.id]); // повтор ничего не ломает
    expect((await pool.query(`select status from public.orders where id = $1`, [order.id])).rows[0].status).toBe('delivered');
  });

  it('ошибка выдачи возвращает задание в очередь, после пятой попытки заказ помечен ошибкой', async () => {
    const buyer = await signUp('ShopFail');
    await fund(buyer, 500);
    const order = await buy(buyer, KIT, null, key());
    const taskId = (await pool.query(`select id from public.delivery_tasks where order_id = $1`, [order.id])).rows[0].id;
    for (let i = 1; i <= 5; i++) {
      await pool.query(`update public.delivery_tasks set status = 'claimed', attempts = $2, claimed_at = now() where id = $1`, [taskId, i]);
      await pool.query(`select public.confirm_delivery($1, false, 'inventory full')`, [taskId]);
      const st = (await pool.query(`select status from public.delivery_tasks where id = $1`, [taskId])).rows[0].status;
      expect(st).toBe(i < 5 ? 'pending' : 'failed');
    }
    expect((await pool.query(`select status from public.orders where id = $1`, [order.id])).rows[0].status).toBe('failed');
  });
});

describe('действия персонала', () => {
  it('возврат: только администратор, один раз, с записью в журнал; выданный заказ не возвращается', async () => {
    const buyer = await signUp('ShopRefund');
    await fund(buyer, 500);
    const order = await buy(buyer, KIT, null, key());
    await expect(as(buyer, c => c.query(`select public.refund_order($1, 'хочу назад')`, [order.id]))).rejects.toThrow(/forbidden/);
    await as(owner, c => c.query(`select public.refund_order($1, 'ошибочная покупка')`, [order.id]));
    expect(await balance(buyer)).toBe(500);
    await expect(as(owner, c => c.query(`select public.refund_order($1, 'ещё раз')`, [order.id]))).rejects.toThrow(/refund_not_allowed/);
    expect(await balance(buyer)).toBe(500);
    expect((await pool.query(`select status from public.delivery_tasks where order_id = $1`, [order.id])).rows[0].status).toBe('cancelled');
    const audit = await pool.query(`select actor from public.audit_log where action = 'refund_order' and target = $1`, [order.id]);
    expect(audit.rows).toEqual([{actor: owner}]);

    const delivered = await buy(buyer, KIT, null, key());
    const task = (await pool.query(`select id from public.claim_deliveries($1, 100) where order_id = $2`, [SRV_TECH, delivered.id])).rows[0];
    await pool.query(`select public.confirm_delivery($1, true)`, [task.id]);
    await expect(as(owner, c => c.query(`select public.refund_order($1, 'после выдачи')`, [delivered.id]))).rejects.toThrow(/refund_not_allowed/);
  });

  it('каталог правит только администратор; ручное начисление — только владелец и с записью в журнал', async () => {
    await as(owner, c => c.query(`update public.products set price = 130 where id = $1`, [KIT]));
    expect((await pool.query(`select price from public.products where id = $1`, [KIT])).rows[0].price).toBe(130);
    await as(owner, c => c.query(`update public.products set price = 120 where id = $1`, [KIT]));
    await expect(as(bob, c => c.query(`select public.grant_currency('ShopBob', 1000, 'себе')`))).rejects.toThrow(/forbidden/);
    const before = await balance(bob);
    await as(owner, c => c.query(`select public.grant_currency('shopbob', 250, 'приз ивента')`));
    expect(await balance(bob)).toBe(before + 250);
    const audit = await pool.query(`select details from public.audit_log where action = 'grant_currency' and target = $1`, [bob]);
    expect(audit.rows[0].details).toMatchObject({amount: 250});
  });

  it('образ персонажа: игрок меняет только свой и только на допустимый', async () => {
    await as(bob, c => c.query(`select public.set_avatar_style('mage')`));
    expect((await pool.query(`select avatar_style from public.profiles where id = $1`, [bob])).rows[0].avatar_style).toBe('mage');
    await expect(as(bob, c => c.query(`select public.set_avatar_style('dragon')`))).rejects.toThrow(/check constraint/);
    expect((await pool.query(`select avatar_style from public.profiles where id = $1`, [alice])).rows[0].avatar_style).toBe('wanderer');
  });
});
