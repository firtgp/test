-- Кабинет игрока: образ персонажа, внутренняя валюта, каталог, заказы, очередь выдачи, ранги.
--
-- Главные гарантии:
--   * цена, товар и сервер выдачи берутся из каталога, запросу из браузера не доверяем;
--   * баланс меняют только функции этого файла; напрямую таблицы кошелька не пишутся (нет прав и политик);
--   * покупка идемпотентна по ключу: повтор запроса возвращает прежний заказ и ничего не списывает;
--   * пополнение зачисляется один раз на платёж провайдера (вызывает только серверный обработчик webhook);
--   * выдача идёт через очередь: задание ждёт, пока игровой сервер его не подтвердит.

-- ---------------------------------------------------------------- образ персонажа
alter table public.profiles
  add column avatar_style text not null default 'wanderer'
  check (avatar_style in ('wanderer', 'engineer', 'mage', 'farmer'));

create function public.set_avatar_style(p_style text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  update public.profiles set avatar_style = p_style where id = auth.uid();
end $$;

-- ---------------------------------------------------------------- каталог
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  kind text not null check (kind in ('item', 'privilege')),
  title text not null check (length(title) between 1 and 80),
  description text not null default '' check (length(description) <= 400),
  -- Цена во внутренней валюте.
  price integer not null check (price between 1 and 1000000),
  -- Для предмета — сервер выдачи; null — покупатель выбирает сам. Ранг действует на всех серверах.
  server_id uuid references public.servers (id) on delete set null,
  mod_name text not null default '',
  icon text not null default 'chest',
  tier integer not null default 0 check (tier between 0 and 3),
  duration_days integer check (duration_days between 1 and 3650),
  perks text[] not null default '{}',
  -- Отметка проверки по правилам Mojang: ставит владелец после сверки с действующим текстом.
  compliance text not null default 'unchecked' check (compliance in ('cosmetic', 'gameplay', 'unchecked')),
  sort integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'privilege' or (tier between 1 and 3 and server_id is null and duration_days is not null)),
  check (kind <> 'item' or tier = 0)
);
create trigger touch_products before update on public.products
  for each row execute function public.touch_updated_at();
create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_content();

-- ---------------------------------------------------------------- кошелёк
create table public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0)
);

create type public.order_status as enum ('paid', 'delivering', 'delivered', 'failed', 'refunded');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  product_id uuid references public.products (id) on delete set null,
  -- Название, вид и цена фиксируются в заказе: правка каталога не меняет историю.
  title text not null,
  kind text not null,
  icon text not null,
  server_id uuid references public.servers (id) on delete set null,
  price integer not null check (price > 0),
  status public.order_status not null default 'paid',
  idempotency_key text not null check (length(idempotency_key) between 8 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index orders_user_idx on public.orders (user_id, created_at desc);

-- Пополнение: запись создаётся в ожидании оплаты, зачисляет её только обработчик webhook провайдера.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  amount integer not null check (amount between 1 and 1000000),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  provider text,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  -- Один платёж провайдера зачисляется один раз.
  unique (provider, provider_payment_id)
);

create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('topup', 'purchase', 'refund', 'grant')),
  title text not null,
  balance_after integer not null check (balance_after >= 0),
  order_id uuid references public.orders (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  created_at timestamptz not null default now()
);
create index wallet_ledger_user_idx on public.wallet_ledger (user_id, created_at desc);

create table public.privileges (
  user_id uuid primary key references auth.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  title text not null,
  tier integer not null check (tier between 1 and 3),
  expires_at timestamptz not null
);

-- Очередь выдачи (outbox). Одно задание — один заказ на одном сервере; ранг даёт по заданию на сервер.
create table public.delivery_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  server_id uuid not null references public.servers (id) on delete cascade,
  player_uuid uuid not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'done', 'failed', 'cancelled')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  done_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (order_id, server_id)
);
create index delivery_tasks_queue_idx on public.delivery_tasks (server_id, status, created_at);

-- ---------------------------------------------------------------- покупка
create function public.purchase(p_product uuid, p_server uuid, p_key text)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prod public.products;
  v_prior public.orders;
  v_order public.orders;
  v_priv public.privileges;
  v_target uuid;
  v_balance integer;
  v_player uuid;
  v_payload jsonb;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_key is null or length(p_key) not between 8 and 80 then
    raise exception 'idempotency_conflict' using errcode = '22023';
  end if;

  -- Кошелёк блокируется первым: параллельные покупки одного игрока идут строго по очереди.
  insert into public.wallets (user_id) values (v_user) on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets where user_id = v_user for update;

  select * into v_prod from public.products where id = p_product;
  -- Сервер выдачи определяет каталог; выбор покупателя учитывается, только если каталог его допускает.
  if v_prod.kind = 'item' then
    v_target := coalesce(v_prod.server_id, p_server);
  end if;

  -- Повтор запроса с тем же ключом возвращает прежний заказ; тот же ключ с иным содержимым — отказ.
  select * into v_prior from public.orders where user_id = v_user and idempotency_key = p_key;
  if found then
    if v_prior.product_id is distinct from p_product or v_prior.server_id is distinct from v_target then
      raise exception 'idempotency_conflict' using errcode = '22023';
    end if;
    return v_prior;
  end if;

  if v_prod.id is null or not v_prod.published then
    raise exception 'product_unavailable' using errcode = '22023';
  end if;
  if v_prod.kind = 'item' then
    if v_target is null then
      raise exception 'server_required' using errcode = '22023';
    end if;
    if not exists (select 1 from public.servers where id = v_target and published) then
      raise exception 'product_unavailable' using errcode = '22023';
    end if;
  else
    select * into v_priv from public.privileges where user_id = v_user and expires_at > now();
    if found and v_priv.tier > v_prod.tier then
      raise exception 'privilege_lower' using errcode = '22023';
    end if;
  end if;
  if v_balance < v_prod.price then
    raise exception 'insufficient_funds' using errcode = '22023';
  end if;

  update public.wallets set balance = balance - v_prod.price where user_id = v_user returning balance into v_balance;
  insert into public.orders (user_id, product_id, title, kind, icon, server_id, price, idempotency_key)
  values (v_user, v_prod.id, v_prod.title, v_prod.kind, v_prod.icon, v_target, v_prod.price, p_key)
  returning * into v_order;
  insert into public.wallet_ledger (user_id, delta, reason, title, balance_after, order_id)
  values (v_user, -v_prod.price, 'purchase', v_prod.title, v_balance, v_order.id);

  select mc_uuid into v_player from public.profiles where id = v_user;
  v_payload := jsonb_build_object('product', v_prod.slug, 'kind', v_prod.kind, 'tier', v_prod.tier, 'duration_days', v_prod.duration_days);
  if v_prod.kind = 'item' then
    insert into public.delivery_tasks (order_id, server_id, player_uuid, payload)
    values (v_order.id, v_target, v_player, v_payload);
  else
    -- Тот же ранг продлевается от текущего срока; ранг выше начинается с сегодняшнего дня.
    insert into public.privileges (user_id, product_id, title, tier, expires_at)
    values (
      v_user, v_prod.id, v_prod.title, v_prod.tier,
      (case when v_priv.tier = v_prod.tier then v_priv.expires_at else now() end) + make_interval(days => v_prod.duration_days)
    )
    on conflict (user_id) do update
      set product_id = excluded.product_id, title = excluded.title, tier = excluded.tier, expires_at = excluded.expires_at;
    insert into public.delivery_tasks (order_id, server_id, player_uuid, payload)
    select v_order.id, s.id, v_player, v_payload from public.servers s where s.published;
  end if;
  return v_order;
end $$;

-- ---------------------------------------------------------------- пополнение
-- Игрок создаёт запись «ожидает оплаты»; её id передаётся провайдеру как номер заказа.
create function public.create_topup(p_amount integer)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_amount is null or p_amount not between 1 and 1000000 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  insert into public.payments (user_id, amount) values (auth.uid(), p_amount) returning id into v_id;
  return v_id;
end $$;

-- Подтверждение оплаты. Вызывает ТОЛЬКО серверный обработчик webhook после проверки подписи провайдера.
-- Возвращает true, если баланс зачислен сейчас, и false, если этот платёж уже был зачислен.
create function public.confirm_payment(p_payment uuid, p_provider text, p_provider_payment_id text, p_amount integer)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_pay public.payments;
  v_balance integer;
begin
  if coalesce(p_provider, '') = '' or coalesce(p_provider_payment_id, '') = '' then
    raise exception 'payment_mismatch' using errcode = '22023';
  end if;
  select * into v_pay from public.payments where id = p_payment for update;
  if not found then
    raise exception 'payment_not_found' using errcode = '22023';
  end if;
  -- Сумма сверяется с записью, созданной на нашей стороне: webhook не может её увеличить.
  if v_pay.amount <> p_amount then
    raise exception 'payment_mismatch' using errcode = '22023';
  end if;
  if v_pay.status = 'paid' then
    if v_pay.provider is distinct from p_provider or v_pay.provider_payment_id is distinct from p_provider_payment_id then
      raise exception 'payment_mismatch' using errcode = '22023';
    end if;
    return false;
  end if;
  update public.payments
    set status = 'paid', provider = p_provider, provider_payment_id = p_provider_payment_id, paid_at = now()
    where id = p_payment;
  insert into public.wallets (user_id, balance) values (v_pay.user_id, v_pay.amount)
    on conflict (user_id) do update set balance = public.wallets.balance + excluded.balance
    returning balance into v_balance;
  insert into public.wallet_ledger (user_id, delta, reason, title, balance_after, payment_id)
  values (v_pay.user_id, v_pay.amount, 'topup', 'Пополнение баланса', v_balance, v_pay.id);
  return true;
end $$;

-- ---------------------------------------------------------------- очередь выдачи
-- Игровой сервер забирает свои задания. Задание, взятое и не подтверждённое за 5 минут, выдаётся снова:
-- обработчик на игровой стороне обязан быть идемпотентным по id задания.
create function public.claim_deliveries(p_server uuid, p_limit integer default 20)
returns setof public.delivery_tasks
language plpgsql security definer set search_path = public
as $$
begin
  return query
  with picked as (
    select t.id from public.delivery_tasks t
    where t.server_id = p_server
      and (t.status = 'pending' or (t.status = 'claimed' and t.claimed_at < now() - interval '5 minutes'))
    order by t.created_at
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  ), claimed as (
    update public.delivery_tasks t
      set status = 'claimed', claimed_at = now(), attempts = t.attempts + 1
      from picked where t.id = picked.id
      returning t.*
  ), touched as (
    update public.orders o set status = 'delivering'
      where o.id in (select order_id from claimed) and o.status = 'paid'
      returning o.id
  )
  select c.* from claimed c, (select count(*) from touched) _;
end $$;

-- Ответ игрового сервера. Неудача возвращает задание в очередь; после пятой попытки заказ помечается ошибкой.
create function public.confirm_delivery(p_task uuid, p_ok boolean, p_error text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_task public.delivery_tasks;
begin
  select * into v_task from public.delivery_tasks where id = p_task for update;
  if not found then
    raise exception 'task_not_found' using errcode = '22023';
  end if;
  if v_task.status in ('done', 'cancelled') then
    return; -- повторное подтверждение ничего не меняет
  end if;
  if p_ok then
    update public.delivery_tasks set status = 'done', done_at = now(), last_error = null where id = p_task;
    update public.orders o set status = 'delivered'
      where o.id = v_task.order_id and o.status in ('paid', 'delivering', 'failed')
        and not exists (select 1 from public.delivery_tasks t where t.order_id = o.id and t.status not in ('done', 'cancelled'));
  elsif v_task.attempts >= 5 then
    update public.delivery_tasks set status = 'failed', last_error = left(coalesce(p_error, ''), 500) where id = p_task;
    update public.orders set status = 'failed' where id = v_task.order_id and status in ('paid', 'delivering');
  else
    update public.delivery_tasks set status = 'pending', last_error = left(coalesce(p_error, ''), 500) where id = p_task;
  end if;
end $$;

-- ---------------------------------------------------------------- действия персонала
-- Возврат: только владелец и администратор, только для невыданного заказа, ровно один раз.
create function public.refund_order(p_order uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders;
  v_balance integer;
begin
  if not public.is_content_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'order_not_found' using errcode = '22023';
  end if;
  if v_order.status not in ('paid', 'failed') then
    raise exception 'refund_not_allowed' using errcode = '22023';
  end if;
  update public.delivery_tasks set status = 'cancelled' where order_id = p_order and status in ('pending', 'failed');
  if exists (select 1 from public.delivery_tasks where order_id = p_order and status in ('claimed', 'done')) then
    raise exception 'refund_not_allowed' using errcode = '22023';
  end if;
  update public.orders set status = 'refunded' where id = p_order;
  if v_order.kind = 'privilege' then
    delete from public.privileges where user_id = v_order.user_id and product_id = v_order.product_id;
  end if;
  insert into public.wallets (user_id, balance) values (v_order.user_id, v_order.price)
    on conflict (user_id) do update set balance = public.wallets.balance + excluded.balance
    returning balance into v_balance;
  insert into public.wallet_ledger (user_id, delta, reason, title, balance_after, order_id)
  values (v_order.user_id, v_order.price, 'refund', v_order.title, v_balance, v_order.id);
  insert into public.audit_log (actor, action, target, details)
  values (auth.uid(), 'refund_order', p_order::text, jsonb_build_object('price', v_order.price, 'reason', p_reason));
end $$;

-- Ручное начисление валюты: только владелец; пишется в журнал.
create function public.grant_currency(p_nick text, p_amount integer, p_note text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid;
  v_balance integer;
begin
  if not public.has_role(array['owner']::public.staff_role[], null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_amount is null or p_amount not between 1 and 1000000 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  select id into v_user from public.profiles where nick_norm = lower(p_nick);
  if v_user is null then
    raise exception 'user_not_found' using errcode = '22023';
  end if;
  insert into public.wallets (user_id, balance) values (v_user, p_amount)
    on conflict (user_id) do update set balance = public.wallets.balance + excluded.balance
    returning balance into v_balance;
  insert into public.wallet_ledger (user_id, delta, reason, title, balance_after)
  values (v_user, p_amount, 'grant', coalesce(nullif(p_note, ''), 'Начисление от проекта'), v_balance);
  insert into public.audit_log (actor, action, target, details)
  values (auth.uid(), 'grant_currency', v_user::text, jsonb_build_object('amount', p_amount, 'note', p_note));
end $$;

-- ---------------------------------------------------------------- права и политики
alter table public.products enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.privileges enable row level security;
alter table public.delivery_tasks enable row level security;

create policy products_read on public.products for select using (published or public.is_content_admin());
create policy products_write on public.products for all
  using (public.is_content_admin()) with check (public.is_content_admin());

-- Игрок видит только свои деньги и заказы. Политик на запись нет: пишут только функции выше.
create policy wallets_read_own on public.wallets for select using (user_id = auth.uid());
create policy ledger_read_own on public.wallet_ledger for select using (user_id = auth.uid());
create policy orders_read_own on public.orders for select using (user_id = auth.uid() or public.is_content_admin());
create policy payments_read_own on public.payments for select using (user_id = auth.uid());
create policy privileges_read_own on public.privileges for select using (user_id = auth.uid());
-- delivery_tasks: политик нет — очередь доступна только серверной роли.

revoke all on public.products, public.wallets, public.wallet_ledger, public.orders, public.payments,
  public.privileges, public.delivery_tasks from anon, authenticated;
grant all on public.products, public.wallets, public.wallet_ledger, public.orders, public.payments,
  public.privileges, public.delivery_tasks to service_role;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.wallets, public.wallet_ledger, public.orders, public.payments, public.privileges to authenticated;

revoke all on function public.set_avatar_style(text), public.purchase(uuid, uuid, text), public.create_topup(integer),
  public.confirm_payment(uuid, text, text, integer), public.claim_deliveries(uuid, integer),
  public.confirm_delivery(uuid, boolean, text), public.refund_order(uuid, text),
  public.grant_currency(text, integer, text) from public, anon, authenticated;
grant execute on function public.set_avatar_style(text), public.purchase(uuid, uuid, text), public.create_topup(integer),
  public.refund_order(uuid, text), public.grant_currency(text, integer, text) to authenticated;
-- Подтверждение оплаты и очередь выдачи — только серверная роль (обработчик webhook и игровой сервер).
grant execute on function public.set_avatar_style(text), public.purchase(uuid, uuid, text), public.create_topup(integer),
  public.confirm_payment(uuid, text, text, integer), public.claim_deliveries(uuid, integer),
  public.confirm_delivery(uuid, boolean, text), public.refund_order(uuid, text),
  public.grant_currency(text, integer, text) to service_role;
