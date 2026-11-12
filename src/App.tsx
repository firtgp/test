import {lazy, Suspense, useEffect} from 'react';
import {BrowserRouter, Route, Routes, useLocation} from 'react-router';
import {QueryClient, QueryClientProvider, useQueryClient} from '@tanstack/react-query';
import {Theme} from '@astryxdesign/core/theme';
import {LinkProvider} from '@astryxdesign/core/Link';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import ruRU from '@astryxdesign/core/locales/ru-RU.generated.js';
import {themes, defaultThemeSlug} from './astryx-themes';
import {RouterLink} from './app/RouterLink';
import {LazyBoundary} from './components/LazyBoundary';
import {Shell} from './app/Shell';
import {CABINET_ROOTS, keys} from './app/hooks';
import {backend} from './data';
import {Home} from './pages/Home';
import {ServersPage} from './pages/Servers';
import {StartPage} from './pages/Start';
import {LoginPage, RegisterPage, ForgotPage, ResetPage} from './pages/Auth';
import {NotFoundPage} from './pages/NotFound';

// Тяжёлые разделы (Markdown, таблицы, админка) грузятся только при переходе в них.
const ServerPage = lazy(() => import('./pages/Server').then(m => ({default: m.ServerPage})));
const RulesPage = lazy(() => import('./pages/Rules').then(m => ({default: m.RulesPage})));
const NewsListPage = lazy(() => import('./pages/News').then(m => ({default: m.NewsListPage})));
const NewsItemPage = lazy(() => import('./pages/News').then(m => ({default: m.NewsItemPage})));
// Кабинет игрока: каркас и разделы — отдельные файлы, грузятся при входе в кабинет.
const AccountLayout = lazy(() => import('./pages/account/Layout').then(m => ({default: m.AccountLayout})));
const OverviewPage = lazy(() => import('./pages/account/Overview').then(m => ({default: m.OverviewPage})));
const ShopPage = lazy(() => import('./pages/account/Shop').then(m => ({default: m.ShopPage})));
const RanksPage = lazy(() => import('./pages/account/Shop').then(m => ({default: m.RanksPage})));
const WalletPage = lazy(() => import('./pages/account/Wallet').then(m => ({default: m.WalletPage})));
const SettingsPage = lazy(() => import('./pages/account/Settings').then(m => ({default: m.SettingsPage})));
const AdminPage = lazy(() => import('./pages/admin/Admin').then(m => ({default: m.AdminPage})));
// Галерея сцен — рабочий инструмент: доступна только в режиме разработки.
const ArtGallery = lazy(() => import('./pages/ArtGallery'));

const queryClient = new QueryClient({
  defaultOptions: {queries: {retry: 1, staleTime: 15_000, refetchOnWindowFocus: true}},
});

function AuthSync() {
  const qc = useQueryClient();
  useEffect(
    () =>
      backend.onAuthChange(() => {
        qc.invalidateQueries({queryKey: keys.account});
        qc.invalidateQueries({queryKey: keys.sessions});
        // Баланс, заказы и ранг принадлежат игроку: при смене аккаунта перечитываются.
        CABINET_ROOTS.forEach(root => qc.invalidateQueries({queryKey: [root]}));
      }),
    [qc],
  );
  return null;
}

function ScrollToTop() {
  const {pathname} = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      <InternationalizationProvider locale="ru-RU" messages={{'ru-RU': ruRU}}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LinkProvider component={RouterLink}>
            <AuthSync />
            <ScrollToTop />
            <Shell>
              <LazyBoundary>
              <Suspense fallback={<p className="mc-page" role="status">Загрузка…</p>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/servers" element={<ServersPage />} />
                <Route path="/servers/:slug" element={<ServerPage />} />
                <Route path="/start" element={<StartPage />} />
                <Route path="/news" element={<NewsListPage />} />
                <Route path="/news/:slug" element={<NewsItemPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot" element={<ForgotPage />} />
                <Route path="/reset" element={<ResetPage />} />
                <Route path="/account" element={<AccountLayout />}>
                  <Route index element={<OverviewPage />} />
                  <Route path="shop" element={<ShopPage />} />
                  <Route path="ranks" element={<RanksPage />} />
                  <Route path="wallet" element={<WalletPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="/admin" element={<AdminPage />} />
                {import.meta.env.DEV ? <Route path="/art" element={<ArtGallery />} /> : null}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </Suspense>
              </LazyBoundary>
            </Shell>
          </LinkProvider>
        </BrowserRouter>
      </QueryClientProvider>
      </InternationalizationProvider>
    </Theme>
  );
}
