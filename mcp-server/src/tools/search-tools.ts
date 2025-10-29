/**
 * search-tools.ts
 * 
 * Enhanced search tools for AI agent workflows implementing search-before-action pattern.
 * Part of Phase 3: User Story 1 - Task Completion MVP (T017)
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
import { ToolResult, SuccessResult, ClarificationResult } from '../models/tool-result.js';
import { TaskSummary } from '../models/task.js';

/**
 * Input schema for search_tasks tool (MCP contract)
 */
export const SearchTasksAgentSchema = z.object({
  keywords: z.string().min(1).max(200).optional()
    .describe('Keywords to search in task titles and descriptions. Optional - omit to get all tasks matching other filters.'),
  projectId: z.number().int().positive().optional()
    .describe('Filter by specific project ID (optional)'),
  labels: z.array(z.string()).max(10).optional()
    .describe('Filter by label names (optional)'),
  status: z.enum(['done', 'incomplete', 'all']).default('incomplete')
    .describe('Filter by completion status'),
  dueDate: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }).optional()
    .describe('Filter by due date range (optional)'),
  userId: z.string()
    .describe('User context (required for security)'),
});

export type SearchTasksAgentInput = z.infer<typeof SearchTasksAgentSchema>;

/**
 * Search tasks result data structure
 */
export interface SearchTasksData {
  tasks: TaskSummary[];
  totalCount: number;
  query: string;
}

/**
 * Enhanced search tools for AI agent interactions
 */
export class SearchToolsAgent {
  constructor(
    private client: VikunjaClient,
    private rateLimiter: RateLimiter
  ) {}

  /**
   * T017: Search tasks tool with proper ToolResult responses
   * 
   * Implements search-before-action pattern per MCP contract.
   * Returns structured results with status codes for agent handling.
   * 
   * @param input - Search parameters
   * @param userContext - User authentication context
   * @returns ToolResult with search results or clarification request
   */
  async searchTasks(
    input: SearchTasksAgentInput,
    userContext: UserContext
  ): Promise<ToolResult<SearchTasksData>> {
    const traceId = generateTraceId(userContext.userId.toString());
    
    logger.info('Executing search_tasks', {
      traceId,
      userId: userContext.userId,
      keywords: input.keywords,
      projectId: input.projectId,
      status: input.status,
    });

    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Build filter parameters
      const filterParts: string[] = [];
      
      // Status filter
      if (input.status === 'done') {
        filterParts.push('done = true');
      } else if (input.status === 'incomplete') {
        filterParts.push('done = false');
      }
      
      // Project filter
      if (input.projectId) {
        filterParts.push(`project = ${input.projectId}`);
      }

      // Resolve label names to IDs and add to filter
      if (input.labels && input.labels.length > 0) {
        const labelIds: number[] = [];
        const notFoundLabels: string[] = [];

        for (const labelTitle of input.labels) {
          const labelsResponse = await this.client.get<Array<{ id: number; title: string }>>(
            '/api/v1/labels',
            { search: labelTitle, page: 1, page_size: 50 },
            userContext.token
          );

          const matchingLabel = labelsResponse.find(
            (label) => label.title.toLowerCase() === labelTitle.toLowerCase()
          );

          if (matchingLabel) {
            labelIds.push(matchingLabel.id);
          } else {
            notFoundLabels.push(labelTitle);
          }
        }

        if (notFoundLabels.length > 0) {
          const result: ClarificationResult<SearchTasksData> = {
            status: 'needs_clarification',
            message: `Label(s) not found: ${notFoundLabels.join(', ')}`,
            suggestedActions: [
              'Check label names for typos',
              'Use get_all_labels to see available labels',
              'Try searching without label filter',
            ],
            traceId,
          };
          return result;
        }

        // Add label filters (AND logic - tasks must have ALL labels)
        for (const labelId of labelIds) {
          filterParts.push(`labels = ${labelId}`);
        }
      }

      // Due date filter
      if (input.dueDate) {
        if (input.dueDate.from) {
          const fromDate = new Date(input.dueDate.from).toISOString();
          filterParts.push(`due_date >= "${fromDate}"`);
        }
        if (input.dueDate.to) {
          const toDate = new Date(input.dueDate.to).toISOString();
          filterParts.push(`due_date <= "${toDate}"`);
        }
      }

      const filterString = filterParts.join(' && ');

      // Build query parameters
      const params: Record<string, unknown> = {
        page: 1,
      };

      // Add keywords if provided
      if (input.keywords) {
        params['s'] = input.keywords;
      }

      if (filterString) {
        params['filter'] = filterString;
      }

      // Search tasks via Vikunja API
      const tasks = await this.client.get<VikunjaTask[]>(
        '/api/v1/tasks/all',
        params,
        userContext.token
      );

      // Handle no matches
      if (tasks.length === 0) {
        const searchDesc = input.keywords 
          ? `matching '${input.keywords}'` 
          : 'with the specified filters';
        
        const result: ClarificationResult<SearchTasksData> = {
          status: 'needs_clarification',
          message: `I couldn't find any tasks ${searchDesc}`,
          suggestedActions: [
            'Check if the task exists in a specific project',
            input.keywords ? 'Verify the task name or try different keywords' : 'Try adjusting your filters',
            'Check if the task is already completed (use status: "all")',
          ],
          traceId,
        };
        
        logger.info('Search returned no matches', { traceId, keywords: input.keywords });
        return result;
      }

      // Convert to TaskSummary format
      const taskSummaries: TaskSummary[] = await Promise.all(
        tasks.map((task: VikunjaTask) => this.convertToTaskSummary(task, userContext.token))
      );

      // Success: Return matching tasks
      const result: SuccessResult<SearchTasksData> = {
        status: 'success',
        message: `Found ${taskSummaries.length} matching task${taskSummaries.length === 1 ? '' : 's'}`,
        data: {
          tasks: taskSummaries,
          totalCount: taskSummaries.length,
          query: input.keywords || '', // Empty string if no keywords provided
        },
        traceId,
      };

      logger.info('Search completed successfully', {
        traceId,
        matchCount: taskSummaries.length,
      });

      return result;

    } catch (error) {
      logger.error('Search failed', {
        traceId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: 'error',
        message: 'Failed to search tasks. Please try again.',
        suggestedActions: [
          'Check your connection to Vikunja',
          'Verify your permissions',
          'Try with simpler search keywords',
        ],
        traceId,
      };
    }
  }

  /**
   * Convert VikunjaTask to TaskSummary format
   * 
   * @param task - Vikunja task entity
   * @param token - Authentication token for fetching project title
   * @returns TaskSummary for agent consumption
   */
  private async convertToTaskSummary(task: VikunjaTask, token: string): Promise<TaskSummary> {
    // Fetch project title if needed
    let projectTitle: string | undefined;
    try {
      const project = await this.client.get<{ id: number; title: string }>(
        `/api/v1/projects/${task.project_id}`,
        undefined,
        token
      );
      projectTitle = project.title;
    } catch (error) {
      logger.warn('Failed to fetch project title', {
        taskId: task.id,
        projectId: task.project_id,
      });
      projectTitle = undefined;
    }

    const summary: TaskSummary = {
      id: task.id,
      title: task.title,
      priority: task.priority,
      done: task.done,
      projectId: task.project_id,
    };

    // Only add optional fields if they exist
    if (projectTitle !== undefined) {
      summary.project = projectTitle;
    }
    
    if (task.due_date) {
      summary.dueDate = task.due_date;
    }
    
    if (task.labels && task.labels.length > 0) {
      summary.labels = task.labels.map((l) => l.title);
    }

    return summary;
  }
}
