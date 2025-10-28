-- T008: Create ConversationMessage schema in PostgreSQL
-- Database: n8n_memory
-- Purpose: Individual messages in agent conversations (user or assistant)

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL CHECK (LENGTH(content) <= 10000),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation 
  ON conversation_messages(conversation_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_role 
  ON conversation_messages(conversation_id, role);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp 
  ON conversation_messages(timestamp DESC);

-- GIN index for metadata JSON queries
CREATE INDEX IF NOT EXISTS idx_conversation_messages_metadata 
  ON conversation_messages USING GIN (metadata);

-- Comments for documentation
COMMENT ON TABLE conversation_messages IS 'Individual messages in agent conversations';
COMMENT ON COLUMN conversation_messages.conversation_id IS 'Foreign key to parent conversation';
COMMENT ON COLUMN conversation_messages.role IS 'Message sender: user, assistant, or system';
COMMENT ON COLUMN conversation_messages.content IS 'Message text content (max 10,000 characters)';
COMMENT ON COLUMN conversation_messages.metadata IS 'Tool calls, function results, trace IDs, and other structured data';
