import {lazy, Suspense, useEffect} from 'react';
import {CubeIcon, PlayCircleIcon, RocketLaunchIcon, UserCircleIcon} from '@phosphor-icons/react';
import {HStack} from '@astryxdesign/core/HStack';
import {VStack} from '@astryxdesign/core/VStack';
import {useMedia, useNow, useServers, useSettings} from '../app/hooks';
import {formatDateTime} from '../app/format';
import {isDemo} from '../data';
import {deriveStatus, totalOnline} from '../data/status';
import {CtaLink, startPath} from '../components/CtaLink';
import {HeroWorlds} from '../components/HeroWorlds';
import {LazyBoundary} from '../components/LazyBoundary';

// Всё, что ниже первого экрана, грузится отдельным файлом.
const HomeSections = lazy(() => import('../components/home/HomeSections'));
// Фоновая пыль первого экрана лежит в том же файле, что и нижние блоки: первый экран её не ждёт.
const HeroMotes = lazy(() => import('../components/home/HomeSections').then(m => ({default: m.HeroMotes})));

/** Делит заголовок на две части: вторая выделяется золотом. */
export function splitTitle(title: string): [string, string | null] {
  const i = title.indexOf('. ');
  return i > 0 && i < title.length - 2 ? [title.slice(0, i + 1), title.slice(i + 2)] : [title, null];
}

export function Home() {
  const settings = useSettings();
  const servers = useServers();
  const now = useNow();
  const reduce = useMedia('(prefers-reduced-motion: reduce)');
  useEffect(() => {
    document.title = `${settings.project_name} — серверы на модах, лаунчер и единый аккаунт`;
  }, [settings.project_name]);

  const list = servers.data ?? [];
  const total = totalOnline(list.map(s => deriveStatus(s, s.status, now)));
  const nextWipe = list
    .filter(s => s.next_wipe_at && Date.parse(s.next_wipe_at) > now)
    .sort((a, b) => Date.parse(a.next_wipe_at!) - Date.parse(b.next_wipe_at!))[0];
  const [head, tail] = splitTitle(settings.hero_title);

  return (
    <>
      <section className="mc-hero2" aria-labelledby="hero-title">
        {reduce ? null : (
          <LazyBoundary silent>
            <Suspense fallback={null}>
              <HeroMotes />
            </Suspense>
          </LazyBoundary>
        )}
        <VStack gap={6} hAlign="start" className="mc-hero2__copy">
          {total ? (
            <span className="mc-live">
              <span className="mc-live__dot" aria-hidden="true" />
              Сейчас играют: {total.players}
              {isDemo ? <span className="mc-live__note">демо-данные</span> : null}
            </span>
          ) : null}
          <h1 className="mc-hero2__title" id="hero-title">
            {head}
            {tail ? (
              <>
                {' '}
                <em className="mc-gold-text">{tail}</em>
              </>
            ) : null}
          </h1>
          <p className="mc-hero2__lead">{settings.hero_lead}</p>
          <HStack gap={3} wrap="wrap" vAlign="center" width="100%">
            <CtaLink to={startPath()}>Начать играть</CtaLink>
            <a className="mc-btn mc-btn--lg" href="#start">
              <PlayCircleIcon size={22} weight="fill" aria-hidden="true" />
              Как это работает
            </a>
          </HStack>
          <ul className="mc-hero2__badges">
            <li>
              <RocketLaunchIcon size={18} weight="fill" aria-hidden="true" />
              Свой лаунчер
            </li>
            <li>
              <CubeIcon size={18} weight="fill" aria-hidden="true" />
              Готовые сборки модов
            </li>
            <li>
              <UserCircleIcon size={18} weight="fill" aria-hidden="true" />
              Один аккаунт на всё
            </li>
          </ul>
          {nextWipe ? (
            <span className="mc-hero2__meta">
              Ближайший вайп — «{nextWipe.name}», {formatDateTime(nextWipe.next_wipe_at!, settings)}
            </span>
          ) : null}
        </VStack>
        {list.length > 0 ? <HeroWorlds servers={list} settings={settings} now={now} /> : null}
      </section>

      <LazyBoundary>
        <Suspense
          fallback={
            <p className="mc-below-fallback" role="status">
              Загрузка…
            </p>
          }>
          <HomeSections />
        </Suspense>
      </LazyBoundary>
    </>
  );
}
