# Implementation Plan: MCP Server Missing Tools

**Branch**: `010-mcp-missing-tools` | **Date**: 2025-10-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-mcp-missing-tools/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement four missing read-only tools in the MCP server to provide complete CRUD coverage for AI agents: `get_project` (retrieve single project by ID), `get_all_projects` (list all accessible projects), `get_task` (retrieve single task by ID), and `get_user_info` (get authenticated user profile). These tools fill critical gaps that currently force agents to use inefficient workarounds (searching/filtering) for direct entity lookups.

Technical approach: Extend existing tool classes (ProjectTools, TaskTools) with new methods following established patterns. Create new UserTools class for user info retrieval. Register tools in ToolRegistry with comprehensive Zod schemas. Leverage existing VikunjaClient, authentication, and rate limiting infrastructure.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 22+  
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.0.0, Express 4.x, Zod 3.22+, ioredis 5.3+, winston 3.11+, axios 1.6+  
**Storage**: Redis (optional, for token caching & rate limiting), in-memory fallback  
**Testing**: Vitest with @vitest/coverage-v8, supertest for integration tests  
**Target Platform**: Linux/macOS server (Node.js runtime), Docker container deployment
**Project Type**: Single TypeScript project (MCP server)  
**Performance Goals**: <2 seconds response time for typical read operations, support 100+ concurrent agent sessions  
**Constraints**: <200ms p95 API latency to Vikunja backend, maintain existing rate limiting (60 requests/minute/user), thread-safe Redis connection management  
**Scale/Scope**: 4 new tools, ~300 LOC (tools + tests), extends existing 30+ tool suite

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Standards ✅ PASS

**Architecture**: 
- ✅ Follows existing MCP server architecture patterns
- ✅ Tools encapsulated in classes (ProjectTools, TaskTools, new UserTools)
- ✅ Business logic in tool methods, not scattered
- ✅ ToolRegistry handles dependency injection and registration
- **Note**: This is a TypeScript/Node.js project (MCP server), not Vikunja backend (Go), so "Chef/Waiter/Pantry" pattern doesn't apply. Constitution architecture principles are for backend only.

**Quality Gates**:
- ✅ Linting: `npm run lint:fix` configured with ESLint + TypeScript
- ✅ Formatting: Prettier configured for consistency
- ✅ TypeScript strict mode enforced

**Technical Debt**: None anticipated - following established patterns

**Phase 1 Re-Evaluation**: ✅ PASS - Design maintains architecture standards. All tools follow existing class-based pattern with Zod validation.

### II. Test-First Development ✅ PASS

**TDD Cycle**: Tests written before implementation
- Unit tests for each new tool method (4 tools × 3+ test cases each)
- Integration tests for Vikunja API interaction
- Error handling tests (not found, unauthorized, validation)

**Coverage**: Target 90%+ for new tool code
- Test files: `tests/tools/projects.test.ts` (extend), `tests/tools/tasks.test.ts` (extend), `tests/tools/user.test.ts` (new)
- Integration: `tests/integration/read-operations.test.ts` (new)

**Testing Stack**: Vitest + supertest + mock Redis/Vikunja API

**Phase 1 Re-Evaluation**: ✅ PASS - Test strategy defined in quickstart.md. Each tool has documented test patterns. Coverage targets confirmed.

### III. User Experience Consistency ✅ PASS

**API Consistency**:
- ✅ Tool schemas follow existing Zod validation patterns
- ✅ Error responses match existing tool format (success, message, error fields)
- ✅ Comprehensive parameter descriptions for AI agent guidance
- ✅ Consistent naming conventions (get_project, get_task, get_user_info)

**Documentation**:
- ✅ Tool descriptions explain when/why to use each tool
- ✅ Parameter descriptions include examples and constraints
- ✅ Error messages are clear and actionable

**Phase 1 Re-Evaluation**: ✅ PASS - Contracts define consistent schemas. Quickstart provides comprehensive usage examples. Error handling documented with codes.

### IV. Performance Requirements ✅ PASS

**Latency**:
- ✅ Read operations target <200ms p95 (direct Vikunja API calls)
- ✅ Redis token cache reduces auth overhead
- ✅ No unbounded queries (pagination already handled by Vikunja API)

**Resource Usage**:
- ✅ Tools are stateless (no memory accumulation)
- ✅ Rate limiting prevents abuse (existing 60 req/min)
- ✅ HTTP keepalive for Vikunja API client (connection pooling)

**Monitoring**:
- ✅ Winston logging for all tool invocations
- ✅ Existing `/health` and `/metrics` endpoints track performance

**Phase 1 Re-Evaluation**: ✅ PASS - Data model confirms stateless design. Pagination strategy documented (50/page). Rate limiting integrated per research.md.

### V. Security & Reliability Standards ✅ PASS

**Authentication**:
- ✅ ALL tools enforce authentication via UserContext (token required)
- ✅ Rate limiting via existing RateLimiter class
- ✅ Token validation before tool execution
- ✅ User context tied to session/connection

**Input Validation**:
- ✅ Zod schemas validate all inputs (project_id, task_id, pagination params)
- ✅ Type safety via TypeScript
- ✅ Parameter sanitization (positive integers for IDs, bounded page sizes)

**Error Handling**:
- ✅ Clear distinction between "not found" vs "unauthorized"
- ✅ No sensitive data in error messages
- ✅ All errors logged with context (user ID, tool name)
- ✅ Graceful handling of Vikunja API failures

**Data Protection**:
- ✅ get_user_info explicitly excludes sensitive fields (passwords, tokens)
- ✅ All data flows through authenticated Vikunja API
- ✅ No data persistence beyond Redis token cache (existing, compliant)

**Phase 1 Re-Evaluation**: ✅ PASS - User info filtering explicitly documented in data-model.md and get-user-info.json contract. Error codes standardized. Security notes in contract.

**Constitution Compliance Summary**: ✅ ALL GATES PASS - No violations. Feature follows established MCP server patterns and maintains all quality/security standards. Phase 1 design confirms adherence to all principles.

## Project Structure

### Documentation (this feature)

```
specs/010-mcp-missing-tools/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── get-project.json      # Tool schema for get_project
│   ├── get-all-projects.json # Tool schema for get_all_projects
│   ├── get-task.json         # Tool schema for get_task
│   └── get-user-info.json    # Tool schema for get_user_info
├── checklists/
│   └── requirements.md  # Quality validation checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
mcp-server/
├── src/
│   ├── index.ts                    # Application entry point
│   ├── server.ts                   # VikunjaMCPServer class
│   ├── config/
│   │   └── index.ts                # Configuration management
│   ├── auth/
│   │   ├── authenticator.ts        # Authentication logic
│   │   ├── token-validator.ts      # Token validation
│   │   └── types.ts                # UserContext interface
│   ├── vikunja/
│   │   ├── client.ts               # VikunjaClient (HTTP wrapper)
│   │   └── types.ts                # Vikunja entity types (Project, Task, User)
│   ├── tools/
│   │   ├── registry.ts             # ToolRegistry (MODIFIED - add 4 tools)
│   │   ├── projects.ts             # ProjectTools (MODIFIED - add getProject, getAllProjects)
│   │   ├── tasks.ts                # TaskTools (MODIFIED - add getTask)
│   │   ├── user.ts                 # UserTools (NEW - getUserInfo)
│   │   └── index.ts                # Tool exports
│   ├── ratelimit/
│   │   ├── limiter.ts              # Rate limiting logic
│   │   └── storage.ts              # Redis storage
│   └── utils/
│       ├── logger.ts               # Winston logger
│       └── redis-connection.ts     # Redis connection management
└── tests/
    ├── tools/
    │   ├── projects.test.ts        # MODIFIED - add tests for new methods
    │   ├── tasks.test.ts           # MODIFIED - add tests for getTask
    │   └── user.test.ts            # NEW - tests for UserTools
    ├── integration/
    │   └── read-operations.test.ts # NEW - integration tests for new tools
    └── setup.ts                    # Test setup and mocks
```

**Structure Decision**: Single TypeScript project. This is the existing MCP server structure. Changes are minimal: extend 3 existing tool classes (ProjectTools, TaskTools, new UserTools) and register 4 new tools in ToolRegistry. All tests colocated in `tests/` directory following existing patterns.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - All Constitution gates pass. No complexity justification required.


---

## Phase Summary

### Phase 0: Research ✅ COMPLETE

**Artifacts Generated**:
- `research.md` - Resolved all technical unknowns
  - Vikunja API endpoint availability
  - Tool schema design patterns
  - Error handling strategy (HTTP status code parsing)
  - User info data filtering (security)
  - Tool registration order
  - Pagination best practices

**Key Decisions**:
- All required Vikunja API endpoints exist (no backend changes needed)
- Follow existing Zod schema patterns for consistency
- Parse HTTP 404/403 status codes for clear error messages
- Filter sensitive user fields explicitly (password, tokens, 2FA secrets)
- Register tools in logical groups with existing related tools
- Use 50 items/page pagination with hasMore heuristic

---

### Phase 1: Design & Contracts ✅ COMPLETE

**Artifacts Generated**:
- `data-model.md` - Entity definitions and relationships
  - Project entity (existing, documented)
  - Task entity (existing, documented)
  - User entity (filtered fields for security)
  - Tool input/output models
  - Error states and codes
  - Data flow diagram
  
- `contracts/` - Tool specification schemas
  - `get-project.json` - Project retrieval by ID
  - `get-all-projects.json` - Project listing with filters
  - `get-task.json` - Task retrieval by ID
  - `get-user-info.json` - User profile (safe fields)
  
- `quickstart.md` - Developer guide
  - Usage examples for all 4 tools
  - Error handling patterns
  - Testing guidelines
  - Best practices for agents and developers
  - Troubleshooting tips

**Agent Context Updated**: 
- ✅ GitHub Copilot instructions updated with new technologies
- Added TypeScript 5.3+, Node.js 22+, MCP SDK, testing stack

**Constitution Re-Check**: ✅ ALL GATES PASS
- Architecture: Follows existing patterns
- Testing: Strategy documented with 90%+ coverage target
- UX: Consistent schemas and error handling
- Performance: Stateless design with pagination
- Security: User info filtering, authentication enforcement

---

### Phase 2: Tasks ⏸️ PENDING

**Next Step**: Run `/speckit.tasks` to generate implementation checklist

This will create `tasks.md` with:
- Detailed implementation steps
- Test-first development workflow
- Code review checklist
- Deployment verification

---

## Ready for Implementation

**All planning complete**. The feature is ready for Phase 2 task breakdown.

**What's Been Validated**:
- ✅ Specification quality (no clarifications needed)
- ✅ Constitution compliance (all gates pass)
- ✅ Technical feasibility (API endpoints exist)
- ✅ Design consistency (follows existing patterns)
- ✅ Security measures (user data filtering documented)
- ✅ Testing strategy (90%+ coverage planned)

**What's Next**:
1. Run `/speckit.tasks` to generate implementation checklist
2. Follow TDD workflow: Write tests → Implement → Verify
3. Extend existing tool classes (minimal changes)
4. Register 4 new tools in ToolRegistry
5. Run test suite and verify 90%+ coverage
6. Update documentation as needed

**Estimated Effort**: 
- 4-6 hours development (tools + tests)
- Follows existing patterns (low complexity)
- No backend changes required
- Minimal surface area (~300 LOC)
