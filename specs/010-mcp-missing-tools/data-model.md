# Data Model: MCP Server Missing Tools

**Feature**: 010-mcp-missing-tools  
**Date**: 2025-10-26  
**Status**: Complete

## Overview

This document defines the data entities and their relationships for the four new read-only MCP tools. These entities are consumed from the Vikunja API and exposed to AI agents through MCP protocol.

## Entities

### Project (Existing Entity)

**Description**: Represents a workspace or list in Vikunja for organizing tasks. Projects can be nested (parent-child relationships) and archived.

**Source**: Vikunja API `/api/v1/projects/:id` and `/api/v1/projects`

**Attributes**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| id | integer | Yes | Unique identifier | Positive integer |
| title | string | Yes | Project name | 1-250 characters |
| description | string | No | Project description (Markdown) | Any string |
| hex_color | string | No | Visual color code | 6-char hex with # prefix (e.g., "#FF5733") |
| parent_project_id | integer | No | Parent project for nesting | Positive integer or null |
| is_archived | boolean | Yes | Archive status | true/false, default false |
| created | datetime | Yes | Creation timestamp | ISO 8601 format |
| updated | datetime | Yes | Last update timestamp | ISO 8601 format |
| owner | User | Yes | Project creator | User entity (nested) |

**Relationships**:
- **Parent**: Project (optional, self-reference for hierarchy)
- **Owner**: User (many-to-one)
- **Tasks**: Task[] (one-to-many, not loaded by get_project)

**State Transitions**:
```
Active (is_archived=false) ←→ Archived (is_archived=true)
```

**Validation Rules**:
- `id` must be positive integer
- `title` must not be empty
- `hex_color` if present must match regex: `/^#[0-9a-fA-F]{6}$/`
- `parent_project_id` cannot reference self (circular dependency prevention)

---

### Task (Existing Entity)

**Description**: Represents a todo item within a project. Tasks can have due dates, priorities, assignees, labels, and relations to other tasks.

**Source**: Vikunja API `/api/v1/tasks/:id`

**Attributes**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| id | integer | Yes | Unique identifier | Positive integer |
| title | string | Yes | Task title | 1-500 characters |
| description | string | No | Task description (Markdown) | Any string |
| done | boolean | Yes | Completion status | true/false, default false |
| due_date | datetime | No | Due date/time | ISO 8601 or null |
| priority | integer | Yes | Priority level | 0-5 (0=none, 5=urgent) |
| project_id | integer | Yes | Parent project | Positive integer |
| position | float | Yes | Order within project | Decimal for sorting |
| created | datetime | Yes | Creation timestamp | ISO 8601 format |
| updated | datetime | Yes | Last update timestamp | ISO 8601 format |
| created_by | User | Yes | Task creator | User entity (nested) |
| assignees | User[] | No | Assigned users | Array of User entities |
| labels | Label[] | No | Task labels | Array of Label entities |
| relations | TaskRelation[] | No | Task relationships | Array of relation metadata |

**Relationships**:
- **Project**: Project (many-to-one)
- **Creator**: User (many-to-one)
- **Assignees**: User[] (many-to-many)
- **Labels**: Label[] (many-to-many)
- **Relations**: Task[] (many-to-many through TaskRelation)

**State Transitions**:
```
Incomplete (done=false) → Complete (done=true)
```
(Note: Completing a recurring task creates next occurrence)

**Validation Rules**:
- `id` must be positive integer
- `title` must not be empty
- `priority` must be in range 0-5
- `project_id` must reference existing project user has access to
- `due_date` if set must be valid ISO 8601 datetime

---

### User (Existing Entity)

**Description**: Represents an authenticated user in Vikunja. Users can create projects, tasks, and collaborate on shared workspaces.

**Source**: Vikunja API `/api/v1/user` (authenticated endpoint)

**Attributes** (Safe Fields Only):

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| id | integer | Yes | Unique identifier | Positive integer |
| username | string | Yes | Login username | Unique, 3-100 characters |
| email | string | Yes | Email address | Valid email format |
| name | string | No | Display name | Any string |
| created | datetime | Yes | Account creation timestamp | ISO 8601 format |
| updated | datetime | Yes | Last update timestamp | ISO 8601 format |
| language | string | No | Preferred language | ISO 639-1 code (e.g., "en") |
| timezone | string | No | User timezone | IANA timezone (e.g., "America/New_York") |
| overdue_tasks_reminders_enabled | boolean | No | Reminder preference | true/false |

**Excluded Fields** (Security):
- `password` - Password hash (never exposed)
- `totp_secret` - 2FA secret (sensitive)
- `email_confirm_token` - Temporary verification token
- `password_reset_token` - Temporary reset token
- Any other authentication-related fields

**Relationships**:
- **Projects**: Project[] (one-to-many as owner)
- **Tasks**: Task[] (one-to-many as creator)
- **Assignments**: Task[] (many-to-many via assignees)

**Validation Rules**:
- `id` must be positive integer
- `username` must be unique and non-empty
- `email` must be valid email format
- `language` if present must be supported ISO 639-1 code
- `timezone` if present must be valid IANA timezone identifier

---

## Tool Input/Output Models

### GetProject Tool

**Input**:
```typescript
{
  id: number // Project ID (positive integer, required)
}
```

**Output**:
```typescript
{
  success: boolean
  message: string
  project?: Project // Full project entity
  error?: string    // Error code or message if success=false
}
```

---

### GetAllProjects Tool

**Input**:
```typescript
{
  page?: number          // Page number (positive int, default: 1)
  filter_archived?: boolean // Archive filter (optional)
}
```

**Output**:
```typescript
{
  success: boolean
  message: string
  projects?: Project[]   // Array of project entities
  total?: number         // Count of projects returned
  page?: number          // Current page number
  hasMore?: boolean      // Whether more pages exist
  error?: string         // Error code or message if success=false
}
```

---

### GetTask Tool

**Input**:
```typescript
{
  id: number // Task ID (positive integer, required)
}
```

**Output**:
```typescript
{
  success: boolean
  message: string
  task?: Task           // Full task entity with relations
  error?: string        // Error code or message if success=false
}
```

---

### GetUserInfo Tool

**Input**:
```typescript
{} // No parameters - uses authenticated user context
```

**Output**:
```typescript
{
  success: boolean
  message: string
  user?: User           // Filtered user entity (safe fields only)
  error?: string        // Error code or message if success=false
}
```

---

## Error States

All tools return consistent error structure when `success: false`:

### Common Error Codes

| Error Code | HTTP Status | Meaning | Example Message |
|------------|-------------|---------|-----------------|
| NOT_FOUND | 404 | Entity doesn't exist | "Project with ID 123 not found" |
| FORBIDDEN | 403 | User lacks permission | "You do not have permission to access project 123" |
| UNAUTHORIZED | 401 | Invalid/missing token | "Unauthorized: No user context found" |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests | "Rate limit exceeded. Try again later." |
| VALIDATION_ERROR | 400 | Invalid input parameters | "Invalid project ID: must be positive integer" |
| INTERNAL_ERROR | 500 | Unexpected server error | "Failed to retrieve project" |

### Error Response Format

```typescript
{
  success: false,
  message: "Human-readable error description",
  error: "ERROR_CODE" // or error.message for unexpected errors
}
```

---

## Data Flow

```
AI Agent
    ↓ (MCP Tool Call)
ToolRegistry
    ↓ (Route to Tool Class)
ProjectTools / TaskTools / UserTools
    ↓ (Validate Input via Zod)
RateLimiter
    ↓ (Check Rate Limit)
VikunjaClient
    ↓ (HTTP GET with Auth Token)
Vikunja API
    ↓ (Return JSON)
VikunjaClient
    ↓ (Parse Response / Handle Errors)
Tool Class
    ↓ (Format Response / Filter Sensitive Data)
MCP Server
    ↓ (Return to Agent)
AI Agent
```

---

## Assumptions

1. **Vikunja API Stability**: Entity schemas from Vikunja API remain stable (no breaking changes)
2. **Authentication**: UserContext token is always valid (validated before tool execution)
3. **Pagination**: Vikunja API returns maximum 50 entities per page (industry standard)
4. **Nested Loading**: Related entities (owner, assignees, labels) are loaded by Vikunja API automatically
5. **Field Filtering**: User entity from `/api/v1/user` may include all fields; MCP server filters sensitive data

---

## Next Steps

- Generate tool contracts (JSON schemas for each tool)
- Write quickstart guide for agent developers
- Update agent context with new tools
