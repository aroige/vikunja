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
  query: z.string().optional().default('')
    .describe('Search query string (optional, default: empty string for no text search). Searches task titles and descriptions. Use empty string when filtering by labels, priority, or status only without text search.'),
  page: z.number().int().positive().optional().default(1)
    .describe('Page number for pagination (optional, default: 1). Each page returns up to 50 tasks.'),
  filter_done: z.boolean().optional()
    .describe('Filter by completion status (optional). Set true for completed tasks only, false for incomplete only, omit for all.'),
  filter_priority: z.number().int().min(0).max(5).optional()
    .describe('Filter by priority level (optional, 0-5). Only tasks with this exact priority are returned.'),
  filter_labels: z.array(z.number().int().positive()).optional()
    .describe('Filter by label IDs (optional). Uses AND logic: tasks must have ALL specified labels. Example: [1, 2] returns tasks with both label 1 AND label 2. Use filter_label_titles if you only know label names.'),
  filter_label_titles: z.array(z.string()).optional()
    .describe('Filter by label titles/names (optional, alternative to filter_labels). Automatically looks up label IDs by exact title match. Uses AND logic like filter_labels. Example: ["@Computer", "@Home"] for tasks with both labels. Cannot be used together with filter_labels.'),
  filter_assignees: z.array(z.number().int().positive()).optional()
    .describe('Filter by assignee user IDs (optional). Returns tasks assigned to any of the specified users.'),
})
  .refine(
    (data) => !(data.filter_labels && data.filter_label_titles),
    { message: 'Cannot use both filter_labels and filter_label_titles. Choose one.' }
  );

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
 * Build Vikunja filter string from search parameters
 * 
 * Constructs a filter string using Vikunja's filter syntax that gets processed
 * by the backend for efficient database filtering. This is more efficient than
 * client-side filtering as it leverages database indexes and EXISTS subqueries.
 * 
 * Filter syntax:
 * - Operators: =, !=, >, >=, <, <=, like, in, not in
 * - Boolean: && (AND), || (OR), () for grouping
 * - Subtables (labels, assignees): Use EXISTS subqueries automatically
 * 
 * **Label Filter Logic**:
 * - Single label: "labels = 1" (tasks with label 1)
 * - Multiple labels (AND): "labels = 1 && labels = 2" (tasks with BOTH labels)
 * - Multiple labels (OR): "labels in 1,2,3" (tasks with label 1 OR 2 OR 3)
 * 
 * This function implements AND logic for multiple labels to match the
 * filter_labels parameter behavior documented in the schema.
 * 
 * Examples:
 * - "done = false"
 * - "priority = 5"
 * - "labels = 1 && labels = 2" (tasks with BOTH label 1 AND label 2)
 * - "done = false && labels = 1" (incomplete tasks with label 1)
 * - "assignees in 5" (tasks assigned to user 5)
 * 
 * @param input - Search parameters from tool input
 * @param labelIds - Resolved label IDs (from filter_labels or filter_label_titles)
 * @returns Vikunja filter string, or empty string if no filters
 */
function buildFilterString(input: SearchTasksInput, labelIds?: number[]): string {
  const filterParts: string[] = [];

  // Done status filter
  if (input.filter_done !== undefined) {
    filterParts.push(`done = ${input.filter_done}`);
  }

  // Priority filter
  if (input.filter_priority !== undefined) {
    filterParts.push(`priority = ${input.filter_priority}`);
  }

  // Label filters with AND logic (tasks must have ALL specified labels)
  // Use separate "labels = X" conditions for each label, joined with &&
  if (labelIds && labelIds.length > 0) {
    for (const labelId of labelIds) {
      filterParts.push(`labels = ${labelId}`);
    }
  }

  // Assignee filters with OR logic (tasks assigned to ANY of the specified users)
  // Use "assignees in X,Y,Z" for OR logic
  if (input.filter_assignees && input.filter_assignees.length > 0) {
    filterParts.push(`assignees in ${input.filter_assignees.join(',')}`);
  }

  // Combine all filters with AND logic
  return filterParts.join(' && ');
}

/**
 * Build filter string for getMyTasks (assignee + optional filters)
 */
function buildMyTasksFilterString(input: GetMyTasksInput, userId: number): string {
  const filterParts: string[] = [];

  // Always filter by current user as assignee
  filterParts.push(`assignees in ${userId}`);

  // Done status filter
  if (input.filter_done !== undefined) {
    filterParts.push(`done = ${input.filter_done}`);
  }

  // Priority filter
  if (input.filter_priority !== undefined) {
    filterParts.push(`priority = ${input.filter_priority}`);
  }

  return filterParts.join(' && ');
}

/**
 * Build filter string for getProjectTasks (done + priority filters)
 */
function buildProjectTasksFilterString(input: GetProjectTasksInput): string {
  const filterParts: string[] = [];

  // Done status filter
  if (input.filter_done !== undefined) {
    filterParts.push(`done = ${input.filter_done}`);
  }

  // Priority filter
  if (input.filter_priority !== undefined) {
    filterParts.push(`priority = ${input.filter_priority}`);
  }

  return filterParts.join(' && ');
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

      // Resolve label titles to IDs if filter_label_titles provided
      let resolvedLabelIds: number[] | undefined;
      if (input.filter_label_titles && input.filter_label_titles.length > 0) {
        resolvedLabelIds = [];
        const notFoundLabels: string[] = [];

        for (const labelTitle of input.filter_label_titles) {
          // Search for label by exact title match
          const labelsResponse = await this.client.get<Array<{ id: number; title: string }>>(
            '/api/v1/labels',
            { search: labelTitle, page: 1, page_size: 50 },
            userContext.token
          );

          // Find exact match (search is case-insensitive partial match, so we need exact match)
          const matchingLabel = labelsResponse.find(
            (label) => label.title.toLowerCase() === labelTitle.toLowerCase()
          );

          if (matchingLabel) {
            resolvedLabelIds.push(matchingLabel.id);
          } else {
            notFoundLabels.push(labelTitle);
          }
        }

        if (notFoundLabels.length > 0) {
          logger.warn('Label titles not found', {
            notFoundLabels,
            userId: userContext.userId,
          });
          return {
            success: false,
            message: `Label title(s) not found: ${notFoundLabels.join(', ')}. Use get_all_labels to see available labels.`,
            error: `Labels not found: ${notFoundLabels.join(', ')}`,
          };
        }
      }

      // Combine resolved label IDs with any filter_labels provided
      const labelIdsToFilter = input.filter_labels || resolvedLabelIds;

      // Build Vikunja filter string for backend filtering
      const filterString = buildFilterString(input, labelIdsToFilter);

      // Build query parameters
      const params: Record<string, unknown> = {
        s: input.query,
        page: input.page,
      };

      // Add filter parameter if we have any filters
      if (filterString) {
        params['filter'] = filterString;
      }

      // Search tasks with token passed directly - backend handles ALL filtering
      const tasks = await this.client.get<VikunjaTask[]>(
        '/api/v1/tasks/all',
        params,
        userContext.token
      );

      logger.info('Tasks searched', {
        query: input.query,
        filter: filterString,
        resultsCount: tasks.length,
        labelTitlesResolved: input.filter_label_titles,
        labelIdsFiltered: labelIdsToFilter,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Found ${tasks.length} tasks matching "${input.query}"`,
        tasks: tasks,
        total: tasks.length,
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

      // Build Vikunja filter string for backend filtering
      const filterString = buildMyTasksFilterString(input, userContext.userId);

      // Build query parameters
      const params: Record<string, unknown> = {
        page: input.page,
      };

      // Add filter parameter
      if (filterString) {
        params['filter'] = filterString;
      }

      // Get user's tasks with token passed directly - backend handles ALL filtering
      const tasks = await this.client.get<VikunjaTask[]>(
        '/api/v1/tasks/all',
        params,
        userContext.token
      );

      logger.info('User tasks retrieved', {
        filter: filterString,
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

      // Build Vikunja filter string for backend filtering
      const filterString = buildProjectTasksFilterString(input);

      // Build query parameters
      const params: Record<string, unknown> = {
        page: input.page,
      };

      // Add filter parameter if we have any filters
      if (filterString) {
        params['filter'] = filterString;
      }

      // Get project tasks with token passed directly - backend handles ALL filtering
      const tasks = await this.client.get<VikunjaTask[]>(
        `/api/v1/projects/${input.project_id}/tasks`,
        params,
        userContext.token
      );

      logger.info('Project tasks retrieved', {
        projectId: input.project_id,
        filter: filterString,
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
