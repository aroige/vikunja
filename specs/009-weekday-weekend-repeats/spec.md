# Feature Specification: Weekday and Weekend Repeat Patterns

**Feature Branch**: `009-weekday-weekend-repeats`  
**Created**: October 26, 2025  
**Status**: Draft  
**Input**: User description: "Repeating interval: As a user I want to be able to set a task to repeat only on Weekdays (Monday-Friday) or on weekends. Use the best UX and design decisions when planning this task. The frontend must be really nice and easy to use. Also, the API endpoints should support this, as well as the MCP-SERVER."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set Weekday Repeat Pattern (Priority: P1)

A user wants to create or update a task that repeats only on weekdays (Monday through Friday), such as a daily standup meeting or morning exercise routine that should not occur on weekends.

**Why this priority**: This is the most common use case - many users need tasks that repeat on working days but skip weekends. This is the core functionality that delivers immediate value.

**Independent Test**: Create a task "Daily standup" with weekday repeat pattern. Verify it creates recurring instances only Monday-Friday, skipping Saturday and Sunday. Completing the task on Friday should schedule the next occurrence for Monday.

**Acceptance Scenarios**:

1. **Given** a user is creating a new task, **When** they select "Repeat on Weekdays" option, **Then** the task repeats daily Monday through Friday only
2. **Given** a user completes a weekday task on Friday, **When** the task is marked done, **Then** the next occurrence is scheduled for the following Monday
3. **Given** a user has a weekday recurring task, **When** viewing the task calendar, **Then** no instances appear on Saturdays or Sundays
4. **Given** a user edits an existing non-recurring task, **When** they add weekday repeat pattern, **Then** the task begins repeating on weekdays from the next occurrence

---

### User Story 2 - Set Weekend Repeat Pattern (Priority: P2)

A user wants to create or update a task that repeats only on weekends (Saturday and Sunday), such as household chores, family activities, or personal projects that only happen during non-working days.

**Why this priority**: While less common than weekday repeats, weekend-only tasks are important for users who separate work and personal activities. This completes the weekday/weekend split functionality.

**Independent Test**: Create a task "Clean house" with weekend repeat pattern. Verify it creates recurring instances only on Saturday and Sunday. Completing the task on Sunday should schedule the next occurrence for the following Saturday.

**Acceptance Scenarios**:

1. **Given** a user is creating a new task, **When** they select "Repeat on Weekends" option, **Then** the task repeats on Saturday and Sunday only
2. **Given** a user completes a weekend task on Sunday, **When** the task is marked done, **Then** the next occurrence is scheduled for the following Saturday
3. **Given** a user has a weekend recurring task, **When** viewing the task calendar, **Then** instances only appear on Saturdays and Sundays
4. **Given** a weekend task is due on Saturday, **When** the user completes it, **Then** the next occurrence can be scheduled for the same Sunday (if immediate repeat within weekend is desired)

---

### User Story 3 - Quick Selection in Task Creation UI (Priority: P3)

Users can quickly select common repeat patterns through an intuitive interface with preset buttons like "Every Day", "Every Week", "Weekdays", and "Weekends".

**Why this priority**: While important for UX, this enhances the interface for setting patterns defined in P1 and P2. It's valuable but depends on the core functionality being in place first.

**Independent Test**: Open task creation form. Click "Weekdays" preset button. Verify the repeat pattern is automatically configured without requiring manual field entry.

**Acceptance Scenarios**:

1. **Given** a user is on the task creation form, **When** they view the repeat options, **Then** they see preset buttons for "Every Day", "Every Week", "Weekdays", and "Weekends"
2. **Given** a user clicks the "Weekdays" preset button, **When** the form is submitted, **Then** the task is created with weekday repeat pattern
3. **Given** a user clicks the "Weekends" preset button, **When** the form is submitted, **Then** the task is created with weekend repeat pattern
4. **Given** a user has selected a preset, **When** they click a different preset, **Then** the previous selection is replaced with the new pattern

---

### User Story 4 - MCP Server Support for Weekday/Weekend Patterns (Priority: P3)

AI agents using the MCP server can create and manage tasks with weekday and weekend repeat patterns through natural language or structured parameters.

**Why this priority**: This extends the functionality to the MCP integration. It's valuable for automation but depends on the backend API being implemented first.

**Independent Test**: Using MCP server, create a task via API call with weekday pattern parameter. Verify the task is created correctly and repeats only on weekdays.

**Acceptance Scenarios**:

1. **Given** an AI agent calls create_task via MCP, **When** including weekday pattern parameter, **Then** the task is created with weekday repeat
2. **Given** an AI agent calls update_task via MCP, **When** changing to weekend pattern, **Then** the task updates to weekend repeat only
3. **Given** an AI agent requests task details via MCP, **When** the task has weekday/weekend pattern, **Then** the response clearly indicates the repeat pattern type
4. **Given** the MCP tool documentation, **When** a developer reads create_task schema, **Then** they understand how to specify weekday and weekend patterns with examples

---

### Edge Cases

- What happens when a weekday task's due date falls on a holiday or user-defined non-working day?
- How does the system handle switching from weekday pattern to weekend pattern or vice versa on an existing task with past occurrences?
- What happens if a user manually changes a single occurrence of a weekday task to fall on a weekend?
- How does the system behave when a weekday task is completed multiple days late (e.g., completed on Sunday when it was due on Wednesday)?
- What happens with time zones when a weekday task is due at midnight and timezone changes might shift it to weekend?
- How does the system handle weekday pattern for tasks without a due date?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support a weekday repeat pattern that schedules task occurrences only on Monday, Tuesday, Wednesday, Thursday, and Friday
- **FR-002**: System MUST support a weekend repeat pattern that schedules task occurrences only on Saturday and Sunday
- **FR-003**: System MUST skip weekend days (Saturday, Sunday) when calculating next occurrence for weekday pattern tasks
- **FR-004**: System MUST skip weekdays (Monday-Friday) when calculating next occurrence for weekend pattern tasks
- **FR-005**: Users MUST be able to set weekday or weekend pattern when creating a new task
- **FR-006**: Users MUST be able to change an existing task to use weekday or weekend pattern
- **FR-007**: Users MUST be able to change a task from weekday pattern to weekend pattern and vice versa
- **FR-008**: System MUST calculate correct next occurrence date when marking a weekday/weekend task as complete, respecting the pattern constraint
- **FR-009**: Task details view MUST clearly display that a task uses weekday or weekend repeat pattern
- **FR-010**: Calendar and list views MUST show only the scheduled occurrences based on the weekday/weekend pattern
- **FR-011**: System MUST persist weekday/weekend pattern information in the database
- **FR-012**: API endpoints MUST accept parameters for weekday and weekend repeat patterns
- **FR-013**: API endpoints MUST return weekday/weekend pattern information in task response data
- **FR-014**: MCP server tools (create_task, update_task) MUST support weekday and weekend pattern parameters
- **FR-015**: MCP server documentation MUST include examples of creating tasks with weekday and weekend patterns
- **FR-016**: System MUST validate that a task cannot have both weekday and weekend pattern simultaneously
- **FR-017**: Frontend MUST provide preset buttons for quick selection of common patterns including weekdays and weekends
- **FR-018**: System MUST maintain backward compatibility with existing repeat_after and repeat_mode functionality
- **FR-019**: When a weekday task is completed on Friday, system MUST schedule next occurrence for Monday (skipping weekend)
- **FR-020**: When a weekend task is completed on Sunday, system MUST schedule next occurrence for following Saturday (skipping weekdays)

### Key Entities *(include if feature involves data)*

- **Task**: Extended with weekday/weekend pattern attribute
  - Existing attributes: repeat_after (interval in seconds), repeat_mode (0=default, 1=monthly, 2=from current)
  - New attribute needed: Weekday/weekend pattern specification (could be additional mode, separate flag, or day-of-week mask)
  - Relationship: One task has one repeat pattern configuration

- **Repeat Pattern**: Represents the recurrence rule for a task
  - Pattern type: Daily, Weekly, Weekdays-only, Weekends-only, Monthly, From-completion
  - Constraint: Defines which days of the week are valid for occurrences
  - Behavior: Controls how next occurrence date is calculated

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure a weekday repeat pattern in under 10 seconds using preset buttons
- **SC-002**: 95% of weekday pattern tasks correctly skip weekend days when computing next occurrence
- **SC-003**: Weekend pattern tasks create no occurrences on Monday-Friday (100% accuracy)
- **SC-004**: Task creation time with repeat patterns remains under 3 seconds (no performance degradation)
- **SC-005**: MCP server successfully creates weekday/weekend tasks with 100% parameter validation accuracy
- **SC-006**: Zero data loss when converting between repeat patterns (weekday ↔ weekend ↔ daily)
- **SC-007**: API response time for tasks with weekday/weekend patterns remains under 200ms (no performance impact)
- **SC-008**: Calendar views load weekday/weekend recurring task series in under 1 second for 100+ occurrences
- **SC-009**: User comprehension of weekday vs weekend patterns achieves 90%+ understanding on first use (measured through correct task creation)

## Assumptions

- Weekdays are defined as Monday through Friday across all locales (international standard business week)
- Weekends are defined as Saturday and Sunday across all locales
- The system does not need to support custom work week definitions (e.g., Sunday-Thursday for some regions) in this iteration
- When a task has a specific due time, that time is preserved across all occurrences regardless of day of week
- The feature builds upon existing repeat_after and repeat_mode infrastructure
- Existing recurring tasks using repeat_after intervals will not automatically convert to weekday/weekend patterns
- The frontend framework (Vue.js) supports the UI components needed for the enhanced repeat interface
- Database schema can be extended to accommodate the new pattern type without requiring major structural changes

