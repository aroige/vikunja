# Table Prefix Examples

This document shows examples of using the setup scripts with and without table prefixes.

## Example 1: No Prefix (Default)

```bash
./setup.sh
```

**Created tables:**
- `agent_conversations`
- `conversation_messages`
- `tool_execution_logs`
- `agent_configurations`

**SQL queries:**
```sql
SELECT * FROM agent_conversations;
INSERT INTO conversation_messages (conversation_id, role, content) VALUES (...);
```

**Use case:** Single application database or n8n dedicated instance.

---

## Example 2: With Prefix `vikunja_`

```bash
./setup.sh vikunja_
```

**Created tables:**
- `vikunja_agent_conversations`
- `vikunja_conversation_messages`
- `vikunja_tool_execution_logs`
- `vikunja_agent_configurations`

**SQL queries:**
```sql
SELECT * FROM vikunja_agent_conversations;
INSERT INTO vikunja_conversation_messages (conversation_id, role, content) VALUES (...);
```

**Use case:** Shared n8n database with multiple applications or clear ownership identification.

---

## Example 3: Environment Variable

```bash
export TABLE_PREFIX=vikunja_
./setup.sh
```

Same result as Example 2.

**Use case:** Automated deployment scripts or consistent configuration across environments.

---

## Example 4: Custom Prefix

```bash
./setup.sh myapp_
```

**Created tables:**
- `myapp_agent_conversations`
- `myapp_conversation_messages`
- `myapp_tool_execution_logs`
- `myapp_agent_configurations`

**Use case:** Multiple agent systems in the same database (e.g., `vikunja_`, `calendar_`, `docs_`).

---

## Cleanup Examples

### Cleanup tables without prefix:
```bash
./cleanup.sh
```

### Cleanup tables with `vikunja_` prefix:
```bash
./cleanup.sh vikunja_
```

### Using environment variable:
```bash
TABLE_PREFIX=vikunja_ ./cleanup.sh
```

---

## Connection Examples

### Using default connection (localhost):
```bash
./setup.sh vikunja_
```

### Custom database server:
```bash
PGHOST=192.168.50.63 PGDATABASE=n8n_memory ./setup.sh vikunja_
```

### Full custom connection:
```bash
export PGHOST=192.168.50.63
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=n8n_memory
export PGPASSWORD=mypassword
export TABLE_PREFIX=vikunja_

./setup.sh
```

---

## Verification After Setup

### List all tables with prefix:
```bash
psql -h 192.168.50.63 -U postgres -d n8n_memory \
  -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'vikunja_%' ORDER BY table_name;"
```

### Check agent configurations:
```bash
psql -h 192.168.50.63 -U postgres -d n8n_memory \
  -c "SELECT agent_type, model, max_tools FROM vikunja_agent_configurations;"
```

### Count conversations:
```bash
psql -h 192.168.50.63 -U postgres -d n8n_memory \
  -c "SELECT COUNT(*) FROM vikunja_agent_conversations;"
```

---

## Recommended Prefix Strategy

| Scenario | Recommended Prefix | Rationale |
|----------|-------------------|-----------|
| Dedicated n8n for Vikunja | No prefix | Simplicity, no conflicts |
| Shared n8n instance | `vikunja_` | Clear ownership, avoid conflicts |
| Multiple agent systems | `vikunja_`, `app2_`, etc. | Separate namespaces per app |
| Development vs Production | No prefix needed | Use separate databases instead |
| Multi-tenant setup | `tenant1_vikunja_`, etc. | Tenant isolation |

---

## Troubleshooting

### Error: "relation already exists"
You're trying to create tables that already exist. Options:
1. Use a different prefix: `./setup.sh vikunja_v2_`
2. Clean up existing tables: `./cleanup.sh vikunja_`
3. Use a different database

### Error: "permission denied"
Check PostgreSQL user permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE n8n_memory TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
```

### Wrong prefix used
If you set up with the wrong prefix, clean up and re-run:
```bash
./cleanup.sh wrong_prefix_
./setup.sh correct_prefix_
```
