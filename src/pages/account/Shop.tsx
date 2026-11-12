import {useState} from 'react';
import {CheckIcon} from '@phosphor-icons/react';
import {usePrivilege, useProducts, useServers, useSettings, useWallet} from '../../app/hooks';
import {formatDate} from '../../app/format';
import type {Product} from '../../data/types';
import {TIER_ACCENT} from '../../scenes/meta';
import {Async} from '../../components/Page';
import {SceneIcon} from '../../components/sceneIcon';
import {WorldPoster} from '../../components/VoxelScene';
import {Coins, DemoShopNote, ITEM_SHOT, PurchaseDialog, SectionTitle, useCabinet} from './shared';

/** Магазин: предметы из модов разных серверов. Цена и сервер выдачи — из каталога. */
export function ShopPage() {
  const {account} = useCabinet();
  const products = useProducts();
  const servers = useServers().data ?? [];
  const wallet = useWallet();
  const [filter, setFilter] = useState('all');
  const [buying, setBuying] = useState<Product | null>(null);

  const items = (products.data ?? []).filter(p => p.kind === 'item');
  const withItems = servers.filter(s => items.some(p => p.server_id === s.id));
  const filters = [
    {id: 'all', label: 'Все'},
    ...withItems.map(s => ({id: s.id, label: s.name})),
    ...(items.some(p => !p.server_id && p.compliance !== 'cosmetic') ? [{id: 'any', label: 'Любой сервер'}] : []),
    ...(items.some(p => p.compliance === 'cosmetic') ? [{id: 'cosmetic', label: 'Косметика'}] : []),
  ];
  const shown = items.filter(p =>
    filter === 'all' ? true : filter === 'cosmetic' ? p.compliance === 'cosmetic' : filter === 'any' ? !p.server_id && p.compliance !== 'cosmetic' : p.server_id === filter,
  );

  return (
    <>
      <SectionTitle title="Магазин" lead="Предметы из модов каждого сервера. Оплата — внутренней валютой с баланса." action={<Coins value={wallet.data ?? 0} size="lg" />} />
      <DemoShopNote />
      <span className="mc-filters" role="group" aria-label="Фильтр товаров">
        {filters.map(f => (
          <button key={f.id} type="button" className={`mc-filter${filter === f.id ? ' mc-filter--on' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </span>
      <Async query={products} skeletonHeight={220}>
        {() =>
          shown.length === 0 ? (
            <p className="mc-panel__empty">В этом разделе пока нет товаров.</p>
          ) : (
            <ul className="mc-prods">
              {shown.map(p => {
                const server = servers.find(s => s.id === p.server_id);
                return (
                  <li key={p.id} className="mc-prod" style={server ? {['--server-accent' as string]: server.accent} : undefined}>
                    <span className="mc-prod__art" aria-hidden="true">
                      <span className="mc-prod__glow" />
                      <WorldPoster world={`item:${p.icon}`} className="mc-prod__icon" width={240} height={240} shot={ITEM_SHOT} />
                    </span>
                    <span className="mc-prod__tags">
                      {p.mod_name ? <span className="mc-chip mc-chip--accent">{p.mod_name}</span> : null}
                      {p.compliance === 'cosmetic' ? <span className="mc-chip mc-chip--gold">Косметика</span> : null}
                    </span>
                    <h2 className="mc-prod__title">{p.title}</h2>
                    <p className="mc-prod__text">{p.description}</p>
                    <span className="mc-prod__server">
                      {server ? (
                        <>
                          <SceneIcon scene={server.scene ?? 'survival'} size={16} /> {server.name}
                        </>
                      ) : (
                        'Сервер выбираете при покупке'
                      )}
                    </span>
                    <span className="mc-prod__foot">
                      <Coins value={p.price} size="lg" />
                      <button type="button" className="mc-btn mc-btn--buy" onClick={() => setBuying(p)} aria-label={`Купить «${p.title}»`}>
                        Купить
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )
        }
      </Async>
      {buying ? <PurchaseDialog product={buying} account={account} onClose={() => setBuying(null)} /> : null}
    </>
  );
}

const RANK_SHOT = {angle: 0.5, lift: 0.1, fit: 1.02};

/** Привилегии: три ранга. Ранг меняет пьедестал и ауру персонажа на сайте. */
export function RanksPage() {
  const {account} = useCabinet();
  const settings = useSettings();
  const products = useProducts();
  const current = usePrivilege().data ?? null;
  const [buying, setBuying] = useState<Product | null>(null);
  const ranks = (products.data ?? []).filter(p => p.kind === 'privilege').sort((a, b) => a.tier - b.tier);

  return (
    <>
      <SectionTitle
        title="Привилегии"
        lead={current ? `Сейчас у вас ранг «${current.title}» — до ${formatDate(current.expires_at, settings)}.` : 'Ранг действует на всех серверах проекта и виден на вашем персонаже.'}
      />
      <DemoShopNote />
      <Async query={products} skeletonHeight={320}>
        {() =>
          ranks.length === 0 ? (
            <p className="mc-panel__empty">Ранги ещё не добавлены.</p>
          ) : (
            <ul className="mc-ranks">
              {ranks.map(p => {
                const active = current?.product_id === p.id;
                const lower = !!current && current.tier > p.tier;
                return (
                  <li key={p.id} className={`mc-rank${active ? ' mc-rank--on mc-edge' : ''}`} style={{['--tier' as string]: TIER_ACCENT[p.tier] ?? TIER_ACCENT[0]}}>
                    <span className="mc-rank__art" aria-hidden="true">
                      <span className="mc-rank__halo" />
                      <WorldPoster world={`character:${account.avatar_style}:${p.tier}`} className="mc-rank__hero" width={360} height={450} shot={RANK_SHOT} />
                    </span>
                    {active ? <span className="mc-rank__flag">Ваш ранг</span> : null}
                    <h2 className="mc-rank__title">{p.title}</h2>
                    <p className="mc-rank__text">{p.description}</p>
                    <span className="mc-rank__price">
                      <Coins value={p.price} size="lg" />
                      <span className="mc-rank__term">на {p.duration_days ?? 30} дней</span>
                    </span>
                    <ul className="mc-rank__perks">
                      {p.perks.map(perk => (
                        <li key={perk}>
                          <CheckIcon size={16} weight="bold" aria-hidden="true" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="mc-btn mc-btn--buy mc-rank__buy"
                      aria-disabled={lower}
                      onClick={() => !lower && setBuying(p)}
                      aria-label={lower ? `«${p.title}» ниже вашего ранга` : `${active ? 'Продлить' : 'Оформить'} ранг «${p.title}»`}>
                      {lower ? 'Ниже вашего ранга' : active ? 'Продлить' : 'Оформить'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        }
      </Async>
      {buying ? <PurchaseDialog product={buying} account={account} onClose={() => setBuying(null)} /> : null}
    </>
  );
}
