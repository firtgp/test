import type {CSSProperties} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {HStack} from '@astryxdesign/core/HStack';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {deriveStatus} from '../data/status';
import {LOADER_LABEL, type ServerView, type SiteSettings} from '../data/types';
import {formatDateTime} from '../app/format';
import {CtaLink, startPath} from './CtaLink';
import {StatusLine} from './StatusLine';

export function accentStyle(accent: string): CSSProperties {
  return {['--server-accent' as string]: accent};
}

export function packLine(server: ServerView): string {
  const p = server.modpack;
  if (!p) return 'Сборка не указана';
  return `${p.name} · ${LOADER_LABEL[p.loader]} ${p.mc_version}`;
}

export function ServerCard({server, settings, now}: {server: ServerView; settings: SiteSettings; now: number}) {
  const status = deriveStatus(server, server.status, now);
  return (
    <article className="mc-server" style={accentStyle(server.accent)} aria-labelledby={`srv-${server.id}`}>
      <VStack gap={4} className="mc-server__body">
        <VStack gap={1}>
          <h3 className="mc-server__name" id={`srv-${server.id}`}>
            {server.name}
          </h3>
          <span className="mc-server__pack mc-wrap">{packLine(server)}</span>
        </VStack>
        <StatusLine status={status} settings={settings} />
        {server.tagline ? <Text color="secondary">{server.tagline}</Text> : null}
        {server.key_mods.length > 0 ? (
          <HStack gap={2} wrap="wrap" aria-label="Ключевые моды">
            {server.key_mods.slice(0, 4).map(m => (
              <Token key={m} label={m} size="sm" />
            ))}
            {server.mod_count > Math.min(4, server.key_mods.length) ? (
              <Text type="supporting">всего модов: {server.mod_count}</Text>
            ) : null}
          </HStack>
        ) : null}
        {server.next_wipe_at ? (
          <Text type="supporting">Ближайший вайп: {formatDateTime(server.next_wipe_at, settings)}</Text>
        ) : server.wipe_policy ? (
          <Text type="supporting">{server.wipe_policy}</Text>
        ) : null}
        <span className="mc-server__spacer" />
        <HStack gap={3} wrap="wrap" vAlign="center">
          <CtaLink to={startPath(server.slug)} size="md" icon={false}>
            Играть на «{server.name}»
          </CtaLink>
          <Button label="Подробнее" variant="ghost" href={`/servers/${server.slug}`} />
        </HStack>
      </VStack>
    </article>
  );
}
