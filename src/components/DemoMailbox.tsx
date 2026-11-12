import {Banner} from '@astryxdesign/core/Banner';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {backend} from '../data';

/** Только демо-режим: письма не отправляются, ссылки из них показываются прямо здесь. */
export function DemoMailbox({to}: {to?: string}) {
  const mail = backend.demoMailbox?.().filter(m => !to || m.to.toLowerCase() === to.toLowerCase()) ?? [];
  if (!backend.demoMailbox) return null;
  return (
    <Banner
      status="warning"
      title="Демо-режим: письма не отправляются"
      description={
        <VStack gap={2}>
          <Text>В рабочем режиме ссылка придёт на почту. Здесь она показана вместо письма:</Text>
          {mail.length === 0 ? (
            <Text color="secondary">Писем пока нет.</Text>
          ) : (
            mail.slice(0, 3).map(m => (
              <Text key={m.id} className="mc-wrap">
                {m.subject} для {m.to}: <Link href={m.link}>открыть ссылку из письма</Link>
              </Text>
            ))
          )}
        </VStack>
      }
    />
  );
}
