import {useId, type ReactNode} from 'react';
import type {Icon} from '@phosphor-icons/react';
import {BlurFade} from '@/components/ui/blur-fade';
import {WorldPoster} from '../VoxelScene';

/** Подпись секции: значок в золотом кружке, номер и название. */
export function SectionLabel({icon: IconC, index, children}: {icon: Icon; index?: string; children: ReactNode}) {
  return (
    <span className="mc-label">
      <span className="mc-label__icon">
        <IconC size={14} weight="fill" aria-hidden="true" />
      </span>
      {index ? <span className="mc-label__num">{index}</span> : null}
      {children}
    </span>
  );
}

/** Шапка секции: подпись, заголовок из двух частей (вторая — золотом), пояснение и действие справа. */
export function SectionHead({
  icon, index, label, title, gold, lead, action, center = false,
}: {
  icon: Icon;
  index?: string;
  label: string;
  title: string;
  gold?: string;
  lead?: ReactNode;
  action?: ReactNode;
  center?: boolean;
}) {
  return (
    <BlurFade inView direction="up" offset={16}>
      <header className={`mc-head${center ? ' mc-head--center' : ''}`}>
        <span className="mc-head__copy">
          <SectionLabel icon={icon} index={index}>
            {label}
          </SectionLabel>
          <h2 className="mc-title">
            {title}
            {gold ? (
              <>
                {' '}
                <em className="mc-gold-text">{gold}</em>
              </>
            ) : null}
          </h2>
          {lead ? <p className="mc-lead">{lead}</p> : null}
        </span>
        {action}
      </header>
    </BlurFade>
  );
}

const ARCS = {
  a: ['M-120 640 C 260 250 820 130 1560 390', 'M-120 790 C 420 440 980 380 1560 640'],
  b: ['M-120 170 C 380 520 980 560 1560 230', 'M-120 40 C 300 300 1100 380 1560 110'],
  c: ['M-120 430 C 360 90 1080 730 1560 350', 'M-120 620 C 420 300 900 820 1560 560'],
} as const;

/**
 * Световые дуги на фоне секции: размытая полоса света и тонкая линия, по которой медленно
 * проходит блик. Декор: не перехватывает указатель и скрыт от вспомогательных технологий.
 */
export function LightArcs({variant = 'a', tone = 'gold'}: {variant?: keyof typeof ARCS; tone?: 'gold' | 'violet' | 'cyan'}) {
  const id = useId().replace(/:/g, '');
  const tint = tone === 'violet' ? 'var(--mc-accent-magic)' : tone === 'cyan' ? 'var(--mc-accent-techno)' : 'var(--mc-cta-top)';
  return (
    <svg className={`mc-arcs mc-arcs--${variant}`} viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{stopColor: tint, stopOpacity: 0}} />
          <stop offset="0.45" style={{stopColor: tint, stopOpacity: 1}} />
          <stop offset="1" style={{stopColor: 'var(--mc-accent-magic)', stopOpacity: 0}} />
        </linearGradient>
        <filter id={`b${id}`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      {ARCS[variant].map((d, i) => (
        <g key={d} fill="none" stroke={`url(#g${id})`} strokeLinecap="round">
          <path d={d} strokeWidth={i === 0 ? 14 : 8} filter={`url(#b${id})`} opacity={i === 0 ? 0.5 : 0.28} />
          <path d={d} strokeWidth="1.25" opacity={i === 0 ? 0.55 : 0.3} />
          {i === 0 ? <path className="mc-arcs__run" d={d} strokeWidth="2.5" pathLength={1000} /> : null}
        </g>
      ))}
    </svg>
  );
}

/** Размытая листва на переднем плане: добавляет блоку глубину. */
export function Foliage({seed, side}: {seed: number; side: 'tl' | 'tr' | 'bl' | 'br'}) {
  return <WorldPoster world={`foliage:${seed}`} className={`mc-foliage mc-foliage--${side}`} width={480} height={480} shot={{angle: 0.4, lift: 0.1, fit: 1}} />;
}
