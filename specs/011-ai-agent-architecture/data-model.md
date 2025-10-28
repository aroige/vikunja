# Data Model: AI-Powered Personal Assistant System

**Date**: 2025-10-28  
**Branch**: `011-ai-agent-architecture`

## Overview

This document defines the data entities, relationships, and state transitions for the AI agent system. The system introduces NEW entities for agent orchestration while maintaining compatibility with EXISTING Vikunja entities.

---

## Entity Catalog

### NEW: Agent Conversation

**Purpose**: Track conversation context across agent delegations with PostgreSQL-backed memory.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | UUID | ✅ | Unique conversation identifier | Auto-generated |
| `userId` | string | ✅ | Vikunja user ID | Must exist in Vikunja |
| `agentType` | enum | ✅ | `supervisor`, `vikunja_specialist`, `calendar_specialist` | Validated list |
| `messages` | Message[] | ✅ | Conversation history (context window) | Max size per agent config |
| `sessionData` | JSON | ❌ | Structured session state (discovered IDs, pending confirmations) | Zod validated |
| `createdAt` | timestamp | ✅ | Conversation start time | ISO 8601 |
| `updatedAt` | timestamp | ✅ | Last message timestamp | ISO 8601 |
| `expiresAt` | timestamp | ❌ | Auto-delete after (default 30 days) | ISO 8601 |

**Relationships**:
- 1:1 with Vikunja User (via `userId`)
- 1:N with ConversationMessage

**State Transitions**:
```
[New] → [Active] → [Idle] → [Expired/Deleted]
                  ↓
              [Archived] (optional)
```

**Validation Rules**:
- Context window size enforced by PostgreSQL memory node:
  - Supervisor: 3-5 messages
  - Vikunja specialist: 10-15 messages
  - Calendar specialist: 8-12 messages
- `sessionData.pendingConfirmation` expires after 5 minutes
- Messages older than context window auto-pruned

---

### NEW: Conversation Message

**Purpose**: Individual message in agent conversation (user or assistant).

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | UUID | ✅ | Unique message identifier | Auto-generated |
| `conversationId` | UUID | ✅ | Parent conversation | Foreign key |
| `role` | enum | ✅ | `user`, `assistant`, `system` | Validated list |
| `content` | string | ✅ | Message text | Max 10,000 chars |
| `timestamp` | timestamp | ✅ | Message creation time | ISO 8601 |
| `metadata` | JSON | ❌ | Tool calls, function results, trace IDs | Zod validated |

**Relationships**:
- N:1 with AgentConversation (via `conversationId`)

**Validation Rules**:
- `role=system` only for agent initialization prompts
- `metadata.toolCalls` must match registered tool names
- `content` sanitized to prevent injection attacks

---

### NEW: Tool Execution Log

**Purpose**: Audit trail and debugging data for all MCP tool calls.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | UUID | ✅ | Unique log entry identifier | Auto-generated |
| `traceId` | string | ✅ | Request trace ID for correlation | Format: `{userId}-{timestamp}-{uuid}` |
| `toolName` | string | ✅ | Name of executed tool | Must be registered tool |
| `args` | JSON | ✅ | Tool input arguments (sanitized) | Zod schema validated |
| `result` | JSON | ✅ | Tool output result (sanitized) | Zod schema validated |
| `status` | enum | ✅ | `success`, `error`, `needs_clarification` | Validated list |
| `agentType` | enum | ✅ | Agent that called the tool | `supervisor`, `vikunja_specialist`, etc. |
| `userId` | string | ✅ | User context | Vikunja user ID |
| `latencyMs` | number | ✅ | Execution time in milliseconds | >= 0 |
| `tokensUsed` | number | ❌ | LLM tokens (if applicable) | >= 0 |
| `timestamp` | timestamp | ✅ | Execution time | ISO 8601 |

**Relationships**:
- N:1 with User (via `userId`)
- Linked to ConversationMessage via `traceId` in metadata

**Validation Rules**:
- Sensitive fields (`password`, `token`, `apiKey`) redacted from `args` and `result`
- `latencyMs` must be < 30,000 (30-second timeout)
- `result.status=needs_clarification` requires `result.message` and `result.suggestedActions`

---

### NEW: Agent Configuration

**Purpose**: Store agent-specific settings (context windows, model selection, prompt versions).

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `agentType` | enum | ✅ | Agent identifier | Primary key |
| `contextWindowSize` | number | ✅ | Number of messages in memory | 3-15 |
| `model` | string | ✅ | LLM model name | `gemini-2.0-flash-lite`, `gpt-4o-mini`, etc. |
| `promptVersion` | string | ✅ | Prompt file version (git commit hash or tag) | SHA-256 or semver |
| `maxTools` | number | ✅ | Maximum tools available to agent | 5-10 |
| `tools` | string[] | ✅ | List of enabled tool names | Must exist in MCP server |
| `updatedAt` | timestamp | ✅ | Last configuration change | ISO 8601 |

**Validation Rules**:
- `contextWindowSize` enforces token cost limits
- `tools.length` must be <= `maxTools`
- `promptVersion` must reference existing file in `n8n-workflows/prompts/`

---

### EXISTING: Vikunja Task (No Changes)

**Purpose**: Task entity from Vikunja (read-only from agent perspective).

**Fields** (subset relevant to agents):
| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique task identifier |
| `title` | string | Task title/description |
| `description` | string | Detailed task description (Markdown) |
| `done` | boolean | Completion status |
| `dueDate` | timestamp | Task due date/time (nullable) |
| `priority` | number | 1-5 priority level |
| `projectId` | number | Parent project ID (nullable) |
| `labels` | Label[] | Associated labels |
| `assignees` | User[] | Assigned users |
| `createdBy` | User | Task creator |

**Agent Operations**:
- ✅ Read (search, filter, rank)
- ✅ Update (complete, modify, delete) with search-before-action enforcement
- ✅ Create (new tasks, reminders)
- ❌ Direct CRUD (must go through MCP tools)

---

### EXISTING: Vikunja Project (No Changes)

**Purpose**: Project/list entity from Vikunja.

**Fields** (subset):
| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique project identifier |
| `title` | string | Project name |
| `description` | string | Project description |
| `color` | string | Hex color code |
| `isFavorite` | boolean | User's favorite status |
| `isArchived` | boolean | Archived status |

**Agent Operations**:
- ✅ Read (list projects, filter tasks by project)
- ✅ Create (project planning workflow)
- ❌ Modify existing (defer to future iterations)

---

## Entity Relationships Diagram

```
┌─────────────────────┐
│   Vikunja User      │
│   (EXISTING)        │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐      ┌──────────────────────┐
│ Agent Conversation  │ 1:N  │ Conversation Message │
│   (NEW)             │─────▶│   (NEW)              │
└──────────┬──────────┘      └──────────────────────┘
           │
           │ N:1
           │
┌──────────▼──────────┐      ┌──────────────────────┐
│ Agent Configuration │      │ Tool Execution Log   │
│   (NEW)             │      │   (NEW)              │
└─────────────────────┘      └──────────┬───────────┘
                                        │
                                        │ Linked via traceId
                                        │
                             ┌──────────▼───────────┐
                             │ Vikunja Task         │
                             │   (EXISTING)         │
                             └──────────┬───────────┘
                                        │
                                        │ N:1
                                        │
                             ┌──────────▼───────────┐
                             │ Vikunja Project      │
                             │   (EXISTING)         │
                             └──────────────────────┘
```

---

## State Transitions

### Task Completion Workflow (Search-Before-Action)

```
[User Request] → "I'm done watering plants"
      │
      ▼
[complete_task tool called]
      │
      ├─→ [Search Tasks] → No matches → [Return: "no_match" status]
      │                                       │
      │                                       ▼
      │                                  [Agent asks clarification]
      │
      ├─→ [Search Tasks] → Multiple matches → [Return: "needs_clarification" status]
      │                                              │
      │                                              ▼
      │                                         [Agent presents options]
      │                                              │
      │                                              ▼
      │                                         [User selects one]
      │                                              │
      │                                              ▼
      ├─→ [Search Tasks] → Single match ──────────→ [Return: "confirm_required" status]
      │                                              │
      │                                              ▼
      │                                         [Agent asks confirmation]
      │                                              │
      │                                              ▼
      │                                         [User confirms "yes"]
      │                                              │
      │                                              ▼
      └──────────────────────────────────────→ [confirm_complete_task tool called]
                                                     │
                                                     ▼
                                                [Task marked done=true]
                                                     │
                                                     ▼
                                                [Return: "completed" status]
                                                     │
                                                     ▼
                                                [Agent confirms: "Marked 'X' as complete ✓"]
```

### Bulk Operation Workflow (Threshold Confirmation)

```
[User Request] → "Mark all work tasks complete"
      │
      ▼
[bulk_complete_tasks tool called]
      │
      ├─→ [Search: project=Work, done=false] → Count results
      │
      ├─→ Count <= 5 → [Execute immediately]
      │                     │
      │                     ▼
      │                [Return: "completed" with list]
      │                     │
      │                     ▼
      │                [Agent: "Marked 3 tasks complete: ..."]
      │
      └─→ Count >= 6 → [Return: "preview_required" status]
                            │
                            ▼
                       [Agent shows preview]
                            │
                            ▼
                       [User approves/cancels]
                            │
                            ├─→ Cancel → [No action]
                            │
                            └─→ Approve → [confirm_bulk_complete tool called]
                                               │
                                               ▼
                                          [All tasks marked done=true]
                                               │
                                               ▼
                                          [Return: "completed"]
```

### Calendar Failure Degradation

```
[User Request] → "Can I fit presentation prep during lunch?"
      │
      ▼
[check_calendar_availability tool called]
      │
      ├─→ [Calendar API] → Success → [Return: free slots]
      │                                    │
      │                                    ▼
      │                               [Agent suggests specific time]
      │
      └─→ [Calendar API] → Error → [Graceful degradation]
                                       │
                                       ▼
                                  [Return: "service_unavailable" status]
                                       │
                                       ▼
                                  [Agent: "I can't check calendar right now,
                                          but based on your tasks..."]
```

---

## Data Validation & Constraints

### Search Query Validation
```typescript
const SearchQuerySchema = z.object({
  keywords: z.string().min(1).max(200),
  projectId: z.number().optional(),
  labels: z.array(z.string()).max(10).optional(),
  dueDate: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  }).optional(),
  status: z.enum(['done', 'incomplete', 'all']).default('incomplete'),
  userId: z.string() // Required for security
});
```

### Task Ranking Output
```typescript
const RankedTaskSchema = z.object({
  urgencyGroup: z.enum(['overdue', 'today', 'this_week', 'later', 'no_due_date']),
  tasks: z.array(z.object({
    id: z.number(),
    title: z.string(),
    project: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    priority: z.number().min(1).max(5),
    estimatedDuration: z.number().optional() // minutes
  })).max(15) // Limit per group
});
```

### Tool Result Schema
```typescript
const ToolResultSchema = z.object({
  status: z.enum(['success', 'error', 'needs_clarification', 'confirm_required', 'preview_required']),
  message: z.string(), // User-friendly message
  data: z.any().optional(), // Tool-specific result data
  suggestedActions: z.array(z.string()).optional(), // Next steps for user
  traceId: z.string(), // For logging correlation
  metadata: z.object({
    taskId: z.number().optional(),
    confirmationToken: z.string().optional(),
    expiresAt: z.number().optional() // Unix timestamp
  }).optional()
});
```

---

## Storage Specifications

### PostgreSQL Tables (n8n memory)

**Table: `agent_conversations`**
```sql
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('supervisor', 'vikunja_specialist', 'calendar_specialist')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  INDEX idx_user_agent (user_id, agent_type),
  INDEX idx_expires (expires_at)
);
```

**Table: `conversation_messages`**
```sql
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL CHECK (LENGTH(content) <= 10000),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  INDEX idx_conversation (conversation_id, timestamp)
);
```

**Table: `session_state`**
```sql
CREATE TABLE session_state (
  user_id VARCHAR(255) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### File Storage (version-controlled)

**n8n Workflows**: `n8n-workflows/*.json`
- Export format: n8n JSON workflow schema
- Version control: Git with commit messages describing changes
- Naming: `{agent-type}-{workflow-name}.json`

**Prompts**: `n8n-workflows/prompts/*.md`
- Format: Markdown with YAML frontmatter for metadata
- Version control: Git tags for production prompts
- Naming: `{agent-type}.md` or `{agent-type}-v{version}.md`

**Logs**: `mcp-server/logs/*.log` (rotated)
- Format: JSON Lines (one JSON object per line)
- Rotation: Daily with 7-day retention
- Naming: `mcp-server-{YYYY-MM-DD}.log`

---

## Summary

This data model introduces 4 new entities (AgentConversation, ConversationMessage, ToolExecutionLog, AgentConfiguration) while maintaining read-only access to existing Vikunja entities (Task, Project, User). All data flows enforce validation, security (user context), and observability (trace IDs, logging).

**Key Constraints**:
- ✅ Context windows limit token costs
- ✅ Search-before-action prevents data corruption
- ✅ Threshold confirmations prevent bulk mistakes
- ✅ Graceful degradation handles external failures
- ✅ Comprehensive logging enables debugging

**Ready for**: Contract generation (Phase 1 next step).
