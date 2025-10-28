/**
 * task-service.ts
 * 
 * Task service layer handling business logic for task operations.
 * Part of Phase 3: User Story 1 - Task Completion MVP (T020)
 * 
 * Implements validation logic for:
 * - No match scenarios
 * - Single match scenarios
 * - Multiple match scenarios
 * 
 * Created: 2025-10-28
 * Feature: 011-ai-agent-architecture
 */

import { VikunjaClient } from '../vikunja/client.js';
import { VikunjaTask } from '../vikunja/types.js';
import { logger } from '../utils/logger.js';
import { TaskSummary } from '../models/task.js';

/**
 * Search result validation outcomes
 */
export enum SearchResultType {
  NO_MATCH = 'no_match',
  SINGLE_MATCH = 'single_match',
  MULTIPLE_MATCHES = 'multiple_matches',
}

/**
 * Validated search result
 */
export interface ValidatedSearchResult {
  type: SearchResultType;
  tasks: TaskSummary[];
}

/**
 * Task service for business logic operations
 */
export class TaskService {
  constructor(private client: VikunjaClient) {}

  /**
   * T020: Validate search results and categorize by count
   * 
   * @param tasks - Search results from Vikunja
   * @returns Categorized result (no match, single, or multiple)
   */
  validateSearchResult(tasks: TaskSummary[]): ValidatedSearchResult {
    if (tasks.length === 0) {
      return {
        type: SearchResultType.NO_MATCH,
        tasks: [],
      };
    }

    if (tasks.length === 1) {
      return {
        type: SearchResultType.SINGLE_MATCH,
        tasks,
      };
    }

    return {
      type: SearchResultType.MULTIPLE_MATCHES,
      tasks,
    };
  }

  /**
   * Build clarification message for no matches
   * 
   * @param query - User's search query
   * @param context - Additional context (project, etc.)
   * @returns User-friendly clarification message
   */
  buildNoMatchMessage(query: string, context?: { projectName?: string }): string {
    let message = `I couldn't find an active task matching '${query}'`;
    
    if (context?.projectName) {
      message += ` in project '${context.projectName}'`;
    }
    
    message += ". Could you tell me which project it's in, or check if it's already completed?";
    
    return message;
  }

  /**
   * Build clarification message for multiple matches
   * 
   * @param count - Number of matches found
   * @param query - User's search query
   * @returns User-friendly clarification message
   */
  buildMultipleMatchMessage(count: number, query: string): string {
    return `I found ${count} tasks matching '${query}'. Which one did you mean?`;
  }

  /**
   * Build confirmation message for single match
   * 
   * @param task - The matched task
   * @param action - Action to be performed (e.g., "Mark this as complete")
   * @returns User-friendly confirmation message
   */
  buildConfirmationMessage(task: TaskSummary, action: string): string {
    const parts: string[] = [`I found: '${task.title}'`];
    
    if (task.project) {
      parts.push(`(${task.project}`);
      
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const formatted = this.formatDueDate(dueDate);
        parts.push(`, due ${formatted})`);
      } else {
        parts.push(')');
      }
    } else if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const formatted = this.formatDueDate(dueDate);
      parts.push(`(due ${formatted})`);
    }
    
    parts.push(`. ${action}?`);
    
    return parts.join('');
  }

  /**
   * Format due date for user display
   * 
   * @param date - Due date to format
   * @returns Human-readable date string
   */
  private formatDueDate(date: Date): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return `today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    
    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return `tomorrow ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    
    // Format as "Oct 29 9am"
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    
    return `${month} ${day} ${time}`;
  }

  /**
   * Convert VikunjaTask to TaskSummary
   * 
   * @param task - Vikunja task entity
   * @param token - Authentication token for fetching project title
   * @returns TaskSummary for agent consumption
   */
  async convertToTaskSummary(task: VikunjaTask, token: string): Promise<TaskSummary> {
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
    }

    const summary: TaskSummary = {
      id: task.id,
      title: task.title,
      priority: task.priority,
      done: task.done,
      projectId: task.project_id,
    };

    if (projectTitle) {
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
