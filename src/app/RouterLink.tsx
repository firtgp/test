import type {AnchorHTMLAttributes, Ref} from 'react';
import {Link} from 'react-router';

/** Ссылка для Astryx LinkProvider: внутренние адреса открывает роутер, внешние — обычный <a>. */
export function RouterLink({
  href = '', ref, children, ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {ref?: Ref<HTMLAnchorElement>}) {
  const internal = href.startsWith('/') && !href.startsWith('//');
  if (!internal) {
    const external = /^https?:/.test(href);
    return (
      <a ref={ref} href={href} {...(external ? {target: '_blank', rel: 'noopener noreferrer'} : {})} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link ref={ref} to={href} {...rest}>
      {children}
    </Link>
  );
}
