# Feature Specification: MCP Server Capability Enhancement & Tool Description Improvements

**Feature Branch**: `008-mcp-server-improvements`  
**Created**: 2025-10-26  
**Status**: Draft  
**Input**: User description: "Analyze and improve the MCP server implementation to provide AI agents with comprehensive tool descriptions, complete Vikunja capability coverage, and enhanced reliability for n8n workflows"

## Clarifications

### Session 2025-10-26

- Q: What is the maximum acceptable response latency for MCP tool operations that query multiple tasks or relations (e.g., get_task_relations, get_task_comments on tasks with 100+ items)? → A: <2s for typical operations, <5s for bulk operations (100+ items) with pagination recommended

- Q: How should the system handle concurrent modifications when an agent updates a task/label/comment while another agent or user is simultaneously modifying the same resource? → A: Last-write-wins - rely on Vikunja API's default behavior without additional MCP validation

- Q: When an agent operation fails due to permissions (e.g., trying to add a relation to a task in another user's private project), what level of detail should error messages expose? → A: Permission denied with resource type (e.g., "Permission denied: cannot modify task in project X")

- Q: For operations that return large collections (get_task_comments with 100+ comments, get_all_labels with 500+ labels), should the MCP tools implement pagination? → A: Pagination optional with reasonable defaults (page_size=50, max 100) - agent can override

- Q: Should the MCP server validate Vikunja API version compatibility on startup or connection to ensure required endpoints are available? → A: Log warning if version mismatch detected but continue operation (best-effort compatibility)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Agent Discovers and Understands Available Tools (Priority: P1)

An AI agent (Claude, n8n workflow, custom automation) connects to the MCP server and needs to understand what operations are available and how to use them effectively.

**Why this priority**: This is foundational - if agents can't understand what tools do and when to use them, they can't leverage the MCP server effectively. Clear tool descriptions directly impact agent reliability and user satisfaction.

**Independent Test**: AI agent calls MCP tools/list endpoint and receives comprehensive descriptions. Agent can accurately select appropriate tool for common task management scenarios (create task, find overdue items, assign work) based solely on tool descriptions without trial-and-error.

**Acceptance Scenarios**:

1. **Given** an AI agent connects to MCP server, **When** it requests available tools, **Then** each tool includes detailed description explaining purpose, use cases, and expected outcomes
2. **Given** an agent needs to create a task with subtasks, **When** it reviews tool descriptions, **Then** it can identify which tools support task relationships and how to use them
3. **Given** an agent wants to manage recurring tasks, **When** it examines tool schemas, **Then** it understands repeat_after parameters and repeat modes without guessing
4. **Given** multiple tools could solve a problem, **When** agent reviews descriptions, **Then** it can distinguish between them (e.g., search_tasks vs get_my_tasks vs get_project_tasks)
5. **Given** an agent encounters a task relationship type, **When** it checks tool documentation, **Then** it understands all 10 relation kinds (subtask, parenttask, related, duplicates, blocking, blocked, precedes, follows, copiedfrom, copiedto)

---

### User Story 2 - AI Agent Manages Task Relationships and Dependencies (Priority: P1)

An AI agent helps users create complex task hierarchies with parent/child relationships, blockers, and dependencies.

**Why this priority**: Task relationships are a core Vikunja feature currently missing from MCP server. Users expect AI agents to handle subtasks, blocked tasks, and task dependencies - common patterns in real-world task management.

**Independent Test**: Agent creates a project with parent task and 3 subtasks, then marks one subtask as blocking another. System correctly stores bidirectional relations. Agent can query task to retrieve all its relationships.

**Acceptance Scenarios**:

1. **Given** a user asks "create a project plan with main tasks and subtasks", **When** agent processes request, **Then** it creates parent tasks and links subtasks using task relations
2. **Given** a task blocks another task, **When** agent creates the relationship, **Then** both blocking and blocked relations are stored correctly
3. **Given** a task has multiple relations, **When** agent queries the task, **Then** it receives all relations grouped by kind (subtasks, blocked by, duplicates, etc.)
4. **Given** a user wants to see all subtasks of a parent, **When** agent queries relationships, **Then** it retrieves complete subtask hierarchy
5. **Given** creating a relation would cause a cycle (A→B→C→A), **When** agent attempts creation, **Then** system rejects with clear error message
6. **Given** a user wants related tasks (not hierarchical), **When** agent creates "related" relation, **Then** both tasks show the bidirectional relationship

---

### User Story 3 - AI Agent Handles Recurring Tasks and Schedules (Priority: P2)

[Describe this user journey in plain language]
An AI agent helps users set up recurring tasks (daily standups, weekly reviews, monthly reports) with proper repeat intervals and modes.

**Why this priority**: Recurring tasks are essential for productivity workflows. Current MCP implementation exposes repeat_after but lacks clear guidance on the three repeat modes, leading to confusion and incorrect task behavior.

**Independent Test**: Agent creates recurring task that repeats every 2 weeks using default mode. Agent creates monthly bill reminder using month mode. Agent verifies both tasks have correct repeat_after seconds and appropriate repeat_mode values.

**Acceptance Scenarios**:

1. **Given** user says "remind me to review backlog every Monday", **When** agent creates task, **Then** it sets repeat_after to 604800 seconds (1 week) with mode 0 (default)
2. **Given** user wants "pay rent on the 1st of every month", **When** agent creates task, **Then** it uses repeat_mode 1 (month) to repeat on same day each month
3. **Given** user wants "follow up 3 days after completing", **When** agent creates task, **Then** it uses repeat_mode 2 (from current date) with 3-day interval
4. **Given** agent queries recurring tasks, **When** it filters by repeat_after > 0, **Then** it finds all repeating tasks regardless of mode
5. **Given** user updates recurring task pattern, **When** agent modifies repeat_after or repeat_mode, **Then** future occurrences use new schedule

---

### User Story 4 - AI Agent Manages Task Comments and Collaboration (Priority: P2)

An AI agent facilitates team communication by adding comments to tasks, updating progress notes, and retrieving conversation history.

**Why this priority**: Comments are crucial for team collaboration. AI agents should be able to annotate tasks, explain decisions, and help users catch up on task discussions without forcing manual comment management.

**Independent Test**: Agent adds comment to task explaining status update. Later, different user asks agent "what's the latest on task X?" and agent retrieves and summarizes recent comments chronologically.

**Acceptance Scenarios**:

1. **Given** agent completes a task update, **When** it adds context comment, **Then** comment appears in task with agent's user context
2. **Given** user asks about task progress, **When** agent retrieves task comments, **Then** it gets chronological list with authors and timestamps
3. **Given** multiple team members commented, **When** agent fetches comments, **Then** it can identify who said what and when
4. **Given** agent needs to update existing comment, **When** it modifies comment text, **Then** updated version replaces original with new timestamp
5. **Given** agent wants to remove outdated comment, **When** it deletes comment, **Then** comment is removed from task history

---

### User Story 5 - AI Agent Organizes Tasks with Labels (Priority: P2)

An AI agent helps users categorize and filter tasks using labels, search for tasks by category, and manage the label taxonomy.

**Why this priority**: Labels are fundamental to task organization. Users need agents to understand "find all design tasks" or "tag this as urgent", making label management essential for effective AI-powered task workflows.

**Independent Test**: Agent creates label "Urgent", attaches it to 5 tasks, then searches for all tasks with "Urgent" label. Agent can list all available labels, update label color, and filter tasks by multiple labels.

**Acceptance Scenarios**:

1. **Given** user says "show me all design tasks", **When** agent searches by label, **Then** it retrieves all tasks tagged with "design" label
2. **Given** user wants to categorize task, **When** agent adds label to task, **Then** label appears on task and task appears in label-filtered searches
3. **Given** multiple labels exist, **When** agent lists labels, **Then** it receives all labels user has access to (on their tasks + labels they created)
4. **Given** label needs color update, **When** agent updates label hex_color, **Then** all tasks with that label reflect new color
5. **Given** user wants tasks with multiple categories, **When** agent filters by multiple labels (AND logic), **Then** it returns only tasks having all specified labels
6. **Given** task has labels, **When** agent retrieves task, **Then** response includes all attached labels with full details (title, color, description)
7. **Given** label no longer needed, **When** agent deletes label, **Then** label is removed from all tasks and label list

---

### User Story 6 - AI Agent Works with Task Attachments (Priority: P3)

An AI agent helps users organize task-related files by listing attachments, understanding their purpose, and managing file associations.

**Why this priority**: While less critical than relationships and comments, attachments complete the task management picture. Agents should know what files are associated with tasks to provide complete context.

**Independent Test**: Agent queries task and discovers it has 2 attachments. Agent retrieves attachment metadata (filenames, sizes, upload dates) and reports them to user without requiring manual file system access.

**Acceptance Scenarios**:

1. **Given** task has attached files, **When** agent retrieves task details, **Then** it includes list of attachments with names and metadata
2. **Given** user asks "what files are on this task", **When** agent queries attachments, **Then** it returns complete list with file details
3. **Given** attachment has been deleted, **When** agent retrieves task, **Then** deleted attachment no longer appears in list
4. **Given** multiple tasks in project, **When** agent searches for tasks with attachments, **Then** it can filter to find only tasks with files

---

### User Story 7 - n8n Workflow Reliability with JSON Mode (Priority: P3)

An n8n automation workflow uses MCP server to manage Vikunja tasks as part of a larger business process. The workflow needs consistent, parseable responses.

**Why this priority**: n8n is a key integration platform but has limitations with custom headers. JSON response mode ensures n8n workflows work reliably without header manipulation, expanding MCP server's practical use cases.

**Independent Test**: n8n workflow with MCP_HTTP_JSON_RESPONSE=true successfully creates task, retrieves results, and parses response without errors. Same workflow fails or requires workarounds without JSON mode.

**Acceptance Scenarios**:

1. **Given** n8n workflow with MCP_HTTP_JSON_RESPONSE=true, **When** it calls any MCP tool, **Then** all responses are valid JSON parseable by n8n's JSON node
2. **Given** MCP server in stdio mode (Claude Desktop), **When** it communicates, **Then** JSON mode has no effect on stdio transport
3. **Given** error occurs during tool execution, **When** agent receives error, **Then** error format is consistent regardless of JSON mode setting
4. **Given** n8n workflow processes batch of tasks, **When** it calls bulk operations, **Then** all bulk responses maintain JSON compatibility

---

### Edge Cases

- What happens when agent requests a tool that requires parameters not in its knowledge (e.g., valid project_id)?
- How does system handle requests for task relations when tasks are in different projects with different permissions?
- What feedback does agent receive when attempting to create cyclic task relations (A subtask of B, B subtask of A)?
- How are recurring task descriptions formatted when repeat_mode = 1 (monthly) vs mode = 2 (from current date)?
- What information is included when a task has 50+ comments or 20+ attachments?
- How does system respond to malformed relation_kind values in task relationship requests?
- What happens when agent tries to add a comment to a task it doesn't have permission to access?
- How are datetime fields in task recurrence handled across different timezones?
- What happens when agent tries to add a label that doesn't exist vs creating new label?
- How does system handle label filtering when user searches for label by title but multiple labels have similar names?
- What happens when agent deletes a label that is attached to 100+ tasks?
- Can agent search for tasks with "label A AND label B" vs "label A OR label B"?
- How are label colors validated - what happens with invalid hex codes?
- Concurrent modifications: When agent updates task/label/comment while another agent modifies same resource, last-write-wins (Vikunja API default behavior applies, no MCP-layer conflict detection)

---
- What happens when agent tries to access a label attached to tasks in projects they don't have permission for?
- How does system handle label updates (color, title) - are changes reflected immediately on all tasks?

## Requirements *(mandatory)*

### Functional Requirements

#### Tool Descriptions & Discoverability

- **FR-001**: Each MCP tool MUST include a comprehensive description field explaining:
  - Primary purpose and use cases
  - When to use this tool vs alternatives
  - Key parameters and their business meaning
  - Expected outcomes and side effects

- **FR-002**: Tool descriptions MUST explain relationship between related tools (e.g., create_task vs bulk_create_tasks, search_tasks vs get_my_tasks)

- **FR-003**: Input schemas MUST include field-level descriptions for non-obvious parameters:
  - priority (0-5 scale meaning)
  - repeat_after (seconds, not minutes/hours)
  - repeat_mode (0=default, 1=monthly, 2=from current date)
  - relation_kind (all 10 types with examples)
  - hex_color (6-character hex without # prefix)

- **FR-004**: System MUST document Vikunja-specific terminology:
  - "Project" (not "list" or "workspace")
  - "Bucket" (kanban columns)
  - "Saved Filter" (smart lists)
  - Task "done" vs "completed" terminology

#### Task Relations Support

- **FR-005**: System MUST provide tool to create task relations with all supported kinds:
  - subtask, parenttask
  - related
  - duplicateof, duplicates
  - blocking, blocked
  - precedes, follows
  - copiedfrom, copiedto

- **FR-006**: System MUST automatically create inverse relation when relation is created (e.g., creating "A is subtask of B" automatically creates "B is parenttask of A")

- **FR-007**: System MUST prevent cyclic relations for hierarchical types (subtask/parenttask)

- **FR-008**: System MUST provide tool to retrieve all relations for a given task, grouped by relation kind

- **FR-009**: System MUST provide tool to delete specific relation between two tasks

- **FR-010**: Task retrieval tools MUST optionally expand related_tasks to include full task details, not just IDs

#### Label Management Support

- **FR-011**: System MUST provide tool to retrieve all labels accessible to user with optional pagination (default page_size=50, max 100 per page)

- **FR-012**: System MUST provide tool to retrieve single label by ID with full details

- **FR-013**: System MUST provide tool to update existing label (title, description, color)

- **FR-014**: System MUST provide tool to delete label

- **FR-015**: System MUST support searching/filtering labels by title text

- **FR-016**: System MUST provide tool to get all labels attached to specific task

- **FR-017**: System MUST provide tool to search/filter tasks by label ID(s)

- **FR-018**: Search tools MUST support filtering by multiple labels with AND logic (task must have all specified labels)

- **FR-019**: Label operations MUST include created_by user information in responses

- **FR-020**: Tool descriptions MUST explain label visibility rules:
  - Users see labels on tasks in projects they can access
  - Users see labels they created even if not attached to any task
  - Labels are project-independent (can be used across multiple projects)

#### Recurring Tasks Support

- **FR-021**: Tool descriptions MUST clearly explain three repeat modes:
  - Mode 0: Repeat from last due date (default)
  - Mode 1: Repeat on same day each month
  - Mode 2: Repeat from completion date

- **FR-022**: Create/update task tools MUST accept repeat_after as integer seconds

- **FR-023**: Create/update task tools MUST accept repeat_mode as integer (0, 1, or 2)

- **FR-024**: System MUST provide examples in documentation:
  - Daily: repeat_after=86400, repeat_mode=0
  - Weekly: repeat_after=604800, repeat_mode=0
  - Monthly (same date): repeat_after=0, repeat_mode=1
  - Every 3 days from completion: repeat_after=259200, repeat_mode=2

- **FR-025**: Search tools MUST support filtering by recurring status (has repeat_after > 0)

#### Task Comments Support

- **FR-026**: System MUST provide tool to add comment to task

- **FR-027**: System MUST provide tool to retrieve all comments for task, ordered chronologically with optional pagination (default page_size=50, max 100 per page)

- **FR-028**: System MUST provide tool to update existing comment

- **FR-029**: System MUST provide tool to delete comment

- **FR-030**: Comment retrieval MUST include author information and timestamps

- **FR-031**: System MUST enforce permissions - users can only modify/delete their own comments unless they have admin rights on task

#### Task Attachments Support

- **FR-032**: System MUST provide tool to retrieve attachment metadata for a task (filenames, sizes, MIME types, upload dates)

- **FR-033**: System MUST include attachment count and presence indicator in task responses

- **FR-034**: System MUST support filtering tasks by attachment presence

- **FR-035**: Tool descriptions MUST explain that file upload/download is not supported via MCP (metadata only)

#### n8n Integration Enhancements

- **FR-036**: System MUST respect MCP_HTTP_JSON_RESPONSE environment variable

- **FR-037**: When JSON mode enabled, system MUST ensure all responses are valid JSON without custom content types

- **FR-038**: System MUST document JSON mode requirement for n8n in README and integration guide

- **FR-039**: System MUST maintain stdio mode for Claude Desktop without interference from JSON mode setting

#### Error Handling & Validation

- **FR-040**: System MUST return clear error messages when:
  - Invalid relation_kind provided
  - Cyclic relation attempted
  - Task permission denied for relation/comment/label operations
  - Invalid repeat_mode value (not 0, 1, or 2)
  - Malformed repeat_after (negative or non-integer)
  - Label not found or access denied
  - Invalid hex_color format for labels

- **FR-041**: System MUST validate task relation requests for:
  - Both tasks exist
  - User has write permission on both tasks
  - Relation kind is valid
  - Would not create cycle (for hierarchical relations)

- **FR-042**: System MUST validate label operations for:
  - Label exists and user has access
  - Task exists and user has write permission
  - Color format is valid 6-character hex (if provided)

- **FR-043**: Permission-denied errors MUST include resource type and context (e.g., "Permission denied: cannot modify task in project X") without exposing sensitive details about inaccessible resources

### Non-Functional Requirements

#### Performance

- **NFR-001**: Response latency for typical MCP tool operations (single task queries, creating relations, adding comments) MUST be <2 seconds under normal load

- **NFR-002**: Response latency for bulk operations (retrieving 100+ comments, relations, or labels) MUST be <5 seconds

- **NFR-003**: Collection-returning tools (get_task_comments, get_all_labels, get_task_relations) MUST support optional pagination with default page_size=50 and maximum page_size=100

- **NFR-004**: Tool implementations SHOULD leverage existing Vikunja API caching mechanisms without adding MCP-layer caching complexity

#### Reliability

- **NFR-005**: MCP server SHOULD check Vikunja API version on startup and log warning if version mismatch detected (expected vs actual), but continue operation with best-effort compatibility

- **NFR-006**: MCP server MUST gracefully handle Vikunja API endpoint changes by returning clear error messages when endpoints return unexpected responses

### Key Entities

- **Label**: Project-independent tag that can be attached to tasks
  - Attributes: id, title, description, hex_color, created_by, created_at, updated_at
  - Visibility: User sees labels on accessible tasks + labels they created
  - Global scope: Can be used across any project user has access to
  - Created by users, not tied to specific projects

- **Task Relation**: Connection between two tasks with specific semantic meaning
  - Attributes: task_id, other_task_id, relation_kind, created_by, created_at
  - Bidirectional: Each relation stored twice (A→B and B→A with inverse kinds)
  - 10 relation types with distinct meanings

- **Task Comment**: User-generated note attached to task for collaboration
  - Attributes: id, task_id, comment_text, author, created_at, updated_at
  - Supports reactions (separate from comments)
  - Permission-controlled (view task = view comments, write task = add comments)

- **Task Attachment**: File metadata linked to task
  - Attributes: id, task_id, file_id, filename, size, mime_type, created_by, created_at
  - Actual file stored in Vikunja file system (not accessible via MCP)
  - Used for context and completeness of task information

- **Recurring Task Configuration**: Settings defining task repetition behavior
  - Attributes: repeat_after (seconds), repeat_mode (0/1/2), repeat_from_current_date (deprecated)
  - Three modes with different recurrence calculation logic
  - Interacts with due_date, start_date, end_date, and reminders

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI agents can successfully identify correct tool for 95% of common task management scenarios (create task, find tasks, assign work, manage subtasks, add notes, organize with labels) on first attempt based solely on tool descriptions

- **SC-002**: n8n workflows using MCP server complete without JSON parsing errors in 100% of test cases with MCP_HTTP_JSON_RESPONSE=true

- **SC-003**: AI agents create task hierarchies with parent/child relations accurately in >90% of attempts without user correction

- **SC-004**: Users report 80% reduction in "agent chose wrong tool" or "agent didn't know how to do X" complaints after improvements

- **SC-005**: Tool description quality scores 4+ out of 5 in clarity assessments by 10 independent developers/users

- **SC-006**: Agent can correctly configure recurring tasks (daily, weekly, monthly) with appropriate repeat_mode in >95% of attempts

- **SC-007**: Zero cyclic task relations created by agents (100% prevention rate)

- **SC-008**: Task collaboration workflows (add comment, check progress, review notes) work reliably in 100% of test scenarios

- **SC-009**: Documentation improvements reduce "how do I..." questions in support channels by 60%

- **SC-010**: Complete feature parity for task management: relations (10 types), comments (CRUD), attachments (metadata), labels (CRUD + search), recurring (3 modes) all accessible via MCP tools

- **SC-011**: Label-based task organization workflows (tag tasks, search by label, filter by multiple labels) work correctly in >95% of scenarios

- **SC-012**: Agents can discover and utilize all label management capabilities (list, get, update, delete, search) without external documentation in >90% of cases

## Assumptions

- Vikunja API endpoints for task relations (/tasks/:id/relations), comments (/tasks/:id/comments), labels (/labels, /tasks/:id/labels), and attachments (/tasks/:id/attachments) are stable and documented
- AI agents using MCP server have valid Vikunja API tokens with appropriate permissions
- n8n workflows will use HTTP transport (not stdio) due to platform architecture
- File upload/download functionality is out of scope for MCP server (Vikunja API handles actual file storage)
- Agent developers read tool descriptions in tools/list response before attempting operations
- Cyclic relation prevention is handled by Vikunja API, not MCP server validation layer
- Task relation permissions follow same rules as task permissions (write on task = manage relations)
- Label permissions follow Vikunja's visibility model (access tasks = see labels on those tasks)
- MCP SDK supports both stdio and HTTP transports simultaneously (no breaking changes needed)

## Dependencies

- Vikunja API v1 endpoints (currently in use)
- MCP SDK (@modelcontextprotocol/sdk) version compatibility with bidirectional relations
- Redis (optional) for rate limiting continues to work with expanded tool set
- Zod schema validation library for new input parameter types

## Out of Scope

- File upload/download through MCP server (Vikunja API feature, not MCP layer)
- Saved filters management (covered in separate future work)
- Webhooks configuration (separate feature)
- Kanban bucket operations (separate feature)
- Project views management (separate feature)
- Team and user management (administrative, not task-focused)
- Real-time notifications (event system integration)
- Task position/ordering within buckets (separate feature)
- Calendar/CalDAV integration (separate protocol)
- Data migration tools (separate feature)
- Label reactions (separate from label management, covered with task reactions)
- Bulk label operations beyond what already exists (bulk_add_labels)

## Technical Notes

### Tool Naming Conventions
Follow existing pattern: `verb_noun` format (create_task, add_label, search_tasks)

**New tools**: 
- Task relations: `create_task_relation`, `get_task_relations`, `delete_task_relation`
- Comments: `add_task_comment`, `get_task_comments`, `update_task_comment`, `delete_task_comment`
- Attachments: `get_task_attachments`
- Labels: `get_all_labels`, `get_label`, `update_label`, `delete_label`, `get_task_labels`, `search_tasks_by_label`

**Enhanced existing tools**:
- `create_label` - improve description
- `add_label` - improve description  
- `remove_label` - improve description
- `search_tasks` - document label filtering capability

### Relation Kind Mapping
```typescript
type RelationKind = 
  | 'subtask' | 'parenttask'
  | 'related'
  | 'duplicateof' | 'duplicates'
  | 'blocking' | 'blocked'
  | 'precedes' | 'follows'
  | 'copiedfrom' | 'copiedto';
```

### Repeat Mode Values
```typescript
enum RepeatMode {
  DEFAULT = 0,        // Repeat from last due date
  MONTHLY = 1,        // Same day each month
  FROM_CURRENT = 2    // From completion date
}
```

### Backward Compatibility
All existing 21 tools remain unchanged. New tools are additive only. No breaking changes to existing integrations.
