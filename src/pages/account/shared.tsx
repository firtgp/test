import {useRef, useState, type ReactNode} from 'react';
import {useNavigate, useOutletContext} from 'react-router';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {CheckCircleIcon, DiamondIcon} from '@phosphor-icons/react';
import {useInvalidate, useServers, useSettings, useWallet} from '../../app/hooks';
import {formatCoins, formatNumber} from '../../app/format';
import {backend, isDemo} from '../../data';
import {ORDER_STATUS_LABEL, errorText, type Account, type Order, type Product} from '../../data/types';
import {WorldPoster} from '../../components/VoxelScene';

export const RANK_NAMES = ['Без ранга', 'Искатель', 'Мастер', 'Легенда'];
export const ITEM_SHOT = {angle: 0.6, lift: 0.22, fit: 1.05};

/** Аккаунт вошедшего игрока: разделы кабинета получают его от общего каркаса. */
export function useCabinet() {
  return useOutletContext<{account: Account}>();
}

/** Сумма во внутренней валюте со значком. */
export function Coins({value, size = 'md'}: {value: number; size?: 'md' | 'lg'}) {
  const settings = useSettings();
  return (
    <span className={`mc-coins mc-coins--${size}`}>
      <DiamondIcon size={size === 'lg' ? 22 : 16} weight="fill" aria-hidden="true" />
      {formatNumber(value)}
      <span className="mc-coins__unit">{formatCoins(value, settings).replace(/^[\d\s ]+/, '')}</span>
    </span>
  );
}

/** Заголовок раздела кабинета. */
export function SectionTitle({title, lead, action}: {title: string; lead?: ReactNode; action?: ReactNode}) {
  return (
    <header className="mc-cab__head">
      <span className="mc-cab__head-copy">
        <h1 className="mc-cab__title">{title}</h1>
        {lead ? <p className="mc-cab__lead">{lead}</p> : null}
      </span>
      {action}
    </header>
  );
}

/** Честная пометка демо-режима для разделов с деньгами и покупками. */
export function DemoShopNote() {
  if (!isDemo) return null;
  return (
    <Banner
      status="info"
      title="Демо-режим: оплаты и выдачи нет"
      description="Баланс пополняется без денег, заказы хранятся в этом браузере. Игровой сервер не подключён, поэтому купленное в игру не выдаётся. Товары и цены — пример."
    />
  );
}

/**
 * Подтверждение покупки. Цена и сервер выдачи берутся из каталога; ключ идемпотентности
 * создаётся один раз на открытие окна, поэтому повтор запроса не спишет средства дважды.
 */
export function PurchaseDialog({product, account, onClose}: {product: Product; account: Account; onClose: () => void}) {
  const settings = useSettings();
  const servers = useServers().data ?? [];
  const wallet = useWallet();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const key = useRef(crypto.randomUUID());
  const [serverId, setServerId] = useState(product.server_id ?? account.selected_server_id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const isItem = product.kind === 'item';
  const fixedServer = servers.find(s => s.id === product.server_id);
  const balance = wallet.data ?? 0;
  const enough = balance >= product.price;

  async function buy() {
    if (busy) return;
    if (isItem && !product.server_id && !serverId) {
      setError('Выберите сервер, на который выдать предмет.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const done = await backend.purchase(product.id, isItem ? (product.server_id ?? serverId) : null, key.current);
      await invalidate('wallet', 'ledger', 'orders', 'privilege');
      setOrder(done);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog isOpen onOpenChange={o => !o && onClose()} purpose="form" width={480}>
      <Layout
        header={<DialogHeader title={order ? 'Заказ оформлен' : isItem ? 'Покупка предмета' : 'Оформление ранга'} onOpenChange={onClose} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={4} vAlign="center">
                <WorldPoster world={`item:${product.icon}`} className="mc-buy__icon" width={240} height={240} shot={ITEM_SHOT} />
                <VStack gap={1}>
                  <Text type="large" weight="bold">
                    {product.title}
                  </Text>
                  <Text color="secondary">{product.description}</Text>
                </VStack>
              </HStack>
              {order ? (
                <VStack gap={3}>
                  <span className="mc-buy__done" role="status">
                    <CheckCircleIcon size={22} weight="fill" aria-hidden="true" />
                    Списано {formatCoins(order.price, settings)}. Статус заказа: {ORDER_STATUS_LABEL[order.status].toLowerCase()}.
                  </span>
                  {isDemo ? (
                    <Text color="secondary">
                      Демо: игровой сервер не подключён, заказ останется в очереди выдачи.
                      {isItem ? '' : ' Пьедестал и аура персонажа на сайте уже обновились.'}
                    </Text>
                  ) : null}
                </VStack>
              ) : (
                <>
                  {error ? (
                    <span role="alert">
                      <Banner status="error" title={error} />
                    </span>
                  ) : null}
                  {isItem && !product.server_id ? (
                    <Selector
                      label="Сервер выдачи"
                      placeholder="Выберите сервер"
                      value={serverId}
                      options={servers.map(s => ({value: s.id, label: s.name}))}
                      onChange={v => setServerId(v ?? '')}
                    />
                  ) : null}
                  <MetadataList>
                    {fixedServer ? <MetadataListItem label="Сервер выдачи">{fixedServer.name}</MetadataListItem> : null}
                    {!isItem ? (
                      <MetadataListItem label="Срок">
                        {product.duration_days ?? 30} дней, на всех серверах
                      </MetadataListItem>
                    ) : null}
                    <MetadataListItem label="Цена">{formatCoins(product.price, settings)}</MetadataListItem>
                    <MetadataListItem label="Баланс после покупки">
                      {enough ? formatCoins(balance - product.price, settings) : `не хватает ${formatCoins(product.price - balance, settings)}`}
                    </MetadataListItem>
                  </MetadataList>
                </>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end" wrap="wrap">
              {order ? (
                <>
                  <Button label="Мои заказы" variant="secondary" onClick={() => navigate('/account/wallet')} />
                  <Button label="Готово" variant="primary" onClick={onClose} />
                </>
              ) : enough ? (
                <>
                  <Button label="Отмена" variant="secondary" onClick={onClose} />
                  <Button label={`Купить за ${formatCoins(product.price, settings)}`} variant="primary" isLoading={busy} onClick={buy} />
                </>
              ) : (
                <>
                  <Button label="Отмена" variant="secondary" onClick={onClose} />
                  <Button label="Пополнить баланс" variant="primary" onClick={() => navigate('/account/wallet')} />
                </>
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
