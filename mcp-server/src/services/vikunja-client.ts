/**
 * T013: Vikunja API Client Wrapper
 * 
 * Service layer wrapper around the Vikunja client providing:
 * - Simplified task operations with authentication
 * - Error handling and logging with trace IDs
 * - Type-safe interfaces matching the data model
 * 
 * Note: This is a Phase 2 foundational module. Actual search, create, update methods
 * will be implemented in Phase 3+ when building the MCP tools. This establishes the
 * pattern and structure for the service layer.
 */

import { VikunjaClient } from '../vikunja/client.js';
import { logger } from '../utils/logger.js';
import { generateTraceId } from '../utils/trace-id.js';

/**
 * Task filter parameters for search operations
 * (To be fully implemented in T014: search service)
 */
export interface TaskFilter {
  /** Search query string */
  query?: string;
  /** Filter by project ID */
  projectId?: number;
  /** Filter by completion status */
  done?: boolean;
  /** Filter by priority (1-5) */
  priority?: number;
  /** Filter tasks due before this date */
  dueBefore?: Date;
  /** Filter tasks due after this date */
  dueAfter?: Date;
  /** Filter by assigned user ID */
  assigneeId?: number;
  /** Filter by label IDs */
  labelIds?: number[];
  /** Sort field */
  sortBy?: 'priority' | 'dueDate' | 'created' | 'updated';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Maximum results to return */
  limit?: number;
}

/**
 * Service class for Vikunja API operations
 * 
 * This is a thin wrapper that adds:
 * - Trace ID generation for request correlation
 * - Structured logging with userId context
 * - Error handling consistency
 * 
 * Actual business logic (search ranking, filtering, etc.) will be added in Phase 3+.
 */
export class VikunjaService {
  private client: VikunjaClient;

  constructor() {
    this.client = new VikunjaClient();
  }

  /**
   * Get underlying Vikunja client for direct access
   * (Used by tools until full service methods are implemented)
   */
  getClient(): VikunjaClient {
    return this.client;
  }

  /**
   * Generate a trace ID for request correlation
   */
  generateTraceId(userId: string): string {
    return generateTraceId(userId);
  }

  /**
   * Log an operation with standardized context
   */
  logOperation(
    operation: string,
    userId: string,
    traceId: string,
    metadata?: Record<string, unknown>
  ): void {
    logger.info(operation, {
      userId,
      traceId,
      ...metadata,
    });
  }

  /**
   * Log an error with standardized context
   */
  logError(
    operation: string,
    userId: string,
    traceId: string,
    error: unknown,
    metadata?: Record<string, unknown>
  ): void {
    logger.error(operation, {
      userId,
      traceId,
      error: error instanceof Error ? error.message : String(error),
      ...metadata,
    });
  }
}

// Singleton instance
export const vikunjaService = new VikunjaService();
