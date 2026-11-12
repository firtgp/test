import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {Collapsible, CollapsibleGroup} from '@astryxdesign/core/Collapsible';
import {Text} from '@astryxdesign/core/Text';
import {ArrowRightIcon, ArrowUpRightIcon} from '@phosphor-icons/react';
import {formatInTimeZone} from 'date-fns-tz';
import {ru} from 'date-fns/locale';
import {FlickeringGrid} from '@/components/ui/flickering-grid';
import {formatDateTime} from '../../app/format';
import {NEWS_KIND_LABEL, type NewsItem, type ServerView, type SiteSettings} from '../../data/types';
import {startPath} from '../CtaLink';
import {WorldPoster} from '../VoxelScene';

/**
 * Новости: крупные даты, у главной — постер мира её сервера и «живая» обложка (Magic UI FlickeringGrid).
 * Правая колонка всегда заполнена: вторая и третья новость, а если третьей нет — плитка «Все новости».
 */
export function NewsBlock({items, servers, settings}: {items: NewsItem[]; servers: ServerView[]; settings: SiteSettings}) {
  const shown = items.slice(0, 3);
  return (
    <ul className={`mc-news2${shown.length === 1 ? ' mc-news2--solo' : ''}`}>
      {shown.map((n, i) => {
        const server = servers.find(s => s.id === n.server_id);
        const accent = server?.accent;
        const date = n.event_at ?? n.published_at;
        return (
          <li key={n.id} className={`mc-news2__item${i === 0 ? ' mc-news2__item--lead' : ''}`} style={accent ? {['--server-accent' as string]: accent} : undefined}>
            {i === 0 ? (
              <FlickeringGrid className="mc-news2__cover" squareSize={6} gridGap={8} flickerChance={0.3} maxOpacity={0.6} color={accent ?? '#F2B544'} />
            ) : null}
            {i === 0 && server ? (
              <WorldPoster world={server.scene ?? 'survival'} className="mc-news2__art" width={800} height={800} shot={{angle: -0.5, fit: 1.1}} />
            ) : null}
            {date ? (
              <span className="mc-news2__date" aria-hidden="true">
                <span className="mc-news2__day">{formatInTimeZone(date, settings.timezone, 'd', {locale: ru})}</span>
                <span className="mc-news2__month">{formatInTimeZone(date, settings.timezone, 'LLL', {locale: ru}).replace('.', '')}</span>
              </span>
            ) : null}
            <span className="mc-news2__body">
              <span className="mc-chip">{NEWS_KIND_LABEL[n.kind]}</span>
              <h3 className="mc-news2__title">
                <Link to={`/news/${n.slug}`}>{n.title}</Link>
              </h3>
              {n.event_at ? <span className="mc-news2__when">{formatDateTime(n.event_at, settings)}</span> : null}
              {n.summary ? <p className="mc-news2__text">{n.summary}</p> : null}
            </span>
            <ArrowUpRightIcon className="mc-news2__arrow" size={24} weight="bold" aria-hidden="true" />
          </li>
        );
      })}
      {shown.length === 2 ? (
        <li className="mc-news2__all">
          <Link to="/news">
            <span className="mc-news2__all-title">Все новости</span>
            <span className="mc-news2__all-text">Вайпы, запуски, техработы и ивенты</span>
            <ArrowRightIcon size={28} weight="bold" aria-hidden="true" />
          </Link>
        </li>
      ) : null}
    </ul>
  );
}

const FAQ: {q: string; a: string; link?: {to: string; label: string}}[] = [
  {q: 'Можно ли играть с телефона?', a: 'Нет. Сборки работают на Java Edition, то есть на компьютере с Windows, macOS или Linux. С телефона удобно создать аккаунт и следить за новостями.'},
  {q: 'Нужен ли отдельный аккаунт для каждого сервера?', a: 'Нет. Аккаунт один: с ним вы входите на сайт, в лаунчер и на любой сервер проекта.'},
  {q: 'Что ставит лаунчер?', a: 'Нужную версию игры, Java и моды выбранной сборки. Скачивать и раскладывать моды вручную не нужно.'},
  {q: 'Потеряю ли я вещи, если сменю ник?', a: 'Нет. Инвентарь, приваты и роли привязаны к постоянному UUID игрока, а не к нику. Менять ник можно раз в 30 дней.'},
  {q: 'Что такое вайп и где узнать дату?', a: 'Вайп — это обнуление мира сервера перед новым сезоном. Аккаунт, ник и роли при этом сохраняются. Дата стоит на карточке сервера и в новостях, время указано в поясе проекта.'},
  {q: 'Я забыл пароль. Что делать?', a: 'Запросите ссылку для сброса. Она одноразовая; после смены пароля остальные сессии сайта и лаунчера завершаются.', link: {to: '/forgot', label: 'Восстановить пароль'}},
];

export function Faq() {
  return (
    <CollapsibleGroup type="single" defaultValue="q0">
      <ul className="mc-faq">
        {FAQ.map((f, i) => (
          <li key={f.q} className="mc-faq__item">
            <Collapsible trigger={f.q} value={`q${i}`}>
              <Text type="body" color="secondary" as="p">
                {f.a}
              </Text>
              {f.link ? (
                <Link className="mc-arrow-link" to={f.link.to}>
                  {f.link.label} <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
                </Link>
              ) : null}
            </Collapsible>
          </li>
        ))}
      </ul>
    </CollapsibleGroup>
  );
}

/** Закреплённая кнопка на телефоне: появляется, когда главная кнопка первого экрана ушла из вида. */
export function StickyCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.querySelector('.mc-hero2 .mc-cta');
    const final = document.querySelector('.mc-final');
    if (!hero || !final) return;
    const state = {hero: true, final: false};
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.target === hero) state.hero = e.isIntersecting;
        else state.final = e.isIntersecting;
      }
      setShow(!state.hero && !state.final);
    });
    io.observe(hero);
    io.observe(final);
    return () => io.disconnect();
  }, []);
  return (
    <span className={`mc-sticky${show ? ' mc-sticky--on' : ''}`} aria-hidden={!show}>
      <Link className="mc-cta mc-cta--md" to={startPath()} tabIndex={show ? 0 : -1}>
        Начать играть <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
      </Link>
    </span>
  );
}
