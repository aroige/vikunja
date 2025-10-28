# MCP Tools: Direct vs Agent Tools

**Feature**: 011-ai-agent-architecture  
**Date**: 2025-10-28

## Overview

The MCP server now provides **two sets of tools** with different purposes:

1. **Direct Tools** - For direct API use, programmatic access, and simple operations
2. **Agent Tools** - For AI agent workflows requiring search-before-action patterns and confirmation flows

## Tool Categories

### Direct Tools (Original)

These tools provide direct access to Vikunja functionality without additional workflow logic:

**Search & Query:**
- `search_tasks` - Direct task search with filtering
- `search_projects` - Direct project search
- `get_my_tasks` - Get user's tasks
- `get_project_tasks` - Get tasks in a project

**Task Operations:**
- `create_task` - Create task immediately
- `update_task` - Update task immediately
- `complete_task` - Mark task complete immediately (no confirmation)
- `delete_task` - Delete task immediately
- `move_task` - Move task to different project

**Use Cases:**
- Programmatic task creation from external systems
- Batch operations
- Admin tools
- When you control the input and trust the data
- When confirmation workflows are handled externally

### Agent Tools (Phase 3 - NEW)

These tools implement search-before-action patterns and return structured `ToolResult` responses for AI agent workflows:

**Search:**
- `agent_search_tasks` - Enhanced search with ToolResult status codes
  - Returns: `success` | `needs_clarification` | `error`
  - `success`: Found matching tasks → returns TaskSummary[]
  - `needs_clarification`: No matches, label not found, or ambiguous input → returns suggestions
  - `error`: API failure or connection issues
  - Use for: Agent workflows requiring proper error handling

**Task Completion (Two-Phase):**
- `agent_complete_task` - Search and prepare confirmation
  - Returns: `confirm_required` with JWT token (5 min expiry)
  - Never directly completes tasks
  - Use for: Initiating completion workflow

- `agent_confirm_complete_task` - Execute after user says "yes"
  - Requires: Valid JWT token from `agent_complete_task`
  - Returns: `success` | `error`
  - Use for: Completing the confirmation workflow

**Use Cases:**
- n8n agent workflows
- Conversational AI assistants
- When user confirmation is required (99%+ accuracy requirement)
- When dealing with ambiguous natural language input
- When implementing multi-turn conversations

## Naming Convention

| Pattern | Example | Purpose |
|---------|---------|---------|
| `{verb}_{noun}` | `search_tasks`, `complete_task` | Direct API tools |
| `agent_{verb}_{noun}` | `agent_search_tasks`, `agent_complete_task` | AI agent workflow tools |

**Why prefix with "agent_"?**
1. **Clear separation** - Easy to identify which tools are for agents vs direct use
2. **No conflicts** - Avoids naming collisions with existing tools
3. **Self-documenting** - Tool name indicates its purpose
4. **Future-proof** - Can add more agent-specific tools without confusion

## When to Use Which

### Use Direct Tools When:
- ✅ You have exact task IDs
- ✅ Input is validated/trusted
- ✅ No user confirmation needed
- ✅ Building admin tools
- ✅ Batch operations
- ✅ External integrations (webhooks, scheduled jobs)

### Use Agent Tools When:
- ✅ Processing natural language input
- ✅ User confirmation required (safety-critical operations)
- ✅ Building conversational AI
- ✅ Implementing n8n workflows
- ✅ Need structured error responses
- ✅ Multi-turn conversation context

## Tool Response Types

### Direct Tools
```json
{
  "id": 123,
  "title": "Water plants",
  "done": false,
  ...
}
```
**Returns**: Raw Vikunja API responses (task objects, arrays, etc.)

### Agent Tools
```json
{
  "status": "success",
  "message": "Found 1 task matching 'water plants'",
  "data": {
    "tasks": [
      {
        "id": 123,
        "title": "Water plants",
        "dueDate": "2025-10-29T09:00:00Z",
        "priority": 3
      }
    ],
    "totalCount": 1,
    "query": "water plants"
  },
  "traceId": "user-123-1698451200-uuid",
  "suggestedActions": []
}
```
**Returns**: Structured `ToolResult` with status codes, user-friendly messages, and metadata

**Clarification Response:**
```json
{
  "status": "needs_clarification",
  "message": "I couldn't find any tasks matching 'wter plants'",
  "suggestedActions": [
    "Check if the task exists in a specific project",
    "Verify the task name or try different keywords",
    "Check if the task is already completed (use status: 'all')"
  ],
  "traceId": "user-123-1698451200-uuid"
}
```
**Use for**: Multi-turn conversations where the agent needs to ask for clarification

## Example: Task Completion Workflows

### Direct Approach (complete_task)
```
User provides task ID → Call complete_task → Done
```

**Pros**: Simple, fast  
**Cons**: Requires exact ID, no safety checks

### Agent Approach (agent_complete_task)
```
User: "I'm done watering plants"
↓
Agent: Call agent_search_tasks(keywords="watering plants", status="incomplete")
↓
Result: { status: "success", data: { tasks: [1 task], totalCount: 1 } }
↓
Agent: Call agent_complete_task(taskQuery="watering plants")
↓
Result: { status: "confirm_required", metadata: { confirmationToken: "..." } }
↓
Agent: "I found 'Water plants' (due today). Mark complete? (yes/no)"
↓
User: "yes"
↓
Agent: Call agent_confirm_complete_task(taskId=123, confirmationToken="...")
↓
Result: { status: "success" }
```

**Alternative Flow - No Match:**
```
User: "I'm done watering plants"
↓
Agent: Call agent_search_tasks(keywords="watering plants", status="incomplete")
↓
Result: { status: "needs_clarification", message: "I couldn't find any tasks matching 'watering plants'", suggestedActions: [...] }
↓
Agent: "I couldn't find any tasks matching 'watering plants'. Would you like to:
       • Check if it's in a specific project?
       • Try different keywords?
       • See all completed tasks?"
↓
User clarifies or corrects query
```

**Pros**: 99%+ accuracy, safe, handles ambiguity  
**Cons**: More steps, requires conversation state

## Tool Descriptions in MCP

All agent tools are marked with `[AI AGENT TOOL]` prefix in their descriptions:

```
[AI AGENT TOOL] Search for tasks with enhanced filtering for agent workflows...
```

This makes it easy to identify agent-specific tools when browsing the tool list.

## n8n Workflow Integration

In n8n workflows, **always use agent tools**:

```javascript
// ❌ Don't use direct tools in n8n
await mcpServer.call('complete_task', { taskId: 123 });

// ✅ Use agent tools for proper workflow handling
const result1 = await mcpServer.call('agent_complete_task', { 
  taskQuery: userMessage,
  userId: session.userId 
});

if (result1.status === 'confirm_required') {
  // Present confirmation to user
  await askUser(result1.message);
  const userResponse = await waitForResponse();
  
  if (userResponse.includes('yes')) {
    const result2 = await mcpServer.call('agent_confirm_complete_task', {
      taskId: result1.metadata.taskId,
      confirmationToken: result1.metadata.confirmationToken,
      userId: session.userId
    });
  }
}
```

## Implementation Status

| Tool | Status | File | Phase |
|------|--------|------|-------|
| agent_search_tasks | ✅ Complete | search-tools.ts | T017 |
| agent_complete_task | ✅ Complete | task-tools-agent.ts | T018 |
| agent_confirm_complete_task | ✅ Complete | task-tools-agent.ts | T019 |
| agent_get_daily_recommendations | ⏳ Future | recommendation-tools.ts | T030 (Phase 4) |
| agent_create_task | ⏳ Future | task-tools-agent.ts | T040 (Phase 5) |
| agent_create_project_plan | ⏳ Future | project-tools-agent.ts | T047 (Phase 6) |

## Migration Guide

### For Existing Direct Tool Users
No changes needed - all direct tools remain unchanged and fully functional.

### For New Agent Workflows
Use agent-prefixed tools:
- `search_tasks` → `agent_search_tasks`
- `complete_task` → `agent_complete_task` + `agent_confirm_complete_task`

### For n8n Users
Follow the setup guide in `n8n-workflows/SETUP_GUIDE.md` which uses agent tools exclusively.

## References

- **MCP Tools Contract**: `specs/011-ai-agent-architecture/contracts/mcp-tools.md`
- **Tool Implementation**: `mcp-server/src/tools/`
  - `search-tools.ts` - SearchToolsAgent class
  - `task-tools-agent.ts` - TaskToolsAgent class
- **Tool Registry**: `mcp-server/src/tools/registry.ts`
- **n8n Setup Guide**: `n8n-workflows/SETUP_GUIDE.md`

## Future Enhancements

**Phase 4** (User Story 2):
- `agent_get_daily_recommendations` - Prioritized task list
- `agent_filter_tasks_by_duration` - Find tasks by time estimate

**Phase 5** (User Story 4):
- `agent_create_task` - Natural language task creation with date parsing

**Phase 6** (User Story 3):
- `agent_create_project_plan` - Multi-turn project planning workflow

All future agent tools will follow the `agent_*` naming convention for consistency.
