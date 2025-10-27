# Quickstart Guide: Weekday and Weekend Repeat Patterns

## Overview

This guide helps developers implement and test weekday/weekend repeat patterns in Vikunja. Follow these steps to get started quickly.

---

## Prerequisites

- ✅ Development environment set up (see [AGENTS.md](../../../AGENTS.md))
- ✅ Backend running locally (`mage build` + `./vikunja`)
- ✅ Frontend running locally (`cd frontend && pnpm dev`)
- ✅ Tests passing (`mage test:feature`)

---

## Quick Implementation Checklist

### Phase 1: Backend (Go)

**File**: `pkg/models/tasks.go`

1. ✅ Add new repeat mode constants:
   ```go
   const (
       TaskRepeatModeDefault TaskRepeatMode = iota
       TaskRepeatModeMonth
       TaskRepeatModeFromCurrentDate
       TaskRepeatModeWeekdays   // 3
       TaskRepeatModeWeekends   // 4
   )
   ```

2. ✅ Update validation tag:
   ```go
   RepeatMode TaskRepeatMode `xorm:"not null default 0" json:"repeat_mode" valid:"range(0|4)"`
   ```

3. ✅ Add weekday calculation function:
   ```go
   func setTaskDatesWeekdayRepeat(oldTask, newTask *Task) {
       // Calculate next date + skip to Monday if weekend
   }
   ```

4. ✅ Add weekend calculation function:
   ```go
   func setTaskDatesWeekendRepeat(oldTask, newTask *Task) {
       // Calculate next date + skip to Saturday if weekday
   }
   ```

5. ✅ Update `UpdateDone()` switch statement:
   ```go
   case TaskRepeatModeWeekdays:
       setTaskDatesWeekdayRepeat(oldTask, newTask)
   case TaskRepeatModeWeekends:
       setTaskDatesWeekendRepeat(oldTask, newTask)
   ```

**File**: `pkg/services/task.go`

6. ✅ Verify service layer calls `models.UpdateDone()` (already does)

---

### Phase 2: Frontend (Vue/TypeScript)

**File**: `frontend/src/types/IRepeatMode.ts`

1. ✅ Add new mode constants:
   ```typescript
   export const TASK_REPEAT_MODES = {
     'REPEAT_MODE_DEFAULT': 0,
     'REPEAT_MODE_MONTH': 1,
     'REPEAT_MODE_FROM_CURRENT_DATE': 2,
     'REPEAT_MODE_WEEKDAYS': 3,
     'REPEAT_MODE_WEEKENDS': 4,
   } as const
   ```

**File**: `frontend/src/components/tasks/partials/RepeatAfter.vue`

2. ✅ Add preset buttons in template:
   ```vue
   <XButton
     variant="secondary"
     class="is-small"
     @click="() => setRepeatAfter(1, 'days', 3)"
   >
     {{ $t('task.repeat.weekdays') }}
   </XButton>
   <XButton
     variant="secondary"
     class="is-small"
     @click="() => setRepeatAfter(1, 'days', 4)"
   >
     {{ $t('task.repeat.weekends') }}
   </XButton>
   ```

3. ✅ Update `setRepeatAfter` method to accept repeat_mode parameter

**File**: `frontend/src/i18n/lang/en.json`

4. ✅ Add translation keys:
   ```json
   {
     "task": {
       "repeat": {
         "weekdays": "Weekdays",
         "weekends": "Weekends"
       }
     }
   }
   ```

---

### Phase 3: MCP Server (TypeScript)

**File**: `mcp-server/src/vikunja/types.ts`

1. ✅ Add to RepeatMode enum:
   ```typescript
   export enum RepeatMode {
     DEFAULT = 0,
     MONTHLY = 1,
     FROM_CURRENT = 2,
     WEEKDAYS = 3,
     WEEKENDS = 4,
   }
   ```

**File**: `mcp-server/src/tools/tasks.ts`

2. ✅ Update validation:
   ```typescript
   repeat_mode: z.number().int().min(0).max(4).optional()
   ```

3. ✅ Update description to include modes 3 & 4

**File**: `mcp-server/docs/TOOLS.md`

4. ✅ Add weekday/weekend examples

---

## Testing Checklist

### Backend Tests

**File**: `pkg/services/task_test.go`

```go
func TestTaskService_WeekdayRepeat_SkipsWeekendToMonday(t *testing.T) {
    // Test: Complete Friday task → next occurrence Monday
    engine := testutil.Init(t)
    ts := NewTaskService(engine)
    
    friday := time.Date(2025, 10, 24, 10, 0, 0, 0, time.UTC)
    task := &models.Task{
        Title: "Daily standup",
        RepeatAfter: 86400,  // 1 day
        RepeatMode: models.TaskRepeatModeWeekdays,
        DueDate: friday,
        Done: false,
    }
    
    // Mark as done
    task.Done = true
    models.UpdateDone(&models.Task{RepeatAfter: task.RepeatAfter, RepeatMode: task.RepeatMode, DueDate: friday}, task)
    
    // Assert next occurrence is Monday
    monday := time.Date(2025, 10, 27, 10, 0, 0, 0, time.UTC)
    assert.Equal(t, monday, task.DueDate)
    assert.False(t, task.Done)
}

func TestTaskService_WeekendRepeat_SkipsWeekdaysToSaturday(t *testing.T) {
    // Test: Complete Sunday task → next occurrence Saturday
    // Similar structure to weekday test
}
```

**Run**: `mage test:feature`

---

### Frontend Tests

**File**: `frontend/tests/unit/components/tasks/RepeatAfter.test.ts`

```typescript
import { mount } from '@vue/test-utils'
import RepeatAfter from '@/components/tasks/partials/RepeatAfter.vue'
import { TASK_REPEAT_MODES } from '@/types/IRepeatMode'

describe('RepeatAfter.vue - Weekday/Weekend Presets', () => {
  it('sets weekday mode when clicking Weekdays button', async () => {
    const wrapper = mount(RepeatAfter, {
      props: {
        modelValue: { type: 'days', amount: 1 },
        disabled: false
      }
    })
    
    await wrapper.find('[data-testid="weekdays-button"]').trigger('click')
    
    expect(wrapper.emitted('update:modelValue')[0][0]).toEqual({
      type: 'days',
      amount: 1
    })
    expect(wrapper.emitted('update:repeatMode')[0][0]).toBe(TASK_REPEAT_MODES.REPEAT_MODE_WEEKDAYS)
  })
})
```

**Run**: `cd frontend && pnpm test:unit`

---

### MCP Server Tests

**File**: `mcp-server/tests/tools/tasks.test.ts`

```typescript
describe('CreateTaskSchema - weekday/weekend modes', () => {
  it('should accept repeat_mode=3 (weekdays)', () => {
    const input = {
      project_id: 1,
      title: 'Daily standup',
      repeat_mode: 3,
    };
    
    const result = CreateTaskSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
  
  it('should accept repeat_mode=4 (weekends)', () => {
    const input = {
      project_id: 1,
      title: 'Weekend chores',
      repeat_mode: 4,
    };
    
    const result = CreateTaskSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
  
  it('should reject repeat_mode=5 (invalid)', () => {
    const input = {
      project_id: 1,
      title: 'Task',
      repeat_mode: 5,
    };
    
    const result = CreateTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
```

**Run**: `cd mcp-server && pnpm test`

---

## Manual Testing Scenarios

### Scenario 1: Weekday Task Creation

1. **Frontend**: Open task creation modal
2. Click "Weekdays" preset button
3. Set title "Daily standup", due date Friday 10/24 10:00 AM
4. Save task
5. **Verify**: Task list shows task with repeat icon
6. Mark task as done
7. **Verify**: Task reappears as undone, due date is Monday 10/27 10:00 AM

---

### Scenario 2: Weekend Task Creation

1. **Frontend**: Open task creation modal
2. Click "Weekends" preset button
3. Set title "Clean house", due date Sunday 10/26 2:00 PM
4. Save task
5. Mark task as done
6. **Verify**: Task reappears, due date is Saturday 11/01 2:00 PM

---

### Scenario 3: MCP Server (via API)

```bash
# Create weekday task
curl -X POST http://localhost:3000/api/v1/projects/1/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Daily standup",
    "due_date": "2025-10-27T10:00:00Z",
    "repeat_after": 86400,
    "repeat_mode": 3
  }'

# Mark as done
curl -X PUT http://localhost:3000/api/v1/tasks/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"done": true}'

# Get task - verify next due date is Monday
curl http://localhost:3000/api/v1/tasks/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Common Issues & Solutions

### Issue 1: Validation Error "repeat_mode out of range"

**Cause**: Backend validation still uses old range (0-2)

**Solution**: Update validation tag in `pkg/models/tasks.go`:
```go
RepeatMode TaskRepeatMode `xorm:"not null default 0" json:"repeat_mode" valid:"range(0|4)"`
```

---

### Issue 2: Preset Buttons Not Appearing

**Cause**: Translation keys missing or component not updated

**Solution**: 
1. Add keys to `frontend/src/i18n/lang/en.json`
2. Verify `RepeatAfter.vue` template has button code
3. Clear browser cache

---

### Issue 3: Next Occurrence Not Skipping Weekend

**Cause**: `UpdateDone()` switch missing weekday case

**Solution**: Add case in `pkg/models/tasks.go`:
```go
switch oldTask.RepeatMode {
case TaskRepeatModeWeekdays:
    setTaskDatesWeekdayRepeat(oldTask, newTask)
// ... other cases
}
```

---

## Development Workflow

### 1. Implement Backend
```bash
# Edit pkg/models/tasks.go
vim pkg/models/tasks.go

# Run linter
mage lint:fix

# Run tests
mage test:feature

# Build
mage build
```

### 2. Implement Frontend
```bash
cd frontend

# Edit components
vim src/components/tasks/partials/RepeatAfter.vue
vim src/types/IRepeatMode.ts

# Run linter
pnpm lint:fix

# Run tests
pnpm test:unit

# Build
pnpm build:dev
```

### 3. Implement MCP Server
```bash
cd mcp-server

# Edit tools
vim src/tools/tasks.ts
vim src/vikunja/types.ts

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### 4. Integration Test
```bash
# Start backend
./vikunja

# Start frontend (separate terminal)
cd frontend && pnpm dev

# Start MCP server (if testing AI agent integration)
cd mcp-server && pnpm start
```

---

## Code Review Checklist

Before submitting PR, verify:

- [ ] ✅ Backend validation updated (`range(0|4)`)
- [ ] ✅ Both `setTaskDatesWeekdayRepeat()` and `setTaskDatesWeekendRepeat()` implemented
- [ ] ✅ `UpdateDone()` switch has cases for modes 3 & 4
- [ ] ✅ Frontend `TASK_REPEAT_MODES` includes WEEKDAYS (3) and WEEKENDS (4)
- [ ] ✅ Preset buttons added to `RepeatAfter.vue`
- [ ] ✅ Translation keys added (`en.json`)
- [ ] ✅ MCP server validation updated (`max(4)`)
- [ ] ✅ MCP server docs updated with examples
- [ ] ✅ All tests passing (`mage test:feature`, `pnpm test:unit`, `pnpm test` in mcp-server)
- [ ] ✅ Linters passing (`mage lint:fix`, `pnpm lint:fix`)
- [ ] ✅ Manual testing completed (both weekday and weekend scenarios)
- [ ] ✅ Conventional commit message (e.g., `feat: add weekday and weekend repeat patterns`)

---

## Performance Benchmarks

Expected performance (no degradation):

- **Date calculation**: < 1ms per task
- **API response time**: < 200ms (unchanged)
- **Frontend render**: < 50ms for preset buttons
- **Database query**: No new queries (same read/write pattern)

If performance differs, investigate optimization opportunities.

---

## Next Steps

After implementation:

1. Run full test suite: `mage test:feature && cd frontend && pnpm test:unit && cd ../mcp-server && pnpm test`
2. Manual testing with real tasks
3. Update documentation (if needed beyond auto-generated swagger)
4. Create PR with conventional commit message
5. Request review from maintainer

**Related Documentation**:
- [spec.md](./spec.md) - Feature specification
- [data-model.md](./data-model.md) - Data model details
- [contracts/api-spec.md](./contracts/api-spec.md) - API contracts
- [research.md](./research.md) - Design decisions
