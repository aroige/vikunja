-- Cleanup script for AI Agent System
-- WARNING: This will DELETE all agent conversation data
-- Use only for development/testing reset

\echo 'WARNING: This will delete ALL agent conversation data!'
\echo 'Press Ctrl+C to cancel, or wait 5 seconds to continue...'
SELECT pg_sleep(5);

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS conversation_messages CASCADE;
DROP TABLE IF EXISTS tool_execution_logs CASCADE;
DROP TABLE IF EXISTS agent_conversations CASCADE;
DROP TABLE IF EXISTS agent_configurations CASCADE;
DROP TABLE IF EXISTS session_state CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_agent_conversations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_agent_configurations_updated_at() CASCADE;

\echo 'All agent system tables (including session_state) and functions dropped successfully.'
\echo 'Run setup_all.sql to recreate the schema.'
