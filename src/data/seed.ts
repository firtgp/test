import type {Mod, Modpack, NewsItem, RulesVersion, Server, SiteSettings} from './types';

/**
 * Стартовое содержимое-ПРИМЕР. Единый источник для демо-режима и supabase/seed.sql
 * (pnpm seed:gen). Перед запуском замените его в админке: серверы, адреса, моды,
 * даты и ссылки здесь условные. Версии и лицензии модов не указаны намеренно —
 * их нужно взять из реальных файлов сборки.
 */
export const seedSettings: SiteSettings = {
  project_name: 'Название проекта',
  hero_title: 'Три мира на модах. Один аккаунт.',
  hero_lead:
    'Техника, магия и выживание на отдельных серверах. Скачайте лаунчер, создайте аккаунт — и заходите на любой.',
  timezone: 'Europe/Moscow',
  timezone_label: 'МСК',
  account_model: 'launcher',
  launcher_name: 'Лаунчер проекта',
  launcher_windows_url: '',
  launcher_macos_url: '',
  launcher_linux_url: '',
  discord_url: '',
  telegram_url: '',
  vk_url: '',
  contact_email: '',
};

const MP_TECH = '10000000-0000-4000-8000-000000000001';
const MP_MAGIC = '10000000-0000-4000-8000-000000000002';
const MP_SURV = '10000000-0000-4000-8000-000000000003';
export const SRV_TECH = '20000000-0000-4000-8000-000000000001';
export const SRV_MAGIC = '20000000-0000-4000-8000-000000000002';
export const SRV_SURV = '20000000-0000-4000-8000-000000000003';

export const seedModpacks: Modpack[] = [
  {
    id: MP_TECH,
    slug: 'industria',
    name: 'Индустрия',
    loader: 'neoforge',
    mc_version: '1.21.1',
    loader_version: null,
    java_version: 21,
    ram_min_mb: null,
    ram_recommended_mb: null,
    summary: 'Заводы, логистика и автоматизация: от первых шестерёнок до сети хранения.',
  },
  {
    id: MP_MAGIC,
    slug: 'arcana',
    name: 'Аркана',
    loader: 'neoforge',
    mc_version: '1.21.1',
    loader_version: null,
    java_version: 21,
    ram_min_mb: null,
    ram_recommended_mb: null,
    summary: 'Заклинания, ритуалы и магические механизмы без единого кабеля.',
  },
  {
    id: MP_SURV,
    slug: 'frontier',
    name: 'Фронтир',
    loader: 'fabric',
    mc_version: '1.21.1',
    loader_version: null,
    java_version: 21,
    ram_min_mb: null,
    ram_recommended_mb: null,
    summary: 'Лёгкая сборка для долгого выживания: кулинария, фермы и оптимизация.',
  },
];

function mod(n: number, modpack_id: string, name: string, slug: string, is_key: boolean): Mod {
  return {
    id: `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    modpack_id,
    name,
    version: null,
    homepage_url: `https://modrinth.com/mod/${slug}`,
    source: 'Modrinth',
    license: null,
    redistribution: 'unknown',
    permission_url: null,
    is_key,
    sort: n,
  };
}

export const seedMods: Mod[] = [
  mod(1, MP_TECH, 'Create', 'create', true),
  mod(2, MP_TECH, 'Mekanism', 'mekanism', true),
  mod(3, MP_TECH, 'Applied Energistics 2', 'ae2', true),
  mod(4, MP_TECH, 'Just Enough Items', 'jei', false),
  mod(5, MP_MAGIC, 'Ars Nouveau', 'ars-nouveau', true),
  mod(6, MP_MAGIC, 'Botania', 'botania', true),
  mod(7, MP_MAGIC, "Iron's Spells 'n Spellbooks", 'irons-spells-n-spellbooks', true),
  mod(8, MP_MAGIC, 'Just Enough Items', 'jei', false),
  mod(9, MP_SURV, "Farmer's Delight Refabricated", 'farmers-delight-refabricated', true),
  mod(10, MP_SURV, 'Sodium', 'sodium', false),
  mod(11, MP_SURV, 'Lithium', 'lithium', false),
];

export const seedServers: Server[] = [
  {
    id: SRV_TECH,
    slug: 'techno',
    name: 'Техно',
    modpack_id: MP_TECH,
    host: 'techno.example.org',
    port: 25565,
    mode: 'Выживание с приватами',
    tagline: 'Постройте завод, который работает, пока вы спите.',
    description_md:
      'Сервер для тех, кто любит схемы и производственные цепочки. Регионы защищены приватами, экономика общая.',
    wipe_policy: 'Вайп раз в сезон, дата объявляется минимум за две недели.',
    launched_at: null,
    next_wipe_at: '2026-12-05T15:00:00.000Z',
    accent: '#4FD1E0',
    status_mode: 'auto',
    maintenance_note: '',
    sort: 1,
    published: true,
  },
  {
    id: SRV_MAGIC,
    slug: 'magic',
    name: 'Магия',
    modpack_id: MP_MAGIC,
    host: 'magic.example.org',
    port: 25565,
    mode: 'Выживание с приватами',
    tagline: 'Мана вместо энергии, ритуалы вместо конвейеров.',
    description_md:
      'Магический мир: школы заклинаний, зачарованные сады и редкие ингредиенты в дальних биомах.',
    wipe_policy: 'Вайп раз в сезон, дата объявляется минимум за две недели.',
    launched_at: null,
    next_wipe_at: null,
    accent: '#A78BFA',
    status_mode: 'auto',
    maintenance_note: '',
    sort: 2,
    published: true,
  },
  {
    id: SRV_SURV,
    slug: 'survival',
    name: 'Выживание',
    modpack_id: MP_SURV,
    host: 'survival.example.org',
    port: 25565,
    mode: 'Выживание без приватов',
    tagline: 'Долгий мир без спешки: ферма, кухня и соседи.',
    description_md: 'Спокойный сервер с лёгкой сборкой. Мир не вайпается без крайней необходимости.',
    wipe_policy: 'Без плановых вайпов.',
    launched_at: null,
    next_wipe_at: null,
    accent: '#7CC96B',
    status_mode: 'auto',
    maintenance_note: '',
    sort: 3,
    published: true,
  },
];

export const seedNews: NewsItem[] = [
  {
    id: '40000000-0000-4000-8000-000000000001',
    slug: 'techno-wipe-december',
    title: 'Вайп сервера «Техно» 5 декабря',
    kind: 'wipe',
    server_id: SRV_TECH,
    summary: 'Новый сезон на «Техно»: мир и инвентари обнуляются, аккаунты и роли сохраняются.',
    body_md:
      'Сезон на «Техно» завершается.\n\n- Мир, инвентари и приваты обнуляются.\n- Аккаунт, ник и роли остаются.\n- Сервер будет недоступен около часа.\n\nТочное время указано в карточке события — оно показано в часовом поясе проекта.',
    event_at: '2026-12-05T15:00:00.000Z',
    published: true,
    published_at: '2026-11-10T09:00:00.000Z',
  },
  {
    id: '40000000-0000-4000-8000-000000000002',
    slug: 'site-and-account',
    title: 'Единый аккаунт для сайта, лаунчера и серверов',
    kind: 'news',
    server_id: null,
    summary: 'Зарегистрируйтесь один раз: тот же ник и пароль работают в лаунчере и на всех серверах.',
    body_md:
      'Аккаунт проекта теперь общий.\n\n1. Создайте аккаунт на сайте и подтвердите почту.\n2. Войдите в лаунчер с тем же ником и паролем.\n3. Выберите сервер и играйте.\n\nСменить пароль и завершить чужие сессии можно в кабинете.',
    event_at: null,
    published: true,
    published_at: '2026-11-03T09:00:00.000Z',
  },
];

export const seedRules: RulesVersion = {
  id: '50000000-0000-4000-8000-000000000001',
  version: 1,
  change_note: 'Первая редакция (пример — замените своими правилами).',
  published_at: '2026-11-01T09:00:00.000Z',
  body_md: [
    '## 1. Общее',
    '',
    '1.1. Правила действуют на всех серверах проекта, на сайте и в сообществах.',
    '1.2. Незнание правил не освобождает от ответственности.',
    '',
    '## 2. Игра',
    '',
    '2.1. Запрещены читы, макросы и использование ошибок игры или модов ради преимущества.',
    '2.2. Запрещено разрушать чужие постройки и присваивать чужие вещи.',
    '2.3. Нашли ошибку — сообщите персоналу.',
    '',
    '## 3. Общение',
    '',
    '3.1. Запрещены оскорбления, угрозы и травля.',
    '3.2. Запрещены спам и реклама сторонних проектов.',
    '',
    '## 4. Аккаунт',
    '',
    '4.1. Один игрок — один аккаунт. Передача и продажа аккаунтов запрещены.',
    '4.2. За безопасность пароля отвечает владелец аккаунта.',
    '',
    '## 5. Наказания и апелляции',
    '',
    '5.1. Наказание выбирает персонал сервера в пределах своих прав.',
    '5.2. Обжаловать наказание можно через контакты проекта.',
  ].join('\n'),
};

export const SETTINGS_KEY = 'site';
