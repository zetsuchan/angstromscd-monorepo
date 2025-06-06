# OrbStack Setup for AngstromSCD Infrastructure

This guide provides OrbStack-specific setup instructions for the AngstromSCD infrastructure services. OrbStack offers faster performance and better resource efficiency compared to Docker Desktop on macOS.

## Prerequisites

- [OrbStack](https://orbstack.dev) installed on macOS
- At least 4GB RAM available for database services
- Network access for container image downloads

## Quick Start with OrbStack

### 1. Start Infrastructure Services

```bash
# Navigate to infrastructure directory
cd infra/

# Start all services using OrbStack's Docker compatibility
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 2. Verify Service Health

```bash
# Check all services
./scripts/verify-services.sh

# Individual service checks
docker-compose logs postgres
docker-compose logs chromadb

# Test connectivity
./scripts/test-connections.sh
```

### 3. Initialize Databases

```bash
# Set up PostgreSQL schema and sample data
./scripts/setup-database.sh

# Verify database initialization
psql -h localhost -p 5432 -U postgres -d angstromscd -c "\dt"
```

## OrbStack-Specific Optimizations

### Resource Configuration

OrbStack automatically manages resource allocation, but you can optimize for medical research workloads:

```yaml
# docker-compose.override.yml (create this file)
version: '3.8'
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
    environment:
      # Optimize for medical data workloads
      - POSTGRES_SHARED_BUFFERS=256MB
      - POSTGRES_EFFECTIVE_CACHE_SIZE=512MB
      - POSTGRES_WORK_MEM=8MB

  chromadb:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    environment:
      # ChromaDB optimizations for medical literature embeddings
      - CHROMA_SERVER_CORS_ALLOW_ORIGINS=["http://localhost:5173","http://localhost:3001"]
```

### Network Configuration

OrbStack provides seamless network integration. Services are accessible via:

```bash
# PostgreSQL connection
psql -h localhost -p 5432 -U postgres -d angstromscd

# ChromaDB API endpoint
curl http://localhost:8000/api/v1/heartbeat

# Direct container access (OrbStack feature)
curl http://chromadb.orb.local:8000/api/v1/heartbeat
```

## Development Workflow

### Start Development Environment

```bash
# Quick development setup
./dev.sh  # This script will work with OrbStack automatically

# Manual service management
docker-compose up -d postgres chromadb
```

### Container Management

```bash
# View running containers with OrbStack's enhanced output
docker ps

# Stream logs from all services
docker-compose logs -f

# Access container shells
docker-compose exec postgres bash
docker-compose exec chromadb sh
```

### Performance Monitoring

```bash
# Monitor resource usage (OrbStack provides better metrics)
docker stats

# PostgreSQL performance
docker-compose exec postgres pg_stat_activity

# ChromaDB collection status
curl http://localhost:8000/api/v1/collections
```

## OrbStack vs Docker Desktop

### Performance Benefits
- **Faster startup**: 2-3x faster container startup times
- **Lower resource usage**: More efficient memory and CPU utilization
- **Native networking**: Seamless localhost access without port forwarding issues
- **File system performance**: Better volume mount performance for medical data

### Development Experience
- **Integrated terminal**: Direct container access through OrbStack UI
- **Visual monitoring**: Built-in container and resource monitoring
- **Automatic cleanup**: Better garbage collection of unused containers and images

## Medical Data Considerations

### HIPAA Compliance with OrbStack
- OrbStack runs containers locally, maintaining data locality
- No cloud dependencies for local development
- Better control over medical data processing

### Performance for Medical Workloads
```bash
# Optimize PostgreSQL for medical record queries
docker-compose exec postgres psql -U postgres -d angstromscd -c "
  ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
  ALTER SYSTEM SET max_connections = 100;
  ALTER SYSTEM SET shared_buffers = '256MB';
  SELECT pg_reload_conf();
"

# Optimize ChromaDB for medical literature embeddings
curl -X POST http://localhost:8000/api/v1/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "medical_papers",
    "metadata": {"hnsw:space": "cosine", "hnsw:M": 16}
  }'
```

## Troubleshooting

### Common OrbStack Issues

**Port conflicts:**
```bash
# Check for port usage
lsof -i :5432
lsof -i :8000

# Stop conflicting services
brew services stop postgresql
```

**Container connectivity:**
```bash
# Test internal networking
docker-compose exec postgres ping chromadb

# Verify service discovery
docker network ls
docker network inspect infra_default
```

**Performance issues:**
```bash
# Check OrbStack resource allocation
orb status

# Monitor container resource usage
docker stats --no-stream
```

### Medical Data Validation

```bash
# Verify medical schema integrity
./scripts/test-connections.sh

# Check ChromaDB medical collections
python scripts/verify-collections.py

# Validate sample medical data
docker-compose exec postgres psql -U postgres -d angstromscd -c "
  SELECT COUNT(*) FROM scd_patients;
  SELECT COUNT(*) FROM voe_episodes;
  SELECT COUNT(*) FROM literature_citations;
"
```

## Integration with AngstromSCD Services

### Service Dependencies
The OrbStack setup integrates seamlessly with all AngstromSCD services:

- **Frontend** (`apps/frontend/`): Connects to databases via localhost
- **API** (`apps/api/`): Uses Supabase client with local PostgreSQL
- **BAML** (`packages/baml/`): Accesses medical literature embeddings
- **Vector** (`packages/vector/`): Manages ChromaDB collections

### Environment Variables
```bash
# Add to your shell profile (.zshrc, .bashrc)
export SUPABASE_URL="http://localhost:3001"  # Local API endpoint
export DATABASE_URL="postgresql://postgres:password@localhost:5432/angstromscd"
export CHROMA_URL="http://localhost:8000"
```

This setup provides optimal performance for medical research development while maintaining compatibility with the broader AngstromSCD ecosystem.