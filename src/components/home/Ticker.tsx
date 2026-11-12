import {Marquee} from '@/components/ui/marquee';

/** Бегущие строки с названиями модов из сборок (Magic UI Marquee). Декоративны: сами списки есть ниже. */
export function Ticker({items}: {items: string[]}) {
  if (items.length < 3) return null;
  const half = Math.ceil(items.length / 2);
  const rows = [items.slice(0, half), items.slice(half).length >= 2 ? items.slice(half) : items];
  return (
    <section className="mc-ticker" aria-hidden="true">
      <Marquee className="mc-ticker__row mc-ticker__row--solid" pauseOnHover repeat={6} style={{['--duration' as string]: '38s', ['--gap' as string]: '2.5rem'}}>
        {rows[0].map(m => (
          <span className="mc-ticker__item" key={m}>
            {m}
            <span className="mc-ticker__sep" />
          </span>
        ))}
      </Marquee>
      <Marquee className="mc-ticker__row mc-ticker__row--outline" reverse pauseOnHover repeat={6} style={{['--duration' as string]: '46s', ['--gap' as string]: '2.5rem'}}>
        {rows[1].map(m => (
          <span className="mc-ticker__item" key={m}>
            {m}
            <span className="mc-ticker__sep" />
          </span>
        ))}
      </Marquee>
    </section>
  );
}
