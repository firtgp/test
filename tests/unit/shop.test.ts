// Правила покупки в демо-режиме: те же, что должен гарантировать сервер
// (цена из каталога, одно списание на ключ, отказ без списания).
import {beforeEach, describe, expect, it} from 'vitest';
import type {Backend} from '../../src/data/backend';
import {seedProducts} from '../../src/data/shopSeed';
import {SRV_TECH} from '../../src/data/seed';

const id = (slug: string) => seedProducts.find(p => p.slug === slug)!.id;
const code = async (run: () => Promise<unknown>) => {
  try {
    await run();
    return 'ok';
  } catch (e) {
    return (e as {code?: string}).code ?? 'unknown';
  }
};

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: k => void data.delete(k),
    clear: () => data.clear(),
    key: i => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

let backend: Backend;
beforeEach(async () => {
  globalThis.localStorage = memoryStorage();
  const {createDemoBackend, DEMO_PLAYER} = await import('../../src/data/demoBackend');
  backend = createDemoBackend();
  await backend.signIn(DEMO_PLAYER.email, DEMO_PLAYER.password);
});

describe('покупка за внутреннюю валюту', () => {
  it('повтор запроса с тем же ключом возвращает тот же заказ и не списывает дважды', async () => {
    const first = await backend.purchase(id('tech-mechanic-kit'), null, 'key-1');
    const again = await backend.purchase(id('tech-mechanic-kit'), null, 'key-1');
    expect(again.id).toBe(first.id);
    expect(await backend.getWallet()).toBe(1200 - 120);
    expect(await backend.listOrders()).toHaveLength(1);
    // Сервер выдачи и цена взяты из каталога, а не из запроса.
    expect(first.server_id).toBe(SRV_TECH);
    expect(first.price).toBe(120);
    // Демо: игровой сервер не подключён, заказ ждёт выдачи.
    expect(first.status).toBe('paid');
  });

  it('тот же ключ с другим товаром не подменяет заказ', async () => {
    await backend.purchase(id('tech-mechanic-kit'), null, 'key-1');
    expect(await code(() => backend.purchase(id('magic-apprentice-book'), null, 'key-1'))).toBe('idempotency_conflict');
    expect(await backend.getWallet()).toBe(1200 - 120);
  });

  it('при нехватке средств отказывает и ничего не списывает', async () => {
    expect(await code(() => backend.purchase(id('rank-legend'), null, 'key-2'))).toBe('insufficient_funds');
    expect(await backend.getWallet()).toBe(1200);
    expect(await backend.listOrders()).toHaveLength(0);
  });

  it('предмет без закреплённого сервера требует выбрать существующий сервер', async () => {
    expect(await code(() => backend.purchase(id('starter-tools'), null, 'key-3'))).toBe('server_required');
    expect(await code(() => backend.purchase(id('starter-tools'), '00000000-0000-4000-8000-00000000dead', 'key-4'))).toBe('product_unavailable');
    const order = await backend.purchase(id('starter-tools'), SRV_TECH, 'key-5');
    expect(order.server_id).toBe(SRV_TECH);
  });

  it('ранг: продление идёт от текущего срока, ранг ниже действующего не оформляется', async () => {
    await backend.demoTopUp!(2000);
    await backend.purchase(id('rank-master'), null, 'key-6');
    const first = await backend.getPrivilege();
    expect(first?.tier).toBe(2);
    await backend.purchase(id('rank-master'), null, 'key-7');
    const extended = await backend.getPrivilege();
    const day = 86_400_000;
    expect(Date.parse(extended!.expires_at) - Date.parse(first!.expires_at)).toBe(30 * day);
    expect(await code(() => backend.purchase(id('rank-seeker'), null, 'key-8'))).toBe('privilege_lower');
    expect(await backend.getWallet()).toBe(1200 + 2000 - 700 - 700);
  });

  it('пополнение принимает только целую сумму в пределах', async () => {
    expect(await code(() => backend.demoTopUp!(10))).toBe('amount_invalid');
    expect(await code(() => backend.demoTopUp!(12.5))).toBe('amount_invalid');
    await backend.demoTopUp!(500);
    expect(await backend.getWallet()).toBe(1700);
    const ledger = await backend.listLedger();
    expect(ledger[0]).toMatchObject({delta: 500, reason: 'topup', balance_after: 1700});
  });

  it('гость не может покупать и не видит чужой баланс', async () => {
    await backend.signOut();
    expect(await code(() => backend.purchase(id('tech-mechanic-kit'), null, 'key-9'))).toBe('not_authenticated');
    expect(await code(() => backend.getWallet())).toBe('not_authenticated');
  });
});
