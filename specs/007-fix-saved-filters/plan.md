# Implementation Plan: Saved Filters Regression Fix

**Branch**: `007-fix-saved-filters` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-fix-saved-filters/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

**Primary Requirement**: Restore saved filters functionality to 100% working state by implementing the missing filter-to-database-query conversion in the service layer.

**Root Cause**: During the service layer refactor, filter parsing logic was moved from `pkg/models/task_collection_filter.go` to `pkg/services/task.go`, but the critical `ConvertFiltersToDBFilterCond` function and its application to database queries was never implemented in the service layer.

**Technical Approach**: 
1. Port the `convertFiltersToDBFilterCond` function from models to service layer
2. Implement the missing query filter application in `buildTaskQuery` (currently line 3227-3238 is just a placeholder)
3. Ensure complete feature parity with `~/projects/vikunja_original_main` including:
   - Support for all operators (=, !=, >, <, >=, <=, like, in, not in)
   - Complex boolean expressions (AND/OR with parentheses)
   - Special field handling (labels, assignees, reminders via EXISTS subqueries)
   - NULL value handling with filterIncludeNulls
   - Date parsing with multiple formats and timezones
4. Maintain strict adherence to Chef/Waiter/Pantry service layer architecture

## Technical Context

**Language/Version**: Go 1.21+  
**Primary Dependencies**: 
- XORM (database ORM)
- github.com/ganigeorgiev/fexpr (filter expression parsing)
- github.com/jszwedko/go-datemath (relative date parsing)
- xorm.io/builder (query building)

**Storage**: MySQL, PostgreSQL, or SQLite (multi-database support via XORM)  
**Testing**: Go testing framework with `mage test:feature` and `mage test:web`  
**Target Platform**: Linux server (API backend)  
**Project Type**: Web application (Go backend + Vue.js frontend)  
**Performance Goals**: 
- Filter parsing and execution comparable to pre-refactor implementation
- <200ms p95 latency for task queries with filters
- No N+1 queries (use EXISTS subqueries for joins)

**Constraints**: 
- MUST maintain 100% functional parity with ~/projects/vikunja_original_main
- MUST NOT modify frontend (backend-only fix)
- MUST NOT call back to models layer from services (strict architecture adherence)
- MUST use EXISTS subqueries for label/assignee filtering (not JOIN to avoid duplication)

**Scale/Scope**: 
- Single service layer file (`pkg/services/task.go`) + helper methods
- ~500 lines of filter conversion logic to port from models to services
- Comprehensive test coverage for all filter operators and edge cases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Standards ✅ PASS

**Architecture**:
- ✅ Follows "Chef, Waiter, Pantry" pattern: All filter logic will be in `TaskService` (Chef), no model business logic
- ✅ Uses `ServiceRegistry` for dependencies: TaskService already integrated
- ✅ No private model method exposure: Moving logic FROM models TO services
- ✅ Frontend unchanged: Backend-only fix, no TypeScript updates needed

**Quality Gates**:
- ✅ Will pass linting: `mage lint:fix` before commit
- ✅ Will format: `mage fmt` before commit
- N/A TypeScript: No frontend changes

**Technical Debt**:
- ⚠️ ACKNOWLEDGED: Original implementation in models layer will be deprecated but kept for backward compatibility during transition
- 📝 ACTION: Document deprecation in comments, plan removal in future phase

### II. Test-First Development ✅ PASS

**TDD Cycle**: 
- ✅ Write tests FIRST for filter conversion logic (based on original test cases)
- ✅ Implement filter conversion in service layer
- ✅ Run `mage test:feature` to verify

**Coverage**:
- ✅ Target: 90%+ service layer coverage
- ✅ Test all filter operators (=, !=, >, <, >=, <=, like, in, not in)
- ✅ Test complex boolean expressions (AND/OR/parentheses)
- ✅ Test special fields (labels, assignees, reminders)
- ✅ Test NULL handling with filterIncludeNulls
- ✅ Test date parsing with multiple formats
- ✅ Test edge cases (deleted entities, malformed expressions, invalid timezones)

**Testing Strategy**:
- Unit tests in `pkg/services/task_test.go` for filter conversion logic
- Integration tests in `pkg/services/saved_filter_test.go` for end-to-end saved filter execution
- Manual testing against test data (user: Aron, password: test, filter: "Next Actions")

### III. User Experience Consistency ✅ PASS

**Frontend**: 
- ✅ No changes required (backend-only fix)
- ✅ Existing UI continues to work without modification
- ✅ Error messages maintain same format as original implementation

**Accessibility**:
- N/A: No UI changes

**i18n**:
- ✅ Existing error messages already translatable
- N/A: No new user-facing strings

### IV. Performance Requirements ✅ PASS

**Backend**:
- ✅ Target: Comparable to pre-refactor implementation (<200ms p95)
- ✅ Use EXISTS subqueries for labels/assignees (avoids N+1 and duplicate results)
- ✅ Indexed queries: Filters applied at database level, not in-memory
- ✅ No unbounded queries: Pagination already implemented

**Monitoring**:
- ✅ Existing structured logging will capture filter execution
- ✅ No performance regression expected (same query patterns as original)

### V. Security & Reliability Standards ✅ PASS

**Auth**:
- ✅ All endpoints already enforce authentication (no changes)
- ✅ Permissions already checked via `CanRead` in TaskService

**Input Validation**:
- ✅ Filter expression parsing already validates syntax (fexpr library)
- ✅ Field name validation prevents invalid database columns
- ✅ Type conversion validates value types
- ✅ XORM parameterized queries (no SQL injection risk)

**Error Handling**:
- ✅ Wrap errors: `fmt.Errorf("...: %w", err)` pattern maintained
- ✅ Return descriptive errors (ErrInvalidTaskField, ErrInvalidFilterExpression, etc.)
- ✅ No internal details exposed to users

**Database**:
- ✅ No schema changes required
- ✅ Transactions already handled by service layer
- ✅ Multi-database support maintained (MySQL, PostgreSQL, SQLite)

**GATE RESULT: ✅ ALL CHECKS PASS - Proceed to Phase 0**

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
# Web application structure (Go backend + Vue.js frontend)

pkg/
├── services/
│   ├── task.go                    # MODIFY: Add convertFiltersToDBFilterCond + apply filters in query
│   ├── task_test.go               # MODIFY: Add comprehensive filter tests
│   ├── saved_filter.go            # VERIFY: Integration with TaskService
│   └── saved_filter_test.go       # ADD: End-to-end saved filter tests
├── models/
│   ├── task_collection_filter.go  # REFERENCE: Original filter parsing (deprecated after port)
│   ├── task_search.go             # REFERENCE: Original convertFiltersToDBFilterCond (line 159)
│   └── tasks.go                   # REFERENCE: Original getFilterCond (line ~1500)
└── routes/
    └── api/v1/                    # NO CHANGES: Routes already delegate to services

frontend/
└── (NO CHANGES: Backend-only fix)

specs/007-fix-saved-filters/
├── plan.md                        # This file
├── research.md                    # Phase 0 output (next)
├── data-model.md                  # Phase 1 output
├── quickstart.md                  # Phase 1 output
└── contracts/                     # Phase 1 output (may be minimal - no API changes)
```

**Structure Decision**: This is a web application with Go backend and Vue.js frontend. The fix is backend-only, focused on the service layer (`pkg/services/task.go`). The original implementation in `pkg/models/` serves as reference for porting logic to services following the Chef/Waiter/Pantry pattern. No frontend changes required since the API contract remains unchanged.

## Complexity Tracking

*No violations to justify - all Constitution checks passed.*

**Acknowledged Technical Debt**:
- Original `ConvertFiltersToDBFilterCond` in `pkg/models/task_search.go` will become deprecated code after service layer implementation is complete
- **Resolution**: Keep models layer implementation during transition for backward compatibility, add deprecation comments, schedule removal in future cleanup phase
- **Impact**: Minimal - models code is not called by services, only exists as reference

---

## Phase 0: Research & Discovery ✅ COMPLETE

See [research.md](./research.md) for full research findings.

### Research Tasks

1. **Filter Conversion Logic Analysis**
   - **Task**: Analyze `ConvertFiltersToDBFilterCond` in `~/projects/vikunja_original_main/pkg/models/task_search.go` (line 159)
   - **Deliverable**: Document exact logic for converting parsed filters to XORM builder conditions
   - **Key areas**: 
     - How nested filters are handled recursively
     - How subtable filters (labels, assignees, reminders) use EXISTS subqueries
     - How NULL handling works with includeNulls flag
     - How strict comparators (=, !=, in, not in) are converted to IN for subtable queries

2. **Filter Condition Building**
   - **Task**: Analyze `getFilterCond` in `~/projects/vikunja_original_main/pkg/models/tasks.go` (around line 1500)
   - **Deliverable**: Document how individual filter conditions are built for each comparator type
   - **Key areas**:
     - Mapping of taskFilterComparator to XORM builder types (Eq, Neq, Gt, Gte, Lt, Lte, Like, In, NotIn)
     - NULL handling logic (OR field IS NULL, OR field = 0 for numeric)
     - LIKE operator value formatting

3. **Subtable Filter Patterns**
   - **Task**: Analyze subtable filter definitions in `~/projects/vikunja_original_main/pkg/models/task_search.go`
   - **Deliverable**: Document SubTableFilter structure and how it generates EXISTS subqueries
   - **Key areas**:
     - labels, assignees, reminders table join patterns
     - AllowNullCheck flag behavior
     - BaseFilter and FilterableField configuration
     - How EXISTS vs NOT EXISTS is determined by comparator

4. **Query Application Strategy**
   - **Task**: Analyze where filters are applied in original `getAllTasksForProjects` or similar
   - **Deliverable**: Document integration point in service layer buildTaskQuery
   - **Key areas**:
     - Line 3227-3238 in current `pkg/services/task.go` (placeholder location)
     - How filter conditions are combined with other query conditions
     - Order of operations (filters, sorting, pagination)

5. **Edge Case Handling**
   - **Task**: Review test cases in `~/projects/vikunja_original_main/pkg/models/` for filter edge cases
   - **Deliverable**: Document all edge cases and expected behaviors
   - **Key areas**:
     - Deleted label/assignee IDs (returns no matches)
     - Malformed expressions (error handling)
     - Invalid timezones (error handling)
     - Large IN clauses (performance considerations)
     - Date parsing ambiguity (format precedence)

---

## Phase 1: Design & Documentation ✅ COMPLETE

### Deliverables

- ✅ **data-model.md**: Entity relationships and query patterns documented
- ✅ **contracts/api.md**: API contracts documented (no changes required)
- ✅ **quickstart.md**: Developer implementation guide created
- ✅ **Agent context**: Updated via `.specify/scripts/bash/update-agent-context.sh copilot`

**Design Summary**:
- No schema changes required
- No API changes required (transparent bug fix)
- Service layer additions only: `convertFiltersToDBFilterCond`, `getFilterCond`, `subTableFilter` type/map
- Filter application at lines 3227-3238 in `pkg/services/task.go`

---

## Phase 2: Task Decomposition

**Status**: Ready to begin

Use `/speckit.tasks` command to break down implementation into atomic tasks following the research and design documentation.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

