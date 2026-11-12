// Генерирует supabase/seed.sql из src/data/seed.ts. Seed идемпотентен:
// повторный запуск не затирает изменения, сделанные в админке (on conflict do nothing).
import {writeFileSync} from 'node:fs';
import {
  SETTINGS_KEY, seedMods, seedModpacks, seedNews, seedRules, seedServers, seedSettings,
} from '../src/data/seed';
import {seedProducts} from '../src/data/shopSeed';

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.length ? `array[${v.map(q).join(', ')}]::text[]` : `'{}'::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

function insert(table: string, rows: object[], conflict: string): string {
  return rows
    .map(row => {
      const r = row as Record<string, unknown>;
      const cols = Object.keys(r);
      return `insert into public.${table} (${cols.join(', ')})\nvalues (${cols.map(c => q(r[c])).join(', ')})\non conflict (${conflict}) do nothing;`;
    })
    .join('\n');
}

const sql = [
  '-- СГЕНЕРИРОВАНО: pnpm seed:gen. Содержимое-пример; замените его в админке перед запуском.',
  '-- Повторное применение не затирает живые изменения.',
  `insert into public.site_settings (key, value)\nvalues (${q(SETTINGS_KEY)}, ${q(JSON.stringify(seedSettings))}::jsonb)\non conflict (key) do nothing;`,
  insert('modpacks', seedModpacks, 'id'),
  insert('mods', seedMods, 'id'),
  insert('servers', seedServers, 'id'),
  insert('news', seedNews, 'id'),
  insert('rules_versions', [seedRules], 'id'),
  '-- Каталог-пример: названия, цены и бонусы условные. Перед включением оплаты сверьте товары с правилами Mojang.',
  insert('products', seedProducts, 'id'),
  '',
].join('\n\n');

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log('supabase/seed.sql written');
