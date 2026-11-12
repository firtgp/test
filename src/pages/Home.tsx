import {lazy, Suspense, useEffect} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {HStack} from '@astryxdesign/core/HStack';
import {VStack} from '@astryxdesign/core/VStack';
import {useNow, useServers, useSettings} from '../app/hooks';
import {formatDateTime} from '../app/format';
import {isDemo} from '../data';
import {deriveStatus, totalOnline} from '../data/status';
import {CtaLink, startPath} from '../components/CtaLink';
import {HeroWorlds} from '../components/HeroWorlds';
import {LazyBoundary} from '../components/LazyBoundary';

// Всё, что ниже первого экрана, грузится отдельным файлом.
const HomeSections = lazy(() => import('../components/home/HomeSections'));

export function Home() {
  const settings = useSettings();
  const servers = useServers();
  const now = useNow();
  useEffect(() => {
    document.title = `${settings.project_name} — серверы на модах, лаунчер и единый аккаунт`;
  }, [settings.project_name]);

  const list = servers.data ?? [];
  const total = totalOnline(list.map(s => deriveStatus(s, s.status, now)));
  const nextWipe = list
    .filter(s => s.next_wipe_at && Date.parse(s.next_wipe_at) > now)
    .sort((a, b) => Date.parse(a.next_wipe_at!) - Date.parse(b.next_wipe_at!))[0];

  return (
    <>
      <section className="mc-hero2" aria-labelledby="hero-title">
        <VStack gap={6} hAlign="start" className="mc-hero2__copy">
          {total ? (
            <span className="mc-live">
              <span className="mc-live__dot" aria-hidden="true" />
              Сейчас играют: {total.players}
              {isDemo ? <span className="mc-live__note">демо-данные</span> : null}
            </span>
          ) : null}
          <h1 className="mc-hero2__title" id="hero-title">
            {settings.hero_title}
          </h1>
          <p className="mc-hero2__lead">{settings.hero_lead}</p>
          <HStack gap={4} wrap="wrap" vAlign="center" width="100%">
            <CtaLink to={startPath()}>Начать играть</CtaLink>
            <Button label="Все серверы" href="/servers" variant="ghost" size="lg" />
          </HStack>
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
