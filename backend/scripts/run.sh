#!/bin/sh
# run.sh — Quick-start script for Mac / Linux
# Usage:
#   ./scripts/run.sh           → build and start all services
#   ./scripts/run.sh stop      → stop all services
#   ./scripts/run.sh logs      → tail API logs
#   ./scripts/run.sh migrate   → run Alembic migrations inside Docker
#   ./scripts/run.sh shell     → open a shell inside the API container
#   ./scripts/run.sh test      → run pytest inside Docker
set -e

CMD=${1:-up}

case "$CMD" in
  up)
    echo "🐳  Building and starting Pathfinder..."
    docker compose up --build -d
    echo ""
    echo "✅  Services started."
    echo "   API docs  →  http://localhost:8000/docs"
    echo "   API base  →  http://localhost:8000/api/v1"
    echo ""
    echo "   Tail logs with:  ./scripts/run.sh logs"
    ;;

  stop)
    echo "🛑  Stopping services..."
    docker compose down
    ;;

  logs)
    docker compose logs -f api
    ;;

  migrate)
    echo "🔄  Running Alembic migrations..."
    docker compose exec api alembic upgrade head
    echo "✅  Done."
    ;;

  shell)
    docker compose exec api sh
    ;;

  test)
    echo "🧪  Running tests..."
    docker compose exec api pytest
    ;;

  reset)
    echo "⚠️   Removing containers AND volumes (all DB data will be lost)..."
    docker compose down -v
    ;;

  *)
    echo "Unknown command: $CMD"
    echo "Usage: $0 [up|stop|logs|migrate|shell|test|reset]"
    exit 1
    ;;
esac
