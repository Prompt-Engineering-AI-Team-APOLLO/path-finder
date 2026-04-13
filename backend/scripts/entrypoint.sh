#!/bin/sh
# Entrypoint: waits for Postgres (using Python TCP check), runs migrations, starts app.
# Works on any POSIX shell — no bash or pg_isready required.
set -e

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

echo "⏳  Waiting for Postgres at $DB_HOST:$DB_PORT ..."

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

# ── Run migrations ────────────────────────────────────────────────────────────
echo "🔄  Running Alembic migrations..."
alembic upgrade head
echo "✅  Migrations complete."

# ── Hand off to CMD ───────────────────────────────────────────────────────────
echo "🚀  Starting: $*"
exec "$@"
