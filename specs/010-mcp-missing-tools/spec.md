# Feature Specification: MCP Server Missing Tools

**Feature Branch**: `010-mcp-missing-tools`  
**Created**: 2025-10-26  
**Status**: Draft  
**Input**: User description: "implement the missing tools in the mcp server"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Direct Project Lookup (Priority: P1)

An AI agent needs to retrieve project details by ID to answer direct questions about projects (e.g., "What is the name of project 11?"). Currently, the agent can only get project tasks but cannot access the project metadata itself, forcing workarounds through search or task listings.

**Why this priority**: This is the most fundamental gap. Without direct project lookup, agents cannot answer basic questions about projects they're working with. This causes confusion and inefficient workarounds (searching for tasks to infer project details).

**Independent Test**: Can be fully tested by querying for a project by ID and verifying the returned metadata (title, description, color, parent, archived status) matches the project. Delivers immediate value for project-related queries.

**Acceptance Scenarios**:

1. **Given** an AI agent knows a project ID, **When** it requests project details using the get_project tool, **Then** it receives the complete project metadata including title, description, color, parent_project_id, and archived status
2. **Given** an AI agent requests a non-existent project ID, **When** the get_project tool is called, **Then** it returns a clear error message indicating the project was not found or the user lacks permission
3. **Given** an AI agent requests a project the user doesn't have access to, **When** the get_project tool is called, **Then** it returns an authorization error

---

### User Story 2 - Project Discovery (Priority: P2)

An AI agent needs to list all available projects to help users understand their workspace organization (e.g., "What projects do I have?" or "List my workspaces"). Currently, only search_projects exists, which requires a search query and cannot list all projects.

**Why this priority**: Essential for discovery and navigation. Users need to understand what projects exist before they can work with them. This is a common onboarding and organization task.

**Independent Test**: Can be fully tested by requesting all projects and verifying the returned list includes all projects the user has access to. Delivers value for workspace exploration and organization tasks.

**Acceptance Scenarios**:

1. **Given** a user has access to multiple projects, **When** the AI agent requests all projects using the get_all_projects tool, **Then** it receives a list of all accessible projects with their metadata
2. **Given** a user wants to see only active projects, **When** the AI agent uses the filter_archived parameter set to false, **Then** only non-archived projects are returned
3. **Given** there are many projects, **When** pagination parameters are provided, **Then** results are paginated correctly with appropriate page metadata

---

### User Story 3 - Direct Task Lookup (Priority: P2)

An AI agent needs to retrieve task details by ID to answer direct questions about specific tasks (e.g., "What is task 12345?" or "Show me details for task 42"). Currently, agents must search or list project tasks to find a specific task.

**Why this priority**: Important for task-specific queries and references. When users mention task IDs or when tasks are linked/related, direct lookup is more efficient than searching.

**Independent Test**: Can be fully tested by querying for a task by ID and verifying the returned task details match. Delivers value for direct task references and task detail queries.

**Acceptance Scenarios**:

1. **Given** an AI agent knows a task ID, **When** it requests task details using the get_task tool, **Then** it receives the complete task data including title, description, due date, priority, assignees, labels, and relations
2. **Given** an AI agent requests a non-existent task ID, **When** the get_task tool is called, **Then** it returns a clear error message
3. **Given** an AI agent requests a task the user doesn't have access to, **When** the get_task tool is called, **Then** it returns an authorization error

---

### User Story 4 - User Context Awareness (Priority: P3)

An AI agent needs to know who it's acting as to provide personalized responses and understand permissions context (e.g., "Who am I?" or "What's my username?"). Currently, the agent has no way to retrieve the authenticated user's information.

**Why this priority**: Nice to have for self-awareness and context. While not critical for task execution, it helps with personalization and understanding permission boundaries. Less urgent than entity lookup tools.

**Independent Test**: Can be fully tested by requesting current user information and verifying it matches the authenticated user's profile. Delivers value for personalization and context-aware interactions.

**Acceptance Scenarios**:

1. **Given** an AI agent is authenticated, **When** it requests user information using the get_user_info tool, **Then** it receives the user's profile including username, email, display name, and relevant settings
2. **Given** an AI agent needs to understand its permissions, **When** it retrieves user info, **Then** it can use this to provide context-aware responses

---

### Edge Cases

- What happens when requesting a project/task that was deleted between listing and retrieval?
- How does the system handle rate limiting for repeated direct lookups?
- What happens when pagination parameters are out of range (page beyond total pages)?
- How are projects with null or empty parent_project_id handled?
- What user information should be excluded for privacy (e.g., password hashes, tokens)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a get_project tool that retrieves a single project by ID
- **FR-002**: System MUST provide a get_all_projects tool that lists all accessible projects with pagination and filtering support
- **FR-003**: System MUST provide a get_task tool that retrieves a single task by ID
- **FR-004**: System MUST provide a get_user_info tool that retrieves the authenticated user's profile information
- **FR-005**: All new tools MUST enforce the same authentication and rate limiting as existing tools
- **FR-006**: All new tools MUST return consistent error messages for not found, unauthorized, and validation errors
- **FR-007**: The get_all_projects tool MUST support filtering by archived status
- **FR-008**: The get_all_projects tool MUST support pagination with configurable page size
- **FR-009**: All tools MUST include comprehensive parameter descriptions in their schemas to guide AI agent usage
- **FR-010**: Error responses MUST clearly distinguish between "not found" and "no permission" scenarios
- **FR-011**: The get_user_info tool MUST exclude sensitive information like password hashes and authentication tokens
- **FR-012**: All tools MUST log requests with user context for debugging and auditing

### Key Entities

- **Project**: Represents a workspace or list in Vikunja. Attributes include ID, title, description, color (hex), parent project relationship, and archived status
- **Task**: Represents a todo item. Attributes include ID, title, description, due date, priority, assignees, labels, project membership, and relations to other tasks
- **User**: Represents an authenticated user. Attributes include ID, username, email, display name, and user settings (excluding sensitive authentication data)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI agents can retrieve project details by ID in a single tool call without searching or listing tasks
- **SC-002**: AI agents can discover all available projects without providing a search query
- **SC-003**: AI agents can retrieve task details by ID in a single tool call without searching
- **SC-004**: AI agents can determine the authenticated user's identity and context
- **SC-005**: All new tools respond within the same latency envelope as existing tools (under 2 seconds for typical requests)
- **SC-006**: Zero security regressions - all new tools respect existing permission boundaries
- **SC-007**: Documentation coverage reaches 100% for all new tools with clear parameter descriptions and usage examples
- **SC-008**: Error messages are clear enough that agents can handle errors without human intervention in 95% of cases

## Scope & Boundaries *(mandatory)*

### In Scope

- Implementation of get_project tool for single project retrieval by ID
- Implementation of get_all_projects tool for listing all accessible projects
- Implementation of get_task tool for single task retrieval by ID
- Implementation of get_user_info tool for authenticated user profile retrieval
- Comprehensive parameter documentation in tool schemas
- Error handling consistent with existing tools
- Rate limiting integration for all new tools
- Authentication enforcement for all new tools
- Unit tests for all new tools

### Out of Scope

- Modifications to existing tools (create_project, update_project, etc.)
- Changes to the Vikunja API backend
- Implementation of team member listing tools
- Implementation of notification retrieval tools
- Implementation of saved filter listing tools
- Bulk operations for the new read tools
- Caching strategies beyond existing Redis token cache
- Changes to the MCP protocol transport layers

## Dependencies & Assumptions *(mandatory)*

### Dependencies

- Existing Vikunja API endpoints for projects, tasks, and users
- Current MCP server infrastructure (authentication, rate limiting, client)
- TypeScript 5.3+ and Node.js 22+ runtime environment
- Zod for input validation schemas
- Winston for logging

### Assumptions

- Vikunja API already provides GET endpoints for projects by ID, all projects listing, tasks by ID, and user info
- Current authentication and permission model is sufficient for new read-only operations
- Existing rate limiting configuration is appropriate for additional read operations
- The tool registry pattern can accommodate four additional tools without refactoring
- Redis cache for authentication tokens remains available and performant
- Error response format from Vikunja API is consistent and parseable

### Risks

- If Vikunja API doesn't provide necessary GET endpoints, backend changes may be required (escalates scope)
- Additional read tools may increase API load - monitoring recommended
- User info endpoint may expose unintended data if not carefully filtered

## Open Questions

None - all requirements are clear and testable with reasonable defaults applied.

