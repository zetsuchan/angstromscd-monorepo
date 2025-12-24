-- Combined Migration Script for AngstromSCD
-- Run this in Supabase SQL Editor to set up all required tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. Users Table (complements Supabase auth)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,  -- References auth.users(id)
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- ============================================
-- 2. Conversations Table
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- ============================================
-- 3. Conversation Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    citations JSONB DEFAULT '[]'::jsonb,
    pubmed_articles JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON conversation_messages(created_at);

-- Add sequence column for outbox ordering
ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS sequence BIGINT GENERATED ALWAYS AS IDENTITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_messages_sequence
  ON conversation_messages(sequence);

-- ============================================
-- 4. Conversation Timestamp Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_on_message ON conversation_messages;
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================
-- 5. Conversation Summaries View
-- ============================================
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT
    c.id,
    c.user_id,
    c.title,
    c.created_at,
    c.updated_at,
    COUNT(cm.id) as message_count,
    MAX(cm.created_at) as last_message_at,
    (SELECT content FROM conversation_messages
     WHERE conversation_id = c.id
     ORDER BY created_at DESC
     LIMIT 1) as last_message
FROM conversations c
LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at;

-- ============================================
-- 6. Message Outbox Table (for event delivery)
-- ============================================
CREATE TABLE IF NOT EXISTS message_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  sequence BIGINT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'failed')),
  dedupe_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  dispatched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_message_outbox_status ON message_outbox(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_outbox_dedupe ON message_outbox(dedupe_id);

-- ============================================
-- 7. Outbox Helper Functions
-- ============================================
CREATE OR REPLACE FUNCTION enqueue_conversation_message(
  p_conversation_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_model TEXT DEFAULT NULL,
  p_citations JSONB DEFAULT '[]'::jsonb,
  p_pubmed_articles JSONB DEFAULT '[]'::jsonb,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
  message_id UUID,
  sequence BIGINT
) AS $$
DECLARE
  v_message_id UUID := gen_random_uuid();
  v_dedupe_id TEXT := encode(gen_random_bytes(16), 'hex');
  v_payload JSONB;
BEGIN
  INSERT INTO conversation_messages (
    id, conversation_id, role, content, model, citations, pubmed_articles, metadata
  )
  VALUES (
    v_message_id, p_conversation_id, p_role, p_content, p_model,
    COALESCE(p_citations, '[]'::jsonb),
    COALESCE(p_pubmed_articles, '[]'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING conversation_messages.sequence INTO sequence;

  v_payload := jsonb_build_object(
    'type', 'chat.message.created',
    'messageId', v_message_id,
    'dedupeId', v_dedupe_id,
    'role', p_role,
    'content', p_content,
    'model', p_model,
    'citations', p_citations,
    'metadata', p_metadata
  );

  INSERT INTO message_outbox (
    message_id, conversation_id, event_type, sequence, payload, dedupe_id
  ) VALUES (
    v_message_id, p_conversation_id, 'chat.message.created', sequence, v_payload, v_dedupe_id
  );

  RETURN QUERY SELECT v_message_id, sequence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_outbox_dispatched(p_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE message_outbox
  SET status = 'dispatched',
      dispatched_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP,
      error_message = NULL
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_outbox_failed(p_id UUID, p_error TEXT) RETURNS VOID AS $$
BEGIN
  UPDATE message_outbox
  SET status = 'failed',
      error_message = p_error,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Row Level Security (RLS) Policies
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (for idempotent migrations)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON conversation_messages;
DROP POLICY IF EXISTS "Users can add messages to own conversations" ON conversation_messages;

-- Users can only see/modify their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Conversations belong to users
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Messages belong to conversation owners
CREATE POLICY "Users can view messages in own conversations" ON conversation_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can add messages to own conversations" ON conversation_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND user_id = auth.uid())
  );

-- Done!
SELECT 'Migration completed successfully!' as status;
