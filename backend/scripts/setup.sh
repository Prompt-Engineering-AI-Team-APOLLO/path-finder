#!/bin/sh
# setup.sh — First-time project setup (Mac / Linux)
# Run once after cloning: sh scripts/setup.sh
set -e

echo "🔧  Pathfinder — First-time setup"
echo "=================================="

# ── Check Docker ──────────────────────────────────────────────────────────────
if ! command -v docker > /dev/null 2>&1; then
  echo "❌  Docker not found. Install it from https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version > /dev/null 2>&1; then
  echo "❌  Docker Compose V2 not found. Update Docker Desktop or install the plugin."
  exit 1
fi

echo "✅  Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
echo "✅  Docker Compose $(docker compose version --short)"

# ── Copy .env ─────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅  .env created from .env.example"
  echo ""
  echo "   ⚠️  Open .env and set at minimum:"
  echo "      OPENAI_API_KEY=sk-..."
  echo "      SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))' 2>/dev/null || echo '<run: openssl rand -hex 32>')"
  echo ""
else
  echo "ℹ️   .env already exists — skipping copy."
fi

# ── Build & start ─────────────────────────────────────────────────────────────
echo ""
echo "🐳  Building Docker images (first build may take ~2 min)..."
docker compose build

echo ""
echo "🚀  Starting services..."
docker compose up -d

echo ""
echo "✅  Setup complete!"
echo ""
echo "   API docs  →  http://localhost:8000/docs"
echo "   API base  →  http://localhost:8000/api/v1"
echo ""
echo "   Useful commands:"
echo "     ./scripts/run.sh logs     — tail logs"
echo "     ./scripts/run.sh stop     — stop everything"
echo "     ./scripts/run.sh migrate  — re-run migrations"
