import {useEffect, useRef, useState} from 'react';
import {CheckIcon, DownloadSimpleIcon, PlayIcon} from '@phosphor-icons/react';
import {deriveStatus} from '../../data/status';
import type {ServerView} from '../../data/types';
import {accentStyle} from '../ServerCard';

const STEPS = [
  {title: 'Скачайте лаунчер', text: 'Один файл. Игру, Java и моды он поставит сам.'},
  {title: 'Создайте аккаунт', text: 'Ник, почта, пароль — и подтверждение по письму.'},
  {title: 'Войдите в лаунчер', text: 'Тот же ник и пароль, что на сайте.'},
  {title: 'Выберите сервер', text: 'Лаунчер докачает сборку и подключит вас.'},
];
const STEP_MS = 4200;

function Field({label, value}: {label: string; value: string}) {
  return (
    <span className="mc-mock__field">
      <span className="mc-mock__label">{label}</span>
      <span className="mc-mock__value">{value}</span>
    </span>
  );
}

function Screen({step, servers, now}: {step: number; servers: ServerView[]; now: number}) {
  if (step === 0) {
    return (
      <>
        <span className="mc-mock__file">
          <DownloadSimpleIcon size={22} weight="bold" aria-hidden="true" />
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
      </>
    );
  }
  if (step === 1) {
    return (
      <>
        <Field label="Ник в игре" value="Steve_2026" />
        <Field label="Почта" value="steve@example.org" />
        <Field label="Пароль" value="••••••••••••" />
        <span className="mc-mock__btn">Создать аккаунт</span>
      </>
    );
  }
  if (step === 2) {
    return (
      <>
        <Field label="Ник" value="Steve_2026" />
        <Field label="Пароль" value="••••••••••••" />
        <span className="mc-mock__btn">
          <CheckIcon size={18} weight="bold" aria-hidden="true" /> Войти
        </span>
      </>
    );
  }
  return (
    <>
      {servers.slice(0, 3).map((s, i) => {
        const st = deriveStatus(s, s.status, now);
        return (
          <span className={`mc-mock__server${i === 0 ? ' mc-mock__server--on' : ''}`} key={s.id} style={accentStyle(s.accent)}>
            <span className="mc-mock__dot" />
            <span className="mc-mock__sname">{s.name}</span>
            <span className="mc-mock__sinfo">{st.kind === 'online' && st.players != null ? `${st.players} онлайн` : s.modpack?.mc_version ?? ''}</span>
          </span>
        );
      })}
      <span className="mc-mock__btn">
        <PlayIcon size={18} weight="fill" aria-hidden="true" /> Играть
      </span>
    </>
  );
}

/**
 * Путь из четырёх шагов с макетом экрана. Шаги листаются сами, пока блок на экране;
 * наведение, фокус и reduced motion останавливают автолистание.
 */
export function StartPath({servers, now}: {servers: ServerView[]; now: number}) {
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
      <figure className="mc-mock">
        <span className="mc-mock__chrome" aria-hidden="true">
          <span className="mc-mock__lights">
            <i />
            <i />
            <i />
          </span>
          <span className="mc-mock__caption">{['Загрузка', 'Регистрация на сайте', 'Лаунчер', 'Лаунчер — серверы'][step]}</span>
        </span>
        <span className="mc-mock__body" key={step} aria-hidden="true">
          <Screen step={step} servers={servers} now={now} />
        </span>
        <figcaption className="mc-mock__note">Схема шагов. Экран вашего лаунчера может выглядеть иначе.</figcaption>
      </figure>
    </div>
  );
}
