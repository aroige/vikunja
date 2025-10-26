# Vikunja MCP Server - Available Tools

**Auto-generated**: 2025-10-26T14:41:55.782Z  
**Total Tools**: 35

This document provides a comprehensive reference of all tools available in the Vikunja MCP server. Tools are organized by category for easy navigation.

## Table of Contents

- [Project Management](#project-management) (6 tools)
- [Task Management](#task-management) (7 tools)
- [Task Relations](#task-relations) (3 tools)
- [Comments](#comments) (4 tools)
- [Labels](#labels) (9 tools)
- [Attachments](#attachments) (1 tools)
- [Search & Filtering](#search--filtering) (4 tools)
- [Assignments](#assignments) (2 tools)
- [Bulk Operations](#bulk-operations) (4 tools)

---

## Project Management

### `create_project`

Create a new project (workspace/list) in Vikunja. Use this when starting a new area of work or organizing tasks. In Vikunja, "Project" is the term for what other tools call "workspace" or "list". Returns the created project with its ID.

**Parameters:**

- `title` (string, **required**): Project name (required, 1-250 characters). In Vikunja, "Project" is equivalent to what other tools call "workspace" or "list".
  - Min length: 1
  - Max length: 250
- `description` (string, *optional*): Project description (optional, supports Markdown). Use this to explain the project's purpose or goals.
- `hex_color` (string, *optional*): Project color as hex code including # (optional, e.g., "#FF5733"). Format: 6-character hex code with # prefix. Used for visual identification in the UI.
  - Pattern: `^#[0-9a-fA-F]{6}$`
- `parent_project_id` (integer, *optional*): ID of parent project for nested organization (optional). Creates a sub-project hierarchy.
  - Minimum: 0

---

### `update_project`

Update an existing project's properties (title, description, color, parent). Use this to rename projects, change organization, or update visual settings. Returns the updated project details.

**Parameters:**

- `id` (integer, **required**): ID of the project to update.
  - Minimum: 0
- `title` (string, *optional*): New project name (optional, 1-250 characters).
  - Min length: 1
  - Max length: 250
- `description` (string, *optional*): New project description (optional, supports Markdown).
- `hex_color` (string, *optional*): New project color as hex code including # (optional, e.g., "#FF5733"). Format: 6-character hex code with # prefix.
  - Pattern: `^#[0-9a-fA-F]{6}$`
- `is_archived` (boolean, *optional*): Archive status (optional). Set true to archive, false to unarchive. Consider using archive_project tool instead.
- `parent_project_id` (integer, *optional*): New parent project ID for reorganization (optional). Set to change project hierarchy.
  - Minimum: 0

---

### `delete_project`

Permanently delete a project and all its tasks. Use this when you need to completely remove a project and cannot recover it later. This action cannot be undone. Use archive_project instead if you want to hide the project while preserving data. Requires admin permission on the project.

**Parameters:**

- `id` (integer, **required**): ID of the project to permanently delete. All tasks in the project will also be deleted.
  - Minimum: 0

---

### `archive_project`

Archive or unarchive a project to hide/show it without deleting. Use this when a project is complete or temporarily inactive. Archived projects don't show in default lists but can be restored. Returns the updated project.

**Parameters:**

- `id` (integer, **required**): ID of the project to archive or unarchive.
  - Minimum: 0
- `archived` (boolean, **required**): Archive status (required). Set true to archive (hide), false to unarchive (restore).

---

### `search_projects`

Search for projects by query string. Use this to find projects by name or description. Supports filtering by archived status and pagination. Returns matching projects.

**Parameters:**

- `query` (string, **required**): Search query string (required). Searches project titles and descriptions.
  - Min length: 1
- `page` (string, *optional*): Page number for pagination (optional, default: 1). Each page returns up to 50 projects.
- `filter_archived` (boolean, *optional*): Filter by archive status (optional). Set true for archived only, false for active only, omit for all.

---

### `get_project_tasks`

Get all tasks in a specific project. Use this for project-specific queries and views. Supports pagination and filtering by done status and priority. Returns tasks in the specified project, useful for "what needs to be done in project X?" queries.

**Parameters:**

- `project_id` (integer, **required**): ID of the project to get tasks from (required).
  - Minimum: 0
- `page` (string, *optional*): Page number for pagination (optional, default: 1). Each page returns up to 50 tasks.
- `filter_done` (boolean, *optional*): Filter by completion status (optional). Set true for completed tasks only, false for incomplete only, omit for all.
- `filter_priority` (integer, *optional*): Filter by priority level (optional, 0-5). Only tasks with this exact priority are returned.
  - Minimum: 0
  - Maximum: 5

---

## Task Management

### `create_task`

Create a new task in a project. Use this for single task creation (for multiple tasks, use bulk_create_tasks for better performance). Supports recurring tasks via repeat_after (seconds) and repeat_mode (0=from due date, 1=monthly same date, 2=from completion). Examples: Weekly meeting (repeat_after=604800, repeat_mode=0), Monthly report on 1st (repeat_after=0, repeat_mode=1), Water plants every 3 days after completion (repeat_after=259200, repeat_mode=2). Returns the created task with its ID.

**Parameters:**

- `project_id` (integer, **required**): ID of the project (workspace/list) where the task will be created. Get project IDs using get_projects or search_projects.
  - Minimum: 0
- `title` (string, **required**): Task title/name (required, 1-500 characters). This is the main task description shown in lists.
  - Min length: 1
  - Max length: 500
- `description` (string, *optional*): Detailed task description (optional, supports Markdown formatting). Use this for longer explanations, requirements, or context.
- `due_date` (string, *optional*): Task due date in ISO 8601 format (optional). Example: "2024-12-31T23:59:59Z" or "2024-12-31" for date only.
- `priority` (integer, *optional*): Task priority level (optional, 0-5 where 0=none, 1=low, 2=medium, 3=high, 4=urgent, 5=critical). Default: 0.
  - Minimum: 0
  - Maximum: 5
- `labels` (array, *optional*): Array of label IDs to attach to the task (optional). Create labels first with create_label, then attach them here.
- `assignees` (array, *optional*): Array of user IDs to assign to the task (optional). Get user IDs from project members or team listings.
- `repeat_after` (integer, *optional*): Recurring task interval in SECONDS (optional). Common intervals: 3600=hourly, 86400=daily, 604800=weekly, 1209600=bi-weekly, 2592000=30-day month. IMPORTANT: Set to 0 when using repeat_mode=1 (monthly) - the mode handles the calendar month logic. Cannot be negative.
  - Minimum: 0
- `repeat_mode` (integer, *optional*): Recurring task repeat mode (optional, 0-2). RepeatMode enum: 0=DEFAULT (repeat from due date, best for scheduled tasks like meetings), 1=MONTHLY (repeat on same calendar date each month, use repeat_after=0, best for bills/reports on specific dates), 2=FROM_CURRENT (repeat from completion date, best for flexible tasks like "water plants every 3 days"). Default behavior (if omitted): non-recurring task.
  - Minimum: 0
  - Maximum: 2

---

### `update_task`

Update an existing task's properties. Use this to modify any task field (title, description, priority, due date, etc.). For completing only, consider complete_task. For moving projects, consider move_task. Supports updating recurrence settings: change repeat_after interval or repeat_mode behavior. Changing repeat_mode affects how the next occurrence is calculated. Returns the updated task.

**Parameters:**

- `id` (integer, **required**): ID of the task to update. Get task IDs from search_tasks, get_my_tasks, or get_project_tasks.
  - Minimum: 0
- `title` (string, *optional*): New task title (optional, 1-500 characters). Only provide if changing the title.
  - Min length: 1
  - Max length: 500
- `description` (string, *optional*): New task description (optional, supports Markdown). Only provide if changing the description.
- `done` (boolean, *optional*): Mark task as done/undone (optional). Set true to complete, false to reopen. For completing only, consider using complete_task tool instead.
- `due_date` (string, *optional*): New due date in ISO 8601 format (optional). Set to null to clear existing due date. Example: "2024-12-31T23:59:59Z".
- `priority` (integer, *optional*): New priority level (optional, 0-5 where 0=none, 1=low, 2=medium, 3=high, 4=urgent, 5=critical).
  - Minimum: 0
  - Maximum: 5
- `labels` (array, *optional*): New array of label IDs (optional). REPLACES existing labels. To add/remove single labels, use add_label or remove_label tools.
- `assignees` (array, *optional*): New array of user IDs (optional). REPLACES existing assignees. To add/remove single assignees, use assign_task or unassign_task tools.
- `repeat_after` (integer, *optional*): Update recurring interval in SECONDS (optional). Common: 3600=hourly, 86400=daily, 604800=weekly. Set to 0 for monthly mode (repeat_mode=1). To remove recurrence, set both repeat_after and repeat_mode to appropriate values or use API to clear. Cannot be negative.
  - Minimum: 0
- `repeat_mode` (integer, *optional*): Update repeat mode (optional, 0-2). 0=repeat from due date (scheduled tasks), 1=monthly on same calendar date (must use repeat_after=0), 2=repeat from completion (flexible tasks). Changing mode affects next recurrence calculation. See create_task description for detailed examples.
  - Minimum: 0
  - Maximum: 2

---

### `complete_task`

Mark a task as complete/done. Use this instead of update_task when you only want to complete a task without other changes. For recurring tasks, this creates the next occurrence automatically. Returns the updated task.

**Parameters:**

- `id` (integer, **required**): ID of the task to mark as complete. Use this instead of update_task when you only want to complete a task without other changes.
  - Minimum: 0

---

### `delete_task`

Permanently delete a task. This action cannot be undone. The task is removed from all projects, relations, and user assignments. Requires write permission on the parent project. Returns success confirmation.

**Parameters:**

- `id` (integer, **required**): ID of the task to permanently delete. This action cannot be undone. Requires write permission on the parent project.
  - Minimum: 0

---

### `move_task`

Move a task to a different project. Use this to reorganize tasks across projects. The task keeps its properties (title, description, labels, etc.) but changes its parent project. Requires write permission on both projects. Returns the updated task.

**Parameters:**

- `id` (integer, **required**): ID of the task to move to a different project.
  - Minimum: 0
- `project_id` (integer, **required**): ID of the destination project. The task will be moved from its current project to this one. Requires write permission on both projects.
  - Minimum: 0

---

### `assign_task`

Assign a user to a task for collaboration. Use this to delegate work or indicate responsibility. The user must have access to the parent project. Users receive notifications of assignment. Returns success confirmation.

**Parameters:**

- `task_id` (integer, **required**): ID of the task to assign a user to.
  - Minimum: 0
- `user_id` (integer, **required**): ID of the user to assign. The user must have access to the parent project.
  - Minimum: 0

---

### `unassign_task`

Remove a user assignment from a task. Use this when work is reassigned or no longer needed. Returns success confirmation.

**Parameters:**

- `task_id` (integer, **required**): ID of the task to remove user assignment from.
  - Minimum: 0
- `user_id` (integer, **required**): ID of the user to unassign.
  - Minimum: 0

---

## Task Relations

### `create_task_relation`

Create a relationship between two tasks (subtask, blocker, related, etc.). Bidirectional relations created automatically. Hierarchical relations (subtask/parenttask) prevent cycles. Use this for task dependencies, hierarchies, or associations.

---

### `get_task_relations`

Retrieve all relationships for a task, grouped by relation type (subtasks, parenttasks, blocking, etc.). Returns total count and metadata. Use this to understand task context, dependencies, and hierarchy.

**Parameters:**

- `task_id` (integer, **required**): ID of the task to retrieve relations for. Returns all relations grouped by type (subtasks, parenttasks, blocking, etc.).
  - Minimum: 0

---

### `delete_task_relation`

Remove a relationship between two tasks. Bidirectional inverse relation also removed automatically. Must specify exact relation_kind. Use this to remove dependencies, unlink tasks, or clean up incorrect relations.

**Parameters:**

- `task_id` (integer, **required**): ID of the first task in the relationship to delete.
  - Minimum: 0
- `other_task_id` (integer, **required**): ID of the second task in the relationship to delete.
  - Minimum: 0
- `relation_kind` (string, **required**): Type of relationship to delete. Must match the exact relation kind that was created. Deleting relation A→B automatically deletes inverse relation B→A. 

**Valid relation types:**
- subtask/parenttask (hierarchical)
- related (association)
- duplicateof/duplicates (duplication)
- blocking/blocked (dependency)
- precedes/follows (sequence)
- copiedfrom/copiedto (clone tracking)

Example: To delete "Task 1 is subtask of Task 2", specify task_id=1, other_task_id=2, relation_kind="subtask". The inverse relation (Task 2 is parenttask of Task 1) is automatically deleted.

---

## Comments

### `add_task_comment`

Add a text comment to a task for team collaboration. Use this for progress notes, questions, decisions, or AI agent annotations. Comment author set from authentication token. Returns created comment with id and timestamp.

**Parameters:**

- `task_id` (integer, **required**): ID of the task to add comment to. You must have read access to the task to add comments.
  - Minimum: 0
- `comment` (string, **required**): Comment text content (required, non-empty). Supports plain text. The comment author is determined by your authentication token.
  - Min length: 1

---

### `get_task_comments`

Retrieve all comments for a task with pagination (default: page_size=50, max=100). Comments in chronological order with author info. Use this to understand task history and team discussion before taking action.

**Parameters:**

- `task_id` (integer, **required**): ID of the task to retrieve comments for. Returns comments in chronological order with author information.
  - Minimum: 0
- `page` (string, *optional*): Page number for pagination (default: 1, minimum: 1). Use this for tasks with many comments.
- `page_size` (string, *optional*): Number of comments per page (default: 50, minimum: 1, maximum: 100). Adjust based on expected comment count.

---

### `update_task_comment`

Modify an existing comment text. Use this to correct typos or add information. You can only update YOUR OWN comments unless admin. Returns updated comment with new timestamp.

**Parameters:**

- `task_id` (integer, **required**): ID of the task containing the comment.
  - Minimum: 0
- `comment_id` (integer, **required**): ID of the comment to update. You can only update your own comments unless you have admin permissions.
  - Minimum: 0
- `comment` (string, **required**): New comment text content (required, non-empty). Completely replaces the existing comment text.
  - Min length: 1

---

### `delete_task_comment`

Permanently remove a comment from a task. Use for outdated info or cleanup. You can only delete YOUR OWN comments unless admin. Cannot be undone. Returns success confirmation.

**Parameters:**

- `task_id` (integer, **required**): ID of the task containing the comment.
  - Minimum: 0
- `comment_id` (integer, **required**): ID of the comment to delete. You can only delete your own comments unless you have admin permissions.
  - Minimum: 0

---

## Labels

### `add_label`

Add a label to a task for categorization and filtering. Use this to tag tasks with topics, priorities, or custom categories. The label must already exist (create with create_label first). Returns success confirmation.

**Parameters:**

- `task_id` (integer, **required**): ID of the task to add a label to.
  - Minimum: 0
- `label_id` (integer, **required**): ID of the label to attach. The label must already exist (create with create_label first).
  - Minimum: 0

---

### `remove_label`

Remove a label from a task. Use this to uncategorize or change task organization. The label itself is not deleted, only the association. Returns success confirmation.

**Parameters:**

- `task_id` (integer, **required**): ID of the task to remove a label from.
  - Minimum: 0
- `label_id` (integer, **required**): ID of the label to detach. The label itself is not deleted, only the task association.
  - Minimum: 0

---

### `create_label`

Create a new label for task categorization. Labels are project-independent and can be used across all tasks you can access. Specify hex_color as 6-character hex code without # (e.g., "FF5733" for orange-red). Returns the created label with its ID.

**Parameters:**

- `title` (string, **required**): Label name (required, 1-250 characters). Labels are used for categorizing and filtering tasks across all projects.
  - Min length: 1
  - Max length: 250
- `description` (string, *optional*): Label description (optional). Use this to explain the label's purpose or usage guidelines.
- `hex_color` (string, *optional*): Label color as hex code including # (optional, e.g., "#FF5733"). Used for visual identification. Format: 6-character hex code with # prefix.
  - Pattern: `^#[0-9a-fA-F]{6}$`

---

### `bulk_add_labels`

Add a label to multiple tasks at once (max 100 tasks). Use this for batch categorization. Example: Tag all Q4 tasks with "urgent" label. More efficient than calling add_label multiple times. Returns success confirmation with count.

**Parameters:**

- `task_ids` (array, **required**): Array of task IDs to add a label to (required, 1-100 tasks). Example: Tag all Q4 tasks with "urgent" label.
- `label_id` (integer, **required**): ID of the label to add to all specified tasks (required). The label must already exist.
  - Minimum: 0

---

### `get_all_labels`

List all labels visible to you with optional search and pagination (default: page_size=50, max=100). Labels are project-independent tags for categorizing tasks. Visibility: labels on accessible tasks + labels you created. Use this to discover available labels or search by title.

**Parameters:**

- `page` (string, *optional*): Page number for pagination (default: 1, minimum: 1). Each page returns up to 50 labels by default.
- `page_size` (string, *optional*): Number of labels per page (default: 50, minimum: 1, maximum: 100). Adjust based on expected label count.
- `search` (string, *optional*): Search filter for label title (optional, case-insensitive partial match). Example: "urgent" matches "Urgent", "Very Urgent", etc.

---

### `get_label`

Retrieve full details of a specific label by ID. Use this to check label properties (title, description, hex_color, creator) before using. Returns label object with metadata.

**Parameters:**

- `label_id` (integer, **required**): ID of the label to retrieve. Returns full label details including title, description, color, and creator.
  - Minimum: 0

---

### `update_label`

Modify label properties (title, description, hex_color). You can ONLY update labels YOU created. Hex color must be 6 characters WITHOUT # prefix (e.g., "FF5733", "3498DB"). Changes affect all tasks using this label. Returns updated label.

---

### `delete_label`

Permanently delete a label and remove from ALL tasks. You can ONLY delete labels YOU created. Deletion is permanent and cannot be undone. Use remove_label to detach from ONE task only. Returns success confirmation.

**Parameters:**

- `label_id` (integer, **required**): ID of the label to delete. You can only delete labels you created. Deletion removes label from ALL tasks.
  - Minimum: 0

---

### `get_task_labels`

Retrieve all labels currently attached to a specific task. Use this to understand task categorization and metadata. Returns array of label objects with full details (title, color, creator).

**Parameters:**

- `task_id` (integer, **required**): ID of the task to retrieve labels for. Returns all labels currently attached to the task.
  - Minimum: 0

---

## Attachments

### `get_task_attachments`

Retrieve metadata for all files attached to a task (filename, size, MIME type, upload info). Returns attachment details WITHOUT downloading file content. Use this to understand what files are associated with a task for context awareness. Does NOT support file upload/download operations.

**Parameters:**

- `task_id` (integer, **required**): ID of the task to retrieve attachment metadata for. Returns file information without downloading file content.
  - Minimum: 0

---

## Search & Filtering

### `search_tasks`

Search for tasks by query string with advanced filtering. Use this when you need flexible text search with filters. For all user's tasks, use get_my_tasks. For project-specific tasks, use get_project_tasks. Supports pagination and filtering by done status, priority, labels (AND logic), and assignees. Returns matching tasks.

**Parameters:**

- `query` (string, **required**): Search query string (required). Searches task titles and descriptions. Use this for flexible text-based search.
  - Min length: 1
- `page` (string, *optional*): Page number for pagination (optional, default: 1). Each page returns up to 50 tasks.
- `filter_done` (boolean, *optional*): Filter by completion status (optional). Set true for completed tasks only, false for incomplete only, omit for all.
- `filter_priority` (integer, *optional*): Filter by priority level (optional, 0-5). Only tasks with this exact priority are returned.
  - Minimum: 0
  - Maximum: 5
- `filter_labels` (array, *optional*): Filter by label IDs (optional). Uses AND logic: tasks must have ALL specified labels. Example: [1, 2] returns tasks with both label 1 AND label 2.
- `filter_assignees` (array, *optional*): Filter by assignee user IDs (optional). Returns tasks assigned to any of the specified users.

---

### `search_projects`

Search for projects by query string. Use this to find projects by name or description. Supports filtering by archived status and pagination. Returns matching projects.

**Parameters:**

- `query` (string, **required**): Search query string (required). Searches project titles and descriptions.
  - Min length: 1
- `page` (string, *optional*): Page number for pagination (optional, default: 1). Each page returns up to 50 projects.
- `filter_archived` (boolean, *optional*): Filter by archive status (optional). Set true for archived only, false for active only, omit for all.

---

### `get_my_tasks`

Get all tasks assigned to the current user across all projects. Use this for personal task list views. Supports pagination and filtering by done status and priority. Returns tasks sorted by due date. This is the primary tool for "what are my tasks?" queries.

**Parameters:**

- `page` (string, *optional*): Page number for pagination (optional, default: 1). Each page returns up to 50 tasks.
- `filter_done` (boolean, *optional*): Filter by completion status (optional). Set true for completed tasks only, false for incomplete only, omit for all.
- `filter_priority` (integer, *optional*): Filter by priority level (optional, 0-5). Only tasks with this exact priority are returned.
  - Minimum: 0
  - Maximum: 5

---

### `get_project_tasks`

Get all tasks in a specific project. Use this for project-specific queries and views. Supports pagination and filtering by done status and priority. Returns tasks in the specified project, useful for "what needs to be done in project X?" queries.

**Parameters:**

- `project_id` (integer, **required**): ID of the project to get tasks from (required).
  - Minimum: 0
- `page` (string, *optional*): Page number for pagination (optional, default: 1). Each page returns up to 50 tasks.
- `filter_done` (boolean, *optional*): Filter by completion status (optional). Set true for completed tasks only, false for incomplete only, omit for all.
- `filter_priority` (integer, *optional*): Filter by priority level (optional, 0-5). Only tasks with this exact priority are returned.
  - Minimum: 0
  - Maximum: 5

---

## Assignments

### `assign_task`

Assign a user to a task for collaboration. Use this to delegate work or indicate responsibility. The user must have access to the parent project. Users receive notifications of assignment. Returns success confirmation.

**Parameters:**

- `task_id` (integer, **required**): ID of the task to assign a user to.
  - Minimum: 0
- `user_id` (integer, **required**): ID of the user to assign. The user must have access to the parent project.
  - Minimum: 0

---

### `unassign_task`

Remove a user assignment from a task. Use this when work is reassigned or no longer needed. Returns success confirmation.

**Parameters:**

- `task_id` (integer, **required**): ID of the task to remove user assignment from.
  - Minimum: 0
- `user_id` (integer, **required**): ID of the user to unassign.
  - Minimum: 0

---

## Bulk Operations

### `bulk_update_tasks`

Update multiple tasks at once with the same changes (max 100 tasks). Use this instead of individual update_task calls for better performance when applying identical changes to many tasks. Example: Mark 20 tasks as high priority. Returns array of updated tasks.

**Parameters:**

- `task_ids` (array, **required**): Array of task IDs to update (required, 1-100 tasks). All tasks will receive the same updates specified in update_data.
- `update_data` (object, **required**): Update data to apply to all specified tasks. Only include fields you want to change.

---

### `bulk_complete_tasks`

Mark multiple tasks as complete at once (max 100 tasks). Use this for batch completion operations. More efficient than calling complete_task multiple times. Returns array of completed tasks.

**Parameters:**

- `task_ids` (array, **required**): Array of task IDs to mark as complete (required, 1-100 tasks). More efficient than individual complete_task calls.

---

### `bulk_assign_tasks`

Assign a user to multiple tasks at once (max 100 tasks). Use this for batch delegation. More efficient than calling assign_task multiple times. Returns success confirmation with count.

**Parameters:**

- `task_ids` (array, **required**): Array of task IDs to assign to a user (required, 1-100 tasks).
- `user_id` (integer, **required**): ID of the user to assign to all specified tasks (required).
  - Minimum: 0

---

### `bulk_add_labels`

Add a label to multiple tasks at once (max 100 tasks). Use this for batch categorization. Example: Tag all Q4 tasks with "urgent" label. More efficient than calling add_label multiple times. Returns success confirmation with count.

**Parameters:**

- `task_ids` (array, **required**): Array of task IDs to add a label to (required, 1-100 tasks). Example: Tag all Q4 tasks with "urgent" label.
- `label_id` (integer, **required**): ID of the label to add to all specified tasks (required). The label must already exist.
  - Minimum: 0

---

## Usage Notes

### Authentication

All tools require authentication via Vikunja API token. The token is passed through the MCP authentication header and used for all Vikunja API calls.

### Pagination

Tools that return lists support pagination with the following parameters:
- `page`: Page number (default: 1, min: 1)
- `page_size`: Items per page (default: 50, max: 100)

Paginated responses include:
- `items`: Array of results
- `total`: Total count across all pages
- `page`: Current page number
- `page_size`: Items per page
- `has_more`: Boolean indicating if more pages exist

### Bulk Operations

Bulk tools accept arrays of IDs with a maximum of 100 items per operation. For larger datasets, split into multiple calls.

### Error Handling

All tools return structured errors with:
- `error`: Error message
- `code`: HTTP status code
- `resource`: Resource type (e.g., "Task", "Project", "Label")
- `details`: Additional context when available

### Rate Limiting

The MCP server implements rate limiting to prevent abuse:
- HTTP transport: 100 requests per minute per user
- stdio transport: No rate limiting (trusted local client)

### Recurring Tasks

Tasks support three recurring modes via `repeat_mode`:
- `0` (Default): Next occurrence calculated from due date
- `1` (Monthly): Same date each month (e.g., 1st of month)
- `2` (From Completion): Next occurrence calculated from completion date

Set `repeat_after` in seconds (e.g., 604800 for weekly, 86400 for daily).

### Task Relations

Task relations support 10 types:
- `subtask` / `parenttask`: Hierarchical relations
- `related` / `related`: Bidirectional associations
- `duplicateof` / `duplicates`: Duplicate tracking
- `blocking` / `blocked`: Dependency tracking
- `precedes` / `follows`: Sequence tracking
- `copiedfrom` / `copiedto`: Copy tracking

Relations are bidirectional - creating one automatically creates the inverse.

### Label Management

Labels are project-independent and can be used across all accessible tasks. Label visibility rules:
- See labels on tasks you can access
- See labels you created
- Can only modify/delete labels you created

Hex colors must be 6 characters without # prefix (e.g., "FF5733" for orange-red).

## Development

To regenerate this documentation:

```bash
cd mcp-server
pnpm tsx scripts/generate-tools-doc.ts
```

This will update `docs/TOOLS.md` with the latest tool definitions from the registry.

---

*This documentation is auto-generated from the tool registry. For implementation details, see `src/tools/registry.ts`.*
