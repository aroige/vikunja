/**
 * task-tools-agent.ts
 * 
 * Enhanced task tools for AI agent workflows implementing search-before-action pattern.
 * Part of Phase 3: User Story 1 - Task Completion MVP (T018, T019)
 * 
 * Created: 2025-10-28
 * Feature: 011-ai-agent-architecture
 * Contract: specs/011-ai-agent-architecture/contracts/mcp-tools.md
 */

import { z } from 'zod';
import { VikunjaClient } from '../vikunja/client.js';
import { RateLimiter } from '../ratelimit/limiter.js';
import { UserContext } from '../auth/types.js';
import { VikunjaTask } from '../vikunja/types.js';
import { logger } from '../utils/logger.js';
import { generateTraceId } from '../utils/trace-id.js';
import {
  generateConfirmationToken,
  verifyConfirmationToken,
} from '../utils/confirmation-token.js';
import {
  ToolResult,
  SuccessResult,
  ClarificationResult,
  ConfirmationResult,
} from '../models/tool-result.js';
import { TaskSummary } from '../models/task.js';
import { TaskService, SearchResultType } from '../services/task-service.js';

/**
 * Input schema for complete_task tool (search-first pattern)
 */
export const CompleteTaskAgentSchema = z.object({
  taskQuery: z.string().min(1)
    .describe('Keywords to find the task to complete'),
  userId: z.string()
    .describe('User context (required)'),
});

export type CompleteTaskAgentInput = z.infer<typeof CompleteTaskAgentSchema>;

/**
 * Input schema for confirm_complete_task tool
 */
export const ConfirmCompleteTaskSchema = z.object({
  taskId: z.number().int().positive()
    .describe('Task ID to complete'),
  confirmationToken: z.string()
    .describe('Token from complete_task response'),
  userId: z.string()
    .describe('User context'),
});

export type ConfirmCompleteTaskInput = z.infer<typeof ConfirmCompleteTaskSchema>;

/**
 * Enhanced task tools for AI agent interactions
 */
export class TaskToolsAgent {
  private taskService: TaskService;

  constructor(
    private client: VikunjaClient,
    private rateLimiter: RateLimiter
  ) {
    this.taskService = new TaskService(client);
  }

  /**
   * T018: Complete task tool with search-first pattern
   * 
   * Always searches first, presents match for user confirmation, and returns confirmation token.
   * Never directly completes a task - use confirm_complete_task for execution.
   * 
   * @param input - Task query and user context
   * @param userContext - User authentication context
   * @returns ToolResult with confirmation request or clarification
   */
  async completeTask(
    input: CompleteTaskAgentInput,
    userContext: UserContext
  ): Promise<ToolResult<{ task?: TaskSummary; tasks?: TaskSummary[] }>> {
    const traceId = generateTraceId(userContext.userId.toString());
    
    logger.info('Executing complete_task (search-first)', {
      traceId,
      userId: userContext.userId,
      taskQuery: input.taskQuery,
    });

    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Build filter for incomplete tasks only
      const filter = 'done = false';

      // Search for matching tasks
      const tasks = await this.client.get<VikunjaTask[]>(
        '/api/v1/tasks/all',
        {
          s: input.taskQuery,
          page: 1,
          filter,
        },
        userContext.token
      );

      // Convert to TaskSummary format
      const taskSummaries = await Promise.all(
        tasks.map((task: VikunjaTask) => this.taskService.convertToTaskSummary(task, userContext.token))
      );

      // Validate search results
      const validation = this.taskService.validateSearchResult(taskSummaries);

      // Handle no matches
      if (validation.type === SearchResultType.NO_MATCH) {
        const result: ClarificationResult<{ tasks: TaskSummary[] }> = {
          status: 'needs_clarification',
          message: this.taskService.buildNoMatchMessage(input.taskQuery),
          suggestedActions: [
            'Check if the task exists in a specific project',
            'Verify the task name',
            'Check if the task is already completed',
          ],
          traceId,
        };
        
        logger.info('Complete task: no matches found', { traceId, query: input.taskQuery });
        return result;
      }

      // Handle multiple matches
      if (validation.type === SearchResultType.MULTIPLE_MATCHES) {
        const result: ClarificationResult<{ tasks: TaskSummary[] }> = {
          status: 'needs_clarification',
          message: this.taskService.buildMultipleMatchMessage(
            validation.tasks.length,
            input.taskQuery
          ),
          data: {
            tasks: validation.tasks,
          },
          suggestedActions: [
            'Specify which task you meant by including project name or due date',
          ],
          traceId,
        };
        
        logger.info('Complete task: multiple matches found', {
          traceId,
          count: validation.tasks.length,
        });
        return result;
      }

      // Single match - generate confirmation token
      const task = validation.tasks[0];
      if (!task) {
        throw new Error('Unexpected: validation returned single match but no task found');
      }
      
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now

      const confirmationToken = generateConfirmationToken({
        userId: input.userId,
        toolName: 'complete_task',
        args: { taskId: task.id },
        traceId,
      });

      const result: ConfirmationResult<{ task: TaskSummary }> = {
        status: 'confirm_required',
        message: this.taskService.buildConfirmationMessage(task, 'Mark this as complete'),
        data: {
          task,
        },
        metadata: {
          taskId: task.id,
          confirmationToken,
          expiresAt,
        },
        traceId,
      };

      logger.info('Complete task: confirmation required', {
        traceId,
        taskId: task.id,
      });

      return result;

    } catch (error) {
      logger.error('Complete task failed', {
        traceId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: 'error',
        message: 'Failed to search for task. Please try again.',
        suggestedActions: [
          'Check your connection to Vikunja',
          'Verify your permissions',
        ],
        traceId,
      };
    }
  }

  /**
   * T019: Confirm and execute task completion
   * 
   * Validates confirmation token and marks task as complete.
   * 
   * @param input - Task ID, confirmation token, and user context
   * @param userContext - User authentication context
   * @returns ToolResult with completion status
   */
  async confirmCompleteTask(
    input: ConfirmCompleteTaskInput,
    userContext: UserContext
  ): Promise<ToolResult<{ task: TaskSummary }>> {
    const traceId = generateTraceId(userContext.userId.toString());
    
    logger.info('Executing confirm_complete_task', {
      traceId,
      userId: userContext.userId,
      taskId: input.taskId,
    });

    try {
      // Verify confirmation token
      let payload;
      try {
        payload = verifyConfirmationToken(input.confirmationToken);
      } catch (error) {
        logger.warn('Invalid confirmation token', {
          traceId,
          error: error instanceof Error ? error.message : String(error),
        });
        
        return {
          status: 'error',
          message: 'Confirmation expired. Please search for the task again.',
          suggestedActions: [
            'Search for the task again',
            'Confirmation tokens expire after 5 minutes',
          ],
          traceId,
        };
      }

      // Validate token matches user and task
      if (payload.userId !== input.userId) {
        return {
          status: 'error',
          message: 'Invalid confirmation token.',
          traceId,
        };
      }

      const tokenTaskId = payload.args['taskId'] as number;
      if (tokenTaskId !== input.taskId) {
        return {
          status: 'error',
          message: 'Token does not match task ID.',
          traceId,
        };
      }

      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Mark task as complete
      const updatedTask = await this.client.post<VikunjaTask>(
        `/api/v1/tasks/${input.taskId}`,
        { done: true },
        userContext.token
      );

      // Convert to TaskSummary
      const taskSummary = await this.taskService.convertToTaskSummary(
        updatedTask,
        userContext.token
      );

      const result: SuccessResult<{ task: TaskSummary }> = {
        status: 'success',
        message: `Marked '${taskSummary.title}' as complete ✓`,
        data: {
          task: taskSummary,
        },
        traceId,
      };

      logger.info('Task completed successfully', {
        traceId,
        taskId: input.taskId,
        title: updatedTask.title,
      });

      return result;

    } catch (error) {
      logger.error('Failed to complete task', {
        traceId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: 'error',
        message: 'Failed to complete task. Please try again.',
        suggestedActions: [
          'Check your connection to Vikunja',
          'Verify you have permission to modify this task',
        ],
        traceId,
      };
    }
  }
}
