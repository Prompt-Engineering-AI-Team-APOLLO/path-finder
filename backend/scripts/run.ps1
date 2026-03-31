# run.ps1 — Quick-start script for Windows (PowerShell)
# Usage:
#   .\scripts\run.ps1           → build and start all services
#   .\scripts\run.ps1 stop      → stop all services
#   .\scripts\run.ps1 logs      → tail API logs
#   .\scripts\run.ps1 migrate   → run Alembic migrations inside Docker
#   .\scripts\run.ps1 shell     → open a shell inside the API container
#   .\scripts\run.ps1 test      → run pytest inside Docker
param(
    [string]$Command = "up"
)

$ErrorActionPreference = "Stop"

switch ($Command) {
    "up" {
        Write-Host "Building and starting Pathfinder..." -ForegroundColor Cyan
        docker compose up --build -d
        Write-Host ""
        Write-Host "Services started." -ForegroundColor Green
        Write-Host "  API docs  ->  http://localhost:8000/docs"
        Write-Host "  API base  ->  http://localhost:8000/api/v1"
        Write-Host ""
        Write-Host "  Tail logs with:  .\scripts\run.ps1 logs"
    }

    "stop" {
        Write-Host "Stopping services..." -ForegroundColor Yellow
        docker compose down
    }

    "logs" {
        docker compose logs -f api
    }

    "migrate" {
        Write-Host "Running Alembic migrations..." -ForegroundColor Cyan
        docker compose exec api alembic upgrade head
        Write-Host "Done." -ForegroundColor Green
    }

    "shell" {
        docker compose exec api sh
    }

    "test" {
        Write-Host "Running tests..." -ForegroundColor Cyan
        docker compose exec api pytest
    }

    "reset" {
        Write-Host "Removing containers AND volumes (all DB data will be lost)..." -ForegroundColor Red
        $confirm = Read-Host "Are you sure? (y/N)"
        if ($confirm -eq "y") {
            docker compose down -v
        } else {
            Write-Host "Aborted."
        }
    }

    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Usage: .\scripts\run.ps1 [up|stop|logs|migrate|shell|test|reset]"
        exit 1
    }
}
