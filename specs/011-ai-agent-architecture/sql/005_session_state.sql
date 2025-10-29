-- T021d: Create SessionState schema in PostgreSQL
-- Database: n8n_memory
-- Purpose: Structured per-user workflow/session data separate from rolling conversation messages
-- Fields focus on durable decision artifacts (pending confirmations, discovered options, planning context)
-- Usage with prefix:
--   psql -v table_prefix=vikunja_ -f 005_session_state.sql
-- Usage without prefix:
--   psql -f 005_session_state.sql

-- Set default prefix if not provided
\set table_prefix `echo ${TABLE_PREFIX:-}`

CREATE TABLE IF NOT EXISTS :table_prefix\session_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  -- A compact JSON object with strictly structured keys:
  -- {
  --   pendingConfirmation: { taskId: <uuid>, token: <string>, createdAt: <timestamp> } | null,
  --   lastTaskOptions: [ { taskId: <uuid>, title: <string>, confidence: <float> } ],
  --   planning: { active: <bool>, step: <string>, data: <object> } | null,
  --   meta: { version: 'v1', updatedBy: <agent_type> }
  -- }
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lookup & json querying
CREATE INDEX IF NOT EXISTS :table_prefix\idx_session_state_user
  ON :table_prefix\session_state(user_id);

CREATE INDEX IF NOT EXISTS :table_prefix\idx_session_state_updated
  ON :table_prefix\session_state(updated_at DESC);

CREATE INDEX IF NOT EXISTS :table_prefix\idx_session_state_state_gin
  ON :table_prefix\session_state USING GIN (state);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION :table_prefix\update_session_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER :table_prefix\trigger_session_state_updated_at
  BEFORE UPDATE ON :table_prefix\session_state
  FOR EACH ROW
  EXECUTE FUNCTION :table_prefix\update_session_state_updated_at();

-- Comments for documentation
COMMENT ON TABLE :table_prefix\session_state IS 'Structured per-user workflow/session durable state separate from transient conversation window';
COMMENT ON COLUMN :table_prefix\session_state.state IS 'JSON object with pendingConfirmation, lastTaskOptions, planning, meta';

