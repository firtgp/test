import {Link} from 'react-router';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {ArrowRightIcon, ArrowsHorizontalIcon, CrownSimpleIcon, GlobeHemisphereWestIcon, StorefrontIcon, WalletIcon} from '@phosphor-icons/react';
import {isStaffAdmin, useInvalidate, useNotify, useNow, useOrders, usePrivilege, useServers, useSettings, useWallet} from '../../app/hooks';
import {formatDate} from '../../app/format';
import {backend} from '../../data';
import {deriveStatus} from '../../data/status';
import {ORDER_STATUS_LABEL} from '../../data/types';
import {AVATAR_STYLES, type AvatarStyle} from '../../scenes/meta';
import {startPath} from '../../components/CtaLink';
import {LazyBoundary} from '../../components/LazyBoundary';
import {packLine} from '../../components/ServerCard';
import {StatusLine} from '../../components/StatusLine';
import {VoxelScene, WorldPoster} from '../../components/VoxelScene';
import {Coins, ITEM_SHOT, RANK_NAMES, SectionTitle, useCabinet} from './shared';

const LOOK_SHOT = {angle: 0.5, lift: 0.1, fit: 1.02};

/** Обзор: трёхмерный персонаж, выбор образа и короткая сводка по балансу, рангу и серверу. */
export function OverviewPage() {
  const {account} = useCabinet();
  const settings = useSettings();
  const servers = useServers().data ?? [];
  const privilege = usePrivilege(backend.shop).data;
  const wallet = useWallet(backend.shop);
  const orders = useOrders(backend.shop).data ?? [];
  const invalidate = useInvalidate();
  const notify = useNotify();
  const now = useNow();
  const tier = privilege?.tier ?? 0;
  const selected = servers.find(s => s.id === account.selected_server_id) ?? null;

  async function pick(style: AvatarStyle) {
    if (style === account.avatar_style) return;
    try {
      await backend.setAvatarStyle(style);
      await invalidate('account');
    } catch (e) {
      notify.fail(e);
    }
  }

  return (
    <>
      <SectionTitle title={`Привет, ${account.nick}`} lead="Ваш персонаж, баланс и ранг — всё под рукой." />
      {isStaffAdmin(account) ? (
        <Banner status="info" title="У вас есть доступ к админке" endContent={<Button label="Открыть админку" href="/admin" variant="secondary" />} />
      ) : null}

      <span className="mc-ov">
        <span className="mc-ov__stage mc-edge">
          <span className="mc-ov__halo" aria-hidden="true" />
          <LazyBoundary>
            <VoxelScene world={`character:${account.avatar_style}:${tier}`} stage className="mc-ov__scene" />
          </LazyBoundary>
          <span className="mc-ov__badge">
            <CrownSimpleIcon size={16} weight="fill" aria-hidden="true" />
            {backend.shop ? (privilege ? `Ранг «${privilege.title}»` : RANK_NAMES[0]) : account.nick}
          </span>
          <span className="mc-ov__hint">
            <ArrowsHorizontalIcon size={16} weight="bold" aria-hidden="true" />
            Перетащите, чтобы повернуть
          </span>
        </span>

        <span className="mc-ov__side">
          <span className="mc-ov__looks" role="radiogroup" aria-label="Образ персонажа">
            {AVATAR_STYLES.map(s => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === account.avatar_style}
                className={`mc-ov__look${s.id === account.avatar_style ? ' mc-ov__look--on' : ''}`}
                onClick={() => pick(s.id)}>
                <WorldPoster world={`character:${s.id}:0`} className="mc-ov__look-art" width={200} height={250} shot={LOOK_SHOT} />
                <span className="mc-ov__look-name">{s.label}</span>
                <span className="mc-ov__look-hint">{s.hint}</span>
              </button>
            ))}
          </span>
          <p className="mc-ov__note">
            Образ виден на сайте{backend.mode === 'supabase' ? ' и хранится в этом браузере' : ''}. Игровой скин он не меняет.
          </p>

          <span className="mc-ov__cards">
            {backend.shop ? (
              <>
                <Link className="mc-card" to="/account/wallet">
                  <span className="mc-card__icon">
                    <WalletIcon size={20} weight="fill" aria-hidden="true" />
                  </span>
                  <span className="mc-card__label">Баланс</span>
                  <span className="mc-card__value">
                    <Coins value={wallet.data ?? 0} size="lg" />
                  </span>
                  <span className="mc-card__go">
                    Пополнить <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
                  </span>
                </Link>
                <Link className="mc-card mc-card--tier" to="/account/ranks">
                  <span className="mc-card__icon">
                    <CrownSimpleIcon size={20} weight="fill" aria-hidden="true" />
                  </span>
                  <span className="mc-card__label">Ранг</span>
                  <span className="mc-card__value">{privilege ? privilege.title : RANK_NAMES[0]}</span>
                  <span className="mc-card__go">
                    {privilege ? `до ${formatDate(privilege.expires_at, settings)}` : 'Выбрать ранг'} <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
                  </span>
                </Link>
              </>
            ) : null}
            <Link className="mc-card" to={selected ? startPath(selected.slug) : '/account/settings'}>
              <span className="mc-card__icon">
                <GlobeHemisphereWestIcon size={20} weight="fill" aria-hidden="true" />
              </span>
              <span className="mc-card__label">Мой сервер</span>
              <span className="mc-card__value">{selected ? selected.name : 'Не выбран'}</span>
              {selected ? (
                <span className="mc-card__status">
                  <StatusLine status={deriveStatus(selected, selected.status, now)} settings={settings} />
                </span>
              ) : null}
              <span className="mc-card__go">
                {selected ? packLine(selected) : 'Выбрать в настройках'} <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
              </span>
            </Link>
          </span>
        </span>
      </span>

      {backend.shop ? (
        <section className="mc-panel" aria-labelledby="recent-orders">
          <header className="mc-panel__head">
            <h2 className="mc-panel__title" id="recent-orders">
              Последние покупки
            </h2>
            <Link className="mc-arrow-link" to="/account/shop">
              <StorefrontIcon size={18} weight="fill" aria-hidden="true" /> В магазин
            </Link>
          </header>
          {orders.length === 0 ? (
            <p className="mc-panel__empty">Покупок пока нет. Загляните в магазин: там предметы из модов каждого сервера.</p>
          ) : (
            <ul className="mc-orders">
              {orders.slice(0, 3).map(o => (
                <li key={o.id} className="mc-orders__row">
                  <WorldPoster world={`item:${o.icon}`} className="mc-orders__icon" width={240} height={240} shot={ITEM_SHOT} />
                  <span className="mc-orders__title">{o.title}</span>
                  <span className="mc-orders__meta">
                    {o.server_id ? (servers.find(s => s.id === o.server_id)?.name ?? 'Сервер') : 'Все серверы'} · {formatDate(o.created_at, settings)}
                  </span>
                  <span className="mc-chip">{ORDER_STATUS_LABEL[o.status]}</span>
                  <Coins value={o.price} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </>
  );
}
