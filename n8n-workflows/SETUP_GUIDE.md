# n8n Workflows Setup Guide

**Feature**: 011-ai-agent-architecture  
**Phase**: 3 - User Story 1 (Task Completion MVP)  
**Tasks**: T022-T029  
**Created**: 2025-10-28

## Overview

This guide provides step-by-step instructions for creating n8n workflows for the AI agent system. The workflows implement a supervisor agent that routes requests to specialist agents (starting with Vikunja specialist).

**IMPORTANT**: n8n workflows are created through the n8n UI, not as code files. This guide walks you through the manual setup process. Once created, workflows should be exported as JSON to `n8n-workflows/` for version control.

## Prerequisites

1. **n8n Instance Running**
   - Self-hosted or cloud n8n instance
   - Access to n8n UI at http://localhost:5678 (or your n8n URL)

2. **PostgreSQL Database** (for conversation memory)
   - Database: `n8n_memory`
   - Host: 192.168.50.63 (or your PostgreSQL server)
   - User: postgres
   - Tables created from `specs/011-ai-agent-architecture/sql/`

3. **MCP Server Running**
   - HTTP transport enabled
   - Accessible at http://localhost:3458 (or your MCP server URL)
   - Tools registered: `search_tasks`, `complete_task`, `confirm_complete_task`

4. **Vikunja Backend**
   - API accessible at http://localhost:3456 (or your Vikunja URL)
   - Test tasks created for validation

## Workflow 1: Supervisor Agent (T022-T024)

### Step 1: Create New Workflow

1. Open n8n UI
2. Click **"New Workflow"** button (top right)
3. Name the workflow: **"Supervisor Agent"**
4. Click **"Save"** (top right)

### Step 2: Add Chat Trigger Node

1. Click **"+"** button in the canvas
2. Search for **"Chat Trigger"**
3. Select **"Chat Trigger"** node
4. Configure:
   - **Chat Type**: "Web Chat" (for testing) or "API" (for production)
   - **Public URL**: Enable if using web chat
   - **Chat ID**: `vikunja-supervisor` (for identification)
5. Click **"Execute Node"** to test
6. You should see a chat URL appear - copy this for testing

### Step 3: Add PostgreSQL Memory Node (T024)

1. Click **"+"** after Chat Trigger
2. Search for **"PostgreSQL"**
3. Select **"Postgres"** node
4. Click **"Create New Credential"**
5. Configure PostgreSQL credentials:
   - **Name**: `n8n_memory_db`
   - **Host**: `192.168.50.63` (or your PostgreSQL host)
   - **Database**: `n8n_memory`
   - **User**: `postgres`
   - **Password**: [your PostgreSQL password]
   - **Port**: `5432`
   - **SSL**: Disabled (or configured per your setup)
6. Click **"Save"**
7. Configure memory query:
   - **Operation**: "Execute Query"
   - **Query**: 
     ```sql
     SELECT cm.content, cm.role, cm.timestamp
     FROM conversation_messages cm
     JOIN agent_conversations ac ON cm.conversation_id = ac.id
     WHERE ac.user_id = $1 AND ac.agent_type = 'supervisor'
     ORDER BY cm.timestamp DESC
     LIMIT 5
     ```
   - **Parameters**: `{{ $json.userId }}`
   - **Return Type**: "JSON"

8. Rename node to **"Load Conversation History"**

### Step 4: Add LLM Agent Node (Gemini)

1. Click **"+"** after PostgreSQL node
2. Search for **"Agent"**
3. Select **"AI Agent"** node
4. Configure:
   - **Chat Model**: Click to configure
   - Select **"Google Gemini Chat Model"**
   - **Model**: `gemini-2.0-flash-thinking-exp-1219` or `gemini-2.0-flash-exp`
   - **API Key**: [your Google AI Studio API key]
   - Click **"Back to Agent"**

5. Configure System Prompt:
   - **System Message**: Copy content from `n8n-workflows/prompts/supervisor.md`
   - Paste the entire markdown content (version v1.0.0)

6. Configure Memory:
   - **Memory Type**: "Window Buffer Memory"
   - **Context Window Size**: `5` (last 5 messages)
   - **Session Key**: `{{ $json.userId }}`

7. Rename node to **"Supervisor Agent"**

### Step 5: Add Response Routing Logic

1. Click **"+"** after Supervisor Agent
2. Search for **"IF"**
3. Select **"IF"** node (conditional routing)
4. Configure conditions:
   - **Condition 1**: `{{ $json.routeTo }} === 'vikunja_specialist'`
   - **Label**: "Route to Vikunja"

### Step 6: Save Conversation to Database

1. Click **"+"** on the TRUE branch of IF node
2. Search for **"PostgreSQL"**
3. Select **"Postgres"** node
4. Use existing credential: `n8n_memory_db`
5. Configure:
   - **Operation**: "Insert"
   - **Table**: `conversation_messages`
   - **Columns**:
     ```json
     {
       "conversation_id": "{{ $json.conversationId }}",
       "role": "assistant",
       "content": "{{ $json.response }}",
       "timestamp": "{{ $now }}",
       "metadata": "{}"
     }
     ```
6. Rename to **"Save Response"**

### Step 7: Connect to Vikunja Specialist

1. Click **"+"** after "Save Response"
2. Search for **"Execute Workflow"**
3. Select **"Execute Workflow"** node
4. Configure:
   - **Source**: "Database"
   - **Workflow**: "Vikunja Specialist" (will create in next section)
   - **Pass Data**: `{{ $json }}`

### Step 8: Export Workflow

1. Click **"..."** menu (top right)
2. Select **"Download"**
3. Save as: `n8n-workflows/supervisor-agent.json`
4. Commit to version control

## Workflow 2: Vikunja Specialist Agent (T023, T025, T027-T029)

### Step 1: Create New Workflow

1. Open n8n UI
2. Click **"New Workflow"**
3. Name: **"Vikunja Specialist"**
4. Click **"Save"**

### Step 2: Add Webhook Trigger

1. Click **"+"** in canvas
2. Search for **"Webhook"**
3. Select **"Webhook"** node
4. Configure:
   - **HTTP Method**: POST
   - **Path**: `vikunja-specialist`
   - **Response Mode**: "Last Node"
   - **Response Data**: "All Entries"
5. Rename to **"Receive from Supervisor"**

### Step 3: Add PostgreSQL Memory (T025)

1. Click **"+"** after Webhook
2. Add **"PostgreSQL"** node
3. Use credential: `n8n_memory_db`
4. Configure memory query:
   - **Operation**: "Execute Query"
   - **Query**:
     ```sql
     SELECT cm.content, cm.role, cm.timestamp
     FROM conversation_messages cm
     JOIN agent_conversations ac ON cm.conversation_id = ac.id
     WHERE ac.user_id = $1 AND ac.agent_type = 'vikunja_specialist'
     ORDER BY cm.timestamp DESC
     LIMIT 15
     ```
   - **Parameters**: `{{ $json.userId }}`
   - **Return Type**: "JSON"
6. Rename to **"Load Specialist Context"**

### Step 4: Add LLM Agent with MCP Tools

1. Click **"+"** after PostgreSQL
2. Add **"AI Agent"** node
3. Configure Chat Model:
   - **Model**: Google Gemini Chat Model
   - **Model Name**: `gemini-2.0-flash-thinking-exp-1219`
   - **API Key**: [your key]

4. Configure System Prompt:
   - Copy from `n8n-workflows/prompts/vikunja-specialist.md`
   - Paste entire content (v1.0.0)

5. **Configure Tools** (MCP integration):
   - Click **"+ Add Tool"**
   - Select **"HTTP Request Tool"**
   - **Tool Name**: `search_tasks`
   - **URL**: `http://localhost:3458/tools/search_tasks`
   - **Method**: POST
   - **Headers**: 
     ```json
     {
       "Authorization": "Bearer {{ $json.vikunjaToken }}",
       "Content-Type": "application/json"
     }
     ```
   - **Body**: `{{ $json }}`

6. Repeat for `complete_task` and `confirm_complete_task` tools

7. Configure Memory:
   - **Memory Type**: "Window Buffer Memory"
   - **Context Window Size**: `15`
   - **Session Key**: `{{ $json.userId }}`

8. Rename to **"Vikunja Specialist"**

### Step 5: Add Error Handling - No Match (T027)

1. Click **"+"** after Vikunja Specialist
2. Add **"IF"** node
3. Configure:
   - **Condition**: `{{ $json.toolResult.type }} === 'needs_clarification' && {{ $json.toolResult.reason }} === 'NO_MATCH'`

4. On TRUE branch:
   - Add **"Set"** node
   - Configure response:
     ```json
     {
       "message": "I couldn't find an active task matching '{{ $json.query }}'. \n\nWhat would you like to do?\n- Check completed tasks: 'show completed {{ $json.query }} tasks'\n- Create a new task: 'create a {{ $json.query }} task'\n- Try a different search: 'search for [keywords]'",
       "type": "clarification",
       "suggestions": [
         "show completed tasks",
         "create new task",
         "search again"
       ]
     }
     ```
   - Rename to **"No Match Response"**

### Step 6: Add Error Handling - Multiple Matches (T028)

1. On FALSE branch of previous IF
2. Add another **"IF"** node
3. Configure:
   - **Condition**: `{{ $json.toolResult.type }} === 'needs_clarification' && {{ $json.toolResult.reason }} === 'MULTIPLE_MATCHES'`

4. On TRUE branch:
   - Add **"Function"** node
   - Add code:
     ```javascript
     const tasks = $input.item.json.toolResult.tasks;
     const formatted = tasks.map((task, i) => 
       `${i+1}. ${task.title} (due ${task.dueDate || 'no date'})`
     ).join('\n');
     
     return {
       message: `I found ${tasks.length} tasks:\n\n${formatted}\n\nWhich one did you mean? (say 1, 2, etc.)`,
       type: 'clarification',
       tasks: tasks
     };
     ```
   - Rename to **"Format Multiple Matches"**

### Step 7: Add Confirmation Workflow (T029)

1. On FALSE branch of multiple matches IF
2. Add **"IF"** node for confirmation check
3. Configure:
   - **Condition**: `{{ $json.toolResult.type }} === 'confirm_required'`

4. On TRUE branch:
   - Add **"Set"** node
   - Configure:
     ```json
     {
       "message": "{{ $json.toolResult.message }}\n\nShould I mark it complete? (yes/no)",
       "type": "confirmation",
       "confirmationToken": "{{ $json.toolResult.confirmationToken }}",
       "taskId": "{{ $json.toolResult.task.id }}"
     }
     ```
   - Rename to **"Request Confirmation"**

5. Add **"Wait for Webhook"** node (waits for user's "yes")
   - **Resume Webhook URL**: Auto-generated
   - **Timeout**: 300 seconds (5 minutes)

6. After wait, add **"IF"** to check user response:
   - **Condition**: `{{ $json.userResponse.toLowerCase().includes('yes') }}`

7. On TRUE branch:
   - Add **"HTTP Request"** node
   - **URL**: `http://localhost:3458/tools/confirm_complete_task`
   - **Method**: POST
   - **Headers**: 
     ```json
     {
       "Authorization": "Bearer {{ $json.vikunjaToken }}",
       "Content-Type": "application/json"
     }
     ```
   - **Body**:
     ```json
     {
       "taskId": {{ $json.taskId }},
       "confirmationToken": "{{ $json.confirmationToken }}",
       "userId": "{{ $json.userId }}"
     }
     ```
   - Rename to **"Execute Completion"**

8. On FALSE branch (user said "no"):
   - Add **"Set"** node
   - Configure: `{ "message": "Okay, I won't mark it complete. Let me know if you need anything else!" }`
   - Rename to **"Cancel Confirmation"**

### Step 8: Save All Responses to Database

1. Merge all branches with **"Merge"** node
2. Add final **"PostgreSQL"** node
3. Configure insert to `conversation_messages` table
4. Rename to **"Save Specialist Response"**

### Step 9: Export Workflow

1. Click **"..."** menu → **"Download"**
2. Save as: `n8n-workflows/vikunja-specialist.json`
3. Commit to version control

## Testing the Workflows

### Test Case 1: Single Match Completion

1. Open supervisor chat interface
2. Input: **"I'm done watering plants"**
3. Expected flow:
   - Supervisor routes to Vikunja Specialist
   - Specialist calls `search_tasks` with query "watering plants"
   - Specialist calls `complete_task` → returns confirmation request
   - User sees: "Found task 'Water plants' (due today). Mark complete? (yes/no)"
   - User: **"yes"**
   - Specialist calls `confirm_complete_task`
   - User sees: "✓ Task marked complete!"

### Test Case 2: Multiple Matches

1. Input: **"Done with report"**
2. Expected:
   - Search finds 2+ tasks
   - User sees:
     ```
     I found 2 tasks:
     1. Write Q4 report (due today)
     2. Review budget report (due tomorrow)
     Which one did you finish? (say 1 or 2)
     ```
   - User: **"1"**
   - Confirmation flow continues

### Test Case 3: No Match

1. Input: **"Finished organizing garage"**
2. Expected:
   - Search returns no matches
   - User sees suggestions:
     ```
     I couldn't find an active task matching 'organizing garage'.
     
     What would you like to do?
     - Check completed tasks: 'show completed garage tasks'
     - Create a new task: 'create a garage task'
     - Try a different search: 'search for [keywords]'
     ```

### Test Case 4: Context Preservation

1. Input: **"What should I focus on today?"**
2. Specialist returns task list
3. Input: **"Mark the first one complete"**
4. Expected: Uses context to identify task from previous message

## Database Verification

After testing, verify logs in PostgreSQL:

```sql
-- Check conversation history
SELECT * FROM agent_conversations WHERE user_id = 'test-user';

-- Check messages
SELECT * FROM conversation_messages 
WHERE conversation_id = [id from above]
ORDER BY timestamp DESC;

-- Check tool execution logs
SELECT * FROM tool_execution_logs 
WHERE user_id = 'test-user'
ORDER BY timestamp DESC;
```

## Troubleshooting

### Issue: MCP tools not connecting

- **Check**: MCP server is running (`pnpm dev` in mcp-server/)
- **Check**: HTTP transport enabled in `.env`: `MCP_HTTP_ENABLED=true`
- **Check**: Vikunja API accessible
- **Check**: Authorization header includes valid token

### Issue: PostgreSQL memory not working

- **Check**: Database credentials correct
- **Check**: Tables exist (run `specs/011-ai-agent-architecture/sql/setup_all.sql`)
- **Check**: Connection from n8n to PostgreSQL (network/firewall)

### Issue: Gemini API errors

- **Check**: API key valid (test at https://aistudio.google.com/)
- **Check**: Model name correct (`gemini-2.0-flash-thinking-exp-1219`)
- **Check**: API quota not exceeded

### Issue: Workflows not routing correctly

- **Check**: IF node conditions match expected JSON structure
- **Check**: Supervisor prompt includes routing logic
- **Check**: Workflow execution logs in n8n UI

## Environment Variables

Create `.env` file for MCP server with database configuration:

```bash
# MCP Server
MCP_HTTP_ENABLED=true
MCP_HTTP_PORT=3458
VIKUNJA_API_URL=http://localhost:3456

# PostgreSQL
DB_ENABLED=true
DB_HOST=192.168.50.63
DB_PORT=5432
DB_NAME=n8n_memory
DB_USER=postgres
DB_PASSWORD=[your password]
DB_MAX_CONNECTIONS=10

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Next Steps

After completing T022-T029:

1. **Verify all tests pass** (Test Cases 1-4)
2. **Check database logs** for tool executions
3. **Export workflows** to JSON for version control
4. **Update PHASE3_CHECKPOINT.md** with completion status
5. **Proceed to Phase 4** (User Story 2 - Daily Recommendations)

## Version Control

The exported workflow JSON files should be committed:

```bash
git add n8n-workflows/supervisor-agent.json
git add n8n-workflows/vikunja-specialist.json
git commit -m "feat: Add n8n workflows for supervisor and Vikunja specialist agents (T022-T029)"
```

## References

- **System Prompts**: `n8n-workflows/prompts/supervisor.md`, `vikunja-specialist.md`
- **MCP Tools Contract**: `specs/011-ai-agent-architecture/contracts/mcp-tools.md`
- **Database Schema**: `specs/011-ai-agent-architecture/sql/`
- **Test Scenarios**: `specs/011-ai-agent-architecture/quickstart.md`
