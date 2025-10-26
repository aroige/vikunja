# Quickstart: MCP Server Development

**Feature**: MCP Server Capability Enhancement  
**Target Audience**: Developers implementing new tools and enhancements

## Prerequisites

- Node.js 22+
- pnpm package manager
- Running Vikunja instance (for testing)
- Vikunja API token (get from Vikunja settings)

## Setup

```bash
cd mcp-server

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Configure environment
# Edit .env and set:
# - VIKUNJA_URL=http://localhost:3456
# - VIKUNJA_API_TOKEN=your_token_here
```

## Development Workflow

### 1. Run Development Server

```bash
# Watch mode (auto-restart on changes)
pnpm dev

# Or run directly
pnpm build && node dist/index.js
```

### 2. Run Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode during development
pnpm test -- --watch
```

### 3. Lint & Format

```bash
# Check linting
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

## Project Structure

```
mcp-server/
├── src/
│   ├── tools/           # MCP tool implementations
│   │   ├── projects.ts
│   │   ├── tasks.ts
│   │   ├── relations.ts    # NEW
│   │   ├── comments.ts     # NEW
│   │   ├── labels.ts       # NEW (extends assignments.ts)
│   │   └── index.ts        # Tool registry
│   ├── vikunja/
│   │   ├── client.ts       # Vikunja API client
│   │   └── types.ts        # TypeScript interfaces
│   ├── transports/
│   │   ├── stdio.ts        # Claude Desktop
│   │   └── http.ts         # n8n
│   └── index.ts
├── tests/
│   └── tools/              # Mirror src/tools structure
└── docs/
    └── TOOLS.md            # Auto-generated docs
```

## Adding a New Tool

### Step 1: Define Zod Schema

```typescript
// src/tools/my-feature.ts
import { z } from 'zod';

export const MyToolSchema = z.object({
  param1: z.number().int().positive()
    .describe("Clear description with examples"),
  param2: z.string().optional()
    .describe("Optional parameter explanation")
});

export type MyToolInput = z.infer<typeof MyToolSchema>;
```

### Step 2: Implement Tool Function

```typescript
export async function myTool(
  input: MyToolInput,
  vikunjaClient: VikunjaClient
): Promise<MyToolResult> {
  try {
    // Validate input
    const validated = MyToolSchema.parse(input);
    
    // Call Vikunja API
    const response = await vikunjaClient.get(`/api/v1/endpoint/${validated.param1}`);
    
    // Transform and return
    return {
      success: true,
      data: response.data,
      message: "Operation successful"
    };
  } catch (error) {
    // Handle errors with context
    if (error.response?.status === 403) {
      throw new Error(`Permission denied: cannot access resource ${input.param1}`);
    }
    throw error;
  }
}
```

### Step 3: Register Tool

```typescript
// src/tools/index.ts
import { myTool, MyToolSchema } from './my-feature';

export const tools = [
  // ... existing tools ...
  {
    name: "my_tool",
    description: "One-line purpose. Use this when [scenario]. Returns [outcome]. Example: Use my_tool to retrieve X when you need Y.",
    inputSchema: MyToolSchema,
    handler: myTool
  }
];
```

### Step 4: Write Tests

```typescript
// tests/tools/my-feature.test.ts
import { describe, it, expect, vi } from 'vitest';
import { myTool } from '../../src/tools/my-feature';
import { createMockVikunjaClient } from '../helpers';

describe('myTool', () => {
  it('succeeds with valid input', async () => {
    const mockClient = createMockVikunjaClient({
      get: vi.fn().mockResolvedValue({ data: { id: 1, name: "Test" } })
    });
    
    const result = await myTool({ param1: 1 }, mockClient);
    
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: 1, name: "Test" });
  });
  
  it('handles permission errors with context', async () => {
    const mockClient = createMockVikunjaClient({
      get: vi.fn().mockRejectedValue({ response: { status: 403 } })
    });
    
    await expect(myTool({ param1: 999 }, mockClient))
      .rejects.toThrow(/Permission denied: cannot access resource 999/);
  });
  
  it('validates input schema', async () => {
    const mockClient = createMockVikunjaClient();
    
    await expect(myTool({ param1: -1 }, mockClient))
      .rejects.toThrow(/positive/);
  });
});
```

### Step 5: Update Vikunja Client (if needed)

```typescript
// src/vikunja/client.ts
export class VikunjaClient {
  async getMyResource(id: number): Promise<MyResource> {
    const response = await this.axios.get(`/api/v1/my-resource/${id}`);
    return response.data;
  }
}

// src/vikunja/types.ts
export interface MyResource {
  id: number;
  name: string;
  // ... other fields
}
```

## Tool Description Best Practices

### Structure

```
"[One-line purpose]. Use this when [scenario]. Returns [outcome]. [Key details]. Example: [concrete example]."
```

### Good Example

```typescript
{
  name: "create_task_relation",
  description: "Create a relationship between two tasks (subtask, blocker, duplicate, etc.). Use this to express task dependencies, hierarchies, or associations. Creates bidirectional relation automatically (e.g., A is subtask of B → B is parenttask of A). Returns both task IDs and relation kind. Example: Use create_task_relation with kind='subtask' to make task 5 a subtask of task 3.",
  // ...
}
```

### Parameter Descriptions

- Include units (seconds not minutes)
- Specify valid values/ranges
- Give examples for enum types
- Explain domain-specific terms

```typescript
repeat_after: z.number()
  .describe("Seconds between recurrences. NOT minutes or hours - use seconds (86400 = 1 day, 604800 = 1 week).")
```

## Testing Strategy

### Unit Tests (Required)

- ✅ Success case with valid input
- ✅ Permission error (403) with contextual message
- ✅ Validation error (400) with clear explanation
- ✅ Not found error (404)
- ✅ Edge cases (empty results, large datasets)

### Integration Tests (Recommended)

```typescript
// tests/integration/task-workflow.test.ts
describe('Complete task workflow', () => {
  it('creates task hierarchy with comments and labels', async () => {
    // Create parent task
    const parent = await createTask({ title: "Parent" });
    
    // Create subtask with relation
    const child = await createTask({ title: "Child" });
    await createTaskRelation({
      task_id: child.id,
      other_task_id: parent.id,
      relation_kind: 'subtask'
    });
    
    // Add comment
    await addTaskComment({
      task_id: child.id,
      comment: "Started work on this"
    });
    
    // Add label
    await addLabel({ task_id: child.id, label_id: 1 });
    
    // Verify complete state
    const relations = await getTaskRelations({ task_id: parent.id });
    expect(relations.relations.subtasks).toHaveLength(1);
  });
});
```

## Performance Guidelines

### Response Time Targets

- **Typical operations** (<2s): Single task queries, creating relations, adding comments
- **Bulk operations** (<5s): Retrieving 100+ comments, relations, or labels

### Pagination

```typescript
// Always support optional pagination for collections
{
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(50)
}

// Return paginated response
return {
  items: data,
  total: totalCount,
  page: params.page,
  page_size: params.page_size,
  has_next_page: (params.page * params.page_size) < totalCount
};
```

## Error Handling

### Pattern

```typescript
try {
  // Validation
  const validated = Schema.parse(input);
  
  // API call
  const response = await vikunjaClient.post('/endpoint', validated);
  
  return { success: true, data: response };
} catch (error) {
  // Permission errors - include context
  if (error.response?.status === 403) {
    throw new Error(`Permission denied: cannot modify task in project '${projectName}'`);
  }
  
  // Validation errors - explain what's wrong
  if (error instanceof z.ZodError) {
    throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
  }
  
  // Other errors - preserve context
  throw new Error(`Operation failed: ${error.message}`);
}
```

## Debugging

### Enable Verbose Logging

```bash
# Set in .env
LOG_LEVEL=debug

# Or via environment
LOG_LEVEL=debug pnpm dev
```

### Test with curl

```bash
# Create task relation
curl -X POST http://localhost:3000/tools/create_task_relation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"task_id": 1, "other_task_id": 2, "relation_kind": "subtask"}'
```

### Test with Claude Desktop

1. Configure in Claude Desktop settings
2. Add stdio transport configuration
3. Test via Claude chat interface

## Common Patterns

### Bidirectional Relations

```typescript
const RELATION_INVERSES = {
  subtask: 'parenttask',
  parenttask: 'subtask',
  // ...
};

// When creating A→B, Vikunja automatically creates B→A with inverse kind
```

### Cycle Prevention

```typescript
// Hierarchical relations (subtask/parenttask) prevent cycles
// Vikunja API handles this - MCP tool documents behavior
if (HIERARCHICAL_RELATIONS.includes(relation_kind)) {
  // Vikunja will reject if creates cycle
}
```

### Last-Write-Wins Concurrency

```typescript
// No optimistic locking at MCP layer
// Vikunja API handles concurrent modifications with last-write-wins
// Document this behavior in tool descriptions
```

## Resources

- **Vikunja API Docs**: https://vikunja.io/docs/api-documentation/
- **MCP SDK Docs**: https://modelcontextprotocol.io/docs
- **Project README**: `/mcp-server/README.md`
- **Architecture Docs**: `/mcp-server/docs/DEVELOPMENT.md`

## Next Steps

1. Review existing tools in `src/tools/` for patterns
2. Check test coverage: `pnpm test:coverage`
3. Read contracts in `/specs/008-mcp-server-improvements/contracts/`
4. Implement new tools following TDD workflow
5. Update tool descriptions for clarity
