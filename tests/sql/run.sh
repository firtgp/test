#!/usr/bin/env bash
# Поднимает временный PostgreSQL, применяет shim + миграции + seed и запускает SQL-тесты.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)}"
PORT="${PGPORT_TEST:-54329}"
DIR="$(mktemp -d /tmp/mcsite-pg.XXXXXX)"
RUNAS=""
if [ "$(id -u)" = "0" ]; then chown postgres "$DIR"; RUNAS="su postgres -s /bin/bash -c"; fi
run() { if [ -n "$RUNAS" ]; then $RUNAS "$1"; else bash -c "$1"; fi; }
cleanup() { run "$PGBIN/pg_ctl -D $DIR/data -m immediate stop >/dev/null 2>&1" || true; rm -rf "$DIR"; }
trap cleanup EXIT
run "$PGBIN/initdb -D $DIR/data -U postgres -A trust >/dev/null"
run "$PGBIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR -c listen_addresses=127.0.0.1' -l $DIR/log -w start >/dev/null"
export PGURL="postgres://postgres@127.0.0.1:$PORT/postgres"
psql "$PGURL" -v ON_ERROR_STOP=1 -q -f "$ROOT/tests/sql/shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do psql "$PGURL" -v ON_ERROR_STOP=1 -q -f "$f"; done
psql "$PGURL" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/seed.sql"
echo "migrations + seed applied"
cd "$ROOT" && pnpm exec vitest run --config vitest.sql.config.ts "$@"
