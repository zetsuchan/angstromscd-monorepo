# @angstromscd/queue

PostgreSQL Message Queue (PGMQ) integration for AngstromSCD medical alerts and notifications.

## Overview

This package provides a type-safe wrapper around PGMQ for handling various medical alerts and notifications in the AngstromSCD system, including:

- VOE (Vaso-Occlusive Episode) alerts
- Medication reminders
- Lab result notifications
- Clinical trial updates
- Medical audit logging

## Installation

```bash
bun install
```

## Setup

1. Ensure PostgreSQL is running with PGMQ extension installed (handled by Docker setup)
2. Run database migrations to create queues:
   ```bash
   cd infra && ./scripts/setup-database.sh
   ```

## Usage

### Basic Queue Operations

```typescript
import { PGMQClient } from '@angstromscd/queue';

const queue = new PGMQClient({
  host: 'localhost',
  port: 5432,
  database: 'angstromscd',
  username: 'postgres',
  password: 'password',
});

// Send a message
const msgId = await queue.send('queue_name', { data: 'example' });

// Read messages
const messages = await queue.read('queue_name', 30, 10); // visibility timeout: 30s, limit: 10

// Delete a message
await queue.delete('queue_name', msgId);
```

### Medical-Specific Features

```typescript
import { MedicalQueueService } from '@angstromscd/queue';

const medQueue = new MedicalQueueService(config);

// Send VOE alert
await medQueue.sendVOEAlert('patient-123', 'high', {
  hemoglobin: 6.5,
  oxygenSaturation: 88,
  painLevel: 8,
});

// Schedule medication reminder
await medQueue.sendMedicationReminder(
  'patient-456',
  'Hydroxyurea',
  '500mg',
  new Date('2024-01-15T14:00:00')
);

// Send lab result notification
await medQueue.sendLabResultNotification(
  'patient-789',
  'Complete Blood Count',
  { hemoglobin: 7.2, hematocrit: 21.5 },
  true // abnormal flag
);
```

## API Endpoints

The API service exposes the following queue endpoints:

- `POST /api/queue/voe-alert` - Send VOE alert
- `POST /api/queue/medication-reminder` - Schedule medication reminder
- `POST /api/queue/lab-result` - Send lab result notification
- `GET /api/queue/alerts/:type` - Get pending alerts by type (voe, medication, lab)

## Running Examples

```bash
# Run medical alerts example
bun run packages/queue/examples/medical-alerts.ts

# Run alert worker (processes queue messages)
bun run packages/queue/examples/alert-worker.ts
```

## Queue Architecture

The system uses PostgreSQL's PGMQ extension to provide:

- **Exactly-once delivery**: Messages are guaranteed to be delivered exactly once
- **Visibility timeout**: Messages become invisible while being processed
- **Message archiving**: Processed messages can be archived for audit trails
- **Partitioned queues**: High-volume queues can be partitioned by time interval

## Security Considerations

- All patient data in queues should be encrypted at rest
- Queue access should be restricted to authorized services only
- Implement rate limiting for queue operations
- Regular cleanup of archived messages per retention policy