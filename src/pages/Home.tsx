import {useEffect} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {UsersThreeIcon} from '@phosphor-icons/react';
import {useNews, useNow, useServers, useSettings} from '../app/hooks';
import {formatDate, formatDateTime} from '../app/format';
import {isDemo} from '../data';
import {deriveStatus, totalOnline} from '../data/status';
import {NEWS_KIND_LABEL} from '../data/types';
import {CtaLink, startPath} from '../components/CtaLink';
import {HeroScene} from '../components/HeroScene';
import {Async} from '../components/Page';
import {ServerCard} from '../components/ServerCard';

export const START_STEPS = [
  {title: 'Скачайте лаунчер', text: 'Он сам установит нужную версию игры, Java и моды сборки.'},
  {title: 'Создайте аккаунт', text: 'Ник, почта и пароль. Один аккаунт для сайта, лаунчера и всех серверов.'},
  {title: 'Войдите в лаунчер', text: 'С тем же ником и паролем, что и на сайте.'},
  {title: 'Выберите сервер', text: 'Нажмите «Играть» — лаунчер докачает сборку и подключит вас.'},
];

function OnlineProof() {
  const servers = useServers();
  const now = useNow();
  if (!servers.data) return null;
  const total = totalOnline(servers.data.map(s => deriveStatus(s, s.status, now)));
  // Нет живых снимков — блок не показывается: число не дорисовывается.
  if (!total) return null;
  return (
    <span className="mc-proof">
      <UsersThreeIcon size={20} weight="fill" aria-hidden="true" color="var(--mc-status-online)" />
      Сейчас играют: {total.players}
      <Text color="secondary" type="supporting">
        на {total.servers} из {servers.data.length} серверов{isDemo ? ' · демо-данные' : ''}
      </Text>
    </span>
  );
}

export function Home() {
  const settings = useSettings();
  const servers = useServers();
  const news = useNews();
  const now = useNow();
  useEffect(() => {
    document.title = `${settings.project_name} — серверы на модах, лаунчер и единый аккаунт`;
  }, [settings.project_name]);
  const nextWipe = servers.data
    ?.filter(s => s.next_wipe_at && Date.parse(s.next_wipe_at) > now)
    .sort((a, b) => Date.parse(a.next_wipe_at!) - Date.parse(b.next_wipe_at!))[0];

  return (
    <>
      <section className="mc-hero" aria-labelledby="hero-title">
        <HeroScene />
        <p className="mc-hero__note mc-only-desktop">
          Изображение — заглушка. Замените её рендером или скриншотом собственного мира.
        </p>
        <VStack gap={0} className="mc-hero__inner">
          <VStack gap={6} hAlign="start" className="mc-hero__copy">
            <OnlineProof />
            <h1 className="mc-hero__title" id="hero-title">
              {settings.hero_title}
            </h1>
            <p className="mc-hero__lead">{settings.hero_lead}</p>
            <HStack gap={4} wrap="wrap" vAlign="center" width="100%">
              <CtaLink to={startPath()}>Начать играть</CtaLink>
              <Button label="Смотреть серверы" href="/servers" variant="ghost" size="lg" />
            </HStack>
            {nextWipe ? (
              <Text color="secondary">
                Ближайший вайп: «{nextWipe.name}», {formatDateTime(nextWipe.next_wipe_at!, settings)}
              </Text>
            ) : null}
          </VStack>
        </VStack>
      </section>

      <VStack gap={10} className="mc-page">
        <VStack gap={6} as="section" aria-labelledby="home-servers">
          <HStack justify="between" vAlign="end" wrap="wrap" gap={3}>
            <VStack gap={2}>
              <Heading level={2} id="home-servers">
                Серверы и сборки
              </Heading>
              <Text color="secondary">Каждый сервер — своя сборка модов. Аккаунт общий.</Text>
            </VStack>
            <Link href="/servers">Все серверы и списки модов</Link>
          </HStack>
          <Async query={servers} skeletonHeight={280}>
            {list =>
              list.length === 0 ? (
                <Text color="secondary">Серверы ещё не опубликованы.</Text>
              ) : (
                <Grid columns={{minWidth: 300, max: 3}} gap={4}>
                  {list.map(s => (
                    <ServerCard key={s.id} server={s} settings={settings} now={now} />
                  ))}
                </Grid>
              )
            }
          </Async>
        </VStack>

        <VStack gap={6} as="section" aria-labelledby="home-start">
          <VStack gap={2}>
            <Heading level={2} id="home-start">
              Как начать
            </Heading>
            <Text color="secondary">Четыре шага от этой страницы до игры. Нужен компьютер с Windows, macOS или Linux.</Text>
          </VStack>
          <ol className="mc-steps">
            {START_STEPS.map(step => (
              <li className="mc-step" key={step.title}>
                <VStack gap={2}>
                  <Heading level={3}>{step.title}</Heading>
                  <Text color="secondary">{step.text}</Text>
                </VStack>
              </li>
            ))}
          </ol>
          <HStack>
            <CtaLink to={startPath()} size="md">
              Открыть пошаговую инструкцию
            </CtaLink>
          </HStack>
        </VStack>

        <VStack gap={6} as="section" aria-labelledby="home-news">
          <HStack justify="between" vAlign="end" wrap="wrap" gap={3}>
            <Heading level={2} id="home-news">
              Новости и вайпы
            </Heading>
            <Link href="/news">Все новости</Link>
          </HStack>
          <Async query={news} skeletonHeight={96}>
            {list =>
              list.length === 0 ? (
                <Text color="secondary">Новостей пока нет.</Text>
              ) : (
                <Grid columns={{minWidth: 300, max: 3}} gap={4}>
                  {list.slice(0, 3).map(n => (
                    <VStack gap={2} key={n.id} as="article" className="mc-tile">
                      <Text type="supporting">
                        {NEWS_KIND_LABEL[n.kind]}
                        {n.published_at ? ` · ${formatDate(n.published_at, settings)}` : ''}
                      </Text>
                      <Heading level={3}>
                        <Link href={`/news/${n.slug}`}>{n.title}</Link>
                      </Heading>
                      {n.summary ? <Text color="secondary">{n.summary}</Text> : null}
                    </VStack>
                  ))}
                </Grid>
              )
            }
          </Async>
        </VStack>
      </VStack>
    </>
  );
}
