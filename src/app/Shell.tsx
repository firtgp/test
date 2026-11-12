import type {ReactNode} from 'react';
import {useLocation} from 'react-router';
import {AppShell} from '@astryxdesign/core/AppShell';
import {Button} from '@astryxdesign/core/Button';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {Text} from '@astryxdesign/core/Text';
import {TopNav, TopNavHeading, TopNavItem} from '@astryxdesign/core/TopNav';
import {VStack} from '@astryxdesign/core/VStack';
import {CubeIcon, UserIcon, WifiSlashIcon} from '@phosphor-icons/react';
import {isDemo} from '../data';
import {isStaffAdmin, useAccount, useOnline, useSettings} from './hooks';

const NAV = [
  {href: '/servers', label: 'Серверы'},
  {href: '/start', label: 'Как начать'},
  {href: '/news', label: 'Новости'},
  {href: '/rules', label: 'Правила'},
];

function SystemBar() {
  const online = useOnline();
  if (!online) {
    return (
      <p className="mc-demo-bar" role="status">
        <WifiSlashIcon size={16} weight="bold" aria-hidden="true" /> Нет соединения с интернетом. Данные на
        странице могли устареть, действия с аккаунтом недоступны.
      </p>
    );
  }
  if (isDemo) {
    return (
      <p className="mc-demo-bar" role="note">
        <strong>Демо-режим.</strong> Серверы, онлайн и новости — пример. Аккаунты хранятся только в этом
        браузере, письма не отправляются.
      </p>
    );
  }
  return null;
}

function Footer() {
  const s = useSettings();
  const community = [
    {href: s.discord_url, label: 'Discord'},
    {href: s.telegram_url, label: 'Telegram'},
    {href: s.vk_url, label: 'ВКонтакте'},
  ].filter(l => l.href);
  return (
    <footer className="mc-footer">
      <VStack gap={6} className="mc-page">
        <HStack gap={6} wrap="wrap" vAlign="start" justify="between">
          <VStack gap={2}>
            <Text weight="bold">{s.project_name}</Text>
            <HStack gap={4} wrap="wrap">
              {NAV.map(n => (
                <Link key={n.href} href={n.href}>
                  {n.label}
                </Link>
              ))}
            </HStack>
          </VStack>
          <VStack gap={2}>
            <Text weight="bold">Сообщество и контакты</Text>
            {community.length === 0 && !s.contact_email ? (
              <Text color="secondary">Ссылки появятся, когда владелец добавит их в настройках.</Text>
            ) : (
              <HStack gap={4} wrap="wrap">
                {community.map(l => (
                  <Link key={l.label} href={l.href}>
                    {l.label}
                  </Link>
                ))}
                {s.contact_email ? <Link href={`mailto:${s.contact_email}`}>{s.contact_email}</Link> : null}
              </HStack>
            )}
          </VStack>
        </HStack>
        <p className="mc-disclaimer">
          NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
          <br />
          Не является официальным сервисом Minecraft. Не одобрено и не связано с Mojang или Microsoft.
        </p>
      </VStack>
    </footer>
  );
}

export function Shell({children}: {children: ReactNode}) {
  const {pathname} = useLocation();
  const settings = useSettings();
  const account = useAccount().data;
  return (
    <AppShell
      height="auto"
      variant="surface"
      contentPadding={0}
      banner={<SystemBar />}
      topNav={
        <TopNav
          label="Основная навигация"
          heading={
            <TopNavHeading
              heading={settings.project_name}
              headingHref="/"
              logo={<NavIcon icon={<CubeIcon size={18} weight="fill" />} />}
            />
          }
          startContent={
            <>
              {NAV.map(n => (
                <TopNavItem key={n.href} label={n.label} href={n.href} isSelected={pathname.startsWith(n.href)} />
              ))}
              {isStaffAdmin(account) ? (
                <TopNavItem label="Админка" href="/admin" isSelected={pathname.startsWith('/admin')} />
              ) : null}
            </>
          }
          endContent={
            account ? (
              <Button label={account.nick} href="/account" variant="secondary" icon={<UserIcon size={18} />} />
            ) : (
              <Button label="Войти" href="/login" variant="secondary" />
            )
          }
        />
      }>
      {children}
      <Footer />
    </AppShell>
  );
}
