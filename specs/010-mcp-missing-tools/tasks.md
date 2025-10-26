# Tasks: MCP Server Missing Tools

**Input**: Design documents from `/specs/010-mcp-missing-tools/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks are included per Constitution requirement for 90%+ coverage with TDD approach.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- Single TypeScript project (MCP server)
- Source: `mcp-server/src/`
- Tests: `mcp-server/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify environment and prepare for implementation

- [X] T001 Verify Node.js 22+ and pnpm are installed
- [X] T002 Install/update dependencies in mcp-server/package.json if needed
- [X] T003 [P] Review existing tool patterns in mcp-server/src/tools/projects.ts and mcp-server/src/tools/tasks.ts
- [X] T004 [P] Review ToolRegistry registration pattern in mcp-server/src/tools/registry.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and interfaces that all tools depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Add VikunjaUser type definition in mcp-server/src/vikunja/types.ts (if not exists)
- [X] T006 [P] Create UserTools class skeleton in mcp-server/src/tools/user.ts with rate limiter and client injection
- [X] T007 [P] Export UserTools from mcp-server/src/tools/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Direct Project Lookup (Priority: P1) 🎯 MVP

**Goal**: Enable AI agents to retrieve project details by ID in a single tool call

**Independent Test**: Call get_project tool with a known project ID and verify it returns complete project metadata (title, description, color, parent_project_id, is_archived). Test error cases (404, 403).

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [P] [US1] Create test file mcp-server/tests/tools/projects.test.ts (if not exists) with test setup
- [ ] T009 [P] [US1] Write unit test for getProject success case in mcp-server/tests/tools/projects.test.ts
- [ ] T010 [P] [US1] Write unit test for getProject 404 NOT_FOUND error in mcp-server/tests/tools/projects.test.ts
- [ ] T011 [P] [US1] Write unit test for getProject 403 FORBIDDEN error in mcp-server/tests/tools/projects.test.ts
- [ ] T012 [P] [US1] Write unit test for getProject validation error (invalid ID) in mcp-server/tests/tools/projects.test.ts

### Implementation for User Story 1

- [ ] T013 [US1] Define GetProjectSchema with Zod in mcp-server/src/tools/projects.ts (id: positive int with description)
- [ ] T014 [US1] Implement getProject method in ProjectTools class in mcp-server/src/tools/projects.ts following research.md error handling pattern
- [ ] T015 [US1] Register get_project tool in ToolRegistry in mcp-server/src/tools/registry.ts after existing project tools
- [ ] T016 [US1] Run tests and verify all 4+ test cases pass: npm run test tests/tools/projects.test.ts
- [ ] T017 [US1] Manual integration test: Use test-sse-client.js or MCP client to call get_project with real project ID

**Checkpoint**: At this point, User Story 1 (get_project) should be fully functional and testable independently

---

## Phase 4: User Story 2 - Project Discovery (Priority: P2)

**Goal**: Enable AI agents to list all accessible projects without requiring a search query

**Independent Test**: Call get_all_projects tool without parameters and verify it returns all projects. Test pagination (page parameter). Test archived filter (filter_archived=true/false).

### Tests for User Story 2

- [ ] T018 [P] [US2] Write unit test for getAllProjects success case (default params) in mcp-server/tests/tools/projects.test.ts
- [ ] T019 [P] [US2] Write unit test for getAllProjects with pagination (page=2) in mcp-server/tests/tools/projects.test.ts
- [ ] T020 [P] [US2] Write unit test for getAllProjects with filter_archived=true in mcp-server/tests/tools/projects.test.ts
- [ ] T021 [P] [US2] Write unit test for getAllProjects with filter_archived=false in mcp-server/tests/tools/projects.test.ts
- [ ] T022 [P] [US2] Write unit test for getAllProjects validation error (invalid page) in mcp-server/tests/tools/projects.test.ts

### Implementation for User Story 2

- [ ] T023 [US2] Define GetAllProjectsSchema with Zod in mcp-server/src/tools/projects.ts (page optional default 1, filter_archived optional boolean)
- [ ] T024 [US2] Implement getAllProjects method in ProjectTools class in mcp-server/src/tools/projects.ts with pagination metadata
- [ ] T025 [US2] Register get_all_projects tool in ToolRegistry in mcp-server/src/tools/registry.ts after get_project
- [ ] T026 [US2] Run tests and verify all 5+ test cases pass: npm run test tests/tools/projects.test.ts
- [ ] T027 [US2] Manual integration test: Call get_all_projects and verify hasMore pagination heuristic

**Checkpoint**: At this point, User Stories 1 AND 2 (project tools) should both work independently

---

## Phase 5: User Story 3 - Direct Task Lookup (Priority: P2)

**Goal**: Enable AI agents to retrieve task details by ID in a single tool call

**Independent Test**: Call get_task tool with a known task ID and verify it returns complete task data (title, description, priority, assignees, labels, relations). Test error cases (404, 403).

### Tests for User Story 3

- [ ] T028 [P] [US3] Create test file mcp-server/tests/tools/tasks.test.ts (if not exists) with test setup
- [ ] T029 [P] [US3] Write unit test for getTask success case in mcp-server/tests/tools/tasks.test.ts
- [ ] T030 [P] [US3] Write unit test for getTask 404 NOT_FOUND error in mcp-server/tests/tools/tasks.test.ts
- [ ] T031 [P] [US3] Write unit test for getTask 403 FORBIDDEN error in mcp-server/tests/tools/tasks.test.ts
- [ ] T032 [P] [US3] Write unit test for getTask validation error (invalid ID) in mcp-server/tests/tools/tasks.test.ts

### Implementation for User Story 3

- [ ] T033 [US3] Define GetTaskSchema with Zod in mcp-server/src/tools/tasks.ts (id: positive int with description)
- [ ] T034 [US3] Implement getTask method in TaskTools class in mcp-server/src/tools/tasks.ts following error handling pattern
- [ ] T035 [US3] Register get_task tool in ToolRegistry in mcp-server/src/tools/registry.ts after existing task tools
- [ ] T036 [US3] Run tests and verify all 4+ test cases pass: npm run test tests/tools/tasks.test.ts
- [ ] T037 [US3] Manual integration test: Call get_task with real task ID and verify relations/labels are included

**Checkpoint**: All project and task lookup tools should now be independently functional

---

## Phase 6: User Story 4 - User Context Awareness (Priority: P3)

**Goal**: Enable AI agents to retrieve authenticated user profile information

**Independent Test**: Call get_user_info tool (no parameters) and verify it returns safe user fields (id, username, email, name, preferences). Verify sensitive fields are excluded (password, tokens).

### Tests for User Story 4

- [ ] T038 [P] [US4] Create test file mcp-server/tests/tools/user.test.ts with test setup and mock user data
- [ ] T039 [P] [US4] Write unit test for getUserInfo success case in mcp-server/tests/tools/user.test.ts
- [ ] T040 [P] [US4] Write unit test verifying sensitive fields are filtered in mcp-server/tests/tools/user.test.ts
- [ ] T041 [P] [US4] Write unit test for getUserInfo UNAUTHORIZED error in mcp-server/tests/tools/user.test.ts
- [ ] T042 [P] [US4] Write unit test for getUserInfo with API error in mcp-server/tests/tools/user.test.ts

### Implementation for User Story 4

- [ ] T043 [US4] Define GetUserInfoSchema (empty object) in mcp-server/src/tools/user.ts
- [ ] T044 [US4] Define UserToolResult interface in mcp-server/src/tools/user.ts (success, message, user?, error?)
- [ ] T045 [US4] Implement getUserInfo method in UserTools class in mcp-server/src/tools/user.ts with explicit field filtering per data-model.md
- [ ] T046 [US4] Register get_user_info tool in ToolRegistry in mcp-server/src/tools/registry.ts at end of user tools section
- [ ] T047 [US4] Run tests and verify all 4+ test cases pass: npm run test tests/tools/user.test.ts
- [ ] T048 [US4] Manual integration test: Call get_user_info and verify no sensitive fields in response

**Checkpoint**: All four user stories should now be independently functional

---

## Phase 7: Integration Testing

**Purpose**: Verify all tools work together and with existing MCP server infrastructure

- [ ] T049 [P] Create integration test file mcp-server/tests/integration/read-operations.test.ts
- [ ] T050 [P] Write integration test for chained operations (get_user_info → get_all_projects → get_project → get_task) in mcp-server/tests/integration/read-operations.test.ts
- [ ] T051 Write integration test for rate limiting across all new tools in mcp-server/tests/integration/read-operations.test.ts
- [ ] T052 Write integration test for error handling consistency in mcp-server/tests/integration/read-operations.test.ts
- [ ] T053 Run full test suite: npm run test
- [ ] T054 Verify 90%+ coverage for new tools: npm run test:coverage

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T055 [P] Review and enhance tool descriptions in registry.ts for clarity per contracts/
- [ ] T056 [P] Add usage examples to quickstart.md from manual testing
- [ ] T057 [P] Update mcp-server/README.md with new tools section
- [ ] T058 Code review: Check all tools follow consistent error handling pattern from research.md
- [ ] T059 Code review: Verify all Zod schemas have comprehensive descriptions
- [ ] T060 Code review: Confirm Winston logging on all tool invocations
- [ ] T061 Run linting: npm run lint:fix
- [ ] T062 Run formatting: npm run format
- [ ] T063 Final test run: npm run test (all tests must pass)
- [ ] T064 Manual smoke test: Test all 4 new tools via MCP client (test-sse-client.js or n8n)
- [ ] T065 Performance check: Verify response times <2 seconds for typical requests
- [ ] T066 Security review: Confirm get_user_info filters sensitive fields per FR-011

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Integration Testing (Phase 7)**: Depends on all user stories being complete
- **Polish (Phase 8)**: Depends on integration testing completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (same ProjectTools class)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (TaskTools class)
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories (new UserTools class)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Schema definition before method implementation
- Method implementation before tool registration
- Tool registration before manual testing
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T004)
- All Foundational tasks marked [P] can run in parallel (T006-T007 after T005)
- Once Foundational phase completes, all 4 user stories (Phases 3-6) can start in parallel (if team capacity allows)
- All test tasks within a user story marked [P] can run in parallel
- Integration test file creation tasks marked [P] can run in parallel (T049-T050)
- Polish tasks marked [P] can run in parallel (T055-T057)

---

## Parallel Example: User Story 1

```bash
# After T013 completes, these can run in parallel:
# (Tests are written, implementation in progress)

Task T009: "Write unit test for getProject success case"
Task T010: "Write unit test for getProject 404 NOT_FOUND error"
Task T011: "Write unit test for getProject 403 FORBIDDEN error"
Task T012: "Write unit test for getProject validation error"

# Then T014 (implementation) must complete before T015-T017
```

---

## Parallel Example: All User Stories

```bash
# After Phase 2 (Foundational) completes, ALL user stories can start in parallel:

Team Member 1: Phase 3 (User Story 1) - get_project
Team Member 2: Phase 4 (User Story 2) - get_all_projects  
Team Member 3: Phase 5 (User Story 3) - get_task
Team Member 4: Phase 6 (User Story 4) - get_user_info

# Each story is independently testable and deployable
```

---

## Implementation Strategy

### MVP Scope (Recommended First Delivery)

**User Story 1 ONLY**: Direct Project Lookup (get_project)
- Delivers immediate value for the reported problem ("What is the name of project 11?")
- Smallest surface area (~75 LOC including tests)
- Validates entire pattern before scaling to other tools
- Can be deployed and tested independently

### Incremental Delivery

1. **Sprint 1**: User Story 1 (P1) - get_project
2. **Sprint 2**: User Stories 2-3 (P2) - get_all_projects, get_task
3. **Sprint 3**: User Story 4 (P3) - get_user_info + Integration testing + Polish

### Success Criteria

- ✅ All 66 tasks completed
- ✅ 90%+ test coverage for new tools (per Constitution)
- ✅ All tests pass: npm run test
- ✅ Linting passes: npm run lint
- ✅ Manual smoke test confirms all 4 tools work via MCP client
- ✅ No security regressions (get_user_info filters sensitive fields)
- ✅ Response times <2 seconds per performance goals

---

## Task Summary

**Total Tasks**: 66
- Setup: 4 tasks
- Foundational: 3 tasks (blocking)
- User Story 1 (P1): 10 tasks (5 tests + 5 implementation)
- User Story 2 (P2): 10 tasks (5 tests + 5 implementation)
- User Story 3 (P2): 10 tasks (5 tests + 5 implementation)
- User Story 4 (P3): 11 tasks (5 tests + 6 implementation)
- Integration Testing: 6 tasks
- Polish: 12 tasks

**Parallelization**: 
- 36 tasks marked [P] can run in parallel when dependencies allow
- 4 user stories can be worked on simultaneously after Foundational phase
- Estimated 4-6 hours with sequential execution
- Estimated 2-3 hours with full parallelization (4 team members)

**MVP Tasks**: 17 tasks (T001-T017) for User Story 1 only
