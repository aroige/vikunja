# Implementation Plan: Fix API Token Permissions System

**Branch**: `005-fix-api-token-permissions` | **Date**: October 23, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-fix-api-token-permissions/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix the API token permissions system where v1 task routes are missing CRUD permission scopes (create, update, delete) in the route registration map, preventing API tokens from performing write operations despite having "all permissions" selected. The issue was introduced during the service layer refactor when route handlers were migrated to the declarative APIRoute pattern. The fix must preserve the current service layer architecture and use the existing CollectRoute/registerRoutes infrastructure without reverting to deprecated "magic" detection patterns.

**Technical Approach**: Audit all v1 and v2 route registrations to ensure the declarative APIRoute pattern is consistently applied across all route groups. Verify that TaskRoutes array in pkg/routes/api/v1/task.go includes all CRUD operations with correct permission scopes, and ensure registerRoutes helper is called for all route groups. Fix any gaps in route registration without modifying the service layer or architectural patterns.

## Technical Context

**Language/Version**: Go 1.21+  
**Primary Dependencies**: Echo web framework (v4), XORM ORM, Vue.js 3 (frontend)  
**Storage**: MySQL/PostgreSQL/SQLite (via XORM)  
**Testing**: Go testing package, Vitest (frontend unit tests), Cypress (E2E)  
**Target Platform**: Linux/Windows/macOS server, Web browsers (frontend)
**Project Type**: Web application (backend API + frontend SPA)  
**Performance Goals**: <200ms p95 latency for API requests, support 1000+ concurrent users  
**Constraints**: Must maintain backward compatibility with existing API tokens, zero breaking changes  
**Scale/Scope**: ~200 LOC changes across 5-10 files, focused on route registration infrastructure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Standards ✅ PASS

**Architecture**: 
- ✅ Preserves "Chef, Waiter, Pantry" pattern - No changes to service layer (Chef) or models (Pantry)
- ✅ Fix targets only route registration (Waiter layer) using existing APIRoute declarative pattern
- ✅ Uses CollectRoute function for explicit permission registration (established pattern)
- ✅ No business logic changes, only infrastructure configuration

**Quality Gates**:
- ✅ Will run `mage lint:fix` (Go) before commit
- ✅ Will run `pnpm lint:fix` (frontend) if UI changes needed
- ✅ TypeScript interfaces match backend (IApiToken already exists)

**Technical Debt**:
- ✅ No new technical debt introduced
- ✅ Fix actually **reduces** technical debt by completing the route refactoring that was partially done

### II. Test-First Development ✅ PASS

**TDD Cycle**:
- ✅ Will write tests first in `pkg/services/api_tokens_test.go` for permission validation
- ✅ Will add web tests in `pkg/webtests/` for API token CRUD operations via HTTP
- ✅ Tests will verify GET /routes returns complete permission scopes
- ✅ Tests will verify token authentication works for create/update/delete operations

**Coverage**:
- ✅ Target 90%+ coverage for modified route registration logic
- ✅ Test both positive (authorized) and negative (unauthorized) scenarios
- ✅ Test backward compatibility with old token permission formats

**Test at Service Layer**:
- ✅ Tests focus on APITokenService validation and route permission checking
- ✅ No testing of deprecated model methods

### III. User Experience Consistency ✅ PASS

**Frontend Stack**:
- ✅ No changes to Vue.js components or composables required (GET /routes already consumed)
- ✅ Existing ApiTokens.vue already displays permissions from GET /routes endpoint
- ✅ Fix ensures complete permission list is available to existing UI

**i18n**:
- ✅ No new user-facing strings required (permission names already translated)

### IV. Performance Requirements ✅ PASS

**Backend**:
- ✅ No performance impact - route registration happens once at startup
- ✅ Route lookup remains O(1) map access (no algorithm changes)
- ✅ GET /routes endpoint already cached in apiTokenRoutes map
- ✅ No new database queries or I/O operations

**Monitoring**:
- ✅ Existing auth failure logs already capture permission issues
- ✅ Will enhance logs to include specific missing permission scope

### V. Security & Reliability Standards ✅ PASS

**Auth**:
- ✅ **Strengthens** security by enabling proper permission scoping for API tokens
- ✅ Maintains three-tier permission model (Read/Write/Admin)
- ✅ CanDoAPIRoute validation logic unchanged
- ✅ Backward compatibility prevents breaking existing tokens

**Input Validation**:
- ✅ No new user input handling required
- ✅ Existing PermissionsAreValid function validates token permissions

**Error Handling**:
- ✅ Maintains existing error wrapping patterns
- ✅ Security events logged when tokens lack permissions

**Database**:
- ✅ No migrations required (APIToken schema unchanged)
- ✅ No changes to XORM queries

### Constitution Compliance Summary - POST DESIGN

**Status**: ✅ **ALL GATES PASS**

This fix is a **minimal infrastructure correction** that:
1. Completes the partially-done route refactoring (reduces technical debt)
2. Uses established patterns (APIRoute, CollectRoute, registerRoutes)
3. Requires no architectural changes to services or models
4. Strengthens security by enabling proper token scoping
5. Maintains 100% backward compatibility
6. Has zero performance impact (startup-time configuration only)

**Post-Design Validation**:
- ✅ Data model review confirms no schema changes required
- ✅ API contracts define expected behavior (OpenAPI spec created)
- ✅ Quick start guide demonstrates TDD workflow
- ✅ Research identified root cause without requiring architectural changes
- ✅ All five Constitution principles upheld in design phase

**No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```
specs/005-fix-api-token-permissions/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (current - /speckit.plan output)
├── research.md          # Phase 0 output (generated below)
├── data-model.md        # Phase 1 output (generated below)
├── quickstart.md        # Phase 1 output (generated below)
├── contracts/           # Phase 1 output (generated below)
│   └── routes-api.yaml  # OpenAPI spec for GET /routes endpoint
└── checklists/
    └── requirements.md  # Specification quality checklist (completed)
```

### Source Code (repository root)

```
pkg/
├── models/
│   ├── api_routes.go          # Core: CollectRoute, CanDoAPIRoute, GetAvailableAPIRoutesForToken
│   └── api_tokens.go          # APIToken model, APIPermissions type
├── routes/
│   ├── routes.go              # Main: registerAPIRoutes, registerAPIRoutesV2
│   ├── api_tokens.go          # Middleware: checkAPITokenAndPutItInContext
│   └── api/
│       ├── v1/
│       │   ├── common.go      # Core: APIRoute struct, registerRoutes helper
│       │   ├── task.go        # FIX TARGET: TaskRoutes array
│       │   ├── project.go     # Check: ProjectRoutes array
│       │   ├── label.go       # Check: LabelRoutes array
│       │   ├── kanban.go      # Check: Kanban routes
│       │   ├── task_positions.go      # Check: TaskPositionRoutes
│       │   ├── bulk_tasks.go          # Check: BulkTaskRoutes
│       │   ├── task_assignees.go      # Check: TaskAssigneeRoutes
│       │   ├── bulk_assignees.go      # Check: BulkAssigneeRoutes
│       │   ├── task_relations.go      # Check: TaskRelationRoutes
│       │   ├── attachments.go         # Check: AttachmentRoutes
│       │   ├── comments.go            # Check: CommentRoutes
│       │   ├── project_teams.go       # Check: ProjectTeamRoutes
│       │   ├── project_users.go       # Check: ProjectUserRoutes
│       │   ├── teams.go               # Check: TeamRoutes
│       │   ├── subscriptions.go       # Check: SubscriptionRoutes
│       │   ├── notifications.go       # Check: NotificationRoutes
│       │   └── api_tokens.go          # API token CRUD routes
│       └── v2/
│           ├── tasks.go       # CHECK: RegisterTasks (manual registration)
│           ├── project.go     # CHECK: RegisterProjects (manual registration)
│           └── label.go       # CHECK: RegisterLabels (manual registration)
├── services/
│   ├── api_tokens.go          # APITokenService: ValidateToken, CanDelete
│   └── api_tokens_test.go     # TEST TARGET: Add permission validation tests
└── webtests/
    └── api_tokens_test.go     # TEST TARGET: Add HTTP-level permission tests

frontend/src/
├── views/user/settings/
│   └── ApiTokens.vue          # UI: Displays permissions from GET /routes
├── services/
│   └── apiToken.ts            # Service: getAvailableRoutes() calls GET /routes
└── modelTypes/
    └── IApiToken.ts           # TypeScript interface for APIToken
```

**Structure Decision**: Web application (backend Go API + frontend Vue.js SPA). This fix targets the backend route registration infrastructure with potential minor frontend verification. The existing Vikunja architecture uses:
- Backend: `pkg/` for all Go code following Chef/Waiter/Pantry pattern
- Frontend: `frontend/src/` for Vue.js SPA
- Tests: Co-located with backend code (`*_test.go`)

**Primary Fix Locations**:
1. `pkg/routes/api/v1/*.go` - Audit all route group files for complete APIRoute arrays
2. `pkg/routes/routes.go` - Verify all RegisterXXX calls are present
3. `pkg/routes/api/v2/*.go` - Convert manual registrations to declarative pattern OR add CollectRoute calls
4. `pkg/models/api_routes.go` - Possibly enhance logging in CanDoAPIRoute

## Complexity Tracking

*No violations - section not applicable. All Constitution checks passed.*

---

## Phase Completion Summary

### ✅ Phase 0: Research (COMPLETED)

**Deliverable**: `research.md`

**Key Findings**:
1. TaskRoutes array correctly includes all CRUD operations with proper permission scopes
2. Declarative APIRoute pattern is correctly implemented for v1 routes
3. Root cause identified: Legacy CollectRoutesForAPITokenUsage may be interfering with explicit registrations
4. V2 routes rely on deprecated "magic" detection (should be converted to declarative pattern)

**Decisions Made**:
- Make explicit CollectRoute calls take precedence over legacy detection
- Add defensive checks in CollectRoutesForAPITokenUsage
- Convert v2 routes to declarative pattern for consistency
- Add comprehensive tests to prevent regression

---

### ✅ Phase 1: Design & Contracts (COMPLETED)

**Deliverables**:
- `data-model.md` - Documents existing entities (no schema changes)
- `contracts/routes-api.yaml` - OpenAPI spec for GET /routes endpoint
- `quickstart.md` - Step-by-step implementation guide with TDD workflow

**Key Designs**:
1. **No Data Model Changes**: Fix is purely infrastructure, no database migrations
2. **API Contract Defined**: GET /routes endpoint expected behavior documented
3. **Implementation Strategy**: 7-step workflow with defensive registration pattern
4. **Testing Strategy**: Unit tests, integration tests, HTTP tests, manual verification

**Constitution Re-check**: ✅ ALL GATES PASS (post-design validation)

---

## Next Steps

### Phase 2: Task Breakdown (NOT COMPLETED - Use /speckit.tasks)

The planning phase ends here. To continue implementation:

1. **Generate Tasks**: Run `/speckit.tasks` to break down the fix into concrete implementation tasks
2. **Execute Tasks**: Follow the quick start guide to implement the fix with TDD
3. **Verify**: Use the validation checklist in quickstart.md to ensure completeness

**Estimated Implementation Time**: 1-2 hours for experienced Go developer

**Risk Level**: Low (defensive changes, backward compatible)

---

## Files Generated

### Documentation
- ✅ `spec.md` - Feature specification with user stories and requirements
- ✅ `plan.md` - This file (implementation plan)
- ✅ `research.md` - Root cause analysis and decisions
- ✅ `data-model.md` - Entity documentation (no schema changes)
- ✅ `quickstart.md` - Step-by-step implementation guide
- ✅ `contracts/routes-api.yaml` - OpenAPI specification
- ✅ `checklists/requirements.md` - Specification quality validation

### Agent Context
- ✅ `.github/copilot-instructions.md` - Updated with feature technologies

### Total Documentation
- 7 files created/updated
- ~500 lines of specification
- ~800 lines of implementation guidance
- ~200 lines of API contracts



