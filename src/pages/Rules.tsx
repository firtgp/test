import {Markdown} from '@astryxdesign/core/Markdown';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {useRules, useSettings} from '../app/hooks';
import {formatDate} from '../app/format';
import {Async, Page} from '../components/Page';

export function RulesPage() {
  const rules = useRules();
  const settings = useSettings();
  return (
    <Page title="Правила" width="text">
      <Async query={rules}>
        {r =>
          r ? (
            <VStack gap={6}>
              <Text color="secondary">
                Редакция {r.version} от {formatDate(r.published_at, settings)}
                {r.change_note ? `. Что изменилось: ${r.change_note}` : ''}
              </Text>
              <Markdown className="mc-prose" headingLevelStart={2}>
                {r.body_md}
              </Markdown>
            </VStack>
          ) : (
            <Text color="secondary">Правила ещё не опубликованы.</Text>
          )
        }
      </Async>
    </Page>
  );
}
