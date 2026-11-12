import type {ReactNode} from 'react';
import {useEffect} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {useSettings} from '../app/hooks';
import {errorText} from '../data/types';

export function Page({
  title, lead, width, children,
}: {title: string; lead?: ReactNode; width?: 'narrow' | 'text'; children: ReactNode}) {
  const settings = useSettings();
  useEffect(() => {
    document.title = `${title} — ${settings.project_name}`;
  }, [title, settings.project_name]);
  return (
    <VStack gap={8} className={`mc-page${width ? ` mc-page--${width}` : ''}`}>
      <VStack gap={3}>
        <Heading level={1}>{title}</Heading>
        {lead ? (
          <Text type="large" color="secondary">
            {lead}
          </Text>
        ) : null}
      </VStack>
      {children}
    </VStack>
  );
}

/** Состояния загрузки и ошибки для списков: ошибка сети не выглядит как «пусто». */
export function Async<T>({
  query, children, skeletonHeight = 160,
}: {
  query: {data: T | undefined; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown};
  children: (data: T) => ReactNode;
  skeletonHeight?: number;
}) {
  if (query.isPending) {
    return (
      <VStack gap={4} aria-busy="true" aria-label="Загрузка">
        <Skeleton width="100%" height={skeletonHeight} />
        <Skeleton width="100%" height={skeletonHeight} />
      </VStack>
    );
  }
  if (query.isError || query.data === undefined) {
    return (
      <Banner
        status="error"
        title="Не удалось загрузить данные"
        description={errorText(query.error) + ' Проверьте соединение и повторите.'}
        endContent={<Button label="Повторить" variant="secondary" onClick={() => query.refetch()} />}
      />
    );
  }
  return <>{children(query.data)}</>;
}
