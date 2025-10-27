# Quickstart Guide: MCP Server Missing Tools

**Feature**: 010-mcp-missing-tools  
**Date**: 2025-10-26  
**Audience**: AI Agent Developers & MCP Server Contributors

## Overview

This guide helps developers understand and use the four new read-only tools added to the Vikunja MCP server. These tools fill critical gaps in entity lookup operations, enabling AI agents to efficiently retrieve projects, tasks, and user information by ID.

## What's New

### Four New Tools

1. **`get_project`** - Retrieve single project by ID
2. **`get_all_projects`** - List all accessible projects
3. **`get_task`** - Retrieve single task by ID
4. **`get_user_info`** - Get authenticated user profile

### Why These Tools Matter

**Before**: AI agents had to use inefficient workarounds:
```
User: "What is the name of project 11?"
Agent: Uses get_project_tasks(11) → Finds a task → Infers project from task data
```

**After**: Direct, efficient lookup:
```
User: "What is the name of project 11?"
Agent: Uses get_project(11) → Gets project name directly
```

## Quick Start for AI Agents

### 1. Get Project Details

**Use case**: You know a project ID and need its metadata (name, description, color, etc.)

```typescript
// Tool call
{
  "name": "get_project",
  "arguments": {
    "id": 11
  }
}

// Response
{
  "success": true,
  "message": "Project \"Personal Tasks\" retrieved successfully",
  "project": {
    "id": 11,
    "title": "Personal Tasks",
    "description": "My personal todo list",
    "hex_color": "#3498db",
    "parent_project_id": null,
    "is_archived": false,
    "created": "2025-01-15T10:30:00Z",
    "updated": "2025-10-26T14:00:00Z",
    "owner": { "id": 1, "username": "user1" }
  }
}
```

**When to use**:
- User asks about a specific project ID
- You need project metadata to provide context
- You're building a project hierarchy view

**Error handling**:
```typescript
// Not found
{
  "success": false,
  "message": "Project with ID 999 not found",
  "error": "NOT_FOUND"
}

// No permission
{
  "success": false,
  "message": "You do not have permission to access project 123",
  "error": "FORBIDDEN"
}
```

---

### 2. List All Projects

**Use case**: Discovery, workspace exploration, "show me what I have"

```typescript
// Tool call - get all active projects
{
  "name": "get_all_projects",
  "arguments": {}
}

// Tool call - get only archived projects
{
  "name": "get_all_projects",
  "arguments": {
    "filter_archived": true
  }
}

// Response
{
  "success": true,
  "message": "Found 3 projects",
  "projects": [
    { "id": 1, "title": "Work Tasks", "is_archived": false },
    { "id": 11, "title": "Personal Tasks", "is_archived": false },
    { "id": 25, "title": "Home Projects", "is_archived": false }
  ],
  "total": 3,
  "page": 1,
  "hasMore": false
}
```

**When to use**:
- "What projects do I have?"
- "List all my workspaces"
- Building project picker UI
- Finding projects without knowing IDs

**Pagination**:
```typescript
// Get second page
{
  "name": "get_all_projects",
  "arguments": {
    "page": 2
  }
}

// Check hasMore to continue pagination
if (response.hasMore) {
  // Fetch next page
}
```

---

### 3. Get Task Details

**Use case**: You have a task ID and need complete task information

```typescript
// Tool call
{
  "name": "get_task",
  "arguments": {
    "id": 12345
  }
}

// Response
{
  "success": true,
  "message": "Task \"Fix payment bug\" retrieved successfully",
  "task": {
    "id": 12345,
    "title": "Fix payment bug",
    "description": "Users cannot complete checkout",
    "done": false,
    "due_date": "2025-10-30T17:00:00Z",
    "priority": 5,
    "project_id": 1,
    "assignees": [
      { "id": 2, "username": "dev1" }
    ],
    "labels": [
      { "id": 10, "title": "bug" },
      { "id": 15, "title": "urgent" }
    ]
  }
}
```

**When to use**:
- User references a specific task ID
- Following task relations (blocking, blocked by)
- Updating a task and need current state first

---

### 4. Get User Info

**Use case**: Self-awareness, personalization, understanding permissions

```typescript
// Tool call (no parameters)
{
  "name": "get_user_info",
  "arguments": {}
}

// Response
{
  "success": true,
  "message": "User information retrieved for johndoe",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "language": "en",
    "timezone": "America/Los_Angeles"
  }
}
```

**When to use**:
- "Who am I?"
- Providing personalized greetings
- Understanding user preferences (language, timezone)
- Logging actions with user context

**Security note**: Sensitive fields (passwords, tokens) are automatically filtered.

---

## Developer Guide

### Adding Tests

When implementing these tools, write tests first:

```typescript
// tests/tools/projects.test.ts
describe('ProjectTools.getProject', () => {
  it('should retrieve project by ID', async () => {
    const mockProject = { id: 11, title: 'Test Project' };
    mockVikunjaClient.get.mockResolvedValue(mockProject);

    const result = await projectTools.getProject({ id: 11 }, mockUserContext);

    expect(result.success).toBe(true);
    expect(result.project).toEqual(mockProject);
    expect(mockVikunjaClient.get).toHaveBeenCalledWith(
      '/api/v1/projects/11',
      {},
      mockUserContext.token
    );
  });

  it('should handle not found error', async () => {
    mockVikunjaClient.get.mockRejectedValue({ response: { status: 404 } });

    const result = await projectTools.getProject({ id: 999 }, mockUserContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('NOT_FOUND');
  });
});
```

### Registering Tools

Tools are registered in `src/tools/registry.ts`:

```typescript
// In ToolRegistry.registerAllTools()
this.registerTool(
  'get_project',
  'Retrieve a single project by its ID. Use this when you need complete project details...',
  GetProjectSchema,
  async (args, ctx) => this.projectTools.getProject(args as GetProjectInput, ctx)
);
```

### Error Handling Pattern

All tools follow consistent error handling:

```typescript
async getProject(input: GetProjectInput, userContext: UserContext): Promise<ProjectToolResult> {
  try {
    await this.rateLimiter.checkLimit(userContext.token);
    
    const project = await this.client.get<VikunjaProject>(
      `/api/v1/projects/${input.id}`,
      {},
      userContext.token
    );
    
    return {
      success: true,
      message: `Project "${project.title}" retrieved successfully`,
      project,
    };
  } catch (error) {
    const statusCode = error.response?.status;
    
    if (statusCode === 404) {
      return {
        success: false,
        message: `Project with ID ${input.id} not found`,
        error: 'NOT_FOUND',
      };
    } else if (statusCode === 403) {
      return {
        success: false,
        message: `You do not have permission to access project ${input.id}`,
        error: 'FORBIDDEN',
      };
    }
    
    return {
      success: false,
      message: 'Failed to retrieve project',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

## Best Practices

### For AI Agents

1. **Use Direct Lookup When Possible**: If you have an ID, use `get_project` or `get_task` instead of searching
2. **Check `success` Field**: Always check the success boolean before accessing entity data
3. **Handle Errors Gracefully**: Use error codes to provide helpful responses
4. **Respect Pagination**: For `get_all_projects`, check `hasMore` and request additional pages if needed

### For Developers

1. **Test-First**: Write tests before implementing tool methods
2. **Follow Patterns**: Match existing tool structure (Zod schema → tool method → registry)
3. **Document Well**: Include comprehensive descriptions in Zod schemas
4. **Log Actions**: Use Winston logger for debugging and auditing
5. **Filter Sensitive Data**: Never expose passwords, tokens, or secrets

## Common Patterns

### Chain Lookups

```typescript
// 1. Get user info
const userInfo = await callTool('get_user_info', {});

// 2. List their projects
const projects = await callTool('get_all_projects', {});

// 3. For each project, get tasks
for (const project of projects.projects) {
  const tasks = await callTool('get_project_tasks', { project_id: project.id });
  // Process tasks...
}
```

### Error Recovery

```typescript
// Try direct lookup first
const result = await callTool('get_project', { id: projectId });

if (!result.success && result.error === 'NOT_FOUND') {
  // Fallback: search by name
  const searchResult = await callTool('search_projects', { query: projectName });
  // Handle search results...
}
```

## Testing Locally

```bash
# Run all tests
cd mcp-server
npm run test

# Run specific tool tests
npm run test tests/tools/projects.test.ts

# Run with coverage
npm run test:coverage

# Format code
npm run format
npm run lint:fix
```

## Troubleshooting

### "Project not found" but I can see it in the UI
- Check permissions: User may only have read access to tasks, not project
- Verify authentication: Ensure correct token is being used
- Try `get_all_projects` to see what user can access

### `hasMore` is false but I expected more results
- Vikunja API returns max 50 per page
- `hasMore` is heuristic (true if page has exactly 50 items)
- If you got fewer than 50, that's all the results

### Rate limit errors
- Default: 60 requests/minute per user
- Implement backoff/retry logic in agent
- Consider caching results for repeated queries

## Next Steps

- See [data-model.md](data-model.md) for entity schemas
- See [contracts/](contracts/) for detailed tool specifications
- See [tasks.md](tasks.md) (after `/speckit.tasks`) for implementation checklist
- Refer to AGENTS.md for development workflow

## Support

- File issues in GitHub repository
- Check existing MCP server tests for examples
- Review constitution.md for quality standards
