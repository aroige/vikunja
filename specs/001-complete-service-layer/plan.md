
# Implementation Plan: Complete Service-Layer Refactor Stabilization and Validation

**Branch**: `001-complete-service-layer` | **Date**: September 25, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/aron/projects/specs/001-complete-service-layer/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Complete the service-layer refactor of Vikunja backend through a three-phase approach: (1) System Stabilization - fix failing tests and UI bugs to achieve 100% stability, (2) Complete Refactor - systematically move business logic from models to services for all remaining features following dependency-then-complexity prioritization, (3) Comprehensive Validation - execute automated test parity analysis and manual functional validation to ensure identical behavior to original system. Technical approach follows "Chef, Waiter, Pantry" architecture with TDD, declarative routing, and dependency inversion patterns.

## Technical Context
**Language/Version**: Go 1.21+ with Echo web framework
**Primary Dependencies**: Echo, XORM ORM, testify, mage build tool, Vue.js frontend
**Storage**: Database abstraction layer (supports SQLite, PostgreSQL, MySQL) 
**Testing**: Go testing package with testify assertions, mage test runners
**Target Platform**: Linux/Docker containers, development environment focus
**Project Type**: Web application (backend Go API + Vue.js frontend)
**Performance Goals**: 95th percentile API response <200ms, 90% service layer test coverage
**Constraints**: Maintain functional parity with original main branch, development environment only
**Scale/Scope**: ~18 features to refactor, ~25-30 model files, existing test suites must pass

**User Context**: You are a world-class software architect tasked with the final stabilization and completion of a complex architectural refactor. The end result must be an architecturally pristine, fully functional, and highly maintainable codebase.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Code Quality Standards**: ✅ PASS - Refactor enforces clear separation of concerns, follows established Go idioms and Vue.js patterns, all code passes through static analysis
**II. Test-First Development**: ✅ PASS - TDD approach with 90% service layer coverage (exceeds 80% requirement), integration tests for all refactored APIs, test-first stabilization process
**III. User Experience Consistency**: ✅ PASS - Maintains identical API responses and UI behavior to original system, follows existing design patterns
**IV. Performance Requirements**: ✅ PASS - Must maintain <200ms API response times (FR-018), development environment focus reduces load concerns
**V. Security & Reliability**: ✅ PASS - Refactor preserves existing auth/validation patterns, maintains ACID properties, comprehensive error handling
**VI. Technical Debt Management**: ✅ PASS - All implementation shortcuts and architectural compromises must generate immediate follow-up tasks, no technical debt left untracked

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - Existing Vikunja structure with backend/ and frontend/ directories

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Phase 2 Breakdown**:
- **Phase 2.1**: Low complexity features (no dependencies)
- **Phase 2.2**: Medium complexity features (some dependencies)
- **Phase 2.3**: High complexity features (dependency order critical)
- **Phase 2.4**: Route modernization (migrate legacy WebHandler to declarative APIRoute pattern)

**Technical Debt Management** (CRITICAL):
- **MANDATORY**: Any implementation shortcuts, temporary solutions, or architectural compromises MUST generate follow-up tasks
- **IMMEDIATE DOCUMENTATION**: Add technical debt tasks to tasks.md immediately after creating shortcuts
- **PRIORITY**: Technical debt tasks must be completed before moving to next major phase
- **TRANSPARENCY**: Mark original tasks with ⚠️ warnings and reference follow-up tasks
- **EXAMPLES**: Delegation to wrong layer, missing service dependencies, incomplete abstractions, test gaps, mixed routing patterns
- **NO EXCEPTIONS**: All technical debt must be tracked - no shortcuts without follow-up tasks

**Lessons Learned from Phase 2.1-2.2** (October 2025):
- **CRITICAL DISCOVERY**: T011 (Projects), T012 (Project-Users), and T013 (Project-Teams) had business logic DUPLICATED instead of MOVED from models to services, violating FR-007 (move logic from models to services)
- **ROOT CAUSE**: Misunderstood "refactor service" as "add service layer alongside model" instead of "MOVE logic FROM models TO services with delegation"
- **IMPACT**: Three foundational services had two sources of truth, violating DRY principle and creating maintenance burden
- **DETECTION**: Post-task audit using `grep -c "s.Where\|s.Insert" pkg/models/[feature].go` revealed model files still contained full business logic
- **PREVENTION IMPLEMENTED**: Pre-task checklist, reference task review, post-task compliance verification (see Prevention Process below)
- **RECOVERY**: Created T011A-C, T012D-F, T013A-C follow-up tasks to properly deprecate model logic and establish service delegation

**Prevention Process for Future Tasks** (MANDATORY):
1. **PRE-TASK CHECKLIST** (before starting implementation):
   - [ ] Extract requirements from spec: FR-007 (move logic), FR-008 (service pattern), FR-010 (dependency inversion)
   - [ ] Review reference task: T006 (dependency inversion pattern) or T009/T010 (declarative routing pattern)
   - [ ] Understand end-state: Model has NO business logic, only delegation to service
   - [ ] Identify methods to deprecate: List all model business methods that need service migration

2. **IMPLEMENTATION** (during task execution):
   - [ ] Create service layer with business logic
   - [ ] Write comprehensive tests (90% coverage requirement)
   - [ ] Deprecate model methods: Replace business logic with service delegation
   - [ ] Update routes: Use service layer, not model methods
   - [ ] Run all tests: Both service and model tests must pass

3. **COMPLIANCE VERIFICATION** (before marking task complete):
   - [ ] Model has NO business logic: `grep -c "s.Where\|s.Insert\|s.Delete" pkg/models/[feature].go` returns 0
   - [ ] Model delegates to service: `grep -c "Service\|services.New" pkg/models/[feature].go` > 0
   - [ ] Routes use service layer: `grep -rn "[Feature]Service" pkg/routes/` finds service calls
   - [ ] All tests pass: `mage test:all` shows no failures
   - [ ] Pattern matches reference: Compare with T006 (dependency inversion) or T009/T010 (declarative routes)

4. **COMPLETION** (marking task done):
   - [ ] If ALL verification checks pass: Mark task complete with ✅
   - [ ] If ANY verification fails: Create follow-up tasks (A: deprecate model, B: migrate routes, C: verify compliance) and mark original task ⚠️
   - [ ] Document lessons learned: Add any new patterns or pitfalls to this section

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md (includes route modernization phase)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented ✅

**Design Artifacts Generated**:
- [x] research.md - Architectural decisions and prioritization analysis ✅
- [x] data-model.md - Core entities, relationships, and validation rules ✅
- [x] contracts/phase1-apis.md - Stabilization phase API contracts ✅
- [x] contracts/phase2-apis.md - Refactor phase API contracts ✅
- [x] contracts/phase3-apis.md - Validation phase API contracts ✅
- [x] quickstart.md - Implementation guide with concrete steps ✅
- [x] AGENTS.md updated - Architecture patterns and development workflow ✅

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
