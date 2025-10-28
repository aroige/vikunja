-- T007: Create AgentConversation schema in PostgreSQL
-- Database: n8n_memory
-- Purpose: Track conversation context across agent delegations with PostgreSQL-backed memory
--
-- Usage with prefix:
--   psql -v table_prefix=vikunja_ -f 001_agent_conversations.sql
-- Usage without prefix:
--   psql -f 001_agent_conversations.sql

-- Set default prefix if not provided
\set table_prefix `echo ${TABLE_PREFIX:-}`

CREATE TABLE IF NOT EXISTS :table_prefix\agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('supervisor', 'vikunja_specialist', 'calendar_specialist')),
  messages JSONB DEFAULT '[]'::jsonb,
  session_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS :table_prefix\idx_agent_conversations_user_agent 
  ON :table_prefix\agent_conversations(user_id, agent_type);

CREATE INDEX IF NOT EXISTS :table_prefix\idx_agent_conversations_expires 
  ON :table_prefix\agent_conversations(expires_at) 
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS :table_prefix\idx_agent_conversations_updated 
  ON :table_prefix\agent_conversations(updated_at DESC);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION :table_prefix\update_agent_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER :table_prefix\trigger_agent_conversations_updated_at
  BEFORE UPDATE ON :table_prefix\agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION :table_prefix\update_agent_conversations_updated_at();

-- Comments for documentation
COMMENT ON TABLE :table_prefix\agent_conversations IS 'Stores conversation context for AI agents with context window management';
COMMENT ON COLUMN :table_prefix\agent_conversations.user_id IS 'Vikunja user ID - must exist in Vikunja database';
COMMENT ON COLUMN :table_prefix\agent_conversations.agent_type IS 'Type of agent handling the conversation';
COMMENT ON COLUMN :table_prefix\agent_conversations.messages IS 'Conversation history within context window (array of message objects)';
COMMENT ON COLUMN :table_prefix\agent_conversations.session_data IS 'Structured session state (discovered IDs, pending confirmations)';
COMMENT ON COLUMN :table_prefix\agent_conversations.expires_at IS 'Auto-delete timestamp (default 30 days from creation)';
