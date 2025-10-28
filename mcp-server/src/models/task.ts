/**
 * task.ts
 * 
 * Task-related TypeScript interfaces matching Vikunja task entities
 * and tool-specific summary representations.
 * 
 * Created: 2025-10-28
 * Feature: 011-ai-agent-architecture
 */

/**
 * Minimal task representation for listings and confirmations
 * Used in search results, recommendations, and confirmation prompts
 */
export interface TaskSummary {
  /** Unique task identifier */
  id: number;
  
  /** Task title/description */
  title: string;
  
  /** Parent project title (optional) */
  project?: string;
  
  /** Task due date/time in ISO 8601 format (optional) */
  dueDate?: string;
  
  /** Priority level (1-5, where 5 is highest) */
  priority: number;
  
  /** Completion status */
  done: boolean;
  
  /** Associated label names (optional) */
  labels?: string[];
  
  /** Estimated task duration in minutes (optional) */
  estimatedDuration?: number;
  
  /** Project ID for filtering (optional, internal use) */
  projectId?: number;
}

/**
 * Full task entity from Vikunja API
 * Extends TaskSummary with complete task details
 */
export interface Task extends TaskSummary {
  /** Detailed task description (Markdown) */
  description?: string;
  
  /** Task creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
  
  /** Task start date (optional) */
  startDate?: string;
  
  /** Task end date (optional) */
  endDate?: string;
  
  /** Repeat configuration (optional) */
  repeatAfter?: number;
  repeatMode?: 'day' | 'week' | 'month' | 'year';
  
  /** Assigned users (optional) */
  assignees?: Array<{
    id: number;
    username: string;
  }>;
  
  /** Task creator */
  createdBy?: {
    id: number;
    username: string;
  };
  
  /** Related tasks (optional) */
  relatedTasks?: Array<{
    taskId: number;
    relationType: 'subtask' | 'parenttask' | 'related' | 'duplicateof' | 'duplicates' | 'blocking' | 'blocked' | 'precedes' | 'follows' | 'copiedfrom' | 'copiedto';
  }>;
  
  /** Attachments (optional) */
  attachments?: Array<{
    id: number;
    filename: string;
    size: number;
  }>;
  
  /** Comments count (optional) */
  commentsCount?: number;
}

/**
 * Task creation input
 */
export interface CreateTaskInput {
  /** Task title (required) */
  title: string;
  
  /** Task description (optional) */
  description?: string;
  
  /** Project ID (optional, defaults to user's default project) */
  projectId?: number;
  
  /** Due date in ISO 8601 format (optional) */
  dueDate?: string;
  
  /** Priority level 1-5 (optional, defaults to 0) */
  priority?: number;
  
  /** Label names to attach (optional) */
  labels?: string[];
  
  /** Estimated duration in minutes (optional) */
  estimatedDuration?: number;
  
  /** Start date (optional) */
  startDate?: string;
  
  /** End date (optional) */
  endDate?: string;
  
  /** Repeat configuration (optional) */
  repeatAfter?: number;
  repeatMode?: 'day' | 'week' | 'month' | 'year';
}

/**
 * Task update input (all fields optional except ID)
 */
export interface UpdateTaskInput {
  /** Task ID to update (required) */
  id: number;
  
  /** New title (optional) */
  title?: string;
  
  /** New description (optional) */
  description?: string;
  
  /** New due date (optional) */
  dueDate?: string;
  
  /** New priority (optional) */
  priority?: number;
  
  /** Completion status (optional) */
  done?: boolean;
  
  /** New labels (optional, replaces existing) */
  labels?: string[];
  
  /** New estimated duration (optional) */
  estimatedDuration?: number;
}

/**
 * Task search filters
 */
export interface TaskSearchFilters {
  /** Keywords to search in titles and descriptions */
  keywords?: string;
  
  /** Filter by project ID */
  projectId?: number;
  
  /** Filter by label names */
  labels?: string[];
  
  /** Filter by completion status */
  status?: 'done' | 'incomplete' | 'all';
  
  /** Filter by due date range */
  dueDate?: {
    from?: string;
    to?: string;
  };
  
  /** Filter by priority */
  priority?: number;
  
  /** Maximum results to return */
  limit?: number;
  
  /** User ID for security context (required) */
  userId: string;
}

/**
 * Task ranking weights for search and recommendations
 */
export interface RankingWeights {
  /** Overdue tasks score */
  overdue: number;
  
  /** Due today score */
  dueToday: number;
  
  /** Due this week score */
  dueThisWeek: number;
  
  /** Priority multiplier */
  priorityMultiplier: number;
  
  /** Keyword match bonus */
  keywordMatchBonus: number;
}

/**
 * Default ranking weights (urgency-first, priority tiebreaker)
 */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  overdue: 1000,        // Highest priority
  dueToday: 500,        // High priority
  dueThisWeek: 100,     // Medium priority
  priorityMultiplier: 10, // Priority within urgency groups
  keywordMatchBonus: 50,  // Keyword relevance boost
};
