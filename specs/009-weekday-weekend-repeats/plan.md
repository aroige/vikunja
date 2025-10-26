# Implementation Plan: Weekday and Weekend Repeat Patterns

**Branch**: `009-weekday-weekend-repeats` | **Date**: October 26, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-weekday-weekend-repeats/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add weekday-only (Monday-Friday) and weekend-only (Saturday-Sunday) repeat patterns for tasks. Users can quickly set tasks to repeat on working days or weekends through intuitive preset buttons in the UI. The implementation extends the existing `RepeatMode` system to support day-of-week filtering when calculating next task occurrences. Backend API, frontend UI, and MCP server integration all support the new patterns.

## Technical Context

**Language/Version**: Go 1.21+ (backend), TypeScript 5.x with Node.js 22+ (frontend, MCP server)  
**Primary Dependencies**: 
- Backend: XORM (database ORM), Echo/Gin web framework
- Frontend: Vue 3 (Composition API), Pinia (state), Bulma CSS, TypeScript
- MCP Server: @modelcontextprotocol/sdk, Express 4.x, Zod (validation)

**Storage**: MySQL, PostgreSQL, or SQLite (multi-database support via XORM)  
**Testing**: 
- Backend: Go test (`mage test:feature`, `mage test:web`) with `testutil.Init()`
- Frontend: Vitest (unit), Cypress (E2E)
- MCP Server: Vitest

**Target Platform**: Web application (desktop & mobile browsers), MCP-compatible AI agents  
**Project Type**: Web (backend + frontend + MCP server integration)  
**Performance Goals**: <200ms p95 API latency, <3s initial frontend load, <500KB gzipped bundle  
**Constraints**: 90%+ test coverage (service layer), maintain backward compatibility with existing repeat functionality  
**Scale/Scope**: Enhancement to existing task repeat system affecting ~20 backend files, ~10 frontend components, ~5 MCP server files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Standards ✅ PASS
- **Architecture**: Service layer (TaskService) will handle repeat logic, handlers route HTTP requests, models provide data access only
- **Quality Gates**: Will run `mage lint:fix` (Go), `pnpm lint:fix` (frontend) before commits
- **Technical Debt**: None anticipated - extending existing repeat system cleanly
- **Rationale**: Follows existing "Chef, Waiter, Pantry" pattern for repeat logic

### II. Test-First Development ✅ PASS
- **TDD Cycle**: Write service tests first for weekday/weekend calculation logic
- **Coverage**: Target 90%+ for new service methods, test both positive cases and edge cases
- **Backend Tests**: Add to `pkg/services/task_test.go` and `pkg/webtests/`
- **Frontend Tests**: Unit tests for repeat components, E2E for task creation flow
- **Rationale**: Repeat date calculation is complex - tests prevent regression

### III. User Experience Consistency ✅ PASS
- **Frontend Stack**: Vue 3 Composition API + TypeScript (existing RepeatAfter.vue component)
- **Components**: Extend `src/components/tasks/partials/RepeatAfter.vue` with weekday/weekend preset buttons
- **Accessibility**: Keyboard navigation, WCAG AA contrast for new buttons
- **i18n**: Add keys to `en.json` for "Weekdays", "Weekends" labels
- **Rationale**: Preset buttons match existing "Every Day" / "Every Week" UX pattern

### IV. Performance Requirements ✅ PASS
- **Backend**: Repeat calculation adds minimal overhead (<5ms), no new database queries
- **Frontend**: No new API calls (existing task endpoints), preset buttons are instant
- **Impact**: Negligible performance impact - calculation is simple date arithmetic
- **Rationale**: Day-of-week checking is O(1) operation

### V. Security & Reliability Standards ✅ PASS
- **Auth**: Existing task permission system unchanged (Read/Write/Admin)
- **Input Validation**: Validate repeat pattern enum values in API and frontend
- **Data Protection**: No new sensitive data, repeat patterns stored in existing task fields
- **Error Handling**: Graceful fallback if invalid pattern specified
- **Database**: Migration to add new repeat mode values, reversible
- **Rationale**: Security model unchanged - no new attack surface

**GATE RESULT**: ✅ ALL CHECKS PASSED - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
# Web application structure (backend + frontend + MCP server)
pkg/
├── models/
│   └── tasks.go                     # Add RepeatModeWeekdays(3), RepeatModeWeekends(4) constants
├── services/
│   ├── task.go                      # Extend UpdateDone() with weekday/weekend logic
│   └── task_test.go                 # Add tests for weekday/weekend repeat calculations
├── routes/api/v1/
│   └── tasks.go                     # No changes (uses existing create/update endpoints)
└── migration/
    └── 20251026_add_weekday_weekend_modes.go  # Add new repeat modes if needed

frontend/
├── src/
│   ├── components/tasks/partials/
│   │   └── RepeatAfter.vue          # Add "Weekdays" and "Weekends" preset buttons
│   ├── types/
│   │   └── IRepeatMode.ts           # Add REPEAT_MODE_WEEKDAYS(3), REPEAT_MODE_WEEKENDS(4)
│   ├── models/
│   │   └── task.ts                  # Update parseRepeatAfter if needed
│   ├── services/
│   │   └── task.ts                  # No API changes (existing endpoints)
│   └── i18n/lang/
│       └── en.json                  # Add "task.repeat.weekdays", "task.repeat.weekends"
└── tests/
    └── unit/components/tasks/
        └── RepeatAfter.test.ts      # Test new preset buttons

mcp-server/
├── src/
│   ├── tools/
│   │   └── tasks.ts                 # Update repeat_mode description to include modes 3 & 4
│   ├── vikunja/
│   │   └── types.ts                 # Add WEEKDAYS(3), WEEKENDS(4) to RepeatMode enum
│   └── docs/
│       └── TOOLS.md                 # Document weekday/weekend examples
└── tests/
    └── tools/
        └── tasks.test.ts            # Add validation tests for modes 3 & 4
```

**Structure Decision**: Extends existing web application structure. Changes are localized to:
1. **Backend** (`pkg/`): Minimal changes to repeat calculation logic in `models/tasks.go` and `services/task.go`
2. **Frontend** (`frontend/src/`): Enhanced UI in `RepeatAfter.vue` component, new repeat mode constants
3. **MCP Server** (`mcp-server/src/`): Documentation updates, schema validation for new modes
4. **Testing**: Comprehensive tests at all three layers following existing patterns

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - This feature fully complies with all Constitution principles:

| Principle | Compliance | Notes |
|-----------|------------|-------|
| Code Quality Standards | ✅ Pass | Follows service-layer architecture, no circular dependencies |
| Test-First Development | ✅ Pass | TDD approach with 90%+ coverage target |
| User Experience Consistency | ✅ Pass | Matches existing preset button pattern |
| Performance Requirements | ✅ Pass | <5ms overhead, no new database queries |
| Security & Reliability | ✅ Pass | Existing auth model, input validation added |

---

## Phase 0: Research & Design (Complete)

✅ **Status**: All unknowns resolved

**Outputs**:
- [research.md](./research.md) - 8 research areas with decisions and rationales
- Key decisions:
  - Extend RepeatMode enum (values 3, 4)
  - Skip-to-next-valid-day calculation algorithm
  - Preset buttons in existing UI
  - No new API endpoints or database migration

---

## Phase 1: Design & Contracts (Complete)

✅ **Status**: Data model and contracts defined

**Outputs**:
- [data-model.md](./data-model.md) - Entity definitions, validation rules, calculation logic
- [contracts/api-spec.md](./contracts/api-spec.md) - API endpoints, request/response schemas, validation
- [quickstart.md](./quickstart.md) - Developer implementation guide with examples

**Agent Context Update**:
- ✅ Updated `.github/copilot-instructions.md` with Go 1.21+, TypeScript 5.x, XORM database info

---

## Constitution Re-Check (Post-Design)

### I. Code Quality Standards ✅ PASS
- **Service Layer**: Repeat logic in `models/tasks.go` with `UpdateDone()` function (existing pattern)
- **No Circular Dependencies**: New modes extend existing switch statement, no new imports
- **Frontend**: Vue 3 + TypeScript, extends `RepeatAfter.vue` component
- **Technical Debt**: None - clean extension of existing system

### II. Test-First Development ✅ PASS
- **TDD Plan**: Write tests in `pkg/services/task_test.go` before implementation
- **Coverage**: 90%+ target for weekday/weekend calculation functions
- **Test Locations**: Backend (`task_test.go`), Frontend (`RepeatAfter.test.ts`), MCP (`tasks.test.ts`)
- **Edge Cases**: Friday→Monday, Sunday→Saturday, no due date scenarios

### III. User Experience Consistency ✅ PASS
- **UI Pattern**: Preset buttons match existing "Every Day" / "Every Week" style
- **Accessibility**: Keyboard navigation, screen reader labels, WCAG AA contrast
- **i18n**: Translation keys added to `en.json` (backend & frontend)
- **Mobile**: Bulma responsive buttons work on all screen sizes

### IV. Performance Requirements ✅ PASS
- **Calculation**: Simple date arithmetic (<1ms per task)
- **API Latency**: No change (validation adds <1ms)
- **Frontend**: Preset buttons render instantly (no async operations)
- **Database**: No new queries, no schema migration

### V. Security & Reliability Standards ✅ PASS
- **Auth**: Existing task permissions unchanged (Read/Write/Admin)
- **Input Validation**: `repeat_mode` range 0-4 enforced in backend & frontend
- **SQL Injection**: XORM parameterized queries (no raw SQL)
- **Rollback**: No database migration, can revert code cleanly

**GATE RESULT**: ✅ ALL RE-CHECKS PASSED - Ready for Phase 2 (Tasks)

---

## Next Phase

**Phase 2: Implementation Tasks** - Run `/speckit.tasks` to generate task breakdown

This will create `tasks.md` with detailed implementation steps organized by:
- User Story prioritization (P1, P2, P3)
- Layer (Backend → Frontend → MCP Server)
- Dependencies and test requirements

