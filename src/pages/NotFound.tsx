import {Button} from '@astryxdesign/core/Button';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Page} from '../components/Page';

export function NotFoundPage({what = 'Страница'}: {what?: string}) {
  return (
    <Page title={`${what} не найдена`} width="text">
      <EmptyState
        title="Здесь ничего нет"
        description="Возможно, ссылка устарела. Начните с главной или откройте список серверов."
        actions={<Button label="На главную" href="/" variant="primary" />}
      />
    </Page>
  );
}
