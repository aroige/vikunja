/**
 * Tests for recurring task functionality (User Story 3)
 * These tests validate the repeat_after and repeat_mode parameters
 * for creating and updating recurring tasks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import { CreateTaskSchema, UpdateTaskSchema } from '../../src/tools/tasks.js';

describe('Recurring Task Parameters', () => {
  describe('CreateTaskSchema - repeat_after validation', () => {
    it('should accept valid weekly recurring task (repeat_after=604800)', () => {
      const input = {
        project_id: 1,
        title: 'Weekly team meeting',
        repeat_after: 604800, // 7 days in seconds
        repeat_mode: 0,
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_after).toBe(604800);
        expect(result.data.repeat_mode).toBe(0);
      }
    });

    it('should accept valid daily recurring task (repeat_after=86400)', () => {
      const input = {
        project_id: 1,
        title: 'Daily standup',
        repeat_after: 86400, // 1 day in seconds
        repeat_mode: 0,
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_after).toBe(86400);
      }
    });

    it('should accept monthly recurring with repeat_after=0 and mode=1', () => {
      const input = {
        project_id: 1,
        title: 'Monthly report on 1st',
        repeat_after: 0, // Special case for monthly mode
        repeat_mode: 1,
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_after).toBe(0);
        expect(result.data.repeat_mode).toBe(1);
      }
    });

    it('should reject negative repeat_after values', () => {
      const input = {
        project_id: 1,
        title: 'Invalid recurring task',
        repeat_after: -100,
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept repeat_after as optional (undefined)', () => {
      const input = {
        project_id: 1,
        title: 'Non-recurring task',
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_after).toBeUndefined();
      }
    });
  });

  describe('CreateTaskSchema - repeat_mode validation', () => {
    it('should accept repeat_mode=0 (default: repeat from due date)', () => {
      const input = {
        project_id: 1,
        title: 'Task with mode 0',
        repeat_after: 604800,
        repeat_mode: 0,
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_mode).toBe(0);
      }
    });

    it('should accept repeat_mode=1 (monthly: repeat on same calendar date)', () => {
      const input = {
        project_id: 1,
        title: 'Monthly task',
        repeat_after: 0,
        repeat_mode: 1,
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_mode).toBe(1);
      }
    });

    it('should accept repeat_mode=2 (from-current: repeat from completion date)', () => {
      const input = {
        project_id: 1,
        title: 'Task repeating from completion',
        repeat_after: 259200, // 3 days
        repeat_mode: 2,
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_mode).toBe(2);
      }
    });

    it('should accept repeat_mode=3 (weekdays: Monday-Friday only)', () => {
      const input = {
        project_id: 1,
        title: 'Daily standup',
        repeat_after: 86400, // 1 day
        repeat_mode: 3, // Weekdays only
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_mode).toBe(3);
      }
    });

    it('should accept repeat_mode=4 (weekends: Saturday-Sunday only)', () => {
      const input = {
        project_id: 1,
        title: 'Clean house',
        repeat_after: 86400, // 1 day
        repeat_mode: 4, // Weekends only
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_mode).toBe(4);
      }
    });

    it('should reject repeat_mode values outside 0-4 range', () => {
      const input = {
        project_id: 1,
        title: 'Invalid mode',
        repeat_after: 86400,
        repeat_mode: 5, // Invalid
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept repeat_mode as optional (undefined)', () => {
      const input = {
        project_id: 1,
        title: 'Task without mode',
        repeat_after: 86400,
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_mode).toBeUndefined();
      }
    });
  });

  describe('UpdateTaskSchema - repeat_after validation', () => {
    it('should accept valid repeat_after update', () => {
      const input = {
        id: 123,
        repeat_after: 604800,
      };

      const result = UpdateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_after).toBe(604800);
      }
    });

    it('should accept repeat_after=0 for monthly mode', () => {
      const input = {
        id: 123,
        repeat_after: 0,
        repeat_mode: 1,
      };

      const result = UpdateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject negative repeat_after in updates', () => {
      const input = {
        id: 123,
        repeat_after: -500,
      };

      const result = UpdateTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateTaskSchema - repeat_mode validation', () => {
    it('should accept all valid repeat_mode values (0, 1, 2, 3, 4)', () => {
      [0, 1, 2, 3, 4].forEach(mode => {
        const input = {
          id: 123,
          repeat_mode: mode,
        };

        const result = UpdateTaskSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.repeat_mode).toBe(mode);
        }
      });
    });

    it('should reject invalid repeat_mode values', () => {
      const input = {
        id: 123,
        repeat_mode: 5,
      };

      const result = UpdateTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Recurring Task Examples', () => {
    it('should validate weekly meeting example (repeat_after=604800, mode=0)', () => {
      const input = {
        project_id: 1,
        title: 'Weekly team meeting',
        description: 'Recurring every Monday at 10am',
        due_date: '2024-01-08T10:00:00Z',
        repeat_after: 604800, // 7 days
        repeat_mode: 0, // Repeat from due date
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate monthly report example (repeat_after=0, mode=1)', () => {
      const input = {
        project_id: 1,
        title: 'Monthly expense report',
        description: 'Submit on the 1st of each month',
        due_date: '2024-02-01T00:00:00Z',
        repeat_after: 0, // Use mode 1 logic
        repeat_mode: 1, // Monthly on same date
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate from-completion example (repeat_after=259200, mode=2)', () => {
      const input = {
        project_id: 1,
        title: 'Water plants',
        description: 'Water every 3 days after completion',
        repeat_after: 259200, // 3 days
        repeat_mode: 2, // Repeat from completion
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate weekday repeat example (repeat_after=86400, mode=3)', () => {
      const input = {
        project_id: 1,
        title: 'Daily standup',
        description: 'Team standup Monday-Friday only',
        due_date: '2024-01-08T09:00:00Z',
        repeat_after: 86400, // 1 day
        repeat_mode: 3, // Weekdays only (skips weekends)
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_mode).toBe(3);
      }
    });

    it('should validate weekend repeat example (repeat_after=86400, mode=4)', () => {
      const input = {
        project_id: 1,
        title: 'Clean house',
        description: 'Weekend chore, Saturday-Sunday only',
        due_date: '2024-01-06T10:00:00Z',
        repeat_after: 86400, // 1 day
        repeat_mode: 4, // Weekends only (skips weekdays)
      };

      const result = CreateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repeat_mode).toBe(4);
      }
    });
  });
});
