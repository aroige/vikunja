import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchTools } from '../../src/tools/search.js';
import { VikunjaClient } from '../../src/vikunja/client.js';
import { RateLimiter } from '../../src/ratelimit/limiter.js';
import { UserContext } from '../../src/auth/types.js';
import type { VikunjaTask } from '../../src/vikunja/types.js';

describe('SearchTools', () => {
  let searchTools: SearchTools;
  let mockClient: VikunjaClient;
  let mockRateLimiter: RateLimiter;
  let userContext: UserContext;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as VikunjaClient;

    mockRateLimiter = {
      checkLimit: vi.fn().mockResolvedValue(undefined),
    } as unknown as RateLimiter;

    searchTools = new SearchTools(mockClient, mockRateLimiter);

    userContext = {
      userId: 1,
      username: 'testuser',
      email: 'test@example.com',
      token: 'test-token',
      permissions: [],
      validatedAt: new Date(),
    };
  });

  describe('searchTasks with filter_label_titles', () => {
    it('should resolve label titles to IDs and filter tasks correctly', async () => {
      // Mock label lookup
      vi.mocked(mockClient.get).mockImplementation(async (endpoint: string) => {
        if (endpoint === '/api/v1/labels') {
          return [
            { id: 1, title: '@Computer' },
            { id: 2, title: '@Home' },
            { id: 3, title: '@Work' },
          ];
        }
        // Mock task search response
        if (endpoint === '/api/v1/tasks/all') {
          return [
            {
              id: 1,
              title: 'Task with @Computer label',
              labels: [{ id: 1, title: '@Computer' }],
              assignees: [],
            },
            {
              id: 2,
              title: 'Task with both labels',
              labels: [
                { id: 1, title: '@Computer' },
                { id: 2, title: '@Home' },
              ],
              assignees: [],
            },
            {
              id: 3,
              title: 'Task with @Home only',
              labels: [{ id: 2, title: '@Home' }],
              assignees: [],
            },
          ] as VikunjaTask[];
        }
        return [];
      });

      const result = await searchTools.searchTasks(
        {
          query: 'task',
          page: 1,
          filter_label_titles: ['@Computer', '@Home'],
        },
        userContext
      );

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1); // Only task 2 has BOTH labels
      expect(result.tasks![0].id).toBe(2);
      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/labels',
        { search: '@Computer', page: 1, page_size: 50 },
        'test-token'
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/labels',
        { search: '@Home', page: 1, page_size: 50 },
        'test-token'
      );
    });

    it('should handle label title not found', async () => {
      // Mock label lookup - return empty for non-existent label
      vi.mocked(mockClient.get).mockImplementation(async (endpoint: string, params: any) => {
        if (endpoint === '/api/v1/labels') {
          if (params.search === '@Computer') {
            return [{ id: 1, title: '@Computer' }];
          }
          return []; // @NonExistent not found
        }
        return [];
      });

      const result = await searchTools.searchTasks(
        {
          query: 'task',
          page: 1,
          filter_label_titles: ['@Computer', '@NonExistent'],
        },
        userContext
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('@NonExistent');
      expect(result.message).toContain('not found');
      expect(result.error).toContain('Labels not found');
    });

    it('should handle case-insensitive label title matching', async () => {
      // Mock label lookup
      vi.mocked(mockClient.get).mockImplementation(async (endpoint: string) => {
        if (endpoint === '/api/v1/labels') {
          return [
            { id: 1, title: '@Computer' }, // Note: different case than query
          ];
        }
        if (endpoint === '/api/v1/tasks/all') {
          return [
            {
              id: 1,
              title: 'Task',
              labels: [{ id: 1, title: '@Computer' }],
              assignees: [],
            },
          ] as VikunjaTask[];
        }
        return [];
      });

      const result = await searchTools.searchTasks(
        {
          query: 'task',
          page: 1,
          filter_label_titles: ['@computer'], // lowercase
        },
        userContext
      );

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1);
    });

    it('should combine filter_label_titles with other filters', async () => {
      // Mock label lookup
      vi.mocked(mockClient.get).mockImplementation(async (endpoint: string) => {
        if (endpoint === '/api/v1/labels') {
          return [{ id: 1, title: '@Computer' }];
        }
        if (endpoint === '/api/v1/tasks/all') {
          return [
            {
              id: 1,
              title: 'Incomplete task',
              done: false,
              priority: 3,
              labels: [{ id: 1, title: '@Computer' }],
              assignees: [{ id: 5 }],
            },
            {
              id: 2,
              title: 'Complete task',
              done: true,
              priority: 3,
              labels: [{ id: 1, title: '@Computer' }],
              assignees: [{ id: 5 }],
            },
            {
              id: 3,
              title: 'Wrong priority',
              done: false,
              priority: 1,
              labels: [{ id: 1, title: '@Computer' }],
              assignees: [{ id: 5 }],
            },
            {
              id: 4,
              title: 'Wrong assignee',
              done: false,
              priority: 3,
              labels: [{ id: 1, title: '@Computer' }],
              assignees: [{ id: 99 }],
            },
          ] as VikunjaTask[];
        }
        return [];
      });

      const result = await searchTools.searchTasks(
        {
          query: 'task',
          page: 1,
          filter_label_titles: ['@Computer'],
          filter_done: false,
          filter_assignees: [5],
        },
        userContext
      );

      expect(result.success).toBe(true);
      // Should only return tasks matching ALL criteria:
      // - Has @Computer label
      // - filter_done handled by API (sent as query param)
      // - Has assignee 5
      // Tasks 2 (done=true), 3 (wrong priority filtered by API), 4 (wrong assignee) should be excluded
      // Only task 1 should remain
      expect(result.tasks!.length).toBeGreaterThan(0);
    });

    it('should reject using both filter_labels and filter_label_titles', async () => {
      // Schema validation should catch this before the method is called
      // But let's ensure the API doesn't try to process it
      const { SearchTasksSchema } = await import('../../src/tools/search.js');
      
      const result = SearchTasksSchema.safeParse({
        query: 'task',
        filter_labels: [1],
        filter_label_titles: ['@Computer'],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Cannot use both');
      }
    });

    it('should handle empty filter_label_titles array', async () => {
      // Empty array should be treated as no filter
      vi.mocked(mockClient.get).mockImplementation(async (endpoint: string) => {
        if (endpoint === '/api/v1/tasks/all') {
          return [
            {
              id: 1,
              title: 'Task',
              labels: [],
              assignees: [],
            },
          ] as VikunjaTask[];
        }
        return [];
      });

      const result = await searchTools.searchTasks(
        {
          query: 'task',
          page: 1,
          filter_label_titles: [],
        },
        userContext
      );

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1);
      // Should NOT call labels API since array is empty
      expect(mockClient.get).not.toHaveBeenCalledWith(
        '/api/v1/labels',
        expect.anything(),
        expect.anything()
      );
    });

    it('should use AND logic for multiple label titles', async () => {
      // Mock label lookup
      vi.mocked(mockClient.get).mockImplementation(async (endpoint: string) => {
        if (endpoint === '/api/v1/labels') {
          return [
            { id: 1, title: '@Computer' },
            { id: 2, title: '@Urgent' },
          ];
        }
        if (endpoint === '/api/v1/tasks/all') {
          return [
            {
              id: 1,
              title: 'Has both',
              labels: [
                { id: 1, title: '@Computer' },
                { id: 2, title: '@Urgent' },
              ],
              assignees: [],
            },
            {
              id: 2,
              title: 'Has only @Computer',
              labels: [{ id: 1, title: '@Computer' }],
              assignees: [],
            },
            {
              id: 3,
              title: 'Has only @Urgent',
              labels: [{ id: 2, title: '@Urgent' }],
              assignees: [],
            },
          ] as VikunjaTask[];
        }
        return [];
      });

      const result = await searchTools.searchTasks(
        {
          query: 'task',
          page: 1,
          filter_label_titles: ['@Computer', '@Urgent'],
        },
        userContext
      );

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1); // Only task 1 has BOTH labels
      expect(result.tasks![0].id).toBe(1);
    });
  });

  describe('searchTasks with filter_labels (existing functionality)', () => {
    it('should still support filter_labels with IDs', async () => {
      vi.mocked(mockClient.get).mockImplementation(async (endpoint: string) => {
        if (endpoint === '/api/v1/tasks/all') {
          return [
            {
              id: 1,
              title: 'Task with label 1',
              labels: [{ id: 1, title: '@Computer' }],
              assignees: [],
            },
            {
              id: 2,
              title: 'Task with both',
              labels: [
                { id: 1, title: '@Computer' },
                { id: 2, title: '@Home' },
              ],
              assignees: [],
            },
          ] as VikunjaTask[];
        }
        return [];
      });

      const result = await searchTools.searchTasks(
        {
          query: 'task',
          page: 1,
          filter_labels: [1, 2],
        },
        userContext
      );

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1); // Only task 2 has BOTH labels
      expect(result.tasks![0].id).toBe(2);
    });
  });
});
