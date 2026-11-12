// Edge Function: очередь выдачи покупок и подтверждение оплаты пополнений.
//
// Маршруты (JSON):
//   POST /shop/claim    {serverId, limit?}        → {tasks: [{id, orderId, playerUuid, payload}]}   (заголовок x-server-key)
//   POST /shop/confirm  {taskId, ok, error?}      → 204                                             (заголовок x-server-key)
//   POST /shop/payment  тело webhook провайдера   → {credited: boolean}                             (подпись провайдера)
//
// Очередь. Игровой сервер (плагин или мод) раз в несколько секунд забирает свои задания, выдаёт покупку игроку
// по playerUuid и подтверждает результат. Задание, взятое и не подтверждённое за 5 минут, выдаётся снова,
// поэтому обработчик на игровой стороне обязан запоминать id выполненных заданий и не выдавать дважды.
// Пока сервер выключен, задания ждут в очереди и не теряются. См. docs/game-side.md.
//
// Оплата. Баланс зачисляет только этот обработчик и только после проверки подписи. Проверка подписи ниже —
// ШАБЛОН (HMAC-SHA256 от тела запроса с общим секретом в заголовке x-signature): у каждого провайдера своя
// схема подписи и свой формат тела. Замените verifySignature и parsePayment по документации выбранного
// провайдера. Со сквозной оплатой эта функция не проверялась: провайдер не выбран.
//
// Секреты (supabase secrets set): SUPABASE_SERVICE_ROLE_KEY, GAME_SERVER_KEY, PAYMENT_WEBHOOK_SECRET.
// Во frontend они не попадают.
import {createClient} from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth: {persistSession: false}});
const GAME_SERVER_KEY = Deno.env.get('GAME_SERVER_KEY') ?? '';
const PAYMENT_WEBHOOK_SECRET = Deno.env.get('PAYMENT_WEBHOOK_SECRET') ?? '';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json; charset=utf-8'}});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Запросы очереди принимаются только с ключом игрового сервера. Пустой ключ в настройках — отказ всем. */
function fromGameServer(req: Request): boolean {
  const key = req.headers.get('x-server-key') ?? '';
  return GAME_SERVER_KEY.length >= 16 && timingSafeEqual(key, GAME_SERVER_KEY);
}

async function claim(req: Request): Promise<Response> {
  if (!fromGameServer(req)) return json(401, {error: 'unauthorized'});
  const {serverId, limit} = await req.json().catch(() => ({}));
  if (typeof serverId !== 'string' || !UUID_RE.test(serverId)) return json(400, {error: 'invalid_request'});
  const r = await admin.rpc('claim_deliveries', {p_server: serverId, p_limit: Number.isInteger(limit) ? limit : 20});
  if (r.error) return json(500, {error: 'queue_unavailable'});
  // Игровому серверу отдаётся только нужное для выдачи: без почты и других данных игрока.
  const tasks = (r.data ?? []).map((t: {id: string; order_id: string; player_uuid: string; payload: unknown}) => ({
    id: t.id, orderId: t.order_id, playerUuid: t.player_uuid, payload: t.payload,
  }));
  return json(200, {tasks});
}

async function confirm(req: Request): Promise<Response> {
  if (!fromGameServer(req)) return json(401, {error: 'unauthorized'});
  const {taskId, ok, error} = await req.json().catch(() => ({}));
  if (typeof taskId !== 'string' || !UUID_RE.test(taskId) || typeof ok !== 'boolean') return json(400, {error: 'invalid_request'});
  const r = await admin.rpc('confirm_delivery', {p_task: taskId, p_ok: ok, p_error: typeof error === 'string' ? error : null});
  if (r.error) return json(r.error.message.includes('task_not_found') ? 404 : 500, {error: 'confirm_failed'});
  return new Response(null, {status: 204});
}

// ---- ШАБЛОН: замените под выбранного провайдера ----
async function verifySignature(raw: string, signature: string): Promise<boolean> {
  if (PAYMENT_WEBHOOK_SECRET.length < 16 || !signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(PAYMENT_WEBHOOK_SECRET), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(expected, signature.toLowerCase());
}
/** Что нужно достать из тела webhook: наш номер пополнения, id платежа у провайдера, сумму и признак успеха. */
function parsePayment(body: Record<string, unknown>) {
  return {
    paymentId: String(body.order_id ?? ''),
    providerPaymentId: String(body.payment_id ?? ''),
    amount: Number(body.amount),
    paid: body.status === 'paid',
  };
}
// ---- конец шаблона ----

async function payment(req: Request): Promise<Response> {
  const raw = await req.text();
  if (!(await verifySignature(raw, req.headers.get('x-signature') ?? ''))) return json(401, {error: 'bad_signature'});
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, {error: 'invalid_request'});
  }
  const p = parsePayment(body);
  if (!UUID_RE.test(p.paymentId) || !p.providerPaymentId || !Number.isInteger(p.amount)) return json(400, {error: 'invalid_request'});
  // Событие «не оплачено» ничего не меняет: запись остаётся в ожидании.
  if (!p.paid) return json(200, {credited: false});
  // Повторный webhook безопасен: функция БД зачисляет платёж один раз и сверяет сумму со своей записью.
  const r = await admin.rpc('confirm_payment', {
    p_payment: p.paymentId, p_provider: 'provider', p_provider_payment_id: p.providerPaymentId, p_amount: p.amount,
  });
  if (r.error) return json(r.error.message.includes('payment_') ? 409 : 500, {error: 'payment_rejected'});
  return json(200, {credited: r.data === true});
}

Deno.serve(async req => {
  if (req.method !== 'POST') return json(405, {error: 'method_not_allowed'});
  const route = new URL(req.url).pathname.split('/').pop();
  try {
    if (route === 'claim') return await claim(req);
    if (route === 'confirm') return await confirm(req);
    if (route === 'payment') return await payment(req);
    return json(404, {error: 'not_found'});
  } catch {
    return json(500, {error: 'internal'});
  }
});
