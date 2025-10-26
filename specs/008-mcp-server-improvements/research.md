# Phase 0: Research & Design Decisions

**Feature**: MCP Server Capability Enhancement  
**Date**: 2025-10-26  
**Status**: Complete

## Overview

This document captures research findings and design decisions for enhancing the Vikunja MCP server with comprehensive tool coverage, improved descriptions, and n8n workflow reliability.

## Research Areas

### 1. Vikunja API Endpoints for New Features

**Decision**: Use existing Vikunja v1 API endpoints for task relations, comments, labels, and attachments

**Vikunja API Endpoints Confirmed**:

**Task Relations**:
- `GET /api/v1/tasks/:id/relations` - Get all relations for a task
- `PUT /api/v1/tasks/:id/relations` - Create relation (body: `{other_task_id, relation_kind}`)
- `DELETE /api/v1/tasks/:id/relations/:other_task_id/:relation_kind` - Delete specific relation

**Task Comments**:
- `GET /api/v1/tasks/:id/comments` - List all comments for task
- `PUT /api/v1/tasks/:id/comments` - Create comment (body: `{comment}`)
- `POST /api/v1/tasks/:id/comments/:comment_id` - Update comment
- `DELETE /api/v1/tasks/:id/comments/:comment_id` - Delete comment

**Labels**:
- `GET /api/v1/labels` - List all accessible labels (supports pagination via query params)
- `PUT /api/v1/labels` - Create label (body: `{title, description?, hex_color?}`)
- `GET /api/v1/labels/:id` - Get specific label
- `POST /api/v1/labels/:id` - Update label
- `DELETE /api/v1/labels/:id` - Delete label
- `GET /api/v1/tasks/:id/labels` - Get labels for task
- `PUT /api/v1/tasks/:id/labels` - Add label to task (body: `{label_id}`)
- `DELETE /api/v1/tasks/:id/labels/:label` - Remove label from task

**Task Attachments**:
- `GET /api/v1/tasks/:id/attachments` - Get attachment metadata for task

**Rationale**: All required endpoints exist in Vikunja v1 API. No backend changes needed. MCP server acts as pass-through with enhanced tool descriptions.

**Alternatives Considered**:
- Vikunja v2 API: Not yet stable, v1 sufficient for all requirements
- GraphQL: Vikunja uses REST, no need to add GraphQL complexity

---

### 2. MCP Tool Description Best Practices

**Decision**: Follow MCP SDK documentation patterns with enhanced agent-focused descriptions

**Pattern**:
```typescript
{
  name: "tool_name",
  description: "One-line purpose. Use this when [scenario]. Returns [outcome].",
  inputSchema: {
    type: "object",
    properties: {
      param: {
        type: "string",
        description: "Human-readable explanation with examples and constraints"
      }
    },
    required: ["param"]
  }
}
```

**Key Elements**:
1. **Purpose**: What the tool does (one sentence)
2. **Use Case**: When to use this tool vs alternatives
3. **Expected Outcome**: What the agent should expect back
4. **Parameter Descriptions**: Include examples, valid values, units (e.g., "seconds not minutes")
5. **Vikunja Terminology**: Explain domain-specific terms inline

**Examples**:

```typescript
// Good: Enhanced description
{
  name: "create_task_relation",
  description: "Create a relationship between two tasks (subtask, blocker, duplicate, etc.). Use this to express task dependencies, hierarchies, or associations. Creates bidirectional relation automatically (e.g., A is subtask of B → B is parenttask of A). Returns both task IDs and relation kind.",
  inputSchema: {
    properties: {
      task_id: {
        type: "number",
        description: "ID of the first task in the relationship"
      },
      other_task_id: {
        type: "number",
        description: "ID of the second task in the relationship"
      },
      relation_kind: {
        type: "string",
        enum: ["subtask", "parenttask", "related", "duplicateof", "duplicates", "blocking", "blocked", "precedes", "follows", "copiedfrom", "copiedto"],
        description: "Type of relationship. subtask/parenttask = hierarchical (prevents cycles), related = loose association, blocking/blocked = dependency, duplicates/duplicateof = same work, precedes/follows = sequence, copiedfrom/copiedto = cloned task tracking"
      }
    }
  }
}

// Bad: Minimal description (current state)
{
  name: "create_task",
  description: "Create a new task",
  // Missing: when to use vs bulk_create, what gets returned, parameter examples
}
```

**Rationale**: AI agents rely heavily on tool descriptions to select appropriate operations. Comprehensive descriptions reduce trial-and-error and improve agent reliability.

**Alternatives Considered**:
- Separate documentation files: Agents may not access them, inline descriptions more reliable
- Minimal descriptions: Leads to agent confusion and wrong tool selection

**References**:
- MCP SDK documentation: https://modelcontextprotocol.io/docs
- Existing high-quality MCP servers for patterns

---

### 3. Pagination Strategy for Large Collections

**Decision**: Optional pagination with sensible defaults (page_size=50, max 100)

**Implementation**:
```typescript
interface PaginationParams {
  page?: number;        // Default: 1
  page_size?: number;   // Default: 50, max: 100
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
}
```

**Tools Requiring Pagination**:
- `get_task_comments` - Tasks can have 100+ comments
- `get_all_labels` - Users may have 500+ labels across projects
- `get_task_relations` - Complex projects may have 50+ relations per task
- `search_tasks` - Already has pagination, document clearly

**Rationale**: 
- 50-item default fits agent context windows and typical UI displays
- 100-item maximum prevents timeout while allowing larger batches
- Optional keeps simple use cases simple
- Aligns with <2s typical, <5s bulk performance requirements

**Alternatives Considered**:
- No pagination: Risks timeout on large datasets, violates performance constraints
- Mandatory pagination: Complicates simple queries unnecessarily
- Cursor-based pagination: More complex, offset-based sufficient for MCP use case

---

### 4. Relation Kind Bidirectional Mapping

**Decision**: Implement helper function for automatic inverse relation mapping

**Mapping Table**:
```typescript
const RELATION_INVERSES: Record<RelationKind, RelationKind> = {
  subtask: 'parenttask',
  parenttask: 'subtask',
  related: 'related',        // Symmetric
  duplicateof: 'duplicates',
  duplicates: 'duplicateof',
  blocking: 'blocked',
  blocked: 'blocking',
  precedes: 'follows',
  follows: 'precedes',
  copiedfrom: 'copiedto',
  copiedto: 'copiedfrom'
};
```

**Rationale**: Vikunja API creates bidirectional relations automatically. MCP tools should reflect this in descriptions to set agent expectations. Helper function useful for validation and documentation generation.

**Alternatives Considered**:
- Let agents discover bidirectionality through trial: Confusing, wastes agent cycles
- Document only without helper: Misses opportunity for validation

---

### 5. Error Message Detail Level

**Decision**: Include resource type and context without exposing sensitive details (from clarification session)

**Pattern**:
```typescript
// Good: Contextual without leaking sensitive info
throw new Error("Permission denied: cannot modify task in project 'Team Planning'");

// Bad: Too minimal (agent can't explain to user)
throw new Error("Permission denied");

// Bad: Too detailed (leaks info about inaccessible resources)
throw new Error("Permission denied: task 'Secret Project Launch' requires write access on project 1234");
```

**Rationale**: Balances agent debugging capability with security. Agents need enough context to explain failures to users without exposing details of resources users shouldn't know about.

---

### 6. Recurring Task Documentation Enhancement

**Decision**: Add comprehensive examples and mode explanations to create_task/update_task descriptions

**Mode Documentation**:
```typescript
// In tool description:
repeat_mode: {
  type: "number",
  enum: [0, 1, 2],
  description: "Recurrence calculation mode. 0 (default) = repeat from last due date (e.g., weekly meeting every Monday). 1 (monthly) = repeat on same calendar date each month (e.g., monthly report on 1st). 2 (from current) = repeat from task completion date (e.g., review 3 days after finishing). Use mode 0 for regular schedules, mode 1 for monthly calendar events, mode 2 for follow-up tasks."
}

repeat_after: {
  type: "number",
  description: "Seconds between recurrences. NOT minutes or hours - use seconds (86400 = 1 day, 604800 = 1 week). For mode 1 (monthly), set to 0. Examples: daily = 86400, weekly = 604800, biweekly = 1209600, every 3 days = 259200."
}
```

**Rationale**: Recurring tasks are complex but commonly needed. Clear examples prevent agent confusion about units (seconds) and mode selection.

---

### 7. n8n JSON Mode Compatibility

**Decision**: Existing MCP_HTTP_JSON_RESPONSE environment variable approach is correct

**Current Implementation**:
- Environment variable `MCP_HTTP_JSON_RESPONSE=true` enables JSON mode
- Affects only HTTP transport (n8n), not stdio (Claude Desktop)
- Ensures all responses are valid JSON without custom headers

**No Changes Needed**: Feature already implemented correctly. Documentation in README.md confirms n8n compatibility.

**Rationale**: n8n limitation with custom headers requires JSON-only responses. Environment variable cleanly enables this without affecting other transports.

---

### 8. Vikunja API Version Compatibility

**Decision**: Log warning on startup if version mismatch detected, continue with best-effort compatibility (from clarification session)

**Implementation**:
```typescript
async function checkVikunjaVersion(client: VikunjaClient) {
  try {
    const info = await client.get('/api/v1/info');
    const expectedVersion = '0.24.x'; // Update as needed
    
    if (!info.version.startsWith('0.24')) {
      logger.warn(`Vikunja API version mismatch: expected ${expectedVersion}, got ${info.version}. Some features may not work correctly.`);
    } else {
      logger.info(`Connected to Vikunja API ${info.version}`);
    }
  } catch (error) {
    logger.error('Failed to check Vikunja version', error);
    // Continue anyway - version check is best-effort
  }
}
```

**Rationale**: Most Vikunja changes are backward-compatible. Warning alerts administrators to potential issues without blocking operation. Strict version checking would cause unnecessary operational friction.

---

### 9. Concurrent Modification Handling

**Decision**: Last-write-wins, rely on Vikunja API (from clarification session)

**No MCP-Layer Changes**: Vikunja API already handles concurrent modifications with last-write-wins semantics. MCP server passes requests through without additional conflict detection or optimistic locking.

**Rationale**: Task management typically tolerates last-write-wins. Adding optimistic locking at MCP layer would significantly complicate implementation without proportional benefit for typical agent workflows.

---

### 10. Test Strategy for New Tools

**Decision**: Unit tests with mocked Vikunja API responses, integration tests for end-to-end workflows

**Test Structure**:
```typescript
// Unit test pattern (tests/tools/relations.test.ts)
describe('create_task_relation', () => {
  it('creates bidirectional relation successfully', async () => {
    const mockClient = createMockVikunjaClient({
      put: vi.fn().mockResolvedValue({
        task_id: 1,
        other_task_id: 2,
        relation_kind: 'subtask'
      })
    });
    
    const result = await tools.create_task_relation({
      task_id: 1,
      other_task_id: 2,
      relation_kind: 'subtask'
    }, mockClient);
    
    expect(result).toMatchObject({
      task_id: 1,
      other_task_id: 2,
      relation_kind: 'subtask'
    });
  });
  
  it('rejects cyclic hierarchical relations', async () => {
    // Test validation logic
  });
  
  it('handles permission errors with context', async () => {
    // Test error message format
  });
});

// Integration test pattern (tests/integration/end-to-end.test.ts)
describe('Task workflow with relations and comments', () => {
  it('creates task hierarchy with comments', async () => {
    // Create parent task
    // Create subtask with relation
    // Add comment to subtask
    // Verify complete workflow
  });
});
```

**Coverage Requirements**:
- 90%+ overall coverage (maintain existing 98.5%)
- Each new tool: success case + permission error + validation error
- Pagination: empty results, partial page, full page, multiple pages
- Relation tools: all 10 relation kinds + cycle prevention

**Rationale**: Comprehensive unit tests with mocks enable rapid iteration. Integration tests validate end-to-end agent workflows. Mocking Vikunja API prevents test flakiness from external dependencies.

---

## Summary

All research areas resolved with concrete design decisions:

1. ✅ **Vikunja API Endpoints**: All required endpoints exist in v1 API
2. ✅ **Tool Descriptions**: Pattern defined with examples (purpose + use case + outcome + parameter details)
3. ✅ **Pagination**: Optional with page_size=50, max 100
4. ✅ **Relation Mapping**: Helper function for bidirectional relation inverses
5. ✅ **Error Messages**: Resource type + context without sensitive details
6. ✅ **Recurring Tasks**: Comprehensive mode + examples documentation
7. ✅ **n8n Compatibility**: Existing JSON mode correct, no changes needed
8. ✅ **Version Checking**: Log warnings, continue with best-effort compatibility
9. ✅ **Concurrency**: Last-write-wins via Vikunja API
10. ✅ **Testing**: Unit + integration tests, 90%+ coverage target

**No blockers identified**. Ready for Phase 1 (Data Model & Contracts).
