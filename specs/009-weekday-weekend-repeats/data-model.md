# Data Model: Weekday and Weekend Repeat Patterns

## Overview

This document defines the data model extensions for weekday and weekend repeat patterns. The implementation extends existing entities without adding new tables.

## Entities

### Task (Extended)

**Purpose**: Represents a task with optional repeat configuration including weekday/weekend patterns

**Location**: `pkg/models/tasks.go` (backend), `frontend/src/modelTypes/ITask.ts` (frontend)

**Attributes**:

| Field | Type | Description | Validation | Changes |
|-------|------|-------------|------------|---------|
| `repeat_mode` | `TaskRepeatMode` (enum/integer) | Repeat calculation mode | `valid:"range(0\|4)"` | ✨ **Extended range** (was 0-2, now 0-4) |
| `repeat_after` | `int64` (seconds) | Interval between occurrences | `valid:"range(0\|9223372036854775807)"` | No change |
| `due_date` | `time.Time` | Next occurrence date | Optional | No change (used in calculation) |
| `start_date` | `time.Time` | Task start date | Optional | No change (adjusted with due_date) |
| `end_date` | `time.Time` | Task end date | Optional | No change (adjusted with due_date) |
| `reminders` | `[]TaskReminder` | Associated reminders | Optional | No change (adjusted with due_date) |

**RepeatMode Values**:

| Value | Name | Description | Usage |
|-------|------|-------------|-------|
| 0 | `TaskRepeatModeDefault` | Repeat from last due date | Scheduled tasks (meetings, deadlines) |
| 1 | `TaskRepeatModeMonth` | Repeat on same calendar date | Monthly bills, reports |
| 2 | `TaskRepeatModeFromCurrentDate` | Repeat from completion date | Flexible tasks (maintenance) |
| 3 | ✨ `TaskRepeatModeWeekdays` | **NEW**: Repeat Monday-Friday only | Work tasks, daily standups |
| 4 | ✨ `TaskRepeatModeWeekends` | **NEW**: Repeat Saturday-Sunday only | Personal tasks, chores |

**State Transitions**:

```
[Task Created with repeat_mode=3 or 4]
    ↓
[Task marked as done]
    ↓
[Calculate next due_date using repeat_after]
    ↓
[Apply weekday/weekend filter:]
    - Mode 3: Skip to Monday if weekend
    - Mode 4: Skip to Saturday if weekday
    ↓
[Task unmarked as done with new due_date]
    ↓
[Repeat cycle]
```

**Validation Rules**:

1. `repeat_mode` must be integer 0-4 (inclusive)
2. If `repeat_mode` is 3 or 4, `repeat_after` should be > 0 (daily minimum)
3. Weekday mode (3) with `repeat_after < 86400` (less than 1 day) is allowed but uncommon
4. Weekend mode (4) typically uses `repeat_after >= 86400` (daily or longer)
5. `repeat_mode` 3 or 4 only applies when `due_date` is set

**Relationships**:

- Task → TaskReminder (1:N): Reminders are adjusted when due_date changes
- Task → Project (N:1): Repeat mode is task-specific, not inherited
- Task → User (N:M via assignments): Repeat mode applies to all assignees

---

### RepeatAfter (Frontend Interface)

**Purpose**: UI representation of repeat interval

**Location**: `frontend/src/types/IRepeatAfter.ts`

**Attributes**:

| Field | Type | Description | Values |
|-------|------|-------------|--------|
| `type` | `IRepeatType` | Unit of time | 'hours', 'days', 'weeks', 'months', 'years' |
| `amount` | `number` | Quantity of type | Positive integer |

**Conversion**:

- Frontend stores human-readable format: `{ type: 'days', amount: 1 }`
- Backend stores seconds: `86400`
- Conversion happens in `frontend/src/services/task.ts` `processModel()` method

**Weekday/Weekend Presets**:

| Preset Button | Sets `type` | Sets `amount` | Sets `repeat_mode` |
|--------------|-------------|---------------|-------------------|
| "Weekdays" | `'days'` | `1` | `3` |
| "Weekends" | `'days'` | `1` | `4` |

---

## Domain Logic

### Weekday Repeat Calculation

**Input**: 
- `oldTask.due_date`: Last occurrence date (e.g., Friday 2025-10-24 10:00)
- `oldTask.repeat_after`: Interval in seconds (e.g., 86400 for daily)
- `oldTask.repeat_mode`: 3 (weekdays)

**Process**:
1. Calculate base next date: `nextDate = oldTask.due_date + repeat_after`
2. Get weekday: `weekday = nextDate.Weekday()` (Go: 0=Sunday, 1=Monday, ..., 6=Saturday)
3. Apply skip logic:
   ```go
   if weekday == time.Saturday {  // 6
       nextDate = nextDate.AddDate(0, 0, 2)  // Skip to Monday
   } else if weekday == time.Sunday {  // 0
       nextDate = nextDate.AddDate(0, 0, 1)  // Skip to Monday
   }
   // Else: already weekday, use as-is
   ```
4. Set `newTask.due_date = nextDate`
5. Adjust `start_date`, `end_date`, `reminders` by same offset

**Output**: 
- `newTask.due_date`: Next weekday occurrence (e.g., Monday 2025-10-27 10:00)
- `newTask.done`: `false` (task unmarked for next occurrence)

**Example**:
- Complete Friday 10/24 task → Next occurrence: Monday 10/27
- Complete Thursday 10/23 task → Next occurrence: Friday 10/24
- Complete Saturday 10/25 task (if manually completed) → Next occurrence: Monday 10/27

---

### Weekend Repeat Calculation

**Input**: 
- `oldTask.due_date`: Last occurrence date (e.g., Sunday 2025-10-26 14:00)
- `oldTask.repeat_after`: Interval in seconds (e.g., 86400 for daily)
- `oldTask.repeat_mode`: 4 (weekends)

**Process**:
1. Calculate base next date: `nextDate = oldTask.due_date + repeat_after`
2. Get weekday: `weekday = nextDate.Weekday()`
3. Apply skip logic:
   ```go
   switch weekday {
   case time.Monday:    // 1
       nextDate = nextDate.AddDate(0, 0, 5)  // Skip to Saturday
   case time.Tuesday:   // 2
       nextDate = nextDate.AddDate(0, 0, 4)
   case time.Wednesday: // 3
       nextDate = nextDate.AddDate(0, 0, 3)
   case time.Thursday:  // 4
       nextDate = nextDate.AddDate(0, 0, 2)
   case time.Friday:    // 5
       nextDate = nextDate.AddDate(0, 0, 1)
   // Saturday (6) or Sunday (0): use as-is
   }
   ```
4. Set `newTask.due_date = nextDate`
5. Adjust `start_date`, `end_date`, `reminders` by same offset

**Output**: 
- `newTask.due_date`: Next weekend occurrence (e.g., Saturday 11/01 14:00)
- `newTask.done`: `false`

**Example**:
- Complete Sunday 10/26 task → Next occurrence: Saturday 11/01 (skip Mon-Fri)
- Complete Saturday 10/25 task → Next occurrence: Sunday 10/26
- Complete Friday 10/24 task (if manually completed) → Next occurrence: Saturday 10/25

---

## Data Persistence

### Database Schema

**No migration needed** - `repeat_mode` column already exists as integer type.

**Existing schema** (`tasks` table):
```sql
CREATE TABLE tasks (
    id BIGINT PRIMARY KEY,
    -- ...other fields...
    repeat_after BIGINT DEFAULT 0,
    repeat_mode INT NOT NULL DEFAULT 0,
    due_date DATETIME NULL,
    -- ...other fields...
);
```

**Validation update**:
- Old: `repeat_mode` validates 0-2
- New: `repeat_mode` validates 0-4

**Index**: `repeat_mode` does not need indexing (not frequently queried, not used in WHERE clauses)

---

### API Representation

**JSON Schema** (no changes to structure):

```json
{
  "id": 123,
  "title": "Daily standup",
  "description": "",
  "repeat_after": 86400,
  "repeat_mode": 3,
  "due_date": "2025-10-27T10:00:00Z",
  "start_date": null,
  "end_date": null,
  "reminders": []
}
```

**Field definitions**:
- `repeat_after`: Number of seconds between occurrences (86400 = 1 day)
- `repeat_mode`: Integer 0-4 (see RepeatMode table above)
- `due_date`: ISO 8601 datetime (timezone-aware)

**Validation** (XORM tags):
```go
RepeatAfter int64          `xorm:"bigint INDEX null" json:"repeat_after" valid:"range(0|9223372036854775807)"`
RepeatMode  TaskRepeatMode `xorm:"not null default 0" json:"repeat_mode" valid:"range(0|4)"`
```

---

## Frontend Type Definitions

### TypeScript Interfaces

**`frontend/src/types/IRepeatMode.ts`**:
```typescript
export const TASK_REPEAT_MODES = {
  'REPEAT_MODE_DEFAULT': 0,
  'REPEAT_MODE_MONTH': 1,
  'REPEAT_MODE_FROM_CURRENT_DATE': 2,
  'REPEAT_MODE_WEEKDAYS': 3,      // ✨ NEW
  'REPEAT_MODE_WEEKENDS': 4,      // ✨ NEW
} as const

export type IRepeatMode = typeof TASK_REPEAT_MODES[keyof typeof TASK_REPEAT_MODES]
```

**`frontend/src/modelTypes/ITask.ts`** (no changes - uses `IRepeatMode` type):
```typescript
export interface ITask extends IAbstract {
  // ...other fields...
  repeatAfter: number | IRepeatAfter
  repeatMode: IRepeatMode
  dueDate: Date | null
  // ...other fields...
}
```

---

## Compatibility & Migration

### Backward Compatibility

✅ **Fully backward compatible**:
- Existing tasks with `repeat_mode` 0, 1, 2 continue to work unchanged
- New modes (3, 4) are additive - no breaking changes
- API clients not aware of new modes can still read/write tasks
- If client sends unknown mode (e.g., 5), validation rejects it

### Forward Compatibility

⚠️ **Partial forward compatibility**:
- Old API clients (before this feature) can read tasks with mode 3 or 4
- Old clients will see `repeat_mode: 3` or `4` in JSON (valid integer)
- Old clients may display "unknown repeat mode" in UI (graceful degradation)
- Old clients can still edit other task fields without breaking repeat

### Rollback Strategy

If feature needs to be rolled back:
1. **Database**: No rollback needed (no schema change)
2. **Backend**: Revert to old validation `range(0|2)` - rejects modes 3 & 4
3. **Frontend**: Remove weekday/weekend preset buttons
4. **Existing tasks**: Tasks with mode 3 or 4 would fail validation
   - Manual fix: Update via SQL `UPDATE tasks SET repeat_mode = 0 WHERE repeat_mode IN (3, 4)`
   - Or: Provide admin tool to batch-update affected tasks

---

## Testing Data Requirements

### Test Fixtures

**Weekday task** (for unit tests):
```go
&Task{
    ID: 1,
    Title: "Daily standup",
    RepeatAfter: 86400,  // 1 day
    RepeatMode: TaskRepeatModeWeekdays,
    DueDate: time.Date(2025, 10, 24, 10, 0, 0, 0, time.UTC),  // Friday
    Done: false,
}
```

**Weekend task** (for unit tests):
```go
&Task{
    ID: 2,
    Title: "Clean house",
    RepeatAfter: 86400,  // 1 day
    RepeatMode: TaskRepeatModeWeekends,
    DueDate: time.Date(2025, 10, 26, 14, 0, 0, 0, time.UTC),  // Sunday
    Done: false,
}
```

### Test Scenarios

| Scenario | Input | Expected Output |
|----------|-------|----------------|
| Weekday Friday → Monday | Due: Fri 10/24, Mode: 3 | Next: Mon 10/27 |
| Weekday Thursday → Friday | Due: Thu 10/23, Mode: 3 | Next: Fri 10/24 |
| Weekend Sunday → Saturday | Due: Sun 10/26, Mode: 4 | Next: Sat 11/01 |
| Weekend Friday → Saturday | Due: Fri 10/24, Mode: 4 | Next: Sat 10/25 |
| Weekday no due date | Due: null, Mode: 3 | No change (skip logic not applied) |

---

## Summary

### Changes Required

| Component | File | Change Type | Description |
|-----------|------|-------------|-------------|
| Backend Model | `pkg/models/tasks.go` | Extend enum | Add `TaskRepeatModeWeekdays` (3), `TaskRepeatModeWeekends` (4) |
| Backend Model | `pkg/models/tasks.go` | Add functions | `setTaskDatesWeekdayRepeat()`, `setTaskDatesWeekendRepeat()` |
| Backend Model | `pkg/models/tasks.go` | Update switch | Add cases in `UpdateDone()` for modes 3 & 4 |
| Frontend Types | `src/types/IRepeatMode.ts` | Extend const | Add `REPEAT_MODE_WEEKDAYS` (3), `REPEAT_MODE_WEEKENDS` (4) |
| Frontend UI | `src/components/tasks/partials/RepeatAfter.vue` | Add buttons | "Weekdays" and "Weekends" preset buttons |
| MCP Server | `src/vikunja/types.ts` | Extend enum | Add `WEEKDAYS = 3`, `WEEKENDS = 4` to `RepeatMode` |
| MCP Server | `src/tools/tasks.ts` | Update validation | Change `max(2)` to `max(4)` in schemas |

### No Changes Needed

- ❌ Database migration (integer column accommodates new values)
- ❌ New API endpoints (existing endpoints handle new modes)
- ❌ New database tables or columns
- ❌ Authentication or permissions logic
- ❌ API response structure

### Data Integrity

**Constraints enforced**:
1. `repeat_mode` must be 0-4
2. If `repeat_mode` is 3 or 4, weekday/weekend logic applies only when `due_date` is set
3. Cannot have multiple repeat modes simultaneously (single enum value)

**Business rules**:
1. Weekday mode (3) skips Saturday and Sunday
2. Weekend mode (4) skips Monday through Friday
3. Time-of-day is preserved across skips (e.g., 10:00 AM stays 10:00 AM)
4. Reminders, start_date, and end_date are adjusted relative to due_date change
