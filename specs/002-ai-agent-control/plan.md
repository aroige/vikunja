# Implementation Plan: AI Agent Control via MCP

**Branch**: `002-ai-agent-control` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/home/aron/projects/specs/002-ai-agent-control/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (MCP server + existing Go backend)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the constitution document
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → data-model.md, /contracts/*, quickstart.md
   → Output to feature directory
7. Mark Progress Tracking checkboxes as complete
```

## Summary

**What**: Implement Model Context Protocol (MCP) server to enable AI agent control of Vikunja
**Why**: Enable native AI agent integration for task automation, superior to REST API for agent use cases
**How**: Standalone TypeScript MCP server → Vikunja API v1 → Service Layer, with Proxmox deployment support
**Value**: 10+ agents can control Vikunja natively, <200ms latency, self-hosted infrastructure

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS) for MCP server, Go 1.21+ for existing backend  
**Primary Dependencies**: 
- `@modelcontextprotocol/sdk` (MCP SDK)
- `express` (HTTP server for health checks)
- `rate-limiter-flexible` (per-token rate limiting)
- `axios` (Vikunja API client)
- `zod` (schema validation)
- `winston` (logging)

**Storage**: 
- PostgreSQL (existing Vikunja database for auth/data)
- Redis (rate limiting counters, optional caching)

**Testing**: 
- `vitest` (unit tests)
- `@modelcontextprotocol/sdk/testing` (MCP protocol tests)
- `supertest` (integration tests)

**Target Platform**: 
- Self-hosted Proxmox VE 8.x
- LXC containers (preferred) or VMs
- Independent versioning per deployment

**Project Type**: Distributed system (MCP server + existing web backend)

**Performance Goals**: 
- <200ms p95 latency for MCP tool calls
- 100+ concurrent agent connections per instance
- 100 requests/minute per user token (rate limit)

**Constraints**: 
- Must work with existing Vikunja API v1 (no backend changes)
- Must enforce existing Vikunja permissions model
- Must support independent versioning (v1.0, v1.1, v2.0 running concurrently)
- Must be stateless for horizontal scaling
- External LLM required for natural language task parsing

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Code Quality Standards**: ✅ PASS
- TypeScript strict mode with comprehensive type definitions
- Service-oriented architecture with clear separation (MCP layer, API client, auth, rate limiting)
- ESLint + Prettier for code quality
- Single responsibility: MCP server only handles agent protocol, delegates to Vikunja API

**II. Test-First Development**: ✅ PASS
- TDD approach with vitest
- Target 90% coverage for MCP server code (matches service layer standard)
- Integration tests with mock Vikunja API
- MCP protocol compliance tests using SDK testing utilities

**III. User Experience Consistency**: ✅ PASS
- Consistent error handling across all MCP tools
- Rich metadata in responses (permissions, capabilities, links)
- Agent-friendly error messages with actionable context
- Follows MCP specification v1.0+ standards for interoperability

**IV. Performance Requirements**: ✅ PASS
- <200ms p95 response times for tool calls
- Redis-backed rate limiting for 100 req/min per token
- Connection pooling for Vikunja API calls
- Pagination for large resource listings (default 50 items)

**V. Security & Reliability**: ✅ PASS
- Token-based authentication (Vikunja API tokens)
- Input validation with Zod schemas
- Rate limiting per user token (not per IP)
- No sensitive data in error messages
- Audit logging for all operations
- Circuit breaker for Vikunja API failures

**VI. Technical Debt Management**: ✅ PASS
- No technical shortcuts planned
- External LLM integration via well-defined interface (easy to swap providers)
- Version management strategy documented
- Clear upgrade path between MCP server versions

## Project Structure

### New MCP Server Structure
```
vikunja-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── server.ts             # MCP server implementation
│   ├── config/
│   │   └── index.ts          # Configuration management
│   ├── auth/
│   │   ├── authenticator.ts  # Token validation
│   │   └── permissions.ts    # Permission checking
│   ├── ratelimit/
│   │   ├── limiter.ts        # Rate limiter implementation
│   │   └── storage.ts        # Redis storage adapter
│   ├── vikunja/
│   │   ├── client.ts         # Vikunja API client
│   │   ├── types.ts          # API type definitions
│   │   └── errors.ts         # API error handling
│   ├── llm/
│   │   ├── client.ts         # External LLM client interface
│   │   ├── parser.ts         # Natural language task parser
│   │   └── prompts.ts        # LLM prompts for parsing
│   ├── resources/
│   │   ├── projects.ts       # Project resources
│   │   ├── tasks.ts          # Task resources
│   │   ├── labels.ts         # Label resources
│   │   └── teams.ts          # Team resources
│   ├── tools/
│   │   ├── projects.ts       # Project tools (CRUD)
│   │   ├── tasks.ts          # Task tools (CRUD + operations)
│   │   ├── assignments.ts    # Assignment tools
│   │   ├── search.ts         # Search tools
│   │   └── bulk.ts           # Bulk operation tools
│   ├── prompts/
│   │   └── workflows.ts      # Pre-defined agent workflows
│   └── utils/
│       ├── logger.ts         # Structured logging
│       ├── errors.ts         # Error utilities
│       └── validation.ts     # Input validation helpers
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── mcp/                  # MCP protocol tests
├── deployment/
│   ├── proxmox/
│   │   ├── lxc-template.conf # LXC container template
│   │   ├── setup.sh          # Container setup script
│   │   └── README.md         # Deployment guide
│   ├── docker/
│   │   ├── Dockerfile        # Docker image
│   │   └── docker-compose.yml
│   └── systemd/
│       └── vikunja-mcp.service
├── docs/
│   ├── API.md                # MCP resources/tools documentation
│   ├── DEPLOYMENT.md         # Deployment guide (Proxmox focus)
│   ├── EXAMPLES.md           # Agent workflow examples
│   └── VERSIONING.md         # Version management guide
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.js
└── README.md
```

### Existing Vikunja Structure (No Changes)
```
vikunja/
├── pkg/
│   ├── services/         # ✅ Service layer (already refactored)
│   ├── routes/api/v1/    # ✅ API v1 endpoints (MCP will call these)
│   └── models/           # Database models
└── frontend/             # Vue.js frontend (unchanged)
```

## Phase 0: Outline & Research

### Research Domains

#### 0.1 MCP Protocol Deep Dive
**Questions**:
- What are the required vs optional MCP capabilities?
- How does MCP handle authentication (token passing)?
- What's the resource URI scheme (`vikunja://...`)?
- How do MCP subscriptions work for real-time updates?
- What's the error format for tool failures?

**Output**: Document MCP v1.0+ specification requirements, examples of resource/tool definitions

#### 0.2 Proxmox Deployment Architecture
**Questions**:
- LXC vs VM: Which is better for Node.js MCP server?
- How to handle multiple MCP server versions on same Proxmox host?
- Network configuration (bridge mode, firewall rules)?
- Resource allocation (CPU, memory) per MCP instance?
- Backup strategy for LXC containers?
- Update/upgrade process without downtime?

**Output**: Proxmox deployment architecture document with version isolation strategy

#### 0.3 Rate Limiting Strategy
**Questions**:
- Redis single instance vs cluster for rate limiting?
- Rate limit algorithm (token bucket, sliding window)?
- How to handle rate limit exceeded errors in MCP protocol?
- Per-token tracking: Storage requirements and cleanup?
- Burst allowance strategy?

**Output**: Rate limiting design with Redis schema and configuration

#### 0.4 External LLM Integration
**Questions**:
- Which LLM API to support first? (OpenAI, Anthropic, local Ollama)
- What's the prompt structure for task parsing?
- Fallback behavior if LLM unavailable?
- Caching strategy for parsed tasks?
- Cost estimation per parse operation?

**Output**: LLM integration interface with provider abstraction

#### 0.5 Vikunja API Integration
**Questions**:
- Which v1 endpoints does MCP need? (audit full coverage)
- Authentication flow: Token validation via Vikunja?
- Error mapping: Vikunja errors → MCP errors?
- Pagination strategy for large collections?
- Permission checking: At MCP layer or rely on Vikunja API?

**Output**: Vikunja API client specification with endpoint mapping

#### 0.6 Version Management Strategy
**Questions**:
- Semantic versioning: How do breaking changes work?
- How do agents discover MCP server version?
- Can v1.x and v2.x run simultaneously on same host?
- Configuration differences between versions?
- Migration path for agents between versions?

**Output**: Version management and deployment strategy document

**Deliverable**: `research.md` with findings, architectural decisions, and unresolved questions

## Phase 1: Design & Contracts

### 1.1 Data Model
Extract entities from MCP specification:
- **MCPResource**: Projects, Tasks, Labels, Teams, Users, Comments, Attachments
- **MCPTool**: CRUD operations, assignments, search, bulk operations
- **MCPPrompt**: Workflow templates for common agent tasks
- **AuthToken**: Vikunja API token with user context
- **RateLimit**: Per-token counters with TTL

Output: `data-model.md`

### 1.2 API Contracts
Generate MCP resource and tool schemas:

#### Resources
```typescript
// vikunja://projects/{id}
{
  uri: string;
  name: string;
  mimeType: "application/json";
  metadata: {
    projectId: number;
    title: string;
    description: string;
    owner: { id: number; username: string };
    permissions: { read: boolean; write: boolean; admin: boolean };
  }
}
```

#### Tools
```typescript
// tools/tasks/create
{
  name: "create_task";
  description: "Create a new task in a project";
  inputSchema: {
    projectId: number;
    title: string;
    description?: string;
    dueDate?: string; // ISO 8601
    priority?: number;
    labels?: number[];
  };
  outputSchema: {
    taskId: number;
    success: boolean;
    message: string;
  };
}
```

Output: `/contracts/mcp-resources.json`, `/contracts/mcp-tools.json`

### 1.3 Contract Tests
Generate failing tests for each tool and resource:
```typescript
describe('tools/tasks/create', () => {
  it('should create task with valid input', async () => {
    const result = await server.callTool('create_task', {
      projectId: 1,
      title: 'Test task'
    });
    expect(result.success).toBe(true);
    expect(result.taskId).toBeGreaterThan(0);
  });
  
  it('should reject invalid project', async () => {
    await expect(
      server.callTool('create_task', { projectId: 999, title: 'Test' })
    ).rejects.toThrow('Project not found');
  });
});
```

### 1.4 Quickstart Guide
Create `quickstart.md` with:
- MCP server setup (npm install, config)
- Local development workflow
- Testing with Claude Desktop
- Deployment to Proxmox
- Example agent interactions

### 1.5 Update Agent Context
Run agent context update:
```bash
.specify/scripts/bash/update-agent-context.sh copilot
```

**Output**: `data-model.md`, `/contracts/*`, quickstart.md, updated agent files

## Phase 2: Task Planning Approach
*Tasks are generated by `/tasks` command, not /plan*

### Task Categories

#### 2.1 Foundation Tasks
- Project setup (TypeScript, dependencies, config)
- Logging infrastructure (Winston)
- Error handling utilities
- Configuration management (env vars)

#### 2.2 Authentication & Rate Limiting
- Token validation via Vikunja API
- Rate limiter with Redis backend
- Per-token counter management
- Rate limit error responses

#### 2.3 Vikunja API Client
- HTTP client with connection pooling
- Endpoint wrappers for all required operations
- Error mapping (Vikunja → MCP)
- Pagination handling
- Permission caching

#### 2.4 MCP Resources
- Project resource provider
- Task resource provider
- Label, Team, User resource providers
- Resource URI routing
- Resource metadata enrichment

#### 2.5 MCP Tools
- Task CRUD tools
- Project management tools
- Assignment tools
- Search tools
- Bulk operation tools
- Tool input validation (Zod schemas)

#### 2.6 LLM Integration
- External LLM client interface
- OpenAI provider implementation
- Task parsing from natural language
- Prompt engineering for task extraction
- Fallback handling

#### 2.7 MCP Prompts
- Quick task creation workflow
- Project summary workflow
- Team status report workflow
- Task prioritization workflow

#### 2.8 Deployment Infrastructure
- Proxmox LXC template
- Container setup script
- Systemd service configuration
- Health check endpoint
- Monitoring setup (optional Prometheus)

#### 2.9 Testing
- Unit tests for all modules (90% coverage)
- Integration tests with mock Vikunja API
- MCP protocol compliance tests
- Rate limiting tests
- Load tests (100+ concurrent connections)

#### 2.10 Documentation
- API documentation (resources, tools, prompts)
- Deployment guide (Proxmox-specific)
- Version management guide
- Example agent workflows
- Troubleshooting guide

### Parallel Execution Strategy
- ✅ Foundation + Auth can run parallel
- ✅ Resources + Tools can develop in parallel (after Vikunja client)
- ✅ LLM integration independent of core MCP
- ✅ Deployment + Docs can start early with templates

### Estimation
- Phase 0 (Research): 2-3 days
- Phase 1 (Design): 2-3 days
- Phase 2-4 (Implementation): 12-15 days (via /tasks breakdown)
- **Total**: 3-4 weeks

## Phase 3+: Future Implementation
*Detailed tasks generated by `/tasks` command after this plan is approved*

### Phase 3: Core Implementation
- Execute tasks from Phase 2 categories 2.1-2.5
- TDD approach: Write failing tests first
- Incremental development with integration testing

### Phase 4: Advanced Features
- Execute tasks from Phase 2 categories 2.6-2.7
- LLM integration with real API
- Workflow prompts with examples

### Phase 5: Deployment & Documentation
- Execute tasks from Phase 2 categories 2.8-2.10
- Proxmox deployment tested
- Complete documentation

### Phase 6: Validation & Launch
- Load testing (100+ concurrent agents)
- Security audit
- Performance profiling
- Production deployment to Proxmox
- Agent onboarding guide

## Complexity Tracking

### High Complexity Items
1. **Rate Limiting with Redis** (Medium-High)
   - Challenge: Distributed rate limiting, token cleanup
   - Mitigation: Use battle-tested library (`rate-limiter-flexible`)
   - Effort: 3 days

2. **Version Isolation on Proxmox** (Medium)
   - Challenge: Multiple MCP versions, network isolation
   - Mitigation: LXC containers with separate ports
   - Effort: 2 days

3. **LLM Integration** (Medium)
   - Challenge: External dependency, prompt engineering
   - Mitigation: Provider abstraction, graceful degradation
   - Effort: 3 days

4. **Permission Enforcement** (Medium)
   - Challenge: Vikunja permission model is complex
   - Mitigation: Rely on Vikunja API for all permission checks
   - Effort: 2 days

### Deviation from Constitution
**None identified** - All requirements satisfied

### Simplification Opportunities
1. **Phase 1**: Start with OpenAI LLM only, add other providers later
2. **Phase 1**: Support LXC deployment only (skip VM option)
3. **Phase 1**: Single Redis instance (skip cluster complexity)
4. **Phase 2**: Implement subset of tools first (tasks, projects), add others incrementally

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

**Key Milestones**:
- [ ] MCP server responds to basic resource requests
- [ ] Authentication working with Vikunja tokens
- [ ] Rate limiting enforced per token
- [ ] Task creation tool working end-to-end
- [ ] LLM task parsing functional
- [ ] Deployed to Proxmox and accepting agent connections
- [ ] 10+ agents successfully using MCP server

---

## Notes

### Integration Points with Existing System
- **Zero changes** to Vikunja Go backend required
- MCP server is **pure addition**, not modification
- Uses existing API v1 endpoints
- Leverages completed service layer from Feature 001

### Proxmox Deployment Strategy
- **LXC Container** per MCP server version
- Port mapping: v1.0 → 9001, v1.1 → 9002, v2.0 → 9003
- Shared Redis instance (or separate if needed)
- Reverse proxy (nginx/traefik) optional for SSL termination
- Resource limits: 2 vCPU, 2GB RAM per container (tune based on load)

### Version Management
- MCP server versions independent of Vikunja versions
- Breaking changes increment major version (v1 → v2)
- Agents specify version in connection string
- Old versions supported for 6 months after new major release
- Configuration stored in `/etc/vikunja-mcp/v{version}/`

### Rate Limiting Details
- **Per-token limit**: 100 requests/minute
- **Algorithm**: Sliding window with Redis
- **Burst allowance**: 120 requests (20% burst)
- **Token cleanup**: Expire unused tokens after 24 hours
- **Admin override**: Special tokens can bypass limits

### LLM Task Parsing
- **Primary provider**: OpenAI GPT-4 Turbo
- **Fallback**: Anthropic Claude 3
- **Local option**: Ollama (for self-hosted)
- **Prompt template**: Extract title, description, due date, priority from natural language
- **Caching**: Cache parsed results for 5 minutes (same input)
- **Cost**: ~$0.01 per task parse (GPT-4 Turbo pricing)

---

*Based on Constitution v2.0.0 - See `.specify/memory/constitution.md`*
