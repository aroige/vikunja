-- Master Schema Setup for AI Agent System
-- Database: n8n_memory
-- Run as: psql -h 192.168.50.63 -U postgres -d n8n_memory -f setup_all.sql

-- Phase 2: Foundational Database Schemas (T007-T010)

\echo 'Creating AI Agent System database schemas...'

-- T007: AgentConversation schema
\i 001_agent_conversations.sql

-- T008: ConversationMessage schema
\i 002_conversation_messages.sql

-- T009: ToolExecutionLog schema
\i 003_tool_execution_logs.sql

-- T010: AgentConfiguration schema
\i 004_agent_configurations.sql

-- T021d: SessionState schema
\i 005_session_state.sql

\echo 'Schema setup complete!'
\echo ''
\echo 'Verifying tables...'

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'agent_conversations',
    'conversation_messages',
    'tool_execution_logs',
    'agent_configurations',
    'session_state'
  )
ORDER BY table_name;

\echo ''
\echo 'Verifying agent configurations...'

-- Show default agent configurations
SELECT 
  agent_type,
  context_window_size,
  model,
  prompt_version,
  max_tools,
  array_length(tools, 1) as tool_count
FROM agent_configurations
ORDER BY agent_type;

\echo ''
\echo 'Setup verification complete! All Phase 2 database schemas are ready.'
