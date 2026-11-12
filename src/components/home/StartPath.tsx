import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {CheckIcon, CubeIcon, DownloadSimpleIcon, EnvelopeSimpleIcon, PlayIcon} from '@phosphor-icons/react';
import {deriveStatus} from '../../data/status';
import type {ServerView} from '../../data/types';
import {PANORAMA_SKY, SKY} from '../../scenes/worlds';
import {accentStyle} from '../ServerCard';
import {WorldPoster} from '../VoxelScene';

const STEPS = [
  {title: 'Скачайте лаунчер', text: 'Один файл. Игру, Java и моды он поставит сам.'},
  {title: 'Создайте аккаунт', text: 'Ник, почта, пароль — и подтверждение по письму.'},
  {title: 'Войдите в лаунчер', text: 'Тот же ник и пароль, что на сайте.'},
  {title: 'Выберите сервер', text: 'Лаунчер докачает сборку и подключит вас.'},
];
const CAPTIONS = ['Загрузка', 'Регистрация на сайте', 'Лаунчер', 'Лаунчер — серверы'];
const STEP_MS = 4200;
// Условный ник для макета: настоящих игроков здесь нет.
const SAMPLE_NICK = 'Block_Fox';
const sky = (c: [string, string, string]) => `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 55%, ${c[2]} 100%)`;

function Field({label, value}: {label: string; value: string}) {
  return (
    <span className="mc-mock__field">
      <span className="mc-mock__label">{label}</span>
      <span className="mc-mock__value">{value}</span>
    </span>
  );
}

function Screen({step, servers, now, projectName}: {step: number; servers: ServerView[]; now: number; projectName: string}) {
  if (step === 0) {
    return (
      <>
        <span className="mc-mock__hero">
          <span className="mc-mock__logo">
            <CubeIcon size={48} weight="fill" />
          </span>
          <span className="mc-mock__col">
            <span className="mc-mock__file">
              <DownloadSimpleIcon size={22} weight="bold" />
              launcher-setup
            </span>
            <span className="mc-mock__bar">
              <span className="mc-mock__bar-fill" />
            </span>
            <span className="mc-mock__chips">
              <span>Windows</span>
              <span>macOS</span>
              <span>Linux</span>
            </span>
          </span>
        </span>
        <span className="mc-mock__list">
          {['Игра нужной версии', 'Java', 'Моды сборки'].map(t => (
            <span key={t}>
              <CheckIcon size={18} weight="bold" />
              {t}
            </span>
          ))}
        </span>
      </>
    );
  }
  if (step === 1) {
    return (
      <span className="mc-mock__cols">
        <span className="mc-mock__col">
          <Field label="Ник в игре" value={SAMPLE_NICK} />
          <Field label="Почта" value="fox@example.org" />
          <Field label="Пароль" value="••••••••••••" />
          <span className="mc-mock__btn">Создать аккаунт</span>
        </span>
        <span className="mc-mock__aside">
          <EnvelopeSimpleIcon size={44} weight="fill" />
          Подтвердите почту по ссылке из письма
        </span>
      </span>
    );
  }
  if (step === 2) {
    return (
      <>
        <WorldPoster world="panorama" className="mc-mock__art" width={1000} height={450} shot={{angle: 0.18, lift: 0.14, fit: 1.04, drop: 0.12}} />
        <span className="mc-mock__panel">
          <span className="mc-mock__brand">
            <CubeIcon size={22} weight="fill" />
            {projectName}
          </span>
          <Field label="Ник" value={SAMPLE_NICK} />
          <Field label="Пароль" value="••••••••••••" />
          <span className="mc-mock__btn">
            <CheckIcon size={18} weight="bold" /> Войти
          </span>
        </span>
      </>
    );
  }
  const first = servers[0];
  return (
    <>
      {first ? (
        <WorldPoster world={first.scene ?? 'survival'} className="mc-mock__art mc-mock__art--solo" width={700} height={700} shot={{angle: 0.6, fit: 1.1}} />
      ) : null}
      <span className="mc-mock__panel">
        {servers.slice(0, 3).map((s, i) => {
          const st = deriveStatus(s, s.status, now);
          return (
            <span className={`mc-mock__server${i === 0 ? ' mc-mock__server--on' : ''}`} key={s.id} style={accentStyle(s.accent)}>
              <span className="mc-mock__dot" />
              <span className="mc-mock__sname">{s.name}</span>
              <span className="mc-mock__sinfo">{st.kind === 'online' && st.players != null ? `${st.players} онлайн` : (s.modpack?.mc_version ?? '')}</span>
            </span>
          );
        })}
        <span className="mc-mock__btn">
          <PlayIcon size={18} weight="fill" /> Играть
        </span>
      </span>
    </>
  );
}

/**
 * Путь из четырёх шагов с макетом экрана. Шаги листаются сами, пока блок на экране;
 * наведение, фокус и reduced motion останавливают автолистание.
 * Макет — схема: в нём нет настоящего лаунчера и настоящих игроков.
 */
export function StartPath({servers, now, projectName}: {servers: ServerView[]; now: number; projectName: string}) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(e => setVisible(e.some(x => x.isIntersecting)), {threshold: 0.35});
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = auto && visible && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setStep(s => (s + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(id);
  }, [running, step]);

  const first = servers[0];
  const bodyStyle: CSSProperties | undefined =
    step === 2 ? {background: sky(PANORAMA_SKY)} : step === 3 && first ? {background: sky(SKY[first.scene ?? 'survival'])} : undefined;

  return (
    <div
      className="mc-start"
      ref={ref}
      onPointerEnter={() => setAuto(false)}
      onPointerLeave={() => setAuto(true)}
      onFocusCapture={() => setAuto(false)}
      onBlurCapture={() => setAuto(true)}>
      <ol className="mc-start__steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              className={`mc-start__step${i === step ? ' mc-start__step--on' : ''}${running && i === step ? ' mc-start__step--run' : ''}`}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => setStep(i)}>
              <span className="mc-start__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="mc-start__copy">
                <span className="mc-start__title">{s.title}</span>
                <span className="mc-start__text">{s.text}</span>
              </span>
              <span className="mc-start__progress" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <span className="mc-start__stage">
        <span className="mc-start__ghost" aria-hidden="true" key={`g${step}`}>
          {String(step + 1).padStart(2, '0')}
        </span>
        <figure className="mc-mock">
          <span className="mc-mock__chrome" aria-hidden="true">
            <span className="mc-mock__lights">
              <i />
              <i />
              <i />
            </span>
            <span className="mc-mock__caption">{CAPTIONS[step]}</span>
          </span>
          <span className={`mc-mock__body mc-mock__body--s${step + 1}`} key={step} style={bodyStyle} aria-hidden="true">
            <Screen step={step} servers={servers} now={now} projectName={projectName} />
          </span>
          <figcaption className="mc-mock__note">Схема шагов. Экран вашего лаунчера может выглядеть иначе.</figcaption>
        </figure>
      </span>
    </div>
  );
}
