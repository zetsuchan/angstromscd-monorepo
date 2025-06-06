# MedLab Chat Infrastructure

Docker-based infrastructure and database services for MedLab Chat by Angstrom AI - providing the foundational data layer for sickle cell disease research conversations.

## Overview

The Infrastructure service provides containerized database and storage solutions for the MedLab Chat microservices ecosystem:

- **PostgreSQL Database**: Structured data persistence for conversations, citations, and user management
- **ChromaDB Vector Store**: High-performance vector embeddings for medical literature search
- **Local Development**: Consistent development environment across team members
- **Production Ready**: Scalable deployment configurations for cloud environments

## Architecture Role

Foundation layer supporting all MedLab Chat services:

```
┌─────────────────────────────────────────────────────┐
│                 MedLab Chat Services                │
├─────────────┬─────────────┬─────────────┬───────────┤
│ Frontend    │ API Service │ BAML        │ Vector    │
│ (React)     │ (Hono.js)   │ (AI)        │ (Search)  │
└─────────────┴─────────────┴─────────────┴───────────┘
                     │                         │
                     ▼                         ▼
┌─────────────────────────────────────────────────────┐
│              Infrastructure Layer                   │
├─────────────────────────┬───────────────────────────┤
│      PostgreSQL         │        ChromaDB           │
│   (Structured Data)     │    (Vector Embeddings)    │
│                         │                           │
│ • Conversations         │ • Medical Literature      │
│ • User Management       │ • Document Embeddings     │
│ • Citations             │ • Semantic Search         │
│ • Workspaces           │ • Citation Clustering     │
│ • Alerts               │ • Content Similarity      │
└─────────────────────────┴───────────────────────────┘
```

## Database Services

### PostgreSQL (Port 5432)
**Purpose**: Primary relational database for structured application data

**Key Tables**:
- `users` - Medical professionals and researchers
- `workspaces` - Project organization (Global, Project X, My Papers)
- `threads` - Conversation branches and thread management
- `messages` - Chat messages with metadata and citations
- `citations` - Medical literature references (PMID/DOI)
- `alerts` - VOE risk warnings and PubMed notifications
- `files` - Uploaded document metadata and processing status

**Medical Domain Schema**:
```sql
-- Sickle cell disease specific tables
CREATE TABLE scd_patients (
    id UUID PRIMARY KEY,
    medical_record_number VARCHAR(50),
    demographics JSONB,
    clinical_history JSONB
);

CREATE TABLE voe_episodes (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES scd_patients(id),
    episode_date TIMESTAMP,
    severity VARCHAR(20),
    risk_factors JSONB
);

CREATE TABLE literature_citations (
    id UUID PRIMARY KEY,
    pmid VARCHAR(20),
    doi VARCHAR(100),
    title TEXT,
    authors TEXT[],
    journal VARCHAR(200),
    publication_date DATE,
    medical_subjects TEXT[]
);
```

### ChromaDB (Port 8000)
**Purpose**: Vector database for semantic search and document embeddings

**Collections**:
- `medical_papers` - Research literature with medical terminology embeddings
- `user_documents` - Uploaded PDFs and research materials
- `clinical_datasets` - CSV data and study results
- `conversation_context` - Chat history embeddings for context awareness

**Vector Operations**:
- Semantic search across medical literature
- Citation similarity and clustering
- Document recommendation systems
- Context-aware conversation threading

## Development Setup

### Prerequisites
- Docker and Docker Compose installed
- 4GB+ available RAM for databases
- Network access for image downloads

### Quick Start

```bash
# Clone the infrastructure repository
cd angstromscd-infra

# Start all database services
docker-compose up -d

# Verify services are running
docker-compose ps

# Or use helper script
./scripts/verify-services.sh

# Check service logs
docker-compose logs postgres
docker-compose logs chromadb

# Connect to PostgreSQL
psql -h localhost -p 5432 -U postgres -d angstromscd

# Test ChromaDB connection
curl http://localhost:8000/api/v1/heartbeat

# Run connectivity checks
./scripts/test-connections.sh
```

### Service Health Checks

```bash
# PostgreSQL health check
docker-compose exec postgres pg_isready -U postgres

# ChromaDB API health check
curl -f http://localhost:8000/api/v1/heartbeat || echo "ChromaDB not ready"

# View resource usage
docker stats angstromscd-postgres angstromscd-chromadb
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and adjust values for custom configuration:

```env
# PostgreSQL Configuration
POSTGRES_DB=angstromscd
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_PORT=5432

# ChromaDB Configuration
CHROMA_PORT=8000
CHROMA_SERVER_CORS_ALLOW_ORIGINS=["http://localhost:5173","http://localhost:3001"]

# Resource Limits
POSTGRES_MAX_CONNECTIONS=100
POSTGRES_SHARED_BUFFERS=256MB
CHROMA_MAX_BATCH_SIZE=1000
```

### Docker Compose Configuration

**Production Optimizations**:
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    command: postgres -c shared_preload_libraries=pg_stat_statements
    
  chromadb:
    image: ghcr.io/chroma-core/chroma:latest
    ports:
      - "${CHROMA_PORT}:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - CHROMA_SERVER_CORS_ALLOW_ORIGINS=${CHROMA_SERVER_CORS_ALLOW_ORIGINS}
    deploy:
      resources:
        limits:
          memory: 2G
```

## Database Initialization

### PostgreSQL Schema Setup

```bash
# Run database migrations
cd scripts/
./setup-database.sh

# Load sample medical data
./load-sample-data.sh

# Create development users
./create-dev-users.sh

# Verify running containers
./verify-services.sh

# Test database connections
./test-connections.sh
```

### ChromaDB Collections Setup

```bash
# Initialize vector collections
python scripts/init-chroma-collections.py

# Load sample medical literature embeddings
python scripts/load-sample-literature.py

# Verify collection health
python scripts/verify-collections.py
```

## Data Management

### Backup and Restore

**PostgreSQL Backup**:
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres angstromscd > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U postgres angstromscd < backup.sql
```

**ChromaDB Backup**:
```bash
# Backup vector collections
docker-compose exec chromadb chroma utils export --path /backup

# Restore vector collections
docker-compose exec chromadb chroma utils import --path /backup
```

### Data Volume Management

```bash
# List data volumes
docker volume ls | grep angstromscd

# Inspect volume details
docker volume inspect angstromscd-infra_postgres_data

# Cleanup (WARNING: destroys all data)
docker-compose down -v
```

## Monitoring and Observability

### Database Metrics

**PostgreSQL Monitoring**:
```sql
-- Connection monitoring
SELECT count(*) FROM pg_stat_activity;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
WHERE schemaname = 'public';

-- Query performance
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

**ChromaDB Monitoring**:
```bash
# Collection statistics
curl http://localhost:8000/api/v1/collections

# System info
curl http://localhost:8000/api/v1/system

# Memory usage
docker stats angstromscd-chromadb --no-stream
```

## Security Considerations

### Database Security
- Strong passwords for all database users
- Network isolation in production environments
- Regular security updates for Docker images
- Encrypted connections (TLS) for production
- Role-based access control for medical data

### Data Privacy
- HIPAA compliance considerations for patient data
- Anonymization of clinical information
- Audit logging for data access
- Secure backup storage and encryption

## Production Deployment

### Cloud Infrastructure
- **AWS RDS**: Managed PostgreSQL with automated backups
- **Google Cloud SQL**: Scaled database with high availability
- **ChromaDB Cloud**: Managed vector database service
- **Container Orchestration**: Kubernetes or Docker Swarm

### Scaling Considerations
- **Read Replicas**: PostgreSQL read scaling for analytics
- **Vector Sharding**: ChromaDB distribution across nodes
- **Connection Pooling**: PgBouncer for database connections
- **Caching Layer**: Redis for frequently accessed data

This infrastructure foundation enables MedLab Chat to provide reliable, scalable, and secure data services for medical research conversations and literature discovery.