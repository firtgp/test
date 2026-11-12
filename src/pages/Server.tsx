import {useEffect} from 'react';
import {useParams} from 'react-router';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Markdown} from '@astryxdesign/core/Markdown';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Table} from '@astryxdesign/core/Table';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {useGallery, useMods, useNow, useServers, useSettings} from '../app/hooks';
import {formatDate, formatDateTime, formatRam, serverAddress} from '../app/format';
import {deriveStatus} from '../data/status';
import {LOADER_LABEL, type Mod} from '../data/types';
import {CopyAddress} from '../components/CopyAddress';
import {CtaLink, startPath} from '../components/CtaLink';
import {Async} from '../components/Page';
import {accentStyle, packLine} from '../components/ServerCard';
import {StatusLine} from '../components/StatusLine';
import {NotFoundPage} from './NotFound';

export function ServerPage() {
  const {slug} = useParams();
  const settings = useSettings();
  const servers = useServers();
  const mods = useMods();
  const gallery = useGallery();
  const now = useNow();
  const server = servers.data?.find(s => s.slug === slug);
  useEffect(() => {
    if (server) document.title = `${server.name} — ${settings.project_name}`;
  }, [server, settings.project_name]);

  return (
    <VStack className="mc-page" gap={8}>
      <Async query={servers} skeletonHeight={220}>
        {() => {
          if (!server) return <NotFoundPage what="Сервер" />;
          const pack = server.modpack;
          const status = deriveStatus(server, server.status, now);
          const own = (mods.data ?? []).filter(m => m.modpack_id === server.modpack_id);
          const shots = (gallery.data ?? []).filter(g => g.server_id === server.id);
          const address = serverAddress(server.host, server.port);
          return (
            <>
              <VStack gap={4} className="mc-accent-band" style={accentStyle(server.accent)}>
                <Link href="/servers">← Все серверы</Link>
                <Heading level={1}>{server.name}</Heading>
                <span className="mc-server__pack mc-wrap">{packLine(server)}</span>
                <StatusLine status={status} settings={settings} />
                {server.tagline ? (
                  <Text type="large" color="secondary">
                    {server.tagline}
                  </Text>
                ) : null}
                <HStack gap={4} wrap="wrap" vAlign="center">
                  <CtaLink to={startPath(server.slug)}>Играть на «{server.name}»</CtaLink>
                </HStack>
              </VStack>

              <Grid columns={{minWidth: 300, max: 2}} gap={8}>
                <VStack gap={4} as="section" aria-labelledby="srv-about">
                  <Heading level={2} id="srv-about">
                    О сервере
                  </Heading>
                  {server.description_md ? <Markdown className="mc-prose">{server.description_md}</Markdown> : null}
                  <MetadataList>
                    <MetadataListItem label="Режим">{server.mode || 'Не указан'}</MetadataListItem>
                    <MetadataListItem label="Вайпы">{server.wipe_policy || 'Политика не указана'}</MetadataListItem>
                    {server.next_wipe_at ? (
                      <MetadataListItem label="Ближайший вайп">
                        {formatDateTime(server.next_wipe_at, settings)}
                      </MetadataListItem>
                    ) : null}
                    {server.launched_at ? (
                      <MetadataListItem label="Запущен">{formatDate(server.launched_at, settings)}</MetadataListItem>
                    ) : null}
                    <MetadataListItem label="Адрес">
                      <span className="mc-mono">{address}</span>
                    </MetadataListItem>
                  </MetadataList>
                  <VStack gap={2} hAlign="start">
                    <Text type="supporting">
                      Адрес нужен, если вы добавляете сервер вручную. Лаунчер проекта подключает сам.
                    </Text>
                    <CopyAddress address={address} />
                  </VStack>
                </VStack>

                <VStack gap={4} as="section" aria-labelledby="srv-req">
                  <Heading level={2} id="srv-req">
                    Сборка и требования
                  </Heading>
                  {pack ? (
                    <>
                      {pack.summary ? <Text color="secondary">{pack.summary}</Text> : null}
                      <MetadataList>
                        <MetadataListItem label="Версия игры">{pack.mc_version}</MetadataListItem>
                        <MetadataListItem label="Загрузчик">
                          {LOADER_LABEL[pack.loader]}
                          {pack.loader_version ? ` ${pack.loader_version}` : ''}
                        </MetadataListItem>
                        <MetadataListItem label="Java">
                          {pack.java_version ? `Java ${pack.java_version} (лаунчер установит сам)` : 'Уточняется'}
                        </MetadataListItem>
                        <MetadataListItem label="Память, минимум">
                          {formatRam(pack.ram_min_mb) ?? 'Уточняется'}
                        </MetadataListItem>
                        <MetadataListItem label="Память, рекомендуется">
                          {formatRam(pack.ram_recommended_mb) ?? 'Уточняется'}
                        </MetadataListItem>
                      </MetadataList>
                    </>
                  ) : (
                    <Text color="secondary">Сборка для этого сервера ещё не указана.</Text>
                  )}
                </VStack>
              </Grid>

              <VStack gap={4} as="section" aria-labelledby="srv-mods">
                <Heading level={2} id="srv-mods">
                  Моды сборки{own.length ? ` (${own.length})` : ''}
                </Heading>
                {own.length === 0 ? (
                  <Text color="secondary">Список модов ещё не добавлен.</Text>
                ) : (
                  <Table<Mod>
                    data={own}
                    idKey="id"
                    density="compact"
                    columns={[
                      {
                        key: 'name',
                        header: 'Мод',
                        renderCell: m =>
                          m.homepage_url ? <Link href={m.homepage_url}>{m.name}</Link> : <Text>{m.name}</Text>,
                      },
                      {key: 'version', header: 'Версия', renderCell: m => <Text>{m.version ?? 'Не указана'}</Text>},
                      {key: 'license', header: 'Лицензия', renderCell: m => <Text>{m.license ?? 'Не указана'}</Text>},
                    ]}
                  />
                )}
              </VStack>

              {shots.length > 0 ? (
                <VStack gap={4} as="section" aria-labelledby="srv-shots">
                  <Heading level={2} id="srv-shots">
                    Скриншоты
                  </Heading>
                  <Grid columns={{minWidth: 260, max: 3}} gap={4}>
                    {shots.map(g => (
                      <VStack gap={2} key={g.id} as="figure" style={{margin: 0}}>
                        <AspectRatio ratio={16 / 9}>
                          <img className="mc-gallery-img" src={g.url} alt={g.alt || g.caption || `Скриншот сервера ${server.name}`} loading="lazy" />
                        </AspectRatio>
                        {g.caption ? (
                          <Text type="supporting" as="p">
                            {g.caption}
                          </Text>
                        ) : null}
                      </VStack>
                    ))}
                  </Grid>
                </VStack>
              ) : null}
            </>
          );
        }}
      </Async>
    </VStack>
  );
}
