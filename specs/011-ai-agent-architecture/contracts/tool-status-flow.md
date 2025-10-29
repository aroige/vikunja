# Tool Status Flow Contract

**Feature**: 011-ai-agent-architecture  
**Phase**: 2.5 Alignment  
**Related Tasks**: T021j  
**Purpose**: Canonical mapping of MCP tool result statuses → workflow behaviors (Supervisor + Specialists). Implements FR-026, FR-027, FR-032.

## Status Vocabulary
| Status | Origin Tool(s) | Meaning | Supervisor Action | Specialist Action |
|--------|----------------|---------|-------------------|-------------------|
| `confirm_required` | complete_task, update_task, bulk_complete_tasks | Single definitive match found; requires explicit user yes before action | Ask user yes/no; on yes call corresponding confirm tool | Return status w/ taskId + confirmationToken; no further prompts |
| `multiple_options` | complete_task (search phase) | Multiple plausible tasks; user must pick one | Present numbered list; capture selection; re-dispatch intent with selectionIndex | Populate `options[]` with tasks (id,title,dueDate,priority) |
| `needs_clarification` | search_tasks, create_task (ambiguous input) | Input insufficient to continue | Ask targeted clarifying question; keep state | Provide concise clarification request |
| `no_match` | search_tasks / complete_task path | Zero tasks matched user intent | Offer alternatives (create, search again, check completed) | Return helpful suggestions |
| `completed` | confirm_* tools, create_task final, update_task final | Terminal success of requested action | Relay success message; clear related session state | Provide final message |
| `preview_required` | bulk_complete_tasks (>= threshold) | Requires user approval of batch | Show preview list; on approval call confirm bulk tool | Provide preview data |
| `error` | any | System or validation failure | Provide user-friendly error & suggested next step | Return sanitized errorType + message |

## Confirmation Flow
```
User → complete_task → {confirm_required, taskId, confirmationToken}
Supervisor → Ask user yes/no
User: yes → confirm_complete_task → {completed}
```

## Multi-Option Selection Flow
```
User → complete_task → {multiple_options, options:[...]}
Supervisor → Show enumerated list + store lastTaskOptions
User: "second one" → selectionIndex=2
Supervisor → Resolved task -> re-issue complete_task with explicit query or dedicated select tool (optional) → {confirm_required}
Follow confirmation flow
```

## Session State Mutations
| Status | Session Mutation |
|--------|------------------|
| multiple_options | `lastTaskOptions=[...]` (with index mapping) |
| confirm_required | `pendingConfirmation={taskId, token, intent, expiresAt}` |
| completed | Clear `pendingConfirmation`; optionally clear related `lastTaskOptions` |
| no_match | None (optionally record lastFailedQuery) |
| needs_clarification | None (unless tracking metrics) |
| preview_required | `pendingPreview={items, token, intent, expiresAt}` |

## Error Handling
- `errorType=VALIDATION` → Advise user to rephrase or supply missing fields.
- `errorType=SYSTEM` → Apologize once; suggest retry later.
- Always preserve `traceId` for correlation.

## Trace ID Propagation
Every tool result MUST include `traceId`. Supervisor logs correlation set: `{traceId, userId, intent, status}`.

## Security Notes
- Never trust `confirmationToken` without server verification.
- Selection index must be within bounds of `lastTaskOptions` or request re-selection.

## Future Extensions
- Introduce `partial_success` for batch operations.
- Add `rate_limited` status once T069 implemented.

## Version History
- v1.0.0 (2025-10-29): Initial contract (T021j)
