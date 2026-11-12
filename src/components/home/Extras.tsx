import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {ArrowRightIcon, ArrowUpRightIcon, CalendarBlankIcon, ChatCircleDotsIcon, NewspaperIcon, PlusIcon, QuestionIcon} from '@phosphor-icons/react';
import {formatInTimeZone} from 'date-fns-tz';
import {ru} from 'date-fns/locale';
import {formatDateTime} from '../../app/format';
import {NEWS_KIND_LABEL, type NewsItem, type ServerView, type SiteSettings} from '../../data/types';
import {PANORAMA_SKY, SKY} from '../../scenes/meta';
import {startPath} from '../CtaLink';
import {WorldPoster} from '../VoxelScene';

const skyStyle = (c: [string, string, string]) => ({background: `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 58%, ${c[2]} 100%)`});

/**
 * Новости карточками с обложкой: мир сервера, к которому относится новость, или панорама проекта.
 * Сетка всегда заполнена: при двух новостях третью ячейку занимает плитка «Все новости».
 */
export function NewsBlock({items, servers, settings}: {items: NewsItem[]; servers: ServerView[]; settings: SiteSettings}) {
  const shown = items.slice(0, 3);
  return (
    <ul className={`mc-news${shown.length === 1 ? ' mc-news--solo' : ''}`}>
      {shown.map(n => {
        const server = servers.find(s => s.id === n.server_id);
        const date = n.event_at ?? n.published_at;
        return (
          <li key={n.id} className="mc-news__item" style={server ? {['--server-accent' as string]: server.accent} : undefined}>
            <span className="mc-news__art" style={skyStyle(server ? SKY[server.scene ?? 'survival'] : PANORAMA_SKY)} aria-hidden="true">
              {server ? (
                <WorldPoster world={server.scene ?? 'survival'} className="mc-news__poster" width={720} height={480} shot={{angle: -0.5, lift: 0.2, fit: 1.02, drop: 0.1}} />
              ) : (
                <WorldPoster world="panorama" className="mc-news__poster mc-news__poster--wide" width={900} height={420} shot={{angle: 0.18, lift: 0.14, fit: 1.04, drop: 0.12}} />
              )}
              <span className="mc-news__shade" />
              {date ? (
                <span className="mc-news__date">
                  <span className="mc-news__day">{formatInTimeZone(date, settings.timezone, 'd', {locale: ru})}</span>
                  <span className="mc-news__month">{formatInTimeZone(date, settings.timezone, 'LLL', {locale: ru}).replace('.', '')}</span>
                </span>
              ) : null}
            </span>
            <span className="mc-news__body">
              <span className="mc-news__tags">
                <span className="mc-chip mc-chip--gold">{NEWS_KIND_LABEL[n.kind]}</span>
                {server ? <span className="mc-chip mc-chip--accent">{server.name}</span> : null}
              </span>
              <h3 className="mc-news__title">
                <Link to={`/news/${n.slug}`}>{n.title}</Link>
              </h3>
              {n.event_at ? (
                <span className="mc-news__when">
                  <CalendarBlankIcon size={16} weight="fill" aria-hidden="true" />
                  {formatDateTime(n.event_at, settings)}
                </span>
              ) : null}
              {n.summary ? <p className="mc-news__text">{n.summary}</p> : null}
              <span className="mc-news__more" aria-hidden="true">
                Читать <ArrowUpRightIcon size={16} weight="bold" />
              </span>
            </span>
          </li>
        );
      })}
      {shown.length === 2 ? (
        <li className="mc-news__all">
          <Link to="/news">
            <NewspaperIcon className="mc-news__all-art" size={96} weight="duotone" aria-hidden="true" />
            <span className="mc-news__all-title">Все новости</span>
            <span className="mc-news__all-text">Вайпы, запуски, техработы и ивенты</span>
            <span className="mc-news__all-go">
              <ArrowRightIcon size={24} weight="bold" aria-hidden="true" />
            </span>
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

/** Вопросы стеклянными строками. Открыт один ответ; закрытый ответ недоступен для фокуса. */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="mc-faq">
      {FAQ.map((f, i) => {
        const on = open === i;
        return (
          <li key={f.q} className={`mc-faq__item${on ? ' mc-faq__item--on' : ''}`}>
            <h3 className="mc-faq__q">
              <button type="button" id={`faq-q${i}`} aria-expanded={on} aria-controls={`faq-a${i}`} onClick={() => setOpen(on ? null : i)}>
                <span>{f.q}</span>
                <span className="mc-faq__plus" aria-hidden="true">
                  <PlusIcon size={18} weight="bold" />
                </span>
              </button>
            </h3>
            <span className="mc-faq__a" id={`faq-a${i}`} role="region" aria-labelledby={`faq-q${i}`} inert={!on}>
              <span className="mc-faq__a-inner">
                <p>{f.a}</p>
                {f.link ? (
                  <Link className="mc-arrow-link" to={f.link.to}>
                    {f.link.label} <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
                  </Link>
                ) : null}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Лис с фонарём рядом с вопросами: декоративный постер из блоков. */
export function FaqMascot() {
  return (
    <span className="mc-fox" aria-hidden="true">
      <span className="mc-fox__glow" />
      <WorldPoster world="fox" className="mc-fox__art mc-float mc-float--slow" width={640} height={640} shot={{angle: 0.45, lift: 0.2, fit: 1.05}} />
      <span className="mc-fox__chip mc-fox__chip--a mc-float">
        <QuestionIcon size={20} weight="bold" />
      </span>
      <span className="mc-fox__chip mc-fox__chip--b mc-float mc-float--slow">
        <ChatCircleDotsIcon size={20} weight="fill" />
      </span>
    </span>
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
