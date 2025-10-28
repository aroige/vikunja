/**
 * Tool Logging Integration Example
 * 
 * This file demonstrates how to integrate database logging into existing MCP tools.
 * Use the withToolLogging() wrapper to automatically log tool executions.
 */

import { withToolLogging } from '../utils/db.js';
import { UserContext } from '../auth/types.js';
import { ToolResult } from '../models/tool-result.js';
import { generateTraceId } from '../utils/trace-id.js';

/**
 * Example 1: Wrap a tool method with logging
 * 
 * Before:
 * ```typescript
 * async searchTasks(input, userContext): Promise<ToolResult> {
 *   const result = await this.taskService.search(...);
 *   return result;
 * }
 * ```
 * 
 * After:
 * ```typescript
 * async searchTasks(input, userContext): Promise<ToolResult> {
 *   const traceId = generateTraceId(userContext.userId.toString());
 *   
 *   return await withToolLogging(
 *     'search_tasks',
 *     'vikunja_specialist',
 *     userContext.userId.toString(),
 *     traceId,
 *     { query: input.query, filters: input.filters },
 *     async () => {
 *       // Your existing tool implementation
 *       const result = await this.taskService.search(...);
 *       return result;
 *     }
 *   );
 * }
 * ```
 */

// Example tool class with logging integration
export class ExampleToolWithLogging {
  /**
   * Search tasks with automatic logging
   */
  async searchTasks(
    input: { query: string; filters?: Record<string, unknown> },
    userContext: UserContext
  ): Promise<ToolResult> {
    const traceId = generateTraceId(userContext.userId.toString());

    return await withToolLogging(
      'search_tasks',
      'vikunja_specialist',
      userContext.userId.toString(),
      traceId,
      { query: input.query, filters: input.filters },
      async () => {
        // Your tool implementation here
        // This will be wrapped with:
        // - Start time capture
        // - Latency calculation
        // - Status detection (success/error/needs_clarification)
        // - Database logging (fire-and-forget)
        // - Error propagation (doesn't swallow errors)

        // Simulate tool execution
        const result: ToolResult = {
          status: 'success',
          message: 'Found 0 tasks',
          data: { tasks: [] },
          traceId,
        };

        return result;
      }
    );
  }

  /**
   * Complete task with automatic logging
   */
  async completeTask(
    input: { taskQuery: string; userId: string },
    userContext: UserContext
  ): Promise<ToolResult> {
    const traceId = generateTraceId(userContext.userId.toString());

    return await withToolLogging(
      'complete_task',
      'vikunja_specialist',
      userContext.userId.toString(),
      traceId,
      { taskQuery: input.taskQuery },
      async () => {
        // Tool implementation
        // If result status is 'needs_clarification', the wrapper detects it
        // and logs with status='needs_clarification'

        const result: ToolResult = {
          status: 'confirm_required',
          message: 'Found task. Confirm completion?',
          data: {
            confirmationToken: 'token-123',
          },
          traceId,
          metadata: {
            confirmationToken: 'token-123',
          },
        };

        return result;
      }
    );
  }
}

/**
 * Example 2: Direct logging without wrapper (for custom needs)
 */
import { logToolExecution } from '../utils/db.js';

export class ExampleDirectLogging {
  async customTool(input: unknown, userContext: UserContext): Promise<ToolResult> {
    const traceId = generateTraceId(userContext.userId.toString());
    const startTime = Date.now();

    try {
      // Your tool implementation
      const result: ToolResult = {
        status: 'success',
        message: 'Operation successful',
        data: {},
        traceId,
      };

      // Manual logging
      await logToolExecution({
        trace_id: traceId,
        tool_name: 'custom_tool',
        args: input as Record<string, unknown>,
        result: result as unknown as Record<string, unknown>,
        status: 'success',
        agent_type: 'vikunja_specialist',
        user_id: userContext.userId.toString(),
        latency_ms: Date.now() - startTime,
        tokens_used: 150, // Optional: if you track LLM tokens
      });

      return result;
    } catch (error) {
      // Log error case
      await logToolExecution({
        trace_id: traceId,
        tool_name: 'custom_tool',
        args: input as Record<string, unknown>,
        result: { error: error instanceof Error ? error.message : String(error) },
        status: 'error',
        agent_type: 'vikunja_specialist',
        user_id: userContext.userId.toString(),
        latency_ms: Date.now() - startTime,
      });

      throw error;
    }
  }
}

/**
 * Example 3: Query tool execution logs for analytics
 */
import { queryToolExecutionLogs, getTokenUsageStats } from '../utils/db.js';

export async function exampleAnalytics() {
  // Get recent tool executions for a user
  const recentLogs = await queryToolExecutionLogs({
    userId: 'user-123',
    limit: 50,
  });

  console.log(`Found ${recentLogs.length} recent tool executions`);

  // Get tool executions by status
  const errors = await queryToolExecutionLogs({
    status: 'error',
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    limit: 100,
  });

  console.log(`Found ${errors.length} errors in last 24 hours`);

  // Get token usage statistics
  const stats = await getTokenUsageStats({
    userId: 'user-123',
    agentType: 'vikunja_specialist',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  });

  console.log(`Token usage stats:`, stats);
  // {
  //   totalTokens: 15000,
  //   toolCount: 100,
  //   avgLatencyMs: 250
  // }

  // Calculate cost (Gemini 2.0 Flash Lite pricing)
  const costPer1M = 0.075; // Input tokens
  const estimatedCost = (stats.totalTokens / 1000000) * costPer1M;
  console.log(`Estimated cost: $${estimatedCost.toFixed(4)}`);
}

/**
 * Example 4: Initialization in server startup
 */
import { db } from '../utils/db.js';
import { config } from '../config/index.js';

export async function initializeDatabase() {
  if (!config.database.enabled) {
    console.log('Database logging disabled');
    return;
  }

  try {
    await db.connect();
    console.log('PostgreSQL connection pool initialized');
    console.log('Tool execution logging: ENABLED');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    console.log('Tool execution logging: DISABLED (will use Winston only)');
    // Don't throw - allow server to start without DB
  }
}

// Add to server startup:
// await initializeDatabase();

/**
 * Example 5: Graceful shutdown
 */
export async function shutdownDatabase() {
  try {
    await db.close();
    console.log('PostgreSQL connection pool closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
}

// Add to server shutdown:
// process.on('SIGTERM', async () => {
//   await shutdownDatabase();
//   process.exit(0);
// });

/**
 * Example 6: Health check endpoint
 */
export async function databaseHealthCheck(): Promise<{ healthy: boolean; message: string }> {
  if (!config.database.enabled) {
    return { healthy: true, message: 'Database logging disabled' };
  }

  if (!db.isReady()) {
    return { healthy: false, message: 'Database connection not ready' };
  }

  try {
    await db.query('SELECT 1');
    return { healthy: true, message: 'Database connection OK' };
  } catch (error) {
    return {
      healthy: false,
      message: `Database error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Example health check route:
// app.get('/health', async (req, res) => {
//   const dbHealth = await databaseHealthCheck();
//   res.json({
//     status: dbHealth.healthy ? 'ok' : 'degraded',
//     database: dbHealth,
//   });
// });
