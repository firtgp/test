# Сайт модового Minecraft-проекта

Публичный сайт, аккаунт игрока и админка для проекта из нескольких серверов на модовых сборках.
Название, серверы, сборки, моды, новости, правила, ссылки и медиа меняются в админке, без нового деплоя.

> NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

## Что внутри

| Часть | Где | Что делает |
|---|---|---|
| Сайт | `src/` | React 19, Vite, React Router, Astryx, Phosphor Icons, TanStack Query, Zod |
| База и права | `supabase/migrations/` | Таблицы, RLS, серверные функции (ник, роли, баны, правила, сессии лаунчера) |
| Стартовое содержимое | `src/data/seed.ts` → `supabase/seed.sql` | Пример серверов, сборок, новостей и правил |
| Авторизация лаунчера | `supabase/functions/launcher-auth/` | Вход по нику и паролю, `join`, `has-joined` |
| Мониторинг | `worker/` | Опрос серверов по Server List Ping и запись снимков в БД |
| Проверки | `tests/`, `e2e/` | SQL-гарантии, модульные и сквозные тесты |

Состав — PLAYER_CORE: витрина, аккаунт игрока, админка. Магазин, скины, банлист, голосования, вики,
тикеты, статистика, AI, PWA и «стекло» не включены.

## Запуск

```bash
pnpm install
pnpm dev          # http://127.0.0.1:5173
```

Без переменных `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` сайт работает в **демо-режиме**: данные лежат
в браузере, письма не отправляются, наверху стоит пометка. Вход в демо-админку: `owner@example.org` /
`demo-owner-pass`. Демо-режим не даёт серверных гарантий и не предназначен для публикации.

## Рабочий режим (Supabase)

1. Создайте проект Supabase и примените миграции и seed:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   psql "$DATABASE_URL" -f supabase/seed.sql   # по желанию: содержимое-пример
   ```
2. В Auth включите подтверждение почты и добавьте адрес сайта в Redirect URLs (`/login`, `/reset`).
   Минимальную длину пароля поставьте 10.
3. Разверните функцию и задайте секрет:
   ```bash
   supabase functions deploy launcher-auth --no-verify-jwt
   supabase secrets set GAME_SERVER_KEY=<длинная случайная строка>
   ```
4. Скопируйте `.env.example` в `.env`, заполните `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`, соберите:
   ```bash
   pnpm build      # статика в dist/
   ```
   Статику можно разместить на Vercel или Cloudflare Pages. Нужен fallback всех путей на `index.html`.
5. Запустите воркер мониторинга на сервере с исходящим TCP (VPS рядом с игровыми серверами):
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm worker:monitor
   ```
6. Зарегистрируйтесь на сайте и выдайте себе роль владельца один раз через SQL:
   ```sql
   insert into public.staff_roles (user_id, role)
   select id, 'owner' from public.profiles where nick_norm = lower('ВашНик');
   ```
   Дальше роли выдаются в админке.

Service-ключ, `GAME_SERVER_KEY` и пароль RCON никогда не попадают во frontend: в сборку идут только
переменные с префиксом `VITE_`.

## Проверки

```bash
pnpm typecheck
pnpm test         # модульные: Server List Ping на поддельном сервере, статусы, ник
pnpm test:sql     # миграции + seed на временном PostgreSQL и проверка гарантий
pnpm e2e --trace off      # сквозные сценарии в браузере (демо-режим)
```

`pnpm test:sql` требует локальный PostgreSQL 14+ (`initdb`, `pg_ctl`, `psql`). Он использует
`tests/sql/shim.sql` — минимальную имитацию ролей и схем Supabase.

## Перед запуском замените

- Название проекта, заголовок, ссылки на лаунчер и сообщество — «Админка → Настройки».
- Серверы, адреса, сборки, списки модов — они условные. Версии и лицензии модов не заполнены намеренно.
- Сцены первого экрана — это иллюстрации из блоков, собранные кодом (`src/scenes/worlds.ts`), а не скриншоты
  ваших миров. Сцену для сервера выбирают в «Админка → Серверы → Сцена на главной».
- Правила — в seed лежит пример.
- Юридические тексты (оферта, возраст, возвраты) не написаны: их готовит владелец по своей юрисдикции.

Подробности: [игровая сторона](docs/game-side.md), [лицензии](docs/licenses.md), [журнал решений](docs/journal.md).
