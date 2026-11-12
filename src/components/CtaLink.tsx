import type {ReactNode} from 'react';
import {Link} from 'react-router';
import {ArrowRightIcon} from '@phosphor-icons/react';

/** Главное действие сайта. Ведёт по пути «лаунчер → аккаунт → вход → сервер». */
export function CtaLink({
  to, children, size = 'lg', icon = true,
}: {to: string; children: ReactNode; size?: 'md' | 'lg'; icon?: boolean}) {
  return (
    <Link to={to} className={`mc-cta${size === 'md' ? ' mc-cta--md' : ''}`}>
      {children}
      {icon ? <ArrowRightIcon size={20} weight="bold" aria-hidden="true" /> : null}
    </Link>
  );
}

export function startPath(serverSlug?: string | null) {
  return serverSlug ? `/start?server=${encodeURIComponent(serverSlug)}` : '/start';
}
