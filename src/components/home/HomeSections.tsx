import {Link as RouterLink} from 'react-router';
import {MotionConfig} from 'motion/react';
import {Text} from '@astryxdesign/core/Text';
import {
  ArrowRightIcon, ArrowUpRightIcon, FingerprintIcon, GameControllerIcon, GlobeHemisphereWestIcon, KeyIcon, NewspaperIcon,
  PuzzlePieceIcon, QuestionIcon, RocketLaunchIcon, ShieldCheckIcon, UserCircleIcon, UsersThreeIcon,
} from '@phosphor-icons/react';
import {AnimatedGridPattern} from '@/components/ui/animated-grid-pattern';
import {BlurFade} from '@/components/ui/blur-fade';
import {DotPattern} from '@/components/ui/dot-pattern';
import {NumberTicker} from '@/components/ui/number-ticker';
import {Particles} from '@/components/ui/particles';
import {ScrollProgress} from '@/components/ui/scroll-progress';
import {useAccount, useMedia, useNews, useNow, useServers, useSettings} from '../../app/hooks';
import {plural} from '../../app/format';
import {isDemo} from '../../data';
import {deriveStatus, totalOnline} from '../../data/status';
import {PANORAMA_SKY} from '../../scenes/meta';
import {CtaLink, startPath} from '../CtaLink';
import {Async} from '../Page';
import {WorldPoster} from '../VoxelScene';
import {AccountOrbit} from './AccountOrbit';
import {Foliage, LightArcs, SectionHead} from './Ambient';
import {CabinetTeaser} from './CabinetTeaser';
import {Faq, FaqMascot, NewsBlock, StickyCta} from './Extras';
import {ServerBento} from './ServerBento';
import {StartPath} from './StartPath';
import {Ticker} from './Ticker';
import '../../styles/home.css';

const ACCOUNT_FACTS = [
  {icon: KeyIcon, title: 'Один ник и пароль', text: 'Для сайта, лаунчера и каждого сервера.'},
  {icon: FingerprintIcon, title: 'Постоянный UUID', text: 'Вещи и роли привязаны к нему: смена ника их не трогает.'},
  {icon: ShieldCheckIcon, title: 'Сессии под контролем', text: 'Все входы видны в кабинете. Чужую сессию можно завершить одной кнопкой.'},
];

/** Фоновая пыль первого экрана (Magic UI Particles). */
export function HeroMotes() {
  return <Particles className="mc-hero2__motes" quantity={56} staticity={70} ease={70} size={0.7} color="#FFD98A" />;
}

/**
 * Блоки главной ниже первого экрана. Грузятся отдельным файлом: библиотека анимаций и
 * компоненты Magic UI не задерживают появление первого экрана.
 */
export default function HomeSections() {
  const settings = useSettings();
  const servers = useServers();
  const news = useNews();
  const account = useAccount().data ?? null;
  const now = useNow();
  const reduce = useMedia('(prefers-reduced-motion: reduce)');
  const small = useMedia('(max-width: 48rem)');

  const list = servers.data ?? [];
  const total = totalOnline(list.map(s => deriveStatus(s, s.status, now)));
  const modTotal = list.reduce((sum, s) => sum + s.mod_count, 0);
  const mods = [...new Set(list.flatMap(s => s.key_mods))];
  const versions = [...new Set(list.map(s => s.modpack?.mc_version).filter(Boolean))] as string[];
  const contacts = [
    {href: settings.discord_url, label: 'Discord'},
    {href: settings.telegram_url, label: 'Telegram'},
    {href: settings.vk_url, label: 'ВКонтакте'},
    {href: settings.contact_email ? `mailto:${settings.contact_email}` : '', label: settings.contact_email},
  ].filter(l => l.href);
  /** Число со счётчиком (Magic UI NumberTicker); при reduced motion — сразу итог. */
  const num = (value: number) => (reduce ? value : <NumberTicker value={value} className="mc-num" />);

  return (
    <MotionConfig reducedMotion="user">
      <ScrollProgress className="mc-progress" />
      <Ticker items={mods} />

      {list.length > 0 ? (
        <section className="mc-sec mc-sec--stats" aria-label="Проект в цифрах">
          <ul className="mc-stats">
            {total ? (
              <li className="mc-stat mc-stat--hot">
                <span className="mc-stat__icon">
                  <UsersThreeIcon size={26} weight="fill" aria-hidden="true" />
                </span>
                <span className="mc-stat__value">{num(total.players)}</span>
                <span className="mc-stat__label">играют прямо сейчас{isDemo ? ' (демо)' : ''}</span>
              </li>
            ) : null}
            <li className="mc-stat">
              <span className="mc-stat__icon">
                <GlobeHemisphereWestIcon size={26} weight="fill" aria-hidden="true" />
              </span>
              <span className="mc-stat__value">{num(list.length)}</span>
              <span className="mc-stat__label">{plural(list.length, 'мир', 'мира', 'миров')} со своей сборкой</span>
            </li>
            {modTotal > 0 ? (
              <li className="mc-stat">
                <span className="mc-stat__icon">
                  <PuzzlePieceIcon size={26} weight="fill" aria-hidden="true" />
                </span>
                <span className="mc-stat__value">{num(modTotal)}</span>
                <span className="mc-stat__label">{plural(modTotal, 'мод', 'мода', 'модов')} в сборках</span>
              </li>
            ) : null}
            {versions.length > 0 ? (
              <li className="mc-stat">
                <span className="mc-stat__icon">
                  <GameControllerIcon size={26} weight="fill" aria-hidden="true" />
                </span>
                <span className="mc-stat__value mc-stat__value--text">{versions.join(' · ')}</span>
                <span className="mc-stat__label">версия игры</span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <section id="start" className="mc-sec mc-sec--start" aria-label="Как начать">
        <AnimatedGridPattern className="mc-sec__grid" width={56} height={56} numSquares={reduce ? 0 : 14} maxOpacity={0.12} duration={5} repeatDelay={1.5} />
        <LightArcs variant="a" />
        <Foliage seed={0} side="bl" />
        <span className="mc-sec__inner">
          <SectionHead
            icon={RocketLaunchIcon}
            index="01"
            label="Старт"
            title="Четыре шага"
            gold="до игры"
            lead="Нужен компьютер с Windows, macOS или Linux. Остальное сделает лаунчер."
            action={
              <CtaLink to={startPath()} size="md">
                Пошаговая инструкция
              </CtaLink>
            }
          />
          <BlurFade inView delay={0.1} offset={16}>
            <StartPath servers={list} now={now} settings={settings} />
          </BlurFade>
        </span>
      </section>

      <section className="mc-sec mc-sec--account" aria-label="Один аккаунт">
        <LightArcs variant="b" tone="violet" />
        <span className="mc-sec__inner mc-acc">
          <span className="mc-acc__copy">
            <SectionHead icon={UserCircleIcon} index="02" label="Аккаунт" title="Один аккаунт." gold="Везде." lead="Регистрация на сайте — это и есть вход в игру." />
            <BlurFade inView delay={0.1} offset={16}>
              <ul className="mc-acc__rows">
                {ACCOUNT_FACTS.map(f => (
                  <li key={f.title} className="mc-acc__row">
                    <span className="mc-acc__icon">
                      <f.icon size={22} weight="fill" aria-hidden="true" />
                    </span>
                    <span className="mc-acc__row-title">{f.title}</span>
                    <span className="mc-acc__row-text">{f.text}</span>
                  </li>
                ))}
              </ul>
            </BlurFade>
            <span className="mc-acc__actions">
              <RouterLink className="mc-cta mc-cta--md" to={account ? '/account' : '/register'}>
                {account ? 'Открыть кабинет' : 'Создать аккаунт'} <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
              </RouterLink>
              {!account ? (
                <RouterLink className="mc-btn" to="/login">
                  Уже есть аккаунт
                </RouterLink>
              ) : null}
            </span>
          </span>
          <AccountOrbit servers={list} nick={account?.nick ?? null} />
        </span>
      </section>

      <CabinetTeaser account={account} settings={settings} />

      <section className="mc-sec mc-sec--servers" aria-label="Серверы и сборки">
        <DotPattern className="mc-sec__dots" width={26} height={26} cr={1} />
        <LightArcs variant="a" tone="cyan" />
        <span className="mc-sec__inner">
          <SectionHead
            icon={GlobeHemisphereWestIcon}
            index="04"
            label="Миры"
            title="Серверы"
            gold="и сборки"
            lead="Статус приходит с серверов раз в минуту. Если данных нет — так и написано."
            action={
              <RouterLink className="mc-btn" to="/servers">
                Списки модов <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
              </RouterLink>
            }
          />
          <Async query={servers} skeletonHeight={160}>
            {rows => (rows.length === 0 ? <Text color="secondary">Серверы ещё не опубликованы.</Text> : <ServerBento servers={rows} settings={settings} now={now} />)}
          </Async>
        </span>
      </section>

      <section className="mc-sec mc-sec--news" aria-label="Новости и вайпы">
        <LightArcs variant="b" />
        <span className="mc-sec__inner">
          <SectionHead
            icon={NewspaperIcon}
            index="05"
            label="События"
            title="Новости"
            gold="и вайпы"
            action={
              // При двух новостях ссылку на архив заменяет плитка в самой сетке.
              news.data?.length === 2 ? undefined : (
                <RouterLink className="mc-btn" to="/news">
                  Все новости <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
                </RouterLink>
              )
            }
          />
          <Async query={news} skeletonHeight={120}>
            {items => (items.length === 0 ? <Text color="secondary">Новостей пока нет.</Text> : <NewsBlock items={items} servers={list} settings={settings} />)}
          </Async>
        </span>
      </section>

      <section className="mc-sec mc-sec--faq" aria-label="Частые вопросы">
        <LightArcs variant="c" />
        <Foliage seed={2} side="tr" />
        <span className="mc-sec__inner mc-faq-grid">
          <span className="mc-faq-side">
            <SectionHead
              icon={QuestionIcon}
              index="06"
              label="Вопросы"
              title="Коротко"
              gold="о главном"
              lead={contacts.length > 0 ? 'Не нашли ответ — напишите нам.' : 'Остальное — в правилах проекта.'}
            />
            <span className="mc-faq-side__links">
              <RouterLink className="mc-btn" to="/rules">
                Правила проекта <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
              </RouterLink>
              {contacts.map(c => (
                <a key={c.label} className="mc-btn" href={c.href} {...(c.href.startsWith('http') ? {target: '_blank', rel: 'noopener noreferrer'} : {})}>
                  {c.label} <ArrowUpRightIcon size={18} weight="bold" aria-hidden="true" />
                </a>
              ))}
            </span>
            <FaqMascot />
          </span>
          <Faq />
        </span>
      </section>

      <section className="mc-final" aria-label="Начать играть">
        <span className="mc-final__panel mc-edge" style={{background: `linear-gradient(180deg, ${PANORAMA_SKY[0]} 0%, ${PANORAMA_SKY[1]} 48%, ${PANORAMA_SKY[2]} 100%)`}}>
          <span className="mc-final__sun" aria-hidden="true" />
          {reduce ? null : <Particles className="mc-final__motes" quantity={small ? 22 : 46} staticity={80} ease={80} size={0.7} color="#FFE3B0" />}
          <WorldPoster
            world="panorama"
            className="mc-final__art"
            width={small ? 1200 : 2000}
            height={small ? 540 : 900}
            shot={{angle: 0.18, lift: 0.14, fit: 1.04, drop: 0.12}}
          />
          <WorldPoster
            world={`viewpoint:${account?.avatar_style ?? 'wanderer'}`}
            className="mc-final__hero"
            width={small ? 520 : 760}
            height={small ? 520 : 760}
            shot={{angle: 3.5, lift: 0.14, fit: 1.05}}
          />
          <Foliage seed={0} side="bl" />
          <Foliage seed={2} side="br" />
          <span className="mc-final__copy">
            <h2 className="mc-final__title">
              Мир уже запущен. <em className="mc-gold-text">Осталось зайти.</em>
            </h2>
            <p className="mc-final__lead">Скачайте лаунчер, создайте аккаунт и выберите свой мир.</p>
            <span className="mc-final__actions">
              <CtaLink to={startPath()}>Начать играть</CtaLink>
              <RouterLink className="mc-btn mc-btn--lg" to="/servers">
                Выбрать сервер
              </RouterLink>
            </span>
          </span>
        </span>
      </section>

      <StickyCta />
    </MotionConfig>
  );
}
