import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router';
import {useQuery} from '@tanstack/react-query';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {List, ListItem} from '@astryxdesign/core/List';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/VStack';
import {isStaffAdmin, keys, useAccount, useInvalidate, useNotify, useServers, useSettings} from '../app/hooks';
import {formatDateTime} from '../app/format';
import {backend} from '../data';
import {STAFF_ROLE_LABEL, errorText, nickSchema, passwordSchema, type Account} from '../data/types';
import {CtaLink, startPath} from '../components/CtaLink';
import {Async, Page} from '../components/Page';
import {packLine} from '../components/ServerCard';

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <VStack gap={4} as="section" className="mc-tile">
      <Heading level={2}>{title}</Heading>
      {children}
    </VStack>
  );
}

function NickForm({account}: {account: Account}) {
  const [nick, setNick] = useState(account.nick);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const notify = useNotify();
  const invalidate = useInvalidate();
  useEffect(() => setNick(account.nick), [account.nick]);

  function ask() {
    const parsed = nickSchema.safeParse(nick);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setConfirm(true);
  }
  async function apply() {
    setBusy(true);
    try {
      await backend.changeNick(nick);
      await invalidate('account');
      notify.ok(`Ник изменён на ${nick}`);
      setConfirm(false);
    } catch (e) {
      setError(errorText(e));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <VStack gap={3} hAlign="start">
      <TextInput
        label="Ник в игре"
        description="Менять можно раз в 30 дней. Инвентарь, приваты и роли сохраняются: они привязаны к UUID, а не к нику."
        value={nick}
        onChange={v => {
          setNick(v);
          setError(null);
        }}
        autoCapitalize="none"
        hasSpellCheck={false}
        status={error ? {type: 'error', message: error} : undefined}
        width="100%"
      />
      <Button label="Сменить ник" variant="secondary" onClick={ask} isDisabled={nick === account.nick} />
      <AlertDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={`Сменить ник на ${nick}?`}
        description={`Старый ник ${account.nick} на 30 дней закрепится за вами, а следующая смена станет доступна через 30 дней.`}
        actionLabel="Сменить ник"
        cancelLabel="Отмена"
        actionVariant="primary"
        isActionLoading={busy}
        onAction={apply}
      />
    </VStack>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notify = useNotify();
  const invalidate = useInvalidate();

  async function submit() {
    const parsed = passwordSchema.safeParse(next);
    if (!current) return setError('Введите текущий пароль.');
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    setBusy(true);
    try {
      await backend.changePassword(current, next);
      setCurrent('');
      setNext('');
      await invalidate('sessions');
      notify.ok('Пароль изменён. Остальные сессии завершены');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}>
      <VStack gap={3} hAlign="start">
        {error ? (
          <div role="alert" style={{width: '100%'}}>
            <Banner status="error" title={error} />
          </div>
        ) : null}
        <TextInput label="Текущий пароль" type="password" value={current} onChange={setCurrent} autoComplete="current-password" width="100%" />
        <TextInput
          label="Новый пароль"
          description="Не короче 10 символов. Он же будет паролем в лаунчере."
          type="password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          width="100%"
        />
        <Button label="Сменить пароль" type="submit" variant="secondary" isLoading={busy} />
      </VStack>
    </form>
  );
}

function Sessions() {
  const settings = useSettings();
  const sessions = useQuery({queryKey: keys.sessions, queryFn: () => backend.listSessions()});
  const notify = useNotify();
  const invalidate = useInvalidate();

  async function run(fn: () => Promise<void>, ok: string) {
    try {
      await fn();
      await invalidate('sessions', 'account');
      notify.ok(ok);
    } catch (e) {
      notify.fail(e);
    }
  }

  return (
    <Async query={sessions} skeletonHeight={56}>
      {list => (
        <VStack gap={3} hAlign="start">
          {list.length === 0 ? (
            <Text color="secondary">Активных сессий нет.</Text>
          ) : (
            <List hasDividers>
              {list.map(s => (
                <ListItem
                  key={s.id}
                  label={`${s.kind === 'launcher' ? 'Лаунчер' : 'Сайт'}${s.is_current ? ' — эта сессия' : ''}`}
                  description={`${s.label || 'Устройство не определено'} · вход ${formatDateTime(s.created_at, settings)}`}
                  endContent={
                    s.is_current ? undefined : (
                      <Button
                        label="Завершить"
                        variant="ghost"
                        size="sm"
                        clickAction={() => run(() => backend.revokeSession(s.id), 'Сессия завершена')}
                      />
                    )
                  }
                />
              ))}
            </List>
          )}
          <Button
            label="Завершить все сессии, кроме этой"
            variant="secondary"
            clickAction={() => run(() => backend.revokeOtherSessions(), 'Остальные сессии завершены')}
          />
        </VStack>
      )}
    </Async>
  );
}

export function AccountPage() {
  const account = useAccount();
  const servers = useServers().data ?? [];
  const navigate = useNavigate();
  const notify = useNotify();
  const invalidate = useInvalidate();
  const a = account.data;

  useEffect(() => {
    if (account.isSuccess && !a) navigate('/login', {replace: true});
  }, [account.isSuccess, a, navigate]);

  const selected = servers.find(s => s.id === a?.selected_server_id) ?? null;

  return (
    <Page title="Кабинет" width="text">
      <Async query={account}>
        {() =>
          a ? (
            <VStack gap={4}>
              {isStaffAdmin(a) ? (
                <Banner
                  status="info"
                  title="У вас есть доступ к админке"
                  endContent={<Button label="Открыть админку" href="/admin" variant="secondary" />}
                />
              ) : null}

              <Section title="Профиль">
                <MetadataList>
                  <MetadataListItem label="Ник">
                    <span className="mc-wrap">{a.nick}</span>
                  </MetadataListItem>
                  <MetadataListItem label="Почта">
                    <span className="mc-wrap">
                      {a.email} {a.email_confirmed ? '(подтверждена)' : '(не подтверждена)'}
                    </span>
                  </MetadataListItem>
                  <MetadataListItem label="UUID игрока">
                    <span className="mc-mono">{a.mc_uuid}</span>
                  </MetadataListItem>
                  {a.roles.length > 0 ? (
                    <MetadataListItem label="Роли">
                      {a.roles
                        .map(r => `${STAFF_ROLE_LABEL[r.role]}${r.server_id ? ` (${servers.find(s => s.id === r.server_id)?.name ?? 'сервер'})` : ''}`)
                        .join(', ')}
                    </MetadataListItem>
                  ) : null}
                </MetadataList>
              </Section>

              <Section title="Мой сервер">
                <Selector
                  label="Сервер по умолчанию"
                  placeholder="Выберите сервер"
                  description="Инструкция «Как начать» откроется сразу для него."
                  value={a.selected_server_id ?? ''}
                  options={servers.map(s => ({value: s.id, label: `${s.name} — ${packLine(s)}`}))}
                  onChange={async id => {
                    try {
                      await backend.setSelectedServer(id || null);
                      await invalidate('account');
                      notify.ok('Сервер сохранён');
                    } catch (e) {
                      notify.fail(e);
                    }
                  }}
                />
                <HStack>
                  <CtaLink to={startPath(selected?.slug)} size="md">
                    {selected ? `Играть на «${selected.name}»` : 'Как начать играть'}
                  </CtaLink>
                </HStack>
              </Section>

              <Section title="Ник">
                <NickForm account={a} />
              </Section>
              <Section title="Пароль">
                <PasswordForm />
              </Section>
              <Section title="Активные сессии">
                <Sessions />
              </Section>

              <HStack>
                <Button
                  label="Выйти из аккаунта"
                  variant="secondary"
                  clickAction={async () => {
                    try {
                      await backend.signOut();
                      await invalidate('account');
                      navigate('/');
                    } catch (e) {
                      notify.fail(e);
                    }
                  }}
                />
              </HStack>
            </VStack>
          ) : null
        }
      </Async>
    </Page>
  );
}
