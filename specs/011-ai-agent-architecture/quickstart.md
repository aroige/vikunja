# Quickstart Guide: AI-Powered Personal Assistant System

**Last Updated**: 2025-10-28  
**Intended Audience**: Developers setting up the AI agent system for the first time

## Prerequisites

Before starting, ensure you have:

- ✅ **Vikunja Instance**: Running Vikunja installation (local or remote) with API access
- ✅ **n8n Instance**: Self-hosted or cloud n8n (version 1.0+)
- ✅ **Node.js**: Version 22+ installed
- ✅ **PostgreSQL**: Database for n8n conversation memory
- ✅ **LLM API Key**: Gemini 2.0 Flash Lite or GPT-4o Mini API key
- ✅ **Git**: For cloning repository and version control

---

## Setup Overview

The system has 3 main components:
1. **n8n Workflows** (agent orchestration)
2. **MCP Server** (Vikunja tool integration)
3. **PostgreSQL Memory** (conversation state)

Setup time: ~30-45 minutes

---

## Step 1: Clone Repository

```bash
cd /home/aron/projects/vikunja
git checkout 011-ai-agent-architecture
```

The feature branch contains:
- `n8n-workflows/` - Agent workflow templates
- `mcp-server/` - Enhanced with new tools
- `specs/011-ai-agent-architecture/` - Documentation

---

## Step 2: Setup MCP Server

### 2.1 Install Dependencies

```bash
cd mcp-server
pnpm install
```

### 2.2 Configure Environment

Create `.env` file in `mcp-server/`:

```bash
# Vikunja API Configuration
VIKUNJA_API_URL=http://localhost:3456/api/v1
VIKUNJA_API_TOKEN=your_vikunja_api_token_here

# MCP Server Configuration
MCP_PORT=3000
MCP_HOST=0.0.0.0

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/mcp-server.log

# Security
JWT_SECRET=generate_a_secure_random_string_here
CONFIRMATION_TOKEN_EXPIRY=300000  # 5 minutes in milliseconds

# Optional: Redis for caching (can use PostgreSQL instead)
# REDIS_URL=redis://localhost:6379
```

### 2.3 Build and Start

```bash
# Development mode (with hot reload)
pnpm dev

# Production mode
pnpm build
pnpm start
```

### 2.4 Verify MCP Server

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":1730000000000}

# List available tools
curl http://localhost:3000/mcp/tools | jq

# Should list: search_tasks, complete_task, confirm_complete_task, etc.
```

---

## Step 3: Setup PostgreSQL Memory

### 3.1 Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE n8n_memory;

# Create user (if needed)
CREATE USER n8n_agent WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE n8n_memory TO n8n_agent;
```

### 3.2 Create Tables

```sql
-- Switch to n8n_memory database
\c n8n_memory

-- Conversations table
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('supervisor', 'vikunja_specialist', 'calendar_specialist')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_user_agent ON agent_conversations(user_id, agent_type);
CREATE INDEX idx_expires ON agent_conversations(expires_at);

-- Messages table
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL CHECK (LENGTH(content) <= 10000),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_conversation ON conversation_messages(conversation_id, timestamp);

-- Session state table
CREATE TABLE session_state (
  user_id VARCHAR(255) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO n8n_agent;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO n8n_agent;
```

### 3.3 Setup Auto-Cleanup

```sql
-- Function to delete expired conversations
CREATE OR REPLACE FUNCTION cleanup_expired_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM agent_conversations WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule daily cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-conversations', '0 2 * * *', 'SELECT cleanup_expired_conversations()');
```

---

## Step 4: Setup n8n Workflows

### 4.1 Configure n8n PostgreSQL Connection

1. Open n8n UI (e.g., `http://localhost:5678`)
2. Go to **Credentials** → **New** → **PostgreSQL**
3. Fill in connection details:
   - **Host**: `localhost` (or your PostgreSQL host)
   - **Database**: `n8n_memory`
   - **User**: `n8n_agent`
   - **Password**: `secure_password_here`
   - **Port**: `5432`
4. Click **Save**

### 4.2 Add LLM Credentials

1. Go to **Credentials** → **New** → **Google Gemini** (or **OpenAI**)
2. Add your API key:
   - **API Key**: `your_gemini_api_key_here`
3. Click **Save**

### 4.3 Import Workflows

```bash
# From repository root
cd n8n-workflows

# Files to import:
# - supervisor-agent.json
# - vikunja-specialist.json
```

In n8n UI:
1. Click **Workflows** → **Import from File**
2. Select `supervisor-agent.json`
3. Click **Import**
4. Repeat for `vikunja-specialist.json`

### 4.4 Configure Workflow Settings

**Supervisor Agent Workflow**:
1. Open `Supervisor Agent` workflow
2. Find **LLM Agent** node → Configure:
   - **Model**: Gemini 2.0 Flash Lite
   - **System Prompt**: Load from `n8n-workflows/prompts/supervisor.md`
   - **Memory**: PostgreSQL Memory node (select credential from 4.1)
   - **Context Window**: `5` messages
3. Find **PostgreSQL Memory** node → Configure:
   - **Session Key**: `{{ $json.userId }}`
   - **Table Name**: `supervisor_memory`
4. Save workflow

**Vikunja Specialist Workflow**:
1. Open `Vikunja Specialist` workflow
2. Find **LLM Agent** node → Configure:
   - **Model**: Gemini 2.0 Flash Lite
   - **System Prompt**: Load from `n8n-workflows/prompts/vikunja-specialist.md`
   - **Memory**: PostgreSQL Memory node
   - **Context Window**: `15` messages
3. Find **PostgreSQL Memory** node → Configure:
   - **Session Key**: `{{ $json.userId }}`
   - **Table Name**: `vikunja_specialist_memory`
4. Find **HTTP Request** nodes (MCP tool calls) → Configure:
   - **URL**: `http://localhost:3000/mcp/call-tool`
   - **Method**: POST
   - **Authentication**: None (or add if using auth)
5. Save workflow

---

## Step 5: Create System Prompts

### 5.1 Supervisor Prompt

Create `n8n-workflows/prompts/supervisor.md`:

```markdown
# Supervisor Agent System Prompt

You are a helpful personal assistant that routes user requests to specialist agents.

## Your Role
- Analyze user requests and determine which specialist can help
- Route to appropriate specialist: Vikunja Specialist (task management), Calendar Specialist (scheduling), etc.
- Never answer from general knowledge for specialist domains
- Keep routing decisions simple and deterministic

## Available Specialists
1. **Vikunja Specialist**: Task management, project planning, reminders, daily recommendations
   - Trigger keywords: task, todo, complete, done, remind, focus, urgent, project
2. **Calendar Specialist** (future): Google Calendar, scheduling, availability
   - Trigger keywords: calendar, meeting, schedule, available, free time

## Routing Rules
- If keywords match Vikunja domain → delegate to Vikunja Specialist
- If ambiguous → ask user which area they mean
- If greeting/casual chat → respond directly with friendly message
- Always pass full user context (userId, conversation history) to specialist

## Response Style
- Natural, friendly tone
- Concise routing explanations
- Don't expose internal agent names to user
```

### 5.2 Vikunja Specialist Prompt

Create `n8n-workflows/prompts/vikunja-specialist.md`:

```markdown
# Vikunja Specialist System Prompt

You are an expert assistant for Vikunja task management. You help users manage tasks, projects, and reminders through natural conversation.

## Critical Rules (NEVER VIOLATE)
1. **Search Before Action**: ALWAYS call `search_tasks` before completing, updating, or deleting tasks
2. **Confirm Before Executing**: Present matches to user and wait for explicit confirmation
3. **Never Auto-Select**: Even with single match, ask user to confirm before executing
4. **Tool-Level Enforcement**: Tools enforce these rules; your job is to communicate results clearly

## Available Tools
- `search_tasks`: Find tasks by keywords, project, labels, status
- `complete_task`: Mark task complete (returns confirmation prompt)
- `confirm_complete_task`: Execute completion after user approves
- `update_task`: Modify task properties (search-first)
- `create_task`: Create new task (use parsed ISO dates from date parser tool)
- `get_daily_recommendations`: Get prioritized task list (overdue → today → this week)
- `filter_tasks_by_duration`: Find tasks for specific time window
- `create_project_plan`: Create project with tasks from planning conversation

## Workflow Patterns

### Task Completion
1. User: "I'm done watering plants"
2. Call `search_tasks(keywords="water plants", status="incomplete")`
3. If no matches → Tell user "I couldn't find a task matching 'water plants'..."
4. If multiple matches → Present all with context: "I found 2 tasks: 1) Water office plants (Work project), 2) Water home plants (Home project). Which one?"
5. If single match → Call `complete_task(taskQuery="water plants")`
6. Tool returns confirmation prompt → Present to user
7. User confirms → Call `confirm_complete_task(taskId=X, confirmationToken=Y)`
8. Confirm: "Marked 'Water plants' as complete ✓"

### Daily Recommendations
1. User: "What should I focus on today?"
2. Call `get_daily_recommendations(userId="X")`
3. Present grouped by urgency: "⚠️ You have 3 overdue tasks: [list]. 📅 2 tasks due today: [list]..."

### Natural Language Reminders
1. User: "Remind me to call Mom tomorrow at 3pm"
2. Extract: task="Call Mom", time="tomorrow at 3pm"
3. Call date parser tool (Chrono.js wrapper) to get ISO date
4. Call `create_task(title="Call Mom", dueDate="2025-10-29T15:00:00Z")`
5. Confirm: "I'll remind you to call Mom tomorrow at 3pm ✓"

## Response Style
- Natural, friendly language
- Use actual task titles from Vikunja (not user's paraphrased version)
- Clear confirmations with ✓ checkmark
- Actionable error messages with next steps
- Don't expose internal IDs or technical details

## Error Handling
- API timeout → "Vikunja took too long to respond. Please try again."
- No matches → "I couldn't find [task]. Could you tell me which project it's in?"
- Multiple matches → Present all options clearly
- Permission denied → "You don't have permission to modify this task."
```

---

## Step 6: Test the System

### 6.1 Create Test Data in Vikunja

1. Log into Vikunja UI
2. Create test project: "Test Project"
3. Add test tasks:
   - "Water plants" (due tomorrow, priority 2)
   - "Write report" (due today, priority 4)
   - "Buy groceries" (no due date, priority 1)

### 6.2 Test Supervisor Routing

In n8n, activate **Supervisor Agent** workflow with chat trigger.

Test conversation:
```
User: Hi!
Expected: Friendly greeting

User: What tasks should I focus on today?
Expected: Routes to Vikunja Specialist

User: Show me my tasks
Expected: Vikunja Specialist lists tasks with urgency grouping
```

### 6.3 Test Task Completion (Search-Before-Action)

```
User: I'm done with the report
Expected Flow:
1. Search for tasks matching "report"
2. Find "Write report"
3. Ask: "I found: 'Write report' (Test Project, due today). Mark this as complete?"
4. User: "Yes"
5. Execute completion
6. Confirm: "Marked 'Write report' as complete ✓"
```

### 6.4 Test Multiple Matches

Add second task: "Water office plants"

```
User: Done watering plants
Expected:
1. Search finds 2 matches
2. Present both: "I found 2 tasks: 1) Water plants (Test Project), 2) Water office plants (Work). Which one?"
3. User: "The first one"
4. Confirm and complete
```

### 6.5 Test Reminder Creation

```
User: Remind me to call Mom tomorrow at 3pm
Expected:
1. Extract task and time
2. Parse "tomorrow at 3pm" → ISO date
3. Create task with due date
4. Confirm: "I'll remind you to call Mom tomorrow at 3pm ✓"

Check Vikunja: Task "Call Mom" should exist with correct due date
```

### 6.6 Test Error Handling

```
User: Done with organizing garage
Expected (no match):
"I couldn't find an active task matching 'organizing garage'. Could you tell me which project it's in, or check if it's already completed?"
```

---

## Step 7: Monitoring & Debugging

### 7.1 View MCP Server Logs

```bash
cd mcp-server
tail -f logs/mcp-server.log | jq
```

Look for:
- `tool_call_received` events
- `tool_execution_complete` events
- `latencyMs` values (should be < 3000ms)
- Any `error` level logs

### 7.2 Query Conversation History

```sql
-- View recent conversations
SELECT 
  ac.id,
  ac.user_id,
  ac.agent_type,
  COUNT(cm.id) as message_count,
  MAX(cm.timestamp) as last_activity
FROM agent_conversations ac
LEFT JOIN conversation_messages cm ON ac.id = cm.conversation_id
GROUP BY ac.id
ORDER BY last_activity DESC
LIMIT 10;

-- View conversation details
SELECT 
  role,
  content,
  timestamp,
  metadata->>'toolName' as tool_called
FROM conversation_messages
WHERE conversation_id = '<conversation_id_here>'
ORDER BY timestamp ASC;
```

### 7.3 Monitor Token Usage

```bash
# Grep logs for token usage
grep "token_usage" mcp-server/logs/mcp-server.log | jq '.data.totalTokens' | awk '{sum+=$1} END {print "Total tokens:", sum}'
```

### 7.4 n8n Execution Log

In n8n UI:
1. Click **Executions** tab
2. View workflow execution history
3. Click on execution to see:
   - Input data
   - Each node's output
   - LLM responses
   - Tool call results

---

## Step 8: Deploy to Production (Optional)

### 8.1 Environment Configuration

Create `mcp-server/.env.production`:

```bash
NODE_ENV=production
VIKUNJA_API_URL=https://vikunja.your domain.com/api/v1
VIKUNJA_API_TOKEN=production_token_here
MCP_PORT=3000
LOG_LEVEL=warn  # Less verbose in production
```

### 8.2 Run with Process Manager

```bash
# Install PM2
npm install -g pm2

# Start MCP server
cd mcp-server
pm2 start npm --name "mcp-server" -- start

# Save PM2 config
pm2 save

# Setup auto-start on boot
pm2 startup
```

### 8.3 Setup Nginx Reverse Proxy (if needed)

```nginx
# /etc/nginx/sites-available/mcp-server
server {
    listen 443 ssl;
    server_name mcp.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Troubleshooting

### Issue: n8n can't connect to MCP server

**Solution**:
1. Verify MCP server is running: `curl http://localhost:3000/health`
2. Check firewall rules
3. Verify URL in n8n HTTP Request nodes

### Issue: Tasks not being found

**Solution**:
1. Check Vikunja API token has correct permissions
2. Verify userId in requests matches Vikunja user
3. Check task status filter (incomplete vs. done)
4. View MCP server logs for search query details

### Issue: Conversation memory not persisting

**Solution**:
1. Check PostgreSQL connection in n8n
2. Verify tables exist: `\dt` in psql
3. Check n8n memory node configuration (session key, table name)
4. View PostgreSQL logs for errors

### Issue: High token costs

**Solution**:
1. Reduce context window sizes (supervisor: 3, specialist: 10)
2. Verify using Gemini 2.0 Flash Lite (not Pro)
3. Check for runaway conversations (implement conversation turn limits)
4. Monitor token usage logs and identify expensive operations

### Issue: Wrong task completed

**Solution**:
1. **This should be impossible** with proper tool implementation
2. Verify `complete_task` tool calls `search_tasks` first
3. Check confirmation token validation in `confirm_complete_task`
4. Review conversation logs to see what user confirmed

---

## Next Steps

- ✅ Read `specs/011-ai-agent-architecture/spec.md` for full requirements
- ✅ Review `specs/011-ai-agent-architecture/data-model.md` for entity details
- ✅ Check `specs/011-ai-agent-architecture/contracts/mcp-tools.md` for tool specifications
- ✅ Explore prompt engineering in `n8n-workflows/prompts/`
- ✅ Add more test scenarios covering edge cases
- ✅ Implement calendar specialist (future iteration)

---

## Support & Resources

- **Vikunja Docs**: https://vikunja.io/docs/
- **n8n Docs**: https://docs.n8n.io/
- **MCP Specification**: https://modelcontextprotocol.io/
- **Chrono.js (date parsing)**: https://github.com/wanasit/chrono

---

**Quickstart Version**: 1.0.0  
**Last Updated**: 2025-10-28
