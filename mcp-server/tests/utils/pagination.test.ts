import { describe, expect, it } from 'vitest';
import {
  calculateOffset,
  createPaginatedResponse,
  validatePagination,
} from '../../src/utils/pagination.js';

describe('Pagination Utilities', () => {
  describe('createPaginatedResponse', () => {
    it('should create paginated response with has_next_page true when more pages exist', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = createPaginatedResponse(items, 100, 1, 50);

      expect(result).toEqual({
        items,
        total: 100,
        page: 1,
        page_size: 50,
        has_next_page: true, // 1 * 50 < 100
      });
    });

    it('should create paginated response with has_next_page false on last page', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = createPaginatedResponse(items, 52, 2, 50);

      expect(result).toEqual({
        items,
        total: 52,
        page: 2,
        page_size: 50,
        has_next_page: false, // 2 * 50 = 100 >= 52
      });
    });

    it('should handle single page correctly', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = createPaginatedResponse(items, 3, 1, 50);

      expect(result).toEqual({
        items,
        total: 3,
        page: 1,
        page_size: 50,
        has_next_page: false,
      });
    });

    it('should handle empty results', () => {
      const result = createPaginatedResponse([], 0, 1, 50);

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        page_size: 50,
        has_next_page: false,
      });
    });
  });

  describe('calculateOffset', () => {
    it('should calculate offset for first page', () => {
      expect(calculateOffset(1, 50)).toBe(0);
    });

    it('should calculate offset for second page', () => {
      expect(calculateOffset(2, 50)).toBe(50);
    });

    it('should calculate offset for arbitrary page', () => {
      expect(calculateOffset(5, 25)).toBe(100); // (5-1) * 25 = 100
    });

    it('should calculate offset with different page sizes', () => {
      expect(calculateOffset(3, 10)).toBe(20);
      expect(calculateOffset(3, 100)).toBe(200);
    });
  });

  describe('validatePagination', () => {
    it('should not throw for valid parameters', () => {
      expect(() => validatePagination(1, 50)).not.toThrow();
      expect(() => validatePagination(10, 100)).not.toThrow();
      expect(() => validatePagination(1, 1)).not.toThrow();
    });

    it('should throw error for page < 1', () => {
      expect(() => validatePagination(0, 50)).toThrow('Page number must be at least 1');
      expect(() => validatePagination(-1, 50)).toThrow('Page number must be at least 1');
    });

    it('should throw error for page_size < 1', () => {
      expect(() => validatePagination(1, 0)).toThrow(
        'Page size must be between 1 and 100'
      );
      expect(() => validatePagination(1, -10)).toThrow(
        'Page size must be between 1 and 100'
      );
    });

    it('should throw error for page_size > 100', () => {
      expect(() => validatePagination(1, 101)).toThrow(
        'Page size must be between 1 and 100'
      );
      expect(() => validatePagination(1, 200)).toThrow(
        'Page size must be between 1 and 100'
      );
    });

    it('should allow page_size at boundary values', () => {
      expect(() => validatePagination(1, 1)).not.toThrow();
      expect(() => validatePagination(1, 100)).not.toThrow();
    });

    it('should use default values (50, max 100)', () => {
      // Test defaults via validation
      expect(() => validatePagination(1, 50)).not.toThrow(); // Default page_size
      expect(() => validatePagination(1, 100)).not.toThrow(); // Max page_size
    });
  });
});
