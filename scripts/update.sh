#!/bin/bash
set -e

APP_DIR="/opt/foxinburg"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$APP_DIR"

echo "[deploy] pulling latest code..."
git pull origin main

echo "[deploy] rebuilding and restarting containers..."
docker compose -f "$COMPOSE_FILE" down
docker compose -f "$COMPOSE_FILE" up -d --build

echo "[deploy] running migrations..."
docker compose -f "$COMPOSE_FILE" exec -T backend alembic upgrade head

echo "[deploy] status:"
docker compose -f "$COMPOSE_FILE" ps

echo "[deploy] done"
