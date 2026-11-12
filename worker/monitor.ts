// Воркер мониторинга: раз в минуту опрашивает опубликованные серверы и пишет снимки в БД.
// Сайт читает только снимки. Запуск: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm worker:monitor
// Service-ключ живёт только здесь, на сервере. Во frontend он не попадает.
import {createClient} from '@supabase/supabase-js';
import {pingServer, type SlpResult} from './slp';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const intervalMs = Number(process.env.MONITOR_INTERVAL_MS ?? 60_000);
const timeoutMs = Number(process.env.MONITOR_TIMEOUT_MS ?? 5_000);

if (!url || !key) {
  console.error('Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(url, key, {auth: {persistSession: false}});

export async function tick(ping: (h: string, p: number, t: number) => Promise<SlpResult> = pingServer) {
  const {data: servers, error} = await db.from('servers').select('id, host, port').eq('published', true);
  if (error) throw error;
  await Promise.all(
    (servers ?? []).map(async s => {
      const r = await ping(s.host, s.port, timeoutMs);
      const {error: e} = await db.rpc('record_server_status', {
        p_server: s.id,
        p_online: r.online,
        p_players_online: r.playersOnline,
        p_players_max: r.playersMax,
        p_latency_ms: r.latencyMs,
        p_version_name: r.versionName,
        p_error: r.error,
      });
      if (e) console.error(`[monitor] ${s.host}:${s.port} запись не удалась: ${e.message}`);
    }),
  );
}

async function loop() {
  for (;;) {
    const started = Date.now();
    try {
      await tick();
    } catch (e) {
      // Сбой опроса не превращается в «офлайн»: снимок просто устареет, и сайт это покажет.
      console.error('[monitor] цикл не выполнен:', (e as Error).message);
    }
    await new Promise(r => setTimeout(r, Math.max(1000, intervalMs - (Date.now() - started))));
  }
}

loop();
