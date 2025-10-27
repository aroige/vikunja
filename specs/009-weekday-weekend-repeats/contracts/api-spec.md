# API Contracts: Weekday and Weekend Repeat Patterns

## Overview

This document defines the API contracts for weekday and weekend repeat patterns. No new endpoints are added - existing task endpoints are extended to accept new `repeat_mode` values.

---

## Affected Endpoints

### 1. Create Task

**Endpoint**: `POST /api/v1/projects/{projectId}/tasks`

**Changes**: Accept `repeat_mode` values 3 and 4

#### Request

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | integer | Yes | ID of the project to create task in |

**Request Body**:
```json
{
  "title": "Daily standup",
  "description": "Morning team sync",
  "due_date": "2025-10-27T10:00:00Z",
  "repeat_after": 86400,
  "repeat_mode": 3,
  "priority": 3,
  "labels": [1, 2],
  "assignees": [5]
}
```

**Field Definitions**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `title` | string | Yes | 1-500 chars | Task title |
| `description` | string | No | Max 64KB | Task description (Markdown) |
| `due_date` | string | No | ISO 8601 | Due date in UTC |
| `repeat_after` | integer | No | ≥ 0 | Seconds between occurrences |
| `repeat_mode` | integer | No | 0-4 | ✨ **Updated**: Was 0-2, now 0-4 |
| `priority` | integer | No | 0-5 | Priority level |
| `labels` | array[integer] | No | - | Label IDs |
| `assignees` | array[integer] | No | - | User IDs |

**Repeat Mode Values**:
| Value | Name | Description |
|-------|------|-------------|
| 0 | Default | Repeat from due date (default) |
| 1 | Monthly | Repeat on same calendar date |
| 2 | From Current | Repeat from completion date |
| 3 | ✨ **Weekdays** | Repeat Monday-Friday only |
| 4 | ✨ **Weekends** | Repeat Saturday-Sunday only |

#### Response

**Success (201 Created)**:
```json
{
  "id": 123,
  "title": "Daily standup",
  "description": "Morning team sync",
  "done": false,
  "done_at": null,
  "due_date": "2025-10-27T10:00:00Z",
  "repeat_after": 86400,
  "repeat_mode": 3,
  "priority": 3,
  "labels": [
    {"id": 1, "title": "Work", "hex_color": "ff0000"}
  ],
  "assignees": [
    {"id": 5, "username": "alice", "name": "Alice"}
  ],
  "created": "2025-10-26T15:30:00Z",
  "updated": "2025-10-26T15:30:00Z"
}
```

**Error Responses**:

**400 Bad Request** - Invalid repeat_mode:
```json
{
  "message": "Invalid repeat_mode value. Must be between 0 and 4."
}
```

**403 Forbidden** - No write permission:
```json
{
  "message": "You do not have permission to create tasks in this project."
}
```

**404 Not Found** - Project doesn't exist:
```json
{
  "message": "Project not found."
}
```

---

### 2. Update Task

**Endpoint**: `PUT /api/v1/tasks/{taskId}`

**Changes**: Accept `repeat_mode` values 3 and 4

#### Request

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | integer | Yes | ID of the task to update |

**Request Body** (partial update supported):
```json
{
  "repeat_after": 86400,
  "repeat_mode": 4
}
```

**Field Definitions** (same as Create Task, all optional):
| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `repeat_after` | integer | ≥ 0 | Update repeat interval |
| `repeat_mode` | integer | 0-4 | ✨ **Updated**: Change repeat mode |

#### Response

**Success (200 OK)**:
```json
{
  "id": 123,
  "title": "Clean house",
  "repeat_after": 86400,
  "repeat_mode": 4,
  "due_date": "2025-10-26T14:00:00Z",
  "updated": "2025-10-26T16:00:00Z"
}
```

**Error Responses**:

**400 Bad Request** - Invalid repeat_mode:
```json
{
  "message": "Invalid repeat_mode value. Must be between 0 and 4."
}
```

**403 Forbidden** - No write permission:
```json
{
  "message": "You do not have permission to update this task."
}
```

**404 Not Found** - Task doesn't exist:
```json
{
  "message": "Task not found."
}
```

---

### 3. Get Task

**Endpoint**: `GET /api/v1/tasks/{taskId}`

**Changes**: Returns new `repeat_mode` values (3, 4) for weekday/weekend tasks

#### Request

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | integer | Yes | ID of the task to retrieve |

#### Response

**Success (200 OK)**:
```json
{
  "id": 123,
  "title": "Daily standup",
  "description": "Morning team sync",
  "done": false,
  "due_date": "2025-10-27T10:00:00Z",
  "repeat_after": 86400,
  "repeat_mode": 3,
  "created": "2025-10-26T15:30:00Z",
  "updated": "2025-10-26T15:30:00Z"
}
```

**No changes to response structure** - `repeat_mode` field already exists, just new possible values.

---

### 4. Get Project Tasks

**Endpoint**: `GET /api/v1/projects/{projectId}/tasks`

**Changes**: Tasks with weekday/weekend modes included in results

#### Request

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Query Parameters** (unchanged):
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number for pagination |
| `per_page` | integer | Items per page (default: 50) |
| `sort_by` | string | Sort field (e.g., "due_date") |
| `order_by` | string | Sort order ("asc" or "desc") |
| `filter` | string | Filter expression |

#### Response

**Success (200 OK)**:
```json
[
  {
    "id": 123,
    "title": "Daily standup",
    "repeat_mode": 3,
    "due_date": "2025-10-27T10:00:00Z"
  },
  {
    "id": 124,
    "title": "Weekend chores",
    "repeat_mode": 4,
    "due_date": "2025-10-26T14:00:00Z"
  }
]
```

**No structural changes** - new modes appear in existing `repeat_mode` field.

---

## MCP Server Tool Schemas

### create_task

**Schema Update**:
```typescript
export const CreateTaskSchema = z.object({
  project_id: z.number().int().positive()
    .describe('ID of the project to create the task in.'),
  title: z.string().min(1).max(500)
    .describe('Task title (1-500 characters).'),
  repeat_after: z.number().int().min(0).optional()
    .describe('Recurring interval in SECONDS. Common: 3600=hourly, 86400=daily, 604800=weekly.'),
  repeat_mode: z.number().int().min(0).max(4).optional()  // ✨ Changed from max(2)
    .describe(`Repeat mode (0-4, optional):
      0 = DEFAULT (repeat from due date)
      1 = MONTHLY (same calendar date each month)
      2 = FROM_CURRENT (repeat from completion)
      3 = WEEKDAYS (Monday-Friday only)
      4 = WEEKENDS (Saturday-Sunday only)
    `),
});
```

**Example Usage**:
```typescript
// Create weekday task
{
  project_id: 1,
  title: "Daily standup",
  due_date: "2025-10-27T10:00:00Z",
  repeat_after: 86400,
  repeat_mode: 3
}

// Create weekend task
{
  project_id: 1,
  title: "Clean house",
  due_date: "2025-10-26T14:00:00Z",
  repeat_after: 86400,
  repeat_mode: 4
}
```

---

### update_task

**Schema Update**:
```typescript
export const UpdateTaskSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the task to update.'),
  repeat_after: z.number().int().min(0).optional()
    .describe('Update recurring interval in SECONDS.'),
  repeat_mode: z.number().int().min(0).max(4).optional()  // ✨ Changed from max(2)
    .describe(`Update repeat mode (0-4, optional):
      0 = DEFAULT, 1 = MONTHLY, 2 = FROM_CURRENT, 
      3 = WEEKDAYS, 4 = WEEKENDS
    `),
});
```

---

## Validation Rules

### Backend Validation (Go)

**XORM Tags**:
```go
type Task struct {
    // ...
    RepeatAfter int64          `xorm:"bigint INDEX null" json:"repeat_after" valid:"range(0|9223372036854775807)"`
    RepeatMode  TaskRepeatMode `xorm:"not null default 0" json:"repeat_mode" valid:"range(0|4)"`  // ✨ Changed
    // ...
}
```

**Custom Validation** (if needed):
```go
func (t *Task) ValidateRepeatMode() error {
    if t.RepeatMode < 0 || t.RepeatMode > 4 {
        return fmt.Errorf("repeat_mode must be between 0 and 4")
    }
    return nil
}
```

### Frontend Validation (TypeScript)

**Zod Schema** (in `task.ts` service):
```typescript
const TaskSchema = z.object({
  // ...
  repeat_after: z.number().int().min(0).optional(),
  repeat_mode: z.number().int().min(0).max(4).optional(),  // ✨ Changed from max(2)
  // ...
});
```

### MCP Server Validation (TypeScript)

**Already shown above** in CreateTaskSchema and UpdateTaskSchema

---

## Backward Compatibility

### Reading Tasks

✅ **Old clients can read new tasks**:
- Old clients see `repeat_mode: 3` or `4` as valid integers
- May display "unknown repeat mode" in UI (graceful degradation)
- Can still read all other task fields normally

### Writing Tasks

⚠️ **Old clients cannot create weekday/weekend tasks**:
- Old client validation rejects `repeat_mode > 2`
- Old clients can create tasks with modes 0, 1, 2 (unchanged)
- New clients can create tasks with all modes 0-4

### Updating Tasks

✅ **Old clients can update tasks without changing repeat_mode**:
- If old client updates title/description, doesn't send `repeat_mode` in request
- Backend preserves existing `repeat_mode` value (partial update)
- Task continues working with weekday/weekend logic

⚠️ **Old clients changing repeat_mode will reset to 0-2**:
- If old client explicitly sets `repeat_mode`, will use old validation
- May inadvertently change weekday task (mode 3) to daily (mode 0)

---

## Error Handling

### Client-Side Errors

**Invalid repeat_mode (frontend)**:
```typescript
if (task.repeatMode < 0 || task.repeatMode > 4) {
  throw new Error('Invalid repeat mode. Must be between 0 and 4.');
}
```

**User-facing message**:
```
"Please select a valid repeat pattern."
```

### Server-Side Errors

**Invalid repeat_mode (backend)**:
```go
if task.RepeatMode < 0 || task.RepeatMode > 4 {
    return &web.HTTPError{
        Code:    http.StatusBadRequest,
        Message: "Invalid repeat_mode value. Must be between 0 and 4.",
    }
}
```

**Database constraint violation**:
```json
{
  "message": "Failed to save task: repeat_mode out of range"
}
```

---

## OpenAPI Specification (Partial)

```yaml
components:
  schemas:
    Task:
      type: object
      properties:
        id:
          type: integer
          format: int64
        title:
          type: string
          minLength: 1
          maxLength: 500
        repeat_after:
          type: integer
          format: int64
          minimum: 0
          description: Repeat interval in seconds
        repeat_mode:
          type: integer
          minimum: 0
          maximum: 4  # ✨ Changed from 2
          default: 0
          description: |
            Repeat calculation mode:
            * 0 - DEFAULT: Repeat from due date
            * 1 - MONTHLY: Same calendar date each month
            * 2 - FROM_CURRENT: Repeat from completion
            * 3 - WEEKDAYS: Monday-Friday only
            * 4 - WEEKENDS: Saturday-Sunday only

paths:
  /api/v1/projects/{projectId}/tasks:
    post:
      summary: Create a new task
      parameters:
        - name: projectId
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Task'
            examples:
              weekday_task:
                summary: Weekday repeat task
                value:
                  title: "Daily standup"
                  repeat_after: 86400
                  repeat_mode: 3
              weekend_task:
                summary: Weekend repeat task
                value:
                  title: "Clean house"
                  repeat_after: 86400
                  repeat_mode: 4
      responses:
        '201':
          description: Task created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '400':
          description: Invalid repeat_mode value
        '403':
          description: Permission denied
```

---

## Summary

### Changes to Existing Endpoints

| Endpoint | Method | Change | Impact |
|----------|--------|--------|--------|
| `/api/v1/projects/{id}/tasks` | POST | Accept `repeat_mode` 3, 4 | ✅ Backward compatible |
| `/api/v1/tasks/{id}` | PUT | Accept `repeat_mode` 3, 4 | ✅ Backward compatible |
| `/api/v1/tasks/{id}` | GET | Return `repeat_mode` 3, 4 | ✅ Old clients can read |
| `/api/v1/projects/{id}/tasks` | GET | Return tasks with modes 3, 4 | ✅ Old clients can read |

### New Endpoints

❌ **None** - All functionality through existing task endpoints

### Contract Guarantees

1. ✅ `repeat_mode` values 0-4 are valid
2. ✅ Existing modes (0-2) behavior unchanged
3. ✅ Old API clients can read tasks with new modes
4. ⚠️ Old API clients cannot create tasks with new modes (validation rejects)
5. ✅ Partial updates preserve `repeat_mode` if not explicitly changed
6. ✅ Validation errors return 400 with descriptive message
