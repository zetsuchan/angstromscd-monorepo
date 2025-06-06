#!/bin/bash
# Create initial tables inside the postgres container
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
docker-compose exec -T postgres psql -U postgres -d angstromscd < "$SCRIPT_DIR/init-db.sql"
