/**
 * T014: Search Service with Ranking Algorithm
 * 
 * Implements search and ranking logic for tasks based on:
 * - Urgency (overdue → today → this week → later)
 * - Priority (high to low within urgency groups)
 * - Relevance scoring for text queries
 * 
 * Phase 2: Foundational structure and interfaces
 * Phase 3+: Full implementation for User Story 1 (T020-T021) and User Story 2 (T032-T033)
 */

import type { VikunjaTask } from '../vikunja/types.js';
import { logger } from '../utils/logger.js';

/**
 * Urgency levels for task ranking
 */
export enum UrgencyLevel {
  OVERDUE = 4,     // Past due date
  TODAY = 3,       // Due today
  THIS_WEEK = 2,   // Due within 7 days
  LATER = 1,       // Due date beyond 1 week or no due date
}

/**
 * Ranked task with score metadata
 */
export interface RankedTask {
  task: VikunjaTask;
  urgency: UrgencyLevel;
  relevanceScore?: number;
}

/**
 * Search options for ranking algorithm
 */
export interface SearchOptions {
  /** Include urgency-based ranking */
  rankByUrgency?: boolean;
  /** Include priority-based ranking */
  rankByPriority?: boolean;
  /** Include text relevance scoring */
  rankByRelevance?: boolean;
  /** Search query for relevance scoring */
  query?: string;
  /** Maximum results to return */
  limit?: number;
}

/**
 * Search service for task filtering and ranking
 * 
 * Implements FR-006: Urgency-first ranking (overdue → today → week → later)
 * Implements FR-007: Priority tiebreaker within urgency groups
 */
export class SearchService {
  /**
   * Rank tasks by urgency and priority
   * 
   * @param tasks - Tasks to rank
   * @param options - Ranking options
   * @returns Ranked tasks in priority order
   */
  rankTasks(tasks: VikunjaTask[], options: SearchOptions = {}): RankedTask[] {
    logger.debug('Ranking tasks', { taskCount: tasks.length, options });

    // Phase 2: Return tasks as-is with placeholder urgency
    // Full implementation in Phase 4 (T032-T033)
    const ranked: RankedTask[] = tasks.map(task => {
      const result: RankedTask = {
        task,
        urgency: this.calculateUrgency(task),
      };
      
      if (options.query) {
        result.relevanceScore = 0;
      }
      
      return result;
    });
    
    return ranked;
  }

  /**
   * Calculate urgency level for a task
   * 
   * @param task - Task to evaluate
   * @returns Urgency level
   */
  private calculateUrgency(task: VikunjaTask): UrgencyLevel {
    if (!task.due_date) {
      return UrgencyLevel.LATER;
    }

    const now = new Date();
    const dueDate = new Date(task.due_date);
    const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) return UrgencyLevel.OVERDUE;
    if (daysDiff === 0) return UrgencyLevel.TODAY;
    if (daysDiff <= 7) return UrgencyLevel.THIS_WEEK;
    return UrgencyLevel.LATER;
  }

  /**
   * Calculate relevance score for a task based on search query
   * 
   * Phase 2: Stub implementation
   * Phase 3+: Full text matching with scoring (T021: multilingual support)
   * 
   * @param task - Task to score
   * @param query - Search query
   * @returns Relevance score (0-1)
   */
  calculateRelevance(task: VikunjaTask, query: string): number {
    if (!query) return 0;

    // T021: Enhanced multilingual fuzzy matching
    const queryLower = query.toLowerCase();
    const titleLower = task.title.toLowerCase();
    const descLower = (task.description || '').toLowerCase();

    // Exact match (highest score)
    if (titleLower === queryLower) return 1.0;
    
    // Title starts with query (very high)
    if (titleLower.startsWith(queryLower)) return 0.9;
    
    // Exact word match in title
    if (this.containsWord(titleLower, queryLower)) return 0.85;
    
    // Title contains query
    if (titleLower.includes(queryLower)) return 0.8;
    
    // Description starts with query
    if (descLower.startsWith(queryLower)) return 0.7;
    
    // Exact word match in description
    if (this.containsWord(descLower, queryLower)) return 0.65;
    
    // Description contains query
    if (descLower.includes(queryLower)) return 0.5;
    
    // Fuzzy match with edit distance (multilingual support)
    const titleWords = titleLower.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    
    for (const titleWord of titleWords) {
      for (const queryWord of queryWords) {
        const similarity = this.calculateWordSimilarity(titleWord, queryWord);
        if (similarity > 0.8) return 0.6;
        if (similarity > 0.7) return 0.4;
      }
    }
    
    return 0;
  }

  /**
   * Check if text contains query as a complete word
   * Supports multilingual text by using word boundaries
   * 
   * @param text - Text to search in
   * @param query - Query to search for
   * @returns True if query is found as a complete word
   */
  private containsWord(text: string, query: string): boolean {
    // Use word boundary regex for multilingual support
    const regex = new RegExp(`\\b${this.escapeRegExp(query)}\\b`, 'i');
    return regex.test(text);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calculate similarity between two words using Levenshtein distance
   * Used for fuzzy matching across languages
   * 
   * @param word1 - First word
   * @param word2 - Second word
   * @returns Similarity score (0-1)
   */
  private calculateWordSimilarity(word1: string, word2: string): number {
    const maxLength = Math.max(word1.length, word2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(word1, word2);
    return 1.0 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance (edit distance) between two strings
   * Classic dynamic programming algorithm for string similarity
   * 
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Create matrix
    const matrix: number[][] = [];
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [];
      for (let j = 0; j <= len2; j++) {
        matrix[i]![j] = 0;
      }
    }
    
    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      matrix[i]![0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0]![j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,      // deletion
          matrix[i]![j - 1]! + 1,      // insertion
          matrix[i - 1]![j - 1]! + cost // substitution
        );
      }
    }
    
    return matrix[len1]![len2]!;
  }

  /**
   * Filter tasks by text query
   * 
   * Phase 2: Basic string matching
   * Phase 3+: Enhanced with fuzzy matching and multilingual support (T021)
   * 
   * @param tasks - Tasks to filter
   * @param query - Search query
   * @returns Matching tasks
   */
  filterByQuery(tasks: VikunjaTask[], query: string): VikunjaTask[] {
    if (!query || query.trim().length === 0) {
      return tasks;
    }

    const queryLower = query.toLowerCase().trim();
    
    return tasks.filter(task => {
      const titleMatch = task.title.toLowerCase().includes(queryLower);
      const descMatch = task.description && task.description.toLowerCase().includes(queryLower);
      return titleMatch || descMatch;
    });
  }

  /**
   * Filter tasks by completion status
   * 
   * @param tasks - Tasks to filter
   * @param done - Completion status
   * @returns Filtered tasks
   */
  filterByStatus(tasks: VikunjaTask[], done: boolean): VikunjaTask[] {
    return tasks.filter(task => task.done === done);
  }

  /**
   * Filter tasks by project
   * 
   * @param tasks - Tasks to filter
   * @param projectId - Project ID
   * @returns Filtered tasks
   */
  filterByProject(tasks: VikunjaTask[], projectId: number): VikunjaTask[] {
    return tasks.filter(task => task.project_id === projectId);
  }
}

// Singleton instance
export const searchService = new SearchService();
