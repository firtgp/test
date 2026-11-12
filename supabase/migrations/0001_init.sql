-- Сайт модового Minecraft-проекта: схема, права, серверные функции.
-- Аккаунт общий для сайта, лаунчера и игровых серверов:
--   пароль хранит Supabase Auth (bcrypt), ник и стабильный UUID игрока — public.profiles.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- типы
create type public.staff_role as enum ('owner', 'admin', 'moderator', 'support');
create type public.loader_kind as enum ('neoforge', 'forge', 'fabric', 'quilt', 'vanilla');
create type public.news_kind as enum ('news', 'wipe', 'launch', 'maintenance', 'event');
create type public.redistribution_status as enum ('allowed', 'denied', 'unknown');

-- ---------------------------------------------------------------- контент
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.modpacks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(name) between 1 and 80),
  loader public.loader_kind not null,
  mc_version text not null check (length(mc_version) between 1 and 20),
  loader_version text,
  java_version int check (java_version between 8 and 99),
  ram_min_mb int check (ram_min_mb > 0),
  ram_recommended_mb int check (ram_recommended_mb > 0),
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mods (
  id uuid primary key default gen_random_uuid(),
  modpack_id uuid not null references public.modpacks (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  version text,
  homepage_url text check (homepage_url is null or homepage_url ~ '^https://'),
  source text,
  license text,
  redistribution public.redistribution_status not null default 'unknown',
  permission_url text check (permission_url is null or permission_url ~ '^https://'),
  is_key boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create unique index mods_modpack_name_key on public.mods (modpack_id, lower(name));

create table public.servers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(name) between 1 and 80),
  modpack_id uuid references public.modpacks (id) on delete set null,
  host text not null check (length(host) between 1 and 255),
  port int not null default 25565 check (port between 1 and 65535),
  mode text not null default '',
  tagline text not null default '',
  description_md text not null default '',
  wipe_policy text not null default '',
  launched_at date,
  next_wipe_at timestamptz,
  accent text not null default '#F2B544' check (accent ~ '^#[0-9A-Fa-f]{6}$'),
  status_mode text not null default 'auto' check (status_mode in ('auto', 'maintenance')),
  maintenance_note text not null default '',
  sort int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Последний снимок мониторинга. Пишет только воркер (service role).
create table public.server_status (
  server_id uuid primary key references public.servers (id) on delete cascade,
  checked_at timestamptz not null,
  online boolean not null,
  players_online int check (players_online >= 0),
  players_max int check (players_max >= 0),
  latency_ms int check (latency_ms >= 0),
  version_name text,
  error text
);

create table public.server_status_history (
  id bigint generated always as identity primary key,
  server_id uuid not null references public.servers (id) on delete cascade,
  checked_at timestamptz not null,
  online boolean not null,
  players_online int
);
create index server_status_history_server_time on public.server_status_history (server_id, checked_at desc);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null check (length(title) between 1 and 160),
  kind public.news_kind not null default 'news',
  server_id uuid references public.servers (id) on delete set null,
  summary text not null default '',
  body_md text not null default '',
  event_at timestamptz,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_published_at on public.news (published, published_at desc);

-- Правила версионируются: опубликованная версия не редактируется, выпускается новая.
create table public.rules_versions (
  id uuid primary key default gen_random_uuid(),
  version int not null unique check (version > 0),
  body_md text not null check (length(body_md) > 0),
  change_note text not null default '',
  published_at timestamptz not null default now(),
  created_by uuid
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.servers (id) on delete set null,
  storage_path text not null,
  alt text not null default '',
  caption text not null default '',
  build_version text not null default '',
  shaders text not null default '',
  resourcepack text not null default '',
  origin_note text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- аккаунты
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nick text not null check (nick ~ '^[A-Za-z0-9_]{3,16}$'),
  nick_norm text generated always as (lower(nick)) stored,
  -- UUID игрока стабилен и не зависит от ника: смена ника не теряет инвентарь и права.
  mc_uuid uuid not null default gen_random_uuid() unique,
  selected_server_id uuid references public.servers (id) on delete set null,
  nick_changed_at timestamptz,
  created_at timestamptz not null default now()
);
-- Уникальность ника без учёта регистра гарантирует индекс, а не проверка в приложении.
create unique index profiles_nick_norm_key on public.profiles (nick_norm);

-- Освобождённый ник 30 дней закреплён за прежним владельцем (защита от подмены личности).
create table public.nick_reservations (
  nick_norm text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reserved_until timestamptz not null
);

create table public.nick_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  old_nick text not null,
  new_nick text not null,
  changed_at timestamptz not null default now()
);

create table public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.staff_role not null,
  -- null = право действует на все серверы; иначе только на указанный.
  server_id uuid references public.servers (id) on delete cascade,
  granted_by uuid,
  created_at timestamptz not null default now()
);
create unique index staff_roles_unique on public.staff_roles
  (user_id, role, coalesce(server_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  server_id uuid references public.servers (id) on delete cascade, -- null = все серверы
  reason text not null check (length(reason) between 3 and 500),
  created_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid
);
create index bans_user on public.bans (user_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Сессии лаунчера. Токен хранится только в виде SHA-256.
create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  join_server_hash text,
  joined_at timestamptz,
  client_label text
);
create index game_sessions_user on public.game_sessions (user_id);

create table public.login_attempts (
  id bigint generated always as identity primary key,
  nick_norm text not null,
  ip text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_nick_time on public.login_attempts (nick_norm, created_at desc);
create index login_attempts_ip_time on public.login_attempts (ip, created_at desc);

-- ---------------------------------------------------------------- проверки прав
-- Есть ли у текущего пользователя одна из ролей с действием на сервер p_server.
-- p_server = null требует глобальную роль (server_id is null).
create function public.has_role(p_roles public.staff_role[], p_server uuid default null)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.staff_roles r
    where r.user_id = auth.uid()
      and r.role = any (p_roles)
      and (r.server_id is null or (p_server is not null and r.server_id = p_server))
  );
$$;

create function public.is_content_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.has_role(array['owner', 'admin']::public.staff_role[], null);
$$;

create function public.is_banned(p_user uuid, p_server uuid default null)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.bans b
    where b.user_id = p_user
      and b.revoked_at is null
      and (b.expires_at is null or b.expires_at > now())
      and (b.server_id is null or (p_server is not null and b.server_id = p_server))
  );
$$;

-- ---------------------------------------------------------------- триггеры
create function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch_modpacks before update on public.modpacks
  for each row execute function public.touch_updated_at();
create trigger touch_servers before update on public.servers
  for each row execute function public.touch_updated_at();
create trigger touch_news before update on public.news
  for each row execute function public.touch_updated_at();
create trigger touch_gallery before update on public.gallery_items
  for each row execute function public.touch_updated_at();

create function public.news_set_published_at()
returns trigger language plpgsql as $$
begin
  if new.published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger news_published_at before insert or update on public.news
  for each row execute function public.news_set_published_at();

-- Журнал изменений контента: кто, что и когда изменил.
create function public.audit_content()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_id := coalesce(to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'key');
  else
    v_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'key');
  end if;
  insert into public.audit_log (actor, action, target)
  values (auth.uid(), lower(tg_op) || ':' || tg_table_name, v_id);
  return coalesce(new, old);
end $$;

create trigger audit_servers after insert or update or delete on public.servers
  for each row execute function public.audit_content();
create trigger audit_modpacks after insert or update or delete on public.modpacks
  for each row execute function public.audit_content();
create trigger audit_mods after insert or update or delete on public.mods
  for each row execute function public.audit_content();
create trigger audit_news after insert or update or delete on public.news
  for each row execute function public.audit_content();
create trigger audit_rules after insert or update or delete on public.rules_versions
  for each row execute function public.audit_content();
create trigger audit_gallery after insert or update or delete on public.gallery_items
  for each row execute function public.audit_content();
create trigger audit_settings after insert or update or delete on public.site_settings
  for each row execute function public.audit_content();

-- Профиль создаётся в той же транзакции, что и запись auth.users.
-- Занятый ник откатывает регистрацию целиком: «половинных» аккаунтов не остаётся.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_nick text := new.raw_user_meta_data ->> 'nick';
begin
  if v_nick is null or v_nick !~ '^[A-Za-z0-9_]{3,16}$' then
    raise exception 'nick_invalid' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.nick_reservations
    where nick_norm = lower(v_nick) and reserved_until > now()
  ) then
    raise exception 'nick_taken' using errcode = '23505';
  end if;
  begin
    insert into public.profiles (id, nick) values (new.id, v_nick);
  exception when unique_violation then
    raise exception 'nick_taken' using errcode = '23505';
  end;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RPC: аккаунт
create function public.nick_available(p_nick text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_nick ~ '^[A-Za-z0-9_]{3,16}$'
    and not exists (select 1 from public.profiles where nick_norm = lower(p_nick))
    and not exists (
      select 1 from public.nick_reservations
      where nick_norm = lower(p_nick) and reserved_until > now() and user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    );
$$;

-- Смена ника: не чаще раза в 30 дней; UUID игрока не меняется.
create function public.change_nick(p_nick text)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  v_me public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,16}$' then
    raise exception 'nick_invalid' using errcode = '22023';
  end if;
  select * into v_me from public.profiles where id = auth.uid() for update;
  if v_me.nick = p_nick then
    return v_me;
  end if;
  if v_me.nick_changed_at is not null and v_me.nick_changed_at > now() - interval '30 days'
     and lower(v_me.nick) <> lower(p_nick) then
    raise exception 'nick_cooldown' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.nick_reservations
    where nick_norm = lower(p_nick) and reserved_until > now() and user_id <> auth.uid()
  ) then
    raise exception 'nick_taken' using errcode = '23505';
  end if;
  begin
    update public.profiles
      set nick = p_nick,
          nick_changed_at = case when lower(nick) <> lower(p_nick) then now() else nick_changed_at end
      where id = auth.uid();
  exception when unique_violation then
    raise exception 'nick_taken' using errcode = '23505';
  end;
  if lower(v_me.nick) <> lower(p_nick) then
    insert into public.nick_reservations (nick_norm, user_id, reserved_until)
    values (lower(v_me.nick), auth.uid(), now() + interval '30 days')
    on conflict (nick_norm) do update
      set user_id = excluded.user_id, reserved_until = excluded.reserved_until;
    delete from public.nick_reservations where nick_norm = lower(p_nick);
  end if;
  insert into public.nick_history (user_id, old_nick, new_nick) values (auth.uid(), v_me.nick, p_nick);
  insert into public.audit_log (actor, action, target, details)
  values (auth.uid(), 'change_nick', auth.uid()::text, jsonb_build_object('from', v_me.nick, 'to', p_nick));
  select * into v_me from public.profiles where id = auth.uid();
  return v_me;
end $$;

create function public.set_selected_server(p_server uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_server is not null and not exists (
    select 1 from public.servers where id = p_server and published
  ) then
    raise exception 'server_not_found' using errcode = '22023';
  end if;
  update public.profiles set selected_server_id = p_server where id = auth.uid();
end $$;

-- Активные сессии текущего пользователя: сайт (Supabase Auth) и лаунчер.
create function public.my_sessions()
returns table (id uuid, kind text, created_at timestamptz, last_seen_at timestamptz, label text, is_current boolean)
language sql stable security definer set search_path = public, auth
as $$
  select s.id, 'site'::text, s.created_at, coalesce(s.refreshed_at::timestamptz, s.updated_at, s.created_at),
         coalesce(s.user_agent, ''), s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  from auth.sessions s
  where s.user_id = auth.uid()
  union all
  select g.id, 'launcher'::text, g.created_at, coalesce(g.joined_at, g.created_at),
         coalesce(g.client_label, 'Лаунчер'), false
  from public.game_sessions g
  where g.user_id = auth.uid() and g.expires_at > now()
  order by 3 desc;
$$;

create function public.revoke_my_session(p_id uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from auth.sessions where id = p_id and user_id = auth.uid();
  delete from public.game_sessions where id = p_id and user_id = auth.uid();
end $$;

create function public.revoke_my_launcher_sessions()
returns void
language sql security definer set search_path = public
as $$
  delete from public.game_sessions where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------- RPC: персонал
create function public.staff_ban(p_user uuid, p_server uuid, p_reason text, p_expires_at timestamptz default null)
returns public.bans
language plpgsql security definer set search_path = public
as $$
declare
  v_ban public.bans;
begin
  -- Модератор сервера A не банит на сервере B и не выдаёт глобальный бан.
  if not public.has_role(array['owner', 'admin', 'moderator']::public.staff_role[], p_server) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot_ban_self' using errcode = '22023';
  end if;
  insert into public.bans (user_id, server_id, reason, created_by, expires_at)
  values (p_user, p_server, p_reason, auth.uid(), p_expires_at)
  returning * into v_ban;
  -- Бан на все серверы закрывает и действующие сессии лаунчера.
  if p_server is null then
    delete from public.game_sessions where user_id = p_user;
  end if;
  insert into public.audit_log (actor, action, target, details)
  values (auth.uid(), 'ban', p_user::text,
          jsonb_build_object('ban_id', v_ban.id, 'server_id', p_server, 'reason', p_reason, 'expires_at', p_expires_at));
  return v_ban;
end $$;

create function public.staff_unban(p_ban uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ban public.bans;
begin
  select * into v_ban from public.bans where id = p_ban for update;
  if not found then
    raise exception 'ban_not_found' using errcode = '22023';
  end if;
  if not public.has_role(array['owner', 'admin', 'moderator']::public.staff_role[], v_ban.server_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.bans set revoked_at = now(), revoked_by = auth.uid() where id = p_ban and revoked_at is null;
  insert into public.audit_log (actor, action, target, details)
  values (auth.uid(), 'unban', v_ban.user_id::text, jsonb_build_object('ban_id', p_ban));
end $$;

-- Роли: владелец выдаёт любые; администратор — только модератора и поддержку.
create function public.grant_staff_role(p_nick text, p_role public.staff_role, p_server uuid default null)
returns public.staff_roles
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid;
  v_row public.staff_roles;
begin
  if not (
    public.has_role(array['owner']::public.staff_role[], null)
    or (p_role in ('moderator', 'support') and public.has_role(array['admin']::public.staff_role[], null))
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role in ('owner', 'admin') and p_server is not null then
    raise exception 'role_must_be_global' using errcode = '22023';
  end if;
  select id into v_user from public.profiles where nick_norm = lower(p_nick);
  if v_user is null then
    raise exception 'user_not_found' using errcode = '22023';
  end if;
  insert into public.staff_roles (user_id, role, server_id, granted_by)
  values (v_user, p_role, p_server, auth.uid())
  on conflict do nothing
  returning * into v_row;
  if v_row.id is null then
    select * into v_row from public.staff_roles
    where user_id = v_user and role = p_role and server_id is not distinct from p_server;
  end if;
  insert into public.audit_log (actor, action, target, details)
  values (auth.uid(), 'grant_role', v_user::text, jsonb_build_object('role', p_role, 'server_id', p_server));
  return v_row;
end $$;

create function public.revoke_staff_role(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.staff_roles;
begin
  select * into v_row from public.staff_roles where id = p_id for update;
  if not found then
    raise exception 'role_not_found' using errcode = '22023';
  end if;
  if not (
    public.has_role(array['owner']::public.staff_role[], null)
    or (v_row.role in ('moderator', 'support') and public.has_role(array['admin']::public.staff_role[], null))
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.role = 'owner' and (select count(*) from public.staff_roles where role = 'owner') <= 1 then
    raise exception 'last_owner' using errcode = '22023';
  end if;
  delete from public.staff_roles where id = p_id;
  insert into public.audit_log (actor, action, target, details)
  values (auth.uid(), 'revoke_role', v_row.user_id::text, jsonb_build_object('role', v_row.role, 'server_id', v_row.server_id));
end $$;

create function public.list_staff()
returns table (id uuid, user_id uuid, nick text, role public.staff_role, server_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select r.id, r.user_id, p.nick, r.role, r.server_id, r.created_at
  from public.staff_roles r join public.profiles p on p.id = r.user_id
  where public.is_content_admin()
  order by r.role, p.nick;
$$;

-- Публикация новой версии правил: номер версии выдаёт база.
create function public.publish_rules(p_body_md text, p_change_note text default '')
returns public.rules_versions
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.rules_versions;
begin
  if not public.is_content_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  lock table public.rules_versions in share row exclusive mode;
  insert into public.rules_versions (version, body_md, change_note, created_by)
  values ((select coalesce(max(version), 0) + 1 from public.rules_versions), p_body_md, coalesce(p_change_note, ''), auth.uid())
  returning * into v_row;
  return v_row;
end $$;

-- ---------------------------------------------------------------- мониторинг (service role)
create function public.record_server_status(
  p_server uuid, p_online boolean, p_players_online int, p_players_max int,
  p_latency_ms int, p_version_name text, p_error text, p_checked_at timestamptz default now()
) returns void
language plpgsql set search_path = public
as $$
begin
  insert into public.server_status as s
    (server_id, checked_at, online, players_online, players_max, latency_ms, version_name, error)
  values (p_server, p_checked_at, p_online, p_players_online, p_players_max, p_latency_ms, p_version_name, p_error)
  on conflict (server_id) do update set
    checked_at = excluded.checked_at, online = excluded.online,
    players_online = excluded.players_online, players_max = excluded.players_max,
    latency_ms = excluded.latency_ms, version_name = excluded.version_name, error = excluded.error
  where s.checked_at <= excluded.checked_at;
  insert into public.server_status_history (server_id, checked_at, online, players_online)
  values (p_server, p_checked_at, p_online, p_players_online);
  delete from public.server_status_history
  where server_id = p_server and checked_at < now() - interval '14 days';
end $$;

-- ---------------------------------------------------------------- лаунчер (service role)
-- Можно ли пробовать пароль: не более 5 неудач на ник и 30 на IP за 15 минут.
create function public.launcher_login_allowed(p_nick text, p_ip text)
returns boolean
language sql stable set search_path = public
as $$
  select (
    select count(*) from public.login_attempts
    where nick_norm = lower(p_nick) and not success and created_at > now() - interval '15 minutes'
  ) < 5 and (
    select count(*) from public.login_attempts
    where ip = p_ip and not success and created_at > now() - interval '15 minutes'
  ) < 30;
$$;

create function public.launcher_record_attempt(p_nick text, p_ip text, p_success boolean)
returns void
language sql set search_path = public
as $$
  insert into public.login_attempts (nick_norm, ip, success) values (lower(p_nick), p_ip, p_success);
  delete from public.login_attempts where created_at < now() - interval '1 day';
$$;

-- Создаёт сессию лаунчера после успешной проверки пароля. Забаненный на всех серверах не входит.
create function public.launcher_create_session(p_user uuid, p_token_hash bytea, p_ttl interval default interval '24 hours', p_label text default null)
returns table (session_id uuid, mc_uuid uuid, nick text, expires_at timestamptz)
language plpgsql set search_path = public
as $$
declare
  v_profile public.profiles;
  v_id uuid;
  v_exp timestamptz := now() + p_ttl;
begin
  select * into v_profile from public.profiles where id = p_user;
  if not found then
    raise exception 'user_not_found' using errcode = '22023';
  end if;
  if public.is_banned(p_user, null) then
    raise exception 'banned' using errcode = '42501';
  end if;
  delete from public.game_sessions g where g.user_id = p_user and g.expires_at <= now();
  insert into public.game_sessions (user_id, token_hash, expires_at, client_label)
  values (p_user, p_token_hash, v_exp, p_label)
  returning id into v_id;
  return query select v_id, v_profile.mc_uuid, v_profile.nick, v_exp;
end $$;

-- Клиент сообщает, что заходит на сервер (аналог join в сессионном протоколе).
create function public.launcher_join(p_token_hash bytea, p_mc_uuid uuid, p_server_hash text)
returns boolean
language plpgsql set search_path = public
as $$
declare
  v_user uuid;
begin
  select g.user_id into v_user
  from public.game_sessions g join public.profiles p on p.id = g.user_id
  where g.token_hash = p_token_hash and g.expires_at > now() and p.mc_uuid = p_mc_uuid;
  if v_user is null or public.is_banned(v_user, null) then
    return false;
  end if;
  update public.game_sessions
    set join_server_hash = p_server_hash, joined_at = now()
    where token_hash = p_token_hash;
  return true;
end $$;

-- Игровой сервер проверяет вход. p_server — id сервера проекта для проверки серверного бана.
create function public.launcher_has_joined(p_nick text, p_server_hash text, p_server uuid default null)
returns table (mc_uuid uuid, nick text)
language sql stable set search_path = public
as $$
  select p.mc_uuid, p.nick
  from public.game_sessions g join public.profiles p on p.id = g.user_id
  where p.nick_norm = lower(p_nick)
    and g.join_server_hash = p_server_hash
    and g.joined_at > now() - interval '30 seconds'
    and g.expires_at > now()
    and not public.is_banned(p.id, p_server)
  limit 1;
$$;

create function public.launcher_user_by_nick(p_nick text)
returns table (user_id uuid, email text)
language sql stable security definer set search_path = public, auth
as $$
  select p.id, u.email::text
  from public.profiles p join auth.users u on u.id = p.id
  where p.nick_norm = lower(p_nick);
$$;

-- ---------------------------------------------------------------- RLS
alter table public.site_settings enable row level security;
alter table public.modpacks enable row level security;
alter table public.mods enable row level security;
alter table public.servers enable row level security;
alter table public.server_status enable row level security;
alter table public.server_status_history enable row level security;
alter table public.news enable row level security;
alter table public.rules_versions enable row level security;
alter table public.gallery_items enable row level security;
alter table public.profiles enable row level security;
alter table public.nick_reservations enable row level security;
alter table public.nick_history enable row level security;
alter table public.staff_roles enable row level security;
alter table public.bans enable row level security;
alter table public.audit_log enable row level security;
alter table public.game_sessions enable row level security;
alter table public.login_attempts enable row level security;

-- Публичное чтение витрины; запись — только владелец и администратор.
create policy settings_read on public.site_settings for select using (true);
create policy settings_write on public.site_settings for all
  using (public.is_content_admin()) with check (public.is_content_admin());

create policy modpacks_read on public.modpacks for select using (true);
create policy modpacks_write on public.modpacks for all
  using (public.is_content_admin()) with check (public.is_content_admin());

create policy mods_read on public.mods for select using (true);
create policy mods_write on public.mods for all
  using (public.is_content_admin()) with check (public.is_content_admin());

create policy servers_read on public.servers for select using (published or public.is_content_admin());
create policy servers_write on public.servers for all
  using (public.is_content_admin()) with check (public.is_content_admin());

create policy status_read on public.server_status for select using (true);
create policy status_history_read on public.server_status_history for select using (true);

create policy news_read on public.news for select using (published or public.is_content_admin());
create policy news_write on public.news for all
  using (public.is_content_admin()) with check (public.is_content_admin());

create policy rules_read on public.rules_versions for select using (true);

create policy gallery_read on public.gallery_items for select using (true);
create policy gallery_write on public.gallery_items for all
  using (public.is_content_admin()) with check (public.is_content_admin());

-- Профиль: свой — владельцу; все — персоналу. Изменение только через RPC.
create policy profiles_read_own on public.profiles for select
  using (id = auth.uid() or public.has_role(array['owner', 'admin', 'moderator', 'support']::public.staff_role[], null));

create policy nick_history_read on public.nick_history for select
  using (user_id = auth.uid() or public.is_content_admin());

create policy staff_roles_read on public.staff_roles for select
  using (user_id = auth.uid() or public.is_content_admin());

create policy bans_read on public.bans for select
  using (
    user_id = auth.uid()
    or public.has_role(array['owner', 'admin', 'moderator', 'support']::public.staff_role[], server_id)
  );

create policy audit_read on public.audit_log for select using (public.is_content_admin());
-- game_sessions, login_attempts, nick_reservations: политик нет — доступ только у service role.

-- ---------------------------------------------------------------- привилегии
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

grant select on public.site_settings, public.modpacks, public.mods, public.servers,
  public.server_status, public.server_status_history, public.news, public.rules_versions,
  public.gallery_items to anon, authenticated;
grant select on public.profiles, public.nick_history, public.staff_roles, public.bans, public.audit_log to authenticated;
grant insert, update, delete on public.site_settings, public.modpacks, public.mods, public.servers,
  public.news, public.gallery_items to authenticated;

grant execute on function public.nick_available(text) to anon, authenticated;
grant execute on function public.has_role(public.staff_role[], uuid) to anon, authenticated;
grant execute on function public.is_content_admin() to anon, authenticated;
grant execute on function public.change_nick(text) to authenticated;
grant execute on function public.set_selected_server(uuid) to authenticated;
grant execute on function public.my_sessions() to authenticated;
grant execute on function public.revoke_my_session(uuid) to authenticated;
grant execute on function public.revoke_my_launcher_sessions() to authenticated;
grant execute on function public.staff_ban(uuid, uuid, text, timestamptz) to authenticated;
grant execute on function public.staff_unban(uuid) to authenticated;
grant execute on function public.grant_staff_role(text, public.staff_role, uuid) to authenticated;
grant execute on function public.revoke_staff_role(uuid) to authenticated;
grant execute on function public.list_staff() to authenticated;
grant execute on function public.publish_rules(text, text) to authenticated;
