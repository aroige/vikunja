# Phase 1: Data Model

**Feature**: MCP Server Capability Enhancement  
**Date**: 2025-10-26  
**Status**: Complete

## Overview

This document defines the TypeScript interfaces and Zod schemas for all new MCP tools, plus enhancements to existing tool schemas.

## Core Entities

### Task Relation

**Purpose**: Represents semantic connection between two tasks

```typescript
type RelationKind = 
  | 'subtask' 
  | 'parenttask'
  | 'related'
  | 'duplicateof' 
  | 'duplicates'
  | 'blocking' 
  | 'blocked'
  | 'precedes' 
  | 'follows'
  | 'copiedfrom' 
  | 'copiedto';

interface TaskRelation {
  task_id: number;
  other_task_id: number;
  relation_kind: RelationKind;
  created_by: User;
  created_at: string; // ISO 8601
}

interface RelationsGrouped {
  subtasks?: TaskRelation[];
  parenttasks?: TaskRelation[];
  related?: TaskRelation[];
  duplicates?: TaskRelation[];
  duplicateof?: TaskRelation[];
  blocking?: TaskRelation[];
  blocked?: TaskRelation[];
  precedes?: TaskRelation[];
  follows?: TaskRelation[];
  copiedfrom?: TaskRelation[];
  copiedto?: TaskRelation[];
}
```

**Validation Rules**:
- Both `task_id` and `other_task_id` must exist
- User must have write permission on both tasks
- `relation_kind` must be valid enum value
- Hierarchical relations (subtask/parenttask) cannot create cycles

**State Transitions**: N/A (immutable once created, can only be deleted)

---

### Task Comment

**Purpose**: User-generated note attached to task for collaboration

```typescript
interface TaskComment {
  id: number;
  task_id: number;
  comment: string;
  author: User;
  created: string;  // ISO 8601
  updated: string;  // ISO 8601
}

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}
```

**Validation Rules**:
- `task_id` must exist
- User must have read permission on task to view comments
- User must have write permission on task to add comments
- User can only update/delete their own comments (unless task admin)
- `comment` text required (non-empty)

**State Transitions**:
```
[Created] → [Updated]* → [Deleted]
```

---

### Label

**Purpose**: Project-independent tag for categorizing tasks

```typescript
interface Label {
  id: number;
  title: string;
  description?: string;
  hex_color: string;  // 6-character hex without # prefix
  created_by: User;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

**Validation Rules**:
- `title` required, non-empty
- `hex_color` must match pattern: `^[0-9a-fA-F]{6}$`
- User sees labels on accessible tasks + labels they created
- Labels are project-independent (global scope)

**State Transitions**:
```
[Created] → [Updated]* → [Deleted]
                      ↓
                [Attached to Task]*
```

---

### Task Attachment (Metadata)

**Purpose**: File metadata linked to task (actual file storage handled by Vikunja API)

```typescript
interface TaskAttachment {
  id: number;
  task_id: number;
  file_id: number;
  filename: string;
  size: number;        // bytes
  mime_type: string;
  created_by: User;
  created_at: string;  // ISO 8601
}
```

**Validation Rules**:
- `task_id` must exist
- User must have read permission on task to view attachments
- File upload/download out of scope for MCP server (metadata only)

**State Transitions**: Read-only from MCP perspective (CRUD handled by Vikunja web UI)

---

### Pagination

**Purpose**: Optional pagination for large result sets

```typescript
interface PaginationParams {
  page?: number;        // Default: 1, minimum: 1
  page_size?: number;   // Default: 50, minimum: 1, maximum: 100
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
}
```

**Validation Rules**:
- `page` must be positive integer
- `page_size` must be between 1 and 100 inclusive
- If pagination params omitted, use defaults (page=1, page_size=50)

---

## Tool Schemas (Zod)

### Task Relations Tools

#### create_task_relation

```typescript
const CreateTaskRelationSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the first task in the relationship"),
  other_task_id: z.number().int().positive()
    .describe("ID of the second task in the relationship"),
  relation_kind: z.enum([
    'subtask', 'parenttask', 'related', 
    'duplicateof', 'duplicates', 
    'blocking', 'blocked', 
    'precedes', 'follows', 
    'copiedfrom', 'copiedto'
  ]).describe("Type of relationship. subtask/parenttask = hierarchical (prevents cycles), related = loose association, blocking/blocked = dependency, duplicates/duplicateof = same work, precedes/follows = sequence, copiedfrom/copiedto = cloned task tracking")
});
```

#### get_task_relations

```typescript
const GetTaskRelationsSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task to retrieve relations for")
});
```

#### delete_task_relation

```typescript
const DeleteTaskRelationSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the first task in the relationship"),
  other_task_id: z.number().int().positive()
    .describe("ID of the second task in the relationship"),
  relation_kind: z.enum([
    'subtask', 'parenttask', 'related', 
    'duplicateof', 'duplicates', 
    'blocking', 'blocked', 
    'precedes', 'follows', 
    'copiedfrom', 'copiedto'
  ]).describe("Type of relationship to delete")
});
```

---

### Task Comments Tools

#### add_task_comment

```typescript
const AddTaskCommentSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task to add comment to"),
  comment: z.string().min(1)
    .describe("Comment text content")
});
```

#### get_task_comments

```typescript
const GetTaskCommentsSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task to retrieve comments for"),
  page: z.number().int().positive().optional()
    .describe("Page number for pagination (default: 1)"),
  page_size: z.number().int().min(1).max(100).optional()
    .describe("Number of comments per page (default: 50, max: 100)")
});
```

#### update_task_comment

```typescript
const UpdateTaskCommentSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task containing the comment"),
  comment_id: z.number().int().positive()
    .describe("ID of the comment to update"),
  comment: z.string().min(1)
    .describe("New comment text content")
});
```

#### delete_task_comment

```typescript
const DeleteTaskCommentSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task containing the comment"),
  comment_id: z.number().int().positive()
    .describe("ID of the comment to delete")
});
```

---

### Label Management Tools

#### get_all_labels

```typescript
const GetAllLabelsSchema = z.object({
  page: z.number().int().positive().optional()
    .describe("Page number for pagination (default: 1)"),
  page_size: z.number().int().min(1).max(100).optional()
    .describe("Number of labels per page (default: 50, max: 100)"),
  search: z.string().optional()
    .describe("Search filter for label title (optional)")
});
```

#### get_label

```typescript
const GetLabelSchema = z.object({
  label_id: z.number().int().positive()
    .describe("ID of the label to retrieve")
});
```

#### update_label

```typescript
const UpdateLabelSchema = z.object({
  label_id: z.number().int().positive()
    .describe("ID of the label to update"),
  title: z.string().min(1).optional()
    .describe("New label title (optional)"),
  description: z.string().optional()
    .describe("New label description (optional)"),
  hex_color: z.string().regex(/^[0-9a-fA-F]{6}$/).optional()
    .describe("New label color as 6-character hex without # prefix (e.g., 'FF5733')")
});
```

#### delete_label

```typescript
const DeleteLabelSchema = z.object({
  label_id: z.number().int().positive()
    .describe("ID of the label to delete")
});
```

#### get_task_labels

```typescript
const GetTaskLabelsSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task to retrieve labels for")
});
```

---

### Task Attachments Tools

#### get_task_attachments

```typescript
const GetTaskAttachmentsSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task to retrieve attachment metadata for")
});
```

---

### Enhanced Existing Tools

#### search_tasks (document label filtering)

```typescript
const SearchTasksSchema = z.object({
  // ... existing parameters ...
  filter_labels: z.array(z.number().int().positive()).optional()
    .describe("Array of label IDs to filter by. Tasks must have ALL specified labels (AND logic). Example: [1, 2] returns only tasks with both label 1 AND label 2")
});
```

---

## Response Types

### Success Responses

```typescript
// create_task_relation, delete_task_relation
interface RelationOperationResponse {
  success: boolean;
  task_id: number;
  other_task_id: number;
  relation_kind: RelationKind;
  message: string;
}

// get_task_relations
interface GetRelationsResponse {
  task_id: number;
  relations: RelationsGrouped;
  total_count: number;
}

// add_task_comment
interface AddCommentResponse {
  success: boolean;
  comment: TaskComment;
  message: string;
}

// get_task_comments
interface GetCommentsResponse {
  task_id: number;
  comments: TaskComment[];
  total: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
}

// get_all_labels
interface GetLabelsResponse {
  labels: Label[];
  total: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
}

// get_task_attachments
interface GetAttachmentsResponse {
  task_id: number;
  attachments: TaskAttachment[];
  total_count: number;
}
```

### Error Responses

```typescript
interface ErrorResponse {
  error: string;           // Error type (e.g., "PermissionDenied", "ValidationError")
  message: string;         // Human-readable error with context
  details?: {              // Optional additional context
    task_id?: number;
    project_name?: string;
    relation_kind?: string;
    [key: string]: any;
  };
}

// Examples:
{
  error: "PermissionDenied",
  message: "Permission denied: cannot modify task in project 'Team Planning'",
  details: { task_id: 123, project_name: "Team Planning" }
}

{
  error: "ValidationError",
  message: "Invalid relation_kind 'blocks' - must be one of: subtask, parenttask, related, duplicateof, duplicates, blocking, blocked, precedes, follows, copiedfrom, copiedto",
  details: { relation_kind: "blocks" }
}

{
  error: "CyclicRelationError",
  message: "Cannot create cyclic relation: task 5 is already a parent of task 3 in the hierarchy",
  details: { task_id: 3, other_task_id: 5, relation_kind: "subtask" }
}
```

---

## Validation Summary

| Entity | Key Validations |
|--------|----------------|
| TaskRelation | Both tasks exist, write permission, valid kind, no cycles (hierarchical) |
| TaskComment | Task exists, read to view / write to add, user owns to modify |
| Label | Title non-empty, hex_color format, visibility rules enforced |
| Attachment | Task exists, read permission (metadata only) |
| Pagination | page ≥ 1, 1 ≤ page_size ≤ 100 |

---

## Relationships

```
Task (1) ----< (N) TaskRelation (N) >---- (1) Task
Task (1) ----< (N) TaskComment
Task (N) ----< (N) Label  [many-to-many via task_labels join table]
Task (1) ----< (N) TaskAttachment
User (1) ----< (N) TaskComment [author]
User (1) ----< (N) Label [created_by]
User (1) ----< (N) TaskAttachment [created_by]
```

---

## Migration Notes

**No database migrations required** - all entities already exist in Vikunja backend. MCP server only adds new tools to access existing data via Vikunja API.

**TypeScript interfaces** in `mcp-server/src/vikunja/types.ts` will be extended with these new types.

---

## Next Steps

Phase 1 continues with:
1. Generate API contracts (Zod schemas as TypeScript files in `contracts/`)
2. Create quickstart.md for developer onboarding
3. Update agent context with new technologies
