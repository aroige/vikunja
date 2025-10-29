# Session State Design

**Feature**: 011-ai-agent-architecture  
**Phase**: 2.5 (Alignment)  
**Purpose**: Implements FR-029, FR-032 (shared conversation context + structured workflow state)  
**Related Tasks**: T021d, T021e, T021g, T021h

## Goals
- Separate short-term reasoning memory (LLM window) from durable structured workflow state.
- Provide deterministic storage for multi-turn artifacts: pending confirmations, multi-match option sets, planning phases.
- Ensure supervisor and specialists can share state without leaking entire transcript.

## Table: `session_state`
Already defined in data model; logical usage clarified here.

| Field | Type | Description |
|-------|------|-------------|
| user_id | string (PK) | Vikunja user ID / session key |
| data | JSONB | Structured state blob (see schema) |
| updated_at | timestamptz | Last mutation time |

## JSON Schema (Conceptual)
```jsonc
{
  "pendingConfirmation": {
    "taskId": 123,
    "confirmationToken": "jwt-string",
    "intent": "complete_task",
    "expiresAt": 1730200000000
  },
  "lastTaskOptions": [
    { "index": 1, "id": 451, "title": "Water office plants", "dueDate": "2025-10-30" },
    { "index": 2, "id": 452, "title": "Water home plants", "dueDate": null }
  ],
  "planning": {
    "phase": "gathering|proposing|creating",
    "collected": { "goal": "...", "deadline": "2025-12-01" },
    "proposal": { "tasks": [ {"title": "..."} ] }
  },
  "timestamps": {
    "lastOptionsAt": 1730200000000
  }
}
```

## Lifecycle Rules
- `pendingConfirmation` invalid after expiry (default 5 min); supervisor must clear on timeout or unrelated intent.
- `lastTaskOptions` cleared after selection or after 10 minutes of inactivity.
- `planning` remains until user completes or cancels planning workflow.

## Access Pattern
1. Supervisor loads `session_state` at start of each user turn.
2. Specialist returns structured response; supervisor mutates state accordingly.
3. Save updated state only if changes occurred (detect diff to minimize writes).

## Helper Subworkflow (T021e)
`session-state-helpers.json` contains two callable workflow entry points:
- `LoadSessionState(userId)` → returns existing state or empty default.
- `SaveSessionState(userId, partialUpdate)` → merges shallow keys, updates timestamps.

## Merge Strategy
Pseudocode:
```ts
function mergeState(oldState, patch){
  const next = { ...oldState };
  for (const [k,v] of Object.entries(patch)) {
    if (v === null) delete next[k]; else next[k] = v;
  }
  next.updated_at = Date.now();
  return next;
}
```

## Selection Index Mapping (T021g)
When user says "first", "1", "number one":
1. Read `lastTaskOptions` array.
2. Map natural language to numeric index.
3. Retrieve option: `taskId` = option.id.
4. Call `complete_task` (if not previously confirmed) or request confirmation depending on tool design.

## Security / Validation
- Validate that `confirmationToken` matches `taskId` server-side (already enforced in MCP confirm tool).
- Never trust index without bounds check.

## Failure Handling
- If referenced option index missing → reply asking user to rephrase or show options again.
- If confirmation expired → clear state and prompt user to start action again.

## Future Extensions
- Add `calendarContext` for cross-agent free/busy cache.
- Add `metrics` counters (completedTasksThisSession) for adaptive UX.

## Status
Initial version created (T021d). Iterate as new user stories require additional fields.
