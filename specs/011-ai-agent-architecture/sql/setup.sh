#!/bin/bash
# Setup script for AI Agent System database schemas with optional table prefix
#
# Usage:
#   ./setup.sh                          # No prefix (tables: agent_conversations, etc.)
#   ./setup.sh vikunja_                 # With prefix (tables: vikunja_agent_conversations, etc.)
#   TABLE_PREFIX=vikunja_ ./setup.sh    # Using environment variable
#
# Database connection:
#   Set these environment variables to customize connection:
#   - PGHOST (default: 192.168.50.63)
#   - PGPORT (default: 5432)
#   - PGUSER (default: postgres)
#   - PGDATABASE (default: n8n_memory)
#   - PGPASSWORD (will prompt if not set)

set -e  # Exit on error

# Get table prefix from argument or environment variable
TABLE_PREFIX="${1:-${TABLE_PREFIX:-}}"

# Database connection defaults
PGHOST="${PGHOST:-192.168.50.63}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-n8n_memory}"

echo "============================================"
echo "AI Agent System - Database Setup"
echo "============================================"
echo ""
echo "Database: $PGDATABASE"
echo "Host: $PGHOST:$PGPORT"
echo "User: $PGUSER"
if [ -n "$TABLE_PREFIX" ]; then
  echo "Table Prefix: '$TABLE_PREFIX'"
  echo ""
  echo "Tables will be created as:"
  echo "  - ${TABLE_PREFIX}agent_conversations"
  echo "  - ${TABLE_PREFIX}conversation_messages"
  echo "  - ${TABLE_PREFIX}tool_execution_logs"
  echo "  - ${TABLE_PREFIX}agent_configurations"
  echo "  - ${TABLE_PREFIX}session_state"
else
  echo "Table Prefix: (none)"
  echo ""
  echo "Tables will be created as:"
  echo "  - agent_conversations"
  echo "  - conversation_messages"
  echo "  - tool_execution_logs"
  echo "  - session_state"
  echo "  - agent_configurations"
fi
echo ""
echo "============================================"
echo ""

# Function to apply prefix to SQL files
apply_prefix() {
  local file=$1
  if [ -n "$TABLE_PREFIX" ]; then
    # Replace both psql variable syntax AND plain table names with prefixed versions
    sed "s/:table_prefix\\\\/${TABLE_PREFIX}/g; \
         s/\b\(agent_conversations\|conversation_messages\|tool_execution_logs\|agent_configurations\)\b/${TABLE_PREFIX}\1/g; \
  s/\b\(update_agent_conversations_updated_at\|update_agent_configurations_updated_at\|update_session_state_updated_at\)\b/${TABLE_PREFIX}\1/g; \
         s/\b\(idx_conversation_messages_\|idx_tool_execution_logs_\)\([a-z_]*\)\b/${TABLE_PREFIX}\1\2/g; \
  s/\b\(idx_session_state_\)\([a-z_]*\)\b/${TABLE_PREFIX}\1\2/g; \
  s/\b\(check_tools_count\)\b/${TABLE_PREFIX}\1/g" "$file"
  else
    # Remove the psql variable syntax, leaving just the table names
    sed "s/:table_prefix\\\\//g" "$file"
  fi
}

# Export database connection variables
export PGHOST PGPORT PGUSER PGDATABASE

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "ERROR: psql command not found. Please install PostgreSQL client."
  exit 1
fi

# Test database connection
echo "Testing database connection..."
if ! psql -c "SELECT current_database(), version();" &> /dev/null; then
  echo "ERROR: Failed to connect to database. Please check your credentials and connection settings."
  exit 1
fi
echo "✓ Connected successfully"
echo ""

# Apply schemas in order
echo "Creating schemas..."
echo ""

echo "1/5 Creating AgentConversation schema..."
apply_prefix "001_agent_conversations.sql" | psql
echo "✓ AgentConversation schema created"

echo "2/5 Creating ConversationMessage schema..."
apply_prefix "002_conversation_messages.sql" | psql
echo "✓ ConversationMessage schema created"

echo "3/5 Creating ToolExecutionLog schema..."
apply_prefix "003_tool_execution_logs.sql" | psql
echo "✓ ToolExecutionLog schema created"

echo "4/5 Creating AgentConfiguration schema..."
echo "5/5 Creating SessionState schema..."
apply_prefix "005_session_state.sql" | psql
echo "✓ SessionState schema created"
apply_prefix "004_agent_configurations.sql" | psql
echo "✓ AgentConfiguration schema created"

echo ""
echo "============================================"
echo "Verifying installation..."
echo "============================================"
echo ""

# Verify tables exist
echo "Tables created:"
if [ -n "$TABLE_PREFIX" ]; then
  psql -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '${TABLE_PREFIX}%' ORDER BY table_name;"
else
  psql -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%agent%' OR table_name LIKE '%conversation%' OR table_name LIKE '%tool%' OR table_name LIKE '%session_state%') ORDER BY table_name;"
fi

echo ""
echo "Agent configurations:"
if [ -n "$TABLE_PREFIX" ]; then
  psql -c "SELECT agent_type, context_window_size, model, max_tools, array_length(tools, 1) as tool_count FROM ${TABLE_PREFIX}agent_configurations ORDER BY agent_type;"
else
  psql -c "SELECT agent_type, context_window_size, model, max_tools, array_length(tools, 1) as tool_count FROM agent_configurations ORDER BY agent_type;"
fi

echo ""
echo "============================================"
echo "✓ Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Update MCP server config with table prefix (if used)"
echo "  2. Update n8n workflow PostgreSQL nodes with table names"
echo "  3. Test with: psql -c 'SELECT * FROM ${TABLE_PREFIX}agent_configurations;'"
echo ""
