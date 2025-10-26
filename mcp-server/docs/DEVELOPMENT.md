# Development Guide - Vikunja MCP Server

> Complete guide for developers contributing to or extending the Vikunja MCP Server

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Adding a New Tool](#adding-a-new-tool)
- [Testing Guidelines](#testing-guidelines)
- [Code Quality](#code-quality)
- [Common Tasks](#common-tasks)

## Prerequisites

Before you begin, ensure you have:

- **Node.js 22+** - Required for development
- **pnpm** - Package manager (`npm install -g pnpm`)
- **Redis** - For rate limiting (optional in dev, can use in-memory fallback)
- **Vikunja instance** - For testing against real API
- **Git** - Version control

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/vikunja/vikunja.git
cd vikunja/mcp-server

# Install dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

Required environment variables:
```bash
# Vikunja API connection
VIKUNJA_API_URL=http://localhost:3456
VIKUNJA_API_TOKEN=your-dev-token-here

# Optional: Redis for rate limiting
REDIS_URL=redis://localhost:6379

# Optional: Enable JSON response mode for n8n
MCP_HTTP_JSON_RESPONSE=false

# Optional: Server port (default: 3457)
PORT=3457
```

### 3. Verify Installation

```bash
# Run tests to verify everything works
pnpm test

# Check linting
pnpm lint

# Build the project
pnpm build
```

## Development Workflow

### Quick Commands

```bash
# Development
pnpm dev              # Start development server with watch mode
pnpm build            # Build TypeScript to dist/
pnpm start            # Run built server

# Testing
pnpm test             # Run all tests
pnpm test:coverage    # Run tests with coverage report
pnpm test:watch       # Run tests in watch mode
pnpm test:relations   # Run specific test suite (relations)
pnpm test:comments    # Run specific test suite (comments)
pnpm test:labels      # Run specific test suite (labels)
pnpm test:attachments # Run specific test suite (attachments)
pnpm test:integration # Run integration tests

# Code Quality
pnpm lint             # Check code for issues
pnpm lint:fix         # Auto-fix linting issues
pnpm format           # Format code with Prettier

# Documentation
pnpm generate:docs    # Auto-generate TOOLS.md from tool registry
```

### Test-Driven Development (TDD)

This project follows strict TDD as per the [Vikunja Constitution](../../../.specify/memory/constitution.md):

1. **Write failing test first**
   ```typescript
   // tests/tools/mytool.test.ts
   describe('myNewTool', () => {
     it('should create a new resource', async () => {
       const result = await toolRegistry.executeTool('my_new_tool', {
         name: 'Test Resource',
       });
       expect(result).toMatchObject({ id: expect.any(Number) });
     });
   });
   ```

2. **Run test - verify it fails**
   ```bash
   pnpm test:watch
   # Should show: FAIL - myNewTool › should create a new resource
   ```

3. **Implement minimal code to pass**
   ```typescript
   // src/tools/mytool.ts
   export async function myNewTool(args: MyToolArgs): Promise<Result> {
     // Implementation here
   }
   ```

4. **Run test - verify it passes**
   ```bash
   # Should show: PASS - myNewTool › should create a new resource
   ```

5. **Refactor if needed** - tests still pass

## Project Structure

```
mcp-server/
├── src/
│   ├── config/              # Configuration management
│   │   └── config.ts        # Zod schemas for env validation
│   ├── auth/                # Authentication
│   │   └── token-cache.ts   # Token caching with Redis
│   ├── ratelimit/           # Rate limiting
│   │   ├── limiter.ts       # Rate limiter implementation
│   │   └── redis.ts         # Redis client wrapper
│   ├── vikunja/             # Vikunja API client
│   │   ├── client.ts        # API client methods
│   │   └── types.ts         # TypeScript interfaces for Vikunja models
│   ├── tools/               # MCP tool implementations
│   │   ├── registry.ts      # Tool registration and discovery
│   │   ├── projects.ts      # Project management tools
│   │   ├── tasks.ts         # Task management tools
│   │   ├── relations.ts     # Task relation tools (NEW)
│   │   ├── comments.ts      # Comment tools (NEW)
│   │   ├── labels.ts        # Label management tools (NEW)
│   │   ├── attachments.ts   # Attachment tools (NEW)
│   │   ├── search.ts        # Search and filtering tools
│   │   ├── assignments.ts   # User assignment tools
│   │   └── bulk.ts          # Bulk operation tools
│   ├── resources/           # MCP resource providers
│   │   └── projects.ts      # Project resource provider
│   ├── transports/          # MCP transports
│   │   ├── stdio/           # Standard I/O transport
│   │   └── http/            # HTTP Streamable transport
│   ├── utils/               # Shared utilities
│   │   ├── pagination.ts    # Pagination helpers (NEW)
│   │   └── errors.ts        # Error formatting (NEW)
│   └── index.ts             # Server entry point
├── tests/
│   ├── unit/                # Unit tests (mirror src/ structure)
│   ├── tools/               # Tool-specific tests
│   │   ├── relations.test.ts
│   │   ├── comments.test.ts
│   │   ├── labels.test.ts
│   │   └── attachments.test.ts
│   └── integration/         # End-to-end integration tests
│       ├── task-workflow.test.ts
│       └── n8n-workflow.test.ts
├── docs/                    # User-facing documentation
│   ├── API.md              # Legacy API reference
│   ├── TOOLS.md            # Auto-generated tool catalog (NEW)
│   ├── DEPLOYMENT.md       # Deployment guides
│   ├── INTEGRATIONS.md     # Platform integration guides
│   ├── EXAMPLES.md         # Workflow examples
│   ├── DEVELOPMENT.md      # This file
│   └── n8n-integration.md  # n8n-specific guide (NEW)
├── scripts/
│   └── generate-tools-doc.ts  # Auto-generate TOOLS.md (NEW)
├── .env.example            # Example environment configuration
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Test configuration
└── package.json            # Dependencies and scripts
```

## Adding a New Tool

Complete walkthrough for adding a new MCP tool to the server.

### Step 1: Write Tests First (TDD)

Create test file in `tests/tools/[category].test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VikunjaClient } from '../../src/vikunja/client.js';
import { ToolRegistry } from '../../src/tools/registry.js';

describe('MyNewTool', () => {
  let toolRegistry: ToolRegistry;
  let mockVikunjaClient: VikunjaClient;

  beforeEach(() => {
    mockVikunjaClient = {
      myNewMethod: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
    } as any;
    
    toolRegistry = new ToolRegistry(mockVikunjaClient);
  });

  it('should call Vikunja API with correct parameters', async () => {
    const result = await toolRegistry.executeTool('my_new_tool', {
      name: 'Test Resource',
      description: 'Test Description',
    });

    expect(mockVikunjaClient.myNewMethod).toHaveBeenCalledWith({
      name: 'Test Resource',
      description: 'Test Description',
    });
    expect(result).toMatchObject({ id: 1, name: 'Test' });
  });

  it('should validate required parameters', async () => {
    await expect(
      toolRegistry.executeTool('my_new_tool', {})
    ).rejects.toThrow('name is required');
  });

  it('should handle permission errors with resource context', async () => {
    mockVikunjaClient.myNewMethod = vi.fn().mockRejectedValue({
      response: { status: 403 },
    });

    await expect(
      toolRegistry.executeTool('my_new_tool', { name: 'Test' })
    ).rejects.toThrow('permission');
  });
});
```

**Run tests - they should FAIL:**
```bash
pnpm test:watch
# FAIL - MyNewTool › should call Vikunja API with correct parameters
```

### Step 2: Add Vikunja API Method

Add API client method in `src/vikunja/client.ts`:

```typescript
export class VikunjaClient {
  // ... existing methods

  async myNewMethod(data: MyNewResourceData): Promise<MyNewResource> {
    const response = await this.client.post<MyNewResource>(
      '/api/v1/my-resource',
      data
    );
    return response.data;
  }
}
```

Add TypeScript interface in `src/vikunja/types.ts`:

```typescript
export interface MyNewResource {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface MyNewResourceData {
  name: string;
  description?: string;
}
```

### Step 3: Create Tool Implementation

Create or update tool file in `src/tools/[category].ts`:

```typescript
import { z } from 'zod';
import type { VikunjaClient } from '../vikunja/client.js';

// Zod schema for input validation
export const MyNewToolSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export class MyTools {
  constructor(private vikunjaClient: VikunjaClient) {}

  async myNewTool(args: z.infer<typeof MyNewToolSchema>): Promise<MyNewResource> {
    try {
      const result = await this.vikunjaClient.myNewMethod({
        name: args.name,
        description: args.description,
      });
      
      return result;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error(
          formatPermissionError('my_resource', 'create', args.name)
        );
      }
      throw error;
    }
  }
}
```

### Step 4: Register Tool in Registry

Update `src/tools/registry.ts`:

```typescript
export class ToolRegistry {
  constructor(private vikunjaClient: VikunjaClient) {
    this.myTools = new MyTools(vikunjaClient);
    // ... other tool classes
    
    this.registerAllTools();
  }

  private registerAllTools(): void {
    // ... existing registrations

    // My New Tool
    this.registerTool(
      'my_new_tool',
      {
        description: 'Create a new resource with name and optional description',
        inputSchema: zodToJsonSchema(MyNewToolSchema),
      },
      async (args) => {
        const validated = MyNewToolSchema.parse(args);
        return this.myTools.myNewTool(validated);
      }
    );
  }
}
```

### Step 5: Enhance Tool Description (User Story 1)

Add comprehensive description following FR-001 requirements:

```typescript
this.registerTool(
  'my_new_tool',
  {
    description: [
      'Create a new resource in Vikunja.',
      '',
      '**Purpose**: Initialize a new resource with name and optional description.',
      '',
      '**When to use**:',
      '- Starting a new workflow that requires a fresh resource',
      '- Setting up initial resources during onboarding',
      '- Creating resources from templates',
      '',
      '**Use instead of**:',
      '- `update_my_resource` - Use that for modifying existing resources',
      '- `duplicate_my_resource` - Use that for copying existing resources',
      '',
      '**Expected outcome**: Returns the created resource with auto-generated ID and timestamps.',
      '',
      '**Parameters**:',
      '- `name` (string, required): Display name for the resource. Example: "Q4 Planning"',
      '- `description` (string, optional): Detailed description. Supports Markdown.',
      '',
      '**Vikunja terminology**: Resources in Vikunja are equivalent to "items" or "entities" in other systems.',
      '',
      '**Examples**:',
      '```json',
      '{ "name": "Quarterly Review", "description": "# Q4 Goals\\n\\n- Revenue targets\\n- Team expansion" }',
      '```',
    ].join('\n'),
    inputSchema: zodToJsonSchema(MyNewToolSchema),
  },
  async (args) => {
    const validated = MyNewToolSchema.parse(args);
    return this.myTools.myNewTool(validated);
  }
);
```

### Step 6: Run Tests - Verify They Pass

```bash
pnpm test
# PASS - MyNewTool › should call Vikunja API with correct parameters
# PASS - MyNewTool › should validate required parameters
# PASS - MyNewTool › should handle permission errors with resource context
```

### Step 7: Update Documentation

1. **Auto-generate TOOLS.md**:
   ```bash
   pnpm generate:docs
   ```

2. **Update README.md tool count** if adding new category

3. **Add to CHANGELOG.md** under "Added" section

4. **Optional: Add example to docs/EXAMPLES.md**

### Step 8: Verify Tool Description Quality

Run description quality tests:

```bash
pnpm test tests/unit/tools/descriptions.test.ts
# Should pass validation for your new tool
```

## Testing Guidelines

### Unit Tests

**Location**: `tests/unit/` or `tests/tools/`

**Purpose**: Test individual functions/methods in isolation

**Mock external dependencies**:
```typescript
import { vi } from 'vitest';

const mockVikunjaClient = {
  createTask: vi.fn().mockResolvedValue({ id: 1 }),
} as any;
```

**Test cases to include**:
- ✅ Success path with valid inputs
- ✅ Input validation (missing required, invalid format)
- ✅ Permission errors (403)
- ✅ Not found errors (404)
- ✅ Rate limiting (429)
- ✅ Network errors
- ✅ Edge cases (empty strings, max values, special characters)

### Integration Tests

**Location**: `tests/integration/`

**Purpose**: Test complete workflows end-to-end

**Example**: Task workflow test
```typescript
describe('Complete Task Workflow', () => {
  it('should create project, add tasks, create relations, add comments', async () => {
    // 1. Create project
    const project = await toolRegistry.executeTool('create_project', {
      title: 'Integration Test Project',
    });

    // 2. Create tasks
    const task1 = await toolRegistry.executeTool('create_task', {
      project_id: project.id,
      title: 'Parent Task',
    });

    const task2 = await toolRegistry.executeTool('create_task', {
      project_id: project.id,
      title: 'Subtask',
    });

    // 3. Create relation
    await toolRegistry.executeTool('create_task_relation', {
      task_id: task1.id,
      other_task_id: task2.id,
      relation_kind: 'subtask',
    });

    // 4. Add comment
    const comment = await toolRegistry.executeTool('add_task_comment', {
      task_id: task1.id,
      comment: 'Integration test comment',
    });

    // Verify workflow completed
    expect(task1.id).toBeDefined();
    expect(task2.id).toBeDefined();
    expect(comment.id).toBeDefined();
  });
});
```

### Coverage Requirements

- **Minimum**: 90% overall coverage
- **Critical paths**: 100% (auth, rate limiting, error handling)
- **New code**: Must include tests before merging

Check coverage:
```bash
pnpm test:coverage

# Output shows:
# File                      | % Stmts | % Branch | % Funcs | % Lines
# src/tools/mytool.ts      |   98.5  |   95.2   |  100.0  |  98.5
```

## Code Quality

### Linting and Formatting

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Format code
pnpm format
```

### TypeScript Best Practices

1. **Strict type checking** - No `any` types
   ```typescript
   // ❌ Bad
   function process(data: any): any {
     return data.value;
   }

   // ✅ Good
   function process(data: MyData): number {
     return data.value;
   }
   ```

2. **Use Zod for runtime validation**
   ```typescript
   const TaskSchema = z.object({
     title: z.string().min(1),
     project_id: z.number().int().positive(),
   });
   
   type Task = z.infer<typeof TaskSchema>;
   ```

3. **Error handling with types**
   ```typescript
   try {
     await vikunjaClient.createTask(data);
   } catch (error) {
     if (axios.isAxiosError(error)) {
       if (error.response?.status === 403) {
         throw new Error(formatPermissionError('task', 'create'));
       }
     }
     throw error;
   }
   ```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
git commit -m "feat: add get_task_attachments tool"

# Bug fix
git commit -m "fix: handle rate limit errors correctly"

# Documentation
git commit -m "docs: update API reference for new tools"

# Tests
git commit -m "test: add integration test for task workflow"

# Refactoring
git commit -m "refactor: extract pagination logic to utility"

# Performance
git commit -m "perf: optimize label search with index"

# Chores
git commit -m "chore: update dependencies"
```

## Common Tasks

### Update Vikunja API Types

When Vikunja API changes:

1. Update interfaces in `src/vikunja/types.ts`
2. Update client methods in `src/vikunja/client.ts`
3. Run tests to find breaking changes
4. Update tool schemas if parameters changed
5. Regenerate TOOLS.md: `pnpm generate:docs`

### Add Pagination to Existing Tool

1. Import pagination utilities:
   ```typescript
   import { validatePagination, calculateOffset, createPaginatedResponse } from '../utils/pagination.js';
   ```

2. Add pagination to Zod schema:
   ```typescript
   const MyToolSchema = z.object({
     // ... existing fields
     page: z.number().int().positive().default(1),
     page_size: z.number().int().positive().max(100).default(50),
   });
   ```

3. Use in implementation:
   ```typescript
   async myTool(args: z.infer<typeof MyToolSchema>) {
     const pagination = validatePagination(args.page, args.page_size);
     const offset = calculateOffset(pagination.page, pagination.page_size);
     
     const items = await this.vikunjaClient.getItems(offset, pagination.page_size);
     const total = await this.vikunjaClient.getItemsCount();
     
     return createPaginatedResponse(items, pagination, total);
   }
   ```

### Debug Tool Execution

Enable debug logging:

```bash
# Set log level to debug
export LOG_LEVEL=debug

# Run server
pnpm dev
```

View detailed logs:
- Tool registration
- Parameter validation
- API calls
- Error stack traces

### Run Specific Tests

```bash
# Single test file
pnpm test tests/tools/relations.test.ts

# Single test suite
pnpm test -t "create_task_relation"

# Watch mode for TDD
pnpm test:watch tests/tools/mytool.test.ts
```

## Getting Help

- **Documentation**: Start with [README.md](../README.md) and [TOOLS.md](TOOLS.md)
- **Examples**: See [EXAMPLES.md](EXAMPLES.md) for workflow patterns
- **Issues**: Check [GitHub Issues](https://github.com/vikunja/vikunja/issues) for known problems
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
- **Community**: Join [Vikunja Discord](https://discord.gg/DwEWWSFjzx) for discussions

## Next Steps

1. **Explore the codebase**: Start with `src/index.ts` and follow tool registration
2. **Run tests**: Get familiar with test structure and coverage
3. **Add a simple tool**: Follow the "Adding a New Tool" guide
4. **Read specifications**: Check `specs/008-mcp-server-improvements/` for feature context
5. **Join discussions**: Participate in GitHub issues and pull requests

Happy coding! 🚀
