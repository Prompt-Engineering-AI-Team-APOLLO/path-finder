#!/bin/sh
# Entrypoint: optionally waits for Postgres, runs Alembic migrations, then starts the app.
# Works on any POSIX shell — no bash or pg_isready required.
set -e

# ── Guard: DATABASE_URL must be set ──────────────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
  echo "❌  DATABASE_URL is not set. Aborting."
  exit 1
fi

# ── Parse DB host:port from DATABASE_URL ──────────────────────────────────────
# Uses urlparse so passwords containing '@' are handled correctly.
DB_HOST=$(python3 -c "
from urllib.parse import urlparse
import os
url = os.environ.get('DATABASE_URL', '').replace('+asyncpg', '')
parsed = urlparse(url)
print(parsed.hostname or 'db')
")
DB_PORT=$(python3 -c "
from urllib.parse import urlparse
import os
url = os.environ.get('DATABASE_URL', '').replace('+asyncpg', '')
parsed = urlparse(url)
print(parsed.port or 5432)
")

# ── Wait for Postgres (skip for managed/remote hosts that are always up) ──────
# Local/Docker hostnames ('db', 'localhost', '127.0.0.1') get a TCP readiness
# probe. Remote managed databases (Supabase, Render, RDS…) are assumed to be
# reachable immediately, so we skip the retry loop to avoid slow cold-starts.
is_local() {
  case "$1" in
    db|localhost|127.0.0.1|postgres) return 0 ;;
    *) return 1 ;;
  esac
}

if is_local "$DB_HOST"; then
  echo "⏳  Waiting for local Postgres at $DB_HOST:$DB_PORT ..."
  MAX=30
  I=0
  until python3 -c "
import socket, sys
try:
    s = socket.create_connection(('$DB_HOST', $DB_PORT), timeout=2)
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
"; do
    I=$((I + 1))
    if [ "$I" -ge "$MAX" ]; then
      echo "❌  Postgres not reachable after $MAX attempts. Exiting."
      exit 1
    fi
    echo "   attempt $I/$MAX — retrying in 2s..."
    sleep 2
  done
  echo "✅  Postgres is ready."
else
  echo "ℹ️   Remote database detected ($DB_HOST) — skipping TCP wait."
fi

# ── Run migrations ────────────────────────────────────────────────────────────
echo "🔄  Running Alembic migrations..."
alembic upgrade head
echo "✅  Migrations complete."

# ── Hand off to CMD ───────────────────────────────────────────────────────────
echo "🚀  Starting: $*"
exec "$@"
