import {defineConfig} from '@playwright/test';

// Сквозные тесты идут против собранного сайта в ДЕМО-режиме (без Supabase).
// Они проверяют интерфейс и сценарии; серверные гарантии проверяет pnpm test:sql.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {baseURL: 'http://127.0.0.1:4173', locale: 'ru-RU', timezoneId: 'Europe/Moscow', trace: 'off'},
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: ''},
  },
});
