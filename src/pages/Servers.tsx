import {Grid} from '@astryxdesign/core/Grid';
import {Text} from '@astryxdesign/core/Text';
import {useNow, useServers, useSettings} from '../app/hooks';
import {Async, Page} from '../components/Page';
import {ServerCard} from '../components/ServerCard';

export function ServersPage() {
  const settings = useSettings();
  const servers = useServers();
  const now = useNow();
  return (
    <Page title="Серверы и сборки" lead="Статус обновляется раз в минуту. Аккаунт один на все серверы.">
      <Async query={servers} skeletonHeight={280}>
        {list =>
          list.length === 0 ? (
            <Text color="secondary">Серверы ещё не опубликованы.</Text>
          ) : (
            <Grid columns={{minWidth: 300, max: 3}} gap={4}>
              {list.map(s => (
                <ServerCard key={s.id} server={s} settings={settings} now={now} />
              ))}
            </Grid>
          )
        }
      </Async>
    </Page>
  );
}
