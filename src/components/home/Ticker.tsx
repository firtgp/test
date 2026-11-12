import {CubeIcon} from '@phosphor-icons/react';
import {Marquee} from '@/components/ui/marquee';

/**
 * Две наклонные ленты с названиями модов из сборок (Magic UI Marquee): золотая поверх стеклянной.
 * Декоративны: сами списки модов есть в блоке серверов и на страницах серверов.
 */
export function Ticker({items}: {items: string[]}) {
  if (items.length < 3) return null;
  const half = Math.ceil(items.length / 2);
  const rows = [items.slice(0, half), items.slice(half).length >= 2 ? items.slice(half) : items];
  const band = (list: string[]) =>
    list.map(m => (
      <span className="mc-ticker__item" key={m}>
        {m}
        <CubeIcon size={16} weight="fill" />
      </span>
    ));
  return (
    <section className="mc-ticker" aria-hidden="true">
      <Marquee className="mc-ticker__band mc-ticker__band--back" reverse repeat={6} style={{['--duration' as string]: '52s', ['--gap' as string]: '2rem'}}>
        {band(rows[1])}
      </Marquee>
      <Marquee className="mc-ticker__band mc-ticker__band--front" repeat={6} style={{['--duration' as string]: '40s', ['--gap' as string]: '2rem'}}>
        {band(rows[0])}
      </Marquee>
    </section>
  );
}
