// Edge Function: авторизация лаунчера и проверка входа игровым сервером.
//
// Маршруты (JSON):
//   POST /launcher-auth/authorize  {login, password}              → {uuid, username, accessToken, expiresAt}
//   POST /launcher-auth/join       {accessToken, uuid, serverId}  → 204
//   POST /launcher-auth/has-joined {username, serverId, server?}  → {uuid, username}   (заголовок x-server-key)
//
// Это общая форма «логин → токен → join → hasJoined». Как подключить её к конкретному лаунчеру
// (названия провайдеров, ключи конфига, формат ответа), смотрите в документации УСТАНОВЛЕННОЙ версии
// лаунчера и при необходимости адаптируйте имена полей здесь. См. docs/game-side.md.
//
// Секреты (supabase secrets set): SUPABASE_SERVICE_ROLE_KEY, GAME_SERVER_KEY. Во frontend они не попадают.
import {createClient} from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GAME_SERVER_KEY = Deno.env.get('GAME_SERVER_KEY') ?? '';
const SESSION_TTL = '24 hours';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {auth: {persistSession: false}});
const NICK_RE = /^[A-Za-z0-9_]{3,16}$/;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json; charset=utf-8'}});

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return '\\x' + [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function authorize(req: Request): Promise<Response> {
  const {login, password} = await req.json().catch(() => ({}));
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (typeof login !== 'string' || typeof password !== 'string' || !NICK_RE.test(login) || password.length > 72) {
    return json(400, {error: 'invalid_request'});
  }
  const allowed = await admin.rpc('launcher_login_allowed', {p_nick: login, p_ip: ip});
  if (allowed.error) return json(500, {error: 'server_error'});
  if (!allowed.data) return json(429, {error: 'rate_limited'});

  // Один и тот же ответ для «нет такого ника» и «неверный пароль»: ники не перебираются.
  const fail = async () => {
    await admin.rpc('launcher_record_attempt', {p_nick: login, p_ip: ip, p_success: false});
    return json(401, {error: 'invalid_credentials'});
  };
  const found = await admin.rpc('launcher_user_by_nick', {p_nick: login});
  const user = found.data?.[0];
  if (!user?.email) return fail();

  // Пароль проверяет Supabase Auth (bcrypt). Неподтверждённая почта вход не получает.
  const anon = createClient(SUPABASE_URL, ANON_KEY, {auth: {persistSession: false}});
  const signIn = await anon.auth.signInWithPassword({email: user.email, password});
  if (signIn.error || !signIn.data.session) {
    if (signIn.error?.code === 'email_not_confirmed') return json(403, {error: 'email_not_confirmed'});
    return fail();
  }
  // Сайтовая сессия лаунчеру не нужна — сразу закрываем её.
  await admin.auth.admin.signOut(signIn.data.session.access_token, 'local').catch(() => {});

  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const created = await admin.rpc('launcher_create_session', {
    p_user: user.user_id,
    p_token_hash: await sha256(token),
    p_ttl: SESSION_TTL,
    p_label: (req.headers.get('user-agent') ?? 'Лаунчер').slice(0, 80),
  });
  if (created.error) {
    if (created.error.message.includes('banned')) return json(403, {error: 'banned'});
    return json(500, {error: 'server_error'});
  }
  await admin.rpc('launcher_record_attempt', {p_nick: login, p_ip: ip, p_success: true});
  const s = created.data[0];
  // Возвращаем только нужное лаунчеру: без почты и без внутренних id.
  return json(200, {uuid: s.mc_uuid, username: s.nick, accessToken: token, expiresAt: s.expires_at});
}

async function join(req: Request): Promise<Response> {
  const {accessToken, uuid, serverId} = await req.json().catch(() => ({}));
  if (typeof accessToken !== 'string' || typeof uuid !== 'string' || typeof serverId !== 'string') {
    return json(400, {error: 'invalid_request'});
  }
  const r = await admin.rpc('launcher_join', {
    p_token_hash: await sha256(accessToken), p_mc_uuid: uuid, p_server_hash: serverId,
  });
  if (r.error) return json(500, {error: 'server_error'});
  return r.data ? new Response(null, {status: 204}) : json(403, {error: 'invalid_session'});
}

async function hasJoined(req: Request): Promise<Response> {
  // Этот маршрут вызывает только игровой сервер, со своим ключом.
  const key = req.headers.get('x-server-key') ?? '';
  if (!GAME_SERVER_KEY || !timingSafeEqual(key, GAME_SERVER_KEY)) return json(401, {error: 'unauthorized'});
  const {username, serverId, server} = await req.json().catch(() => ({}));
  if (typeof username !== 'string' || typeof serverId !== 'string' || !NICK_RE.test(username)) {
    return json(400, {error: 'invalid_request'});
  }
  const r = await admin.rpc('launcher_has_joined', {
    p_nick: username, p_server_hash: serverId, p_server: typeof server === 'string' ? server : null,
  });
  if (r.error) return json(500, {error: 'server_error'});
  const row = r.data?.[0];
  return row ? json(200, {uuid: row.mc_uuid, username: row.nick}) : json(403, {error: 'not_joined'});
}

Deno.serve(async req => {
  if (req.method !== 'POST') return json(405, {error: 'method_not_allowed'});
  const path = new URL(req.url).pathname.replace(/\/+$/, '');
  try {
    if (path.endsWith('/authorize')) return await authorize(req);
    if (path.endsWith('/join')) return await join(req);
    if (path.endsWith('/has-joined')) return await hasJoined(req);
    return json(404, {error: 'not_found'});
  } catch {
    return json(500, {error: 'server_error'});
  }
});
