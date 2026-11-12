import type {CSSProperties, ReactNode} from 'react';
import {
  CheckCircleIcon, CheckIcon, CubeIcon, CursorIcon, DownloadSimpleIcon, EnvelopeSimpleIcon, GearSixIcon, HouseIcon,
  LockSimpleIcon, MinusIcon, NewspaperIcon, PlayIcon, SignInIcon, SquareIcon, XIcon,
} from '@phosphor-icons/react';
import {deriveStatus} from '../../data/status';
import type {ServerView, SiteSettings} from '../../data/types';
import {PANORAMA_SKY, SKY} from '../../scenes/meta';
import {accentStyle, packLine} from '../ServerCard';
import {WorldPoster} from '../VoxelScene';

// Условные ник и почта для макета: настоящих игроков здесь нет.
const SAMPLE_NICK = 'Block_Fox';
const SAMPLE_MAIL = 'fox@example.org';
/** Постеры экранов окна: одни и те же параметры для показа и для предварительной подготовки. */
export const LOGIN_ART = {width: 1000, height: 450, shot: {angle: 0.18, lift: 0.14, fit: 1.04, drop: 0.12}};
export const BANNER_ART = {width: 760, height: 520, shot: {angle: 0.6, lift: 0.2, fit: 1.02, drop: 0.1}};
const sky = (c: [string, string, string]): CSSProperties => ({background: `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 55%, ${c[2]} 100%)`});

function Field({label, value, state, children}: {label: string; value: string; state?: 'focus' | 'ok'; children?: ReactNode}) {
  return (
    <span className={`mc-field${state ? ` mc-field--${state}` : ''}`}>
      <span className="mc-field__label">{label}</span>
      <span className="mc-field__box">
        <span className="mc-field__value">{value}</span>
        {state === 'focus' ? <i className="mc-field__caret" /> : null}
        {state === 'ok' ? <CheckCircleIcon size={16} weight="fill" /> : null}
      </span>
      {children}
    </span>
  );
}

function Installer({name}: {name: string}) {
  return (
    <span className="mc-win__body mc-win__body--install">
      <span className="mc-inst__logo">
        <CubeIcon size={56} weight="fill" />
      </span>
      <span className="mc-inst__main">
        <span className="mc-inst__name">{name}</span>
        <span className="mc-inst__file">
          <DownloadSimpleIcon size={16} weight="bold" />
          launcher-setup
          <span className="mc-inst__os">Windows · macOS · Linux</span>
        </span>
        <span className="mc-inst__bar">
          <i />
        </span>
        <span className="mc-inst__state">
          <span className="mc-inst__state-a">Загрузка файлов…</span>
          <span className="mc-inst__state-b">
            <CheckIcon size={14} weight="bold" /> Готово к запуску
          </span>
        </span>
      </span>
      <span className="mc-inst__list">
        {['Игра нужной версии', 'Java', 'Моды сборки'].map((t, i) => (
          <span key={t} style={{['--i' as string]: i}}>
            <CheckCircleIcon size={18} weight="fill" />
            {t}
          </span>
        ))}
      </span>
    </span>
  );
}

function Registration() {
  return (
    <span className="mc-win__body mc-win__body--reg">
      <span className="mc-reg__form">
        <span className="mc-reg__title">Создание аккаунта</span>
        <Field label="Ник в игре" value={SAMPLE_NICK} state="ok" />
        <Field label="Почта" value={SAMPLE_MAIL} />
        <Field label="Пароль" value="••••••••••••" state="focus">
          <span className="mc-field__meter">
            <i />
            <i />
            <i />
            <i />
          </span>
        </Field>
        <span className="mc-win__btn">Создать аккаунт</span>
      </span>
      <span className="mc-reg__mail">
        <span className="mc-reg__env">
          <EnvelopeSimpleIcon size={30} weight="fill" />
        </span>
        <span className="mc-reg__mail-title">Письмо отправлено</span>
        <span className="mc-reg__mail-text">Подтвердите почту по ссылке — и аккаунт готов</span>
      </span>
      <CursorIcon className="mc-win__cursor" weight="fill" />
    </span>
  );
}

function Login({projectName}: {projectName: string}) {
  return (
    <span className="mc-win__body mc-win__body--login" style={sky(PANORAMA_SKY)}>
      <WorldPoster world="panorama" className="mc-win__art" {...LOGIN_ART} />
      <span className="mc-login">
        <span className="mc-login__brand">
          <span className="mc-win__app">
            <CubeIcon size={14} weight="fill" />
          </span>
          {projectName}
        </span>
        <Field label="Ник" value={SAMPLE_NICK} />
        <Field label="Пароль" value="••••••••••••" state="focus" />
        <span className="mc-login__remember">
          <i>
            <CheckIcon size={10} weight="bold" />
          </i>
          Запомнить меня
        </span>
        <span className="mc-win__btn">
          <SignInIcon size={16} weight="bold" /> Войти
        </span>
        <span className="mc-login__hint">Тот же ник и пароль, что на сайте</span>
      </span>
      <CursorIcon className="mc-win__cursor" weight="fill" />
    </span>
  );
}

function PlayScreen({servers, now}: {servers: ServerView[]; now: number}) {
  const first = servers[0];
  const status = first ? deriveStatus(first, first.status, now) : null;
  return (
    <span className="mc-win__body mc-win__body--play">
      <span className="mc-rail">
        <span className="mc-rail__btn mc-rail__btn--on">
          <HouseIcon size={18} weight="fill" />
        </span>
        <span className="mc-rail__btn">
          <CubeIcon size={18} weight="regular" />
        </span>
        <span className="mc-rail__btn">
          <NewspaperIcon size={18} weight="regular" />
        </span>
        <span className="mc-rail__btn">
          <GearSixIcon size={18} weight="regular" />
        </span>
        <span className="mc-rail__me">{SAMPLE_NICK[0]}</span>
      </span>
      <span className="mc-play">
        {first ? (
          <span className="mc-play__banner" style={{...sky(SKY[first.scene ?? 'survival']), ...accentStyle(first.accent)}}>
            <WorldPoster world={first.scene ?? 'survival'} className="mc-play__art" {...BANNER_ART} />
            <span className="mc-play__shade" />
            <span className="mc-play__info">
              <span className="mc-play__name">{first.name}</span>
              <span className="mc-play__pack">{packLine(first)}</span>
            </span>
            {status?.kind === 'online' && status.players != null ? (
              <span className="mc-play__online">
                <i />
                {status.players} онлайн
              </span>
            ) : null}
          </span>
        ) : null}
        <span className="mc-play__label">Выберите сервер</span>
        <span className="mc-play__servers">
          {servers.slice(0, 3).map((s, i) => (
            <span className={`mc-play__srv${i === 0 ? ' mc-play__srv--on' : ''}`} key={s.id} style={accentStyle(s.accent)}>
              <i />
              <span className="mc-play__srv-name">{s.name}</span>
              <span className="mc-play__srv-ver">{s.modpack?.mc_version ?? ''}</span>
            </span>
          ))}
        </span>
        <span className="mc-play__row">
          <span className="mc-play__sync">
            <span>
              <CheckIcon size={12} weight="bold" /> Сборка проверена
            </span>
            <span className="mc-play__syncbar">
              <i />
            </span>
          </span>
          <span className="mc-win__btn mc-win__btn--play">
            <PlayIcon size={16} weight="fill" /> Играть
          </span>
        </span>
      </span>
      <CursorIcon className="mc-win__cursor" weight="fill" />
    </span>
  );
}

/**
 * Окно приложения с четырьмя экранами пути: установка, регистрация на сайте, вход в лаунчер,
 * выбор сервера. Это схема, а не снимок настоящего лаунчера: подпись под окном говорит об этом прямо.
 */
export function LauncherMock({step, servers, now, settings}: {step: number; servers: ServerView[]; now: number; settings: SiteSettings}) {
  const launcher = settings.launcher_name || `Лаунчер ${settings.project_name}`;
  const version = servers[0]?.modpack?.mc_version;
  const titles = [`Установка — ${launcher}`, null, launcher, launcher];
  const statuses = ['Установка лаунчера', 'Сайт проекта — регистрация', 'Лаунчер ждёт входа', 'Лаунчер готов к игре'];
  return (
    <span className="mc-win mc-edge" aria-hidden="true">
      <span className="mc-win__bar">
        <span className="mc-win__app">
          <CubeIcon size={14} weight="fill" />
        </span>
        {titles[step] ? (
          <span className="mc-win__title">{titles[step]}</span>
        ) : (
          <span className="mc-win__url">
            <LockSimpleIcon size={12} weight="fill" />
            {window.location.host}/register
          </span>
        )}
        <span className="mc-win__ctl">
          <MinusIcon size={12} weight="bold" />
          <SquareIcon size={11} weight="bold" />
          <XIcon size={12} weight="bold" />
        </span>
      </span>
      {/* key перезапускает анимации экрана при смене шага */}
      {step === 0 ? <Installer key="s0" name={launcher} /> : null}
      {step === 1 ? <Registration key="s1" /> : null}
      {step === 2 ? <Login key="s2" projectName={settings.project_name} /> : null}
      {step === 3 ? <PlayScreen key="s3" servers={servers} now={now} /> : null}
      <span className="mc-win__status">
        <span>
          <i className={`mc-win__led${step === 3 ? ' mc-win__led--ok' : ''}`} />
          {statuses[step]}
        </span>
        {version && step >= 2 ? <span>Версия игры {version}</span> : null}
      </span>
    </span>
  );
}
