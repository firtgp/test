import {useParams} from 'react-router';
import {Heading} from '@astryxdesign/core/Heading';
import {Link} from '@astryxdesign/core/Link';
import {Markdown} from '@astryxdesign/core/Markdown';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {useNews, useServers, useSettings} from '../app/hooks';
import {formatDate, formatDateTime} from '../app/format';
import {NEWS_KIND_LABEL, type NewsItem} from '../data/types';
import {Async, Page} from '../components/Page';
import {NotFoundPage} from './NotFound';

function Meta({item}: {item: NewsItem}) {
  const settings = useSettings();
  const servers = useServers().data;
  const server = servers?.find(s => s.id === item.server_id);
  return (
    <Text type="supporting">
      {NEWS_KIND_LABEL[item.kind]}
      {server ? ` · ${server.name}` : ''}
      {item.published_at ? ` · ${formatDate(item.published_at, settings)}` : ''}
    </Text>
  );
}

export function NewsListPage() {
  const news = useNews();
  const settings = useSettings();
  return (
    <Page title="Новости и вайпы" width="text" lead={`Время событий указано в часовом поясе проекта (${settings.timezone_label}).`}>
      <Async query={news} skeletonHeight={96}>
        {list =>
          list.length === 0 ? (
            <Text color="secondary">Новостей пока нет.</Text>
          ) : (
            <VStack gap={4}>
              {list.map(n => (
                <VStack gap={2} key={n.id} as="article" className="mc-tile">
                  <Meta item={n} />
                  <Heading level={2}>
                    <Link href={`/news/${n.slug}`}>{n.title}</Link>
                  </Heading>
                  {n.event_at ? <Text weight="semibold">Когда: {formatDateTime(n.event_at, settings)}</Text> : null}
                  {n.summary ? <Text color="secondary">{n.summary}</Text> : null}
                </VStack>
              ))}
            </VStack>
          )
        }
      </Async>
    </Page>
  );
}

export function NewsItemPage() {
  const {slug} = useParams();
  const news = useNews();
  const settings = useSettings();
  const item = news.data?.find(n => n.slug === slug);
  if (news.data && !item) return <NotFoundPage what="Новость" />;
  return (
    <Page title={item?.title ?? 'Новость'} width="text">
      <Async query={news}>
        {() =>
          item ? (
            <VStack gap={4} as="article">
              <Meta item={item} />
              {item.event_at ? (
                <Text type="large" weight="semibold">
                  Когда: {formatDateTime(item.event_at, settings)}
                </Text>
              ) : null}
              <Markdown className="mc-prose">{item.body_md || item.summary}</Markdown>
              <Link href="/news">← Все новости</Link>
            </VStack>
          ) : null
        }
      </Async>
    </Page>
  );
}
