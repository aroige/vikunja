-- T010: Create AgentConfiguration schema in PostgreSQL
-- Database: n8n_memory
-- Purpose: Store agent-specific settings (context windows, model selection, prompt versions)

CREATE TABLE IF NOT EXISTS agent_configurations (
  agent_type VARCHAR(50) PRIMARY KEY CHECK (agent_type IN ('supervisor', 'vikunja_specialist', 'calendar_specialist')),
  context_window_size INTEGER NOT NULL CHECK (context_window_size BETWEEN 3 AND 15),
  model VARCHAR(100) NOT NULL,
  prompt_version VARCHAR(100) NOT NULL,
  max_tools INTEGER NOT NULL CHECK (max_tools BETWEEN 5 AND 10),
  tools TEXT[] NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_agent_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_configurations_updated_at
  BEFORE UPDATE ON agent_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_configurations_updated_at();

-- Validation constraint: tools array length must not exceed max_tools
ALTER TABLE agent_configurations 
  ADD CONSTRAINT check_tools_count 
  CHECK (array_length(tools, 1) <= max_tools);

-- Insert default configurations
INSERT INTO agent_configurations (agent_type, context_window_size, model, prompt_version, max_tools, tools)
VALUES 
  ('supervisor', 5, 'gemini-2.0-flash-lite', 'v1.0.0', 5, ARRAY['route_to_specialist']::TEXT[]),
  ('vikunja_specialist', 12, 'gemini-2.0-flash-lite', 'v1.0.0', 10, ARRAY[
    'search_tasks',
    'complete_task',
    'confirm_complete_task',
    'create_task',
    'update_task',
    'get_daily_recommendations',
    'filter_tasks_by_duration',
    'create_project_plan'
  ]::TEXT[]),
  ('calendar_specialist', 10, 'gemini-2.0-flash-lite', 'v1.0.0', 8, ARRAY[
    'check_availability',
    'suggest_time_slot'
  ]::TEXT[])
ON CONFLICT (agent_type) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE agent_configurations IS 'Agent-specific configuration settings';
COMMENT ON COLUMN agent_configurations.agent_type IS 'Unique agent identifier (primary key)';
COMMENT ON COLUMN agent_configurations.context_window_size IS 'Number of messages retained in conversation memory';
COMMENT ON COLUMN agent_configurations.model IS 'LLM model name (e.g., gemini-2.0-flash-lite, gpt-4o-mini)';
COMMENT ON COLUMN agent_configurations.prompt_version IS 'Prompt file version (git commit hash or semver tag)';
COMMENT ON COLUMN agent_configurations.max_tools IS 'Maximum tools available to this agent (5-10)';
COMMENT ON COLUMN agent_configurations.tools IS 'Array of enabled tool names (must exist in MCP server)';
