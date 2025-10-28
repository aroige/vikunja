# Research: AI-Powered Personal Assistant System

**Date**: 2025-10-28  
**Branch**: `011-ai-agent-architecture`

## Overview

This document consolidates research findings for implementing a reliable AI agent system using n8n orchestration, MCP server tools, and PostgreSQL-backed conversation memory. All clarifications were completed during the specification phase, so this research focuses on best practices and implementation patterns for the chosen technologies.

---

## R1: n8n Workflow Orchestration Patterns

### Decision
Use n8n as the agent orchestration platform with JSON workflow exports and separate prompt files for version control.

### Rationale
- **Native Agent Support**: n8n has built-in AI agent nodes supporting multiple LLM providers (OpenAI, Anthropic, Google Gemini)
- **PostgreSQL Memory**: Native memory nodes with configurable context windows and shared database support
- **Visual Workflow Editor**: Enables rapid iteration and debugging of agent logic
- **Extensibility**: Custom JavaScript tools can be added inline or via HTTP endpoints
- **Cost**: Self-hostable (no per-execution costs) or affordable cloud pricing

### Best Practices
1. **Workflow Structure**:
   - Supervisor workflow: Chat trigger → LLM agent (routing) → Sub-workflow calls
   - Specialist workflows: Receive context → LLM agent (domain-specific) → Tool executions → Return result
   - Use sub-workflows for specialists to enable independent testing and reuse

2. **Memory Configuration**:
   ```javascript
   // PostgreSQL Memory Node settings
   {
     "sessionKey": "{{ $json.userId }}", // User-specific conversations
     "contextWindowSize": 5, // Supervisor: 3-5, Specialists: 10-15
     "memoryType": "buffer", // Or "summary" for very long conversations
     "sharedDatabase": true // Enable cross-agent context
   }
   ```

3. **Prompt Management**:
   - Store prompts in separate `.md` files in `n8n-workflows/prompts/`
   - Reference in workflow using HTTP Request node or local file read
   - Version control enables A/B testing and rollback

4. **Tool Integration**:
   - Use HTTP Request nodes for MCP server tools
   - Structured output with JSON schema enforcement
   - Tool descriptions must be concise for cost-efficient models

5. **Error Handling**:
   - Add error workflows with graceful degradation messages
   - Log all failures to structured logging endpoint
   - Retry logic for transient failures (API timeouts)

### Alternatives Considered
- **LangChain/LangGraph**: More code-heavy; requires custom hosting; less visual debugging
- **Custom Python**: Full control but higher development and maintenance cost
- **OpenAI Assistants API**: Vendor lock-in; expensive; less control over workflow logic

### References
- n8n AI Agent documentation: https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/
- n8n Memory nodes: https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memory/
- Community workflows: https://n8n.io/workflows/

---

## R2: Model Context Protocol (MCP) Tool Implementation

### Decision
Enhance existing MCP server with search-before-action tools using TypeScript, Express, and the official MCP SDK.

### Rationale
- **Existing Infrastructure**: MCP server already exists in `mcp-server/` with Vikunja integration
- **Tool-Level Enforcement**: Implementing search-first in tools (not prompts) prevents bypassing
- **Type Safety**: TypeScript with Zod validation ensures correct tool inputs/outputs
- **Standard Protocol**: MCP is becoming the standard for LLM tool integration

### Best Practices
1. **Tool Design Pattern** (Search-Before-Action):
   ```typescript
   // complete_task tool implementation
   async function completeTask(args: {taskQuery: string, userId: string}) {
     // Step 1: ALWAYS search first
     const matches = await searchTasks(args.taskQuery, {
       status: 'incomplete',
       userId: args.userId
     });
     
     // Step 2: Handle match cases
     if (matches.length === 0) {
       return {
         status: 'no_match',
         message: "I couldn't find an active task matching '{query}'...",
         suggestedActions: ['check_project', 'verify_completed']
       };
     }
     
     if (matches.length > 1) {
       return {
         status: 'needs_clarification',
         message: 'I found multiple tasks:',
         tasks: matches.map(t => ({
           id: t.id,
           title: t.title,
           project: t.project?.title,
           dueDate: t.dueDate
         })),
         nextStep: 'Please specify which task you meant'
       };
     }
     
     // Step 3: Single match - confirm before executing
     const task = matches[0];
     return {
       status: 'confirm_required',
       message: `I found: "${task.title}" (${task.project?.title}, due ${task.dueDate}). Mark this as complete?`,
       taskId: task.id,
       confirmationToken: generateToken(task.id) // For next call
     };
   }
   
   // Separate confirm_complete_task tool
   async function confirmCompleteTask(args: {taskId: number, confirmationToken: string}) {
     // Verify token matches taskId
     if (!verifyToken(args.confirmationToken, args.taskId)) {
       throw new Error('Invalid confirmation');
     }
     
     // Execute the actual completion
     await vikunjaClient.updateTask(args.taskId, {done: true});
     
     return {
       status: 'completed',
       message: `Marked "${task.title}" as complete ✓`
     };
   }
   ```

2. **Tool Registration**:
   ```typescript
   server.setRequestHandler(ListToolsRequestSchema, async () => ({
     tools: [
       {
         name: 'search_tasks',
         description: 'Search for tasks by keywords, project, or filters. Always use this before completing/updating tasks.',
         inputSchema: zodToJsonSchema(SearchTasksSchema)
       },
       {
         name: 'complete_task',
         description: 'Mark a task as complete. Returns confirmation prompt - never directly completes.',
         inputSchema: zodToJsonSchema(CompleteTaskSchema)
       },
       {
         name: 'confirm_complete_task',
         description: 'Confirm and execute task completion after user approval.',
         inputSchema: zodToJsonSchema(ConfirmCompleteTaskSchema)
       },
       // ... more tools
     ]
   }));
   ```

3. **Logging & Observability**:
   ```typescript
   import winston from 'winston';
   
   const logger = winston.createLogger({
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.json()
     ),
     transports: [
       new winston.transports.File({ filename: 'mcp-server.log' })
     ]
   });
   
   // Log all tool calls
   function logToolCall(toolName: string, args: any, result: any, traceId: string) {
     logger.info('tool_execution', {
       traceId,
       toolName,
       args: sanitize(args), // Remove sensitive data
       result: sanitize(result),
       timestamp: Date.now(),
       userId: args.userId
     });
   }
   ```

4. **Error Handling**:
   - Return structured error objects, never throw for user errors
   - Distinguish between user errors (invalid input) and system errors (API failure)
   - Include suggested next steps in error messages

### Alternatives Considered
- **Direct Vikunja API Calls**: No search-before-action enforcement; bypassed by clever prompts
- **OpenAPI Function Calling**: Less structured; harder to enforce multi-step workflows
- **LangChain Tools**: More abstraction; harder to debug; MCP is more standard

### References
- MCP specification: https://modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Tool design patterns: https://modelcontextprotocol.io/docs/concepts/tools

---

## R3: Natural Language Date Parsing with Chrono.js

### Decision
Use Chrono.js (chrono-node) as primary date parser with AI fallback for ambiguous cases.

### Rationale
- **Battle-Tested**: Used by major apps (Notion, Linear) for date parsing
- **Multi-Language**: Supports English, German, French, Japanese, Dutch, Portuguese, Russian, Ukrainian
- **Flexible**: Handles relative ("tomorrow", "next Tuesday") and absolute ("2025-10-30 3pm") dates
- **Confidence Scores**: Provides certainty levels for parsed dates
- **Lightweight**: ~50KB minified; no ML model overhead

### Best Practices
1. **n8n Custom Tool Implementation**:
   ```javascript
   // n8n Code node or custom tool
   const chrono = require('chrono-node');
   
   function parseDate(userInput, currentTime) {
     const results = chrono.parse(userInput, currentTime);
     
     if (results.length === 0) {
       return {
         success: false,
         reason: 'no_parse',
         fallbackToAI: true
       };
     }
     
     const result = results[0];
     
     // Check confidence (certain, likely, unlikely)
     if (result.start.isCertain() === false) {
       return {
         success: false,
         reason: 'uncertain',
         parsedDate: result.start.date(),
         confidence: 'low',
         fallbackToAI: true,
         suggestion: result.text // What Chrono thought it parsed
       };
     }
     
     return {
       success: true,
       date: result.start.date().toISOString(),
       hasTime: result.start.get('hour') !== null,
       timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
     };
   }
   ```

2. **AI Fallback Pattern** (in n8n workflow):
   ```
   [User Input] → [Chrono Tool]
       ↓ success=false
   [LLM Clarification] → "Did you mean [date]?" → [User Confirms]
       ↓ 
   [Use Confirmed Date]
   ```

3. **Default Time Handling**:
   ```javascript
   const defaultTimes = {
     'morning': { hour: 9, minute: 0 },
     'afternoon': { hour: 14, minute: 0 },
     'evening': { hour: 18, minute: 0 },
     'night': { hour: 21, minute: 0 }
   };
   
   function applyDefaults(parsedDate, userInput) {
     if (!parsedDate.hasTime) {
       const timeOfDay = detectTimeOfDay(userInput); // "morning", etc.
       if (timeOfDay && defaultTimes[timeOfDay]) {
         parsedDate.date.setHours(defaultTimes[timeOfDay].hour);
         parsedDate.date.setMinutes(defaultTimes[timeOfDay].minute);
         parsedDate.appliedDefault = timeOfDay;
       }
     }
     return parsedDate;
   }
   ```

4. **Timezone Handling**:
   - Parse in user's timezone (passed from n8n context)
   - Convert to UTC for Vikunja API
   - Display in user's timezone in confirmations

### Alternatives Considered
- **AI-Only Parsing**: Inconsistent; expensive; fails on ambiguous dates
- **Dateparser (Python)**: Requires Python runtime; less flexible than Chrono
- **Custom Regex**: Fragile; doesn't handle relative dates well

### References
- Chrono.js: https://github.com/wanasit/chrono
- Date parsing best practices: https://wanasit.github.io/chrono/

---

## R4: PostgreSQL Memory Management for n8n Agents

### Decision
Use n8n's built-in PostgreSQL memory nodes with shared database and agent-specific context windows.

### Rationale
- **Native Integration**: No custom code needed; configured via n8n UI
- **Cross-Agent Context**: Shared database enables supervisor to see specialist discoveries
- **Cost Control**: Configurable context windows limit token usage
- **Persistence**: Survives n8n restarts unlike in-memory buffers
- **Queryable**: Can inspect conversation history via SQL for debugging

### Best Practices
1. **Memory Configuration Per Agent**:
   ```json
   // Supervisor Agent Memory
   {
     "sessionKey": "{{ $json.userId }}",
     "contextWindowSize": 5,
     "memoryType": "buffer",
     "connectionString": "postgresql://user:pass@localhost/n8n_memory",
     "tableName": "supervisor_memory"
   }
   
   // Vikunja Specialist Memory
   {
     "sessionKey": "{{ $json.userId }}",
     "contextWindowSize": 15,
     "memoryType": "buffer",
     "connectionString": "postgresql://user:pass@localhost/n8n_memory",
     "tableName": "vikunja_specialist_memory"
   }
   ```

2. **Structured Session Data** (stored alongside messages):
   ```javascript
   // In n8n workflow, update session metadata
   const sessionData = {
     userId: '{{ $json.userId }}',
     lastDiscoveredTaskId: taskId,
     pendingConfirmation: {
       action: 'complete_task',
       taskId: taskId,
       token: confirmToken,
       expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
     },
     userPreferences: {
       timezone: 'America/New_York',
       defaultProject: 'Work'
     }
   };
   
   // Store in PostgreSQL custom table
   await db.query(
     'INSERT INTO session_state (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET data = $2',
     [userId, JSON.stringify(sessionData)]
   );
   ```

3. **Memory Cleanup**:
   - Set PostgreSQL TTL on old conversations (e.g., 30 days)
   - Periodic job to archive completed sessions
   - Keep session state for 5 minutes for confirmation flows

4. **Cross-Agent Context Sharing**:
   ```sql
   -- Query to get recent specialist discoveries for supervisor
   SELECT 
     message_content,
     metadata->>'taskId' as discovered_task_id,
     created_at
   FROM vikunja_specialist_memory
   WHERE user_id = $1
   ORDER BY created_at DESC
   LIMIT 3;
   ```

### Alternatives Considered
- **Redis**: No built-in n8n support; requires custom nodes; less queryable
- **In-Memory**: Lost on restarts; doesn't scale; no cross-agent sharing
- **File-Based**: Slow; concurrent access issues; hard to query

### References
- n8n Memory documentation: https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memory/
- PostgreSQL JSON operations: https://www.postgresql.org/docs/current/functions-json.html

---

## R5: Task Ranking Algorithm Implementation

### Decision
Implement urgency-first ranking (overdue → today → this week → later) with priority tiebreaker within each group.

### Rationale
- **Time-Based Commitments**: Overdue tasks represent broken promises; highest urgency regardless of priority
- **Predictable**: Users can understand the logic without explanation
- **Simple**: Cost-efficient models can explain this consistently
- **Aligned with GTD**: Getting Things Done methodology emphasizes due dates + context

### Best Practices
1. **Implementation** (MCP Server):
   ```typescript
   interface Task {
     id: number;
     title: string;
     dueDate: Date | null;
     priority: number; // 1=low, 2=medium, 3=high, 4=urgent, 5=do now
     done: boolean;
   }
   
   function rankTasks(tasks: Task[], now: Date = new Date()): Task[] {
     const startOfToday = new Date(now).setHours(0, 0, 0, 0);
     const endOfToday = new Date(now).setHours(23, 59, 59, 999);
     const endOfWeek = new Date(now);
     endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
     
     return tasks
       .filter(t => !t.done)
       .sort((a, b) => {
         // Urgency score: 4=overdue, 3=today, 2=this week, 1=later, 0=no due date
         const urgencyA = calculateUrgency(a.dueDate, startOfToday, endOfToday, endOfWeek);
         const urgencyB = calculateUrgency(b.dueDate, startOfToday, endOfToday, endOfWeek);
         
         if (urgencyA !== urgencyB) {
           return urgencyB - urgencyA; // Higher urgency first
         }
         
         // Within same urgency, sort by priority
         return (b.priority || 0) - (a.priority || 0);
       });
   }
   
   function calculateUrgency(dueDate: Date | null, startOfToday: number, endOfToday: number, endOfWeek: Date): number {
     if (!dueDate) return 0; // No due date
     const dueTime = dueDate.getTime();
     
     if (dueTime < startOfToday) return 4; // Overdue
     if (dueTime >= startOfToday && dueTime <= endOfToday) return 3; // Today
     if (dueTime <= endOfWeek.getTime()) return 2; // This week
     return 1; // Later
   }
   ```

2. **Presentation** (LLM prompt guidance):
   ```markdown
   When presenting task recommendations:
   1. Group by urgency: "⚠️ X overdue tasks", "📅 X due today", "📆 X due this week"
   2. Within each group, show highest priority first
   3. Limit to top 10-15 tasks; offer "show more" if needed
   4. Include context: project, due date, priority for each task
   ```

### Alternatives Considered
- **Priority-Only**: Ignores time commitments; users miss deadlines
- **Weighted Scoring**: Complex; hard for models to explain; feels arbitrary to users
- **User-Configurable**: Adds complexity; most users want time-based default

### References
- Getting Things Done (GTD): https://gettingthingsdone.com/
- Task prioritization research: https://www.lesswrong.com/posts/

---

## R6: Comprehensive Logging Architecture

### Decision
Implement structured logging with Winston (MCP server) and n8n's built-in logging, using trace IDs to correlate events across components.

### Rationale
- **Multi-Agent Debugging**: Need to trace requests from supervisor → specialist → MCP server → Vikunja
- **Cost Tracking**: Token usage per agent/operation informs optimization
- **Reliability Analysis**: Error rates and latencies track 99%+ accuracy goal
- **Compliance**: Audit trail for user actions on their data

### Best Practices
1. **Trace ID Propagation**:
   ```typescript
   // n8n workflow start
   const traceId = `${userId}-${Date.now()}-${randomUUID()}`;
   
   // Pass to all subsequent calls
   const mcp RequeststRequest = {
     tool: 'search_tasks',
     args: {...},
     metadata: {
       traceId: traceId,
       agentType: 'vikunja_specialist',
       userId: userId
     }
   };
   
   // MCP server receives and logs
   logger.info('tool_call_received', {
     traceId: request.metadata.traceId,
     tool: request.tool,
     agentType: request.metadata.agentType,
     timestamp: Date.now()
   });
   ```

2. **Log Schema**:
   ```typescript
   interface LogEntry {
     level: 'info' | 'warn' | 'error';
     message: string;
     traceId: string;
     timestamp: number;
     component: 'supervisor' | 'specialist' | 'mcp_server' | 'vikunja';
     eventType: 'tool_call' | 'agent_decision' | 'user_interaction' | 'error';
     data: {
       toolName?: string;
       args?: any; // Sanitized
       result?: any; // Sanitized
       tokensUsed?: number;
       latencyMs?: number;
       errorCode?: string;
       userId: string;
     };
   }
   ```

3. **Token Usage Tracking**:
   ```typescript
   // After each LLM call in n8n
   const usage = {
     traceId: traceId,
     agentType: 'supervisor',
     model: 'gemini-2.0-flash-lite',
     promptTokens: response.usage.prompt_tokens,
     completionTokens: response.usage.completion_tokens,
     totalTokens: response.usage.total_tokens,
     estimatedCost: calculateCost(response.usage, 'gemini-2.0-flash-lite'),
     timestamp: Date.now()
   };
   
   logger.info('token_usage', usage);
   ```

4. **Sensitive Data Sanitization**:
   ```typescript
   function sanitize(obj: any): any {
     const sanitized = {...obj};
     const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
     
     for (const key of Object.keys(sanitized)) {
       if (sensitiveFields.includes(key.toLowerCase())) {
         sanitized[key] = '[REDACTED]';
       }
       if (typeof sanitized[key] === 'object') {
         sanitized[key] = sanitize(sanitized[key]);
       }
     }
     
     return sanitized;
   }
   ```

5. **Log Storage & Retention**:
   - MCP Server: Winston → file rotation (7 days local, archive to S3/equivalent)
   - n8n: Built-in logging → PostgreSQL table (30 days retention)
   - Aggregate logs in ELK stack or Loki for analysis (optional)

### Alternatives Considered
- **Console Logging**: Not persistent; lost on restart; hard to query
- **Application Insights**: Expensive for high-volume logging; vendor lock-in
- **No Logging**: Impossible to debug multi-agent failures or track costs

### References
- Winston documentation: https://github.com/winstonjs/winston
- Distributed tracing: https://opentelemetry.io/docs/concepts/observability-primer/#distributed-traces

---

## Summary of Research Findings

All technology choices have been validated with best practices and implementation patterns documented. No unresolved questions or "NEEDS CLARIFICATION" items remain.

**Key Decisions**:
1. ✅ n8n for orchestration with JSON workflow exports
2. ✅ MCP server with tool-level search-before-action enforcement
3. ✅ Chrono.js for date parsing with AI fallback
4. ✅ PostgreSQL memory with shared database and agent-specific windows
5. ✅ Urgency-first task ranking algorithm
6. ✅ Comprehensive logging with trace IDs and token tracking

**Ready for Phase 1**: All research complete. Proceed to data modeling, contract generation, and quickstart guide.
