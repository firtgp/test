#!/usr/bin/env bash
# Установка сайта на чистый VPS с Debian или Ubuntu. Запускать от root.
# Ставит nginx и Node.js, собирает сайт из репозитория и публикует его на порту 80.
# Повторный запуск обновляет сайт до последней версии ветки.
#
# Без файла /opt/mcsite/.env сайт собирается в ДЕМО-режиме (данные в браузере посетителя).
# Для рабочего режима положите туда VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY и запустите скрипт снова.
set -euo pipefail

REPO="${REPO:-https://github.com/firtgp/test.git}"
BRANCH="${BRANCH:-claude/skill-uiux-pro-max-v7xtyn}"
APP=/opt/mcsite
WEB=/var/www/mcsite

if [ "$(id -u)" != "0" ]; then echo "Запустите от root" >&2; exit 1; fi
if ! command -v apt-get >/dev/null; then echo "Нужен Debian или Ubuntu (apt-get не найден)" >&2; exit 1; fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx git curl ca-certificates

NODE_MAJOR="$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/' || true)"
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm install -g pnpm@10

if [ -d "$APP/.git" ]; then
  git -C "$APP" fetch --depth 1 origin "$BRANCH"
  git -C "$APP" reset --hard FETCH_HEAD
else
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP"
fi

cd "$APP"
pnpm install --frozen-lockfile
pnpm exec vite build

mkdir -p "$WEB"
rm -rf "${WEB:?}"/*
cp -r dist/. "$WEB/"

cat > /etc/nginx/sites-available/mcsite <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/mcsite;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # Файлы сборки имеют хеш в имени: их можно кешировать надолго.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Одностраничное приложение: все остальные адреса отдают index.html.
    location / {
        add_header Cache-Control "no-cache";
        try_files $uri /index.html;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/mcsite /etc/nginx/sites-enabled/mcsite
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then ufw allow 80/tcp; fi

IP="$(curl -fsS -m 5 https://api.ipify.org || hostname -I | awk '{print $1}')"
echo
echo "Готово. Сайт: http://$IP/"
if [ ! -f "$APP/.env" ]; then echo "Режим: ДЕМО (нет $APP/.env)."; fi
