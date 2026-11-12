import {z} from 'zod';

/** Ник: 3–16 символов A–Z, a–z, 0–9 и _. То же правило стоит в БД (check + уникальный индекс). */
export const NICK_RE = /^[A-Za-z0-9_]{3,16}$/;
export const nickSchema = z
  .string()
  .regex(NICK_RE, 'Ник: от 3 до 16 символов, только латинские буквы, цифры и «_»');
export const emailSchema = z.string().trim().email('Укажите почту в формате name@example.com');
export const passwordSchema = z
  .string()
  .min(10, 'Пароль не короче 10 символов')
  .max(72, 'Пароль не длиннее 72 символов');

const slug = z.string().regex(/^[a-z0-9-]{2,40}$/, 'Только строчные латинские буквы, цифры и дефис (2–40)');
const httpsUrl = z.string().regex(/^https:\/\//, 'Ссылка должна начинаться с https://');
const optionalText = z.string().trim().nullable().transform(v => (v ? v : null));
const optionalInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable();

export const loaderSchema = z.enum(['neoforge', 'forge', 'fabric', 'quilt', 'vanilla']);
export type Loader = z.infer<typeof loaderSchema>;
export const LOADER_LABEL: Record<Loader, string> = {
  neoforge: 'NeoForge',
  forge: 'Forge',
  fabric: 'Fabric',
  quilt: 'Quilt',
  vanilla: 'Vanilla',
};

export const modpackSchema = z.object({
  id: z.string().uuid(),
  slug,
  name: z.string().trim().min(1, 'Укажите название').max(80),
  loader: loaderSchema,
  mc_version: z.string().trim().min(1, 'Укажите версию игры').max(20),
  loader_version: optionalText,
  java_version: optionalInt(8, 99),
  ram_min_mb: optionalInt(1, 262144),
  ram_recommended_mb: optionalInt(1, 262144),
  summary: z.string().trim().max(600),
});
export type Modpack = z.infer<typeof modpackSchema>;

export const redistributionSchema = z.enum(['allowed', 'denied', 'unknown']);
export type Redistribution = z.infer<typeof redistributionSchema>;
export const REDISTRIBUTION_LABEL: Record<Redistribution, string> = {
  allowed: 'Разрешено',
  denied: 'Запрещено',
  unknown: 'Не подтверждено',
};

export const modSchema = z.object({
  id: z.string().uuid(),
  modpack_id: z.string().uuid(),
  name: z.string().trim().min(1, 'Укажите название мода').max(120),
  version: optionalText,
  homepage_url: httpsUrl.nullable(),
  source: optionalText,
  license: optionalText,
  redistribution: redistributionSchema,
  permission_url: httpsUrl.nullable(),
  is_key: z.boolean(),
  sort: z.number().int(),
});
export type Mod = z.infer<typeof modSchema>;

export const serverSchema = z.object({
  id: z.string().uuid(),
  slug,
  name: z.string().trim().min(1, 'Укажите название').max(80),
  modpack_id: z.string().uuid().nullable(),
  host: z.string().trim().min(1, 'Укажите адрес сервера').max(255),
  port: z.number().int().min(1).max(65535),
  mode: z.string().trim().max(80),
  tagline: z.string().trim().max(160),
  description_md: z.string().max(8000),
  wipe_policy: z.string().trim().max(300),
  launched_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  next_wipe_at: z.string().nullable(),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Цвет в формате #RRGGBB'),
  status_mode: z.enum(['auto', 'maintenance']),
  maintenance_note: z.string().trim().max(300),
  sort: z.number().int(),
  published: z.boolean(),
});
export type Server = z.infer<typeof serverSchema>;

export interface ServerStatus {
  server_id: string;
  checked_at: string;
  online: boolean;
  players_online: number | null;
  players_max: number | null;
  latency_ms: number | null;
  version_name: string | null;
  error: string | null;
}

export const newsKindSchema = z.enum(['news', 'wipe', 'launch', 'maintenance', 'event']);
export type NewsKind = z.infer<typeof newsKindSchema>;
export const NEWS_KIND_LABEL: Record<NewsKind, string> = {
  news: 'Новость',
  wipe: 'Вайп',
  launch: 'Запуск',
  maintenance: 'Техработы',
  event: 'Ивент',
};

export const newsSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9-]{2,80}$/, 'Только строчные латинские буквы, цифры и дефис (2–80)'),
  title: z.string().trim().min(1, 'Укажите заголовок').max(160),
  kind: newsKindSchema,
  server_id: z.string().uuid().nullable(),
  summary: z.string().trim().max(400),
  body_md: z.string().max(20000),
  event_at: z.string().nullable(),
  published: z.boolean(),
  published_at: z.string().nullable(),
});
export type NewsItem = z.infer<typeof newsSchema>;

export interface RulesVersion {
  id: string;
  version: number;
  body_md: string;
  change_note: string;
  published_at: string;
}

export const galleryItemSchema = z.object({
  id: z.string().uuid(),
  server_id: z.string().uuid().nullable(),
  storage_path: z.string().min(1),
  alt: z.string().trim().max(200),
  caption: z.string().trim().max(200),
  build_version: z.string().trim().max(80),
  shaders: z.string().trim().max(80),
  resourcepack: z.string().trim().max(80),
  origin_note: z.string().trim().max(200),
  sort: z.number().int(),
});
export type GalleryItem = z.infer<typeof galleryItemSchema> & {url: string};

const link = z.string().trim().refine(v => v === '' || /^https:\/\//.test(v), 'Ссылка должна начинаться с https://');

export const siteSettingsSchema = z.object({
  project_name: z.string().trim().min(1).max(60),
  hero_title: z.string().trim().min(1).max(120),
  hero_lead: z.string().trim().max(300),
  /** IANA-зона проекта: в ней показываются вайпы и ивенты. В БД время хранится в UTC. */
  timezone: z.string().min(1),
  timezone_label: z.string().trim().max(12),
  /** Модель аккаунтов — решение владельца: своя авторизация через лаунчер или лицензия Microsoft. */
  account_model: z.enum(['launcher', 'microsoft']),
  launcher_name: z.string().trim().max(60),
  launcher_windows_url: link,
  launcher_macos_url: link,
  launcher_linux_url: link,
  discord_url: link,
  telegram_url: link,
  vk_url: link,
  contact_email: z.string().trim().refine(v => v === '' || emailSchema.safeParse(v).success, 'Некорректная почта'),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export type StaffRole = 'owner' | 'admin' | 'moderator' | 'support';
export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  moderator: 'Модератор',
  support: 'Поддержка',
};

export type StaffEntry = {
  id: string;
  user_id: string;
  nick: string;
  role: StaffRole;
  server_id: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  email: string;
  email_confirmed: boolean;
  nick: string;
  mc_uuid: string;
  selected_server_id: string | null;
  nick_changed_at: string | null;
  roles: {role: StaffRole; server_id: string | null}[];
}

export interface SessionEntry {
  id: string;
  kind: 'site' | 'launcher';
  created_at: string;
  last_seen_at: string;
  label: string;
  is_current: boolean;
}

export type AuditEntry = {
  id: number;
  actor_nick: string | null;
  action: string;
  target: string | null;
  created_at: string;
}

export interface ServerView extends Server {
  modpack: Modpack | null;
  status: ServerStatus | null;
  mod_count: number;
  key_mods: string[];
}

export type ContentTable = 'servers' | 'modpacks' | 'mods' | 'news';
export interface ContentRow {
  servers: Server;
  modpacks: Modpack;
  mods: Mod;
  news: NewsItem;
}
export const contentSchemas = {
  servers: serverSchema,
  modpacks: modpackSchema,
  mods: modSchema,
  news: newsSchema,
} as const;

/** Ошибка с кодом, по которому интерфейс выбирает понятный текст. */
export class AppError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

export const ERROR_TEXT: Record<string, string> = {
  nick_taken: 'Этот ник уже занят. Попробуйте другой — остальные поля сохранены.',
  nick_invalid: 'Ник: от 3 до 16 символов, только латинские буквы, цифры и «_».',
  nick_cooldown: 'Ник можно менять не чаще одного раза в 30 дней.',
  email_taken: 'Аккаунт с такой почтой уже есть. Войдите или восстановите пароль.',
  invalid_credentials: 'Неверная почта или пароль.',
  email_not_confirmed: 'Почта ещё не подтверждена. Откройте письмо со ссылкой или запросите его снова.',
  rate_limited: 'Слишком много попыток. Подождите несколько минут и попробуйте снова.',
  weak_password: 'Пароль слишком простой. Используйте не меньше 10 символов.',
  wrong_password: 'Текущий пароль указан неверно.',
  token_invalid: 'Ссылка устарела или уже использована. Запросите новую.',
  forbidden: 'Недостаточно прав для этого действия.',
  not_authenticated: 'Сначала войдите в аккаунт.',
  user_not_found: 'Игрок с таким ником не найден.',
  last_owner: 'Нельзя снять роль с единственного владельца.',
  role_must_be_global: 'Роли владельца и администратора действуют на весь проект.',
  network: 'Нет связи с сервером. Проверьте интернет и повторите.',
  slug_taken: 'Такой адрес (slug) уже используется.',
  file_invalid: 'Файл не подходит: нужен PNG, JPEG, WebP или AVIF до 8 МБ.',
  unknown: 'Не получилось выполнить действие. Попробуйте ещё раз.',
};

export function errorText(e: unknown): string {
  if (e instanceof AppError) return ERROR_TEXT[e.code] ?? e.message ?? ERROR_TEXT.unknown;
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? ERROR_TEXT.unknown;
  return ERROR_TEXT.unknown;
}
