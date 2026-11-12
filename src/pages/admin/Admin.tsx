import {useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Selector} from '@astryxdesign/core/Selector';
import {Tab, TabList} from '@astryxdesign/core/TabList';
import {Table} from '@astryxdesign/core/Table';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/VStack';
import {
  isStaffAdmin, keys, useAccount, useGallery, useInvalidate, useMods, useModpacks, useNews,
  useNotify, useProducts, useRules, useServers, useSettings,
} from '../../app/hooks';
import {formatDateTime, formatNumber} from '../../app/format';
import {backend} from '../../data';
import type {GalleryMeta} from '../../data/backend';
import {
  COMPLIANCE_LABEL, LOADER_LABEL, NEWS_KIND_LABEL, REDISTRIBUTION_LABEL, STAFF_ROLE_LABEL, errorText, modSchema,
  modpackSchema, newsSchema, productSchema, serverSchema, siteSettingsSchema,
  type AuditEntry, type GalleryItem, type Mod, type Modpack, type NewsItem, type Product, type Server,
  type SiteSettings, type StaffEntry, type StaffRole,
} from '../../data/types';
import {Async, Page} from '../../components/Page';
import {ITEM_ICON_LABEL, SCENE_LABEL} from '../../scenes/meta';
import {z} from 'zod';
import {CrudTab} from './Crud';

const opts = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({value, label}));

function ServersTab() {
  const servers = useServers(true);
  const modpacks = useModpacks().data ?? [];
  const invalidate = useInvalidate();
  return (
    <Async query={servers}>
      {rows => (
        <CrudTab<Server>
          title="Серверы"
          hint="Статус и онлайн приходят от воркера мониторинга и здесь не редактируются."
          addLabel="Добавить сервер"
          rows={rows}
          schema={serverSchema}
          describe={r => r.name}
          makeNew={() => ({
            id: crypto.randomUUID(), slug: '', name: '', modpack_id: null, host: '', port: 25565, mode: '',
            tagline: '', description_md: '', wipe_policy: '', launched_at: null, next_wipe_at: null,
            accent: '#F2B544', scene: 'survival', status_mode: 'auto', maintenance_note: '', sort: rows.length + 1, published: false,
          })}
          save={async r => {
            await backend.saveContent('servers', r);
            await invalidate('servers');
          }}
          remove={async id => {
            await backend.deleteContent('servers', id);
            await invalidate('servers');
          }}
          columns={[
            {key: 'name', header: 'Сервер', render: r => r.name},
            {key: 'host', header: 'Адрес', render: r => `${r.host}:${r.port}`},
            {key: 'pack', header: 'Сборка', render: r => modpacks.find(m => m.id === r.modpack_id)?.name ?? 'Не указана'},
            {key: 'state', header: 'Состояние', render: r => `${r.published ? 'Опубликован' : 'Черновик'}${r.status_mode === 'maintenance' ? ', техработы' : ''}`},
          ]}
          fields={[
            {name: 'name', label: 'Название', type: 'text'},
            {name: 'slug', label: 'Адрес страницы (slug)', type: 'text', description: 'Строчные латинские буквы, цифры и дефис.'},
            {name: 'modpack_id', label: 'Сборка', type: 'select', nullable: true, options: modpacks.map(m => ({value: m.id, label: m.name}))},
            {name: 'host', label: 'Хост игрового сервера', type: 'text'},
            {name: 'port', label: 'Порт', type: 'number'},
            {name: 'mode', label: 'Режим', type: 'text'},
            {name: 'tagline', label: 'Короткое описание', type: 'text'},
            {name: 'description_md', label: 'Описание (Markdown)', type: 'textarea'},
            {name: 'wipe_policy', label: 'Политика вайпов', type: 'text'},
            {name: 'launched_at', label: 'Дата запуска', type: 'date', nullable: true},
            {name: 'next_wipe_at', label: 'Ближайший вайп', type: 'datetime', nullable: true},
            {name: 'accent', label: 'Акцент сборки', type: 'text', description: 'Цвет #RRGGBB. Применяется только на карточке и странице сервера.'},
            {name: 'scene', label: 'Сцена на главной', type: 'select', options: opts(SCENE_LABEL), description: 'Мир из блоков на панели сервера.'},
            {name: 'status_mode', label: 'Режим статуса', type: 'select', options: [{value: 'auto', label: 'По мониторингу'}, {value: 'maintenance', label: 'Техработы'}]},
            {name: 'maintenance_note', label: 'Пояснение к техработам', type: 'text'},
            {name: 'sort', label: 'Порядок', type: 'number'},
            {name: 'published', label: 'Опубликован', type: 'switch'},
          ]}
        />
      )}
    </Async>
  );
}

function ModpacksTab() {
  const modpacks = useModpacks();
  const mods = useMods();
  const invalidate = useInvalidate();
  const [packId, setPackId] = useState('');
  const packs = modpacks.data ?? [];
  const current = packs.find(p => p.id === packId) ?? packs[0];
  const own = (mods.data ?? []).filter(m => m.modpack_id === current?.id);
  const blocking = own.filter(m => m.redistribution !== 'allowed').length;
  return (
    <VStack gap={8}>
      <Async query={modpacks}>
        {rows => (
          <CrudTab<Modpack>
            title="Сборки"
            addLabel="Добавить сборку"
            rows={rows}
            schema={modpackSchema}
            describe={r => r.name}
            makeNew={() => ({
              id: crypto.randomUUID(), slug: '', name: '', loader: 'neoforge', mc_version: '', loader_version: null,
              java_version: null, ram_min_mb: null, ram_recommended_mb: null, summary: '',
            })}
            save={async r => {
              await backend.saveContent('modpacks', r);
              await invalidate('modpacks', 'servers');
            }}
            remove={async id => {
              await backend.deleteContent('modpacks', id);
              await invalidate('modpacks', 'mods', 'servers');
            }}
            columns={[
              {key: 'name', header: 'Сборка', render: r => r.name},
              {key: 'loader', header: 'Загрузчик', render: r => `${LOADER_LABEL[r.loader]} ${r.mc_version}`},
              {key: 'java', header: 'Java', render: r => (r.java_version ? String(r.java_version) : 'Не указана')},
            ]}
            fields={[
              {name: 'name', label: 'Название', type: 'text'},
              {name: 'slug', label: 'Идентификатор (slug)', type: 'text'},
              {name: 'loader', label: 'Загрузчик', type: 'select', options: opts(LOADER_LABEL)},
              {name: 'mc_version', label: 'Версия Minecraft', type: 'text'},
              {name: 'loader_version', label: 'Версия загрузчика', type: 'text', nullable: true},
              {name: 'java_version', label: 'Версия Java', type: 'number', nullable: true},
              {name: 'ram_min_mb', label: 'Память, минимум (МБ)', type: 'number', nullable: true, description: 'Берите из реальных замеров сборки.'},
              {name: 'ram_recommended_mb', label: 'Память, рекомендуется (МБ)', type: 'number', nullable: true},
              {name: 'summary', label: 'Описание', type: 'textarea'},
            ]}
          />
        )}
      </Async>

      {current ? (
        <Async query={mods}>
          {() => (
            <CrudTab<Mod>
              title={`Моды сборки «${current.name}»`}
              hint="Список ведите по файлам сборки. Мод без подтверждённого права на распространение нельзя раздавать через лаунчер."
              addLabel="Добавить мод"
              rows={own}
              schema={modSchema}
              describe={r => r.name}
              extra={
                <VStack gap={3}>
                  <Selector
                    label="Сборка"
                    value={current.id}
                    onChange={setPackId}
                    options={packs.map(p => ({value: p.id, label: p.name}))}
                  />
                  {blocking > 0 ? (
                    <Banner
                      status="warning"
                      title={`Раздача заблокирована: у ${blocking} из ${own.length} модов не подтверждено право на распространение`}
                      description="Укажите лицензию и ссылку на разрешение для каждого мода, прежде чем включать его в профиль лаунчера."
                    />
                  ) : null}
                </VStack>
              }
              makeNew={() => ({
                id: crypto.randomUUID(), modpack_id: current.id, name: '', version: null, homepage_url: null,
                source: null, license: null, redistribution: 'unknown', permission_url: null, is_key: false,
                sort: own.length + 1,
              })}
              save={async r => {
                await backend.saveContent('mods', r);
                await invalidate('mods', 'servers');
              }}
              remove={async id => {
                await backend.deleteContent('mods', id);
                await invalidate('mods', 'servers');
              }}
              columns={[
                {key: 'name', header: 'Мод', render: r => r.name + (r.is_key ? ' (ключевой)' : '')},
                {key: 'version', header: 'Версия', render: r => r.version ?? 'Не указана'},
                {key: 'license', header: 'Лицензия', render: r => r.license ?? 'Не указана'},
                {key: 'redistribution', header: 'Распространение', render: r => REDISTRIBUTION_LABEL[r.redistribution]},
              ]}
              fields={[
                {name: 'name', label: 'Название', type: 'text'},
                {name: 'version', label: 'Версия', type: 'text', nullable: true},
                {name: 'homepage_url', label: 'Официальная страница', type: 'text', nullable: true, description: 'Ссылка https:// на страницу мода.'},
                {name: 'source', label: 'Источник файла', type: 'text', nullable: true},
                {name: 'license', label: 'Лицензия', type: 'text', nullable: true},
                {name: 'redistribution', label: 'Право на распространение', type: 'select', options: opts(REDISTRIBUTION_LABEL)},
                {name: 'permission_url', label: 'Ссылка на разрешение', type: 'text', nullable: true},
                {name: 'is_key', label: 'Ключевой мод (показывать на карточке)', type: 'switch'},
                {name: 'sort', label: 'Порядок', type: 'number'},
              ]}
            />
          )}
        </Async>
      ) : null}
    </VStack>
  );
}

function NewsTab() {
  const news = useNews(true);
  const servers = useServers(true).data ?? [];
  const settings = useSettings();
  const invalidate = useInvalidate();
  return (
    <Async query={news}>
      {rows => (
        <CrudTab<NewsItem>
          title="Новости и вайпы"
          addLabel="Добавить новость"
          rows={rows}
          schema={newsSchema}
          describe={r => r.title}
          makeNew={() => ({
            id: crypto.randomUUID(), slug: '', title: '', kind: 'news', server_id: null, summary: '',
            body_md: '', event_at: null, published: false, published_at: null,
          })}
          save={async r => {
            await backend.saveContent('news', r);
            await invalidate('news');
          }}
          remove={async id => {
            await backend.deleteContent('news', id);
            await invalidate('news');
          }}
          columns={[
            {key: 'title', header: 'Заголовок', render: r => r.title},
            {key: 'kind', header: 'Тип', render: r => NEWS_KIND_LABEL[r.kind]},
            {key: 'event', header: 'Событие', render: r => (r.event_at ? formatDateTime(r.event_at, settings) : 'Без даты')},
            {key: 'state', header: 'Состояние', render: r => (r.published ? 'Опубликована' : 'Черновик')},
          ]}
          fields={[
            {name: 'title', label: 'Заголовок', type: 'text'},
            {name: 'slug', label: 'Адрес страницы (slug)', type: 'text'},
            {name: 'kind', label: 'Тип', type: 'select', options: opts(NEWS_KIND_LABEL)},
            {name: 'server_id', label: 'Сервер', type: 'select', nullable: true, options: servers.map(s => ({value: s.id, label: s.name}))},
            {name: 'summary', label: 'Кратко', type: 'text'},
            {name: 'body_md', label: 'Текст (Markdown)', type: 'textarea'},
            {name: 'event_at', label: 'Дата события', type: 'datetime', nullable: true, description: 'Для вайпа, запуска или ивента.'},
            {name: 'published', label: 'Опубликована', type: 'switch'},
          ]}
        />
      )}
    </Async>
  );
}

function RulesTab() {
  const rules = useRules();
  const settings = useSettings();
  const invalidate = useInvalidate();
  const notify = useNotify();
  const [body, setBody] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = rules.data;
  const text = body ?? current?.body_md ?? '';
  return (
    <Async query={rules}>
      {() => (
        <VStack gap={4}>
          <Text type="large" weight="bold">
            Правила
          </Text>
          <Text color="secondary">
            {current
              ? `Действует редакция ${current.version} от ${formatDateTime(current.published_at, settings)}. Опубликованная редакция не меняется — выпускается новая.`
              : 'Правила ещё не опубликованы.'}
          </Text>
          <TextArea label="Текст правил (Markdown)" rows={18} value={text} onChange={setBody} />
          <TextInput label="Что изменилось" description="Покажем игрокам рядом с номером редакции." value={note} onChange={setNote} />
          <HStack>
            <Button
              label="Опубликовать новую редакцию"
              variant="primary"
              isDisabled={!text.trim() || text === current?.body_md}
              onClick={() => setConfirm(true)}
            />
          </HStack>
          <AlertDialog
            isOpen={confirm}
            onOpenChange={setConfirm}
            title={`Опубликовать редакцию ${(current?.version ?? 0) + 1}?`}
            description="Новая редакция сразу станет видна всем посетителям."
            actionLabel="Опубликовать"
            cancelLabel="Отмена"
            actionVariant="primary"
            isActionLoading={busy}
            onAction={async () => {
              setBusy(true);
              try {
                await backend.publishRules(text, note);
                await invalidate('rules');
                setBody(null);
                setNote('');
                notify.ok('Новая редакция правил опубликована');
              } catch (e) {
                notify.fail(e);
              } finally {
                setBusy(false);
                setConfirm(false);
              }
            }}
          />
        </VStack>
      )}
    </Async>
  );
}

const EMPTY_META: GalleryMeta = {
  server_id: null, alt: '', caption: '', build_version: '', shaders: '', resourcepack: '', origin_note: '', sort: 0,
};

function GalleryCard({item, servers}: {item: GalleryItem; servers: {id: string; name: string}[]}) {
  const invalidate = useInvalidate();
  const notify = useNotify();
  const [meta, setMeta] = useState<GalleryMeta>({
    server_id: item.server_id, alt: item.alt, caption: item.caption, build_version: item.build_version,
    shaders: item.shaders, resourcepack: item.resourcepack, origin_note: item.origin_note, sort: item.sort,
  });
  const [confirm, setConfirm] = useState(false);
  const run = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      await invalidate('gallery');
      notify.ok(ok);
    } catch (e) {
      notify.fail(e);
    }
  };
  return (
    <VStack gap={3} className="mc-tile" as="article" aria-label={`Изображение: ${item.caption || item.id}`}>
      <AspectRatio ratio={16 / 9}>
        <img className="mc-gallery-img" src={item.url} alt={item.alt || 'Изображение галереи'} />
      </AspectRatio>
      <TextInput label="Подпись" value={meta.caption} onChange={v => setMeta({...meta, caption: v})} />
      <TextInput label="Описание для незрячих (alt)" value={meta.alt} onChange={v => setMeta({...meta, alt: v})} />
      <Selector
        label="Сервер"
        placeholder="Общий кадр"
        hasClear
        value={meta.server_id ?? ''}
        options={servers.map(s => ({value: s.id, label: s.name}))}
        onChange={v => setMeta({...meta, server_id: v || null})}
      />
      <TextInput label="Версия сборки на кадре" value={meta.build_version} onChange={v => setMeta({...meta, build_version: v})} />
      <TextInput label="Шейдеры" value={meta.shaders} onChange={v => setMeta({...meta, shaders: v})} />
      <TextInput label="Ресурспак" value={meta.resourcepack} onChange={v => setMeta({...meta, resourcepack: v})} />
      <TextInput label="Происхождение кадра" description="Кто и где снял. Чужие материалы не публикуются как свои." value={meta.origin_note} onChange={v => setMeta({...meta, origin_note: v})} />
      <TextInput
        label="Порядок"
        inputMode="numeric"
        value={String(meta.sort)}
        onChange={v => setMeta({...meta, sort: Number.parseInt(v, 10) || 0})}
      />
      <FileInput
        label="Заменить файл"
        description="Заменится только это изображение."
        accept="image/png,image/jpeg,image/webp,image/avif"
        value={null}
        onChange={f => {
          const file = Array.isArray(f) ? f[0] : f;
          if (file) run(() => backend.replaceGalleryImage(item.id, file), 'Изображение заменено');
        }}
      />
      <HStack gap={2} wrap="wrap">
        <Button label="Сохранить подписи" variant="secondary" clickAction={() => run(() => backend.updateGalleryItem(item.id, meta), 'Сохранено')} />
        <Button label="Удалить" variant="ghost" onClick={() => setConfirm(true)} />
      </HStack>
      <AlertDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title="Удалить изображение?"
        description="Файл и подписи будут удалены. Остальные изображения не изменятся."
        actionLabel="Удалить"
        cancelLabel="Отмена"
        actionVariant="destructive"
        onAction={async () => {
          await run(() => backend.deleteGalleryItem(item.id), 'Удалено');
          setConfirm(false);
        }}
      />
    </VStack>
  );
}

function GalleryTab() {
  const gallery = useGallery();
  const servers = useServers(true).data ?? [];
  const invalidate = useInvalidate();
  const notify = useNotify();
  return (
    <Async query={gallery}>
      {items => (
        <VStack gap={4}>
          <Text type="large" weight="bold">
            Галерея
          </Text>
          <Text color="secondary">
            Только собственные скриншоты и рендеры миров проекта. У каждого изображения свой файл: замена одного
            не затрагивает остальные.
          </Text>
          <FileInput
            label="Добавить изображение"
            description="PNG, JPEG, WebP или AVIF до 8 МБ."
            accept="image/png,image/jpeg,image/webp,image/avif"
            mode="dropzone"
            value={null}
            onChange={async f => {
              const file = Array.isArray(f) ? f[0] : f;
              if (!file) return;
              try {
                await backend.addGalleryImage(file, {...EMPTY_META, sort: items.length + 1});
                await invalidate('gallery');
                notify.ok('Изображение добавлено');
              } catch (e) {
                notify.fail(e);
              }
            }}
          />
          {items.length === 0 ? (
            <Text color="secondary">Изображений пока нет. На сайте вместо них стоит заглушка.</Text>
          ) : (
            <Grid columns={{minWidth: 300, max: 3}} gap={4}>
              {items.map(i => (
                <GalleryCard key={i.id} item={i} servers={servers} />
              ))}
            </Grid>
          )}
        </VStack>
      )}
    </Async>
  );
}

function StaffTab() {
  const staff = useQuery({queryKey: keys.staff, queryFn: () => backend.listStaff()});
  const servers = useServers(true).data ?? [];
  const invalidate = useInvalidate();
  const notify = useNotify();
  const [nick, setNick] = useState('');
  const [role, setRole] = useState<StaffRole>('moderator');
  const [serverId, setServerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toRevoke, setToRevoke] = useState<StaffEntry | null>(null);
  const scoped = role === 'moderator' || role === 'support';

  async function grant() {
    setError(null);
    if (!nick.trim()) return setError('Укажите ник игрока.');
    try {
      await backend.grantRole(nick.trim(), role, scoped && serverId ? serverId : null);
      await invalidate('staff', 'account');
      setNick('');
      notify.ok('Роль выдана');
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <Async query={staff}>
      {rows => (
        <VStack gap={4}>
          <Text type="large" weight="bold">
            Персонал
          </Text>
          <Text color="secondary">
            Владелец выдаёт любые роли, администратор — модератора и поддержку. Модератору можно ограничить права
            одним сервером.
          </Text>
          <Table<StaffEntry>
            data={rows}
            idKey="id"
            density="compact"
            columns={[
              {key: 'nick', header: 'Игрок', renderCell: r => <Text>{r.nick}</Text>},
              {key: 'role', header: 'Роль', renderCell: r => <Text>{STAFF_ROLE_LABEL[r.role]}</Text>},
              {
                key: 'scope', header: 'Где действует',
                renderCell: r => <Text>{r.server_id ? (servers.find(s => s.id === r.server_id)?.name ?? 'Сервер') : 'Весь проект'}</Text>,
              },
              {
                key: 'act', header: 'Действия',
                renderCell: r => <Button label="Снять роль" variant="ghost" size="sm" onClick={() => setToRevoke(r)} />,
              },
            ]}
          />
          <VStack gap={3} className="mc-tile">
            <Text weight="bold">Выдать роль</Text>
            {error ? (
              <div role="alert">
                <Banner status="error" title={error} />
              </div>
            ) : null}
            <TextInput label="Ник игрока" value={nick} onChange={setNick} autoCapitalize="none" hasSpellCheck={false} />
            <Selector label="Роль" value={role} onChange={v => setRole(v as StaffRole)} options={opts(STAFF_ROLE_LABEL)} />
            {scoped ? (
              <Selector
                label="Сервер"
                placeholder="Весь проект"
                hasClear
                value={serverId}
                onChange={v => setServerId(v ?? '')}
                options={servers.map(s => ({value: s.id, label: s.name}))}
              />
            ) : null}
            <HStack>
              <Button label="Выдать роль" variant="primary" clickAction={grant} />
            </HStack>
          </VStack>
          <AlertDialog
            isOpen={toRevoke !== null}
            onOpenChange={o => !o && setToRevoke(null)}
            title="Снять роль?"
            description={toRevoke ? `${toRevoke.nick} потеряет роль «${STAFF_ROLE_LABEL[toRevoke.role]}».` : ''}
            actionLabel="Снять роль"
            cancelLabel="Отмена"
            actionVariant="destructive"
            onAction={async () => {
              if (!toRevoke) return;
              try {
                await backend.revokeRole(toRevoke.id);
                await invalidate('staff', 'account');
                notify.ok('Роль снята');
              } catch (e) {
                notify.fail(e);
              } finally {
                setToRevoke(null);
              }
            }}
          />
        </VStack>
      )}
    </Async>
  );
}

const SETTINGS_FIELDS: {name: keyof SiteSettings; label: string; description?: string}[] = [
  {name: 'project_name', label: 'Название проекта', description: '«Minecraft» не может быть основным названием проекта.'},
  {name: 'hero_title', label: 'Заголовок первого экрана'},
  {name: 'hero_lead', label: 'Пояснение под заголовком'},
  {name: 'timezone', label: 'Часовой пояс (IANA)', description: 'Например, Europe/Moscow. В нём показываются вайпы и ивенты.'},
  {name: 'timezone_label', label: 'Подпись пояса', description: 'Например, МСК.'},
  {name: 'launcher_name', label: 'Название лаунчера'},
  {name: 'launcher_windows_url', label: 'Лаунчер для Windows (https://)'},
  {name: 'launcher_macos_url', label: 'Лаунчер для macOS (https://)'},
  {name: 'launcher_linux_url', label: 'Лаунчер для Linux (https://)'},
  {name: 'discord_url', label: 'Discord (https://)'},
  {name: 'telegram_url', label: 'Telegram (https://)'},
  {name: 'vk_url', label: 'ВКонтакте (https://)'},
  {name: 'contact_email', label: 'Почта для связи'},
  {name: 'currency_name', label: 'Внутренняя валюта: название', description: 'Например, «Искры». Показывается в кабинете и магазине.'},
  {name: 'currency_one', label: 'Валюта: форма для 1', description: 'Например, «искра».'},
  {name: 'currency_few', label: 'Валюта: форма для 2–4', description: 'Например, «искры».'},
  {name: 'currency_many', label: 'Валюта: форма для 5 и больше', description: 'Например, «искр».'},
];

function SettingsTab() {
  const saved = useSettings();
  const invalidate = useInvalidate();
  const notify = useNotify();
  const [draft, setDraft] = useState<SiteSettings>(saved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => setDraft(saved), [saved]);

  async function save() {
    const parsed = siteSettingsSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), i.message])));
      return;
    }
    try {
      new Intl.DateTimeFormat('ru', {timeZone: parsed.data.timezone});
    } catch {
      setErrors({timezone: 'Такого часового пояса нет. Пример: Europe/Moscow'});
      return;
    }
    setErrors({});
    try {
      await backend.saveSettings(parsed.data);
      await invalidate('settings');
      notify.ok('Настройки сохранены');
    } catch (e) {
      notify.fail(e);
    }
  }

  return (
    <VStack gap={4}>
      <Text type="large" weight="bold">
        Настройки сайта
      </Text>
      {SETTINGS_FIELDS.map(f => (
        <TextInput
          key={f.name}
          label={f.label}
          description={f.description}
          value={String(draft[f.name] ?? '')}
          onChange={v => setDraft({...draft, [f.name]: v})}
          status={errors[f.name] ? {type: 'error', message: errors[f.name]} : undefined}
        />
      ))}
      <Selector
        label="Модель аккаунтов"
        description="Решение владельца. От него зависят регистрация, скины и защита ников."
        value={draft.account_model}
        onChange={v => setDraft({...draft, account_model: v as SiteSettings['account_model']})}
        options={[
          {value: 'launcher', label: 'Своя авторизация через лаунчер'},
          {value: 'microsoft', label: 'Лицензионные аккаунты Microsoft'},
        ]}
      />
      <HStack>
        <Button label="Сохранить настройки" variant="primary" clickAction={save} />
      </HStack>
    </VStack>
  );
}

function AuditTab() {
  const audit = useQuery({queryKey: keys.audit, queryFn: () => backend.listAudit()});
  const settings = useSettings();
  return (
    <Async query={audit}>
      {rows => (
        <VStack gap={4}>
          <Text type="large" weight="bold">
            Журнал действий
          </Text>
          {rows.length === 0 ? (
            <Text color="secondary">Записей пока нет.</Text>
          ) : (
            <Table<AuditEntry>
              data={rows}
              idKey="id"
              density="compact"
              columns={[
                {key: 'when', header: 'Когда', renderCell: r => <Text>{formatDateTime(r.created_at, settings)}</Text>},
                {key: 'who', header: 'Кто', renderCell: r => <Text>{r.actor_nick ?? 'Система'}</Text>},
                {key: 'action', header: 'Действие', renderCell: r => <Text>{r.action}</Text>},
                {key: 'target', header: 'Объект', renderCell: r => <Text className="mc-wrap">{r.target ?? ''}</Text>},
              ]}
            />
          )}
        </VStack>
      )}
    </Async>
  );
}

type ProductForm = Omit<Product, 'perks'> & {perks: string};
// В форме бонусы ранга вводятся по одному в строке; в каталоге хранятся списком.
const productFormSchema = productSchema.extend({perks: z.string().max(2400)}) as unknown as z.ZodType<ProductForm>;

function ProductsTab() {
  const products = useProducts(true);
  const servers = useServers(true).data ?? [];
  const invalidate = useInvalidate();
  return (
    <Async query={products}>
      {rows => (
        <CrudTab<ProductForm>
          title="Товары и ранги"
          hint="Цена указывается во внутренней валюте. Покупатель видит только опубликованные товары."
          addLabel="Добавить товар"
          rows={rows.map(p => ({...p, perks: p.perks.join('\n')}))}
          schema={productFormSchema}
          describe={r => r.title}
          extra={
            <Banner
              status="warning"
              title="Перед подключением оплаты сверьте каталог с правилами Mojang"
              description="Раздел «Servers and hosting» в Minecraft Usage Guidelines. Товары с отметкой «Игровой предмет» и «Не проверено» могут нарушать правила. Плащи и азартные механики не продаются, платный доступ к серверу стоит одинаково для всех."
            />
          }
          makeNew={() => ({
            id: crypto.randomUUID(), slug: '', kind: 'item', title: '', description: '', price: 100, server_id: null, mod_name: '',
            icon: 'chest', tier: 0, duration_days: null, perks: '', compliance: 'unchecked', sort: rows.length + 1, published: false,
          })}
          save={async r => {
            await backend.saveContent('products', {...r, perks: r.perks.split('\n').map(x => x.trim()).filter(Boolean)});
            await invalidate('products');
          }}
          remove={async id => {
            await backend.deleteContent('products', id);
            await invalidate('products');
          }}
          columns={[
            {key: 'title', header: 'Товар', render: r => r.title},
            {key: 'kind', header: 'Тип', render: r => (r.kind === 'item' ? 'Предмет' : `Ранг ${r.tier}`)},
            {key: 'price', header: 'Цена', render: r => formatNumber(r.price)},
            {key: 'server', header: 'Сервер', render: r => (r.kind === 'privilege' ? 'Все' : (servers.find(s => s.id === r.server_id)?.name ?? 'Любой'))},
            {key: 'compliance', header: 'Проверка', render: r => COMPLIANCE_LABEL[r.compliance]},
            {key: 'state', header: 'Состояние', render: r => (r.published ? 'Опубликован' : 'Черновик')},
          ]}
          fields={[
            {name: 'title', label: 'Название', type: 'text'},
            {name: 'slug', label: 'Код товара (slug)', type: 'text', description: 'Строчные латинские буквы, цифры и дефис.'},
            {name: 'kind', label: 'Тип', type: 'select', options: [{value: 'item', label: 'Предмет'}, {value: 'privilege', label: 'Ранг (привилегия)'}]},
            {name: 'description', label: 'Описание', type: 'textarea'},
            {name: 'price', label: 'Цена во внутренней валюте', type: 'number'},
            {name: 'server_id', label: 'Сервер выдачи', type: 'select', nullable: true, options: servers.map(s => ({value: s.id, label: s.name})), description: 'Пусто — покупатель выбирает сервер сам. Для ранга оставьте пустым.'},
            {name: 'mod_name', label: 'Мод', type: 'text', description: 'Из какого мода предмет. Можно оставить пустым.'},
            {name: 'icon', label: 'Иконка', type: 'select', options: opts(ITEM_ICON_LABEL)},
            {name: 'tier', label: 'Ступень ранга', type: 'number', description: 'Для ранга — от 1 до 3, для предмета — 0.'},
            {name: 'duration_days', label: 'Срок ранга, дней', type: 'number', nullable: true},
            {name: 'perks', label: 'Бонусы ранга', type: 'textarea', description: 'По одному в строке.'},
            {name: 'compliance', label: 'Проверка по правилам Mojang', type: 'select', options: opts(COMPLIANCE_LABEL), description: 'Отметку ставит владелец после сверки с действующим текстом правил.'},
            {name: 'sort', label: 'Порядок', type: 'number'},
            {name: 'published', label: 'Опубликован', type: 'switch'},
          ]}
        />
      )}
    </Async>
  );
}

const TABS = [
  {value: 'servers', label: 'Серверы', el: <ServersTab />},
  {value: 'modpacks', label: 'Сборки и моды', el: <ModpacksTab />},
  {value: 'news', label: 'Новости', el: <NewsTab />},
  {value: 'rules', label: 'Правила', el: <RulesTab />},
  {value: 'gallery', label: 'Галерея', el: <GalleryTab />},
  {value: 'staff', label: 'Персонал', el: <StaffTab />},
  {value: 'settings', label: 'Настройки', el: <SettingsTab />},
  {value: 'audit', label: 'Журнал', el: <AuditTab />},
];

export function AdminPage() {
  const account = useAccount();
  const [tab, setTab] = useState('servers');
  const allowed = isStaffAdmin(account.data);
  // Вкладка товаров есть только там, где работает магазин.
  const tabs = backend.shop ? [...TABS.slice(0, 3), {value: 'products', label: 'Товары', el: <ProductsTab />}, ...TABS.slice(3)] : TABS;
  return (
    <Page title="Админка">
      <Async query={account}>
        {a =>
          !a ? (
            <Banner
              status="warning"
              title="Войдите, чтобы открыть админку"
              endContent={<Button label="Войти" href="/login" variant="secondary" />}
            />
          ) : !allowed ? (
            // Интерфейс лишь скрывает раздел; сами права проверяет сервер (RLS и RPC).
            <Banner status="error" title="Недостаточно прав" description="Админка доступна владельцу и администраторам проекта." />
          ) : (
            <VStack gap={6}>
              <TabList value={tab} onChange={setTab} role="tablist">
                {tabs.map(t => (
                  <Tab key={t.value} value={t.value} label={t.label} panelId="admin-panel" />
                ))}
              </TabList>
              <VStack gap={0} id="admin-panel" role="tabpanel" aria-label={tabs.find(t => t.value === tab)?.label}>
                {tabs.find(t => t.value === tab)?.el}
              </VStack>
            </VStack>
          )
        }
      </Async>
    </Page>
  );
}
