import {useEffect} from 'react';
import {NavLink, Outlet, useLocation, useNavigate} from 'react-router';
import {CrownSimpleIcon, GearSixIcon, HouseIcon, SignOutIcon, StorefrontIcon, WalletIcon} from '@phosphor-icons/react';
import {useAccount, useInvalidate, useNotify, usePrivilege, useSettings, useWallet} from '../../app/hooks';
import {backend, isDemo} from '../../data';
import {TIER_ACCENT} from '../../scenes/meta';
import {Async} from '../../components/Page';
import {Coins, RANK_NAMES} from './shared';
import '../../styles/cabinet.css';

const NAV = [
  {to: '/account', label: 'Обзор', icon: HouseIcon, end: true, shop: false},
  {to: '/account/shop', label: 'Магазин', icon: StorefrontIcon, end: false, shop: true},
  {to: '/account/ranks', label: 'Ранги', icon: CrownSimpleIcon, end: false, shop: true},
  {to: '/account/wallet', label: 'Баланс', icon: WalletIcon, end: false, shop: true},
  {to: '/account/settings', label: 'Настройки', icon: GearSixIcon, end: false, shop: false},
];

/**
 * Каркас кабинета: карточка игрока и разделы. На широком экране разделы стоят слева,
 * на телефоне — закреплённой панелью снизу (не больше пяти пунктов).
 */
export function AccountLayout() {
  const account = useAccount();
  const settings = useSettings();
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const notify = useNotify();
  const invalidate = useInvalidate();
  const a = account.data;
  const wallet = useWallet(!!a && backend.shop);
  const privilege = usePrivilege(!!a && backend.shop).data;

  useEffect(() => {
    if (account.isSuccess && !a) navigate(`/login?next=${encodeURIComponent(pathname)}`, {replace: true});
  }, [account.isSuccess, a, navigate, pathname]);
  useEffect(() => {
    document.title = `Кабинет — ${settings.project_name}`;
  }, [settings.project_name]);

  const tier = privilege?.tier ?? 0;
  const items = NAV.filter(n => backend.shop || !n.shop);

  return (
    <section className="mc-cab" style={{['--tier' as string]: TIER_ACCENT[tier]}}>
      <Async query={account}>
        {() =>
          a ? (
            <>
              <aside className="mc-cab__side">
                <span className="mc-cab__me">
                  <span className="mc-cab__ava" aria-hidden="true">
                    {a.nick[0]?.toUpperCase()}
                  </span>
                  <span className="mc-cab__who">
                    <span className="mc-cab__nick">{a.nick}</span>
                    <span className="mc-cab__rank">{backend.shop ? (privilege ? `Ранг «${privilege.title}»` : RANK_NAMES[0]) : a.email}</span>
                  </span>
                  {backend.shop ? (
                    <span className="mc-cab__balance" aria-label="Баланс">
                      <Coins value={wallet.data ?? 0} />
                    </span>
                  ) : null}
                </span>
                <nav className="mc-cab__nav" aria-label="Разделы кабинета">
                  {items.map(n => (
                    <NavLink key={n.to} to={n.to} end={n.end} className={({isActive}) => `mc-cab__link${isActive ? ' mc-cab__link--on' : ''}`}>
                      <n.icon size={20} weight="fill" aria-hidden="true" />
                      <span>{n.label}</span>
                    </NavLink>
                  ))}
                </nav>
                <button
                  type="button"
                  className="mc-cab__out"
                  onClick={async () => {
                    try {
                      await backend.signOut();
                      await invalidate('account');
                      navigate('/');
                    } catch (e) {
                      notify.fail(e);
                    }
                  }}>
                  <SignOutIcon size={18} weight="bold" aria-hidden="true" />
                  Выйти
                </button>
                {isDemo ? <p className="mc-cab__demo">Демо-кабинет: данные хранятся в этом браузере.</p> : null}
              </aside>
              <span className="mc-cab__main">
                <Outlet context={{account: a}} />
              </span>
            </>
          ) : null
        }
      </Async>
    </section>
  );
}
