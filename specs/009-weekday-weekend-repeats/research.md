# Phase 0: Research & Design Decisions

## Overview

This document contains research findings and design decisions for implementing weekday and weekend repeat patterns in Vikunja. All technical unknowns from the planning phase are resolved here.

## Research Areas

### 1. Repeat Mode Implementation Strategy

**Decision**: Extend existing `RepeatMode` enum with two new values: `TaskRepeatModeWeekdays` (3) and `TaskRepeatModeWeekends` (4)

**Rationale**:
- Current system has 3 repeat modes (0=default, 1=monthly, 2=from-current)
- Adding modes 3 and 4 maintains backward compatibility
- Existing `UpdateDone()` function in `pkg/models/tasks.go` uses switch statement - easy to extend
- Frontend already has `TASK_REPEAT_MODES` constant object in `IRepeatMode.ts`

**Alternatives considered**:
- **Day-of-week bitmask** (e.g., 0b0111110 for weekdays): More flexible but complex to implement, overkill for simple weekday/weekend split
- **Separate boolean flags** (`weekdays_only`, `weekends_only`): Requires database migration for new columns, harder to validate mutual exclusivity
- **Custom recurrence rules (iCalendar RRULE)**: Over-engineered for this specific need, would require major refactor

**Implementation approach**:
```go
// In pkg/models/tasks.go
const (
    TaskRepeatModeDefault TaskRepeatMode = iota
    TaskRepeatModeMonth
    TaskRepeatModeFromCurrentDate
    TaskRepeatModeWeekdays      // 3 - NEW
    TaskRepeatModeWeekends      // 4 - NEW
)

// In UpdateDone() switch statement, add:
case TaskRepeatModeWeekdays:
    setTaskDatesWeekdayRepeat(oldTask, newTask)
case TaskRepeatModeWeekends:
    setTaskDatesWeekendRepeat(oldTask, newTask)
```

---

### 2. Date Calculation Logic for Weekday/Weekend Patterns

**Decision**: Skip to next valid day when calculating next occurrence

**Algorithm for Weekdays** (Monday-Friday):
1. Calculate initial next date: `nextDate = currentDate + repeatAfter`
2. Check `nextDate.Weekday()`
3. If Saturday (6): add 2 days to reach Monday
4. If Sunday (0): add 1 day to reach Monday
5. Otherwise: use `nextDate` as-is

**Algorithm for Weekends** (Saturday-Sunday):
1. Calculate initial next date: `nextDate = currentDate + repeatAfter`
2. Check `nextDate.Weekday()`
3. If Monday-Friday (1-5): add days to reach next Saturday
   - Monday: +5, Tuesday: +4, Wednesday: +3, Thursday: +2, Friday: +1
4. If Saturday/Sunday: use `nextDate` as-is

**Rationale**:
- Simple, predictable behavior: always skip to next valid day
- Preserves time-of-day from original due date
- Matches user mental model: "skip weekends" means "jump to Monday"
- No special handling needed for holidays (that's a future feature)

**Edge case handling**:
- **No due date**: Weekday/weekend filter only applies when due date exists
- **Multiple days late**: Calculation uses completion date (mode 2 behavior) or due date (mode 0 behavior) - skip logic applies to result
- **Timezone**: Server-side calculation uses task's due date timezone (existing behavior)

**Code example**:
```go
func setTaskDatesWeekdayRepeat(oldTask, newTask *Task) {
    if oldTask.RepeatAfter == 0 {
        return
    }
    
    now := time.Now()
    repeatDuration := time.Duration(oldTask.RepeatAfter) * time.Second
    
    if !oldTask.DueDate.IsZero() {
        nextDate := oldTask.DueDate.Add(repeatDuration)
        // Skip to Monday if lands on weekend
        weekday := nextDate.Weekday()
        if weekday == time.Saturday {
            nextDate = nextDate.AddDate(0, 0, 2) // +2 days to Monday
        } else if weekday == time.Sunday {
            nextDate = nextDate.AddDate(0, 0, 1) // +1 day to Monday
        }
        newTask.DueDate = nextDate
    }
    
    // Apply same logic to start/end dates and reminders
    // (similar to existing setTaskDatesDefault implementation)
}
```

---

### 3. Frontend Preset Button UX

**Decision**: Add two new preset buttons to existing row in `RepeatAfter.vue`

**Design**:
```
[Every Day] [Every Week] [Every 30d] [Weekdays] [Weekends]
```

**Interaction behavior**:
- Click "Weekdays" → sets `repeatAfter: { amount: 1, type: 'days' }` and `repeatMode: 3`
- Click "Weekends" → sets `repeatAfter: { amount: 1, type: 'days' }` and `repeatMode: 4`
- Clicking any preset replaces previous selection (mutually exclusive)
- Preset buttons highlight when active (matching existing button logic)

**Rationale**:
- Familiar pattern: matches existing "Every Day" / "Every Week" buttons
- One-click setup: users don't need to understand mode numbers
- Visual grouping: all presets in one row for easy discovery
- Bulma CSS: uses existing `.buttons.has-addons` styling

**Accessibility**:
- Keyboard navigation: Tab through buttons, Enter/Space to activate
- Screen readers: "Repeat on weekdays only" / "Repeat on weekends only"
- Visual feedback: Active button has `is-active` class (darker background)

**Alternatives considered**:
- **Dropdown menu**: Less discoverable, requires extra click
- **Checkbox filters**: More complex UI, doesn't match existing preset pattern
- **Separate "Days" selector**: Overkill for binary weekday/weekend choice

---

### 4. API Endpoint Strategy

**Decision**: No new API endpoints required - use existing task create/update endpoints

**Rationale**:
- `POST /api/v1/projects/:project/tasks` already accepts `repeat_mode` parameter
- `PUT /api/v1/tasks/:id` already accepts `repeat_mode` parameter
- New modes (3, 4) are just additional enum values - no schema change
- Frontend already sends `repeat_mode` in task payloads

**Validation**:
- Backend: Update validation to accept values 0-4 (currently accepts 0-2)
- MCP Server: Update Zod schema `max(4)` instead of `max(2)`

**API request example**:
```json
{
  "title": "Daily standup",
  "due_date": "2025-10-27T10:00:00Z",
  "repeat_after": 86400,
  "repeat_mode": 3
}
```

**API response** (unchanged structure):
```json
{
  "id": 123,
  "title": "Daily standup",
  "repeat_after": 86400,
  "repeat_mode": 3,
  "due_date": "2025-10-27T10:00:00Z"
}
```

---

### 5. Database Migration Approach

**Decision**: No database schema migration needed

**Rationale**:
- `repeat_mode` column already exists as integer type
- Current valid values: 0, 1, 2
- New valid values: 3, 4
- No column type change needed (integer accommodates new values)
- No new columns needed (day-of-week logic is calculated, not stored)

**Validation update only**:
```go
// In pkg/models/tasks.go
RepeatMode TaskRepeatMode `xorm:"not null default 0" json:"repeat_mode" valid:"range(0|4)"`
```

**Migration decision**: Skip database migration, only update validation rules

**Rollback plan**: If needed to rollback, tasks with modes 3 or 4 would display as "unknown" but wouldn't break - could be manually changed to mode 0 (default)

---

### 6. MCP Server Integration

**Decision**: Update tool descriptions and validation schemas to document new modes

**Changes required**:
1. **`src/tools/tasks.ts`**: Update `repeat_mode` description to include modes 3 & 4
2. **`src/vikunja/types.ts`**: Add `WEEKDAYS = 3` and `WEEKENDS = 4` to `RepeatMode` enum
3. **`docs/TOOLS.md`**: Add examples of weekday/weekend task creation
4. **`tests/tools/tasks.test.ts`**: Add validation tests for new modes

**Example tool description update**:
```typescript
repeat_mode: z.number().int().min(0).max(4).optional()
  .describe('Recurring task repeat mode (optional, 0-4). RepeatMode enum: 0=DEFAULT (repeat from due date), 1=MONTHLY (same calendar date each month), 2=FROM_CURRENT (repeat from completion), 3=WEEKDAYS (Monday-Friday only), 4=WEEKENDS (Saturday-Sunday only). Default: non-recurring task.')
```

**Example documentation**:
```markdown
### Weekday Pattern Example
Create a daily standup that only occurs Monday-Friday:
{
  "title": "Daily standup",
  "due_date": "2025-10-27T10:00:00Z",
  "repeat_after": 86400,
  "repeat_mode": 3
}
```

---

### 7. Internationalization (i18n)

**Decision**: Add translation keys for weekday/weekend labels

**Required translations** (add to `frontend/src/i18n/lang/en.json`):
```json
{
  "task": {
    "repeat": {
      "weekdays": "Weekdays",
      "weekends": "Weekends",
      "weekdaysDescription": "Repeats Monday through Friday only",
      "weekendsDescription": "Repeats Saturday and Sunday only"
    }
  }
}
```

**Also update** (backend `pkg/i18n/lang/en.json` if needed for notifications):
```json
{
  "task": {
    "repeat": {
      "weekdays": "weekdays",
      "weekends": "weekends"
    }
  }
}
```

**Translation workflow**:
1. Add English source strings only
2. Translation system (Crowdin) will handle other languages
3. Use `$t('task.repeat.weekdays')` in Vue templates

---

### 8. Testing Strategy

**Decision**: Test-first development with comprehensive coverage at all layers

**Backend tests** (`pkg/services/task_test.go`):
```go
func TestTaskService_WeekdayRepeat_SkipsWeekends(t *testing.T) {
    // Test Friday → Monday skip
    // Test Saturday/Sunday completion → Monday
}

func TestTaskService_WeekendRepeat_SkipsWeekdays(t *testing.T) {
    // Test Friday completion → Saturday
    // Test Monday-Thursday completion → Saturday
}
```

**Frontend tests** (`frontend/tests/unit/components/tasks/RepeatAfter.test.ts`):
```typescript
describe('RepeatAfter.vue - Weekday/Weekend Presets', () => {
  it('sets weekday mode when clicking Weekdays button', () => {
    // Click preset, verify repeatMode = 3
  })
  
  it('sets weekend mode when clicking Weekends button', () => {
    // Click preset, verify repeatMode = 4
  })
})
```

**MCP Server tests** (`mcp-server/tests/tools/tasks.test.ts`):
```typescript
it('should accept repeat_mode=3 (weekdays)', () => {
  const input = { project_id: 1, title: 'Task', repeat_mode: 3 };
  expect(CreateTaskSchema.safeParse(input).success).toBe(true);
})
```

**E2E test scenarios** (Cypress):
1. Create task with weekday preset → verify in task list
2. Complete Friday weekday task → verify next occurrence is Monday
3. Create weekend task → verify Saturday/Sunday only

---

## Design Decisions Summary

| Decision Area | Choice | Rationale |
|--------------|--------|-----------|
| **Implementation** | New RepeatMode enum values (3, 4) | Backward compatible, simple extension |
| **Date Calculation** | Skip to next valid day | Predictable, matches user expectations |
| **UI/UX** | Preset buttons in RepeatAfter.vue | Matches existing pattern, one-click setup |
| **API** | No new endpoints | Existing endpoints handle new modes |
| **Database** | No migration needed | Integer column accommodates new values |
| **MCP Integration** | Update docs & schemas | Enable AI agents to use new patterns |
| **i18n** | Add weekday/weekend keys | Translatable UI labels |
| **Testing** | TDD at all layers | Ensure correctness, prevent regression |

---

## Implementation Readiness

All technical unknowns have been resolved. The feature is ready for Phase 1 (Data Model & Contracts).

**Next Phase**: Generate `data-model.md` and `contracts/` directory with API specifications.
