.PHONY: help install dev test lint format migrate seed docker-up docker-down

PYTHON := python3
PIP := $(PYTHON) -m pip
UV := uv  # optional faster installer

help:          ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install:       ## Install production dependencies
	$(PIP) install -r requirements.txt

install-dev:   ## Install all dependencies including dev/test tools
	$(PIP) install -r requirements-dev.txt
	pre-commit install

dev:           ## Run development server with hot-reload
	uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

test:          ## Run test suite
	pytest

test-cov:      ## Run tests with HTML coverage report
	pytest --cov=app --cov-report=html
	@echo "Coverage report: htmlcov/index.html"

lint:          ## Run all linters
	flake8 app tests
	mypy app

format:        ## Auto-format code (black + isort)
	black app tests
	isort app tests

format-check:  ## Check formatting without modifying files
	black --check app tests
	isort --check-only app tests

# ── Database ──────────────────────────────────────────────────────────────────

migrate:       ## Run all pending Alembic migrations
	alembic upgrade head

migrate-down:  ## Roll back the last migration
	alembic downgrade -1

migrate-new:   ## Create a new migration (usage: make migrate-new msg="add users table")
	alembic revision --autogenerate -m "$(msg)"

migrate-history: ## Show migration history
	alembic history --verbose

# ── Docker ────────────────────────────────────────────────────────────────────

docker-up:     ## Start all services (Postgres, Redis, API)
	docker compose up -d

docker-down:   ## Stop all services
	docker compose down

docker-logs:   ## Tail API logs
	docker compose logs -f api

docker-build:  ## Rebuild the API image
	docker compose build api

docker-shell:  ## Open a shell inside the running API container
	docker compose exec api bash

# ── Misc ──────────────────────────────────────────────────────────────────────

secret:        ## Generate a new SECRET_KEY
	python3 -c "import secrets; print(secrets.token_hex(32))"

clean:         ## Remove Python cache files
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; \
	find . -name "*.pyc" -delete; \
	rm -rf .pytest_cache .mypy_cache htmlcov .coverage
