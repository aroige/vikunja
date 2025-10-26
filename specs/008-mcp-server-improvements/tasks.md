# Tasks: MCP Server Capability Enhancement & Tool Description Improvements

**Input**: Design documents from `/specs/008-mcp-server-improvements/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), contracts/ (complete)

**Tests**: Following TDD approach as specified in Constitution - tests written FIRST, must FAIL before implementation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
All paths relative to `mcp-server/` directory (TypeScript project at repository root)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure MCP server development environment is ready

- [X] T001 Verify Node.js 22+ and pnpm installed
- [X] T002 Install mcp-server dependencies with `cd mcp-server && pnpm install`
- [X] T003 [P] Verify existing test suite runs successfully with `pnpm test`
- [X] T004 [P] Create contracts reference directory at `mcp-server/docs/contracts/` and copy Zod schemas from specs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and shared infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement pagination utilities in `mcp-server/src/utils/pagination.ts` (createPaginatedResponse, calculateOffset, validatePagination functions)
- [X] T006 [P] Add pagination types to `mcp-server/src/vikunja/types.ts` (PaginationParams, PaginatedResponse interfaces)
- [X] T007 [P] Write unit tests for pagination utilities in `mcp-server/tests/utils/pagination.test.ts` (validate default values, max constraints, offset calculation)
- [X] T008 Add relation kind types and bidirectional mapping to `mcp-server/src/vikunja/types.ts` (RelationKind enum, RELATION_INVERSES mapping, HIERARCHICAL_RELATIONS array)
- [X] T009 [P] Create error handling utilities in `mcp-server/src/utils/errors.ts` (formatPermissionError, formatValidationError with resource type context)
- [X] T010 Add Vikunja API version check function in `mcp-server/src/vikunja/client.ts` (checkVersion method with warning logging)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - AI Agent Discovers and Understands Available Tools (Priority: P1) 🎯 MVP

**Goal**: Enhance all 21 existing tool descriptions so AI agents can discover and understand operations without trial-and-error

**Independent Test**: Call MCP tools/list endpoint and verify every tool has: (1) one-line purpose, (2) when to use scenario, (3) expected outcome, (4) parameter descriptions with examples, (5) Vikunja terminology explanations

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Create tool description quality test in `mcp-server/tests/unit/tools/descriptions.test.ts` - verify all tools have required description elements (purpose, use case, outcome, examples)
- [X] T012 [P] [US1] Create recurring task parameter test in `mcp-server/tests/unit/tools/tasks.test.ts` - verify repeat_after/repeat_mode parameters have examples and unit explanations

### Implementation for User Story 1

- [X] T013 [P] [US1] Enhance create_task description in `mcp-server/src/tools/tasks.ts` - add purpose, use case, outcome, repeat_after examples (seconds: 86400=1day, 604800=1week), repeat_mode explanations (0=default, 1=monthly, 2=from current)
- [X] T014 [P] [US1] Enhance update_task description in `mcp-server/src/tools/tasks.ts` - add when to use vs create_task, parameter examples
- [X] T015 [P] [US1] Enhance get_task description in `mcp-server/src/tools/tasks.ts` - add use case for retrieving single task details
- [X] T016 [P] [US1] Enhance delete_task description in `mcp-server/src/tools/tasks.ts` - add outcome and permission requirements
- [X] T017 [P] [US1] Enhance complete_task description in `mcp-server/src/tools/tasks.ts` - add use case vs update_task
- [X] T018 [P] [US1] Enhance create_project description in `mcp-server/src/tools/projects.ts` - add Vikunja terminology explanation (Project not list/workspace), use case examples
- [X] T019 [P] [US1] Enhance get_projects description in `mcp-server/src/tools/projects.ts` - add when to use for task context
- [X] T020 [P] [US1] Enhance update_project description in `mcp-server/src/tools/projects.ts` - add parameter examples
- [X] T021 [P] [US1] Enhance delete_project description in `mcp-server/src/tools/projects.ts` - add cascading consequences explanation
- [X] T022 [P] [US1] Enhance search_tasks description in `mcp-server/src/tools/search.ts` - add when to use vs get_my_tasks vs get_project_tasks, filter examples
- [X] T023 [P] [US1] Enhance get_my_tasks description in `mcp-server/src/tools/search.ts` - add use case for personal task list
- [X] T024 [P] [US1] Enhance get_project_tasks description in `mcp-server/src/tools/search.ts` - add use case for project-specific queries
- [X] T025 [P] [US1] Enhance filter_tasks description in `mcp-server/src/tools/search.ts` - add filter parameter examples (done, priority, labels)
- [X] T026 [P] [US1] Enhance create_label description in `mcp-server/src/tools/assignments.ts` - add hex_color format explanation (6-char without #), use case examples
- [X] T027 [P] [US1] Enhance add_label description in `mcp-server/src/tools/assignments.ts` - add use case for task categorization
- [X] T028 [P] [US1] Enhance remove_label description in `mcp-server/src/tools/assignments.ts` - add outcome explanation
- [X] T029 [P] [US1] Enhance assign_user description in `mcp-server/src/tools/assignments.ts` - add use case and permission requirements
- [X] T030 [P] [US1] Enhance unassign_user description in `mcp-server/src/tools/assignments.ts` - add outcome explanation
- [X] T031 [P] [US1] Enhance bulk_create_tasks description in `mcp-server/src/tools/bulk.ts` - add when to use vs create_task, performance benefits
- [X] T032 [P] [US1] Enhance bulk_update_tasks description in `mcp-server/src/tools/bulk.ts` - add batch operation examples
- [X] T033 [P] [US1] Enhance bulk_add_labels description in `mcp-server/src/tools/bulk.ts` - add use case for organizing multiple tasks
- [X] T034 [US1] Update tool registry in `mcp-server/src/tools/index.ts` to export enhanced descriptions
- [X] T035 [US1] Update README.md with improved tool discovery explanation and link to auto-generated TOOLS.md

**Checkpoint**: At this point, all existing tools have comprehensive descriptions. Agent tool discovery should work without trial-and-error.

---

## Phase 4: User Story 2 - AI Agent Manages Task Relationships and Dependencies (Priority: P1)

**Goal**: Add 3 new tools for managing task relations (subtask, blocker, duplicate, etc.) with bidirectional support and cycle prevention

**Independent Test**: Create parent task and 3 subtasks, mark one subtask blocking another. Query parent task - should return all relations grouped by kind. Attempt cyclic relation - should reject with clear error.

### Tests for User Story 2

- [ ] T036 [P] [US2] Create relation tool contract tests in `mcp-server/tests/tools/relations.test.ts` - test create_task_relation success case with bidirectional creation
- [ ] T037 [P] [US2] Add cycle prevention test in `mcp-server/tests/tools/relations.test.ts` - test hierarchical relation (subtask/parenttask) rejects cycles
- [ ] T038 [P] [US2] Add relation retrieval test in `mcp-server/tests/tools/relations.test.ts` - test get_task_relations returns grouped relations by kind
- [ ] T039 [P] [US2] Add relation deletion test in `mcp-server/tests/tools/relations.test.ts` - test delete_task_relation removes both directions
- [ ] T040 [P] [US2] Add permission error test in `mcp-server/tests/tools/relations.test.ts` - test permission denied includes resource type context
- [ ] T041 [P] [US2] Add validation error test in `mcp-server/tests/tools/relations.test.ts` - test invalid relation_kind returns clear error

### Implementation for User Story 2

- [ ] T042 [US2] Add TaskRelation interface to `mcp-server/src/vikunja/types.ts` (task_id, other_task_id, relation_kind, created_by, created_at)
- [ ] T043 [US2] Add RelationsGrouped interface to `mcp-server/src/vikunja/types.ts` (subtasks[], parenttasks[], related[], etc.)
- [ ] T044 [US2] Add Vikunja API methods in `mcp-server/src/vikunja/client.ts` - createTaskRelation, getTaskRelations, deleteTaskRelation
- [ ] T045 [US2] Create relations tool file at `mcp-server/src/tools/relations.ts` with Zod schemas (CreateTaskRelationSchema, GetTaskRelationsSchema, DeleteTaskRelationSchema)
- [ ] T046 [US2] Implement create_task_relation tool in `mcp-server/src/tools/relations.ts` - comprehensive description with all 10 relation kinds explained, bidirectional creation note, cycle prevention note
- [ ] T047 [US2] Implement get_task_relations tool in `mcp-server/src/tools/relations.ts` - description includes grouped output format, all relation types listed
- [ ] T048 [US2] Implement delete_task_relation tool in `mcp-server/src/tools/relations.ts` - description includes bidirectional deletion note
- [ ] T049 [US2] Add error handling with resource context to relation tools in `mcp-server/src/tools/relations.ts` - use formatPermissionError utility
- [ ] T050 [US2] Register relation tools in `mcp-server/src/tools/index.ts` - add create_task_relation, get_task_relations, delete_task_relation to tools array
- [ ] T051 [US2] Add integration test in `mcp-server/tests/integration/task-workflow.test.ts` - test complete workflow: create tasks, add subtask relations, query hierarchy

**Checkpoint**: Task relations fully functional. Agent can create hierarchies, dependencies, and associations. Bidirectional relations work automatically.

---

## Phase 5: User Story 3 - AI Agent Handles Recurring Tasks and Schedules (Priority: P2)

**Goal**: Enhance recurring task documentation in existing create_task and update_task tools so agents understand repeat modes

**Independent Test**: Agent creates weekly recurring task (repeat_after=604800, mode=0) and monthly bill task (repeat_after=0, mode=1). Verify both created with correct parameters.

### Tests for User Story 3

- [ ] T052 [P] [US3] Create recurring task test in `mcp-server/tests/tools/tasks.test.ts` - test create task with repeat_after=604800 and repeat_mode=0 (weekly)
- [ ] T053 [P] [US3] Create monthly recurring test in `mcp-server/tests/tools/tasks.test.ts` - test create task with repeat_after=0 and repeat_mode=1 (monthly on same date)
- [ ] T054 [P] [US3] Create from-completion recurring test in `mcp-server/tests/tools/tasks.test.ts` - test create task with repeat_after=259200 and repeat_mode=2 (3 days from completion)
- [ ] T055 [P] [US3] Create recurring validation test in `mcp-server/tests/tools/tasks.test.ts` - test invalid repeat_mode returns clear error

### Implementation for User Story 3

- [ ] T056 [US3] Add RepeatMode enum documentation to `mcp-server/src/vikunja/types.ts` - enum RepeatMode { DEFAULT = 0, MONTHLY = 1, FROM_CURRENT = 2 } with JSDoc comments
- [ ] T057 [US3] Enhance repeat_after parameter description in `mcp-server/src/tools/tasks.ts` create_task schema - add examples (daily=86400, weekly=604800, biweekly=1209600), emphasize SECONDS not minutes
- [ ] T058 [US3] Enhance repeat_mode parameter description in `mcp-server/src/tools/tasks.ts` create_task schema - add mode 0/1/2 explanations with use cases
- [ ] T059 [US3] Add repeat_after parameter description in `mcp-server/src/tools/tasks.ts` update_task schema - reference create_task examples
- [ ] T060 [US3] Add repeat_mode parameter description in `mcp-server/src/tools/tasks.ts` update_task schema - reference create_task mode explanations
- [ ] T061 [US3] Add recurring task examples to tool descriptions in `mcp-server/src/tools/tasks.ts` - "Example: Weekly meeting (repeat_after=604800, mode=0), Monthly report on 1st (repeat_after=0, mode=1)"
- [ ] T062 [US3] Update README.md with recurring task documentation section - explain 3 modes with concrete examples

**Checkpoint**: Recurring task documentation complete. Agents understand repeat_after seconds and repeat_mode selection.

---

## Phase 6: User Story 4 - AI Agent Manages Task Comments and Collaboration (Priority: P2)

**Goal**: Add 4 new tools for managing task comments (add, get, update, delete) with pagination support

**Independent Test**: Agent adds comment to task. Later query retrieves comment chronologically with author. Update comment text. Delete comment. Verify all operations work and pagination handles 100+ comments.

### Tests for User Story 4

- [ ] T063 [P] [US4] Create comment tool contract tests in `mcp-server/tests/tools/comments.test.ts` - test add_task_comment success case
- [ ] T064 [P] [US4] Add comment retrieval test in `mcp-server/tests/tools/comments.test.ts` - test get_task_comments with pagination (page_size=50 default)
- [ ] T065 [P] [US4] Add comment update test in `mcp-server/tests/tools/comments.test.ts` - test update_task_comment modifies text
- [ ] T066 [P] [US4] Add comment deletion test in `mcp-server/tests/tools/comments.test.ts` - test delete_task_comment removes comment
- [ ] T067 [P] [US4] Add comment permission test in `mcp-server/tests/tools/comments.test.ts` - test permission denied for modifying other user's comment
- [ ] T068 [P] [US4] Add pagination validation test in `mcp-server/tests/tools/comments.test.ts` - test page_size max 100 enforced

### Implementation for User Story 4

- [ ] T069 [US4] Add TaskComment interface to `mcp-server/src/vikunja/types.ts` (id, task_id, comment, author, created, updated)
- [ ] T070 [US4] Add Vikunja API methods in `mcp-server/src/vikunja/client.ts` - addTaskComment, getTaskComments, updateTaskComment, deleteTaskComment
- [ ] T071 [US4] Create comments tool file at `mcp-server/src/tools/comments.ts` with Zod schemas (AddTaskCommentSchema, GetTaskCommentsSchema, UpdateTaskCommentSchema, DeleteTaskCommentSchema)
- [ ] T072 [US4] Implement add_task_comment tool in `mcp-server/src/tools/comments.ts` - description includes use case for annotating tasks, agent user context note
- [ ] T073 [US4] Implement get_task_comments tool in `mcp-server/src/tools/comments.ts` - description includes chronological ordering, pagination support (page=1, page_size=50 default)
- [ ] T074 [US4] Implement update_task_comment tool in `mcp-server/src/tools/comments.ts` - description includes permission requirement (own comments only unless admin)
- [ ] T075 [US4] Implement delete_task_comment tool in `mcp-server/src/tools/comments.ts` - description includes permission requirement
- [ ] T076 [US4] Add pagination support to get_task_comments in `mcp-server/src/tools/comments.ts` - use pagination utilities from Phase 2
- [ ] T077 [US4] Add error handling with resource context to comment tools in `mcp-server/src/tools/comments.ts` - permission errors include task context
- [ ] T078 [US4] Register comment tools in `mcp-server/src/tools/index.ts` - add add_task_comment, get_task_comments, update_task_comment, delete_task_comment to tools array
- [ ] T079 [US4] Add integration test in `mcp-server/tests/integration/task-workflow.test.ts` - test comment workflow: add, retrieve, update, delete

**Checkpoint**: Task comments fully functional. Agents can facilitate team collaboration through annotating tasks.

---

## Phase 7: User Story 5 - AI Agent Organizes Tasks with Labels (Priority: P2)

**Goal**: Add 6 new label management tools (get_all_labels, get_label, update_label, delete_label, get_task_labels, enhance search filtering)

**Independent Test**: Agent creates label "Urgent", lists all labels, attaches label to 5 tasks, searches tasks with "Urgent" label, updates label color, filters by multiple labels (AND logic), deletes label. Verify all operations work and pagination handles 500+ labels.

### Tests for User Story 5

- [ ] T080 [P] [US5] Create label tool contract tests in `mcp-server/tests/tools/labels.test.ts` - test get_all_labels with pagination
- [ ] T081 [P] [US5] Add label retrieval test in `mcp-server/tests/tools/labels.test.ts` - test get_label returns full label details
- [ ] T082 [P] [US5] Add label update test in `mcp-server/tests/tools/labels.test.ts` - test update_label modifies title, description, hex_color
- [ ] T083 [P] [US5] Add label deletion test in `mcp-server/tests/tools/labels.test.ts` - test delete_label removes from all tasks
- [ ] T084 [P] [US5] Add task labels test in `mcp-server/tests/tools/labels.test.ts` - test get_task_labels returns all attached labels
- [ ] T085 [P] [US5] Add multi-label search test in `mcp-server/tests/tools/search.test.ts` - test search_tasks with filter_labels uses AND logic
- [ ] T086 [P] [US5] Add label color validation test in `mcp-server/tests/tools/labels.test.ts` - test invalid hex_color format returns clear error

### Implementation for User Story 5

- [ ] T087 [US5] Add Label interface to `mcp-server/src/vikunja/types.ts` (id, title, description, hex_color, created_by, created_at, updated_at)
- [ ] T088 [US5] Add Vikunja API methods in `mcp-server/src/vikunja/client.ts` - getAllLabels, getLabel, updateLabel, deleteLabel, getTaskLabels
- [ ] T089 [US5] Update assignments.ts to labels.ts or create separate file at `mcp-server/src/tools/labels.ts` with Zod schemas (GetAllLabelsSchema, GetLabelSchema, UpdateLabelSchema, DeleteLabelSchema, GetTaskLabelsSchema)
- [ ] T090 [US5] Implement get_all_labels tool in `mcp-server/src/tools/labels.ts` - description includes pagination support (page_size=50 default), visibility rules (accessible tasks + created labels)
- [ ] T091 [US5] Implement get_label tool in `mcp-server/src/tools/labels.ts` - description includes use case for label details
- [ ] T092 [US5] Implement update_label tool in `mcp-server/src/tools/labels.ts` - description includes hex_color format (6-char without #), permission requirement
- [ ] T093 [US5] Implement delete_label tool in `mcp-server/src/tools/labels.ts` - description includes cascading removal from all tasks
- [ ] T094 [US5] Implement get_task_labels tool in `mcp-server/src/tools/labels.ts` - description includes use case for viewing task's labels
- [ ] T095 [US5] Add pagination support to get_all_labels in `mcp-server/src/tools/labels.ts` - use pagination utilities from Phase 2
- [ ] T096 [US5] Enhance search_tasks filter_labels parameter in `mcp-server/src/tools/search.ts` - update description to explain AND logic for multiple labels
- [ ] T097 [US5] Add hex color validation to update_label in `mcp-server/src/tools/labels.ts` - use Zod regex pattern
- [ ] T098 [US5] Add error handling with resource context to label tools in `mcp-server/src/tools/labels.ts` - permission errors include label context
- [ ] T099 [US5] Register label tools in `mcp-server/src/tools/index.ts` - add get_all_labels, get_label, update_label, delete_label, get_task_labels to tools array
- [ ] T100 [US5] Add integration test in `mcp-server/tests/integration/task-workflow.test.ts` - test label workflow: create label (use existing), list all, attach to tasks, search by label, update color, delete

**Checkpoint**: Label management fully functional. Agents can organize and filter tasks using labels.

---

## Phase 8: User Story 6 - AI Agent Works with Task Attachments (Priority: P3)

**Goal**: Add 1 tool for retrieving task attachment metadata (file upload/download out of scope)

**Independent Test**: Query task with 2 attachments. Retrieve attachment metadata (filenames, sizes, MIME types, upload dates). Verify metadata returned without file content.

### Tests for User Story 6

- [ ] T101 [P] [US6] Create attachment tool contract test in `mcp-server/tests/tools/attachments.test.ts` - test get_task_attachments returns metadata list
- [ ] T102 [P] [US6] Add attachment metadata test in `mcp-server/tests/tools/attachments.test.ts` - test response includes filename, size, mime_type, created_by, created_at
- [ ] T103 [P] [US6] Add empty attachments test in `mcp-server/tests/tools/attachments.test.ts` - test task with no attachments returns empty array

### Implementation for User Story 6

- [ ] T104 [US6] Add TaskAttachment interface to `mcp-server/src/vikunja/types.ts` (id, task_id, file_id, filename, size, mime_type, created_by, created_at)
- [ ] T105 [US6] Add Vikunja API method in `mcp-server/src/vikunja/client.ts` - getTaskAttachments
- [ ] T106 [US6] Create attachments tool file at `mcp-server/src/tools/attachments.ts` with Zod schema (GetTaskAttachmentsSchema)
- [ ] T107 [US6] Implement get_task_attachments tool in `mcp-server/src/tools/attachments.ts` - description clarifies metadata only (no file upload/download), use case for context awareness
- [ ] T108 [US6] Add error handling with resource context to attachment tool in `mcp-server/src/tools/attachments.ts` - permission errors include task context
- [ ] T109 [US6] Register attachment tool in `mcp-server/src/tools/index.ts` - add get_task_attachments to tools array
- [ ] T110 [US6] Add integration test in `mcp-server/tests/integration/task-workflow.test.ts` - test attachment workflow: query task, retrieve metadata

**Checkpoint**: Attachment metadata retrieval functional. Agents can provide file context without file storage operations.

---

## Phase 9: User Story 7 - n8n Workflow Reliability with JSON Mode (Priority: P3)

**Goal**: Validate and document existing JSON mode functionality for n8n compatibility

**Independent Test**: Start MCP server with MCP_HTTP_JSON_RESPONSE=true. Make tool call via HTTP. Verify response is valid JSON. Start in stdio mode - verify JSON mode has no effect.

### Tests for User Story 7

- [ ] T111 [P] [US7] Create JSON mode test in `mcp-server/tests/transports/http.test.ts` - test with MCP_HTTP_JSON_RESPONSE=true returns valid JSON
- [ ] T112 [P] [US7] Add stdio isolation test in `mcp-server/tests/transports/stdio.test.ts` - test JSON mode env var doesn't affect stdio transport
- [ ] T113 [P] [US7] Add error format test in `mcp-server/tests/transports/http.test.ts` - test errors maintain JSON format in JSON mode

### Implementation for User Story 7

- [ ] T114 [US7] Verify JSON mode implementation in `mcp-server/src/transports/http.ts` - confirm MCP_HTTP_JSON_RESPONSE env var handling exists
- [ ] T115 [US7] Add JSON mode documentation to `mcp-server/README.md` - n8n integration section with MCP_HTTP_JSON_RESPONSE=true setup
- [ ] T116 [US7] Add n8n workflow example to `mcp-server/docs/` - create n8n-integration.md with sample workflow
- [ ] T117 [US7] Verify error responses maintain JSON format in `mcp-server/src/transports/http.ts` - consistent error structure regardless of JSON mode
- [ ] T118 [US7] Add integration test in `mcp-server/tests/integration/n8n-workflow.test.ts` - simulate n8n workflow: create task, retrieve, parse JSON

**Checkpoint**: n8n JSON mode validated and documented. n8n workflows can reliably use MCP server.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

- [ ] T119 [P] Generate TOOLS.md documentation in `mcp-server/docs/` - auto-generate from tool registry with all descriptions
- [ ] T120 [P] Add Vikunja version check on startup in `mcp-server/src/index.ts` - call checkVersion from vikunja client, log warning on mismatch
- [ ] T121 [P] Update package.json scripts with test commands - add test:relations, test:comments, test:labels for granular testing
- [ ] T122 [P] Run full test suite with `pnpm test:coverage` - verify 90%+ coverage maintained (currently 98.5%)
- [ ] T123 [P] Run linting with `pnpm lint:fix && pnpm format` - ensure code quality standards met
- [ ] T124 Update CHANGELOG.md with all new features - 14 new tools, 21 enhanced descriptions, pagination support
- [ ] T125 Update main README.md with capability overview - list all 35+ tools organized by category
- [ ] T126 [P] Create DEVELOPMENT.md in `mcp-server/docs/` - copy quickstart.md content for developer onboarding
- [ ] T127 Validate quickstart.md instructions - manually test setup, development workflow, adding new tool steps
- [ ] T128 Performance validation - test typical operations <2s, bulk operations <5s with 100+ items
- [ ] T129 Security review - verify error messages don't leak sensitive details, Zod validation on all inputs
- [ ] T130 Final integration test - complete end-to-end agent workflow using all new tools together

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - Tool description enhancements (P1)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) - Task relations tools (P1)
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) - Recurring task docs (P2)
- **User Story 4 (Phase 6)**: Depends on Foundational (Phase 2) - Task comments tools (P2)
- **User Story 5 (Phase 7)**: Depends on Foundational (Phase 2) - Label management tools (P2)
- **User Story 6 (Phase 8)**: Depends on Foundational (Phase 2) - Attachment metadata tool (P3)
- **User Story 7 (Phase 9)**: Depends on Foundational (Phase 2) - JSON mode validation (P3)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

All user stories are INDEPENDENT after Foundational phase completes:

- **User Story 1 (P1)**: No dependencies on other stories - enhances existing tools
- **User Story 2 (P1)**: No dependencies on other stories - adds new relation tools
- **User Story 3 (P2)**: No dependencies on other stories - enhances existing recurring task docs
- **User Story 4 (P2)**: No dependencies on other stories - adds new comment tools
- **User Story 5 (P2)**: No dependencies on other stories - adds new label tools
- **User Story 6 (P3)**: No dependencies on other stories - adds new attachment tool
- **User Story 7 (P3)**: No dependencies on other stories - validates existing JSON mode

### Within Each User Story

- Tests MUST be written FIRST and FAIL before implementation (TDD)
- Models/types before API client methods
- API client methods before tool implementations
- Tool implementations before integration tests
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: Tasks T003 and T004 can run in parallel

**Phase 2 (Foundational)**:
- T006, T007, T009 can run in parallel (different files)

**After Foundational Completes**:
- ALL 7 USER STORIES can start in parallel (different files, independent functionality)
- If team capacity allows, assign different developers to different stories

**Within User Story 1** (Tool Description Enhancements):
- ALL implementation tasks T013-T033 can run in parallel (different tool descriptions in different files)

**Within User Story 2** (Task Relations):
- Tests T036-T041 can run in parallel
- After T042-T044 complete, T045-T048 can run in parallel (different tool implementations)

**Within User Story 3** (Recurring Tasks):
- Tests T052-T055 can run in parallel
- Implementation tasks T057-T061 can run in parallel (different parameter descriptions)

**Within User Story 4** (Comments):
- Tests T063-T068 can run in parallel
- After T069-T071 complete, T072-T075 can run in parallel (different tool implementations)

**Within User Story 5** (Labels):
- Tests T080-T086 can run in parallel
- After T087-T089 complete, T090-T094 can run in parallel (different tool implementations)

**Within User Story 6** (Attachments):
- Tests T101-T103 can run in parallel

**Within User Story 7** (JSON Mode):
- Tests T111-T113 can run in parallel
- Tasks T115-T116 can run in parallel (documentation)

**Phase 10 (Polish)**:
- Tasks T119-T123, T126 can run in parallel (different files)

---

## Parallel Example: User Story 2 (Task Relations)

```bash
# Launch all tests for User Story 2 together (after Foundational complete):
T036: "Create relation tool contract tests - test create_task_relation success"
T037: "Add cycle prevention test - test hierarchical relation rejects cycles"
T038: "Add relation retrieval test - test get_task_relations grouped output"
T039: "Add relation deletion test - test delete_task_relation bidirectional"
T040: "Add permission error test - test error includes resource context"
T041: "Add validation error test - test invalid relation_kind clear error"

# After T042-T044 complete, launch tool implementations in parallel:
T045: "Create relations tool file with Zod schemas"
T046: "Implement create_task_relation tool with comprehensive description"
T047: "Implement get_task_relations tool with grouped output"
T048: "Implement delete_task_relation tool with bidirectional note"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only - Both P1)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T010) - CRITICAL blocking phase
3. Complete Phase 3: User Story 1 (T011-T035) - Enhanced tool descriptions
4. Complete Phase 4: User Story 2 (T036-T051) - Task relations
5. **STOP and VALIDATE**: Test tool discovery and task relations independently
6. Deploy/demo if ready - agents can now discover tools and manage task hierarchies

### Incremental Delivery (Recommended)

1. **Foundation**: Setup + Foundational (T001-T010) → Infrastructure ready
2. **MVP Release**: Add US1 + US2 (T011-T051) → Test independently → Deploy
   - Agents discover tools clearly
   - Agents manage task hierarchies
3. **Release 2**: Add US3 + US4 + US5 (T052-T100) → Test independently → Deploy
   - Recurring task clarity
   - Team collaboration via comments
   - Task organization via labels
4. **Release 3**: Add US6 + US7 (T101-T118) → Test independently → Deploy
   - Attachment awareness
   - n8n workflow reliability
5. **Polish**: Complete Phase 10 (T119-T130) → Final validation → Production

### Parallel Team Strategy

With 3+ developers after Foundational complete:

1. **Team completes Setup + Foundational together** (T001-T010)
2. **Parallel user story implementation**:
   - Developer A: User Story 1 (T011-T035) - Tool descriptions
   - Developer B: User Story 2 (T036-T051) - Task relations
   - Developer C: User Story 4 (T063-T079) - Comments
   - Developer D: User Story 5 (T080-T100) - Labels
3. **Sequential for low-priority**:
   - Any developer: User Story 3 (T052-T062) - Recurring docs (quick)
   - Any developer: User Story 6 (T101-T110) - Attachments (quick)
   - Any developer: User Story 7 (T111-T118) - JSON mode validation (quick)
4. **Team merges and completes Polish together** (T119-T130)

---

## Task Count Summary

- **Total Tasks**: 130
- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (Foundational)**: 6 tasks (BLOCKING)
- **Phase 3 (US1 - Tool Descriptions)**: 25 tasks (P1) 🎯
- **Phase 4 (US2 - Task Relations)**: 16 tasks (P1) 🎯
- **Phase 5 (US3 - Recurring Tasks)**: 11 tasks (P2)
- **Phase 6 (US4 - Comments)**: 17 tasks (P2)
- **Phase 7 (US5 - Labels)**: 21 tasks (P2)
- **Phase 8 (US6 - Attachments)**: 10 tasks (P3)
- **Phase 9 (US7 - JSON Mode)**: 8 tasks (P3)
- **Phase 10 (Polish)**: 12 tasks

**MVP Scope (US1 + US2)**: 51 tasks (Setup + Foundational + US1 + US2)

**Parallel Tasks**: 78 tasks marked [P] can run in parallel with others in their phase

---

## Validation Checklist

- ✅ All tasks follow format: `- [ ] [ID] [P?] [Story?] Description with file path`
- ✅ All user story tasks have [Story] label (US1-US7)
- ✅ Task IDs sequential (T001-T130)
- ✅ File paths specified for implementation tasks
- ✅ Tests written FIRST (TDD approach per Constitution)
- ✅ Independent test criteria for each user story
- ✅ Dependencies clearly documented
- ✅ Parallel opportunities identified
- ✅ MVP scope defined (US1 + US2 = 51 tasks)
- ✅ Each story independently testable
- ✅ 90%+ coverage target maintained

---

## Notes

- [P] tasks = different files, no dependencies, safe to parallelize
- [Story] label maps task to user story for traceability (US1-US7 from spec.md)
- Each user story is independently completable and testable
- Tests must FAIL before implementing (TDD per Constitution)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Current MCP server coverage: 98.5% - must maintain 90%+
- Backward compatibility: All 21 existing tools remain functional
