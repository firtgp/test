import {createClient, type AuthError, type PostgrestError, type SupabaseClient} from '@supabase/supabase-js';
import type {Backend, GalleryMeta} from './backend';
import {IMAGE_MAX_BYTES, IMAGE_TYPES} from './backend';
import {SETTINGS_KEY, seedSettings} from './seed';
import {
  AppError, avatarStyleSchema, contentSchemas, siteSettingsSchema,
  type Account, type GalleryItem, type Mod, type Modpack, type NewsItem, type RulesVersion,
  type Server, type ServerStatus, type ServerView, type StaffRole,
} from './types';

const AVATAR_KEY = 'mcsite-avatar-';
const DB_CODES = [
  'nick_taken', 'nick_invalid', 'nick_cooldown', 'forbidden', 'not_authenticated',
  'user_not_found', 'last_owner', 'role_must_be_global',
];

function fromDb(e: PostgrestError): AppError {
  const known = DB_CODES.find(c => e.message.includes(c));
  if (known) return new AppError(known);
  if (e.code === '23505') return new AppError('slug_taken');
  if (e.code === '42501') return new AppError('forbidden');
  return new AppError('unknown', e.message);
}

function fromAuth(e: AuthError): AppError {
  if (e.status === 429) return new AppError('rate_limited');
  switch (e.code) {
    case 'invalid_credentials': return new AppError('invalid_credentials');
    case 'email_not_confirmed': return new AppError('email_not_confirmed');
    case 'user_already_exists':
    case 'email_exists': return new AppError('email_taken');
    case 'weak_password': return new AppError('weak_password');
    case 'otp_expired':
    case 'session_not_found': return new AppError('token_invalid');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit': return new AppError('rate_limited');
  }
  if (e.name === 'AuthRetryableFetchError') return new AppError('network');
  return new AppError('unknown', e.message);
}

function check<T>(r: {data: T; error: PostgrestError | null}): T {
  if (r.error) throw fromDb(r.error);
  return r.data;
}

function checkImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type) || file.size > IMAGE_MAX_BYTES) throw new AppError('file_invalid');
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const db: SupabaseClient = createClient(url, anonKey);
  const origin = () => window.location.origin;
  const publicUrl = (path: string) => db.storage.from('media').getPublicUrl(path).data.publicUrl;

  async function upload(id: string, file: File): Promise<string> {
    checkImage(file);
    const ext = file.type.split('/')[1];
    const path = `gallery/${id}/${Date.now()}.${ext}`;
    const {error} = await db.storage.from('media').upload(path, file, {contentType: file.type, upsert: false});
    if (error) throw new AppError('unknown', error.message);
    return path;
  }

  return {
    mode: 'supabase',

    async getSettings() {
      const row = check(await db.from('site_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle());
      const parsed = siteSettingsSchema.safeParse({...seedSettings, ...(row?.value as object | undefined)});
      return parsed.success ? parsed.data : seedSettings;
    },

    async listServers(includeUnpublished = false) {
      let q = db.from('servers').select('*').order('sort');
      if (!includeUnpublished) q = q.eq('published', true);
      const [servers, modpacks, statuses, mods] = await Promise.all([
        q,
        db.from('modpacks').select('*'),
        db.from('server_status').select('*'),
        db.from('mods').select('modpack_id, name, is_key, sort').order('sort'),
      ]);
      const packs = check(modpacks) as Modpack[];
      const st = check(statuses) as ServerStatus[];
      const ms = check(mods) as Pick<Mod, 'modpack_id' | 'name' | 'is_key'>[];
      return (check(servers) as Server[]).map<ServerView>(s => {
        const own = ms.filter(m => m.modpack_id === s.modpack_id);
        return {
          ...s,
          modpack: packs.find(p => p.id === s.modpack_id) ?? null,
          status: st.find(x => x.server_id === s.id) ?? null,
          mod_count: own.length,
          key_mods: own.filter(m => m.is_key).map(m => m.name),
        };
      });
    },

    async listModpacks() {
      return check(await db.from('modpacks').select('*').order('name')) as Modpack[];
    },
    async listMods() {
      return check(await db.from('mods').select('*').order('sort')) as Mod[];
    },
    async listNews(includeUnpublished = false) {
      let q = db.from('news').select('*').order('published_at', {ascending: false, nullsFirst: true});
      if (!includeUnpublished) q = q.eq('published', true);
      return check(await q) as NewsItem[];
    },
    async getRules() {
      return check(
        await db.from('rules_versions').select('*').order('version', {ascending: false}).limit(1).maybeSingle(),
      ) as RulesVersion | null;
    },
    async listGallery() {
      const rows = check(await db.from('gallery_items').select('*').order('sort')) as Omit<GalleryItem, 'url'>[];
      return rows.map(r => ({...r, url: publicUrl(r.storage_path)}));
    },

    async getAccount() {
      const {data} = await db.auth.getSession();
      const user = data.session?.user;
      if (!user) return null;
      const [profile, roles] = await Promise.all([
        db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        db.from('staff_roles').select('role, server_id').eq('user_id', user.id),
      ]);
      const p = check(profile);
      if (!p) return null;
      return {
        id: user.id,
        email: user.email ?? '',
        email_confirmed: Boolean(user.email_confirmed_at),
        nick: p.nick,
        mc_uuid: p.mc_uuid,
        selected_server_id: p.selected_server_id,
        nick_changed_at: p.nick_changed_at,
        avatar_style: avatarStyleSchema.catch('wanderer').parse(localStorage.getItem(`${AVATAR_KEY}${user.id}`)),
        roles: (check(roles) ?? []) as Account['roles'],
      };
    },

    onAuthChange(cb) {
      const {data} = db.auth.onAuthStateChange(event => {
        cb(event === 'PASSWORD_RECOVERY' ? 'recovery' : 'change');
      });
      return () => data.subscription.unsubscribe();
    },

    async nickAvailable(nick) {
      return Boolean(check(await db.rpc('nick_available', {p_nick: nick})));
    },

    async signUp({nick, email, password}) {
      const {error} = await db.auth.signUp({
        email, password,
        options: {data: {nick}, emailRedirectTo: `${origin()}/login?confirmed=1`},
      });
      if (!error) return;
      // Занятый ник откатывает регистрацию в БД (триггер handle_new_user). Auth сообщает об этом
      // общей ошибкой, поэтому уточняем причину — в том числе для проигравшего в гонке.
      if (error.status === 500 || /database error|nick_taken/i.test(error.message)) {
        const free = await db.rpc('nick_available', {p_nick: nick});
        if (free.data === false) throw new AppError('nick_taken');
      }
      throw fromAuth(error);
    },

    async resendConfirmation(email) {
      const {error} = await db.auth.resend({
        type: 'signup', email, options: {emailRedirectTo: `${origin()}/login?confirmed=1`},
      });
      if (error) throw fromAuth(error);
    },

    async signIn(email, password) {
      const {error} = await db.auth.signInWithPassword({email, password});
      if (error) throw fromAuth(error);
    },
    async signOut() {
      const {error} = await db.auth.signOut({scope: 'local'});
      if (error) throw fromAuth(error);
    },
    async requestPasswordReset(email) {
      const {error} = await db.auth.resetPasswordForEmail(email, {redirectTo: `${origin()}/reset`});
      if (error) throw fromAuth(error);
    },
    async completePasswordReset(newPassword) {
      // Одноразовую ссылку обрабатывает Supabase Auth: к этому моменту открыта recovery-сессия.
      const {data} = await db.auth.getSession();
      if (!data.session) throw new AppError('token_invalid');
      const {error} = await db.auth.updateUser({password: newPassword});
      if (error) throw fromAuth(error);
      await db.auth.signOut({scope: 'others'});
      await db.rpc('revoke_my_launcher_sessions');
    },
    async changePassword(current, next) {
      const {data} = await db.auth.getUser();
      const email = data.user?.email;
      if (!email) throw new AppError('not_authenticated');
      const verify = await db.auth.signInWithPassword({email, password: current});
      if (verify.error) {
        throw verify.error.code === 'invalid_credentials' ? new AppError('wrong_password') : fromAuth(verify.error);
      }
      const {error} = await db.auth.updateUser({password: next});
      if (error) throw fromAuth(error);
      // Смена пароля закрывает остальные сессии сайта и все сессии лаунчера.
      await db.auth.signOut({scope: 'others'});
      check(await db.rpc('revoke_my_launcher_sessions'));
    },
    async changeNick(nick) {
      check(await db.rpc('change_nick', {p_nick: nick}));
    },
    async setSelectedServer(serverId) {
      check(await db.rpc('set_selected_server', {p_server: serverId}));
    },
    async listSessions() {
      return check(await db.rpc('my_sessions')) ?? [];
    },
    async revokeSession(id) {
      check(await db.rpc('revoke_my_session', {p_id: id}));
    },
    async revokeOtherSessions() {
      const {error} = await db.auth.signOut({scope: 'others'});
      if (error) throw fromAuth(error);
      check(await db.rpc('revoke_my_launcher_sessions'));
    },

    async saveContent(table, row) {
      const parsed = contentSchemas[table].parse(row);
      check(await db.from(table).upsert(parsed as Record<string, unknown>));
    },
    async deleteContent(table, id) {
      check(await db.from(table).delete().eq('id', id));
    },
    async saveSettings(settings) {
      const value = siteSettingsSchema.parse(settings);
      check(await db.from('site_settings').upsert({key: SETTINGS_KEY, value}));
    },
    async publishRules(bodyMd, changeNote) {
      check(await db.rpc('publish_rules', {p_body_md: bodyMd, p_change_note: changeNote}));
    },

    async addGalleryImage(file, meta: GalleryMeta) {
      const id = crypto.randomUUID();
      const storage_path = await upload(id, file);
      const r = await db.from('gallery_items').insert({id, storage_path, ...meta});
      if (r.error) {
        await db.storage.from('media').remove([storage_path]);
        throw fromDb(r.error);
      }
    },
    async replaceGalleryImage(id, file) {
      const old = check(await db.from('gallery_items').select('storage_path').eq('id', id).single());
      const storage_path = await upload(id, file);
      const r = await db.from('gallery_items').update({storage_path}).eq('id', id);
      if (r.error) {
        await db.storage.from('media').remove([storage_path]);
        throw fromDb(r.error);
      }
      if (old) await db.storage.from('media').remove([old.storage_path]);
    },
    async updateGalleryItem(id, meta) {
      check(await db.from('gallery_items').update(meta).eq('id', id));
    },
    async deleteGalleryItem(id) {
      const old = check(await db.from('gallery_items').select('storage_path').eq('id', id).single());
      check(await db.from('gallery_items').delete().eq('id', id));
      if (old) await db.storage.from('media').remove([old.storage_path]);
    },

    async listStaff() {
      return check(await db.rpc('list_staff')) ?? [];
    },
    async grantRole(nick, role: StaffRole, serverId) {
      check(await db.rpc('grant_staff_role', {p_nick: nick, p_role: role, p_server: serverId}));
    },
    async revokeRole(id) {
      check(await db.rpc('revoke_staff_role', {p_id: id}));
    },
    async listAudit() {
      const rows = check(
        await db.from('audit_log').select('id, actor, action, target, created_at').order('id', {ascending: false}).limit(100),
      ) as {id: number; actor: string | null; action: string; target: string | null; created_at: string}[];
      const ids = [...new Set(rows.map(r => r.actor).filter(Boolean))] as string[];
      const profiles = ids.length
        ? (check(await db.from('profiles').select('id, nick').in('id', ids)) as {id: string; nick: string}[])
        : [];
      return rows.map(r => ({
        id: r.id,
        actor_nick: profiles.find(p => p.id === r.actor)?.nick ?? null,
        action: r.action,
        target: r.target,
        created_at: r.created_at,
      }));
    },

    // ---------- кабинет ----------
    // Серверной части магазина и баланса в этой версии нет: интерфейс показывает это прямо.
    shop: false,
    // Образ персонажа — настройка внешнего вида сайта: хранится в этом браузере.
    async setAvatarStyle(style) {
      const {data} = await db.auth.getSession();
      if (!data.session) throw new AppError('not_authenticated');
      localStorage.setItem(`${AVATAR_KEY}${data.session.user.id}`, avatarStyleSchema.parse(style));
    },
    async listProducts() {
      return [];
    },
    async getWallet() {
      return 0;
    },
    async listLedger() {
      return [];
    },
    async listOrders() {
      return [];
    },
    async getPrivilege() {
      return null;
    },
    async purchase() {
      throw new AppError('shop_unavailable');
    },
  };
}
