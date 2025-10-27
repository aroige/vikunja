# Manual Testing Guide: Weekday and Weekend Repeat Patterns

**Feature**: 009-weekday-weekend-repeats  
**Status**: Implementation complete - ready for manual validation  
**Date**: October 26, 2025

## Prerequisites

Before starting manual tests, ensure:

- ✅ Backend is running: `./vikunja` or `mage dev`
- ✅ Frontend is running: `cd frontend && pnpm dev`
- ✅ MCP server is running (for T092, T074-T075): `cd mcp-server && pnpm start`
- ✅ Browser DevTools open (Console tab visible for regression tests)
- ✅ You have a test user account and authentication token

---

## Test Suite Overview

| Test ID | Category | Priority | Estimated Time |
|---------|----------|----------|----------------|
| T028-T030 | US1 Integration | High | 10 min |
| T044-T046 | US2 Integration | High | 10 min |
| T074-T075 | US4 MCP Server | Medium | 5 min |
| T090-T095 | Core Validation | High | 15 min |
| T096 | Performance | Medium | 5 min |
| T097 | Accessibility | Medium | 5 min |
| T098 | Code Review | High | 10 min |
| T098a-c | Regression Tests | High | 10 min |

**Total estimated time**: 70 minutes (1 hour 10 minutes)

---

## User Story 1: Weekday Repeat Pattern (T028-T030)

### T028: Create task with weekdays preset, verify repeat_mode=3 in API payload

**Steps:**
1. Open Vikunja frontend (http://localhost:5173 or your dev URL)
2. Navigate to a project
3. Click "Add Task" or create a new task
4. Click "Set Repeat" in the task detail view
5. Click the "Weekdays" preset button
6. Set title: "Daily standup"
7. Set due date: Friday, October 24, 2025, 10:00 AM
8. Save the task

**Verification:**
- Open Browser DevTools → Network tab
- Filter for the task creation/update request (POST or PUT to `/api/v1/tasks/...`)
- Inspect the request payload
- ✅ **Verify**: `repeat_mode: 3`
- ✅ **Verify**: `repeat_after: 86400` (or similar - 1 day in seconds)

**Expected Result**: Task created with repeat_mode=3

---

### T029: Complete Friday weekday task, verify next occurrence is Monday

**Steps:**
1. Using the task created in T028 (or create a new weekday task with due date Friday)
2. Mark the task as done (click checkbox)
3. Observe the task reappears as undone

**Verification:**
- ✅ **Verify**: Task is no longer marked as done
- ✅ **Verify**: Due date is now **Monday, October 27, 2025, 10:00 AM** (skipped weekend)
- ✅ **Verify**: Time remains unchanged (10:00 AM)

**Expected Result**: Task skips Saturday and Sunday, next occurrence is Monday

---

### T030: View calendar, verify no Saturday/Sunday instances for weekday task

**Steps:**
1. Navigate to project's Gantt or Calendar view (if available)
2. Or open task detail and inspect repeat pattern description
3. Verify that the weekday task only shows occurrences on Monday-Friday

**Verification:**
- ✅ **Verify**: No task instances appear on Saturday or Sunday in calendar view
- ✅ **Verify**: Pattern description mentions "Weekdays" or "Monday-Friday"

**Expected Result**: Weekday tasks never create weekend occurrences

---

## User Story 2: Weekend Repeat Pattern (T044-T046)

### T044: Create task with weekends preset, verify repeat_mode=4 in API payload

**Steps:**
1. Open task creation modal
2. Click "Set Repeat"
3. Click the "Weekends" preset button
4. Set title: "Clean house"
5. Set due date: Sunday, October 26, 2025, 2:00 PM
6. Save the task

**Verification:**
- Open Browser DevTools → Network tab
- Inspect the request payload
- ✅ **Verify**: `repeat_mode: 4`
- ✅ **Verify**: `repeat_after: 86400` (1 day in seconds)

**Expected Result**: Task created with repeat_mode=4

---

### T045: Complete Sunday weekend task, verify next occurrence is Saturday

**Steps:**
1. Using the weekend task created in T044
2. Mark the task as done
3. Observe the task reappears as undone

**Verification:**
- ✅ **Verify**: Task is no longer marked as done
- ✅ **Verify**: Due date is now **Saturday, November 1, 2025, 2:00 PM** (skipped weekdays)
- ✅ **Verify**: Time remains unchanged (2:00 PM)

**Expected Result**: Task skips Monday-Friday, next occurrence is Saturday

---

### T046: View calendar, verify no Monday-Friday instances for weekend task

**Steps:**
1. Navigate to calendar/Gantt view
2. Verify weekend task only appears on Saturdays and Sundays

**Verification:**
- ✅ **Verify**: No task instances on Monday-Friday
- ✅ **Verify**: Pattern description mentions "Weekends" or "Saturday-Sunday"

**Expected Result**: Weekend tasks never create weekday occurrences

---

## User Story 4: MCP Server Support (T074-T075)

### T074: Use MCP client to create task with repeat_mode=3

**Prerequisites:**
- MCP server running on http://localhost:3000 (or your configured port)
- Authentication token ready

**Steps:**
```bash
curl -X POST http://localhost:3000/api/v1/projects/1/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "MCP Weekday Task",
    "due_date": "2025-10-27T10:00:00Z",
    "repeat_after": 86400,
    "repeat_mode": 3
  }'
```

**Verification:**
- ✅ **Verify**: Response status 201 Created
- ✅ **Verify**: Response body contains `repeat_mode: 3`
- ✅ **Verify**: Task appears in frontend with weekday repeat pattern

**Expected Result**: MCP server accepts repeat_mode=3 and creates weekday task

---

### T075: Use MCP client to create task with repeat_mode=4

**Steps:**
```bash
curl -X POST http://localhost:3000/api/v1/projects/1/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "MCP Weekend Task",
    "due_date": "2025-10-26T14:00:00Z",
    "repeat_after": 86400,
    "repeat_mode": 4
  }'
```

**Verification:**
- ✅ **Verify**: Response status 201 Created
- ✅ **Verify**: Response body contains `repeat_mode: 4`
- ✅ **Verify**: Task appears in frontend with weekend repeat pattern

**Expected Result**: MCP server accepts repeat_mode=4 and creates weekend task

---

## Core Validation Tests (T090-T095)

### T090: Follow quickstart.md scenario 1

**Reference**: See [quickstart.md](./quickstart.md) "Scenario 1: Weekday Task Creation"

**Verification:**
- ✅ Complete all steps in quickstart.md scenario 1
- ✅ Verify Friday → Monday behavior works correctly

---

### T091: Follow quickstart.md scenario 2

**Reference**: See [quickstart.md](./quickstart.md) "Scenario 2: Weekend Task Creation"

**Verification:**
- ✅ Complete all steps in quickstart.md scenario 2
- ✅ Verify Sunday → Saturday behavior works correctly

---

### T092: Follow quickstart.md scenario 3

**Reference**: See [quickstart.md](./quickstart.md) "Scenario 3: MCP Server"

**Verification:**
- ✅ Complete all steps in quickstart.md scenario 3
- ✅ Verify MCP server API calls work correctly

---

### T093: Test backward compatibility

**Steps:**
1. Create task with repeat_mode=0 (default): `repeat_after: 86400, repeat_mode: 0`
2. Create task with repeat_mode=1 (monthly): `repeat_after: 2592000, repeat_mode: 1`
3. Create task with repeat_mode=2 (from current date): `repeat_after: 86400, repeat_mode: 2`
4. Mark each as done and verify repeat behavior still works

**Verification:**
- ✅ **Verify**: Mode 0 tasks repeat after X seconds from due date
- ✅ **Verify**: Mode 1 tasks repeat monthly
- ✅ **Verify**: Mode 2 tasks repeat from completion date
- ✅ **Verify**: No errors in console
- ✅ **Verify**: Old tasks continue working without issues

**Expected Result**: Existing repeat modes (0, 1, 2) still function correctly

---

### T094: Test validation

**Steps:**
1. Using curl or browser DevTools, attempt to create task with repeat_mode=5 (invalid):
```bash
curl -X POST http://localhost:3000/api/v1/projects/1/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid repeat mode task",
    "repeat_after": 86400,
    "repeat_mode": 5
  }'
```

**Verification:**
- ✅ **Verify**: Response status 400 Bad Request (or similar error)
- ✅ **Verify**: Error message mentions "repeat_mode" validation failure
- ✅ **Verify**: Task is NOT created

**Expected Result**: Backend rejects invalid repeat_mode values

---

### T095: Test UI edge case - rapid preset switching

**Steps:**
1. Open task detail with repeat settings
2. Rapidly click: Weekdays → Weekends → Weekdays → Weekends → Weekdays
3. Stop on Weekdays
4. Save the task
5. Reload the page and check which preset is applied

**Verification:**
- ✅ **Verify**: Last clicked preset (Weekdays) is saved
- ✅ **Verify**: `repeat_mode: 3` in API payload
- ✅ **Verify**: No console errors during rapid clicking

**Expected Result**: Last clicked preset wins, no race conditions

---

## Performance Test (T096)

### T096: Performance check - 10 weekday tasks

**Steps:**
1. Create 10 weekday tasks with due dates on different days
2. Mark all 10 as done simultaneously (or in quick succession)
3. Monitor API response times in DevTools Network tab

**Verification:**
- ✅ **Verify**: Each task completion API call responds in < 200ms (p95)
- ✅ **Verify**: Frontend remains responsive during bulk operations
- ✅ **Verify**: No significant performance degradation vs. standard repeat modes

**Expected Result**: Weekday/weekend calculations add negligible overhead (< 1ms)

---

## Accessibility Audit (T097)

### T097: Run axe DevTools

**Prerequisites:**
- Install axe DevTools browser extension (Chrome/Firefox)

**Steps:**
1. Navigate to task creation page with repeat settings visible
2. Ensure "Weekdays" and "Weekends" buttons are visible
3. Open axe DevTools extension
4. Click "Scan All of My Page"
5. Review results

**Verification:**
- ✅ **Verify**: No critical or serious accessibility violations on preset buttons
- ✅ **Verify**: Buttons have proper aria-labels ("Repeat on weekdays only", "Repeat on weekends only")
- ✅ **Verify**: Keyboard navigation works (Tab to buttons, Enter/Space to activate)
- ✅ **Verify**: WCAG AA contrast ratio passed for button text

**Expected Result**: Zero accessibility violations, full keyboard support

---

## Code Review Checklist (T098)

### T098: Verify all quickstart.md checklist items

**Reference**: See [quickstart.md](./quickstart.md) "Code Review Checklist" section

**Items to verify:**
- ✅ Backend validation updated (`range(0|4)`)
- ✅ Both `setTaskDatesWeekdayRepeat()` and `setTaskDatesWeekendRepeat()` implemented
- ✅ `UpdateDone()` switch has cases for modes 3 & 4
- ✅ Frontend `TASK_REPEAT_MODES` includes WEEKDAYS (3) and WEEKENDS (4)
- ✅ Preset buttons added to `RepeatAfter.vue`
- ✅ Translation keys added (`en.json`)
- ✅ MCP server validation updated (`max(4)`)
- ✅ MCP server docs updated with examples
- ✅ All tests passing
- ✅ Linters passing
- ✅ Manual testing completed

---

## Regression Tests (T098a-c)

### T098a: Verify preset button highlighting

**Issue Fixed**: Weekdays/Weekends buttons show blue highlight on click, but Every Day/Week/30 Days buttons don't. After reload, incorrect button gets highlighted.

**Steps:**

**Test 1: Every Day button**
1. Open task detail
2. Click "Every Day" preset button
3. Save task
4. Reload page
5. ✅ **Verify**: Weekdays button is NOT highlighted
6. ✅ **Verify**: Weekends button is NOT highlighted
7. ✅ **Verify**: Only "Every Day" shows active state (if applicable)

**Test 2: Every Week button**
1. Create/open another task
2. Click "Every Week" preset button
3. Save and reload
4. ✅ **Verify**: Weekdays button is NOT highlighted
5. ✅ **Verify**: Weekends button is NOT highlighted

**Test 3: Weekdays button**
1. Create/open another task
2. Click "Weekdays" preset button
3. Save and reload
4. ✅ **Verify**: ONLY Weekdays button is highlighted
5. ✅ **Verify**: Weekends button is NOT highlighted

**Test 4: Weekends button**
1. Create/open another task
2. Click "Weekends" preset button
3. Save and reload
4. ✅ **Verify**: ONLY Weekends button is highlighted
5. ✅ **Verify**: Weekdays button is NOT highlighted

**Expected Result**: Button highlighting correctly reflects the actual repeat_mode value

---

### T098b: Verify no "deferTaskUpdate" console errors

**Issue Fixed**: "Property 'deferTaskUpdate' was accessed during render but is not defined on instance" error in SingleTaskInProject.vue:99

**Steps:**
1. Open task list view
2. Open Browser DevTools → Console tab
3. Click on any task's due date to open calendar popup
4. Observe console output

**Verification:**
- ✅ **Verify**: NO "deferTaskUpdate" property errors appear in console
- ✅ **Verify**: NO "Invalid value type passed to callWithAsyncErrorHandling" errors
- ✅ **Verify**: Calendar popup opens correctly
- ✅ **Verify**: Calendar functions normally (can select dates)

**Expected Result**: Zero console errors when opening calendar from task list

---

### T098c: Verify no TipTap duplicate extension warnings

**Issue Fixed**: "[tiptap warn]: Duplicate extension names found: ['link', 'underline']" in TaskDetailView.vue:756

**Steps:**
1. Open task list view
2. Open Browser DevTools → Console tab (clear existing logs)
3. Click any task to open task detail view
4. Observe console output during editor initialization
5. Edit task description (try bold, italic, link, underline formatting)

**Verification:**
- ✅ **Verify**: NO "[tiptap warn]: Duplicate extension names" warnings in console
- ✅ **Verify**: Rich text editor initializes correctly
- ✅ **Verify**: Bold formatting works
- ✅ **Verify**: Italic formatting works
- ✅ **Verify**: Link formatting works
- ✅ **Verify**: Underline formatting works
- ✅ **Verify**: No conflicts between extensions

**Expected Result**: Zero TipTap warnings, all formatting features work correctly

---

## Summary Report Template

After completing all tests, fill out this summary:

```markdown
# Manual Testing Summary: Weekday and Weekend Repeat Patterns

**Date**: [Your date here]  
**Tester**: [Your name]  
**Environment**: [Development/Staging]

## Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| T028 | ✅ Pass / ❌ Fail | |
| T029 | ✅ Pass / ❌ Fail | |
| T030 | ✅ Pass / ❌ Fail | |
| T044 | ✅ Pass / ❌ Fail | |
| T045 | ✅ Pass / ❌ Fail | |
| T046 | ✅ Pass / ❌ Fail | |
| T074 | ✅ Pass / ❌ Fail | |
| T075 | ✅ Pass / ❌ Fail | |
| T090 | ✅ Pass / ❌ Fail | |
| T091 | ✅ Pass / ❌ Fail | |
| T092 | ✅ Pass / ❌ Fail | |
| T093 | ✅ Pass / ❌ Fail | |
| T094 | ✅ Pass / ❌ Fail | |
| T095 | ✅ Pass / ❌ Fail | |
| T096 | ✅ Pass / ❌ Fail | Performance: [insert p95 response time] |
| T097 | ✅ Pass / ❌ Fail | Accessibility: [insert violations count] |
| T098 | ✅ Pass / ❌ Fail | |
| T098a | ✅ Pass / ❌ Fail | Regression: Button highlighting |
| T098b | ✅ Pass / ❌ Fail | Regression: deferTaskUpdate error |
| T098c | ✅ Pass / ❌ Fail | Regression: TipTap warnings |

## Overall Status

- **Total Tests**: 19
- **Passed**: [X]
- **Failed**: [X]
- **Blocked**: [X]

## Issues Found

[List any issues discovered during testing]

## Recommendations

[Any suggestions for improvements or follow-up work]

## Sign-off

Feature is ready for:
- [ ] Merge to main branch
- [ ] Deployment to staging
- [ ] Production release

**Tester Signature**: ___________________________  
**Date**: ___________________________
```

---

## Notes

- All manual tests assume you have appropriate permissions (create/edit tasks, access projects)
- Replace `YOUR_TOKEN_HERE` with actual authentication token for MCP tests
- Replace project ID (`/projects/1/`) with actual project ID from your test environment
- Some tests may require adjusting dates to current week for realistic Friday→Monday scenarios
- If using Docker, ensure all services are accessible from your testing environment

**Good luck with testing!** 🚀
