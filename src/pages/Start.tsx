import {useSearchParams} from 'react-router';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {CheckCircleIcon, DownloadSimpleIcon} from '@phosphor-icons/react';
import {useAccount, useInvalidate, useNotify, useNow, useServers, useSettings} from '../app/hooks';
import {formatRam, serverAddress} from '../app/format';
import {backend} from '../data';
import {deriveStatus} from '../data/status';
import {LOADER_LABEL} from '../data/types';
import {CopyAddress} from '../components/CopyAddress';
import {Page} from '../components/Page';
import {packLine} from '../components/ServerCard';
import {StatusLine} from '../components/StatusLine';

function Step({n, title, done, children}: {n: number; title: string; done?: boolean; children: React.ReactNode}) {
  return (
    <VStack gap={3} as="li" className="mc-tile">
      <HStack gap={3} vAlign="center">
        {done ? (
          <CheckCircleIcon size={28} weight="fill" color="var(--mc-status-online)" aria-label="Готово" />
        ) : (
          <Text type="large" weight="bold" color="accent">
            {n}
          </Text>
        )}
        <Heading level={2}>{title}</Heading>
      </HStack>
      {children}
    </VStack>
  );
}

export function StartPage() {
  const settings = useSettings();
  const servers = useServers();
  const account = useAccount().data;
  const notify = useNotify();
  const invalidate = useInvalidate();
  const now = useNow();
  const [params, setParams] = useSearchParams();

  const list = servers.data ?? [];
  // Сервер из ссылки важнее сохранённого в кабинете: человек только что нажал «Играть» на карточке.
  const slug = params.get('server');
  const selected =
    list.find(s => s.slug === slug) ?? list.find(s => s.id === account?.selected_server_id) ?? null;
  const downloads = [
    {label: 'Windows', href: settings.launcher_windows_url},
    {label: 'macOS', href: settings.launcher_macos_url},
    {label: 'Linux', href: settings.launcher_linux_url},
  ].filter(d => d.href);
  const registerHref = selected ? `/register?server=${selected.slug}` : '/register';

  async function choose(id: string) {
    const s = list.find(x => x.id === id);
    if (!s) return;
    setParams({server: s.slug}, {replace: true});
    if (account) {
      try {
        await backend.setSelectedServer(s.id);
        await invalidate('account');
      } catch (e) {
        notify.fail(e);
      }
    }
  }

  async function shareLink() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({title: settings.project_name, url});
        return;
      }
      await navigator.clipboard.writeText(url);
      notify.ok('Ссылка скопирована — откройте её на компьютере');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') notify.fail(e);
    }
  }

  return (
    <Page
      title="Как начать играть"
      width="text"
      lead={selected ? `Вы выбрали сервер «${selected.name}». Четыре шага — и вы в игре.` : 'Четыре шага — и вы в игре.'}>
      <VStack gap={3} className="mc-only-mobile">
        <Banner
          status="info"
          title="Играть можно только с компьютера"
          description="Сборки работают на Minecraft: Java Edition для Windows, macOS и Linux. С телефона можно создать аккаунт и отправить себе эту страницу."
          endContent={<Button label="Отправить ссылку себе" variant="secondary" clickAction={shareLink} />}
        />
      </VStack>

      <VStack gap={4} as="ol" style={{listStyle: 'none', padding: 0, margin: 0}}>
        <Step n={1} title="Скачайте лаунчер">
          <Text color="secondary">
            {settings.launcher_name || 'Лаунчер'} сам установит нужную версию игры, Java и моды выбранной сборки.
          </Text>
          {downloads.length > 0 ? (
            <HStack gap={3} wrap="wrap">
              {downloads.map(d => (
                <Button
                  key={d.label}
                  label={`Скачать для ${d.label}`}
                  href={d.href}
                  variant="primary"
                  icon={<DownloadSimpleIcon size={18} weight="bold" />}
                />
              ))}
            </HStack>
          ) : (
            <Banner
              status="warning"
              title="Ссылка на лаунчер ещё не добавлена"
              description="Владелец проекта указывает её в настройках сайта. Пока можно пройти остальные шаги."
            />
          )}
        </Step>

        <Step n={2} title="Создайте аккаунт" done={!!account}>
          {account ? (
            <Text>
              Вы вошли как <strong>{account.nick}</strong>. Этот ник и пароль понадобятся в лаунчере.{' '}
              <Link href="/account">Открыть кабинет</Link>
            </Text>
          ) : (
            <>
              <Text color="secondary">Ник, почта и пароль. Аккаунт один для сайта, лаунчера и всех серверов.</Text>
              <HStack gap={3} wrap="wrap">
                <Button label="Создать аккаунт" href={registerHref} variant="primary" />
                <Button label="У меня уже есть аккаунт" href="/login" variant="ghost" />
              </HStack>
            </>
          )}
        </Step>

        <Step n={3} title="Войдите в лаунчер">
          <Text color="secondary">
            Введите тот же ник и пароль, что и на сайте. Почту нужно подтвердить заранее — без этого лаунчер не
            пустит.
          </Text>
        </Step>

        <Step n={4} title="Выберите сервер и нажмите «Играть»">
          {list.length === 0 ? (
            <Text color="secondary">Серверы ещё не опубликованы.</Text>
          ) : (
            <>
              <Selector
                label="Сервер"
                placeholder="Выберите сервер"
                value={selected?.id ?? ''}
                onChange={choose}
                options={list.map(s => ({value: s.id, label: `${s.name} — ${packLine(s)}`}))}
                description={account ? 'Выбор сохраняется в кабинете.' : 'Войдите, чтобы сайт запомнил выбор.'}
              />
              {selected ? (
                <VStack gap={3}>
                  <StatusLine status={deriveStatus(selected, selected.status, now)} settings={settings} />
                  <MetadataList>
                    {selected.modpack ? (
                      <>
                        <MetadataListItem label="Сборка">
                          {selected.modpack.name}, {LOADER_LABEL[selected.modpack.loader]} {selected.modpack.mc_version}
                        </MetadataListItem>
                        <MetadataListItem label="Java">
                          {selected.modpack.java_version ? `Java ${selected.modpack.java_version}` : 'Уточняется'}
                        </MetadataListItem>
                        <MetadataListItem label="Память">
                          {formatRam(selected.modpack.ram_recommended_mb)
                            ? `рекомендуется ${formatRam(selected.modpack.ram_recommended_mb)}`
                            : 'Уточняется'}
                        </MetadataListItem>
                      </>
                    ) : null}
                    <MetadataListItem label="Адрес">
                      <span className="mc-mono">{serverAddress(selected.host, selected.port)}</span>
                    </MetadataListItem>
                  </MetadataList>
                  <CopyAddress address={serverAddress(selected.host, selected.port)} />
                  <Link href={`/servers/${selected.slug}`}>Подробнее о сервере и список модов</Link>
                </VStack>
              ) : null}
            </>
          )}
        </Step>
      </VStack>
    </Page>
  );
}
