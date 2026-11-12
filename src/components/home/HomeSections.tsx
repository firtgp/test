import type {ReactNode} from 'react';
import {Link as RouterLink} from 'react-router';
import {MotionConfig} from 'motion/react';
import {HStack} from '@astryxdesign/core/HStack';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {ArrowRightIcon, ArrowUpRightIcon, CheckIcon} from '@phosphor-icons/react';
import {BlurFade} from '@/components/ui/blur-fade';
import {GridPattern} from '@/components/ui/grid-pattern';
import {NumberTicker} from '@/components/ui/number-ticker';
import {RetroGrid} from '@/components/ui/retro-grid';
import {useAccount, useNews, useNow, useServers, useSettings} from '../../app/hooks';
import {isDemo} from '../../data';
import {deriveStatus, totalOnline} from '../../data/status';
import {PANORAMA_SKY} from '../../scenes/worlds';
import {CtaLink, startPath} from '../CtaLink';
import {Async} from '../Page';
import {WorldPoster} from '../VoxelScene';
import {AccountBeams} from './AccountBeams';
import {Faq, NewsBlock, StickyCta} from './Extras';
import {ServerBento} from './ServerBento';
import {StartPath} from './StartPath';
import {Ticker} from './Ticker';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const smallScreen = () => typeof window !== 'undefined' && window.innerWidth < 720;

/** Число со счётчиком (Magic UI NumberTicker); при reduced motion — сразу итог. */
function Num({value}: {value: number}) {
  return reducedMotion() ? <>{value}</> : <NumberTicker value={value} className="mc-num" />;
}

function SectionHead({index, eyebrow, title, lead, action}: {index: string; eyebrow: string; title: ReactNode; lead?: string; action?: ReactNode}) {
  return (
    <BlurFade inView direction="up" offset={16}>
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
    </BlurFade>
  );
}

const ACCOUNT_FACTS = [
  'Один ник и пароль — для сайта, лаунчера и каждого сервера.',
  'Вещи и роли привязаны к постоянному UUID: смена ника их не трогает.',
  'Все входы видны в кабинете. Чужую сессию можно завершить одной кнопкой.',
];

/**
 * Блоки главной ниже первого экрана. Грузятся отдельным файлом: библиотека анимаций и
 * компоненты Magic UI не задерживают появление первого экрана.
 */
export default function HomeSections() {
  const settings = useSettings();
  const servers = useServers();
  const news = useNews();
  const account = useAccount().data;
  const now = useNow();

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
  const small = smallScreen();

  return (
    <MotionConfig reducedMotion="user">
      <Ticker items={mods} />

      {list.length > 0 ? (
        <dl className="mc-facts" aria-label="Проект в цифрах">
          {total ? (
            <div className="mc-fact mc-fact--hot">
              <dd className="mc-fact__value">
                <Num value={total.players} />
              </dd>
              <dt className="mc-fact__label">играют прямо сейчас{isDemo ? ' (демо)' : ''}</dt>
            </div>
          ) : null}
          <div className="mc-fact">
            <dd className="mc-fact__value">
              <Num value={list.length} />
            </dd>
            <dt className="mc-fact__label">{list.length === 1 ? 'мир' : list.length < 5 ? 'мира со своей сборкой' : 'миров со своей сборкой'}</dt>
          </div>
          {modTotal > 0 ? (
            <div className="mc-fact">
              <dd className="mc-fact__value">
                <Num value={modTotal} />
              </dd>
              <dt className="mc-fact__label">модов в сборках</dt>
            </div>
          ) : null}
          {versions.length > 0 ? (
            <div className="mc-fact">
              <dd className="mc-fact__value mc-fact__value--text">{versions.join(' · ')}</dd>
              <dt className="mc-fact__label">версия игры</dt>
            </div>
          ) : null}
        </dl>
      ) : null}

      <section className="mc-band mc-band--glow" aria-label="Как начать">
        <GridPattern className="mc-band__pattern" width={48} height={48} strokeDasharray="4 4" />
        <VStack gap={8}>
          <SectionHead index="01" eyebrow="Старт" title="Четыре шага до игры" lead="Нужен компьютер с Windows, macOS или Linux. Остальное сделает лаунчер." />
          <BlurFade inView delay={0.1} offset={16}>
            <StartPath servers={list} now={now} projectName={settings.project_name} />
          </BlurFade>
          <HStack>
            <CtaLink to={startPath()} size="md">
              Пошаговая инструкция
            </CtaLink>
          </HStack>
        </VStack>
      </section>

      <section className="mc-band mc-band--amber" aria-label="Один аккаунт">
        <span className="mc-split mc-split--account">
          <VStack gap={6}>
            <SectionHead
              index="02"
              eyebrow="Аккаунт"
              title={
                <>
                  Один аккаунт.
                  <br />
                  Везде.
                </>
              }
            />
            <BlurFade inView delay={0.1} offset={16}>
              <ul className="mc-checks">
                {ACCOUNT_FACTS.map(f => (
                  <li key={f}>
                    <CheckIcon size={18} weight="bold" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </BlurFade>
            <HStack gap={3} wrap="wrap">
              <RouterLink className="mc-btn-ink" to={account ? '/account' : '/register'}>
                {account ? 'Открыть кабинет' : 'Создать аккаунт'} <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
              </RouterLink>
            </HStack>
          </VStack>
          {list.length > 0 ? <AccountBeams servers={list} nick={account?.nick ?? null} /> : null}
        </span>
      </section>

      <section className="mc-band mc-band--raised" aria-label="Серверы и сборки">
        <VStack gap={8}>
          <SectionHead
            index="03"
            eyebrow="Миры"
            title="Серверы и сборки"
            lead="Статус приходит с серверов раз в минуту. Если данных нет — так и написано."
            action={
              <RouterLink className="mc-arrow-link" to="/servers">
                Списки модов <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
              </RouterLink>
            }
          />
          <Async query={servers} skeletonHeight={160}>
            {rows => (rows.length === 0 ? <Text color="secondary">Серверы ещё не опубликованы.</Text> : <ServerBento servers={rows} settings={settings} now={now} />)}
          </Async>
        </VStack>
      </section>

      <section className="mc-band mc-band--glow mc-band--glow-b" aria-label="Новости и вайпы">
        <VStack gap={8}>
          <SectionHead
            index="04"
            eyebrow="События"
            title="Новости и вайпы"
            action={
              // При двух новостях ссылку на архив заменяет плитка в самой сетке.
              news.data?.length === 2 ? undefined : (
                <RouterLink className="mc-arrow-link" to="/news">
                  Все новости <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
                </RouterLink>
              )
            }
          />
          <Async query={news} skeletonHeight={120}>
            {items => (items.length === 0 ? <Text color="secondary">Новостей пока нет.</Text> : <NewsBlock items={items} servers={list} settings={settings} />)}
          </Async>
        </VStack>
      </section>

      <section className="mc-band mc-band--raised" aria-label="Частые вопросы">
        <span className="mc-split mc-split--faq">
          <span className="mc-faq-side">
            <SectionHead
              index="05"
              eyebrow="Вопросы"
              title="Коротко о главном"
              lead={contacts.length > 0 ? 'Не нашли ответ — напишите нам.' : 'Остальное — в правилах проекта.'}
            />
            <span className="mc-faq-side__links">
              <RouterLink className="mc-arrow-link" to="/rules">
                Правила проекта <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
              </RouterLink>
              {contacts.map(c => (
                <a key={c.label} className="mc-arrow-link" href={c.href} {...(c.href.startsWith('http') ? {target: '_blank', rel: 'noopener noreferrer'} : {})}>
                  {c.label} <ArrowUpRightIcon size={18} weight="bold" aria-hidden="true" />
                </a>
              ))}
            </span>
            <span className="mc-ghost-q" aria-hidden="true">
              ?
            </span>
          </span>
          <Faq />
        </span>
      </section>

      <section
        className="mc-final"
        aria-label="Начать играть"
        style={{background: `linear-gradient(180deg, ${PANORAMA_SKY[0]} 0%, ${PANORAMA_SKY[1]} 46%, ${PANORAMA_SKY[2]} 100%)`}}>
        <RetroGrid className="mc-final__grid" angle={70} cellSize={64} opacity={0.55} lightLineColor="#FFD9A0" darkLineColor="#FFD9A0" />
        <span className="mc-final__copy">
          <h2 className="mc-final__title">Мир уже запущен. Осталось зайти.</h2>
          <CtaLink to={startPath()}>Начать играть</CtaLink>
        </span>
        <WorldPoster
          world="panorama"
          className="mc-final__art"
          width={small ? 1200 : 2000}
          height={small ? 540 : 900}
          shot={{angle: 0.18, lift: 0.14, fit: 1.04, drop: 0.12}}
        />
      </section>

      <StickyCta />
    </MotionConfig>
  );
}
