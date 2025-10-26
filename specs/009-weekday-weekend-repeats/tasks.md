# Tasks: Weekday and Weekend Repeat Patterns

**Input**: Design documents from `/specs/009-weekday-weekend-repeats/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Following Constitution requirement for Test-First Development with 90%+ coverage target.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Backend: `pkg/models/`, `pkg/services/`
- Frontend: `frontend/src/components/`, `frontend/src/types/`
- MCP Server: `mcp-server/src/tools/`, `mcp-server/src/vikunja/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new infrastructure needed - extending existing repeat system

- [x] T001 Review existing repeat mode system in pkg/models/tasks.go (TaskRepeatMode enum, UpdateDone function)
- [x] T002 Review existing frontend repeat UI in frontend/src/components/tasks/partials/RepeatAfter.vue
- [x] T003 Review existing MCP server task tools in mcp-server/src/tools/tasks.ts

**Checkpoint**: Understanding of current architecture complete - ready for implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend calculation logic that ALL user stories depend on

**⚠️ CRITICAL**: No user story work (UI, MCP) can begin until backend calculation functions are implemented and tested

### Backend Foundation

- [x] T004 [P] Add TaskRepeatModeWeekdays (3) and TaskRepeatModeWeekends (4) constants to pkg/models/tasks.go RepeatMode enum
- [x] T005 [P] Update RepeatMode validation tag in pkg/models/tasks.go from valid:"range(0|2)" to valid:"range(0|4)"
- [x] T006 Write test for weekday Friday→Monday skip in pkg/services/task_test.go (TestTaskService_WeekdayRepeat_FridayToMonday)
- [x] T007 Write test for weekday Thursday→Friday in pkg/services/task_test.go (TestTaskService_WeekdayRepeat_ThursdayToFriday)
- [x] T008 Write test for weekend Sunday→Saturday skip in pkg/services/task_test.go (TestTaskService_WeekendRepeat_SundayToSaturday)
- [x] T009 Write test for weekend Friday→Saturday skip in pkg/services/task_test.go (TestTaskService_WeekendRepeat_FridayToSaturday)
- [x] T010 Write test for weekday task with no due date in pkg/services/task_test.go (TestTaskService_WeekdayRepeat_NoDueDate)
- [x] T011 Implement setTaskDatesWeekdayRepeat function in pkg/models/tasks.go (skip Saturday→Monday+2, Sunday→Monday+1)
- [x] T012 Implement setTaskDatesWeekendRepeat function in pkg/models/tasks.go (skip Monday-Friday→Saturday)
- [x] T013 Add case TaskRepeatModeWeekdays to UpdateDone switch statement in pkg/models/tasks.go
- [x] T014 Add case TaskRepeatModeWeekends to UpdateDone switch statement in pkg/models/tasks.go
- [x] T015 Run backend tests: mage test:feature (verify all 7 new tests pass)
- [x] T016 Run backend linter: mage lint:fix (ensure no style violations)

**Checkpoint**: Backend calculation logic complete and tested - frontend and MCP can now proceed in parallel

---

## Phase 3: User Story 1 - Set Weekday Repeat Pattern (Priority: P1) 🎯 MVP

**Goal**: Users can create/update tasks that repeat only Monday-Friday, skipping weekends

**Independent Test**: Create a task "Daily standup" with weekday repeat pattern. Complete on Friday. Verify next occurrence is Monday.

### Frontend Implementation for User Story 1

- [x] T017 [P] [US1] Add REPEAT_MODE_WEEKDAYS: 3 to TASK_REPEAT_MODES constant in frontend/src/types/IRepeatMode.ts
- [x] T018 [P] [US1] Add translation key "weekdays": "Weekdays" to frontend/src/i18n/lang/en.json under task.repeat
- [x] T019 [P] [US1] Add translation key "weekdaysDescription": "Repeats Monday through Friday only" to frontend/src/i18n/lang/en.json
- [x] T020 [US1] Add "Weekdays" preset button to frontend/src/components/tasks/partials/RepeatAfter.vue template (after "Every 30d" button)
- [x] T021 [US1] Update setRepeatAfter method in frontend/src/components/tasks/partials/RepeatAfter.vue to accept repeatMode parameter
- [x] T022 [US1] Wire "Weekdays" button click to call setRepeatAfter(1, 'days', TASK_REPEAT_MODES.REPEAT_MODE_WEEKDAYS)
- [x] T023 [US1] Add aria-label="Repeat on weekdays only" to weekdays button for accessibility
- [x] T024 [US1] Write unit test for weekdays button click in frontend/tests/unit/components/tasks/RepeatAfter.test.ts
- [x] T025 [US1] Write unit test verifying repeatMode=3 emitted on weekdays preset in frontend/tests/unit/components/tasks/RepeatAfter.test.ts
- [x] T026 [US1] Run frontend tests: cd frontend && pnpm test:unit (verify RepeatAfter tests pass)
- [x] T027 [US1] Run frontend linter: cd frontend && pnpm lint:fix (ensure no violations)

### Integration Testing for User Story 1

- [ ] T028 [US1] Manual test: Create task with weekdays preset, verify repeat_mode=3 in API payload
- [ ] T029 [US1] Manual test: Complete Friday weekday task, verify next occurrence is Monday
- [ ] T030 [US1] Manual test: View calendar, verify no Saturday/Sunday instances for weekday task
- [x] T031 [US1] Write web test for weekday task creation in pkg/webtests/task_weekday_test.go
- [x] T032 [US1] Write web test for Friday→Monday completion in pkg/webtests/task_weekday_test.go
- [x] T033 [US1] Run web tests: mage test:web (verify new weekday tests pass)

**Checkpoint**: User Story 1 complete - users can create and manage weekday-only recurring tasks

---

## Phase 4: User Story 2 - Set Weekend Repeat Pattern (Priority: P2)

**Goal**: Users can create/update tasks that repeat only Saturday-Sunday, skipping weekdays

**Independent Test**: Create a task "Clean house" with weekend repeat pattern. Complete on Sunday. Verify next occurrence is Saturday.

### Frontend Implementation for User Story 2

- [x] T034 [P] [US2] Add REPEAT_MODE_WEEKENDS: 4 to TASK_REPEAT_MODES constant in frontend/src/types/IRepeatMode.ts
- [x] T035 [P] [US2] Add translation key "weekends": "Weekends" to frontend/src/i18n/lang/en.json under task.repeat
- [x] T036 [P] [US2] Add translation key "weekendsDescription": "Repeats Saturday and Sunday only" to frontend/src/i18n/lang/en.json
- [x] T037 [US2] Add "Weekends" preset button to frontend/src/components/tasks/partials/RepeatAfter.vue template (after "Weekdays" button)
- [x] T038 [US2] Wire "Weekends" button click to call setRepeatAfter(1, 'days', TASK_REPEAT_MODES.REPEAT_MODE_WEEKENDS)
- [x] T039 [US2] Add aria-label="Repeat on weekends only" to weekends button for accessibility
- [x] T040 [US2] Write unit test for weekends button click in frontend/tests/unit/components/tasks/RepeatAfter.test.ts
- [x] T041 [US2] Write unit test verifying repeatMode=4 emitted on weekends preset in frontend/tests/unit/components/tasks/RepeatAfter.test.ts
- [x] T042 [US2] Run frontend tests: cd frontend && pnpm test:unit (verify all RepeatAfter tests pass)
- [x] T043 [US2] Run frontend linter: cd frontend && pnpm lint:fix

### Integration Testing for User Story 2

- [ ] T044 [US2] Manual test: Create task with weekends preset, verify repeat_mode=4 in API payload
- [ ] T045 [US2] Manual test: Complete Sunday weekend task, verify next occurrence is Saturday
- [ ] T046 [US2] Manual test: View calendar, verify no Monday-Friday instances for weekend task
- [x] T047 [US2] Write web test for weekend task creation in pkg/webtests/task_weekend_test.go
- [x] T048 [US2] Write web test for Sunday→Saturday completion in pkg/webtests/task_weekend_test.go
- [x] T049 [US2] Run web tests: mage test:web (verify all weekday and weekend tests pass)

**Checkpoint**: User Story 2 complete - users can create and manage weekend-only recurring tasks

---

## Phase 5: User Story 3 - Quick Selection in Task Creation UI (Priority: P3)

**Goal**: Enhanced UI with both weekday and weekend presets visible and easily accessible

**Independent Test**: Open task creation form. Verify "Weekdays" and "Weekends" buttons are visible and functional.

### UI Polish for User Story 3

- [x] T050 [P] [US3] Verify button layout responsive on mobile in frontend/src/components/tasks/partials/RepeatAfter.vue (Bulma breakpoints)
- [x] T051 [P] [US3] Add hover states to weekday/weekend buttons matching existing preset button styles
- [x] T052 [P] [US3] Verify keyboard navigation works (Tab to buttons, Enter/Space to activate)
- [x] T053 [US3] Test with screen reader (NVDA/VoiceOver) to verify aria-labels are announced correctly
- [x] T054 [US3] Verify WCAG AA contrast ratio for button text and backgrounds
- [x] T055 [US3] Add visual indicator when weekday/weekend preset is active (is-active class)
- [ ] T056 [US3] Write E2E test: Click weekdays preset, submit form, verify task created with mode 3 in frontend/cypress/e2e/task-repeat.cy.ts
- [ ] T057 [US3] Write E2E test: Click weekends preset, submit form, verify task created with mode 4 in frontend/cypress/e2e/task-repeat.cy.ts
- [ ] T058 [US3] Write E2E test: Switch between presets, verify previous selection is replaced in frontend/cypress/e2e/task-repeat.cy.ts

**Checkpoint**: User Story 3 complete - preset buttons provide excellent UX with full accessibility

---

## Phase 6: User Story 4 - MCP Server Support (Priority: P3)

**Goal**: AI agents can create/update tasks with weekday/weekend patterns via MCP server

**Independent Test**: Use MCP server API to create task with repeat_mode=3. Verify task is created and repeats on weekdays only.

### MCP Server Implementation for User Story 4

- [x] T059 [P] [US4] Add WEEKDAYS = 3 to RepeatMode enum in mcp-server/src/vikunja/types.ts with JSDoc comment
- [x] T060 [P] [US4] Add WEEKENDS = 4 to RepeatMode enum in mcp-server/src/vikunja/types.ts with JSDoc comment
- [x] T061 [P] [US4] Update CreateTaskSchema repeat_mode validation in mcp-server/src/tools/tasks.ts from max(2) to max(4)
- [x] T062 [P] [US4] Update UpdateTaskSchema repeat_mode validation in mcp-server/src/tools/tasks.ts from max(2) to max(4)
- [x] T063 [US4] Update repeat_mode description in CreateTaskSchema to include "3=WEEKDAYS (Monday-Friday only), 4=WEEKENDS (Saturday-Sunday only)"
- [x] T064 [US4] Update repeat_mode description in UpdateTaskSchema to include modes 3 and 4
- [x] T065 [US4] Write test for repeat_mode=3 validation in mcp-server/tests/tools/tasks.test.ts (should accept weekdays)
- [x] T066 [US4] Write test for repeat_mode=4 validation in mcp-server/tests/tools/tasks.test.ts (should accept weekends)
- [x] T067 [US4] Write test for repeat_mode=5 validation in mcp-server/tests/tools/tasks.test.ts (should reject invalid)
- [x] T068 [US4] Run MCP tests: cd mcp-server && pnpm test --run (verify all task schema tests pass)
- [x] T069 [US4] Run MCP type check: npx tsc --noEmit (no type errors)

### MCP Server Documentation for User Story 4

- [x] T070 [P] [US4] Add weekday pattern example to mcp-server/docs/TOOLS.md under create_task section
- [x] T071 [P] [US4] Add weekend pattern example to mcp-server/docs/TOOLS.md under create_task section
- [x] T072 [P] [US4] Update repeat_mode table in mcp-server/docs/TOOLS.md to include modes 3 and 4
- [x] T073 [US4] Add "Weekday and Weekend Patterns" section to mcp-server/README.md with examples
- [ ] T074 [US4] Manual test: Use MCP client to create task with repeat_mode=3, verify API accepts it
- [ ] T075 [US4] Manual test: Use MCP client to create task with repeat_mode=4, verify API accepts it

**Checkpoint**: User Story 4 complete - MCP server fully supports weekday/weekend patterns

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

### Code Quality

- [ ] T076 [P] Run full backend test suite: mage test:feature (all tests must pass)
- [ ] T077 [P] Run full backend web tests: mage test:web (all integration tests must pass)
- [ ] T078 [P] Run backend linter: mage lint:fix (zero violations)
- [ ] T079 [P] Run backend formatter: mage fmt (code formatted)
- [ ] T080 [P] Run frontend test suite: cd frontend && pnpm test:unit (all tests pass)
- [ ] T081 [P] Run frontend linter: cd frontend && pnpm lint:fix (zero violations)
- [ ] T082 [P] Run frontend style linter: cd frontend && pnpm lint:styles:fix (zero violations)
- [ ] T083 [P] Run frontend type check: cd frontend && pnpm typecheck (no type errors)
- [ ] T084 [P] Run MCP test suite: cd mcp-server && pnpm test (all tests pass)
- [ ] T085 [P] Run MCP type check: cd mcp-server && pnpm typecheck (no type errors)

### Documentation

- [ ] T086 [P] Review and update frontend/src/i18n/lang/en.json for completeness (verify all translation keys added)
- [ ] T087 [P] Verify quickstart.md manual test scenarios still accurate
- [ ] T088 [P] Update .github/copilot-instructions.md if any new patterns introduced (likely not needed)
- [ ] T089 Review AGENTS.md to ensure repeat pattern examples are current

### Regression Fixes

- [ ] T089a [REGRESSION] Fix preset button highlighting logic in RepeatAfter.vue: Weekdays/Weekends buttons show blue highlight on click, but Every Day/Week/30 Days buttons don't. After reload, incorrect button (weekdays or weekends) gets highlighted for standard repeat patterns. Root cause: Button active state logic incorrectly infers repeat_mode from repeat_after interval, should use actual repeat_mode value.

- [ ] T089b [REGRESSION] Fix undefined "deferTaskUpdate" property error in SingleTaskInProject.vue: When clicking due date to view calendar in task list, console shows "Property 'deferTaskUpdate' was accessed during render but is not defined on instance" (line 99). Error originates from DeferTask.vue:129 calling updateDueDate and emitting to parent component. Root cause: SingleTaskInProject.vue template references deferTaskUpdate prop/method at line 99 that is not defined in component's setup/data/methods. Also triggering "Invalid value type passed to callWithAsyncErrorHandling(): undefined" in DeferTask.vue:129.

- [ ] T089c [REGRESSION] Fix TipTap duplicate extension warning in TaskDetailView.vue: When clicking task in task list to open details, console shows "[tiptap warn]: Duplicate extension names found: ['link', 'underline']. This can lead to issues." (line 756). Error occurs during Editor initialization in watch.immediate at line 733-756. Root cause: TipTap Editor being configured with duplicate 'link' and 'underline' extensions, likely registered multiple times in extensions array. This can cause conflicts and unpredictable behavior in rich text editing.

### Final Validation

- [ ] T090 Follow quickstart.md scenario 1: Create weekday task, mark done on Friday, verify Monday next occurrence
- [ ] T091 Follow quickstart.md scenario 2: Create weekend task, mark done on Sunday, verify Saturday next occurrence
- [ ] T092 Follow quickstart.md scenario 3: Use MCP server API to create weekday task via curl/Postman
- [ ] T093 Test backward compatibility: Verify existing tasks with modes 0, 1, 2 still work correctly
- [ ] T094 Test validation: Attempt to create task with repeat_mode=5, verify error is returned
- [ ] T095 Test UI edge case: Rapidly click between weekday and weekend presets, verify last clicked is applied
- [ ] T096 Performance check: Create 10 weekday tasks, mark all done, verify <200ms p95 response time (use mage dev tools or profiling)
- [ ] T097 Accessibility audit: Run axe DevTools on task creation page with preset buttons visible
- [ ] T098 Code review checklist: Verify all items from quickstart.md code review section
- [ ] T098a [REGRESSION TEST] Verify preset button highlighting: Click "Every Day" → reload task → verify Weekdays/Weekends NOT highlighted. Click "Every Week" → reload task → verify Weekdays/Weekends NOT highlighted. Click "Weekdays" → reload task → verify ONLY Weekdays highlighted. Click "Weekends" → reload task → verify ONLY Weekends highlighted.
- [ ] T098b [REGRESSION TEST] Verify no console errors when opening calendar from task list: Open task list → click any task's due date to open calendar popup → verify NO "deferTaskUpdate" property errors in console. Verify NO "Invalid value type" errors in console. Verify calendar opens and functions correctly.
- [ ] T098c [REGRESSION TEST] Verify no TipTap duplicate extension warnings: Open task list → click any task to open task detail view → verify NO "[tiptap warn]: Duplicate extension names" warnings in console. Verify rich text editor initializes correctly. Edit task description → verify text formatting (bold, italic, link, underline) works correctly without conflicts.
- [ ] T099 Commit with conventional commit message: "feat: add weekday and weekend repeat patterns for tasks"
- [ ] T100 Push feature branch and create PR with description linking to spec.md

**Checkpoint**: Feature complete, tested, documented, and ready for review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - review existing code (1-2 hours)
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories (4-6 hours)
  - ⚠️ **CRITICAL BLOCKER**: Backend calculation logic must be complete before any UI/MCP work
- **User Story 1 (Phase 3)**: Can start after Foundational (Phase 2) - 3-4 hours
- **User Story 2 (Phase 4)**: Can start after Foundational (Phase 2) - Independent of US1 but builds on same pattern (2-3 hours)
- **User Story 3 (Phase 5)**: Can start after US1 + US2 complete - Polish/UX work (2-3 hours)
- **User Story 4 (Phase 6)**: Can start after Foundational (Phase 2) - Independent of US1-3 (2-3 hours)
- **Polish (Phase 7)**: Depends on all user stories being complete (2-3 hours)

### User Story Dependencies

- **User Story 1 (P1 - MVP)**: Depends on Foundational (Phase 2) - No dependencies on other stories
  - Can ship as MVP with just weekday support
- **User Story 2 (P2)**: Depends on Foundational (Phase 2) - Independent of US1 (shares same backend logic)
  - Completes the weekday/weekend pair
- **User Story 3 (P3)**: Depends on US1 + US2 being implemented - UI polish for both patterns
  - Enhances UX but not blocking for functionality
- **User Story 4 (P4)**: Depends on Foundational (Phase 2) - Independent of US1-3 (different interface)
  - Can be implemented in parallel with frontend work

### Within Each Phase

**Phase 2 (Foundational)**:
1. T004-T005: Backend constants and validation (parallel)
2. T006-T010: Write all tests first (TDD - parallel)
3. T011-T012: Implement calculation functions (parallel)
4. T013-T014: Update switch statement (sequential after T011-T012)
5. T015-T016: Run tests and linter (sequential)

**Phase 3 (User Story 1)**:
1. T017-T019: Frontend constants and i18n (parallel)
2. T020-T023: Button implementation (sequential)
3. T024-T025: Unit tests (parallel)
4. T026-T027: Run tests and linter (sequential)
5. T028-T033: Integration testing (sequential)

**Phase 4 (User Story 2)**:
Same pattern as Phase 3, all tasks can run in parallel with US1 if team capacity allows

**Phase 6 (User Story 4)**:
All MCP implementation tasks (T059-T069) can run in parallel
Documentation tasks (T070-T073) can run in parallel
Manual tests (T074-T075) are sequential

**Phase 7 (Polish)**:
Most tasks are parallel (test runs, linting)
T090-T098 are sequential manual validation

### Parallel Opportunities

**Maximum Parallelization (4 parallel tracks after Foundational complete)**:

**Track 1: Backend Foundational (MUST complete first)**
- T004-T016 (Phase 2)

**After Foundational, these can run in parallel**:

**Track 2: Frontend Weekday (US1)**
- T017-T027 (Phase 3)

**Track 3: Frontend Weekend (US2)**
- T034-T043 (Phase 4)

**Track 4: MCP Server (US4)**
- T059-T069 (Phase 6)

**Track 5: UI Polish (US3) - Depends on Track 2+3 complete**
- T050-T058 (Phase 5)

### Minimum Sequential Path (MVP = User Story 1 only)

For fastest MVP delivery (weekday support only):

1. Phase 1: T001-T003 (review)
2. Phase 2: T004-T016 (foundational backend)
3. Phase 3: T017-T033 (weekday frontend + tests)
4. Phase 7: T076-T100 (quality checks)

**Total MVP effort**: ~15-20 hours

### Full Feature Sequential Path

If working alone sequentially:

1. Phase 1: T001-T003 (2 hours)
2. Phase 2: T004-T016 (6 hours)
3. Phase 3: T017-T033 (4 hours)
4. Phase 4: T034-T049 (3 hours)
5. Phase 5: T050-T058 (3 hours)
6. Phase 6: T059-T075 (3 hours)
7. Phase 7: T076-T100 (3 hours)

**Total effort**: ~24 hours (3 days)

---

## Parallel Execution Examples

### Example 1: Team of 2 (Backend + Frontend specialist)

**Day 1**:
- Developer 1: T001-T016 (Foundational backend)
- Developer 2: Review existing frontend code (T002-T003)

**Day 2** (after backend complete):
- Developer 1: T059-T075 (MCP Server - US4)
- Developer 2: T017-T027 (Frontend Weekday - US1) then T034-T043 (Frontend Weekend - US2)

**Day 3**:
- Developer 1: T028-T033 (US1 integration tests) then T047-T049 (US2 integration tests)
- Developer 2: T050-T058 (UI Polish - US3)

**Day 4**:
- Both: T076-T100 (Polish & validation)

### Example 2: Solo Developer (MVP first, then complete)

**MVP Sprint (User Story 1 only)**:
- Day 1 AM: T001-T016 (Foundational)
- Day 1 PM: T017-T027 (Weekday frontend)
- Day 2 AM: T028-T033 (Weekday integration tests)
- Day 2 PM: T076-T100 (Quality checks) → **MVP SHIPPED**

**Enhancement Sprint (Complete remaining stories)**:
- Day 3 AM: T034-T043 (Weekend frontend - US2)
- Day 3 PM: T044-T049 (Weekend integration tests - US2)
- Day 4 AM: T050-T058 (UI polish - US3) + T059-T069 (MCP - US4)
- Day 4 PM: T070-T075 (MCP docs) + Final validation → **COMPLETE FEATURE SHIPPED**

### Example 3: Team of 3 (Maximum parallelization after Foundational)

**Day 1**:
- Developer 1: T001-T016 (Foundational - BLOCKING)
- Developer 2 & 3: Review and prepare

**Day 2** (after T016 complete):
- Developer 1: T017-T027 + T028-T033 (US1 complete)
- Developer 2: T034-T043 + T044-T049 (US2 complete)
- Developer 3: T059-T069 + T070-T075 (US4 complete)

**Day 3**:
- Developer 1: T050-T058 (US3)
- Developer 2: T076-T085 (Test runs)
- Developer 3: T086-T089 (Documentation)
- All: T090-T100 (Final validation)

**Total time with 3 developers**: ~2 days

---

## Implementation Strategy

### MVP First (Recommended)

**Ship User Story 1 first** (weekday support only):
- Delivers immediate value (most common use case)
- Validates architecture and UX pattern
- Gets user feedback early
- Tasks: T001-T033 + T076-T100 (~15-20 hours)

**Then iterate**:
- Add US2 (weekend support) - completes the pair
- Add US3 (UI polish) - improves UX
- Add US4 (MCP support) - extends to AI agents

### Incremental Delivery

Each user story is independently shippable:
- US1: Weekday tasks work end-to-end
- US2: Weekend tasks work end-to-end (independent of US1)
- US3: Enhanced UI works for both patterns
- US4: MCP server works for both patterns

### Testing Philosophy

Following Constitution Test-First Development:
- Write tests before implementation (T006-T010 before T011-T014)
- Target 90%+ coverage for new calculation functions
- Test at all layers: unit (service), integration (web), E2E (Cypress)
- Test edge cases: no due date, late completion, timezone

---

## Summary

- **Total Tasks**: 100
- **Phases**: 7 (Setup → Foundational → 4 User Stories → Polish)
- **Parallel Opportunities**: 40+ tasks marked [P] can run in parallel
- **MVP Scope**: User Story 1 (weekday support) = ~33 tasks
- **Full Feature**: All 4 user stories = ~90 tasks (+ 10 polish)
- **Estimated Effort**: 
  - MVP: 15-20 hours (2-3 days solo)
  - Full Feature: 24-30 hours (3-4 days solo, 2 days with team)
- **Independent Stories**: Each user story can be tested and shipped independently
- **Blocking Dependencies**: Only Phase 2 (Foundational) blocks all other work
- **Tech Stack**: Go 1.21+ (backend), Vue 3 + TypeScript (frontend), Node.js 22+ (MCP server)
