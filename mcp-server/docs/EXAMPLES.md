# Workflow Examples

Practical examples for common Vikunja MCP Server workflows.

## Table of Contents
- [Quick Task Creation](#quick-task-creation)
- [Project Management](#project-management)
- [Team Collaboration](#team-collaboration)
- [Automation Workflows](#automation-workflows)
- [Bulk Operations](#bulk-operations)
- [Advanced Filtering](#advanced-filtering)

---

## Quick Task Creation

### Example 1: Simple Task

**Scenario**: Create a quick task for today.

**Claude Desktop Interaction:**
```
User: "Add a task 'Review quarterly report' to my Work project, due today"

Claude: I'll create that task for you.
```

**Tool Call:**
```json
{
  "tool": "create_task",
  "arguments": {
    "project_id": 1,
    "title": "Review quarterly report",
    "due_date": "2025-10-17T17:00:00Z",
    "priority": 3
  }
}
```

### Example 2: Task with Details

**Scenario**: Create a detailed task with assignee and labels.

**n8n Workflow:**
```json
{
  "nodes": [
    {
      "name": "Create Detailed Task",
      "type": "httpRequest",
      "parameters": {
        "url": "http://localhost:3457/tools/execute",
        "method": "POST",
        "body": {
          "tool": "create_task",
          "arguments": {
            "project_id": 2,
            "title": "Implement user authentication",
            "description": "Add JWT-based authentication to the API",
            "due_date": "2025-10-25T17:00:00Z",
            "priority": 5,
            "labels": [1, 3],
            "assignees": [5]
          }
        }
      }
    }
  ]
}
```

---

## Project Management

### Example 3: Create Project with Tasks

**Scenario**: Set up a new project with initial tasks.

**Python Script:**
```python
import asyncio
from vikunja_mcp import VikunjaMCPClient

async def setup_project():
    client = VikunjaMCPClient(
        api_url="http://localhost:3457",
        api_token="your-token"
    )
    
    # Create project
    project = await client.call_tool("create_project", {
        "title": "Mobile App Development",
        "description": "New mobile app for customers",
        "color": "1973ff"
    })
    
    project_id = project["id"]
    
    # Create initial tasks
    tasks = [
        {"title": "Design UI mockups", "priority": 4},
        {"title": "Set up development environment", "priority": 5},
        {"title": "Create API endpoints", "priority": 4},
        {"title": "Implement authentication", "priority": 5},
        {"title": "Write unit tests", "priority": 3}
    ]
    
    for task_data in tasks:
        await client.call_tool("create_task", {
            "project_id": project_id,
            **task_data
        })
    
    print(f"Created project '{project['title']}' with {len(tasks)} tasks")

asyncio.run(setup_project())
```

### Example 4: Archive Completed Projects

**Scenario**: Archive all completed projects.

**JavaScript:**
```javascript
async function archiveCompletedProjects(client) {
  // Search for projects
  const projects = await client.callTool('search_projects', {
    query: '',
    is_archived: false,
    per_page: 100
  });
  
  for (const project of projects.projects) {
    // Get project tasks
    const tasks = await client.callTool('get_project_tasks', {
      project_id: project.id,
      done: false
    });
    
    // If no incomplete tasks, archive project
    if (tasks.tasks.length === 0) {
      await client.callTool('archive_project', {
        project_id: project.id,
        is_archived: true
      });
      console.log(`Archived project: ${project.title}`);
    }
  }
}
```

---

## Team Collaboration

### Example 5: Assign Tasks to Team

**Scenario**: Distribute tasks among team members.

**Claude Desktop:**
```
User: "Distribute the unassigned tasks in 'Website Redesign' project among the design team"

Claude: I'll assign those tasks to the design team members.
```

**Behind the scenes:**
```javascript
async function distributeTasksToTeam(projectId, teamUserIds) {
  // Get unassigned tasks
  const result = await client.callTool('get_project_tasks', {
    project_id: projectId,
    done: false
  });
  
  const unassignedTasks = result.tasks.filter(
    task => task.assignees.length === 0
  );
  
  // Round-robin assignment
  for (let i = 0; i < unassignedTasks.length; i++) {
    const userId = teamUserIds[i % teamUserIds.length];
    await client.callTool('assign_task', {
      task_id: unassignedTasks[i].id,
      user_id: userId
    });
  }
  
  console.log(`Assigned ${unassignedTasks.length} tasks`);
}

// Usage
await distributeTasksToTeam(42, [5, 7, 9]); // Designer user IDs
```

### Example 6: Daily Standup Report

**Scenario**: Generate daily standup report for a user.

**Python:**
```python
async def generate_standup_report(user_id):
    client = VikunjaMCPClient(...)
    
    # Get user's tasks
    my_tasks = await client.call_tool("get_my_tasks", {
        "done": False,
        "per_page": 100
    })
    
    # Categorize tasks
    overdue = []
    today = []
    upcoming = []
    
    from datetime import datetime, timedelta
    now = datetime.now()
    
    for task in my_tasks["tasks"]:
        if task.get("due_date"):
            due = datetime.fromisoformat(task["due_date"].replace('Z', '+00:00'))
            if due < now:
                overdue.append(task)
            elif due.date() == now.date():
                today.append(task)
            elif due < now + timedelta(days=7):
                upcoming.append(task)
    
    # Generate report
    report = f"""
    📊 Daily Standup Report
    
    🚨 Overdue ({len(overdue)}):
    {format_tasks(overdue)}
    
    📅 Today ({len(today)}):
    {format_tasks(today)}
    
    📆 This Week ({len(upcoming)}):
    {format_tasks(upcoming)}
    """
    
    return report

def format_tasks(tasks):
    if not tasks:
        return "  None"
    return "\n".join([f"  • {t['title']}" for t in tasks])
```

---

## Automation Workflows

### Example 7: Email → Vikunja Task

**Scenario**: Convert emails to tasks using n8n.

**n8n Workflow:**
```json
{
  "nodes": [
    {
      "name": "Email Trigger",
      "type": "n8n-nodes-base.emailReadImap",
      "parameters": {
        "mailbox": "INBOX",
        "options": {
          "customEmailConfig": "imap.gmail.com:993:true"
        }
      }
    },
    {
      "name": "Extract Task Info",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "code": `
          const subject = $input.item.json.subject;
          const body = $input.item.json.text;
          const from = $input.item.json.from.text;
          
          // Extract priority from subject
          let priority = 3;
          if (subject.includes('[URGENT]')) priority = 5;
          if (subject.includes('[HIGH]')) priority = 4;
          if (subject.includes('[LOW]')) priority = 2;
          
          return {
            title: subject.replace(/\\[(URGENT|HIGH|LOW)\\]/g, '').trim(),
            description: \`From: \${from}\\n\\n\${body}\`,
            priority: priority,
            project_id: 1  // Email inbox project
          };
        `
      }
    },
    {
      "name": "Create Vikunja Task",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3457/tools/execute",
        "method": "POST",
        "body": {
          "tool": "create_task",
          "arguments": "={{ $json }}"
        }
      }
    }
  ]
}
```

### Example 8: Recurring Task Checker

**Scenario**: Check for recurring tasks and create next occurrence.

**Cron Job Script:**
```bash
#!/bin/bash
# check_recurring.sh

# Run daily to check for recurring tasks

curl -X POST http://localhost:3457/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search_tasks",
    "arguments": {
      "query": "recurring",
      "done": true,
      "per_page": 100
    },
    "auth": {
      "token": "'$VIKUNJA_TOKEN'"
    }
  }' | jq -r '.result.tasks[] | select(.repeat_after > 0) | .id' | while read task_id; do
  
  # Get task details
  task=$(curl -s "http://localhost:3456/api/v1/tasks/$task_id" \
    -H "Authorization: Bearer $VIKUNJA_TOKEN")
  
  # Create next occurrence
  curl -X POST http://localhost:3457/tools/execute \
    -H "Content-Type: application/json" \
    -d '{
      "tool": "create_task",
      "arguments": {
        "project_id": '$(echo $task | jq .project_id)',
        "title": '$(echo $task | jq .title)',
        "description": '$(echo $task | jq .description)',
        "priority": '$(echo $task | jq .priority)'
      },
      "auth": {
        "token": "'$VIKUNJA_TOKEN'"
      }
    }'
done
```

---

## Bulk Operations

### Example 9: Priority Sprint Planning

**Scenario**: Set all high-priority tasks to this week.

**Claude Desktop:**
```
User: "Move all urgent tasks to this week's sprint"

Claude: I'll update those tasks for you.
```

**Implementation:**
```javascript
async function moveToCurrentSprint(client) {
  // Find urgent tasks
  const result = await client.callTool('search_tasks', {
    query: '',
    priority: 5,
    done: false,
    per_page: 100
  });
  
  const taskIds = result.tasks.map(t => t.id);
  
  if (taskIds.length === 0) {
    console.log('No urgent tasks found');
    return;
  }
  
  // Get Friday of this week
  const friday = getNextFriday();
  
  // Bulk update
  await client.callTool('bulk_update_tasks', {
    task_ids: taskIds,
    updates: {
      due_date: friday.toISOString(),
      labels: [getSprintLabelId()] // Add "Current Sprint" label
    }
  });
  
  console.log(`Moved ${taskIds.length} urgent tasks to current sprint`);
}

function getNextFriday() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(17, 0, 0, 0);
  return friday;
}
```

### Example 10: Batch Label Assignment

**Scenario**: Add "Q4 2025" label to all tasks in specific projects.

**Python:**
```python
async def add_quarterly_label(project_ids, label_id):
    client = VikunjaMCPClient(...)
    
    all_task_ids = []
    
    # Collect all task IDs from projects
    for project_id in project_ids:
        result = await client.call_tool("get_project_tasks", {
            "project_id": project_id,
            "done": False,
            "per_page": 100
        })
        
        all_task_ids.extend([t["id"] for t in result["tasks"]])
    
    # Process in batches of 100 (API limit)
    batch_size = 100
    for i in range(0, len(all_task_ids), batch_size):
        batch = all_task_ids[i:i+batch_size]
        
        result = await client.call_tool("bulk_add_labels", {
            "task_ids": batch,
            "label_id": label_id
        })
        
        print(f"Batch {i//batch_size + 1}: {result['success_count']} tasks labeled")

# Usage
await add_quarterly_label([1, 2, 3, 5], 10)  # Project IDs and Q4 label ID
```

---

## Advanced Filtering

### Example 11: Complex Search

**Scenario**: Find all high-priority, unfinished design tasks assigned to specific users.

**API Call:**
```json
{
  "tool": "search_tasks",
  "arguments": {
    "query": "design OR mockup OR prototype",
    "done": false,
    "priority": 4,
    "labels": [1],  // Design label
    "assignees": [5, 7],  // Designer user IDs
    "per_page": 50
  }
}
```

**Process Results:**
```javascript
async function findCriticalDesignTasks(client) {
  const result = await client.callTool('search_tasks', {
    query: 'design OR mockup OR prototype',
    done: false,
    priority: 4,
    labels: [1],
    assignees: [5, 7],
    per_page: 50
  });
  
  // Further filter by due date
  const now = new Date();
  const criticalTasks = result.tasks.filter(task => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
    return daysUntilDue <= 3 && daysUntilDue >= 0;
  });
  
  return criticalTasks;
}
```

### Example 12: Workload Analysis

**Scenario**: Analyze team member workload.

**Python:**
```python
from collections import defaultdict
from datetime import datetime, timedelta

async def analyze_workload(team_user_ids):
    client = VikunjaMCPClient(...)
    
    workload = defaultdict(lambda: {"total": 0, "urgent": 0, "overdue": 0})
    now = datetime.now()
    
    for user_id in team_user_ids:
        # Get user's tasks (requires custom implementation or search)
        result = await client.call_tool("search_tasks", {
            "query": "",
            "done": False,
            "assignees": [user_id],
            "per_page": 100
        })
        
        for task in result["tasks"]:
            workload[user_id]["total"] += 1
            
            if task.get("priority", 0) >= 4:
                workload[user_id]["urgent"] += 1
            
            if task.get("due_date"):
                due = datetime.fromisoformat(task["due_date"].replace('Z', '+00:00'))
                if due < now:
                    workload[user_id]["overdue"] += 1
    
    # Print report
    print("📊 Team Workload Analysis\\n")
    for user_id, stats in workload.items():
        print(f"User {user_id}:")
        print(f"  Total tasks: {stats['total']}")
        print(f"  Urgent: {stats['urgent']}")
        print(f"  Overdue: {stats['overdue']}")
        print()
    
    return workload
```

---

## Integration Patterns

### Pattern 1: Error Handling with Retry

```javascript
async function robustToolCall(client, toolName, args, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.callTool(toolName, args);
    } catch (error) {
      // Handle rate limiting
      if (error.type === 'RateLimitError') {
        const waitTime = error.reset_at - Date.now();
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      
      // Handle transient errors
      if (error.code === -32603 && attempt < maxRetries - 1) {
        const backoff = Math.pow(2, attempt) * 1000;
        console.log(`Transient error. Retrying in ${backoff}ms...`);
        await sleep(backoff);
        continue;
      }
      
      // Re-throw other errors
      throw error;
    }
  }
}
```

### Pattern 2: Batch Processing with Progress

```python
async def process_tasks_in_batches(task_ids, operation, batch_size=100):
    """Process tasks in batches with progress tracking"""
    total = len(task_ids)
    processed = 0
    
    for i in range(0, total, batch_size):
        batch = task_ids[i:i+batch_size]
        
        try:
            result = await operation(batch)
            processed += result.get('success_count', len(batch))
            
            # Progress
            percent = (processed / total) * 100
            print(f"Progress: {processed}/{total} ({percent:.1f}%)")
            
        except Exception as e:
            print(f"Batch {i//batch_size + 1} failed: {e}")
            continue
    
    return processed
```

### Pattern 3: Caching for Performance

```javascript
class CachedMCPClient {
  constructor(client, ttl = 60000) {
    this.client = client;
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  async callTool(name, args) {
    // Only cache read operations
    if (!['search_tasks', 'search_projects', 'get_my_tasks'].includes(name)) {
      return this.client.callTool(name, args);
    }
    
    const cacheKey = `${name}:${JSON.stringify(args)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log(`Cache hit: ${cacheKey}`);
      return cached.data;
    }
    
    const result = await this.client.callTool(name, args);
    
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  clearCache() {
    this.cache.clear();
  }
}
```

---

## Direct Entity Access (Read-Only Tools)

### Example 12: Get Project Details

**Scenario**: Retrieve complete information about a specific project by ID.

**Claude Desktop Interaction:**
```
User: "Show me details for project 11"

Claude: I'll fetch that project's information.
```

**Tool Call:**
```json
{
  "tool": "get_project",
  "arguments": {
    "id": 11
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project 'Personal Tasks' retrieved successfully",
  "project": {
    "id": 11,
    "title": "Personal Tasks",
    "description": "My personal todo list",
    "hex_color": "#3498db",
    "parent_project_id": 0,
    "is_archived": false,
    "created": "2025-01-15T10:30:00Z",
    "updated": "2025-10-26T14:00:00Z",
    "owner": {
      "id": 1,
      "username": "testuser"
    }
  }
}
```

### Example 13: List All Projects

**Scenario**: Discover all accessible projects for the user.

**n8n Workflow:**
```json
{
  "tool": "get_all_projects",
  "arguments": {
    "page": 1,
    "filter_archived": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Found 3 projects",
  "projects": [
    {
      "id": 1,
      "title": "Work Tasks",
      "is_archived": false
    },
    {
      "id": 11,
      "title": "Personal Tasks",
      "is_archived": false
    },
    {
      "id": 25,
      "title": "Home Projects",
      "is_archived": false
    }
  ],
  "total": 3,
  "page": 1,
  "hasMore": false
}
```

### Example 14: Get Task with Relationships

**Scenario**: Fetch complete task details including assignees, labels, and related tasks.

**Python Script:**
```python
async def get_task_details(task_id):
    client = VikunjaMCPClient(
        api_url="http://localhost:3457",
        api_token="your-token"
    )
    
    result = await client.call_tool("get_task", {
        "id": task_id
    })
    
    print(f"Task: {result['task']['title']}")
    print(f"Priority: {result['task']['priority']}")
    print(f"Assignees: {len(result['task']['assignees'])}")
    print(f"Labels: {len(result['task']['labels'])}")
    
    # Check related tasks
    related = result['task']['related_tasks']
    if related.get('blocking'):
        print(f"Blocking {len(related['blocking'])} tasks")
    
    return result
```

### Example 15: Get Current User Info

**Scenario**: Retrieve authenticated user profile for context-aware responses.

**Tool Call:**
```json
{
  "tool": "get_user_info",
  "arguments": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "User information retrieved for testuser",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "user@example.com",
    "name": "Test User",
    "created": "2025-01-01T00:00:00Z",
    "updated": "2025-10-27T00:00:00Z",
    "language": "en",
    "timezone": "America/New_York",
    "overdue_tasks_reminders_enabled": true
  }
}
```

**Note**: Sensitive fields (password, tokens, secrets) are automatically filtered for security.

### Example 16: Chained Read Operations

**Scenario**: Get user info, list their projects, and fetch details of a specific task.

**Claude Desktop Workflow:**
```
User: "Show me my profile, list my projects, and get task 42 details"

Claude: I'll fetch all that information for you.
```

**Tool Sequence:**
```json
[
  {
    "tool": "get_user_info",
    "arguments": {}
  },
  {
    "tool": "get_all_projects",
    "arguments": {
      "page": 1
    }
  },
  {
    "tool": "get_task",
    "arguments": {
      "id": 42
    }
  }
]
```

**Use Case**: AI agents can use this workflow to understand the user's context before suggesting task organization or project management strategies.

### Example 17: List Project Members for Task Assignment

**Scenario**: Find available assignees before assigning a task.

**Claude Desktop Workflow:**
```
User: "Who can I assign tasks to in the Engineering project?"

Claude: I'll check the members of that project for you.
```

**Tool Sequence:**
```json
[
  {
    "tool": "search_projects",
    "arguments": {
      "query": "Engineering"
    }
  },
  {
    "tool": "list_project_members",
    "arguments": {
      "project_id": 11
    }
  }
]
```

**Response:**
```json
{
  "success": true,
  "message": "Found 3 members for project 11",
  "members": [
    {
      "user": {
        "id": 1,
        "username": "alice",
        "email": "alice@example.com",
        "name": "Alice Smith"
      },
      "access_level": 2
    },
    {
      "user": {
        "id": 2,
        "username": "bob",
        "email": "bob@example.com",
        "name": "Bob Jones"
      },
      "access_level": 1
    },
    {
      "user": {
        "id": 3,
        "username": "charlie",
        "email": "charlie@example.com",
        "name": "Charlie Brown"
      },
      "access_level": 0
    }
  ]
}
```

**Use Case**: Before calling `assign_task`, agents can use this to discover valid user IDs and understand permission levels (0=read, 1=write, 2=admin).

---

## Example 18: Search Tasks by Label Title (filter_label_titles)

**User Request**: "Which tasks have the @Computer label?"

**Problem Solved**: Previously required two steps: list labels → get ID → search tasks. Now agents can search by label name directly.

**JSON-RPC Call:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_tasks",
    "arguments": {
      "query": "",
      "filter_label_titles": ["@Computer"]
    }
  },
  "id": 1
}
```

**TypeScript:**
```typescript
async function findTasksByLabel(client: VikunjaMCPClient, labelName: string) {
  // Direct search by label title
  const result = await client.callTool('search_tasks', {
    query: '',  // Empty query searches all tasks
    filter_label_titles: [labelName]
  });
  
  console.log(`Found ${result.tasks.length} tasks with label "${labelName}"`);
  return result.tasks;
}

// Find tasks with multiple labels (AND logic)
async function findTasksWithAllLabels(client: VikunjaMCPClient) {
  const result = await client.callTool('search_tasks', {
    query: '',
    filter_label_titles: ['@Computer', '@Urgent']  // Tasks must have BOTH labels
  });
  
  console.log(`Found ${result.tasks.length} tasks with both @Computer AND @Urgent`);
  return result.tasks;
}

// Combine with other filters
async function findUrgentComputerTasks(client: VikunjaMCPClient) {
  const result = await client.callTool('search_tasks', {
    query: 'bug',  // Text search in title/description
    filter_label_titles: ['@Computer'],
    filter_priority: 5,  // Only critical priority
    filter_done: false  // Only incomplete tasks
  });
  
  return result.tasks;
}
```

**Python:**
```python
async def find_tasks_by_label(client, label_name: str):
    """Direct search by label title."""
    result = await client.call_tool("search_tasks", {
        "query": "",  # Empty query searches all tasks
        "filter_label_titles": [label_name]
    })
    
    print(f"Found {len(result['tasks'])} tasks with label '{label_name}'")
    return result['tasks']

async def find_tasks_with_all_labels(client):
    """Find tasks with multiple labels (AND logic)."""
    result = await client.call_tool("search_tasks", {
        "query": "",
        "filter_label_titles": ["@Computer", "@Urgent"]  # Must have BOTH
    })
    
    print(f"Found {len(result['tasks'])} tasks with both labels")
    return result['tasks']

async def find_urgent_computer_tasks(client):
    """Combine label filter with other criteria."""
    result = await client.call_tool("search_tasks", {
        "query": "bug",  # Text search
        "filter_label_titles": ["@Computer"],
        "filter_priority": 5,  # Critical only
        "filter_done": False  # Incomplete only
    })
    
    return result['tasks']
```

**Notes:**
- **Case-insensitive**: `@computer`, `@Computer`, and `@COMPUTER` all match
- **Exact match**: Searches for exact label title, not partial match
- **AND logic**: Multiple labels require tasks to have ALL specified labels
- **Error handling**: Returns error if label title not found, prompting user to use `get_all_labels`
- **Alternative**: Use `filter_labels` with numeric IDs if you already know the label IDs
- **Cannot mix**: Cannot use both `filter_labels` and `filter_label_titles` in the same call

---

## Next Steps

- **API Reference**: See [API.md](./API.md) for complete tool documentation
- **Integration**: See [INTEGRATIONS.md](./INTEGRATIONS.md) for platform setup
- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
