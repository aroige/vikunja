---
description: "Task breakdown for AI-Powered Personal Assistant System"
---

# Tasks: AI-Powered Personal Assistant System

**Input**: Design documents from `/specs/011-ai-agent-architecture/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No explicit test tasks included (not requested in specification). Tests will be verified through manual conversation scenarios documented in quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Follow priority order P1 → P2 → P3.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for n8n workflows and MCP server enhancements

- [X] T001 Create n8n-workflows/ directory structure (n8n-workflows/prompts/, n8n-workflows/tools/)
- [X] T002 [P] Setup MCP server TypeScript dependencies in mcp-server/package.json (add winston, chrono-node, uuid)
- [X] T003 [P] Configure Winston structured logging in mcp-server/src/utils/logger.ts
- [X] T004 [P] Create base ToolResult types in mcp-server/src/models/tool-result.ts
- [X] T005 [P] Create TaskSummary interface in mcp-server/src/models/task.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Setup PostgreSQL memory database for n8n (database creation, tables per data-model.md)
	- Database exists. DB Owner: postgres, IP: 192.168.50.63, ask for password
	- NOTE: All db table creation schemas must be stored for reference.
- [x] T007 Create AgentConversation schema in PostgreSQL (id, userId, agentType, messages, sessionData, timestamps)
- [x] T008 Create ConversationMessage schema in PostgreSQL (id, conversationId, role, content, timestamp, metadata)
- [x] T009 Create ToolExecutionLog schema in PostgreSQL (id, traceId, toolName, args, result, status, agentType, userId, latencyMs, tokensUsed, timestamp)
- [x] T010 Create AgentConfiguration schema in PostgreSQL (agentType, contextWindowSize, model, promptVersion, maxTools, tools, updatedAt)
- [x] T011 [P] Implement trace ID generation utility in mcp-server/src/utils/trace-id.ts
- [x] T012 [P] Implement confirmation token generation (JWT) in mcp-server/src/utils/confirmation-token.ts
- [x] T013 [P] Create Vikunja API client wrapper in mcp-server/src/services/vikunja-client.ts
- [x] T014 Implement search service with ranking algorithm in mcp-server/src/services/search-service.ts (urgency first, priority second per FR-006)
- [x] T015 Create supervisor agent system prompt in n8n-workflows/prompts/supervisor.md (routing logic, delegation strategy)
- [x] T016 Create Vikunja specialist system prompt in n8n-workflows/prompts/vikunja-specialist.md (task management focus, tool usage patterns)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Task Completion by Natural Language (Priority: P1) 🎯 MVP

**Goal**: Users can complete tasks using natural language with 99%+ accuracy through search-before-action workflow

**Independent Test**: Create test tasks in Vikunja, issue natural language completion statements ("I'm done watering plants"), verify correct task marked complete or appropriate clarification requested

### Implementation for User Story 1

- [ ] T017 [P] [US1] Implement search_tasks tool in mcp-server/src/tools/search-tools.ts (per contracts/mcp-tools.md)
- [ ] T018 [P] [US1] Implement complete_task tool (search-first, return confirmation) in mcp-server/src/tools/task-tools.ts
- [ ] T019 [P] [US1] Implement confirm_complete_task tool (execute with token) in mcp-server/src/tools/task-tools.ts
- [ ] T020 [US1] Add search result validation (no match, single match, multiple matches) in mcp-server/src/services/task-service.ts
- [ ] T021 [US1] Add multilingual task matching support in mcp-server/src/services/search-service.ts (FR-035)
- [ ] T022 [US1] Create n8n supervisor workflow in n8n-workflows/supervisor-agent.json (chat trigger, LLM agent with routing)
- [ ] T023 [US1] Create n8n Vikunja specialist workflow in n8n-workflows/vikunja-specialist.json (receive context, call MCP tools, return results)
- [ ] T024 [US1] Configure PostgreSQL memory nodes in supervisor workflow (context window: 3-5 messages, shared database)
- [ ] T025 [US1] Configure PostgreSQL memory nodes in Vikunja specialist workflow (context window: 10-15 messages, shared database)
- [ ] T026 [US1] Implement tool execution logging in mcp-server/src/utils/logger.ts (log to ToolExecutionLog table)
- [ ] T027 [US1] Add error handling for no-match scenarios in Vikunja specialist workflow (per FR-003)
- [ ] T028 [US1] Add error handling for multiple-match scenarios in Vikunja specialist workflow (present all options per FR-002)
- [ ] T029 [US1] Add confirmation workflow in Vikunja specialist (wait for user "yes" before calling confirm_complete_task)

**Checkpoint**: User Story 1 complete - test with scenarios from quickstart.md (single match, multiple matches, no match, multilingual)

---

## Phase 4: User Story 2 - Smart Daily Task Recommendations (Priority: P2)

**Goal**: Users receive prioritized, context-aware task lists with actionable insights

**Independent Test**: Create tasks with various due dates/priorities, ask "What should I focus on today?", verify proper sorting (overdue → today → this week) and priority within groups

### Implementation for User Story 2

- [ ] T030 [P] [US2] Implement get_daily_recommendations tool in mcp-server/src/tools/recommendation-tools.ts (per contracts/mcp-tools.md)
- [ ] T031 [P] [US2] Implement filter_tasks_by_duration tool in mcp-server/src/tools/recommendation-tools.ts
- [ ] T032 [US2] Implement urgency-based ranking in mcp-server/src/services/search-service.ts (overdue → today → week → later)
- [ ] T033 [US2] Implement priority tiebreaker within urgency groups in mcp-server/src/services/search-service.ts (high to low)
- [ ] T034 [US2] Add project filtering support in mcp-server/src/services/search-service.ts (FR-007)
- [ ] T035 [US2] Add result limiting (max 10-15 items) in get_daily_recommendations tool (FR-008)
- [ ] T036 [US2] Add actionable insights formatting in tool responses ("You have 3 overdue tasks" per FR-009)
- [ ] T037 [US2] Update Vikunja specialist workflow to handle recommendation requests
- [ ] T038 [US2] Add time-based context logic for "lunch task" queries (filter by duration, current time per FR-010)

**Checkpoint**: User Story 2 complete - test with quickstart.md scenarios (daily focus, lunch tasks, project-specific)

---

## Phase 5: User Story 4 - Natural Language Reminders as Tasks (Priority: P2)

**Goal**: Users create reminders with natural time references that become properly scheduled tasks

**Independent Test**: Issue various reminder requests ("Remind me to call Mom tomorrow at 3pm"), verify tasks created with correct due dates/times

**Note**: Implementing US4 before US3 due to simpler implementation (no multi-turn conversation state)

### Implementation for User Story 4

- [ ] T039 [P] [US4] Create Chrono.js date parser wrapper in n8n-workflows/tools/date-parser.js
- [ ] T040 [P] [US4] Implement create_task tool in mcp-server/src/tools/task-tools.ts (per contracts/mcp-tools.md)
- [ ] T041 [US4] Add date parsing workflow in n8n Vikunja specialist (call date-parser.js, handle failures)
- [ ] T042 [US4] Add AI fallback for ambiguous dates in Vikunja specialist workflow (ask clarification when Chrono fails)
- [ ] T043 [US4] Implement default time rules in date-parser.js ("morning" = 9am, "afternoon" = 2pm per FR-017)
- [ ] T044 [US4] Add confirmation for parsed dates in Vikunja specialist workflow ("I'll remind you tomorrow at 9am. Is that right?")
- [ ] T045 [US4] Add context extraction for "remind me about this" in Vikunja specialist (reference last 2-3 messages per FR-018)
- [ ] T046 [US4] Add timezone-aware confirmation messages in create_task tool (FR-019)

**Checkpoint**: User Story 4 complete - test with quickstart.md scenarios (various time formats, ambiguous references, context-based)

---

## Phase 6: User Story 3 - Conversational Project Planning (Priority: P3)

**Goal**: Users create complete project structures through multi-turn conversational planning

**Independent Test**: Initiate project planning conversation, verify system asks appropriate questions, confirm generated plan matches intent, check Vikunja for correct structure

**Note**: Most complex story due to multi-turn state management and verification workflow

### Implementation for User Story 3

- [ ] T047 [P] [US3] Implement create_project_plan tool in mcp-server/src/tools/project-tools.ts (per contracts/mcp-tools.md)
- [ ] T048 [US3] Add project planning state machine in Vikunja specialist workflow (gathering → proposing → creating)
- [ ] T049 [US3] Add planning conversation prompts to n8n-workflows/prompts/vikunja-specialist.md (clarifying questions about scope, timeline, phases)
- [ ] T050 [US3] Implement session state storage for planning workflow in PostgreSQL sessionData (discovered requirements, timeline, proposed tasks)
- [ ] T051 [US3] Add plan presentation logic in Vikunja specialist (format proposed structure for user review per FR-012)
- [ ] T052 [US3] Add modification request handling in Vikunja specialist (allow user to change plan before creation per FR-013)
- [ ] T053 [US3] Implement due date calculation from timeline in create_project_plan tool (FR-014)
- [ ] T054 [US3] Add subtask and dependency creation logic in create_project_plan tool (FR-014)
- [ ] T055 [US3] Implement conversation pause/resume logic in Vikunja specialist (check sessionData for in-progress planning per FR-015)
- [ ] T056 [US3] Add validation for unrealistic timelines in planning workflow (warn user, suggest adjustments)

**Checkpoint**: User Story 3 complete - test with quickstart.md scenarios (project planning, modifications, pause/resume)

---

## Phase 7: User Story 5 - Multi-System Context Awareness (Priority: P3)

**Goal**: System integrates calendar data to provide intelligent scheduling suggestions

**Independent Test**: Test with mock calendar data initially, then real Google Calendar integration; verify free time detection and appropriate suggestions

**Note**: This phase includes calendar specialist setup for future extensibility

### Implementation for User Story 5

- [ ] T057 [P] [US5] Create calendar specialist system prompt in n8n-workflows/prompts/calendar-specialist.md
- [ ] T058 [P] [US5] Create calendar specialist workflow stub in n8n-workflows/calendar-specialist.json (PostgreSQL memory, context window 8-12)
- [ ] T059 [P] [US5] Add Google Calendar API client setup in mcp-server/src/services/calendar-client.ts (OAuth2 configuration)
- [ ] T060 [US5] Implement check_availability tool in mcp-server/src/tools/calendar-tools.ts (query free/busy)
- [ ] T061 [US5] Implement suggest_time_slot tool in mcp-server/src/tools/calendar-tools.ts (find gaps matching task duration per FR-021)
- [ ] T062 [US5] Add calendar error handling in calendar-specialist workflow (graceful degradation per FR-022)
- [ ] T063 [US5] Add calendar integration choice in Vikunja specialist workflow ("note time only or add to calendar?" per FR-023)
- [ ] T064 [US5] Update supervisor workflow to route calendar queries to calendar specialist
- [ ] T065 [US5] Add cross-agent context sharing in PostgreSQL memory (calendar specialist reads Vikunja task context)
- [ ] T066 [US5] Implement pattern learning stub for recurring free time (future enhancement, basic logging only)

**Checkpoint**: User Story 5 complete - test with quickstart.md scenarios (lunch time suggestions, busy calendar fallback, integration choice)

---

## Phase 8: Additional Functional Requirements (Cross-Cutting)

**Purpose**: Requirements not tied to specific user stories

- [ ] T067 [P] Implement update_task tool in mcp-server/src/tools/task-tools.ts (search-before-action pattern per FR-026)
- [ ] T068 [P] Implement bulk_complete_tasks tool in mcp-server/src/tools/task-tools.ts (threshold-based confirmation per FR-037)
- [ ] T069 [P] Add rate limiting to MCP server in mcp-server/src/server.ts (100 requests/minute per user)
- [ ] T070 Add ambiguous reference handling in Vikunja specialist workflow (context-aware inference per FR-038)
- [ ] T071 Add token usage tracking to logging in mcp-server/src/utils/logger.ts (log to ToolExecutionLog.tokensUsed per FR-027b)
- [ ] T072 Add cost tracking dashboard queries in PostgreSQL (aggregate token usage per agent, per user)

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T073 [P] Create comprehensive .env.example file in mcp-server/ (all config options documented)
- [ ] T074 [P] Add MCP server health check endpoint in mcp-server/src/server.ts (/health per quickstart.md)
- [ ] T075 [P] Create PostgreSQL auto-cleanup job for expired conversations (30-day retention per data-model.md)
- [ ] T076 [P] Document n8n workflow import process in n8n-workflows/README.md
- [ ] T077 [P] Create system monitoring guide in docs/architecture/monitoring.md (logging queries, performance metrics)
- [ ] T078 Validate all workflows against quickstart.md test scenarios (run through all 6 test cases)
- [ ] T079 Performance optimization: Add Redis caching for frequent searches (optional fallback per research.md)
- [ ] T080 Security audit: Review all userId validation and confirmation token usage
- [ ] T081 Run constitution compliance check: Verify 99%+ accuracy on test scenarios (SC-001)
- [ ] T082 Run constitution compliance check: Verify <$0.10 per 1000 interactions with Gemini Flash Lite (SC-011)
- [ ] T083 Update main project README.md with AI agent system overview and links to specs/011-ai-agent-architecture/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3 - P1)**: Depends on Foundational phase - MVP priority
- **User Story 2 (Phase 4 - P2)**: Depends on Foundational phase - Can run parallel with US1 if different developers
- **User Story 4 (Phase 5 - P2)**: Depends on Foundational phase - Can run parallel with US1/US2
- **User Story 3 (Phase 6 - P3)**: Depends on Foundational + US1 tools (search, create) - Complex state management
- **User Story 5 (Phase 7 - P3)**: Depends on Foundational + US2 tools (recommendations) - Calendar integration
- **Additional Requirements (Phase 8)**: Depends on all user stories for integration testing
- **Polish (Phase 9)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent from US1
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Independent from US1/US2
- **User Story 3 (P3)**: Requires US1 complete (uses search_tasks, create_task tools)
- **User Story 5 (P3)**: Requires US2 complete (builds on recommendation patterns)

### Within Each User Story

**User Story 1 Flow**:
1. T017-T019 (tools) can run in parallel
2. T020-T021 (service layer) depend on T017-T019
3. T022-T025 (workflows) depend on T017-T021
4. T026-T029 (error handling) depend on T022-T025

**User Story 2 Flow**:
1. T030-T031 (tools) can run in parallel
2. T032-T036 (service logic) can run in parallel after foundational
3. T037-T038 (workflow integration) depend on T030-T036

**User Story 4 Flow**:
1. T039-T040 (date parser + tool) can run in parallel
2. T041-T046 (workflow logic) depend on T039-T040

**User Story 3 Flow**:
1. T047 (tool) first
2. T048-T050 (state machine) depend on T047
3. T051-T056 (conversation logic) sequential after T048-T050

**User Story 5 Flow**:
1. T057-T059 (specialist setup + API client) can run in parallel
2. T060-T061 (calendar tools) can run in parallel after T059
3. T062-T066 (integration) sequential after T060-T061

### Parallel Opportunities

- **Phase 1**: T002-T005 (all setup tasks can run in parallel)
- **Phase 2**: T007-T010 (PostgreSQL schemas), T011-T013 (utilities), T015-T016 (prompts) can all run in parallel after T006
- **User Stories**: After Phase 2, US1 + US2 + US4 can all start in parallel (different files, no shared dependencies)
- **Phase 9**: T073-T077 (documentation) can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Start tools in parallel (T017-T019):
Task: "Implement search_tasks tool in mcp-server/src/tools/search-tools.ts"
Task: "Implement complete_task tool in mcp-server/src/tools/task-tools.ts"
Task: "Implement confirm_complete_task tool in mcp-server/src/tools/task-tools.ts"

# After tools complete, start service layer (T020-T021):
Task: "Add search result validation in mcp-server/src/services/task-service.ts"
Task: "Add multilingual task matching in mcp-server/src/services/search-service.ts"

# After services, workflows can proceed sequentially (T022-T029)
```

---

## Parallel Example: Multiple User Stories

```bash
# After Phase 2 (Foundational) completes, launch in parallel:
Developer 1: Phase 3 (User Story 1) - T017-T029
Developer 2: Phase 4 (User Story 2) - T030-T038
Developer 3: Phase 5 (User Story 4) - T039-T046

# Each developer works independently until their story is complete
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Recommendation**: Launch with User Story 1 only for initial deployment

- **Phase 1**: Setup (T001-T005)
- **Phase 2**: Foundational (T006-T016)
- **Phase 3**: User Story 1 - Task Completion (T017-T029)
- **Phase 9**: Minimal polish (T073-T074, T081, T083)

**Rationale**: US1 solves the critical reliability issue (wrong task completion) and demonstrates the core search-before-action pattern. Once proven in production, expand to US2/US4 for additional value.

### Incremental Delivery Plan

1. **Sprint 1** (MVP): Phase 1 + Phase 2 + Phase 3 (US1) + minimal Phase 9
2. **Sprint 2**: Phase 4 (US2) + Phase 5 (US4) - Add recommendations and reminders
3. **Sprint 3**: Phase 6 (US3) - Add project planning (complex state management)
4. **Sprint 4**: Phase 7 (US5) - Add calendar integration
5. **Sprint 5**: Phase 8 + complete Phase 9 - Polish and optimization

### Testing Checkpoints

After each user story phase:
1. Run corresponding test scenarios from quickstart.md
2. Verify independent functionality (story works without others)
3. Check constitution compliance (accuracy, cost, performance)
4. Document any deviations or issues in specs/011-ai-agent-architecture/issues.md

---

## Task Summary

**Total Tasks**: 83

**Breakdown by Phase**:
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 11 tasks (BLOCKING)
- Phase 3 (US1 - P1): 13 tasks 🎯 MVP
- Phase 4 (US2 - P2): 9 tasks
- Phase 5 (US4 - P2): 8 tasks
- Phase 6 (US3 - P3): 10 tasks
- Phase 7 (US5 - P3): 10 tasks
- Phase 8 (Additional): 6 tasks
- Phase 9 (Polish): 11 tasks

**Parallelizable Tasks**: 34 marked with [P]

**User Story Task Distribution**:
- US1 (Task Completion): 13 tasks
- US2 (Recommendations): 9 tasks
- US3 (Project Planning): 10 tasks
- US4 (Reminders): 8 tasks
- US5 (Calendar Integration): 10 tasks

**Independent Test Criteria**:
- ✅ US1: Create test tasks, issue completion statements, verify correct task marked/clarified
- ✅ US2: Create tasks with dates/priorities, ask for recommendations, verify proper sorting
- ✅ US3: Initiate planning conversation, verify questions asked, check project created correctly
- ✅ US4: Issue reminder requests, verify tasks created with correct dates
- ✅ US5: Test with calendar data, verify free time detection and suggestions

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (US1) = 29 tasks (35% of total, highest value)

**Format Validation**: ✅ All tasks follow required checklist format with checkboxes, IDs, labels, and file paths
