-- СГЕНЕРИРОВАНО: pnpm seed:gen. Содержимое-пример; замените его в админке перед запуском.

-- Повторное применение не затирает живые изменения.

insert into public.site_settings (key, value)
values ('site', '{"project_name":"Название проекта","hero_title":"Три мира на модах. Один аккаунт.","hero_lead":"Техника, магия и выживание на отдельных серверах. Скачайте лаунчер, создайте аккаунт — и заходите на любой.","timezone":"Europe/Moscow","timezone_label":"МСК","account_model":"launcher","launcher_name":"Лаунчер проекта","launcher_windows_url":"","launcher_macos_url":"","launcher_linux_url":"","discord_url":"","telegram_url":"","vk_url":"","contact_email":"","currency_name":"Искры","currency_one":"искра","currency_few":"искры","currency_many":"искр"}'::jsonb)
on conflict (key) do nothing;

insert into public.modpacks (id, slug, name, loader, mc_version, loader_version, java_version, ram_min_mb, ram_recommended_mb, summary)
values ('10000000-0000-4000-8000-000000000001', 'industria', 'Индустрия', 'neoforge', '1.21.1', null, 21, null, null, 'Заводы, логистика и автоматизация: от первых шестерёнок до сети хранения.')
on conflict (id) do nothing;
insert into public.modpacks (id, slug, name, loader, mc_version, loader_version, java_version, ram_min_mb, ram_recommended_mb, summary)
values ('10000000-0000-4000-8000-000000000002', 'arcana', 'Аркана', 'neoforge', '1.21.1', null, 21, null, null, 'Заклинания, ритуалы и магические механизмы без единого кабеля.')
on conflict (id) do nothing;
insert into public.modpacks (id, slug, name, loader, mc_version, loader_version, java_version, ram_min_mb, ram_recommended_mb, summary)
values ('10000000-0000-4000-8000-000000000003', 'frontier', 'Фронтир', 'fabric', '1.21.1', null, 21, null, null, 'Лёгкая сборка для долгого выживания: кулинария, фермы и оптимизация.')
on conflict (id) do nothing;

insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Create', null, 'https://modrinth.com/mod/create', 'Modrinth', null, 'unknown', null, true, 1)
on conflict (id) do nothing;
insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Mekanism', null, 'https://modrinth.com/mod/mekanism', 'Modrinth', null, 'unknown', null, true, 2)
on conflict (id) do nothing;
insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Applied Energistics 2', null, 'https://modrinth.com/mod/ae2', 'Modrinth', null, 'unknown', null, true, 3)
on conflict (id) do nothing;
insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Just Enough Items', null, 'https://modrinth.com/mod/jei', 'Modrinth', null, 'unknown', null, false, 4)
on conflict (id) do nothing;
insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Ars Nouveau', null, 'https://modrinth.com/mod/ars-nouveau', 'Modrinth', null, 'unknown', null, true, 5)
on conflict (id) do nothing;
insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 'Botania', null, 'https://modrinth.com/mod/botania', 'Modrinth', null, 'unknown', null, true, 6)
on conflict (id) do nothing;
insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', 'Iron''s Spells ''n Spellbooks', null, 'https://modrinth.com/mod/irons-spells-n-spellbooks', 'Modrinth', null, 'unknown', null, true, 7)
on conflict (id) do nothing;
insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002', 'Just Enough Items', null, 'https://modrinth.com/mod/jei', 'Modrinth', null, 'unknown', null, false, 8)
on conflict (id) do nothing;
insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000003', 'Farmer''s Delight Refabricated', null, 'https://modrinth.com/mod/farmers-delight-refabricated', 'Modrinth', null, 'unknown', null, true, 9)
on conflict (id) do nothing;
insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000003', 'Sodium', null, 'https://modrinth.com/mod/sodium', 'Modrinth', null, 'unknown', null, false, 10)
on conflict (id) do nothing;
insert into public.mods (id, modpack_id, name, version, homepage_url, source, license, redistribution, permission_url, is_key, sort)
values ('30000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000003', 'Lithium', null, 'https://modrinth.com/mod/lithium', 'Modrinth', null, 'unknown', null, false, 11)
on conflict (id) do nothing;

insert into public.servers (id, slug, name, modpack_id, host, port, mode, tagline, description_md, wipe_policy, launched_at, next_wipe_at, accent, scene, status_mode, maintenance_note, sort, published)
values ('20000000-0000-4000-8000-000000000001', 'techno', 'Техно', '10000000-0000-4000-8000-000000000001', 'techno.example.org', 25565, 'Выживание с приватами', 'Постройте завод, который работает, пока вы спите.', 'Сервер для тех, кто любит схемы и производственные цепочки. Регионы защищены приватами, экономика общая.', 'Вайп раз в сезон, дата объявляется минимум за две недели.', null, '2026-12-05T15:00:00.000Z', '#4FD1E0', 'techno', 'auto', '', 1, true)
on conflict (id) do nothing;
insert into public.servers (id, slug, name, modpack_id, host, port, mode, tagline, description_md, wipe_policy, launched_at, next_wipe_at, accent, scene, status_mode, maintenance_note, sort, published)
values ('20000000-0000-4000-8000-000000000002', 'magic', 'Магия', '10000000-0000-4000-8000-000000000002', 'magic.example.org', 25565, 'Выживание с приватами', 'Мана вместо энергии, ритуалы вместо конвейеров.', 'Магический мир: школы заклинаний, зачарованные сады и редкие ингредиенты в дальних биомах.', 'Вайп раз в сезон, дата объявляется минимум за две недели.', null, null, '#A78BFA', 'magic', 'auto', '', 2, true)
on conflict (id) do nothing;
insert into public.servers (id, slug, name, modpack_id, host, port, mode, tagline, description_md, wipe_policy, launched_at, next_wipe_at, accent, scene, status_mode, maintenance_note, sort, published)
values ('20000000-0000-4000-8000-000000000003', 'survival', 'Выживание', '10000000-0000-4000-8000-000000000003', 'survival.example.org', 25565, 'Выживание без приватов', 'Долгий мир без спешки: ферма, кухня и соседи.', 'Спокойный сервер с лёгкой сборкой. Мир не вайпается без крайней необходимости.', 'Без плановых вайпов.', null, null, '#7CC96B', 'survival', 'auto', '', 3, true)
on conflict (id) do nothing;

insert into public.news (id, slug, title, kind, server_id, summary, body_md, event_at, published, published_at)
values ('40000000-0000-4000-8000-000000000001', 'techno-wipe-december', 'Вайп сервера «Техно» 5 декабря', 'wipe', '20000000-0000-4000-8000-000000000001', 'Новый сезон на «Техно»: мир и инвентари обнуляются, аккаунты и роли сохраняются.', 'Сезон на «Техно» завершается.

- Мир, инвентари и приваты обнуляются.
- Аккаунт, ник и роли остаются.
- Сервер будет недоступен около часа.

Точное время указано в карточке события — оно показано в часовом поясе проекта.', '2026-12-05T15:00:00.000Z', true, '2026-11-10T09:00:00.000Z')
on conflict (id) do nothing;
insert into public.news (id, slug, title, kind, server_id, summary, body_md, event_at, published, published_at)
values ('40000000-0000-4000-8000-000000000002', 'site-and-account', 'Единый аккаунт для сайта, лаунчера и серверов', 'news', null, 'Зарегистрируйтесь один раз: тот же ник и пароль работают в лаунчере и на всех серверах.', 'Аккаунт проекта теперь общий.

1. Создайте аккаунт на сайте и подтвердите почту.
2. Войдите в лаунчер с тем же ником и паролем.
3. Выберите сервер и играйте.

Сменить пароль и завершить чужие сессии можно в кабинете.', null, true, '2026-11-03T09:00:00.000Z')
on conflict (id) do nothing;

insert into public.rules_versions (id, version, change_note, published_at, body_md)
values ('50000000-0000-4000-8000-000000000001', 1, 'Первая редакция (пример — замените своими правилами).', '2026-11-01T09:00:00.000Z', '## 1. Общее

1.1. Правила действуют на всех серверах проекта, на сайте и в сообществах.
1.2. Незнание правил не освобождает от ответственности.

## 2. Игра

2.1. Запрещены читы, макросы и использование ошибок игры или модов ради преимущества.
2.2. Запрещено разрушать чужие постройки и присваивать чужие вещи.
2.3. Нашли ошибку — сообщите персоналу.

## 3. Общение

3.1. Запрещены оскорбления, угрозы и травля.
3.2. Запрещены спам и реклама сторонних проектов.

## 4. Аккаунт

4.1. Один игрок — один аккаунт. Передача и продажа аккаунтов запрещены.
4.2. За безопасность пароля отвечает владелец аккаунта.

## 5. Наказания и апелляции

5.1. Наказание выбирает персонал сервера в пределах своих прав.
5.2. Обжаловать наказание можно через контакты проекта.')
on conflict (id) do nothing;

-- Каталог-пример: названия, цены и бонусы условные. Перед включением оплаты сверьте товары с правилами Mojang.

insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('60000000-0000-4000-8000-000000000001', 'tech-mechanic-kit', 'item', 'Набор механика', 'Валы, шестерни и водяное колесо — запустить первую линию.', 120, '20000000-0000-4000-8000-000000000001', 'Create', 'gear', 0, null, '{}'::text[], 'gameplay', 1, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('60000000-0000-4000-8000-000000000002', 'tech-industrial-drill', 'item', 'Промышленный бур', 'Копает за вас, пока вы строите завод.', 900, '20000000-0000-4000-8000-000000000001', 'Mekanism', 'drill', 0, null, '{}'::text[], 'gameplay', 2, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('60000000-0000-4000-8000-000000000003', 'tech-storage-cell', 'item', 'Накопитель данных', 'Ёмкая ячейка для сети хранения.', 450, '20000000-0000-4000-8000-000000000001', 'Applied Energistics 2', 'disk', 0, null, '{}'::text[], 'gameplay', 3, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('60000000-0000-4000-8000-000000000004', 'magic-apprentice-book', 'item', 'Книга ученика', 'Первые глифы и пустые страницы для своих заклинаний.', 150, '20000000-0000-4000-8000-000000000002', 'Ars Nouveau', 'book', 0, null, '{}'::text[], 'gameplay', 4, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('60000000-0000-4000-8000-000000000005', 'magic-mana-seedlings', 'item', 'Саженцы маны', 'Набор мистических цветов для первого сада.', 90, '20000000-0000-4000-8000-000000000002', 'Botania', 'flower', 0, null, '{}'::text[], 'gameplay', 5, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('60000000-0000-4000-8000-000000000006', 'magic-spell-scroll', 'item', 'Свиток заклинания', 'Редкое заклинание, которое не найти в начале игры.', 300, '20000000-0000-4000-8000-000000000002', 'Iron''s Spells ''n Spellbooks', 'scroll', 0, null, '{}'::text[], 'gameplay', 6, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('60000000-0000-4000-8000-000000000007', 'survival-farmer-basket', 'item', 'Корзина фермера', 'Семена, рассада и немного готовой еды в дорогу.', 60, '20000000-0000-4000-8000-000000000003', 'Farmer''s Delight', 'basket', 0, null, '{}'::text[], 'gameplay', 7, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('60000000-0000-4000-8000-000000000008', 'starter-tools', 'item', 'Набор новичка', 'Простые инструменты, чтобы не начинать с пустыми руками.', 50, null, '', 'pickaxe', 0, null, '{}'::text[], 'gameplay', 8, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('60000000-0000-4000-8000-000000000009', 'cosmetic-spark-trail', 'item', 'След искр', 'За вами тянется шлейф золотых искр. На игру не влияет.', 200, null, '', 'sparkles', 0, null, '{}'::text[], 'cosmetic', 9, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('60000000-0000-4000-8000-000000000010', 'cosmetic-decor-chest', 'item', 'Сундук украшений', 'Декоративные блоки и флаги для построек. На игру не влияет.', 140, null, '', 'chest', 0, null, '{}'::text[], 'cosmetic', 10, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('61000000-0000-4000-8000-000000000001', 'rank-seeker', 'privilege', 'Искатель', 'Первый ранг: заметный ник и немного удобства.', 300, null, '', 'sparkles', 1, 30, array['Цветной ник и значок в чате', 'Бирюзовая подсветка пьедестала персонажа на сайте', 'Две дополнительные точки дома']::text[], 'unchecked', 1, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('61000000-0000-4000-8000-000000000002', 'rank-master', 'privilege', 'Мастер', 'Для тех, кто играет каждый день.', 700, null, '', 'sparkles', 2, 30, array['Всё из ранга «Искатель»', 'Аура и кристаллы вокруг персонажа на сайте', 'Пять точек дома и личный варп', 'Косметические частицы в игре']::text[], 'unchecked', 2, true)
on conflict (id) do nothing;
insert into public.products (id, slug, kind, title, description, price, server_id, mod_name, icon, tier, duration_days, perks, compliance, sort, published)
values ('61000000-0000-4000-8000-000000000003', 'rank-legend', 'privilege', 'Легенда', 'Высший ранг проекта.', 1500, null, '', 'sparkles', 3, 30, array['Всё из ранга «Мастер»', 'Золотой пьедестал и вихрь искр у персонажа на сайте', 'Золотой ник и эффект входа на сервер', 'Косметика сезона']::text[], 'unchecked', 3, true)
on conflict (id) do nothing;

