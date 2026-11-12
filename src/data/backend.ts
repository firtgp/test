import type {
  Account, AuditEntry, ContentRow, ContentTable, GalleryItem, Mod, Modpack, NewsItem,
  RulesVersion, ServerView, SessionEntry, SiteSettings, StaffEntry, StaffRole,
} from './types';

export interface GalleryMeta {
  server_id: string | null;
  alt: string;
  caption: string;
  build_version: string;
  shaders: string;
  resourcepack: string;
  origin_note: string;
  sort: number;
}

export interface DemoMail {
  id: string;
  to: string;
  subject: string;
  link: string;
  sent_at: string;
}

/**
 * Единый контракт данных. Реализации: supabaseBackend (рабочий режим) и demoBackend
 * (явно помеченный тестовый режим без сервера). Интерфейс не знает, с какой из них работает.
 */
export interface Backend {
  readonly mode: 'supabase' | 'demo';

  getSettings(): Promise<SiteSettings>;
  listServers(includeUnpublished?: boolean): Promise<ServerView[]>;
  listModpacks(): Promise<Modpack[]>;
  listMods(): Promise<Mod[]>;
  listNews(includeUnpublished?: boolean): Promise<NewsItem[]>;
  getRules(): Promise<RulesVersion | null>;
  listGallery(): Promise<GalleryItem[]>;

  getAccount(): Promise<Account | null>;
  onAuthChange(cb: (event: 'change' | 'recovery') => void): () => void;
  nickAvailable(nick: string): Promise<boolean>;
  signUp(input: {nick: string; email: string; password: string}): Promise<void>;
  resendConfirmation(email: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  /** Завершает сброс по одноразовой ссылке из письма. */
  completePasswordReset(newPassword: string, token: string | null): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
  changeNick(nick: string): Promise<void>;
  setSelectedServer(serverId: string | null): Promise<void>;
  listSessions(): Promise<SessionEntry[]>;
  revokeSession(id: string): Promise<void>;
  revokeOtherSessions(): Promise<void>;

  saveContent<T extends ContentTable>(table: T, row: ContentRow[T]): Promise<void>;
  deleteContent(table: ContentTable, id: string): Promise<void>;
  saveSettings(settings: SiteSettings): Promise<void>;
  publishRules(bodyMd: string, changeNote: string): Promise<void>;
  addGalleryImage(file: File, meta: GalleryMeta): Promise<void>;
  /** Заменяет файл одной записи; остальные записи и их файлы не трогает. */
  replaceGalleryImage(id: string, file: File): Promise<void>;
  updateGalleryItem(id: string, meta: GalleryMeta): Promise<void>;
  deleteGalleryItem(id: string): Promise<void>;
  listStaff(): Promise<StaffEntry[]>;
  grantRole(nick: string, role: StaffRole, serverId: string | null): Promise<void>;
  revokeRole(id: string): Promise<void>;
  listAudit(): Promise<AuditEntry[]>;

  /** Только демо: «почтовый ящик» с письмами подтверждения и сброса. */
  demoMailbox?(): DemoMail[];
  /** Только демо: подтверждение почты по ссылке из письма. */
  demoConfirmEmail?(token: string): Promise<void>;
}

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
