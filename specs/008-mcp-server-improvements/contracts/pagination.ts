/**
 * Pagination Contract
 * 
 * Shared pagination utilities and types for tools returning large collections.
 * Default: page_size=50, maximum: 100 per page.
 */

import { z } from 'zod';

/**
 * Pagination Parameters Schema
 * Optional pagination with sensible defaults
 */
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().optional().default(1)
    .describe("Page number (default: 1, minimum: 1)"),
  page_size: z.number().int().min(1).max(100).optional().default(50)
    .describe("Items per page (default: 50, minimum: 1, maximum: 100)")
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * Paginated Response Wrapper
 * Generic type for paginated collections
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
}

/**
 * Calculate pagination metadata
 * 
 * @param items - Array of items for current page
 * @param total - Total number of items across all pages
 * @param page - Current page number
 * @param page_size - Items per page
 * @returns Paginated response with metadata
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  page_size: number
): PaginatedResponse<T> {
  const has_next_page = (page * page_size) < total;
  
  return {
    items,
    total,
    page,
    page_size,
    has_next_page
  };
}

/**
 * Calculate offset for database queries
 * 
 * @param page - Page number (1-indexed)
 * @param page_size - Items per page
 * @returns Zero-indexed offset for database queries
 */
export function calculateOffset(page: number, page_size: number): number {
  return (page - 1) * page_size;
}

/**
 * Validate pagination parameters
 * Throws error if parameters are invalid
 * 
 * @param page - Page number
 * @param page_size - Items per page
 */
export function validatePagination(page: number, page_size: number): void {
  if (page < 1) {
    throw new Error('Page number must be at least 1');
  }
  
  if (page_size < 1 || page_size > 100) {
    throw new Error('Page size must be between 1 and 100');
  }
}
