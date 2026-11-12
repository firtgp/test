import {Component, type ReactNode} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';

/**
 * Граница для частей сайта, которые грузятся отдельными файлами.
 * Если файл не загрузился (обрыв связи, обновление сайта во время просмотра),
 * остальная страница продолжает работать, а на месте блока появляется «Повторить».
 */
export class LazyBoundary extends Component<{children: ReactNode; silent?: boolean}, {failed: boolean}> {
  state = {failed: false};

  static getDerivedStateFromError() {
    return {failed: true};
  }

  render() {
    if (!this.state.failed) return this.props.children;
    // Украшение без смысловой нагрузки при сбое просто не показывается.
    if (this.props.silent) return null;
    return (
      <section className="mc-page" aria-label="Ошибка загрузки">
        <Banner
          status="error"
          title="Эта часть страницы не загрузилась"
          description="Проверьте соединение с интернетом и повторите."
          endContent={<Button label="Повторить" variant="secondary" onClick={() => window.location.reload()} />}
        />
      </section>
    );
  }
}
