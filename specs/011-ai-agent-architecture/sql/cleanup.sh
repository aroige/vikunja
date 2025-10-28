#!/bin/bash
# Cleanup script for AI Agent System database schemas
# WARNING: This will DELETE all agent conversation data
#
# Usage:
#   ./cleanup.sh                          # Clean tables without prefix
#   ./cleanup.sh vikunja_                 # Clean tables with prefix
#   TABLE_PREFIX=vikunja_ ./cleanup.sh    # Using environment variable
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
echo "AI Agent System - Database Cleanup"
echo "============================================"
echo ""
echo "⚠️  WARNING: This will DELETE all data! ⚠️"
echo ""
echo "Database: $PGDATABASE"
echo "Host: $PGHOST:$PGPORT"
echo "User: $PGUSER"

if [ -n "$TABLE_PREFIX" ]; then
  echo "Table Prefix: '$TABLE_PREFIX'"
  echo ""
  echo "Tables to be dropped:"
  echo "  - ${TABLE_PREFIX}agent_conversations"
  echo "  - ${TABLE_PREFIX}conversation_messages"
  echo "  - ${TABLE_PREFIX}tool_execution_logs"
  echo "  - ${TABLE_PREFIX}agent_configurations"
  echo ""
  echo "Functions to be dropped:"
  echo "  - ${TABLE_PREFIX}update_agent_conversations_updated_at()"
  echo "  - ${TABLE_PREFIX}update_agent_configurations_updated_at()"
else
  echo "Table Prefix: (none)"
  echo ""
  echo "Tables to be dropped:"
  echo "  - agent_conversations"
  echo "  - conversation_messages"
  echo "  - tool_execution_logs"
  echo "  - agent_configurations"
  echo ""
  echo "Functions to be dropped:"
  echo "  - update_agent_conversations_updated_at()"
  echo "  - update_agent_configurations_updated_at()"
fi

echo ""
echo "============================================"
echo ""

# Export database connection variables
export PGHOST PGPORT PGUSER PGDATABASE

# Confirmation prompt
read -p "Are you sure you want to proceed? Type 'yes' to continue: " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "Cleanup cancelled."
  exit 0
fi

echo "Waiting 3 seconds... Press Ctrl+C to cancel."
sleep 3

echo ""
echo "Dropping tables and functions..."
echo ""

# Drop tables in reverse dependency order
psql -c "DROP TABLE IF EXISTS ${TABLE_PREFIX}conversation_messages CASCADE;" && echo "✓ Dropped ${TABLE_PREFIX}conversation_messages"
psql -c "DROP TABLE IF EXISTS ${TABLE_PREFIX}tool_execution_logs CASCADE;" && echo "✓ Dropped ${TABLE_PREFIX}tool_execution_logs"
psql -c "DROP TABLE IF EXISTS ${TABLE_PREFIX}agent_conversations CASCADE;" && echo "✓ Dropped ${TABLE_PREFIX}agent_conversations"
psql -c "DROP TABLE IF EXISTS ${TABLE_PREFIX}agent_configurations CASCADE;" && echo "✓ Dropped ${TABLE_PREFIX}agent_configurations"

# Drop functions
psql -c "DROP FUNCTION IF EXISTS ${TABLE_PREFIX}update_agent_conversations_updated_at() CASCADE;" && echo "✓ Dropped ${TABLE_PREFIX}update_agent_conversations_updated_at()"
psql -c "DROP FUNCTION IF EXISTS ${TABLE_PREFIX}update_agent_configurations_updated_at() CASCADE;" && echo "✓ Dropped ${TABLE_PREFIX}update_agent_configurations_updated_at()"

echo ""
echo "============================================"
echo "✓ Cleanup complete!"
echo "============================================"
echo ""
echo "To recreate the schema, run:"
if [ -n "$TABLE_PREFIX" ]; then
  echo "  ./setup.sh $TABLE_PREFIX"
else
  echo "  ./setup.sh"
fi
echo ""
