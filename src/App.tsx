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
import {keys} from './app/hooks';
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
const AccountPage = lazy(() => import('./pages/Account').then(m => ({default: m.AccountPage})));
const AdminPage = lazy(() => import('./pages/admin/Admin').then(m => ({default: m.AdminPage})));

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
                <Route path="/account" element={<AccountPage />} />
                <Route path="/admin" element={<AdminPage />} />
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
