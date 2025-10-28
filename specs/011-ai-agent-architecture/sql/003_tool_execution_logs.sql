-- T009: Create ToolExecutionLog schema in PostgreSQL
-- Database: n8n_memory
-- Purpose: Audit trail and debugging data for all MCP tool calls

CREATE TABLE IF NOT EXISTS tool_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(255) NOT NULL,
  tool_name VARCHAR(100) NOT NULL,
  args JSONB NOT NULL,
  result JSONB NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'error', 'needs_clarification')),
  agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('supervisor', 'vikunja_specialist', 'calendar_specialist')),
  user_id VARCHAR(255) NOT NULL,
  latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
  tokens_used INTEGER CHECK (tokens_used >= 0),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance and analytics
CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_trace 
  ON tool_execution_logs(trace_id);

CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_user 
  ON tool_execution_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_tool 
  ON tool_execution_logs(tool_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_status 
  ON tool_execution_logs(status, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_agent 
  ON tool_execution_logs(agent_type, timestamp DESC);

-- Composite index for cost tracking queries
CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_cost_tracking 
  ON tool_execution_logs(user_id, agent_type, timestamp DESC) 
  WHERE tokens_used IS NOT NULL;

-- GIN indexes for JSON queries
CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_args 
  ON tool_execution_logs USING GIN (args);

CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_result 
  ON tool_execution_logs USING GIN (result);

-- Comments for documentation
COMMENT ON TABLE tool_execution_logs IS 'Audit trail for all MCP tool executions with performance metrics';
COMMENT ON COLUMN tool_execution_logs.trace_id IS 'Request trace ID for correlation - format: {userId}-{timestamp}-{uuid}';
COMMENT ON COLUMN tool_execution_logs.tool_name IS 'Name of executed MCP tool (must be registered)';
COMMENT ON COLUMN tool_execution_logs.args IS 'Tool input arguments (sensitive fields redacted)';
COMMENT ON COLUMN tool_execution_logs.result IS 'Tool output result (sensitive fields redacted)';
COMMENT ON COLUMN tool_execution_logs.status IS 'Execution outcome: success, error, or needs_clarification';
COMMENT ON COLUMN tool_execution_logs.latency_ms IS 'Tool execution time in milliseconds';
COMMENT ON COLUMN tool_execution_logs.tokens_used IS 'LLM tokens consumed (if applicable)';
