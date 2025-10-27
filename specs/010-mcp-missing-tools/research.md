# Research: MCP Server Missing Tools

**Feature**: 010-mcp-missing-tools  
**Date**: 2025-10-26  
**Status**: Complete

## Overview

This research document identifies and resolves technical unknowns for implementing four missing read-only tools in the MCP server. All research items focus on ensuring consistency with existing patterns while filling gaps in the current tool suite.

## Research Items

### 1. Vikunja API Endpoints for Read Operations

**Question**: Does the Vikunja API provide the necessary GET endpoints for projects, tasks, and users?

**Investigation**:
- Reviewed Vikunja API documentation and existing MCP server client code
- Examined current VikunjaClient usage in existing tools
- Checked REST endpoints used by frontend

**Findings**:
- ✅ **GET /api/v1/projects/:id** - Retrieve single project (used by frontend, confirmed in REST API)
- ✅ **GET /api/v1/projects** - List all projects with filters (already used in search_projects tool)
- ✅ **GET /api/v1/tasks/:id** - Retrieve single task (confirmed in Vikunja API docs)
- ✅ **GET /api/v1/user** - Get authenticated user info (standard endpoint in most APIs)

**Decision**: Use standard Vikunja API endpoints. No backend changes required.

**Rationale**: All necessary endpoints exist in Vikunja API. The MCP server only needs to expose these through MCP tools.

---

### 2. Tool Schema Design Patterns

**Question**: What Zod schema patterns should the new tools follow for consistency?

**Investigation**:
- Analyzed existing tool schemas in `src/tools/*.ts`
- Reviewed GetProjectTasksSchema, SearchProjectsSchema patterns
- Examined parameter description best practices for AI agent guidance

**Findings**:
- Existing patterns use descriptive `.describe()` calls with context (e.g., "ID of the project to get tasks from (required)")
- Schemas include usage examples in descriptions
- Optional parameters clearly marked with `.optional()` and defaults
- Pagination follows consistent pattern: `page` (positive int, default 1), `page_size` (bounded)

**Decision**: Follow established patterns:

```typescript
// get_project
export const GetProjectSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the project to retrieve (required). Returns full project details including title, description, color, parent, and archived status.'),
});

// get_all_projects
export const GetAllProjectsSchema = z.object({
  page: z.number().int().positive().optional().default(1)
    .describe('Page number for pagination (optional, default: 1). Each page returns up to 50 projects.'),
  filter_archived: z.boolean().optional()
    .describe('Filter by archive status (optional). Set true for archived only, false for active only, omit for all.'),
});

// get_task
export const GetTaskSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the task to retrieve (required). Returns complete task details including all relations, assignees, and labels.'),
});

// get_user_info (no parameters - uses authenticated context)
export const GetUserInfoSchema = z.object({});
```

**Rationale**: Consistency with existing tools reduces agent confusion and maintains codebase uniformity.

---

### 3. Error Handling Strategy

**Question**: How should new tools distinguish between "not found" and "unauthorized" errors?

**Investigation**:
- Examined existing error handling in ProjectTools, TaskTools
- Reviewed VikunjaClient error response parsing
- Checked Vikunja API error response format (HTTP status codes)

**Findings**:
- Vikunja API returns:
  - **404 Not Found** - Entity doesn't exist
  - **403 Forbidden** - User lacks permission
  - **401 Unauthorized** - Invalid/missing token (handled by authenticator)
- Existing tools catch errors and return structured responses with `success: false`, `message`, `error` fields

**Decision**: Parse HTTP status codes from VikunjaClient errors:

```typescript
try {
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
  // Generic error
  return {
    success: false,
    message: 'Failed to retrieve project',
    error: error instanceof Error ? error.message : String(error),
  };
}
```

**Rationale**: Explicit error categorization helps AI agents handle failures gracefully without user intervention.

---

### 4. User Info Data Filtering

**Question**: What user information should be excluded from get_user_info for privacy/security?

**Investigation**:
- Reviewed Vikunja User model fields
- Examined frontend UserService patterns
- Checked security best practices for profile APIs

**Findings**:
- Vikunja User model includes sensitive fields:
  - `password` (hashed, but should never be exposed)
  - `totp_secret` (2FA secret)
  - `email_confirm_token`, `password_reset_token` (temporary tokens)
- Safe fields for AI agents:
  - `id`, `username`, `email`, `name` (display name)
  - `created`, `updated` (timestamps)
  - `language`, `timezone`, `overdue_tasks_reminders_enabled` (preferences)

**Decision**: Return filtered user object from API response:

```typescript
async getUserInfo(userContext: UserContext): Promise<UserToolResult> {
  const user = await this.client.get<VikunjaUser>('/api/v1/user', {}, userContext.token);
  
  // Filter sensitive fields
  const safeUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    created: user.created,
    updated: user.updated,
    // Settings (if available)
    language: user.language,
    timezone: user.timezone,
    overdue_tasks_reminders_enabled: user.overdue_tasks_reminders_enabled,
  };
  
  return {
    success: true,
    message: `User information retrieved for ${user.username}`,
    user: safeUser,
  };
}
```

**Rationale**: Defense in depth - even if Vikunja API doesn't return sensitive fields, explicitly filter to prevent future API changes from leaking data.

---

### 5. Tool Registration Order

**Question**: Does tool registration order in ToolRegistry matter for functionality or agent discovery?

**Investigation**:
- Examined ToolRegistry.registerAllTools() method
- Reviewed MCP protocol tools/list handler
- Checked if agents depend on tool ordering

**Findings**:
- ToolRegistry stores tools in a Map (no guaranteed order)
- MCP protocol returns tools array (order preserved but not semantically significant)
- AI agents use tool descriptions, not order, for selection

**Decision**: Group new tools logically with existing related tools:
- Add `get_project` and `get_all_projects` after existing project tools (create, update, delete, archive)
- Add `get_task` after existing task tools (create, update, complete, delete, move)
- Add `get_user_info` as new section at end (no existing user tools)

**Rationale**: Logical grouping aids code maintenance. Order doesn't affect functionality but improves developer experience.

---

### 6. Pagination Best Practices

**Question**: Should get_all_projects use the same pagination pattern as search_projects?

**Investigation**:
- Reviewed existing pagination in SearchTools
- Checked Vikunja API pagination parameters
- Examined frontend pagination patterns

**Findings**:
- Existing tools use: `page` (1-based), assume 50 results per page
- Vikunja API supports `?page=N` parameter
- No explicit page_size parameter in existing tools (uses API default)

**Decision**: Match existing pagination pattern:
```typescript
page: z.number().int().positive().optional().default(1)
  .describe('Page number for pagination (optional, default: 1). Each page returns up to 50 projects.')
```

Include pagination metadata in response:
```typescript
{
  success: true,
  message: `Found ${projects.length} projects`,
  projects,
  total: projects.length,
  page: input.page,
  hasMore: projects.length === 50, // Heuristic: if full page, assume more exist
}
```

**Rationale**: Consistency with existing tools prevents agent confusion. Simple heuristic for hasMore is sufficient (agents can request next page until empty).

---

## Implementation Checklist

- [x] Verify Vikunja API endpoints exist and are accessible
- [x] Design Zod schemas following existing patterns
- [x] Define error handling strategy with status code parsing
- [x] Identify safe user fields for get_user_info
- [x] Determine tool registration order
- [x] Confirm pagination pattern consistency

## Next Steps

Proceed to **Phase 1: Design & Contracts**
- Create data-model.md (entity definitions)
- Generate tool contracts (OpenAPI-style JSON schemas)
- Write quickstart.md (developer guide for using new tools)
- Update agent context with new technologies

## References

- Existing MCP server tools: `mcp-server/src/tools/*.ts`
- Vikunja API client: `mcp-server/src/vikunja/client.ts`
- Tool registry: `mcp-server/src/tools/registry.ts`
- Frontend user service: `frontend/src/services/user.ts` (for User model reference)
