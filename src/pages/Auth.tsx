import {useEffect, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {useNavigate, useSearchParams} from 'react-router';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/VStack';
import {useAccount, useInvalidate, useServers} from '../app/hooks';
import {backend, isDemo} from '../data';
import {DEMO_OWNER, DEMO_PLAYER} from '../data/demoBackend';
import {AppError, emailSchema, errorText, nickSchema, passwordSchema} from '../data/types';
import {DemoMailbox} from '../components/DemoMailbox';
import {Page} from '../components/Page';

type Status = {type: 'error' | 'success'; message: string} | undefined;
const err = (message: string | undefined): Status => (message ? {type: 'error', message} : undefined);
const first = (r: {success: boolean; error?: {issues: {message: string}[]}}) =>
  r.success ? undefined : r.error?.issues[0]?.message;

function Form({onSubmit, children}: {onSubmit: () => void; children: ReactNode}) {
  return (
    <form
      noValidate
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}>
      <VStack gap={4}>{children}</VStack>
    </form>
  );
}

/** Общая ошибка формы: объявляется вспомогательным технологиям и получает фокус. */
function FormError({error}: {error: string | null}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;
  return (
    <div ref={ref} tabIndex={-1} role="alert">
      <Banner status="error" title={error} />
    </div>
  );
}

export function RegisterPage() {
  const [params] = useSearchParams();
  const serverSlug = params.get('server');
  const servers = useServers().data;
  const server = servers?.find(s => s.slug === serverSlug);
  const [nick, setNick] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [nickState, setNickState] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Подсказка о занятости ника. Окончательное решение принимает сервер при регистрации.
  useEffect(() => {
    if (!nickSchema.safeParse(nick).success) {
      setNickState('idle');
      return;
    }
    setNickState('checking');
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const free = await backend.nickAvailable(nick);
        if (!cancelled) setNickState(free ? 'free' : 'taken');
      } catch {
        if (!cancelled) setNickState('idle');
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [nick]);

  const nickError = first(nickSchema.safeParse(nick));
  const emailError = first(emailSchema.safeParse(email));
  const passwordError = first(passwordSchema.safeParse(password));

  async function submit() {
    setTouched(true);
    setError(null);
    if (nickError || emailError || passwordError || busy) return;
    setBusy(true);
    try {
      await backend.signUp({nick, email: email.trim(), password});
      setSentTo(email.trim());
    } catch (e) {
      // Введённые данные остаются в полях: исправить нужно только то, что не подошло.
      if (e instanceof AppError && e.code === 'nick_taken') setNickState('taken');
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <Page title="Подтвердите почту" width="narrow">
        <Banner
          status="success"
          title={`Аккаунт ${nick} создан`}
          description={`Мы отправили письмо на ${sentTo}. Перейдите по ссылке из него — после этого можно входить на сайт и в лаунчер.`}
        />
        <DemoMailbox to={sentTo} />
        <VStack gap={2} hAlign="start">
          <Button label="Отправить письмо ещё раз" variant="secondary" clickAction={() => backend.resendConfirmation(sentTo)} />
          <Link href="/login">Перейти ко входу</Link>
        </VStack>
      </Page>
    );
  }

  return (
    <Page
      title="Создать аккаунт"
      width="narrow"
      lead={server ? `После регистрации вернёмся к серверу «${server.name}».` : 'Один аккаунт для сайта, лаунчера и всех серверов.'}>
      <Form onSubmit={submit}>
        <FormError error={error} />
        <TextInput
          label="Ник в игре"
          description="3–16 символов: латинские буквы, цифры и «_». Его увидят другие игроки."
          value={nick}
          onChange={setNick}
          isRequired
          autoComplete="username"
          autoCapitalize="none"
          hasSpellCheck={false}
          htmlName="nick"
          status={
            nickState === 'taken'
              ? err('Этот ник уже занят')
              : touched && nickError
                ? err(nickError)
                : nickState === 'free'
                  ? {type: 'success', message: 'Ник свободен'}
                  : undefined
          }
        />
        <TextInput
          label="Почта"
          description="На неё придёт ссылка для подтверждения и восстановления пароля."
          type="email"
          value={email}
          onChange={setEmail}
          isRequired
          autoComplete="email"
          inputMode="email"
          htmlName="email"
          status={touched ? err(emailError) : undefined}
        />
        <TextInput
          label="Пароль"
          description="Не короче 10 символов. Этот же пароль — для лаунчера."
          type="password"
          value={password}
          onChange={setPassword}
          isRequired
          autoComplete="new-password"
          htmlName="password"
          status={touched ? err(passwordError) : undefined}
        />
        <Button label="Создать аккаунт" type="submit" variant="primary" size="lg" isLoading={busy} width="100%" />
        <Text color="secondary">
          Регистрируясь, вы принимаете <Link href="/rules">правила проекта</Link>. Уже есть аккаунт?{' '}
          <Link href="/login">Войти</Link>
        </Text>
      </Form>
    </Page>
  );
}

export function LoginPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const account = useAccount().data;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(params.get('confirmed') ? 'Почта подтверждена. Теперь можно войти.' : null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const confirmToken = params.get('demo_confirm');
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!confirmToken || !backend.demoConfirmEmail || handled.current === confirmToken) return;
    handled.current = confirmToken;
    backend
      .demoConfirmEmail(confirmToken)
      .then(() => setNotice('Почта подтверждена. Теперь можно войти.'))
      .catch(e => setError(errorText(e)))
      .finally(() => setParams({}, {replace: true}));
  }, [confirmToken, setParams]);

  useEffect(() => {
    // После входа игрок возвращается в раздел кабинета, из которого его отправили на вход.
    const next = params.get('next');
    if (account) navigate(next && next.startsWith('/account') ? next : '/account', {replace: true});
  }, [account, navigate]);

  async function submit() {
    setError(null);
    setNeedsConfirm(false);
    if (!email.trim() || !password) {
      setError('Введите почту и пароль.');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await backend.signIn(email.trim(), password);
      await invalidate('account');
    } catch (e) {
      if (e instanceof AppError && e.code === 'email_not_confirmed') setNeedsConfirm(true);
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Вход" width="narrow">
      {notice ? <Banner status="success" title={notice} /> : null}
      <Form onSubmit={submit}>
        <FormError error={error} />
        {needsConfirm ? (
          <VStack gap={2} hAlign="start">
            <Button
              label="Отправить письмо для подтверждения ещё раз"
              variant="secondary"
              clickAction={async () => {
                await backend.resendConfirmation(email.trim());
                setNotice('Письмо отправлено повторно.');
              }}
            />
            <DemoMailbox to={email.trim()} />
          </VStack>
        ) : null}
        <TextInput label="Почта" type="email" value={email} onChange={setEmail} isRequired autoComplete="email" inputMode="email" htmlName="email" />
        <TextInput label="Пароль" type="password" value={password} onChange={setPassword} isRequired autoComplete="current-password" htmlName="password" />
        <Button label="Войти" type="submit" variant="primary" size="lg" isLoading={busy} width="100%" />
        <Text color="secondary">
          <Link href="/forgot">Забыли пароль?</Link> · Нет аккаунта? <Link href="/register">Создать</Link>
        </Text>
      </Form>
      {isDemo ? (
        <VStack gap={3}>
          <Banner
            status="info"
            title="Демо-игрок: кабинет, баланс и магазин"
            description={`Почта ${DEMO_PLAYER.email}, пароль ${DEMO_PLAYER.password}. Существует только в демо-режиме.`}
            endContent={
              <Button
                label="Войти как демо-игрок"
                variant="secondary"
                clickAction={async () => {
                  try {
                    await backend.signIn(DEMO_PLAYER.email, DEMO_PLAYER.password);
                    await invalidate('account');
                  } catch (e) {
                    setError(errorText(e));
                  }
                }}
              />
            }
          />
          <Banner
            status="info"
            title="Демо-доступ в админку"
            description={`Почта ${DEMO_OWNER.email}, пароль ${DEMO_OWNER.password}. Существует только в демо-режиме.`}
          />
        </VStack>
      ) : null}
    </Page>
  );
}

export function ForgotPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const bad = first(emailSchema.safeParse(email));
    if (bad) {
      setError(bad);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await backend.requestPasswordReset(email.trim());
      setSentTo(email.trim());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <Page title="Проверьте почту" width="narrow">
        <Banner
          status="success"
          title="Если такой аккаунт есть, письмо отправлено"
          description={`Ссылка для сброса пароля придёт на ${sentTo}. Она действует один раз и ограниченное время.`}
        />
        <DemoMailbox to={sentTo} />
        <Link href="/login">Вернуться ко входу</Link>
      </Page>
    );
  }
  return (
    <Page title="Восстановление пароля" width="narrow" lead="Укажите почту аккаунта — пришлём ссылку для сброса.">
      <Form onSubmit={submit}>
        <FormError error={error} />
        <TextInput label="Почта" type="email" value={email} onChange={setEmail} isRequired autoComplete="email" inputMode="email" htmlName="email" />
        <Button label="Прислать ссылку" type="submit" variant="primary" size="lg" isLoading={busy} width="100%" />
        <Link href="/login">Вернуться ко входу</Link>
      </Form>
    </Page>
  );
}

export function ResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    const bad = first(passwordSchema.safeParse(password));
    if (bad) {
      setError(bad);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await backend.completePasswordReset(password, token);
      setDone(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Page title="Пароль изменён" width="narrow">
        <Banner
          status="success"
          title="Новый пароль сохранён"
          description="Остальные сессии сайта и лаунчера завершены. Войдите с новым паролем."
        />
        <Button label="Войти" href="/login" variant="primary" />
      </Page>
    );
  }
  return (
    <Page title="Новый пароль" width="narrow">
      <Form onSubmit={submit}>
        <FormError error={error} />
        {error ? <Link href="/forgot">Запросить новую ссылку</Link> : null}
        <TextInput
          label="Новый пароль"
          description="Не короче 10 символов."
          type="password"
          value={password}
          onChange={setPassword}
          isRequired
          autoComplete="new-password"
          htmlName="password"
        />
        <Button label="Сохранить пароль" type="submit" variant="primary" size="lg" isLoading={busy} width="100%" />
      </Form>
    </Page>
  );
}
