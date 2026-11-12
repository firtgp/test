import {useState} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Table} from '@astryxdesign/core/Table';
import {TextInput} from '@astryxdesign/core/TextInput';
import {useInvalidate, useLedger, useNotify, useOrders, useServers, useSettings, useWallet} from '../../app/hooks';
import {formatCoins, formatDateTime, formatNumber} from '../../app/format';
import {backend} from '../../data';
import {DEMO_TOPUP_MAX, DEMO_TOPUP_MIN} from '../../data/demoBackend';
import {ORDER_STATUS_LABEL, type LedgerEntry, type Order} from '../../data/types';
import {Async} from '../../components/Page';
import {WorldPoster} from '../../components/VoxelScene';
import {Coins, DemoShopNote, SectionTitle} from './shared';

const PRESETS = [100, 500, 1000, 2500];
const REASON: Record<LedgerEntry['reason'], string> = {topup: 'Пополнение', purchase: 'Покупка', refund: 'Возврат', grant: 'Начисление'};

/** Баланс: внутренняя валюта, пополнение, история операций и заказы. */
export function WalletPage() {
  const settings = useSettings();
  const servers = useServers().data ?? [];
  const wallet = useWallet();
  const ledger = useLedger();
  const orders = useOrders();
  const invalidate = useInvalidate();
  const notify = useNotify();
  const [amount, setAmount] = useState('500');
  const [busy, setBusy] = useState(false);
  const value = Number(amount);
  const valid = /^\d+$/.test(amount) && value >= DEMO_TOPUP_MIN && value <= DEMO_TOPUP_MAX;

  async function topUp() {
    if (!backend.demoTopUp || !valid || busy) return;
    setBusy(true);
    try {
      await backend.demoTopUp(value);
      await invalidate('wallet', 'ledger');
      notify.ok(`Баланс пополнен на ${formatCoins(value, settings)}`);
    } catch (e) {
      notify.fail(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionTitle title="Баланс" lead={`${settings.currency_name} — внутренняя валюта проекта. Ею оплачиваются предметы и ранги.`} />
      <DemoShopNote />

      <span className="mc-wallet">
        <span className="mc-wallet__hero mc-edge">
          <span className="mc-wallet__glow" aria-hidden="true" />
          <WorldPoster world="coin" className="mc-wallet__coin mc-float" width={320} height={320} shot={{angle: 0.5, lift: 0.15, fit: 1.05}} />
          <span className="mc-wallet__sum">
            <span className="mc-wallet__label">На балансе</span>
            <span className="mc-wallet__value" aria-live="polite">
              {formatNumber(wallet.data ?? 0)}
            </span>
            <span className="mc-wallet__unit">{formatCoins(wallet.data ?? 0, settings).replace(/^[\d\s ]+/, '')}</span>
          </span>
        </span>

        <form
          className="mc-topup"
          noValidate
          onSubmit={e => {
            e.preventDefault();
            topUp();
          }}>
          <h2 className="mc-panel__title">Пополнение</h2>
          {backend.demoTopUp ? (
            <>
              <span className="mc-filters" role="group" aria-label="Сумма пополнения">
                {PRESETS.map(p => (
                  <button key={p} type="button" className={`mc-filter${amount === String(p) ? ' mc-filter--on' : ''}`} aria-pressed={amount === String(p)} onClick={() => setAmount(String(p))}>
                    +{formatNumber(p)}
                  </button>
                ))}
              </span>
              <TextInput
                label="Своя сумма"
                description={`От ${formatNumber(DEMO_TOPUP_MIN)} до ${formatNumber(DEMO_TOPUP_MAX)}. В демо-режиме пополнение проходит без денег.`}
                inputMode="numeric"
                value={amount}
                onChange={v => setAmount(v.replace(/\D/g, '').slice(0, 6))}
                status={valid ? undefined : {type: 'error', message: 'Введите целое число в указанных пределах'}}
                width="100%"
              />
              <button type="submit" className="mc-cta mc-cta--md" disabled={!valid || busy} aria-busy={busy}>
                Пополнить (демо)
              </button>
            </>
          ) : (
            <Banner status="info" title="Пополнение ещё не подключено" description="Баланс пополняется через платёжного провайдера. Владелец проекта пока его не подключил." />
          )}
          <p className="mc-topup__legal">Оферту, возрастные ограничения и правила возврата готовит владелец проекта. До подключения оплаты они появятся здесь.</p>
        </form>
      </span>

      <section className="mc-panel" aria-labelledby="orders-title">
        <header className="mc-panel__head">
          <h2 className="mc-panel__title" id="orders-title">
            Заказы
          </h2>
        </header>
        <Async query={orders} skeletonHeight={48}>
          {rows =>
            rows.length === 0 ? (
              <p className="mc-panel__empty">Заказов пока нет.</p>
            ) : (
              <span className="mc-table">
                <Table<Order>
                  data={rows}
                  idKey="id"
                  density="compact"
                  columns={[
                    {key: 'created_at', header: 'Дата', renderCell: r => <>{formatDateTime(r.created_at, settings)}</>},
                    {key: 'title', header: 'Товар', renderCell: r => <>{r.title}</>},
                    {key: 'server', header: 'Сервер', renderCell: r => <>{r.server_id ? (servers.find(s => s.id === r.server_id)?.name ?? '—') : 'Все серверы'}</>},
                    {key: 'price', header: 'Цена', renderCell: r => <>{formatCoins(r.price, settings)}</>},
                    {key: 'status', header: 'Статус', renderCell: r => <>{ORDER_STATUS_LABEL[r.status]}</>},
                  ]}
                />
              </span>
            )
          }
        </Async>
      </section>

      <section className="mc-panel" aria-labelledby="ledger-title">
        <header className="mc-panel__head">
          <h2 className="mc-panel__title" id="ledger-title">
            История операций
          </h2>
          <Coins value={wallet.data ?? 0} />
        </header>
        <Async query={ledger} skeletonHeight={48}>
          {rows =>
            rows.length === 0 ? (
              <p className="mc-panel__empty">Операций пока нет.</p>
            ) : (
              <span className="mc-table">
                <Table<LedgerEntry>
                  data={rows}
                  idKey="id"
                  density="compact"
                  columns={[
                    {key: 'created_at', header: 'Дата', renderCell: r => <>{formatDateTime(r.created_at, settings)}</>},
                    {key: 'reason', header: 'Операция', renderCell: r => <>{`${REASON[r.reason]}: ${r.title}`}</>},
                    {
                      key: 'delta',
                      header: 'Сумма',
                      renderCell: r => <span className={r.delta > 0 ? 'mc-plus' : 'mc-minus'}>{`${r.delta > 0 ? '+' : '−'}${formatNumber(Math.abs(r.delta))}`}</span>,
                    },
                    {key: 'balance_after', header: 'Остаток', renderCell: r => <>{formatNumber(r.balance_after)}</>},
                  ]}
                />
              </span>
            )
          }
        </Async>
      </section>
    </>
  );
}
