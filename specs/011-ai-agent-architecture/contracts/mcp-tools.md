# MCP Tools Contract Specification

**Version**: 1.0.0  
**Date**: 2025-10-28  
**Protocol**: Model Context Protocol (MCP) 1.0  
**Transport**: HTTP with Server-Sent Events (SSE)

## Overview

This document specifies the contract for all MCP tools provided by the Vikunja MCP server. Each tool implements the search-before-action pattern and returns structured results with status codes for agent handling.

---

## Common Types

### ToolResult

Base response schema for all tool executions.

```typescript
interface ToolResult<T = any> {
  status: 'success' | 'error' | 'needs_clarification' | 'confirm_required' | 'preview_required';
  message: string; // User-friendly message for agent to relay
  data?: T; // Tool-specific result data
  suggestedActions?: string[]; // Next steps for user
  traceId: string; // Correlation ID for logging
  metadata?: {
    taskId?: number;
    confirmationToken?: string;
    expiresAt?: number; // Unix timestamp (ms)
  };
}
```

### TaskSummary

Minimal task representation for listings and confirmations.

```typescript
interface TaskSummary {
  id: number;
  title: string;
  project?: string; // Project title
  dueDate?: string; // ISO 8601
  priority: number; // 1-5
  done: boolean;
  labels?: string[];
  estimatedDuration?: number; // Minutes
}
```

---

## Tool: search_tasks

**Purpose**: Search for tasks using keywords and filters. Foundation for all task operations.

**Tool Definition**:
```json
{
  "name": "search_tasks",
  "description": "Search for tasks by keywords, project, labels, or due date filters. Use this BEFORE completing, updating, or deleting tasks to find the correct task ID.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "keywords": {
        "type": "string",
        "description": "Keywords to search in task titles and descriptions",
        "minLength": 1,
        "maxLength": 200
      },
      "projectId": {
        "type": "number",
        "description": "Filter by specific project ID (optional)"
      },
      "labels": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Filter by label names (optional)",
        "maxItems": 10
      },
      "status": {
        "type": "string",
        "enum": ["done", "incomplete", "all"],
        "default": "incomplete",
        "description": "Filter by completion status"
      },
      "dueDate": {
        "type": "object",
        "properties": {
          "from": {"type": "string", "format": "date-time"},
          "to": {"type": "string", "format": "date-time"}
        },
        "description": "Filter by due date range (optional)"
      },
      "userId": {
        "type": "string",
        "description": "User context (required for security)"
      }
    },
    "required": ["keywords", "userId"]
  }
}
```

**Response Schema**:
```typescript
interface SearchTasksResult {
  status: 'success';
  message: string; // e.g., "Found 3 matching tasks"
  data: {
    tasks: TaskSummary[];
    totalCount: number;
    query: string; // Echo of search keywords
  };
  traceId: string;
}

// No matches case
interface NoMatchResult {
  status: 'needs_clarification';
  message: string; // e.g., "I couldn't find any tasks matching 'organize garage'"
  suggestedActions: string[]; // e.g., ["Check if task exists in a specific project", "Verify task name"]
  traceId: string;
}
```

**Examples**:
```json
// Request
{
  "keywords": "water plants",
  "status": "incomplete",
  "userId": "user_123"
}

// Response (single match)
{
  "status": "success",
  "message": "Found 1 matching task",
  "data": {
    "tasks": [
      {
        "id": 42,
        "title": "Water plants",
        "project": "Home",
        "dueDate": "2025-10-29T09:00:00Z",
        "priority": 2,
        "done": false
      }
    ],
    "totalCount": 1,
    "query": "water plants"
  },
  "traceId": "user_123-1730000000000-uuid"
}

// Response (multiple matches)
{
  "status": "success",
  "message": "Found 2 matching tasks",
  "data": {
    "tasks": [
      {"id": 42, "title": "Water office plants", "project": "Work", ...},
      {"id": 43, "title": "Water home plants", "project": "Home", ...}
    ],
    "totalCount": 2,
    "query": "water plants"
  },
  "traceId": "user_123-1730000000000-uuid"
}
```

---

## Tool: complete_task

**Purpose**: Mark a task as complete (search-first, confirm-before-execute).

**Tool Definition**:
```json
{
  "name": "complete_task",
  "description": "Mark a task as complete. This tool ALWAYS searches first, presents matches for user confirmation, and returns a confirmation token. Never directly completes a task - use confirm_complete_task for execution.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "taskQuery": {
        "type": "string",
        "description": "Keywords or description of the task to complete",
        "minLength": 1
      },
      "userId": {
        "type": "string",
        "description": "User context (required)"
      }
    },
    "required": ["taskQuery", "userId"]
  }
}
```

**Response Schemas**:
```typescript
// No match
interface CompleteTaskNoMatch {
  status: 'needs_clarification';
  message: string; // "I couldn't find an active task matching '{query}'. Could you tell me which project it's in, or check if it's already completed?"
  suggestedActions: string[];
  traceId: string;
}

// Multiple matches
interface CompleteTaskMultiple {
  status: 'needs_clarification';
  message: string; // "I found 2 tasks matching 'water plants'. Which one did you mean?"
  data: {
    tasks: TaskSummary[];
  };
  suggestedActions: string[]; // ["Specify which one you meant"]
  traceId: string;
}

// Single match (confirmation required)
interface CompleteTaskConfirm {
  status: 'confirm_required';
  message: string; // "I found: 'Water plants' (Home, due Oct 29). Mark this as complete?"
  data: {
    task: TaskSummary;
  };
  metadata: {
    taskId: number;
    confirmationToken: string; // JWT or signed token
    expiresAt: number; // 5 minutes from now
  };
  traceId: string;
}
```

**Example**:
```json
// Request
{
  "taskQuery": "water plants",
  "userId": "user_123"
}

// Response (confirmation required)
{
  "status": "confirm_required",
  "message": "I found: 'Water plants' (Home, due Oct 29 9am). Mark this as complete?",
  "data": {
    "task": {
      "id": 42,
      "title": "Water plants",
      "project": "Home",
      "dueDate": "2025-10-29T09:00:00Z",
      "priority": 2,
      "done": false
    }
  },
  "metadata": {
    "taskId": 42,
    "confirmationToken": "eyJhbGc...",
    "expiresAt": 1730000300000
  },
  "traceId": "user_123-1730000000000-uuid"
}
```

---

## Tool: confirm_complete_task

**Purpose**: Execute task completion after user confirmation.

**Tool Definition**:
```json
{
  "name": "confirm_complete_task",
  "description": "Confirm and execute task completion after user approves. Requires confirmation token from complete_task.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "taskId": {
        "type": "number",
        "description": "Task ID to complete"
      },
      "confirmationToken": {
        "type": "string",
        "description": "Token from complete_task response"
      },
      "userId": {
        "type": "string",
        "description": "User context"
      }
    },
    "required": ["taskId", "confirmationToken", "userId"]
  }
}
```

**Response Schema**:
```typescript
// Success
interface ConfirmCompleteSuccess {
  status: 'success';
  message: string; // "Marked 'Water plants' as complete ✓"
  data: {
    task: TaskSummary; // Updated task with done=true
  };
  traceId: string;
}

// Error (token invalid/expired)
interface ConfirmCompleteError {
  status: 'error';
  message: string; // "Confirmation expired. Please search for the task again."
  traceId: string;
}
```

---

## Tool: update_task

**Purpose**: Modify task properties (search-first pattern).

**Tool Definition**:
```json
{
  "name": "update_task",
  "description": "Update task properties (title, description, due date, priority, project). Searches first and requires confirmation.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "taskQuery": {
        "type": "string",
        "description": "Keywords to find the task"
      },
      "updates": {
        "type": "object",
        "properties": {
          "title": {"type": "string"},
          "description": {"type": "string"},
          "dueDate": {"type": "string", "format": "date-time"},
          "priority": {"type": "number", "minimum": 1, "maximum": 5},
          "projectId": {"type": "number"}
        },
        "description": "Properties to update (at least one required)"
      },
      "userId": {"type": "string"}
    },
    "required": ["taskQuery", "updates", "userId"]
  }
}
```

**Response Schemas**: Same pattern as `complete_task` (needs_clarification → confirm_required → success).

---

## Tool: create_task

**Purpose**: Create a new task with specified properties.

**Tool Definition**:
```json
{
  "name": "create_task",
  "description": "Create a new task in Vikunja. Requires title; other fields optional.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Task title (required)",
        "minLength": 1,
        "maxLength": 250
      },
      "description": {"type": "string"},
      "dueDate": {
        "type": "string",
        "format": "date-time",
        "description": "ISO 8601 date/time (parsed by agent from natural language)"
      },
      "priority": {"type": "number", "minimum": 1, "maximum": 5, "default": 2},
      "projectId": {"type": "number", "description": "Target project (default: Inbox)"},
      "labels": {
        "type": "array",
        "items": {"type": "string"},
        "maxItems": 10
      },
      "estimatedDuration": {"type": "number", "description": "Minutes"},
      "userId": {"type": "string"}
    },
    "required": ["title", "userId"]
  }
}
```

**Response Schema**:
```typescript
interface CreateTaskSuccess {
  status: 'success';
  message: string; // "Created task: 'Call Mom' (due tomorrow at 3pm) ✓"
  data: {
    task: TaskSummary; // Newly created task
  };
  traceId: string;
}
```

---

## Tool: get_daily_recommendations

**Purpose**: Get prioritized task list for daily planning.

**Tool Definition**:
```json
{
  "name": "get_daily_recommendations",
  "description": "Get prioritized task recommendations for today, sorted by urgency (overdue → today → this week) and priority within each group.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectFilter": {
        "type": "string",
        "description": "Filter to specific project (e.g., 'Work', 'Personal'). Optional."
      },
      "maxTasks": {
        "type": "number",
        "default": 15,
        "minimum": 1,
        "maximum": 50,
        "description": "Maximum tasks to return"
      },
      "userId": {"type": "string"}
    },
    "required": ["userId"]
  }
}
```

**Response Schema**:
```typescript
interface DailyRecommendationsResult {
  status: 'success';
  message: string; // "You have 3 overdue tasks, 2 due today, and 5 due this week."
  data: {
    groups: {
      overdue: TaskSummary[];
      today: TaskSummary[];
      thisWeek: TaskSummary[];
      later: TaskSummary[];
    };
    summary: {
      totalOverdue: number;
      totalToday: number;
      totalThisWeek: number;
    };
  };
  traceId: string;
}
```

---

## Tool: filter_tasks_by_duration

**Purpose**: Find tasks suitable for a specific time window (e.g., lunch break).

**Tool Definition**:
```json
{
  "name": "filter_tasks_by_duration",
  "description": "Find tasks that fit within a specified duration (e.g., for lunch break, between meetings).",
  "inputSchema": {
    "type": "object",
    "properties": {
      "minMinutes": {"type": "number", "minimum": 1},
      "maxMinutes": {"type": "number", "minimum": 1},
      "projectFilter": {"type": "string"},
      "maxResults": {"type": "number", "default": 5, "maximum": 20},
      "userId": {"type": "string"}
    },
    "required": ["maxMinutes", "userId"]
  }
}
```

**Response Schema**:
```typescript
interface DurationFilterResult {
  status: 'success';
  message: string; // "Found 3 tasks that should take 30-60 minutes"
  data: {
    tasks: TaskSummary[]; // Sorted by priority
  };
  traceId: string;
}
```

---

## Tool: bulk_complete_tasks

**Purpose**: Mark multiple tasks complete with threshold confirmation.

**Tool Definition**:
```json
{
  "name": "bulk_complete_tasks",
  "description": "Mark multiple tasks as complete. Automatically confirms for 1-5 tasks; requires approval for 6+ tasks.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "taskIds": {
        "type": "array",
        "items": {"type": "number"},
        "minItems": 1,
        "maxItems": 100
      },
      "userId": {"type": "string"}
    },
    "required": ["taskIds", "userId"]
  }
}
```

**Response Schemas**:
```typescript
// 1-5 tasks: Execute immediately
interface BulkCompleteSmall {
  status: 'success';
  message: string; // "Marked 3 tasks as complete: 'Task 1', 'Task 2', 'Task 3' ✓"
  data: {
    completed: TaskSummary[];
    count: number;
  };
  traceId: string;
}

// 6+ tasks: Require preview approval
interface BulkCompletePreview {
  status: 'preview_required';
  message: string; // "This will mark 12 tasks as complete. Please review and confirm:"
  data: {
    tasks: TaskSummary[]; // All tasks to be completed
    count: number;
  };
  metadata: {
    confirmationToken: string;
    expiresAt: number;
  };
  traceId: string;
}
```

---

## Tool: create_project_plan

**Purpose**: Create project structure with tasks from conversational planning.

**Tool Definition**:
```json
{
  "name": "create_project_plan",
  "description": "Create a new project with tasks, subtasks, and due dates based on planning conversation.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectTitle": {"type": "string", "minLength": 1},
      "projectDescription": {"type": "string"},
      "tasks": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "dueDate": {"type": "string", "format": "date-time"},
            "priority": {"type": "number"},
            "estimatedDuration": {"type": "number"},
            "subtasks": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "title": {"type": "string"},
                  "dueDate": {"type": "string", "format": "date-time"}
                }
              }
            }
          },
          "required": ["title"]
        },
        "minItems": 1
      },
      "userId": {"type": "string"}
    },
    "required": ["projectTitle", "tasks", "userId"]
  }
}
```

**Response Schema**:
```typescript
interface CreateProjectPlanResult {
  status: 'success';
  message: string; // "Created project 'Kitchen Renovation' with 8 tasks and 15 subtasks ✓"
  data: {
    project: {
      id: number;
      title: string;
    };
    tasksCreated: number;
    subtasksCreated: number;
  };
  traceId: string;
}
```

---

## Error Handling

All tools must handle errors gracefully and return user-friendly messages:

```typescript
interface ToolError {
  status: 'error';
  message: string; // User-friendly error message
  suggestedActions?: string[]; // How to resolve
  traceId: string;
  metadata?: {
    errorCode?: string; // For logging/debugging
    details?: string; // Technical details (not shown to user)
  };
}
```

**Common Error Cases**:
- **Authentication Failed**: `{status: 'error', message: "I couldn't access your tasks. Please check your Vikunja connection."}`
- **Network Timeout**: `{status: 'error', message: "Vikunja took too long to respond. Please try again."}`
- **Invalid Input**: `{status: 'error', message: "I need a task title to create a new task."}`
- **Permission Denied**: `{status: 'error', message: "You don't have permission to modify this task."}`

---

## Security Requirements

1. **User Context**: All tools MUST receive and validate `userId` parameter
2. **Authorization**: MCP server MUST verify user has access to requested tasks/projects via Vikunja API
3. **Confirmation Tokens**: MUST be signed JWT with 5-minute expiration
4. **Input Sanitization**: MUST validate all inputs against Zod schemas before processing
5. **Rate Limiting**: MUST implement per-user rate limits (100 requests/minute)

---

## Logging Requirements

All tool executions MUST log:
```typescript
{
  traceId: string;
  toolName: string;
  userId: string;
  args: any; // Sanitized (no secrets)
  result: any; // Sanitized
  status: string;
  latencyMs: number;
  timestamp: number;
}
```

---

## Testing Requirements

Each tool MUST have test coverage for:
- ✅ Happy path (success case)
- ✅ No matches found
- ✅ Multiple matches found
- ✅ Invalid input (schema validation)
- ✅ Authentication failure
- ✅ Network timeout
- ✅ Permission denied

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-28 | Initial contract specification |

