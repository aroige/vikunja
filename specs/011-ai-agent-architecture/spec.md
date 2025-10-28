# Feature Specification: AI-Powered Personal Assistant System

**Feature Branch**: `011-ai-agent-architecture`  
**Created**: 2025-10-28  
**Status**: Draft  
**Input**: User description: "We are going to perfect the n8n (for now, but we'll maybe develop our own system later) ai agent architecture and first and foremost prompts (which seem to be the culprit of the current system), to create a VERY reliable agent system which will (end goal):
1: Help the user manage their life using vikunja, google calendar, google docs and so on
2: Be able to take the correct action, after approval, for tasks such as 
  - What are the tasks I should focus on today at Work
  - Give me one task I can complete during my lunch
  - Help me plan a project (discussion back and forth, when the plan is verified, a project is created with tasks, subtasks and so on in vikunja)
  - Help the user getting things done and planning tasks
  - Help the user not forgetting about things
  - Store reminders as tasks - \"Remind me to do this tomorrow at 12\"
  3: Automatically check the calendar availability and suggest to do a suitable task during lunch time
  The above is an INCOMPLETE list of requirements (end goals) and you are going to help me refine them. The system will help the user (me) to manage my life and be more organized.

  The starting point has been put in the n8n_tmp folder, with the curren tsystem prompts for a supervisor agent, which in turn delegates to the vikunja_specialist agent, who in turn has access to the mcp_server for vikunja (source is in mcp-server).

  We are going to develop this in clear and small testable steps.

  The first step is to get task management for vikunja working good, but we need to have the higher perspective, so that the system will be possible to extend with more capabilities, such as project planning and calendar management later."

## Clarifications

### Session 2025-10-28

- Q: How should conversation context be managed across agent delegations? → A: Use n8n's native PostgreSQL memory nodes with domain-specific context windows AND explicit memory isolation strategy: Supervisor gets small window (3-5 messages) with SHARED database access to see what specialists discovered; Vikunja specialist gets medium window (10-15 messages) with SHARED database for access to supervisor routing + own domain history; Future specialists get medium windows (8-12 messages) with SHARED database for cross-domain context awareness (e.g., calendar specialist actions visible to Vikunja specialist); Session state stored as structured key-value in shared memory for workflow verification state (discovered IDs, pending confirmations). Shared memory architecture enables cross-agent context awareness while individual context windows control token costs per agent.

- Q: How should the system enforce the search-before-action workflow to prevent completing/updating the wrong task? → A: Tool-level validation - Each action tool (complete_task, update_task, delete_task) internally performs a search first, presents match to user for confirmation, then executes only after explicit approval. This ensures the workflow cannot be bypassed by prompt engineering or model behavior, making it infrastructure-enforced rather than prompt-based.

- Q: How should the system handle multiple matching tasks (e.g., "Water plants" matches both "Water office plants" and "Water home plants")? → A: Always show all - Present all matching tasks with context (project, due date, priority) and require user to select; never auto-select even with strong confidence. The user must confirm we are talking about the correct task to prevent data corruption.

- Q: How should natural language date/time parsing be implemented for reminders (e.g., "tomorrow at 3pm", "next Tuesday", "in 30 minutes")? → A: Library + AI fallback - Use proven date parsing library (e.g., Chrono.js) wrapped as n8n workflow tool for common patterns; if library fails or returns uncertain result, the n8n agent uses its conversational AI to clarify with user and confirm the parsed date. MCP server receives only structured ISO dates/times (no AI needed in MCP server). AI fallback happens at agent conversation layer, not in infrastructure.

- Q: How should n8n agent workflows and prompts be organized and maintained in the repository? → A: Export workflows as JSON in `n8n-workflows/` directory; store system prompts as separate files in `n8n-workflows/prompts/` and reference them in workflows; both version-controlled. This enables prompt iteration without modifying workflow structure, git-based change tracking, and clear separation of concerns.

- Q: What logging and observability data should the system capture for debugging and reliability monitoring? → A: Comprehensive logging - Log tool calls, agent routing decisions, user interactions, error rates, token usage, response latencies with trace IDs linking related events. This enables debugging of multi-agent workflows, performance analysis, cost tracking, and reliability monitoring to achieve 99%+ accuracy targets.

- Q: How should the system rank tasks when conflicting signals exist (e.g., overdue low-priority task vs. high-priority task due next week)? → A: Due date urgency first, priority second - Overdue tasks rank highest, then tasks due today, then this week; within each urgency group, sort by priority (high to low). This creates predictable, intuitive behavior aligned with time-based commitments.

- Q: How should the system handle bulk operations to prevent mistakes (e.g., "mark all tasks complete" when user meant specific project)? → A: Threshold-based confirmation - Operations affecting 1-5 tasks execute immediately with confirmation message; operations affecting 6+ tasks require preview of what will change and explicit approval before execution. This prevents catastrophic mistakes while maintaining good UX for small batches.

- Q: How should the system handle external service failures (e.g., Google Calendar API unavailable when user asks for scheduling help)? → A: Graceful degradation - Immediately inform user the external service (e.g., calendar) is unavailable, offer Vikunja-only alternatives with reduced functionality, and continue processing. Example: "I can't check your calendar right now, but based on your tasks..." This ensures core functionality remains available during outages.

- Q: How should the system handle ambiguous references without context (e.g., user says "done" without specifying what task)? → A: Context-aware inference - If recent conversation (last 2-3 messages in shared memory) mentioned a specific task, infer and confirm with user ("Done with 'Water plants'?"); if no context exists, ask "Done with what?" to get explicit task reference. This provides natural UX when context exists while preventing errors when it doesn't.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Task Completion by Natural Language (Priority: P1)

Users communicate task completion using natural, conversational language (e.g., "I'm done watering plants", "finished the report", "completed meeting prep") and the system correctly identifies and marks the intended task as complete, asking for clarification only when genuinely ambiguous.

**Why this priority**: This is the most frequent interaction and currently has a critical reliability issue where the system marks incorrect tasks as complete. This corrupts user data and erodes trust. Without reliable basic operations, advanced features are meaningless.

**Independent Test**: Can be fully tested by creating test tasks, issuing natural language completion statements, and verifying the correct task is marked complete (or appropriate clarification is requested). Delivers immediate value by making the core workflow reliable.

**Acceptance Scenarios**:

1. **Given** a single incomplete task "Water plants" exists, **When** user says "I'm done watering plants", **Then** system searches for matching tasks, finds exactly one match, marks it complete, and confirms with "Marked 'Water plants' as complete ✓"

2. **Given** two incomplete tasks exist: "Water office plants" and "Water home plants", **When** user says "finished watering plants", **Then** system searches, finds multiple matches, presents both options with context (project, due date), and waits for user to specify which one

3. **Given** no incomplete tasks match "organize garage", **When** user says "done organizing garage", **Then** system searches, finds zero results, and responds "I couldn't find an active task matching 'organize garage'. Could you tell me which project it's in, or check if it's already completed?"

4. **Given** user has incomplete task "Prepare presentation" in Swedish ("Förbered presentation"), **When** user says in Swedish "klar med presentationen", **Then** system correctly matches and completes the task (multilingual support)

5. **Given** a task "Water plants" was already completed, **When** user says "done watering plants", **Then** system finds no incomplete matches and informs user the task is already complete or doesn't exist

---

### User Story 2 - Smart Daily Task Recommendations (Priority: P2)

Users ask "What should I focus on today?" or "What's urgent?" and receive a prioritized, context-aware list of tasks based on due dates, priorities, projects, and current time of day, with actionable insights rather than raw data dumps.

**Why this priority**: This transforms the system from reactive (execute commands) to proactive (guide user). It's the foundation for "help me be organized" functionality and doesn't require integration with external systems.

**Independent Test**: Can be fully tested by creating tasks with various due dates and priorities, asking for daily recommendations, asking for daily recommendations, and verifying the results are properly sorted and contextualized. Delivers value by helping users decide what to work on.

**Acceptance Scenarios**:

1. **Given** user has 3 overdue tasks, 2 tasks due today, 5 tasks due this week, **When** user asks "What should I focus on today?", **Then** system presents overdue tasks first, today's tasks second, with priorities highlighted, grouped by urgency (e.g., "⚠️ 3 overdue tasks", "📅 2 due today")

2. **Given** it's 11:45 AM and user asks "Give me a task for lunch", **When** user has tasks of varying estimated durations, **Then** system filters for tasks estimated at 30-60 minutes or tagged as "quick" and presents 1-3 suitable options

3. **Given** user has tasks in multiple projects (Work, Personal, Shopping), **When** user asks "What should I focus on at work today?", **Then** system filters to Work project and presents relevant tasks with context

4. **Given** all tasks are low priority and due dates are weeks away, **When** user asks "What's urgent?", **Then** system responds "You don't have any urgent tasks right now. Would you like to see what's coming up this week?"

5. **Given** user has 50+ tasks, **When** user asks for daily focus, **Then** system presents top 10-15 most relevant tasks and offers to show more, avoiding information overload

---

### User Story 3 - Conversational Project Planning (Priority: P3)

Users describe a project idea conversationally (e.g., "I need to plan my kitchen renovation"), the system asks clarifying questions about scope and timeline, and after user verification, creates a project structure with tasks, subtasks, due dates, and milestones in Vikunja.

**Why this priority**: This enables the "help me plan" capability and demonstrates the system's ability to handle complex multi-turn conversations with final action confirmation. It's a natural extension of task management but requires more sophisticated workflow.

**Independent Test**: Can be fully tested by initiating project planning conversations, verifying the system asks appropriate questions, confirming the generated plan matches user intent, and checking Vikunja for correct project/task structure. Delivers high value for complex work.

**Acceptance Scenarios**:

1. **Given** user says "Help me plan my kitchen renovation", **When** system engages in dialogue, **Then** system asks about timeline, major phases, budget considerations, and key milestones before proposing structure

2. **Given** system has gathered project requirements, **When** system presents proposed plan (e.g., "Project: Kitchen Renovation" with tasks for "Get quotes", "Select contractor", "Purchase materials"), **Then** user can review, request changes, and approve before creation

3. **Given** user approves project plan, **When** system creates project, **Then** all tasks are created with appropriate dependencies, due dates calculated from timeline, and user receives confirmation with project summary

4. **Given** planning conversation is interrupted, **When** user returns hours later saying "continue planning the kitchen", **Then** system recalls conversation context and resumes where it left off

5. **Given** user requests unrealistic timeline (e.g., "finish kitchen renovation in 2 days"), **When** system analyzes plan, **Then** system flags timeline issues and suggests realistic adjustments based on task estimates

---

### User Story 4 - Natural Language Reminders as Tasks (Priority: P2)

Users create reminders using natural language time references (e.g., "Remind me to call Mom tomorrow at 3pm", "Don't let me forget about the dentist next Tuesday") and the system creates appropriately scheduled tasks with notifications.

**Why this priority**: This is a common user request that bridges task management and time-based reminders. It requires robust natural language date/time parsing and demonstrates the system's ability to translate conversational input into structured data.

**Independent Test**: Can be fully tested by issuing various reminder requests with different time formats and verifying tasks are created with correct due dates and times. Delivers immediate value for users who think in terms of reminders rather than tasks.

**Acceptance Scenarios**:

1. **Given** current time is Tuesday 2pm, **When** user says "Remind me to call Mom tomorrow at 3pm", **Then** system creates task "Call Mom" with due date Wednesday 3pm and confirms "I'll remind you to call Mom tomorrow at 3pm"

2. **Given** user says "Don't let me forget about the dentist next Tuesday", **When** date parsing determines next Tuesday's date, **Then** system creates task "Dentist" with that due date and asks "What time is your dentist appointment?" if not specified

3. **Given** user says "Remind me to do this in 30 minutes", **When** current context shows previous message was about a specific topic, **Then** system creates task based on that context with due time 30 minutes from now

4. **Given** user says "Remind me every Monday to submit weekly report", **When** system processes recurring reminder, **Then** system creates a recurring task with appropriate repeat settings and confirms the schedule

5. **Given** reminder time is ambiguous (e.g., "tomorrow morning"), **When** system creates task, **Then** system uses reasonable defaults (e.g., 9am for "morning") and confirms with user: "I'll remind you tomorrow morning at 9am. Is that right?"

---

### User Story 5 - Multi-System Context Awareness (Priority: P3)

Users ask questions like "Can I fit this task during lunch?" and the system checks calendar availability, considers task duration estimates, and suggests specific time slots or alternate approaches.

**Why this priority**: This demonstrates true personal assistant capability by integrating multiple data sources (Vikunja + Google Calendar) to provide intelligent scheduling suggestions. It's the foundation for proactive "suggest tasks during free time" functionality.

**Independent Test**: Can be tested in phases - first with mock calendar data, then with real Google Calendar integration - by verifying the system correctly identifies free time and makes appropriate suggestions. Delivers high value for time management.

**Acceptance Scenarios**:

1. **Given** user asks "Can I fit the presentation prep during lunch?", **When** system checks calendar showing 12-1pm free and task estimated at 45 minutes, **Then** system responds "Yes, you have 12-1pm free and the task should take about 45 minutes. Would you like me to schedule it?"

2. **Given** calendar shows back-to-back meetings during lunch, **When** user asks about fitting a task, **Then** system responds "Your lunch hour is busy today. You have a 30-minute gap at 3pm - would that work instead?"

3. **Given** task has no duration estimate, **When** system checks availability, **Then** system asks "How long do you think [task] will take?" before suggesting time slots

4. **Given** system suggests a time slot (e.g., "You have 2-3pm free"), **When** user needs to decide on calendar integration, **Then** system offers both options: "Would you like me to just note this time, or should I add it to your calendar?" allowing user to control integration level

5. **Given** user has recurring free time pattern (e.g., always free 2-3pm), **When** system learns this pattern, **Then** system proactively suggests "You usually have free time around 2pm - would you like to tackle [task] then?"

---

### Edge Cases

- What happens when user speaks in a language the system hasn't seen in training (Swedish, unusual idioms)? Should system ask for clarification or attempt best-match?
- How does system handle time zone differences when user travels? Should reminders adjust to local time or stay in original time zone?
- What happens when user asks to delete a task they just created by accident? Is there an undo mechanism?

## Design Constraints *(mandatory)*

### Cost Optimization for Model Selection

**Primary Constraint**: System MUST be designed to work effectively with cost-efficient models (e.g., Gemini 2.0 Flash Lite, GPT-4o Mini) rather than requiring expensive flagship models.

**Architectural Implications**:

- **Focused Agent Scope**: Each specialist agent handles a narrow, well-defined domain with limited tool sets (5-10 tools max per agent) to reduce cognitive load on smaller models
- **Clear Routing Boundaries**: Supervisor routing logic must be simple and deterministic to work reliably with cheaper models
- **Structured Workflows**: Multi-step operations (search → verify → act) must be enforced at the infrastructure level, not relied upon via complex prompting
- **Explicit State Management**: Conversation context must be explicitly tracked and passed between agents, not inferred from long context windows
- **Fallback Hierarchy**: System should support model mix (cheap supervisor, slightly better specialist for complex operations) if needed

**Why This Matters**: Using Gemini 2.0 Flash Lite (~$0.075/$0.30 per 1M tokens) vs Gemini 2.0 Pro (~$1.25/$5.00 per 1M tokens) represents ~15-20x cost reduction. Over millions of user interactions, this is critical for sustainability.

**Design Trade-offs Accepted**:
- More specialized agents (5-7 focused specialists) vs fewer general agents (1-2 complex ones)
- Infrastructure-enforced workflows vs prompt-based behavior control
- Explicit context passing vs implicit long-context reasoning
- Deterministic routing rules vs flexible semantic routing

## Requirements *(mandatory)*

### Functional Requirements

**Core Task Management:**

- **FR-001**: System MUST search for tasks using keywords extracted from user's natural language before attempting to complete, update, or delete any task
- **FR-002**: System MUST present ALL matching tasks with context (project, due date, priority) when multiple matches are found, and MUST wait for explicit user selection before taking action; system MUST NEVER auto-select based on confidence scores or contextual inference
- **FR-003**: System MUST inform user when zero tasks match their request and offer alternatives (check different project, verify task exists, check if already completed)
- **FR-004**: System MUST confirm successful operations using the actual task title as stored in the system, not the user's paraphrased version
- **FR-005**: System MUST prevent any task operation (complete, update, delete) without first verifying the correct task ID through search or explicit ID reference

**Intelligent Recommendations:**

- **FR-006**: System MUST filter and sort tasks by urgency when user requests daily focus, using ranking algorithm: (1) Overdue tasks first, (2) Tasks due today second, (3) Tasks due this week third, (4) Tasks with no due date last; within each urgency group, sort by priority (high to low)
- **FR-007**: System MUST support context-specific filtering (e.g., "work tasks", "personal tasks", "quick tasks") when user specifies scope
- **FR-008**: System MUST limit recommendation lists to top 10-15 items by default and offer to show more, avoiding information overload
- **FR-009**: System MUST provide actionable insights with recommendations (e.g., "You have 3 overdue tasks" not just listing them)
- **FR-010**: System MUST support time-based task filtering (e.g., "tasks for lunch" should consider estimated duration and current time)

**Project Planning:**

- **FR-011**: System MUST support multi-turn conversational planning by asking clarifying questions about scope, timeline, and phases before creating project structures
- **FR-012**: System MUST present complete project plan to user for verification before creating any tasks or projects in Vikunja
- **FR-013**: System MUST allow user to request modifications to proposed plan before final creation
- **FR-014**: System MUST create all planned tasks with appropriate relationships (subtasks, dependencies) and calculated due dates based on timeline
- **FR-015**: System MUST maintain conversation context across planning sessions, allowing users to pause and resume

**Reminder Management:**

- **FR-016**: System MUST parse natural language time references (tomorrow, next Tuesday, in 30 minutes, at 3pm) using a date parsing library (e.g., Chrono.js) wrapped in n8n workflow; when library parsing fails or returns uncertain results, agent MUST use conversational AI to clarify with user before creating task
- **FR-017**: System MUST use reasonable defaults for ambiguous times (e.g., "morning" = 9am, "afternoon" = 2pm) and confirm with user before task creation
- **FR-018**: System MUST extract reminder content from conversation context when user says "remind me about this" without repeating the subject
- **FR-019**: System MUST confirm reminder creation with both the task description and scheduled time in user's time zone
- **FR-019a**: MCP server MUST receive only structured ISO 8601 date/time values; all natural language parsing happens at n8n agent layer

**Calendar Integration:**

- **FR-020**: System MUST check calendar availability when user requests scheduling suggestions
- **FR-021**: System MUST consider task duration estimates when suggesting time slots
- **FR-022**: System MUST gracefully degrade to Vikunja-only functionality when calendar API is unavailable: immediately inform user of unavailability, offer task-based alternatives with reduced functionality, and continue processing without blocking on external service
- **FR-023**: System MUST offer user choice between suggesting time only or creating calendar event, asking "Would you like me to just note this time, or should I add it to your calendar?" to control integration level
- **FR-024**: System MUST support context-aware defaults for calendar integration (e.g., quick tasks may default to suggest-only, important meetings may prompt for calendar creation)

**Architecture & Reliability:**

- **FR-025**: System MUST route all Vikunja-related requests to specialist agent(s), supervisor must never answer from general knowledge
- **FR-026**: System MUST enforce search-before-action workflow at the tool level: each action tool (complete_task, update_task, delete_task) MUST internally perform search, present matches with context to user, wait for explicit confirmation of specific task ID, then execute only after approval (infrastructure-enforced, not prompt-based)
- **FR-027**: System MUST log all tool calls, agent routing decisions, user interactions, error rates, token usage, and response latencies in structured format with trace IDs linking related events for debugging and reliability analysis
- **FR-027a**: All logs MUST include trace ID, timestamp, agent identifier, operation type, and outcome (success/failure) for correlation across agent delegations
- **FR-027b**: System MUST track and log token usage per agent and per operation to support cost optimization analysis
- **FR-028**: System MUST support extensibility for adding new specialists (calendar, document management) without modifying core routing logic
- **FR-029**: System MUST maintain conversation history across agent delegations using n8n PostgreSQL memory nodes with SHARED database configuration, enabling cross-agent context awareness
- **FR-030**: Each specialist agent MUST be limited to 5-10 tools maximum to ensure reliable operation with cost-efficient models
- **FR-031**: System MUST use deterministic routing rules (keyword matching, explicit domain boundaries) rather than complex semantic inference for supervisor decisions
- **FR-032**: System MUST store workflow verification state (discovered task IDs, pending confirmations) in structured key-value format within shared PostgreSQL memory, accessible to all agents
- **FR-033a**: Supervisor agent memory MUST be configured with small context window (3-5 messages) to minimize token costs while maintaining routing capability
- **FR-033b**: Vikunja specialist memory MUST be configured with medium context window (10-15 messages) to retain domain-specific operation history
- **FR-033c**: Future specialist agents (calendar, documents) MUST be configured with medium context windows (8-12 messages) for domain operations
- **FR-033d**: All n8n workflows MUST be exported as JSON files in `n8n-workflows/` directory and version-controlled
- **FR-033e**: All agent system prompts MUST be stored as separate files in `n8n-workflows/prompts/` and referenced by workflows, enabling prompt iteration without workflow modification

**User Experience:**

- **FR-034**: System MUST communicate in natural, friendly language without exposing internal IDs or technical details
- **FR-035**: System MUST support multilingual interactions, matching task content in the language it was created
- **FR-036**: System MUST provide clear error messages with suggested next steps when operations fail; for external service failures, immediately inform user and offer alternative approaches with reduced functionality
- **FR-037**: System MUST confirm destructive operations using threshold-based approach: operations affecting 1-5 tasks execute immediately with confirmation message; operations affecting 6+ tasks require preview of changes and explicit user approval before execution
- **FR-038**: System MUST handle ambiguous task references using context-aware inference: if recent conversation (last 2-3 messages in shared memory) mentioned specific task, infer and confirm with user; if no context exists, ask for clarification

### Key Entities

- **User**: The person interacting with the system, authenticated in Vikunja with specific permissions and preferences
- **Task**: A unit of work with properties (title, description, due date, priority, completion status, project membership, assignees, labels, estimated duration)
- **Project**: A collection of related tasks with properties (title, description, color, archived status)
- **Label**: A categorization tag that can be applied to tasks for filtering and organization
- **Reminder**: A time-based notification request that translates into a task with specific due date/time
- **Conversation Context**: The accumulated knowledge from the ongoing dialogue, including discovered IDs, user preferences, and partially completed workflows
- **Calendar Event**: External time-block data used for availability checking and scheduling suggestions (from Google Calendar or other sources)
- **Agent**: A specialized AI component responsible for specific domains (supervisor for routing, Vikunja specialist for task management, future calendar specialist, etc.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Natural language task completion achieves 99%+ accuracy (correct task marked complete) when tested with 100 varied completion statements across single-match, multi-match, and no-match scenarios
- **SC-002**: System asks for clarification in 100% of cases where multiple tasks match user's completion statement, with zero instances of guessing
- **SC-003**: Daily task recommendations complete in under 3 seconds and present tasks sorted by urgency with 95%+ user agreement that top 3 suggestions are appropriate
- **SC-004**: Conversational project planning creates correct project structure (all requested tasks, proper due dates, correct organization) in 90%+ of test scenarios after user verification
- **SC-005**: Natural language reminder parsing achieves 95%+ accuracy for common time references (tomorrow, next week, specific times) across multiple languages
- **SC-006**: System maintains conversation context across agent delegations with zero loss of critical information (e.g., user can reference "that project we discussed" and system recalls it)
- **SC-007**: Calendar availability checking (when implemented) suggests appropriate time slots with 90%+ user acceptance rate for "can I fit this task" queries
- **SC-008**: System completes average user interaction in 2-4 conversational turns for simple operations (task completion, daily recommendations)
- **SC-009**: Zero data corruption incidents where wrong task is modified/completed/deleted after implementing verification workflow
- **SC-010**: User satisfaction score of 4.5/5 or higher for "system helps me stay organized" after 30 days of use
- **SC-011**: System operates reliably with cost-efficient models (e.g., Gemini 2.0 Flash Lite) achieving <5% failure rate on standard operations, with total operating cost under $0.10 per 1000 user interactions

