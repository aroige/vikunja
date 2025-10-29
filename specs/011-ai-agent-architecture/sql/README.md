# Database Schema Setup

This directory contains PostgreSQL schema definitions for the AI Agent System conversation memory.

## Prerequisites

- PostgreSQL server (yours: 192.168.50.63)
- Database: `n8n_memory` (must be created first)
- User: `postgres` with appropriate permissions
- `psql` command-line client installed

## Quick Setup

### Recommended: Using the Setup Script (with optional prefix)

The setup script automatically handles table prefixing and provides better error handling:

```bash
# From this directory
./setup.sh                    # No prefix (tables: agent_conversations, etc.)
./setup.sh vikunja_           # With prefix (tables: vikunja_agent_conversations, etc.)

# Or using environment variable
TABLE_PREFIX=vikunja_ ./setup.sh
```

**Why use a prefix?**
- Avoids conflicts with existing n8n tables
- Better organization in shared databases
- Clear ownership of tables (e.g., `vikunja_agent_conversations`)
- Easier to identify related tables

### Alternative: Manual Setup

#### Option 1: All-in-One (deprecated, no prefix support)

```bash
# From this directory
psql -h 192.168.50.63 -U postgres -d n8n_memory -f setup_all.sql
```

#### Option 2: Individual Schemas (deprecated, no prefix support)

Run in order:

```bash
psql -h 192.168.50.63 -U postgres -d n8n_memory -f 001_agent_conversations.sql
psql -h 192.168.50.63 -U postgres -d n8n_memory -f 002_conversation_messages.sql
psql -h 192.168.50.63 -U postgres -d n8n_memory -f 003_tool_execution_logs.sql
psql -h 192.168.50.63 -U postgres -d n8n_memory -f 004_agent_configurations.sql
```

⚠️ **Note**: Manual setup methods do NOT support table prefixes. Use `./setup.sh` for prefix support.

## Customizing Database Connection

Set environment variables before running setup:

```bash
export PGHOST=192.168.50.63
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=n8n_memory
export PGPASSWORD=your_password  # Optional, will prompt if not set

./setup.sh vikunja_
```

## Schema Overview

| Table | Purpose | Task |
|-------|---------|------|
| `[prefix_]agent_conversations` | Conversation context tracking | T007 |
| `[prefix_]conversation_messages` | Individual message storage | T008 |
| `[prefix_]tool_execution_logs` | Audit trail for tool calls | T009 |
| `[prefix_]agent_configurations` | Agent settings and capabilities | T010 |
| `[prefix_]session_state` | Structured per-user workflow/session data | T021d |

**Note**: `[prefix_]` represents your optional table prefix (e.g., `vikunja_`)

## Verification

After setup, verify tables exist:

```sql
-- Without prefix
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%agent%' OR table_name LIKE '%conversation%' OR table_name LIKE '%tool%')
ORDER BY table_name;

-- With prefix (e.g., vikunja_)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'vikunja_%'
ORDER BY table_name;
```

Expected output (without prefix):
- `agent_configurations`
- `agent_conversations`
- `conversation_messages`
- `tool_execution_logs`
- `session_state`

Expected output (with `vikunja_` prefix):
- `vikunja_agent_configurations`
- `vikunja_agent_conversations`
- `vikunja_conversation_messages`
- `vikunja_tool_execution_logs`
- `vikunja_session_state`

View configurations:

```sql
-- Without prefix
SELECT * FROM agent_configurations;

-- With prefix
SELECT * FROM vikunja_agent_configurations;
```

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%agent%' OR table_name LIKE '%conversation%' OR table_name LIKE '%tool%'
ORDER BY table_name;
```

Expected output:
- `agent_configurations`
- `agent_conversations`
- `conversation_messages`
- `tool_execution_logs`

## Default Configurations

The setup automatically creates default configurations for:

- **Supervisor Agent**: 5-message context, basic routing
- **Vikunja Specialist**: 12-message context, 8 tools
- **Calendar Specialist**: 10-message context, 2 tools

View configurations:

```sql
SELECT * FROM agent_configurations;
```

## Cleanup (Development Only)

⚠️ **WARNING**: Deletes ALL agent data!

### Using the Cleanup Script (Recommended)

```bash
# From this directory
./cleanup.sh                    # Clean tables without prefix
./cleanup.sh vikunja_           # Clean tables with prefix

# Or using environment variable
TABLE_PREFIX=vikunja_ ./cleanup.sh
```

The script will:
1. Prompt for confirmation
2. Wait 3 seconds (allowing you to cancel)
3. Drop all tables and functions in the correct order
4. Show what was removed

### Manual Cleanup (deprecated)

```bash
psql -h 192.168.50.63 -U postgres -d n8n_memory -f cleanup.sql
```

⚠️ **Note**: Manual cleanup does NOT support table prefixes. Use `./cleanup.sh` for prefix support.

## Schema Maintenance

### Auto-Cleanup Expired Conversations

Add to your PostgreSQL cron job or run periodically:

```sql
-- Without prefix
DELETE FROM agent_conversations 
WHERE expires_at IS NOT NULL 
  AND expires_at < NOW();

-- With prefix (e.g., vikunja_)
DELETE FROM vikunja_agent_conversations 
WHERE expires_at IS NOT NULL 
  AND expires_at < NOW();
```

### Prune Old Tool Logs

Keep logs for 90 days:

```sql
-- Without prefix
DELETE FROM tool_execution_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- With prefix (e.g., vikunja_)
DELETE FROM vikunja_tool_execution_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

## Indexes

All tables include appropriate indexes for:
- Primary key lookups
- Foreign key joins
- Time-based queries
- JSON field searches (GIN indexes)
- Analytics queries (cost tracking)

## Triggers

Auto-update triggers maintain `updated_at` timestamps on:
- `[prefix_]agent_conversations`
- `[prefix_]agent_configurations`

## Using Table Prefix in Application

If you used a table prefix during setup, you'll need to configure it in:

### n8n Workflows
Update PostgreSQL node table names in your workflows:
- Change `agent_conversations` to `vikunja_agent_conversations`
- Change `conversation_messages` to `vikunja_conversation_messages`
- Etc.

### MCP Server (Future)
When implementing database queries in the MCP server, use the prefix:

```typescript
// Example configuration
const TABLE_PREFIX = process.env.TABLE_PREFIX || '';
const CONVERSATIONS_TABLE = `${TABLE_PREFIX}agent_conversations`;
```

### Best Practices
- Use `vikunja_` prefix to clearly identify Vikunja-related tables
- Document the prefix in your deployment configuration
- Keep the prefix consistent across all environments
- Use environment variables to make prefix configurable

## Next Steps

After database setup:
1. ✅ Schemas created (T007-T010)
2. ⏭️ Implement MCP server utilities (T011-T013)
3. ⏭️ Create n8n workflows (Phase 3+)
4. 📝 If using prefix: Update n8n workflow table names
5. 📝 If using prefix: Configure MCP server table prefix
