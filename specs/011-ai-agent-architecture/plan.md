# Implementation Plan: AI-Powered Personal Assistant System

**Branch**: `011-ai-agent-architecture` | **Date**: 2025-10-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-ai-agent-architecture/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a reliable AI agent system using n8n orchestration to help users manage tasks and schedule through natural language interactions with Vikunja. The system uses a supervisor agent that routes requests to specialist agents (starting with Vikunja specialist, expanding to calendar/docs specialists). Core focus: implement tool-level workflow enforcement (search-before-action) to achieve 99%+ task completion accuracy, eliminating the current critical issue where wrong tasks are marked complete. Uses cost-efficient models (Gemini 2.0 Flash Lite) with PostgreSQL-backed conversation memory and comprehensive observability.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 22+ (n8n workflows, MCP server); Go 1.21+ (Vikunja backend - unchanged)  
**Primary Dependencies**: 
- n8n (workflow orchestration platform)
- @modelcontextprotocol/sdk ^1.0.0 (MCP protocol for Vikunja tools)
- Express 4.x (MCP server HTTP endpoints)
- ioredis 5.3+ (optional, for PostgreSQL memory backup)
- winston 3.11+ (structured logging)
- chrono-node 2.x (natural language date parsing)
- zod 3.22+ (schema validation)

**Storage**: 
- PostgreSQL (n8n conversation memory with shared database across all agents)
- Vikunja database unchanged (MySQL/PostgreSQL/SQLite via existing backend)
- Workflow storage: `n8n-workflows/` (version-controlled JSON exports)
- Prompt storage: `n8n-workflows/prompts/` (version-controlled markdown/text files)

**Testing**: 
- n8n workflow testing (manual execution with test scenarios)
- MCP server: Vitest unit tests
- Integration tests: End-to-end conversation flows
- Test data: Vikunja test instances with known task sets

**Target Platform**: 
- n8n: Self-hosted or cloud instance
- MCP server: Node.js service (HTTP transport)
- Vikunja backend: Existing deployment (unchanged)

**Project Type**: Multi-component system (n8n workflows + Node.js MCP server + existing Go backend)

**Performance Goals**: 
- <3 seconds for daily task recommendations (SC-003)
- 2-4 conversational turns for simple operations (SC-008)
- 99%+ accuracy for task completion operations (SC-001)
- <5% failure rate on standard operations with cost-efficient models (SC-011)

**Constraints**: 
- MUST work reliably with cost-efficient models (Gemini 2.0 Flash Lite ~$0.075/$0.30 per 1M tokens)
- <$0.10 per 1000 user interactions total operating cost (SC-011)
- Tool-level enforcement of workflows (not prompt-based) to prevent bypassing safety checks
- 5-10 tools maximum per specialist agent to reduce cognitive load on smaller models

**Scale/Scope**: 
- Single user initially (personal assistant)
- Extensible to multi-user with authentication
- 3-5 specialist agents (Vikunja, Calendar, Documents, future expansions)
- Conversation context windows: Supervisor 3-5 messages, Specialists 10-15 messages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Standards
- ✅ **Architecture**: n8n workflows are infrastructure (not Vikunja code); MCP server follows Node.js/TypeScript best practices with clear separation (handlers, services, models)
- ✅ **Quality Gates**: ESLint + TypeScript strict mode for MCP server; n8n workflows validated via test execution
- ⚠️ **Technical Debt**: None anticipated; workflows and prompts are version-controlled and independently testable

### II. Test-First Development
- ✅ **TDD Cycle**: Write test conversations → FAIL → Implement workflow/tools → PASS → Refactor prompts
- ✅ **Coverage**: MCP server 90%+ coverage (Vitest); n8n workflows tested with comprehensive conversation scenarios
- ✅ **Test Data**: Use Vikunja test instances with known task sets to verify search-before-action workflow

### III. User Experience Consistency
- ✅ **Conversational UX**: Natural language interactions with clear confirmations, error messages with next steps
- ✅ **i18n**: System supports multilingual task matching (FR-035); prompts designed for language flexibility
- ✅ **Accessibility**: Conversational interface inherently accessible; clear, friendly language without exposing internal IDs

### IV. Performance Requirements  
- ✅ **Backend**: MCP server <200ms response for tool calls; n8n workflows complete in 2-4 turns for simple ops (SC-008)
- ✅ **Monitoring**: Comprehensive logging with trace IDs, token usage, latencies (FR-027, FR-027a, FR-027b)
- ✅ **Resource Efficiency**: Cost-optimized for Gemini 2.0 Flash Lite; <$0.10 per 1000 interactions (SC-011)

### V. Security & Reliability Standards
- ✅ **Auth**: MCP server uses existing Vikunja authentication tokens; n8n workflows enforce user context
- ✅ **Input Validation**: All user input validated; search-before-action prevents wrong task operations (FR-026)
- ✅ **Error Handling**: Graceful degradation for external service failures (FR-022, FR-036); comprehensive logging for debugging
- ✅ **Data Protection**: No passwords/secrets in logs (FR-027); conversation memory in PostgreSQL with appropriate retention

**Status**: ✅ PASS - All constitution principles satisfied. This feature extends Vikunja with AI agent orchestration without modifying core backend architecture.

### Post-Design Re-Check (Phase 1 Complete)

After completing data model, contracts, and quickstart guide:

- ✅ **Architecture**: MCP tool contracts enforce search-before-action at infrastructure level; clear service/handler/model separation in MCP server
- ✅ **Testing**: Tool contract specifications include comprehensive test requirements (happy path, no matches, multiple matches, errors)
- ✅ **UX**: Data model defines all user-facing messages with clear status codes and suggested actions
- ✅ **Performance**: Logging architecture captures latency metrics; context window limits control token costs
- ✅ **Security**: All tools require userId validation; confirmation tokens prevent unauthorized actions; sensitive data sanitized in logs

**Final Status**: ✅ CONSTITUTION CHECK PASSED - Ready for Phase 2 (task decomposition)

## Project Structure

### Documentation (this feature)

```
specs/011-ai-agent-architecture/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (to be created)
├── data-model.md        # Phase 1 output (to be created)
├── quickstart.md        # Phase 1 output (to be created)
├── contracts/           # Phase 1 output (to be created)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
n8n-workflows/                    # n8n workflow orchestration (NEW)
├── supervisor-agent.json         # Main routing agent workflow
├── vikunja-specialist.json       # Vikunja task management specialist
├── calendar-specialist.json      # Future: Google Calendar specialist
├── prompts/                      # System prompts (version-controlled)
│   ├── supervisor.md             # Supervisor agent system prompt
│   ├── vikunja-specialist.md     # Vikunja specialist system prompt
│   └── calendar-specialist.md    # Future: Calendar specialist prompt
└── tools/                        # Custom tool implementations for n8n
    └── date-parser.js            # Chrono.js wrapper for date parsing

mcp-server/                       # Model Context Protocol server (EXISTING, ENHANCED)
├── src/
│   ├── index.ts                  # Main server entry point
│   ├── server.ts                 # MCP server setup with tool registration
│   ├── tools/                    # MCP tool implementations
│   │   ├── task-tools.ts         # Task CRUD with search-before-action
│   │   ├── project-tools.ts      # Project management tools
│   │   ├── search-tools.ts       # Task search and filtering
│   │   └── recommendation-tools.ts # Daily task recommendations
│   ├── services/                 # Business logic layer
│   │   ├── task-service.ts       # Task operations with validation
│   │   ├── search-service.ts     # Search and ranking algorithms
│   │   └── vikunja-client.ts     # Vikunja API client
│   ├── models/                   # TypeScript interfaces
│   │   ├── task.ts               # Task entity matching Vikunja
│   │   ├── project.ts            # Project entity
│   │   └── tool-result.ts        # Tool execution results
│   └── utils/                    # Utilities
│       ├── logger.ts             # Winston structured logging
│       └── validation.ts         # Zod schema validators
├── tests/                        # Vitest test suites
│   ├── tools/                    # Tool unit tests
│   ├── services/                 # Service layer tests
│   └── integration/              # End-to-end MCP protocol tests
├── package.json
├── tsconfig.json
└── vitest.config.ts

pkg/                              # Vikunja Go backend (UNCHANGED)
└── [existing structure]

frontend/                         # Vikunja Vue.js frontend (UNCHANGED)
└── [existing structure]
```

**Structure Decision**: Multi-component system with three layers:
1. **n8n Workflows** (orchestration layer): Agent routing, conversation management, workflow enforcement
2. **MCP Server** (tool layer): Vikunja integration tools with search-before-action validation
3. **Vikunja Backend/Frontend** (data layer): Existing task management system (no changes)

This separation enables:
- Independent testing of agent logic (workflows), tool implementation (MCP server), and data operations (Vikunja)
- Version-controlled prompts for iteration without touching workflow structure
- Tool-level enforcement that cannot be bypassed by prompt engineering
- Future expansion with new specialists (calendar, documents) without modifying existing components

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

N/A - All Constitution principles satisfied. No violations to justify.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

