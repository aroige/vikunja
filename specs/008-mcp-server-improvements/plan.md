# Implementation Plan: MCP Server Capability Enhancement & Tool Description Improvements

**Branch**: `008-mcp-server-improvements` | **Date**: 2025-10-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-mcp-server-improvements/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enhance the Vikunja MCP server to provide AI agents with comprehensive tool descriptions, complete Vikunja capability coverage (task relations, comments, labels, attachments, recurring tasks), and enhanced reliability for n8n workflows. The implementation adds 14+ new tools while improving documentation for existing 21 tools, implements optional pagination (page_size=50, max 100), and ensures <2s response times for typical operations.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 22+  
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.0.0, Express 4.x, Zod 3.22+, ioredis 5.3+, winston 3.11+, axios 1.6+  
**Storage**: Redis (optional, for token caching & rate limiting), in-memory fallback  
**Testing**: Vitest 1.0+, Supertest 6.3+ (current coverage: 98.5%)  
**Target Platform**: Node.js server (stdio transport for Claude Desktop, HTTP transport for n8n)  
**Project Type**: Single Node.js TypeScript project (MCP server)  
**Performance Goals**: <2s p95 for typical operations, <5s for bulk operations (100+ items), maintain 90%+ test coverage  
**Constraints**: Must maintain backward compatibility with existing 21 tools, stdio & HTTP transports both supported, optional Redis dependency  
**Scale/Scope**: 35+ total tools (21 existing + 14 new), support for all Vikunja v1 API task management features

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Standards
- ✅ **Architecture**: TypeScript project with clear separation (tools/, vikunja/ API client, transports/, auth/)
- ✅ **Quality Gates**: ESLint + Prettier configured, will run `npm run lint:fix && npm run format` before commit
- ✅ **Technical Debt**: None expected for additive tool additions; backward compatibility maintained
- ✅ **Frontend**: N/A (backend-only MCP server)

### II. Test-First Development
- ✅ **TDD Cycle**: Will write tests first for each new tool in `tests/tools/`
- ✅ **Coverage**: Target 90%+ (currently 98.5% - must maintain or exceed)
- ✅ **Test Structure**: Vitest unit tests with mock Vikunja API responses
- ⚠️ **Note**: MCP server is separate from main Vikunja backend, has own test suite

### III. User Experience Consistency
- ✅ **Tool Descriptions**: Primary UX is AI agent tool discovery - comprehensive descriptions mandatory
- ✅ **Error Messages**: Consistent error format with resource type context (FR-043)
- ✅ **Documentation**: README and inline JSDoc for all tools
- ✅ **i18n**: N/A (API server, English tool descriptions sufficient for AI agents)

### IV. Performance Requirements
- ✅ **Response Time**: <2s typical, <5s bulk (NFR-001, NFR-002) - aligns with Constitution <200ms p95 for CRUD
- ✅ **Pagination**: Optional with page_size=50, max 100 (NFR-003) prevents unbounded queries
- ✅ **Memory**: Redis optional, in-memory fallback - minimal footprint
- ✅ **Monitoring**: Winston logging configured, can add health endpoint if needed

### V. Security & Reliability Standards
- ✅ **Auth**: All Vikunja API calls use user's API token (passed via MCP auth header)
- ✅ **Permissions**: Enforced by Vikunja API backend (MCP is pass-through)
- ✅ **Input Validation**: Zod schemas for all tool parameters
- ✅ **Error Handling**: Wrap errors with context, no secrets in logs
- ✅ **Rate Limiting**: Already implemented with rate-limiter-flexible
- ✅ **Dependencies**: Pinned in package.json, Renovate likely configured

**GATE STATUS**: ✅ **PASS** - All constitution principles satisfied. MCP server is additive enhancement with no architectural debt.

**POST-DESIGN RE-CHECK** (after Phase 1):

- ✅ **Architecture**: Contracts defined in `/contracts/`, clear separation maintained, no new architectural debt
- ✅ **Testing**: Test structure planned (unit + integration), 90%+ coverage target, TDD workflow documented in quickstart
- ✅ **Tool Descriptions**: Pattern established (purpose + use case + outcome + examples), documented in research.md
- ✅ **Performance**: Pagination strategy defined (page_size=50, max 100), aligns with <2s/<5s targets
- ✅ **Security**: Error messages balance context with security (resource type without sensitive details), Zod validation for all inputs

**FINAL GATE STATUS**: ✅ **PASS** - Design complete, ready for Phase 2 (Tasks)

## Project Structure

### Documentation (this feature)

```
specs/008-mcp-server-improvements/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (Vikunja API endpoints, MCP patterns)
├── data-model.md        # Phase 1 output (tool schemas, response types)
├── quickstart.md        # Phase 1 output (developer onboarding)
├── contracts/           # Phase 1 output (Zod schemas for tools)
│   ├── task-relations.ts
│   ├── comments.ts
│   ├── labels.ts
│   ├── attachments.ts
│   └── pagination.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
mcp-server/
├── src/
│   ├── tools/
│   │   ├── projects.ts         # Existing (4 tools)
│   │   ├── tasks.ts            # Existing (5 tools) - enhance descriptions
│   │   ├── assignments.ts      # Existing (5 tools) - add label tools
│   │   ├── search.ts           # Existing (4 tools) - document label filtering
│   │   ├── bulk.ts             # Existing (3 tools)
│   │   ├── relations.ts        # NEW - task relations (3 tools)
│   │   ├── comments.ts         # NEW - task comments (4 tools)
│   │   ├── attachments.ts      # NEW - task attachments (1 tool)
│   │   └── index.ts            # Tool registry - update with new tools
│   ├── vikunja/
│   │   ├── client.ts           # Vikunja API client - add new endpoints
│   │   └── types.ts            # TypeScript interfaces - add new types
│   ├── config/
│   │   └── schema.ts           # Config validation (Zod)
│   ├── transports/
│   │   ├── stdio.ts            # Claude Desktop transport
│   │   └── http.ts             # n8n transport with JSON mode
│   ├── auth/
│   │   └── token-manager.ts    # Redis token caching
│   ├── ratelimit/
│   │   └── limiter.ts          # Rate limiting
│   ├── utils/
│   │   ├── logger.ts           # Winston logging
│   │   └── pagination.ts       # NEW - pagination helper
│   ├── server.ts               # MCP server setup
│   └── index.ts                # Entry point
├── tests/
│   ├── tools/
│   │   ├── relations.test.ts   # NEW - test relation tools
│   │   ├── comments.test.ts    # NEW - test comment tools
│   │   ├── labels.test.ts      # NEW - test label tools
│   │   ├── attachments.test.ts # NEW - test attachment tool
│   │   └── pagination.test.ts  # NEW - test pagination
│   ├── vikunja/
│   │   └── client.test.ts      # Update with new endpoints
│   └── integration/
│       └── end-to-end.test.ts  # Full workflow tests
├── docs/
│   ├── TOOLS.md                # Auto-generated tool documentation
│   └── DEVELOPMENT.md          # Developer guide
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md                   # Update with new capabilities
```

**Structure Decision**: Existing MCP server structure maintained. New tools added to `src/tools/` following established patterns. Each tool category (relations, comments, labels, attachments) gets dedicated file. Existing tool files enhanced with better descriptions. Vikunja API client extended with new endpoints. Tests mirror source structure in `tests/` directory.

## Complexity Tracking

*No violations - Constitution Check passed cleanly.*

---

## Phase 0 & Phase 1 Completion Summary

### Artifacts Generated

**Phase 0: Research & Design Decisions**
- ✅ `research.md` - 10 research areas resolved, all NEEDS CLARIFICATION items addressed
  - Vikunja API endpoints confirmed (all exist in v1)
  - Tool description pattern established
  - Pagination strategy defined (page_size=50, max 100)
  - Relation bidirectional mapping documented
  - Error message detail level specified
  - Recurring task documentation enhanced
  - n8n JSON mode confirmed working
  - Version compatibility approach defined
  - Concurrency handling clarified (last-write-wins)
  - Test strategy established (unit + integration, 90%+ coverage)

**Phase 1: Design & Contracts**
- ✅ `data-model.md` - Complete data model with 5 core entities
  - TaskRelation (10 relation kinds, bidirectional)
  - TaskComment (CRUD with pagination)
  - Label (project-independent, CRUD + search)
  - TaskAttachment (metadata only)
  - Pagination (shared utilities)
- ✅ `contracts/` directory with 5 Zod schema files
  - `task-relations.ts` - 3 tools (create, get, delete)
  - `comments.ts` - 4 tools (add, get, update, delete)
  - `labels.ts` - 6 tools (get_all, get, update, delete, get_task_labels, plus existing enhanced)
  - `attachments.ts` - 1 tool (get metadata)
  - `pagination.ts` - shared utilities and types
- ✅ `quickstart.md` - Developer onboarding guide
  - Setup instructions
  - Development workflow
  - Adding new tools (5-step process)
  - Tool description best practices
  - Testing strategy
  - Performance guidelines
  - Error handling patterns
  - Common patterns (bidirectional relations, cycle prevention)
- ✅ Agent context updated (`.github/copilot-instructions.md`)
  - Added TypeScript 5.3+, Node.js 22+
  - Added MCP SDK, Express, Zod, ioredis, winston, axios dependencies
  - Added Redis (optional) for caching/rate limiting

### Design Summary

**New Tools to Implement**: 14 total
- Task Relations: 3 tools (create_task_relation, get_task_relations, delete_task_relation)
- Comments: 4 tools (add_task_comment, get_task_comments, update_task_comment, delete_task_comment)
- Labels: 6 tools (get_all_labels, get_label, update_label, delete_label, get_task_labels, search enhancement)
- Attachments: 1 tool (get_task_attachments)

**Existing Tools to Enhance**: 21 tools get improved descriptions
- Document use cases, when to use vs alternatives
- Add parameter examples and constraints
- Explain Vikunja terminology inline
- Clarify expected outcomes

**Key Design Decisions**:
1. Optional pagination (page_size=50, max 100) for collections
2. Error messages include resource type without sensitive details
3. Last-write-wins concurrency (rely on Vikunja API)
4. Version compatibility checking (log warnings, continue operation)
5. Bidirectional relation helpers for validation
6. Test-first development with 90%+ coverage target

**Performance Targets**:
- <2s for typical operations (single queries, create/update)
- <5s for bulk operations (100+ items with pagination)
- Pagination prevents unbounded queries

**No Blockers**: All unknowns resolved, ready for Phase 2 (/speckit.tasks)

---

## Next Command

```bash
/speckit.tasks
```

This will break down the implementation into concrete, trackable tasks based on the 7 user stories (P1: tool descriptions & relations, P2: recurring docs & comments & labels, P3: attachments & n8n) and the design artifacts generated above.

