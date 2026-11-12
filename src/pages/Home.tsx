import {useEffect, type ReactNode} from 'react';
import {Link as RouterLink} from 'react-router';
import {Button} from '@astryxdesign/core/Button';
import {HStack} from '@astryxdesign/core/HStack';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {ArrowRightIcon, ArrowUpRightIcon} from '@phosphor-icons/react';
import {useNews, useNow, useServers, useSettings} from '../app/hooks';
import {formatDate, formatDateTime} from '../app/format';
import {isDemo} from '../data';
import {deriveStatus, totalOnline} from '../data/status';
import {NEWS_KIND_LABEL} from '../data/types';
import {CtaLink, startPath} from '../components/CtaLink';
import {HeroWorlds} from '../components/HeroWorlds';
import {Async} from '../components/Page';
import {accentStyle, packLine} from '../components/ServerCard';
import {StatusLine} from '../components/StatusLine';

export const START_STEPS = [
  {title: 'Скачайте лаунчер', text: 'Он сам установит нужную версию игры, Java и моды сборки.'},
  {title: 'Создайте аккаунт', text: 'Ник, почта и пароль. Один аккаунт для сайта, лаунчера и всех серверов.'},
  {title: 'Войдите в лаунчер', text: 'С тем же ником и паролем, что и на сайте.'},
  {title: 'Выберите сервер', text: 'Нажмите «Играть» — лаунчер докачает сборку и подключит вас.'},
];

function SectionHead({index, eyebrow, title, lead, action}: {index: string; eyebrow: string; title: string; lead?: string; action?: ReactNode}) {
  return (
    <HStack justify="between" vAlign="end" wrap="wrap" gap={4}>
      <VStack gap={3}>
        <span className="mc-eyebrow">
          <span className="mc-eyebrow__num">{index}</span>
          {eyebrow}
        </span>
        <h2 className="mc-title">{title}</h2>
        {lead ? <p className="mc-lead">{lead}</p> : null}
      </VStack>
      {action}
    </HStack>
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

  const list = servers.data ?? [];
  const statuses = list.map(s => deriveStatus(s, s.status, now));
  const total = totalOnline(statuses);
  const nextWipe = list
    .filter(s => s.next_wipe_at && Date.parse(s.next_wipe_at) > now)
    .sort((a, b) => Date.parse(a.next_wipe_at!) - Date.parse(b.next_wipe_at!))[0];
  const modTotal = list.reduce((sum, s) => sum + s.mod_count, 0);
  const featured = news.data?.[0];

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

      {list.length > 0 ? (
        <dl className="mc-stats" aria-label="Проект в цифрах">
          {total ? (
            <span className="mc-stat">
              <dd className="mc-stat__value">{total.players}</dd>
              <dt className="mc-stat__label">игроков онлайн{isDemo ? ' (демо)' : ''}</dt>
            </span>
          ) : null}
          <span className="mc-stat">
            <dd className="mc-stat__value">{list.length}</dd>
            <dt className="mc-stat__label">{list.length === 1 ? 'сервер' : list.length < 5 ? 'сервера' : 'серверов'}</dt>
          </span>
          {modTotal > 0 ? (
            <span className="mc-stat">
              <dd className="mc-stat__value">{modTotal}</dd>
              <dt className="mc-stat__label">модов в сборках</dt>
            </span>
          ) : null}
          <span className="mc-stat">
            <dd className="mc-stat__value">1</dd>
            <dt className="mc-stat__label">аккаунт на всё</dt>
          </span>
        </dl>
      ) : null}

      <VStack gap={10} className="mc-page mc-page--home">
        <VStack gap={8} as="section" aria-label="Как начать">
          <SectionHead
            index="01"
            eyebrow="Старт"
            title="Четыре шага до игры"
            lead="Нужен компьютер с Windows, macOS или Linux. Всё остальное сделает лаунчер."
          />
          <ol className="mc-path">
            {START_STEPS.map((step, i) => (
              <li className="mc-path__step" key={step.title}>
                <span className="mc-path__num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="mc-path__title">{step.title}</h3>
                <p className="mc-path__text">{step.text}</p>
              </li>
            ))}
          </ol>
          <HStack>
            <CtaLink to={startPath()} size="md">
              Пошаговая инструкция
            </CtaLink>
          </HStack>
        </VStack>

        <VStack gap={8} as="section" aria-label="Серверы и сборки">
          <SectionHead
            index="02"
            eyebrow="Миры"
            title="Серверы и сборки"
            lead="У каждого сервера своя сборка модов. Статус обновляется раз в минуту."
            action={
              <RouterLink className="mc-arrow-link" to="/servers">
                Списки модов <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
              </RouterLink>
            }
          />
          <Async query={servers} skeletonHeight={96}>
            {rows =>
              rows.length === 0 ? (
                <Text color="secondary">Серверы ещё не опубликованы.</Text>
              ) : (
                <ul className="mc-rows">
                  {rows.map(s => (
                    <li key={s.id} className="mc-row" style={accentStyle(s.accent)}>
                      <span className="mc-row__main">
                        <RouterLink className="mc-row__name" to={`/servers/${s.slug}`}>
                          {s.name}
                        </RouterLink>
                        <span className="mc-row__pack">{packLine(s)}</span>
                      </span>
                      <span className="mc-row__cell">
                        <span className="mc-row__label">Статус</span>
                        <StatusLine status={deriveStatus(s, s.status, now)} settings={settings} />
                      </span>
                      <span className="mc-row__cell">
                        <span className="mc-row__label">Моды</span>
                        {s.key_mods.length > 0 ? s.key_mods.slice(0, 3).join(', ') : 'Список не добавлен'}
                      </span>
                      <span className="mc-row__cell">
                        <span className="mc-row__label">Вайп</span>
                        {s.next_wipe_at ? formatDateTime(s.next_wipe_at, settings) : s.wipe_policy || 'Не указано'}
                      </span>
                      <RouterLink className="mc-row__go" to={startPath(s.slug)} aria-label={`Играть на «${s.name}»`}>
                        Играть <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
                      </RouterLink>
                    </li>
                  ))}
                </ul>
              )
            }
          </Async>
        </VStack>

        <VStack gap={8} as="section" aria-label="Новости и вайпы">
          <SectionHead
            index="03"
            eyebrow="События"
            title="Новости и вайпы"
            action={
              <RouterLink className="mc-arrow-link" to="/news">
                Все новости <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
              </RouterLink>
            }
          />
          <Async query={news} skeletonHeight={120}>
            {items =>
              items.length === 0 || !featured ? (
                <Text color="secondary">Новостей пока нет.</Text>
              ) : (
                <ul className="mc-news">
                  {items.slice(0, 3).map((n, i) => (
                    <li key={n.id} className={`mc-news__item${i === 0 ? ' mc-news__item--lead' : ''}`}>
                      <span className="mc-news__meta">
                        <span className="mc-chip">{NEWS_KIND_LABEL[n.kind]}</span>
                        {n.published_at ? formatDate(n.published_at, settings) : ''}
                      </span>
                      <h3 className="mc-news__title">
                        <RouterLink to={`/news/${n.slug}`}>{n.title}</RouterLink>
                      </h3>
                      {n.event_at ? <span className="mc-news__when">{formatDateTime(n.event_at, settings)}</span> : null}
                      {n.summary ? <p className="mc-news__text">{n.summary}</p> : null}
                      <ArrowUpRightIcon className="mc-news__arrow" size={22} weight="bold" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
              )
            }
          </Async>
        </VStack>

        <section className="mc-final" aria-label="Начать играть">
          <h2 className="mc-final__title">Мир уже запущен. Осталось зайти.</h2>
          <CtaLink to={startPath()}>Начать играть</CtaLink>
        </section>
      </VStack>
    </>
  );
}
