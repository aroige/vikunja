import { z } from 'zod';
import { VikunjaClient } from '../vikunja/client.js';
import { RateLimiter } from '../ratelimit/limiter.js';
import { UserContext } from '../auth/types.js';
import { VikunjaTask } from '../vikunja/types.js';
import { logger } from '../utils/logger.js';

/**
 * Input schemas for task tools
 */
export const CreateTaskSchema = z.object({
  project_id: z.number().int().positive()
    .describe('ID of the project (workspace/list) where the task will be created. Get project IDs using get_projects or search_projects.'),
  title: z.string().min(1).max(500)
    .describe('Task title/name (required, 1-500 characters). This is the main task description shown in lists.'),
  description: z.string().optional()
    .describe('Detailed task description (optional, supports Markdown formatting). Use this for longer explanations, requirements, or context.'),
  due_date: z.string().optional()
    .describe('Task due date in ISO 8601 format (optional). Example: "2024-12-31T23:59:59Z" or "2024-12-31" for date only.'),
  priority: z.number().int().min(0).max(5).optional()
    .describe('Task priority level (optional, 0-5 where 0=none, 1=low, 2=medium, 3=high, 4=urgent, 5=critical). Default: 0.'),
  labels: z.array(z.number().int().positive()).optional()
    .describe('Array of label IDs to attach to the task (optional). Create labels first with create_label, then attach them here.'),
  assignees: z.array(z.number().int().positive()).optional()
    .describe('Array of user IDs to assign to the task (optional). Get user IDs from project members or team listings.'),
  repeat_after: z.number().int().min(0).optional()
    .describe('Recurring task interval in SECONDS (optional). Common intervals: 3600=hourly, 86400=daily, 604800=weekly, 1209600=bi-weekly, 2592000=30-day month. IMPORTANT: Set to 0 when using repeat_mode=1 (monthly) - the mode handles the calendar month logic. Cannot be negative.'),
  repeat_mode: z.number().int().min(0).max(4).optional()
    .describe('Recurring task repeat mode (optional, 0-4). RepeatMode enum: 0=DEFAULT (repeat from due date, best for scheduled tasks like meetings), 1=MONTHLY (repeat on same calendar date each month, use repeat_after=0, best for bills/reports on specific dates), 2=FROM_CURRENT (repeat from completion date, best for flexible tasks like "water plants every 3 days"), 3=WEEKDAYS (repeat Monday-Friday only, skips weekends automatically), 4=WEEKENDS (repeat Saturday-Sunday only, skips weekdays automatically). Default behavior (if omitted): non-recurring task.'),
});

export const UpdateTaskSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the task to update. Get task IDs from search_tasks, get_my_tasks, or get_project_tasks.'),
  title: z.string().min(1).max(500).optional()
    .describe('New task title (optional, 1-500 characters). Only provide if changing the title.'),
  description: z.string().optional()
    .describe('New task description (optional, supports Markdown). Only provide if changing the description.'),
  done: z.boolean().optional()
    .describe('Mark task as done/undone (optional). Set true to complete, false to reopen. For completing only, consider using complete_task tool instead.'),
  due_date: z.string().nullable().optional()
    .describe('New due date in ISO 8601 format (optional). Set to null to clear existing due date. Example: "2024-12-31T23:59:59Z".'),
  priority: z.number().int().min(0).max(5).optional()
    .describe('New priority level (optional, 0-5 where 0=none, 1=low, 2=medium, 3=high, 4=urgent, 5=critical).'),
  labels: z.array(z.number().int().positive()).optional()
    .describe('New array of label IDs (optional). REPLACES existing labels. To add/remove single labels, use add_label or remove_label tools.'),
  assignees: z.array(z.number().int().positive()).optional()
    .describe('New array of user IDs (optional). REPLACES existing assignees. To add/remove single assignees, use assign_task or unassign_task tools.'),
  repeat_after: z.number().int().min(0).optional()
    .describe('Update recurring interval in SECONDS (optional). Common: 3600=hourly, 86400=daily, 604800=weekly. Set to 0 for monthly mode (repeat_mode=1). To remove recurrence, set both repeat_after and repeat_mode to appropriate values or use API to clear. Cannot be negative.'),
  repeat_mode: z.number().int().min(0).max(4).optional()
    .describe('Update repeat mode (optional, 0-4). 0=repeat from due date (scheduled tasks), 1=monthly on same calendar date (must use repeat_after=0), 2=repeat from completion (flexible tasks), 3=weekdays only (Monday-Friday, skips weekends), 4=weekends only (Saturday-Sunday, skips weekdays). Changing mode affects next recurrence calculation. See create_task description for detailed examples.'),
});

export const CompleteTaskSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the task to mark as complete. Use this instead of update_task when you only want to complete a task without other changes.'),
});

export const DeleteTaskSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the task to permanently delete. This action cannot be undone. Requires write permission on the parent project.'),
});

export const MoveTaskSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the task to move to a different project.'),
  project_id: z.number().int().positive()
    .describe('ID of the destination project. The task will be moved from its current project to this one. Requires write permission on both projects.'),
});

export const GetTaskSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the task to retrieve (required). Returns complete task details including title, description, priority, assignees, labels, and relations to other tasks.'),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CompleteTaskInput = z.infer<typeof CompleteTaskSchema>;
export type DeleteTaskInput = z.infer<typeof DeleteTaskSchema>;
export type MoveTaskInput = z.infer<typeof MoveTaskSchema>;
export type GetTaskInput = z.infer<typeof GetTaskSchema>;

/**
 * Tool result for task operations
 */
export interface TaskToolResult {
  success: boolean;
  message: string;
  task?: VikunjaTask;
  taskId?: number;
  error?: string;
}

/**
 * Task management tools for MCP protocol
 */
export class TaskTools {
  constructor(
    private client: VikunjaClient,
    private rateLimiter: RateLimiter
  ) {}

  /**
   * Create a new task in a project
   */
  async createTask(
    input: CreateTaskInput,
    userContext: UserContext
  ): Promise<TaskToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Create task with token passed directly
      const task = await this.client.put<VikunjaTask>(
        `/api/v1/projects/${input.project_id}`,
        input,
        userContext.token
      );

      logger.info('Task created', {
        taskId: task.id,
        projectId: input.project_id,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Task "${task.title}" created successfully with ID ${task.id}`,
        task,
        taskId: task.id,
      };
    } catch (error) {
      logger.error('Failed to create task', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to create task',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(
    input: UpdateTaskInput,
    userContext: UserContext
  ): Promise<TaskToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Extract ID and update data
      const { id, ...updateData } = input;

      // Update task with token passed directly
      const task = await this.client.post<VikunjaTask>(
        `/api/v1/tasks/${id}`,
        updateData,
        userContext.token
      );

      logger.info('Task updated', {
        taskId: task.id,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Task "${task.title}" updated successfully`,
        task,
        taskId: task.id,
      };
    } catch (error) {
      logger.error('Failed to update task', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to update task',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Mark a task as complete
   */
  async completeTask(
    input: CompleteTaskInput,
    userContext: UserContext
  ): Promise<TaskToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Complete task with token passed directly
      const task = await this.client.post<VikunjaTask>(
        `/api/v1/tasks/${input.id}`,
        { done: true },
        userContext.token
      );

      logger.info('Task completed', {
        taskId: task.id,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Task "${task.title}" marked as complete`,
        task,
        taskId: task.id,
      };
    } catch (error) {
      logger.error('Failed to complete task', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to complete task',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(
    input: DeleteTaskInput,
    userContext: UserContext
  ): Promise<TaskToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Delete task with token passed directly
      await this.client.delete(`/api/v1/tasks/${input.id}`, userContext.token);

      logger.info('Task deleted', {
        taskId: input.id,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Task with ID ${input.id} deleted successfully`,
        taskId: input.id,
      };
    } catch (error) {
      logger.error('Failed to delete task', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to delete task',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Move a task to a different project
   */
  async moveTask(
    input: MoveTaskInput,
    userContext: UserContext
  ): Promise<TaskToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Move task (update project_id) with token passed directly
      const task = await this.client.post<VikunjaTask>(
        `/api/v1/tasks/${input.id}`,
        { project_id: input.project_id },
        userContext.token
      );

      logger.info('Task moved', {
        taskId: task.id,
        newProjectId: input.project_id,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Task "${task.title}" moved to project ${input.project_id}`,
        task,
        taskId: task.id,
      };
    } catch (error) {
      logger.error('Failed to move task', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to move task',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get a single task by ID
   */
  async getTask(
    input: GetTaskInput,
    userContext: UserContext
  ): Promise<TaskToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Retrieve task with token passed directly
      const task = await this.client.get<VikunjaTask>(
        `/api/v1/tasks/${input.id}`,
        undefined, // no query params
        userContext.token
      );

      logger.info('Task retrieved', {
        taskId: task.id,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Task "${task.title}" retrieved successfully`,
        task,
        taskId: task.id,
      };
    } catch (error) {
      logger.error('Failed to retrieve task', {
        error,
        taskId: input.id,
        userId: userContext.userId,
      });

      // Handle specific error cases
      let message = 'Failed to retrieve task';
      if (error instanceof Error) {
        const statusCode = (error as any).response?.status;
        if (statusCode === 404) {
          message = `Task with ID ${input.id} not found`;
        } else if (statusCode === 403) {
          message = 'You do not have permission to access this task';
        }
      }

      return {
        success: false,
        message,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
