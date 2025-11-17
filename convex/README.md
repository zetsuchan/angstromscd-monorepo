# Convex Setup - Real-time Features

This directory contains Convex functions for real-time collaborative features.

## ⚠️ CRITICAL: NON-PHI Data Only

**DO NOT** migrate patient data (PHI) to Convex:
- ❌ `scd_patients` - Patient records
- ❌ `voe_episodes` - Clinical episodes
- ❌ `literature_citations` - Medical records with identifiers
- ❌ Any table containing Protected Health Information

**Supabase remains the source of truth for all medical data.**

## What's in Convex

✅ Collaborative notes on research papers (de-identified)
✅ Chat messages (de-identified discussions)
✅ Workspace presence (real-time user status)
✅ VOE alerts (anonymized risk notifications)
✅ Activity feed (user actions, no PHI)

## Setup Instructions

### 1. Install Convex CLI

```bash
npm install -g convex
```

### 2. Login to Convex

```bash
npx convex login
```

### 3. Create a New Project

```bash
npx convex dev
```

This will:
- Create a new Convex project
- Generate `convex/_generated` directory
- Start the development server
- Give you a deployment URL

### 4. Configure Environment Variables

Add to `.env.local`:

```bash
# Convex Configuration
CONVEX_URL=https://your-deployment-url.convex.cloud

# Enable Convex features
USE_CONVEX_REALTIME=true
CONVEX_NOTES=true
CONVEX_PRESENCE=true
```

### 5. Deploy to Production

```bash
npx convex deploy
```

## Using Convex in the App

### Backend (API)

```typescript
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const convex = new ConvexClient(process.env.CONVEX_URL!);

// Create a note
await convex.mutation(api.notes.create, {
  paperId: "paper-123",
  authorId: userId,
  content: "Interesting finding about...",
});

// List notes
const notes = await convex.query(api.notes.listByPaper, {
  paperId: "paper-123",
});
```

### Frontend (React)

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

function PaperNotes({ paperId }) {
  // Real-time updates automatically
  const notes = useQuery(api.notes.listByPaper, { paperId });
  const createNote = useMutation(api.notes.create);

  const handleCreateNote = async (content: string) => {
    await createNote({
      paperId,
      authorId: userId,
      content,
    });
  };

  return (
    <div>
      {notes?.map((note) => (
        <div key={note._id}>{note.content}</div>
      ))}
    </div>
  );
}
```

## Dual-Write Pattern (Testing)

When testing Convex, enable dual-write mode:

```bash
DUAL_WRITE=true
```

This writes to both Supabase and Convex for data consistency validation.

## Schema Updates

After modifying `convex/schema.ts`:

```bash
npx convex dev  # Development
npx convex deploy  # Production
```

Convex automatically handles schema migrations.

## Resources

- [Convex Docs](https://docs.convex.dev/)
- [React Integration](https://docs.convex.dev/client/react)
- [Vector Search](https://docs.convex.dev/vector-search)
- [Migration Guide](../MIGRATION_GUIDE.md)
