// ДЕМО-РЕЖИМ. Работает без сервера: данные лежат в localStorage этого браузера.
// Нужен, чтобы показать сайт и пройти сценарии руками. Он повторяет правила сервера
// (уникальность ника без учёта регистра, одноразовые ссылки, роли), но гарантий сервера
// не даёт: настоящие проверки — в supabase/migrations и tests/sql.
import type {Backend, DemoMail, GalleryMeta} from './backend';
import {IMAGE_TYPES} from './backend';
import {
  SRV_MAGIC, SRV_SURV, SRV_TECH, seedMods, seedModpacks, seedNews, seedRules, seedServers, seedSettings,
} from './seed';
import {seedProducts} from './shopSeed';
import {
  AppError, NICK_RE, avatarStyleSchema, contentSchemas, siteSettingsSchema,
  type Account, type ActivePrivilege, type AuditEntry, type ContentTable, type GalleryItem, type LedgerEntry,
  type Mod, type Modpack, type NewsItem, type Order, type Product, type RulesVersion, type Server,
  type ServerStatus, type ServerView, type SiteSettings, type StaffEntry, type StaffRole,
} from './types';

const STORE_KEY = 'mcsite-demo-v1';
const DEMO_IMAGE_MAX = 1024 * 1024;
export const DEMO_OWNER = {email: 'owner@example.org', password: 'demo-owner-pass', nick: 'DemoOwner'};
/** Готовый игрок: кабинет, баланс и магазин видны сразу, без регистрации. */
export const DEMO_PLAYER = {email: 'player@example.org', password: 'demo-player-pass', nick: 'DemoPlayer'};
const DEMO_START_BALANCE = 1200;
export const DEMO_TOPUP_MIN = 50;
export const DEMO_TOPUP_MAX = 50_000;

interface DemoUser {
  id: string;
  email: string;
  nick: string;
  mc_uuid: string;
  salt: string;
  hash: string;
  email_confirmed: boolean;
  selected_server_id: string | null;
  nick_changed_at: string | null;
  failed: number[];
  avatar_style?: Account['avatar_style'];
}
interface DemoLedger extends LedgerEntry {user_id: string}
interface DemoOrder extends Order {user_id: string; key: string}
interface DemoPrivilege extends ActivePrivilege {user_id: string}
interface DemoToken {token: string; kind: 'confirm' | 'reset'; user_id: string; expires: number}
interface DemoState {
  settings: SiteSettings;
  modpacks: Modpack[];
  mods: Mod[];
  servers: Server[];
  news: NewsItem[];
  rules: RulesVersion[];
  gallery: Omit<GalleryItem, 'url'>[];
  users: DemoUser[];
  staff: StaffEntry[];
  tokens: DemoToken[];
  mail: DemoMail[];
  audit: AuditEntry[];
  session: {user_id: string; id: string; created_at: string} | null;
  products: Product[];
  ledger: DemoLedger[];
  orders: DemoOrder[];
  privileges: DemoPrivilege[];
}

const uuid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

async function pbkdf2(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 60_000}, key, 256,
  );
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function initial(): DemoState {
  return {
    settings: seedSettings,
    modpacks: seedModpacks,
    mods: seedMods,
    servers: seedServers,
    news: seedNews,
    rules: [seedRules],
    gallery: [],
    users: [],
    staff: [],
    tokens: [],
    mail: [],
    audit: [],
    session: null,
    products: seedProducts,
    ledger: [],
    orders: [],
    privileges: [],
  };
}

/** Демонстрационные снимки мониторинга: по одному на каждое состояние. */
function demoStatus(serverId: string, now: number): ServerStatus | null {
  const base = {server_id: serverId, latency_ms: null, version_name: null, error: null};
  if (serverId === SRV_TECH) {
    return {...base, checked_at: new Date(now - 20_000).toISOString(), online: true, players_online: 37, players_max: 100, latency_ms: 24};
  }
  if (serverId === SRV_MAGIC) {
    return {...base, checked_at: new Date(now - 30_000).toISOString(), online: false, players_online: null, players_max: null, error: 'ECONNREFUSED'};
  }
  if (serverId === SRV_SURV) {
    return {...base, checked_at: new Date(now - 42 * 60_000).toISOString(), online: true, players_online: 12, players_max: 60};
  }
  return null;
}

export function createDemoBackend(): Backend {
  let state: DemoState;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    state = raw ? {...initial(), ...(JSON.parse(raw) as DemoState)} : initial();
    // Данные, сохранённые прежней версией сайта, дополняются новыми полями настроек.
    state.settings = {...seedSettings, ...state.settings};
  } catch {
    state = initial();
  }
  const listeners = new Set<(e: 'change' | 'recovery') => void>();
  const persist = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      throw new AppError('unknown', 'Хранилище браузера переполнено');
    }
  };
  const emit = () => listeners.forEach(l => l('change'));

  const balanceOf = (userId: string) => state.ledger.reduce((sum, l) => (l.user_id === userId ? sum + l.delta : sum), 0);
  const addLedger = (userId: string, delta: number, reason: LedgerEntry['reason'], title: string) => {
    state.ledger.unshift({
      id: uuid(), user_id: userId, delta, reason, title, balance_after: balanceOf(userId) + delta, created_at: nowIso(),
    });
  };

  // Готовые аккаунты демо-режима: владелец для админки и игрок для кабинета.
  const ready = (async () => {
    let changed = false;
    const ensure = async (who: typeof DEMO_OWNER) => {
      if (state.users.some(u => u.email === who.email)) return null;
      const salt = uuid();
      const id = uuid();
      state.users.push({
        id, email: who.email, nick: who.nick, mc_uuid: uuid(), salt,
        hash: await pbkdf2(who.password, salt), email_confirmed: true,
        selected_server_id: null, nick_changed_at: null, failed: [],
      });
      changed = true;
      return id;
    };
    const ownerId = await ensure(DEMO_OWNER);
    if (ownerId) {
      state.staff.push({id: uuid(), user_id: ownerId, nick: DEMO_OWNER.nick, role: 'owner', server_id: null, created_at: nowIso()});
    }
    const playerId = await ensure(DEMO_PLAYER);
    if (playerId) addLedger(playerId, DEMO_START_BALANCE, 'grant', 'Стартовый демо-баланс');
    if (changed) persist();
  })();

  const me = () => state.users.find(u => u.id === state.session?.user_id) ?? null;
  const requireUser = () => {
    const u = me();
    if (!u) throw new AppError('not_authenticated');
    return u;
  };
  const hasRole = (roles: StaffRole[]) => {
    const u = me();
    return !!u && state.staff.some(s => s.user_id === u.id && roles.includes(s.role) && s.server_id === null);
  };
  const requireAdmin = () => {
    if (!hasRole(['owner', 'admin'])) throw new AppError('forbidden');
  };
  const audit = (action: string, target: string | null) => {
    state.audit.unshift({id: Date.now(), actor_nick: me()?.nick ?? null, action, target, created_at: nowIso()});
    state.audit = state.audit.slice(0, 100);
  };
  const nickFree = (nick: string, exceptId?: string) =>
    !state.users.some(u => u.id !== exceptId && u.nick.toLowerCase() === nick.toLowerCase());
  const sendMail = (user: DemoUser, kind: DemoToken['kind']) => {
    const token = uuid();
    state.tokens = state.tokens.filter(t => !(t.user_id === user.id && t.kind === kind));
    state.tokens.push({token, kind, user_id: user.id, expires: Date.now() + 60 * 60_000});
    state.mail.unshift({
      id: uuid(), to: user.email, sent_at: nowIso(),
      subject: kind === 'confirm' ? 'Подтвердите почту' : 'Сброс пароля',
      link: kind === 'confirm' ? `/login?demo_confirm=${token}` : `/reset?token=${token}`,
    });
    state.mail = state.mail.slice(0, 10);
  };
  /** Одноразовый токен: после использования удаляется, повторно не срабатывает. */
  const consume = (token: string | null, kind: DemoToken['kind']) => {
    const t = state.tokens.find(x => x.token === token && x.kind === kind);
    if (!t || t.expires < Date.now()) throw new AppError('token_invalid');
    state.tokens = state.tokens.filter(x => x !== t);
    const user = state.users.find(u => u.id === t.user_id);
    if (!user) throw new AppError('token_invalid');
    return user;
  };
  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      if (!IMAGE_TYPES.includes(file.type)) return reject(new AppError('file_invalid'));
      if (file.size > DEMO_IMAGE_MAX) {
        return reject(new AppError('file_invalid', 'В демо-режиме файл хранится в браузере: не больше 1 МБ.'));
      }
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new AppError('file_invalid'));
      r.readAsDataURL(file);
    });
  const table = (name: ContentTable): {id: string}[] => state[name];
  const publicOrder = ({user_id: _u, key: _k, ...order}: DemoOrder): Order => order;
  const activePrivilege = (userId: string) =>
    state.privileges.find(p => p.user_id === userId && Date.parse(p.expires_at) > Date.now()) ?? null;

  return {
    mode: 'demo',
    shop: true,

    async getSettings() {
      return state.settings;
    },
    async listServers(includeUnpublished = false) {
      const now = Date.now();
      return state.servers
        .filter(s => includeUnpublished || s.published)
        .sort((a, b) => a.sort - b.sort)
        .map<ServerView>(s => {
          const own = state.mods.filter(m => m.modpack_id === s.modpack_id).sort((a, b) => a.sort - b.sort);
          return {
            ...s,
            modpack: state.modpacks.find(p => p.id === s.modpack_id) ?? null,
            status: demoStatus(s.id, now),
            mod_count: own.length,
            key_mods: own.filter(m => m.is_key).map(m => m.name),
          };
        });
    },
    async listModpacks() {
      return [...state.modpacks].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    },
    async listMods() {
      return [...state.mods].sort((a, b) => a.sort - b.sort);
    },
    async listNews(includeUnpublished = false) {
      return state.news
        .filter(n => includeUnpublished || n.published)
        .sort((a, b) => (b.published_at ?? '9999').localeCompare(a.published_at ?? '9999'));
    },
    async getRules() {
      return [...state.rules].sort((a, b) => b.version - a.version)[0] ?? null;
    },
    async listGallery() {
      return [...state.gallery].sort((a, b) => a.sort - b.sort).map(g => ({...g, url: g.storage_path}));
    },

    async getAccount(): Promise<Account | null> {
      await ready;
      const u = me();
      if (!u) return null;
      return {
        id: u.id, email: u.email, email_confirmed: u.email_confirmed, nick: u.nick, mc_uuid: u.mc_uuid,
        selected_server_id: u.selected_server_id, nick_changed_at: u.nick_changed_at,
        avatar_style: u.avatar_style ?? 'wanderer',
        roles: state.staff.filter(s => s.user_id === u.id).map(s => ({role: s.role, server_id: s.server_id})),
      };
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async nickAvailable(nick) {
      await ready;
      return NICK_RE.test(nick) && nickFree(nick);
    },
    async signUp({nick, email, password}) {
      await ready;
      if (!NICK_RE.test(nick)) throw new AppError('nick_invalid');
      if (!nickFree(nick)) throw new AppError('nick_taken');
      if (state.users.some(u => u.email.toLowerCase() === email.toLowerCase())) throw new AppError('email_taken');
      const salt = uuid();
      const hash = await pbkdf2(password, salt);
      // Повторная проверка после await: вторая регистрация того же ника не проходит.
      if (!nickFree(nick)) throw new AppError('nick_taken');
      const user: DemoUser = {
        id: uuid(), email, nick, mc_uuid: uuid(), salt, hash, email_confirmed: false,
        selected_server_id: null, nick_changed_at: null, failed: [],
      };
      state.users.push(user);
      sendMail(user, 'confirm');
      persist();
    },
    async resendConfirmation(email) {
      const u = state.users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (u && !u.email_confirmed) {
        sendMail(u, 'confirm');
        persist();
      }
    },
    async demoConfirmEmail(token) {
      const u = consume(token, 'confirm');
      u.email_confirmed = true;
      persist();
    },
    async signIn(email, password) {
      await ready;
      const u = state.users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!u) throw new AppError('invalid_credentials');
      u.failed = u.failed.filter(t => t > Date.now() - 15 * 60_000);
      if (u.failed.length >= 5) throw new AppError('rate_limited');
      if ((await pbkdf2(password, u.salt)) !== u.hash) {
        u.failed.push(Date.now());
        persist();
        throw new AppError('invalid_credentials');
      }
      if (!u.email_confirmed) throw new AppError('email_not_confirmed');
      u.failed = [];
      state.session = {user_id: u.id, id: uuid(), created_at: nowIso()};
      persist();
      emit();
    },
    async signOut() {
      state.session = null;
      persist();
      emit();
    },
    async requestPasswordReset(email) {
      // Ответ одинаков для существующей и несуществующей почты.
      const u = state.users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (u) {
        sendMail(u, 'reset');
        persist();
      }
    },
    async completePasswordReset(newPassword, token) {
      const u = consume(token, 'reset');
      u.salt = uuid();
      u.hash = await pbkdf2(newPassword, u.salt);
      u.failed = [];
      if (state.session?.user_id === u.id) state.session = null;
      persist();
      emit();
    },
    async changePassword(current, next) {
      const u = requireUser();
      if ((await pbkdf2(current, u.salt)) !== u.hash) throw new AppError('wrong_password');
      u.salt = uuid();
      u.hash = await pbkdf2(next, u.salt);
      persist();
    },
    async changeNick(nick) {
      const u = requireUser();
      if (!NICK_RE.test(nick)) throw new AppError('nick_invalid');
      if (nick === u.nick) return;
      if (!nickFree(nick, u.id)) throw new AppError('nick_taken');
      const caseOnly = nick.toLowerCase() === u.nick.toLowerCase();
      if (!caseOnly && u.nick_changed_at && Date.parse(u.nick_changed_at) > Date.now() - 30 * 86_400_000) {
        throw new AppError('nick_cooldown');
      }
      audit('change_nick', `${u.nick} → ${nick}`);
      u.nick = nick; // mc_uuid не меняется
      if (!caseOnly) u.nick_changed_at = nowIso();
      state.staff.forEach(s => {
        if (s.user_id === u.id) s.nick = nick;
      });
      persist();
      emit();
    },
    async setSelectedServer(serverId) {
      const u = requireUser();
      if (serverId && !state.servers.some(s => s.id === serverId && s.published)) throw new AppError('unknown');
      u.selected_server_id = serverId;
      persist();
      emit();
    },
    async listSessions() {
      const s = state.session;
      requireUser();
      return s
        ? [{id: s.id, kind: 'site' as const, created_at: s.created_at, last_seen_at: nowIso(), label: 'Этот браузер (демо)', is_current: true}]
        : [];
    },
    async revokeSession(id) {
      if (state.session?.id === id) {
        state.session = null;
        persist();
        emit();
      }
    },
    async revokeOtherSessions() {
      requireUser();
    },

    async saveContent(name, row) {
      requireAdmin();
      const parsed = contentSchemas[name].parse(row) as {id: string; slug?: string};
      const rows = table(name) as {id: string; slug?: string}[];
      if (parsed.slug && rows.some(r => r.id !== parsed.id && r.slug === parsed.slug)) throw new AppError('slug_taken');
      if (name === 'news') {
        const n = parsed as unknown as NewsItem;
        if (n.published && !n.published_at) n.published_at = nowIso();
      }
      const i = rows.findIndex(r => r.id === parsed.id);
      audit(`${i >= 0 ? 'update' : 'insert'}:${name}`, parsed.id);
      if (i >= 0) rows[i] = parsed;
      else rows.push(parsed);
      persist();
    },
    async deleteContent(name, id) {
      requireAdmin();
      // Купленные товары остаются в истории заказов: заказ хранит своё название и цену.
      (state[name] as {id: string}[]) = table(name).filter(r => r.id !== id);
      if (name === 'modpacks') {
        state.mods = state.mods.filter(m => m.modpack_id !== id);
        state.servers.forEach(s => {
          if (s.modpack_id === id) s.modpack_id = null;
        });
      }
      audit(`delete:${name}`, id);
      persist();
    },
    async saveSettings(settings) {
      requireAdmin();
      state.settings = siteSettingsSchema.parse(settings);
      audit('update:site_settings', 'site');
      persist();
    },
    async publishRules(bodyMd, changeNote) {
      requireAdmin();
      const version = Math.max(0, ...state.rules.map(r => r.version)) + 1;
      state.rules.push({id: uuid(), version, body_md: bodyMd, change_note: changeNote, published_at: nowIso()});
      audit('insert:rules_versions', String(version));
      persist();
    },
    async addGalleryImage(file, meta: GalleryMeta) {
      requireAdmin();
      const storage_path = await readFile(file);
      const id = uuid();
      state.gallery.push({id, storage_path, ...meta});
      audit('insert:gallery_items', id);
      persist();
    },
    async replaceGalleryImage(id, file) {
      requireAdmin();
      const item = state.gallery.find(g => g.id === id);
      if (!item) throw new AppError('unknown');
      item.storage_path = await readFile(file);
      audit('update:gallery_items', id);
      persist();
    },
    async updateGalleryItem(id, meta) {
      requireAdmin();
      const item = state.gallery.find(g => g.id === id);
      if (!item) throw new AppError('unknown');
      Object.assign(item, meta);
      audit('update:gallery_items', id);
      persist();
    },
    async deleteGalleryItem(id) {
      requireAdmin();
      state.gallery = state.gallery.filter(g => g.id !== id);
      audit('delete:gallery_items', id);
      persist();
    },
    async listStaff() {
      requireAdmin();
      return state.staff;
    },
    async grantRole(nick, role, serverId) {
      const allowed = hasRole(['owner']) || (hasRole(['admin']) && (role === 'moderator' || role === 'support'));
      if (!allowed) throw new AppError('forbidden');
      if ((role === 'owner' || role === 'admin') && serverId) throw new AppError('role_must_be_global');
      const u = state.users.find(x => x.nick.toLowerCase() === nick.toLowerCase());
      if (!u) throw new AppError('user_not_found');
      if (!state.staff.some(s => s.user_id === u.id && s.role === role && s.server_id === serverId)) {
        state.staff.push({id: uuid(), user_id: u.id, nick: u.nick, role, server_id: serverId, created_at: nowIso()});
      }
      audit('grant_role', `${u.nick}: ${role}`);
      persist();
      emit();
    },
    async revokeRole(id) {
      const row = state.staff.find(s => s.id === id);
      if (!row) throw new AppError('unknown');
      const allowed = hasRole(['owner']) || (hasRole(['admin']) && (row.role === 'moderator' || row.role === 'support'));
      if (!allowed) throw new AppError('forbidden');
      if (row.role === 'owner' && state.staff.filter(s => s.role === 'owner').length <= 1) throw new AppError('last_owner');
      state.staff = state.staff.filter(s => s.id !== id);
      audit('revoke_role', `${row.nick}: ${row.role}`);
      persist();
      emit();
    },
    async listAudit() {
      requireAdmin();
      return state.audit;
    },

    // ---------- кабинет ----------
    async setAvatarStyle(style) {
      const u = requireUser();
      u.avatar_style = avatarStyleSchema.parse(style);
      persist();
      emit();
    },
    async listProducts(includeUnpublished = false) {
      if (includeUnpublished) requireAdmin();
      return state.products.filter(p => includeUnpublished || p.published).sort((a, b) => a.sort - b.sort);
    },
    async getWallet() {
      await ready;
      return balanceOf(requireUser().id);
    },
    async listLedger() {
      const u = requireUser();
      return state.ledger.filter(l => l.user_id === u.id).slice(0, 50).map(({user_id: _u, ...entry}) => entry);
    },
    async listOrders() {
      const u = requireUser();
      return state.orders.filter(o => o.user_id === u.id).map(publicOrder);
    },
    async getPrivilege() {
      const p = activePrivilege(requireUser().id);
      return p ? {product_id: p.product_id, title: p.title, tier: p.tier, expires_at: p.expires_at} : null;
    },
    async purchase(productId, serverId, key) {
      const u = requireUser();
      const product = state.products.find(p => p.id === productId && p.published);
      // Сервер выдачи определяет каталог; выбор покупателя учитывается только там, где каталог его допускает.
      const target = product?.kind === 'item' ? (product.server_id ?? serverId) : null;
      // Повтор запроса с тем же ключом возвращает прежний заказ и ничего не списывает.
      const prior = state.orders.find(o => o.user_id === u.id && o.key === key);
      if (prior) {
        if (prior.product_id !== productId || prior.server_id !== target) throw new AppError('idempotency_conflict');
        return publicOrder(prior);
      }
      if (!product) throw new AppError('product_unavailable');
      if (product.kind === 'item') {
        if (!target) throw new AppError('server_required');
        if (!state.servers.some(s => s.id === target && s.published)) throw new AppError('product_unavailable');
      }
      const current = activePrivilege(u.id);
      if (product.kind === 'privilege' && current && current.tier > product.tier) throw new AppError('privilege_lower');
      if (balanceOf(u.id) < product.price) throw new AppError('insufficient_funds');

      // Списание, заказ и привилегия меняются вместе; на сервере это одна транзакция.
      addLedger(u.id, -product.price, 'purchase', product.title);
      const order: DemoOrder = {
        id: uuid(), user_id: u.id, key, product_id: product.id, title: product.title, kind: product.kind,
        icon: product.icon, server_id: target, price: product.price,
        // Демо: игровой сервер не подключён, поэтому заказ остаётся в очереди выдачи.
        status: 'paid', created_at: nowIso(),
      };
      state.orders.unshift(order);
      if (product.kind === 'privilege') {
        const days = product.duration_days ?? 30;
        // Тот же ранг продлевается от текущего срока, ранг выше начинается с сегодняшнего дня.
        const from = current && current.tier === product.tier ? Date.parse(current.expires_at) : Date.now();
        state.privileges = state.privileges.filter(p => p.user_id !== u.id);
        state.privileges.push({
          user_id: u.id, product_id: product.id, title: product.title, tier: product.tier,
          expires_at: new Date(from + days * 86_400_000).toISOString(),
        });
      }
      persist();
      emit();
      return publicOrder(order);
    },
    async demoTopUp(amount) {
      const u = requireUser();
      if (!Number.isInteger(amount) || amount < DEMO_TOPUP_MIN || amount > DEMO_TOPUP_MAX) throw new AppError('amount_invalid');
      addLedger(u.id, amount, 'topup', 'Демо-пополнение без оплаты');
      persist();
      emit();
    },

    demoMailbox() {
      return state.mail;
    },
  };
}
