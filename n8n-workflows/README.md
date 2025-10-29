# n8n Workflows

**Feature**: 011-ai-agent-architecture  
**Purpose**: AI agent orchestration for Vikunja task management

## Overview

This directory contains n8n workflow configurations for the AI-powered personal assistant system. The workflows implement a supervisor agent pattern with specialist agents for different domains (Vikunja, Calendar, Documents).

## Files

### Workflows (Created in n8n UI)

- **`supervisor-agent.json`** - Main routing agent (T022) ⚠️ *Pending creation*
- **`vikunja-specialist.json`** - Vikunja task management agent (T023) ⚠️ *Pending creation*
- **`session-state-helpers.json`** - Session state load/save helpers (T021e) ✅
- **`calendar-specialist.json`** - Calendar integration agent (Future: Phase 7)

### Templates

- **`supervisor-agent-template.json`** - Reference structure for supervisor workflow
- **`SETUP_GUIDE.md`** - Step-by-step instructions for creating workflows in n8n UI

### Prompts (Version Controlled)

- **`prompts/supervisor.md`** - Supervisor agent prompt (v1.1.0) ✅ JSON contract added (T021a)
- **`prompts/vikunja-specialist.md`** - Vikunja specialist prompt (v1.1.0) ✅ Response contract added (T021b)
- **`prompts/calendar-specialist.md`** - Calendar specialist prompt (Future)

### Tools (Custom Implementations)

- **`tools/date-parser.js`** - Chrono.js wrapper for natural language date parsing (Future: T039)

## Architecture

```
┌──────────────────┐
│   Chat Input     │
│  (User Message)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│    Supervisor Agent          │
│  - Routes to specialists     │
│  - Maintains 3-5 msg context │
│  - PostgreSQL memory         │
└────────┬─────────────────────┘
         │
         ├─── Vikunja? ─────────────────┐
         │                               │
         └─── Calendar? (Future)         │
                                         ▼
                          ┌────────────────────────────────┐
                          │    Vikunja Specialist          │
                          │  - Task CRUD operations        │
                          │  - Search-before-action        │
                          │  - 10-15 msg context           │
                          │  - MCP tool integration        │
                          │  - Error handling              │
                          │  - Confirmation workflow       │
                          └────────────────────────────────┘
```

## Workflow Creation Status (Post Phase 2.5 Alignment)

| Task | Scope | Status | Updated Approach |
|------|-------|--------|------------------|
| T022 | Supervisor Agent | Pending | JSON routing contract; traceId generation |
| T023 | Vikunja Specialist | Pending | Structured status JSON response |
| T024 | Supervisor Memory | Pending | Agent window + session_state helpers |
| T025 | Specialist Memory | Pending | Agent window + session_state helpers |
| T027 | No-match handling | Pending | Branch on status=no_match |
| T028 | Multiple-match handling | Pending | status=multiple_options + options persisted |
| T029 | Confirmation flow | Pending | Supervisor handles final yes (T021h) |
| T021e | Session helpers | DONE | `session-state-helpers.json` |
| T021j | Status flow contract | DONE | `contracts/tool-status-flow.md` |
| `[prefix_]session_state` | Structured workflow state (pendingConfirmation, lastTaskOptions, planning) | T021d |

## Prerequisites

### 1. n8n Instance
- Version: 1.0.0+ (with AI Agent nodes)
- Access: http://localhost:5678 (or your n8n URL)
- Credentials configured:
  - Google Gemini API key
  - PostgreSQL connection

### 2. PostgreSQL Database
- Database: `n8n_memory`
- Host: 192.168.50.63 (or your PostgreSQL server)
- Tables: Created from `specs/011-ai-agent-architecture/sql/`
  - `agent_conversations`
  - `conversation_messages`
  - `tool_execution_logs`
  - `agent_configurations`
   - `session_state` (structured per-user workflow state)

### 3. MCP Server
- Running at: http://localhost:3458
- HTTP transport enabled
- Tools registered:
  - `search_tasks`
  - `complete_task`
  - `confirm_complete_task`

### 4. Vikunja Backend
- API: http://localhost:3456
- Test tasks created

## Getting Started

### Option 1: Manual Setup (Recommended for Learning)

Follow the comprehensive guide:

```bash
cat SETUP_GUIDE.md
```

The guide walks through:
1. Creating each workflow in n8n UI
2. Configuring nodes and credentials
3. Setting up PostgreSQL memory
4. Implementing error handling
5. Testing with scenarios
6. Exporting workflows

### Option 2: Import Templates (Faster)

1. **Import supervisor template**:
   - Open n8n UI → Workflows → Import
   - Select `supervisor-agent-template.json`
   - Configure credentials (PostgreSQL, Gemini API)
   - Update system prompt parameter with content from `prompts/supervisor.md`

2. **Create Vikunja specialist** (no template yet):
   - Follow SETUP_GUIDE.md section "Workflow 2"
   - Manual creation required for MCP tool integration

3. **Test workflows**:
   - Use Test Cases from SETUP_GUIDE.md
   - Verify PostgreSQL logs
   - Check MCP server tool execution logs

   ### Session State vs Conversation Tables

   | Aspect | `agent_conversations` / `conversation_messages` | `session_state` |
   |--------|-----------------------------------------------|-----------------|
   | Purpose | Persist (optional) full message history & metadata | Store compact structured workflow state (confirmation tokens, multi-match options, planning phases) |
   | Size | Potentially large (messages accumulate) | Small JSON blob keyed by user |
   | Access Pattern | May be read for analytics or long-term context (future stories) | Loaded once per user turn, patched when state changes |
   | MVP Necessity | Optional (can skip initial inserts) | Recommended for multi-match + confirmation reliability |
   | Expiry | Rows pruned via `expires_at` + cleanup job | Overwritten; implicit TTL logic in app (clear old fields) |
   | Mutation Granularity | Append-only writes per message | Merge patch of JSON (shallow key updates) |

   For US1 (task completion) you can achieve a working prototype without storing conversation messages. Session state enables precise multi-turn flows (confirmations, selections) without increasing token usage or DB writes excessively.

## Configuration

### Environment Variables

Required for MCP server integration:

```bash
# .env in mcp-server/
MCP_HTTP_ENABLED=true
MCP_HTTP_PORT=3458
VIKUNJA_API_URL=http://localhost:3456

DB_ENABLED=true
DB_HOST=192.168.50.63
DB_PORT=5432
DB_NAME=n8n_memory
DB_USER=postgres
DB_PASSWORD=[your password]
```

### n8n Credentials

Create these credentials in n8n:

1. **Google Gemini**
   - Name: `gemini_api`
   - API Key: From https://aistudio.google.com/

2. **PostgreSQL**
   - Name: `n8n_memory_db`
   - Host: 192.168.50.63
   - Database: `n8n_memory`
   - User: `postgres`
   - Password: [your password]

## Trace ID Propagation (T021c)
Generate once per user turn in Supervisor:
```
traceId = `${userId}-${Date.now()}-${uuid}`
```
Propagate unchanged to: Specialist call → MCP tool body → tool logs → final response. Never regenerate mid-flow.

## Selection Index Parsing (T021g)
Map natural language selections to indices:
| Input | Index |
|-------|-------|
| `1` | 1 |
| `first one` | 1 |
| `number two` | 2 |
| `the 3rd` | 3 |

Pseudocode:
```javascript
const txt = ($json.rawUserMessage||'').toLowerCase();
const ord = { first:1, second:2, third:3, fourth:4, fifth:5 };
let idx = null;
const m = txt.match(/\b(\d+)\b/);
if (m) idx = +m[1];
else for (const [k,v] of Object.entries(ord)) if (txt.includes(k)) { idx = v; break; }
return [{ json: { selectionIndex: idx } }];
```
If `idx` is out of range for `lastTaskOptions`, ask user to pick again.

## Testing

### Manual Testing

Use the chat interface to test scenarios:

```
# Test Case 1: Single match
"I'm done watering plants"
→ Confirmation request
"yes"
→ Task completed

# Test Case 2: Multiple matches
"Done with report"
→ Specialist returns status=multiple_options with options stored in session_state
"1" / "first" → Supervisor resolves selectionIndex, re-initiates completion → confirm_required

# Test Case 3: No match
"Finished organizing garage"
→ Suggestions for next steps

# Test Case 4: Context
"What should I focus on?"
→ Task list
"Mark the first one complete"
→ Uses context to identify task
```

### Database Verification

```sql
-- Check conversation flow
SELECT ac.agent_type, cm.role, cm.content, cm.timestamp
FROM conversation_messages cm
JOIN agent_conversations ac ON cm.conversation_id = ac.id
WHERE ac.user_id = 'test-user'
ORDER BY cm.timestamp DESC
LIMIT 20;

-- Check tool executions
SELECT tool_name, status, latency_ms, timestamp
FROM tool_execution_logs
WHERE user_id = 'test-user'
ORDER BY timestamp DESC;
```

## Exporting Workflows

After creating/modifying workflows in n8n UI:

1. Click **"..."** menu (top right)
2. Select **"Download"**
3. Save to this directory:
   - `supervisor-agent.json`
   - `vikunja-specialist.json`
4. Commit to version control:
   ```bash
   git add n8n-workflows/*.json
   git commit -m "feat: Update n8n workflows"
   ```

## Workflow Updates

When updating prompts or workflow logic:

1. **Update prompt files**: `prompts/*.md`
2. **Reload in n8n**: Copy new prompt to workflow's System Message parameter
3. **Test changes**: Run through all test cases
4. **Export updated workflow**: Download → commit to version control
5. **Document changes**: Update this README and SETUP_GUIDE.md

## Key Design Decisions

### Memory Strategy
- **LLM Window Memory**: Agent node internal windows (Supervisor 5; Specialist 12–15)
- **Structured Session State**: Persisted via `session-state-helpers.json` into `session_state` (pendingConfirmation, lastTaskOptions, planning)
- **Why**: Separation of reasoning context vs deterministic workflow data (FR-029, FR-032)

### Search-Before-Action Pattern
- **Why**: 99%+ accuracy requirement (SC-001)
- **Implementation**: Tool-level enforcement (not prompt-based)
- **Flow**: Search → Confirm → Execute

### Gemini 2.0 Flash Lite
- **Why**: Cost optimization (<$0.10 per 1000 interactions)
- **Model**: `gemini-2.0-flash-thinking-exp-1219` or `gemini-2.0-flash-exp`
- **Trade-off**: Slightly lower accuracy than premium models, but sufficient for task management

### MCP Tool Integration
- **Why**: Standardized protocol for AI-tool communication
- **Transport**: HTTP (easier than stdio for n8n)
- **Benefits**: Type-safe contracts, versioning, tool discovery

## Troubleshooting

### Common Issues

1. **"Cannot connect to MCP server"**
   - Check MCP server is running: `cd mcp-server && pnpm dev`
   - Verify HTTP transport enabled in `.env`
   - Test endpoint: `curl http://localhost:3458/health`

2. **"PostgreSQL connection failed"**
   - Verify database exists: `psql -h 192.168.50.63 -U postgres -d n8n_memory -c "\dt"`
   - Check network access from n8n to PostgreSQL
   - Confirm credentials in n8n UI

3. **"Gemini API error"**
   - Verify API key: https://aistudio.google.com/
   - Check quota not exceeded
   - Try different model if experimental version unavailable

4. **"Workflow not routing"**
   - Check IF node conditions match JSON structure
   - Verify supervisor prompt includes routing logic
   - Review execution logs in n8n UI

### Debug Mode

Enable detailed logging in MCP server:

```bash
# .env
LOG_LEVEL=debug
LOG_FORMAT=json
```

Check logs:
```bash
cd mcp-server
pnpm dev
# Watch for tool execution logs
```

## Performance Targets

- **Response time**: <3 seconds for daily recommendations (SC-003)
- **Conversational turns**: 2-4 for simple operations (SC-008)
- **Accuracy**: 99%+ for task completion (SC-001)
- **Cost**: <$0.10 per 1000 interactions (SC-011)

## Future Enhancements

- [ ] **Calendar Specialist** (Phase 7 - User Story 5)
- [ ] **Documents Specialist** (Future feature)
- [ ] **Multi-language support** (Enhanced prompts)
- [ ] **Voice input** (n8n audio nodes)
- [ ] **Workflow analytics** (Custom dashboard)

## References

- **Specification**: `specs/011-ai-agent-architecture/spec.md`
- **Implementation Plan**: `specs/011-ai-agent-architecture/plan.md`
- **MCP Tools Contract**: `specs/011-ai-agent-architecture/contracts/mcp-tools.md`
- **Database Schema**: `specs/011-ai-agent-architecture/sql/`
- **Test Scenarios**: `specs/011-ai-agent-architecture/quickstart.md`

## Contributing

When modifying workflows:

1. Document changes in SETUP_GUIDE.md
2. Update version numbers in prompts (semantic versioning)
3. Test all scenarios before committing
4. Export JSON and commit to version control
5. Update this README with any new requirements

## License

Part of Vikunja project - see main LICENSE file.
