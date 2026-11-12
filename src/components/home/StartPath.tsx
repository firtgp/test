import {useEffect, useRef, useState} from 'react';
import {DownloadSimpleIcon, KeyIcon, PlayIcon, UserPlusIcon} from '@phosphor-icons/react';
import type {ServerView, SiteSettings} from '../../data/types';
import {WorldPoster, preloadPoster} from '../VoxelScene';
import {BANNER_ART, LOGIN_ART, LauncherMock} from './LauncherMock';

const STEPS = [
  {icon: DownloadSimpleIcon, title: 'Скачайте лаунчер', text: 'Один файл. Игру, Java и моды он поставит сам.'},
  {icon: UserPlusIcon, title: 'Создайте аккаунт', text: 'Ник, почта, пароль — и подтверждение по письму.'},
  {icon: KeyIcon, title: 'Войдите в лаунчер', text: 'Тот же ник и пароль, что на сайте.'},
  {icon: PlayIcon, title: 'Выберите сервер', text: 'Лаунчер докачает сборку и подключит вас.'},
];
const STEP_MS = 5200;

/**
 * Путь из четырёх шагов и окно с экраном текущего шага. Шаги листаются сами, пока блок на экране;
 * наведение, фокус и reduced motion останавливают автолистание.
 */
export function StartPath({servers, now, settings}: {servers: ServerView[]; now: number; settings: SiteSettings}) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(e => setVisible(e.some(x => x.isIntersecting)), {threshold: 0.35});
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Картинки третьего и четвёртого экранов готовятся, как только блок показался.
  const firstScene = servers[0]?.scene ?? 'survival';
  useEffect(() => {
    if (!visible) return;
    preloadPoster('panorama', LOGIN_ART.width, LOGIN_ART.height, LOGIN_ART.shot);
    preloadPoster(firstScene, BANNER_ART.width, BANNER_ART.height, BANNER_ART.shot);
  }, [visible, firstScene]);

  const running = auto && visible && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setStep(s => (s + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(id);
  }, [running, step]);

  return (
    <span
      className="mc-start"
      ref={ref}
      onPointerEnter={e => e.pointerType === 'mouse' && setAuto(false)}
      onPointerLeave={() => setAuto(true)}
      onFocusCapture={() => setAuto(false)}
      onBlurCapture={() => setAuto(true)}>
      <ol className="mc-steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              className={`mc-step${i === step ? ' mc-step--on' : ''}${running && i === step ? ' mc-step--run' : ''}`}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => setStep(i)}>
              <span className="mc-step__icon">
                <s.icon size={22} weight="fill" aria-hidden="true" />
              </span>
              <span className="mc-step__copy">
                <span className="mc-step__title">{s.title}</span>
                <span className="mc-step__text">{s.text}</span>
              </span>
              <span className="mc-step__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="mc-step__progress" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <figure className="mc-stage">
        <span className="mc-stage__glow" aria-hidden="true" />
        <WorldPoster world="ledge" className="mc-stage__ledge mc-float mc-float--slow" width={900} height={520} shot={{angle: 0.35, lift: 0.2, fit: 1}} />
        <LauncherMock step={step} servers={servers} now={now} settings={settings} />
        <figcaption className="mc-stage__note">Схема шагов. Экран вашего лаунчера может выглядеть иначе.</figcaption>
      </figure>
    </span>
  );
}
