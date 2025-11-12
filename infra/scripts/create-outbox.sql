-- Enable pgcrypto for UUID generation if it is not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure messages have a global sequence for replay
ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS sequence BIGINT GENERATED ALWAYS AS IDENTITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_messages_sequence
  ON conversation_messages(sequence);

-- Outbox table to guarantee at-least-once delivery semantics
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

-- Function to insert a message and enqueue outbox row atomically
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
    id,
    conversation_id,
    role,
    content,
    model,
    citations,
    pubmed_articles,
    metadata
  )
  VALUES (
    v_message_id,
    p_conversation_id,
    p_role,
    p_content,
    p_model,
    COALESCE(p_citations, '[]'::jsonb),
    COALESCE(p_pubmed_articles, '[]'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING sequence INTO sequence;

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
    message_id,
    conversation_id,
    event_type,
    sequence,
    payload,
    dedupe_id
  ) VALUES (
    v_message_id,
    p_conversation_id,
    'chat.message.created',
    sequence,
    v_payload,
    v_dedupe_id
  );

  RETURN QUERY SELECT v_message_id, sequence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark an outbox entry as dispatched
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

-- Function to record failure and preserve the error
CREATE OR REPLACE FUNCTION mark_outbox_failed(p_id UUID, p_error TEXT) RETURNS VOID AS $$
BEGIN
  UPDATE message_outbox
  SET status = 'failed',
      error_message = p_error,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;
