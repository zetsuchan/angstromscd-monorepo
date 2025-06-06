#!/bin/bash
# Test connections to Postgres and ChromaDB
set -e

echo "Testing PostgreSQL connection..."
docker-compose exec -T postgres pg_isready -U postgres -d angstromscd

echo "Testing ChromaDB connection..."
# curl returns non-zero exit if fails
curl -f http://localhost:8000/api/v1/collections >/dev/null && echo "ChromaDB OK"
