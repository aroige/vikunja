import { z } from 'zod';
import { VikunjaClient } from '../vikunja/client.js';
import { RateLimiter } from '../ratelimit/limiter.js';
import { UserContext } from '../auth/types.js';
import { VikunjaTask, VikunjaProject } from '../vikunja/types.js';
import { logger } from '../utils/logger.js';

/**
 * Input schemas for search tools
 */
export const SearchTasksSchema = z.object({
  query: z.string().min(1)
    .describe('Search query string (required). Searches task titles and descriptions. Use this for flexible text-based search.'),
  page: z.number().int().positive().optional().default(1)
    .describe('Page number for pagination (optional, default: 1). Each page returns up to 50 tasks.'),
  filter_done: z.boolean().optional()
    .describe('Filter by completion status (optional). Set true for completed tasks only, false for incomplete only, omit for all.'),
  filter_priority: z.number().int().min(0).max(5).optional()
    .describe('Filter by priority level (optional, 0-5). Only tasks with this exact priority are returned.'),
  filter_labels: z.array(z.number().int().positive()).optional()
    .describe('Filter by label IDs (optional). Uses AND logic: tasks must have ALL specified labels. Example: [1, 2] returns tasks with both label 1 AND label 2.'),
  filter_assignees: z.array(z.number().int().positive()).optional()
    .describe('Filter by assignee user IDs (optional). Returns tasks assigned to any of the specified users.'),
});

export const SearchProjectsSchema = z.object({
  query: z.string().min(1)
    .describe('Search query string (required). Searches project titles and descriptions.'),
  page: z.number().int().positive().optional().default(1)
    .describe('Page number for pagination (optional, default: 1). Each page returns up to 50 projects.'),
  filter_archived: z.boolean().optional()
    .describe('Filter by archive status (optional). Set true for archived only, false for active only, omit for all.'),
});

export const GetMyTasksSchema = z.object({
  page: z.number().int().positive().optional().default(1)
    .describe('Page number for pagination (optional, default: 1). Each page returns up to 50 tasks.'),
  filter_done: z.boolean().optional()
    .describe('Filter by completion status (optional). Set true for completed tasks only, false for incomplete only, omit for all.'),
  filter_priority: z.number().int().min(0).max(5).optional()
    .describe('Filter by priority level (optional, 0-5). Only tasks with this exact priority are returned.'),
});

export const GetProjectTasksSchema = z.object({
  project_id: z.number().int().positive()
    .describe('ID of the project to get tasks from (required).'),
  page: z.number().int().positive().optional().default(1)
    .describe('Page number for pagination (optional, default: 1). Each page returns up to 50 tasks.'),
  filter_done: z.boolean().optional()
    .describe('Filter by completion status (optional). Set true for completed tasks only, false for incomplete only, omit for all.'),
  filter_priority: z.number().int().min(0).max(5).optional()
    .describe('Filter by priority level (optional, 0-5). Only tasks with this exact priority are returned.'),
});

export type SearchTasksInput = z.infer<typeof SearchTasksSchema>;
export type SearchProjectsInput = z.infer<typeof SearchProjectsSchema>;
export type GetMyTasksInput = z.infer<typeof GetMyTasksSchema>;
export type GetProjectTasksInput = z.infer<typeof GetProjectTasksSchema>;

/**
 * Tool result for search operations
 */
export interface SearchToolResult {
  success: boolean;
  message: string;
  tasks?: VikunjaTask[];
  projects?: VikunjaProject[];
  total?: number;
  page?: number;
  hasMore?: boolean;
  error?: string;
}

/**
 * Search tools for MCP protocol
 */
export class SearchTools {
  constructor(
    private client: VikunjaClient,
    private rateLimiter: RateLimiter
  ) {}

  /**
   * Search tasks by query string
   */
  async searchTasks(
    input: SearchTasksInput,
    userContext: UserContext
  ): Promise<SearchToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Build query parameters
      const params: Record<string, unknown> = {
        s: input.query,
        page: input.page,
      };

      if (input.filter_done !== undefined) {
        params['filter_done'] = input.filter_done;
      }
      if (input.filter_priority !== undefined) {
        params['filter_by'] = 'priority';
        params['filter_value'] = input.filter_priority;
      }

      // Search tasks with token passed directly
      const tasks = await this.client.get<VikunjaTask[]>(
        '/api/v1/tasks/all',
        params,
        userContext.token
      );

      // Apply additional filters if needed
      let filteredTasks = tasks;
      
      if (input.filter_labels && input.filter_labels.length > 0) {
        const filterLabels = input.filter_labels;
        filteredTasks = filteredTasks.filter((task) =>
          task.labels.some((label) => filterLabels.includes(label.id))
        );
      }

      if (input.filter_assignees && input.filter_assignees.length > 0) {
        const filterAssignees = input.filter_assignees;
        filteredTasks = filteredTasks.filter((task) =>
          task.assignees.some((assignee) => filterAssignees.includes(assignee.id))
        );
      }

      logger.info('Tasks searched', {
        query: input.query,
        resultsCount: filteredTasks.length,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Found ${filteredTasks.length} tasks matching "${input.query}"`,
        tasks: filteredTasks,
        total: filteredTasks.length,
        page: input.page,
        hasMore: tasks.length === 50, // Assuming 50 per page
      };
    } catch (error) {
      logger.error('Failed to search tasks', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to search tasks',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Search projects by query string
   */
  async searchProjects(
    input: SearchProjectsInput,
    userContext: UserContext
  ): Promise<SearchToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Build query parameters
      const params: Record<string, unknown> = {
        s: input.query,
        page: input.page,
      };

      if (input.filter_archived !== undefined) {
        params['is_archived'] = input.filter_archived;
      }

      // Search projects with token passed directly
      const projects = await this.client.get<VikunjaProject[]>(
        '/api/v1/projects',
        params,
        userContext.token
      );

      logger.info('Projects searched', {
        query: input.query,
        resultsCount: projects.length,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Found ${projects.length} projects matching "${input.query}"`,
        projects,
        total: projects.length,
        page: input.page,
        hasMore: projects.length === 50, // Assuming 50 per page
      };
    } catch (error) {
      logger.error('Failed to search projects', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to search projects',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current user's assigned tasks
   */
  async getMyTasks(
    input: GetMyTasksInput,
    userContext: UserContext
  ): Promise<SearchToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Build query parameters
      const params: Record<string, unknown> = {
        page: input.page,
        filter_by: 'assignees',
        filter_value: userContext.userId,
      };

      if (input.filter_done !== undefined) {
        params['filter_done'] = input.filter_done;
      }
      if (input.filter_priority !== undefined) {
        params['filter_by'] = 'priority';
        params['filter_value'] = input.filter_priority;
      }

      // Get user's tasks with token passed directly
      const tasks = await this.client.get<VikunjaTask[]>(
        '/api/v1/tasks/all',
        params,
        userContext.token
      );

      logger.info('User tasks retrieved', {
        tasksCount: tasks.length,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Found ${tasks.length} tasks assigned to you`,
        tasks,
        total: tasks.length,
        page: input.page,
        hasMore: tasks.length === 50, // Assuming 50 per page
      };
    } catch (error) {
      logger.error('Failed to get user tasks', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to get user tasks',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get all tasks in a project
   */
  async getProjectTasks(
    input: GetProjectTasksInput,
    userContext: UserContext
  ): Promise<SearchToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Build query parameters
      const params: Record<string, unknown> = {
        page: input.page,
      };

      if (input.filter_done !== undefined) {
        params['filter_done'] = input.filter_done;
      }
      if (input.filter_priority !== undefined) {
        params['filter_by'] = 'priority';
        params['filter_value'] = input.filter_priority;
      }

      // Get project tasks with token passed directly
      const tasks = await this.client.get<VikunjaTask[]>(
        `/api/v1/projects/${input.project_id}/tasks`,
        params,
        userContext.token
      );

      logger.info('Project tasks retrieved', {
        projectId: input.project_id,
        tasksCount: tasks.length,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Found ${tasks.length} tasks in project ${input.project_id}`,
        tasks,
        total: tasks.length,
        page: input.page,
        hasMore: tasks.length === 50, // Assuming 50 per page
      };
    } catch (error) {
      logger.error('Failed to get project tasks', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to get project tasks',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
