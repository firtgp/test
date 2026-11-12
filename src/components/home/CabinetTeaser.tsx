import {useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {ArrowRightIcon, CrownSimpleIcon, PersonArmsSpreadIcon, ShieldCheckIcon, StorefrontIcon, UserCircleIcon} from '@phosphor-icons/react';
import {BlurFade} from '@/components/ui/blur-fade';
import {useInvalidate, useNotify} from '../../app/hooks';
import {backend, isDemo} from '../../data';
import {DEMO_PLAYER} from '../../data/demoBackend';
import type {Account, SiteSettings} from '../../data/types';
import {WorldPoster} from '../VoxelScene';
import {LightArcs, SectionLabel} from './Ambient';

const ITEM_SHOT = {angle: 0.6, lift: 0.22, fit: 1.05};

/**
 * Блок «Кабинет игрока»: персонаж на пьедестале, вокруг — предметы из магазина и искра валюты.
 * Про магазин и баланс говорится только там, где они действительно есть (backend.shop).
 */
export function CabinetTeaser({account, settings}: {account: Account | null; settings: SiteSettings}) {
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const shop = backend.shop;

  async function openDemo() {
    if (busy) return;
    setBusy(true);
    try {
      await backend.signIn(DEMO_PLAYER.email, DEMO_PLAYER.password);
      await invalidate('account');
      navigate('/account');
    } catch (e) {
      notify.fail(e);
    } finally {
      setBusy(false);
    }
  }

  const tiles = [
    {icon: PersonArmsSpreadIcon, title: '3D-персонаж', text: 'Четыре образа. Модель можно вращать, а ранг меняет её пьедестал и ауру.'},
    shop
      ? {icon: CrownSimpleIcon, title: settings.currency_name, text: 'Внутренняя валюта: баланс, пополнение и история операций.'}
      : {icon: ShieldCheckIcon, title: 'Безопасность', text: 'Смена ника и пароля, все активные входы — в одном месте.'},
    shop
      ? {icon: StorefrontIcon, title: 'Магазин и привилегии', text: 'Предметы из модов каждого сервера и три ранга.'}
      : {icon: UserCircleIcon, title: 'Сервер по умолчанию', text: 'Инструкция и лаунчер сразу открываются для вашего мира.'},
  ];

  return (
    <section className="mc-sec mc-sec--cab" aria-label="Кабинет игрока">
      <LightArcs variant="c" tone="violet" />
      <BlurFade inView offset={20}>
        <span className="mc-cabt mc-edge">
          <span className="mc-cabt__stage" aria-hidden="true">
            <span className="mc-cabt__halo" />
            <WorldPoster world="character:wanderer:3" className="mc-cabt__hero" width={640} height={800} shot={{angle: 0.5, lift: 0.1, fit: 1.02}} />
            {shop ? (
              <>
                <WorldPoster world="coin" className="mc-cabt__prop mc-cabt__prop--coin mc-float" width={260} height={260} shot={{angle: 0.5, lift: 0.15, fit: 1.05}} />
                <WorldPoster world="item:gear" className="mc-cabt__prop mc-cabt__prop--a mc-float mc-float--slow" width={240} height={240} shot={ITEM_SHOT} />
                <WorldPoster world="item:book" className="mc-cabt__prop mc-cabt__prop--b mc-float" width={240} height={240} shot={ITEM_SHOT} />
                <WorldPoster world="item:basket" className="mc-cabt__prop mc-cabt__prop--c mc-float mc-float--slow" width={240} height={240} shot={ITEM_SHOT} />
              </>
            ) : null}
          </span>
          <span className="mc-cabt__copy">
            <SectionLabel icon={UserCircleIcon} index="03">
              Кабинет
            </SectionLabel>
            <h2 className="mc-title">
              Ваш персонаж. <em className="mc-gold-text">Ваш кабинет.</em>
            </h2>
            <p className="mc-lead">
              {shop
                ? 'Образ, баланс, покупки и ранг — в отдельных разделах кабинета игрока.'
                : 'Образ персонажа, ник, пароль и активные входы — в кабинете игрока.'}
            </p>
            <ul className="mc-cabt__tiles">
              {tiles.map(t => (
                <li key={t.title}>
                  <span className="mc-cabt__icon">
                    <t.icon size={20} weight="fill" aria-hidden="true" />
                  </span>
                  <span className="mc-cabt__tile-title">{t.title}</span>
                  <span className="mc-cabt__tile-text">{t.text}</span>
                </li>
              ))}
            </ul>
            <span className="mc-cabt__actions">
              {account ? (
                <Link className="mc-cta mc-cta--md" to="/account">
                  Открыть кабинет <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
                </Link>
              ) : isDemo ? (
                <button type="button" className="mc-cta mc-cta--md" onClick={openDemo} aria-busy={busy}>
                  Открыть демо-кабинет <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
                </button>
              ) : (
                <Link className="mc-cta mc-cta--md" to="/register">
                  Создать аккаунт <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
                </Link>
              )}
              {!account ? (
                <Link className="mc-btn" to="/login">
                  Войти
                </Link>
              ) : null}
            </span>
            {isDemo && shop ? (
              <p className="mc-cabt__note">Демо: вход под готовым игроком, покупки и пополнение — без денег, выдачи на сервер нет.</p>
            ) : null}
          </span>
        </span>
      </BlurFade>
    </section>
  );
}
