import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SearchTools,
  SearchTasksSchema,
  GetMyTasksSchema,
} from '../../../src/tools/search.js';
import { VikunjaClient } from '../../../src/vikunja/client.js';
import { RateLimiter } from '../../../src/ratelimit/limiter.js';
import { UserContext } from '../../../src/auth/types.js';
import { VikunjaTask, VikunjaProject } from '../../../src/vikunja/types.js';

describe('Search Tools', () => {
  let searchTools: SearchTools;
  let mockClient: VikunjaClient;
  let mockRateLimiter: RateLimiter;
  let userContext: UserContext;

  const mockTask: VikunjaTask = {
    id: 1,
    title: 'Test Task',
    description: '',
    done: false,
    done_at: null,
    due_date: null,
    priority: 3,
    labels: [],
    assignees: [],
    project_id: 1,
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
    created_by: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    },
  };

  const mockProject: VikunjaProject = {
    id: 1,
    title: 'Test Project',
    description: '',
    owner: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    },
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
    is_archived: false,
    hex_color: '#ffffff',
    parent_project_id: 0,
  };

  beforeEach(() => {
    mockClient = {
      setToken: vi.fn(),
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

  describe('searchTasks', () => {
    it('should search tasks by query', async () => {
      const input = {
        query: 'test',
        page: 1,
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      const result = await searchTools.searchTasks(input, userContext);

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/tasks/all', {
        s: 'test',
        page: 1,
      }, 'test-token');
    });

    it('should apply label filters with AND logic', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_labels: [1, 2],
      };

      // Task with BOTH labels (backend filtering will return this)
      const taskWithBothLabels = {
        ...mockTask,
        labels: [
          { id: 1, title: 'Label 1', description: '', hex_color: '', created: '', updated: '' },
          { id: 2, title: 'Label 2', description: '', hex_color: '', created: '', updated: '' },
        ],
      };

      vi.mocked(mockClient.get).mockResolvedValue([taskWithBothLabels]);

      const result = await searchTools.searchTasks(input, userContext);

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks![0].labels).toHaveLength(2);
      
      // Verify correct filter string is passed to API
      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/tasks/all',
        expect.objectContaining({
          s: 'test',
          page: 1,
          filter: 'labels = 1 && labels = 2',
        }),
        'test-token'
      );
    });

    it('should validate input with Zod schema - empty query is now valid', () => {
      // Empty query is now allowed (defaults to '')
      const validInput = {
        query: '',
      };

      const result = SearchTasksSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('');
      }
    });

    it('should validate input with Zod schema - omitted query gets default', () => {
      // Omitted query defaults to ''
      const validInput = {
        filter_done: false,
      };

      const result = SearchTasksSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe(''); // Should default to empty string
      }
    });
  });

  describe('searchProjects', () => {
    it('should search projects by query', async () => {
      const input = {
        query: 'test',
        page: 1,
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockProject]);

      const result = await searchTools.searchProjects(input, userContext);

      expect(result.success).toBe(true);
      expect(result.projects).toHaveLength(1);
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/projects', {
        s: 'test',
        page: 1,
      }, 'test-token');
    });

    it('should apply archive filter', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_archived: true,
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockProject]);

      const result = await searchTools.searchProjects(input, userContext);

      expect(result.success).toBe(true);
      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/projects',
        expect.objectContaining({
          is_archived: true,
        }),
        'test-token'
      );
    });
  });

  describe('getMyTasks', () => {
    it('should get current user tasks', async () => {
      const input = {
        page: 1,
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      const result = await searchTools.getMyTasks(input, userContext);

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1);
      
      // Verify correct filter string is passed to API
      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/tasks/all',
        expect.objectContaining({
          page: 1,
          filter: `assignees in ${userContext.userId}`,
        }),
        'test-token'
      );
    });

    it('should validate input with Zod schema', () => {
      const validInput = {
        page: 1,
        filter_done: false,
      };

      const result = GetMyTasksSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe('getProjectTasks', () => {
    it('should get all tasks in a project', async () => {
      const input = {
        project_id: 1,
        page: 1,
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      const result = await searchTools.getProjectTasks(input, userContext);

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1);
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/projects/1/tasks', {
        page: 1,
      }, 'test-token');
    });

    it('should apply priority filter', async () => {
      const input = {
        project_id: 1,
        page: 1,
        filter_priority: 5,
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      const result = await searchTools.getProjectTasks(input, userContext);

      expect(result.success).toBe(true);
      
      // Verify correct filter string is passed to API
      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/projects/1/tasks',
        expect.objectContaining({
          page: 1,
          filter: 'priority = 5',
        }),
        'test-token'
      );
    });
  });

  describe('Filter String Generation', () => {
    it('should generate filter string for assignees with OR logic', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_assignees: [5, 6, 7],
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      await searchTools.searchTasks(input, userContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/tasks/all',
        expect.objectContaining({
          filter: 'assignees in 5,6,7',
        }),
        'test-token'
      );
    });

    it('should generate combined filter string with multiple filters', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_done: false,
        filter_priority: 3,
        filter_labels: [1, 2],
        filter_assignees: [5],
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      await searchTools.searchTasks(input, userContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/tasks/all',
        expect.objectContaining({
          filter: 'done = false && priority = 3 && labels = 1 && labels = 2 && assignees in 5',
        }),
        'test-token'
      );
    });

    it('should not send filter parameter when no filters provided', async () => {
      const input = {
        query: 'test',
        page: 1,
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      await searchTools.searchTasks(input, userContext);

      const callArgs = vi.mocked(mockClient.get).mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty('filter');
      expect(callArgs[1]).toEqual({
        s: 'test',
        page: 1,
      });
    });

    it('should generate filter string with single done filter', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_done: true,
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      await searchTools.searchTasks(input, userContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/tasks/all',
        expect.objectContaining({
          filter: 'done = true',
        }),
        'test-token'
      );
    });

    it('should generate filter string with single priority filter', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_priority: 5,
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      await searchTools.searchTasks(input, userContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/tasks/all',
        expect.objectContaining({
          filter: 'priority = 5',
        }),
        'test-token'
      );
    });

    it('should generate filter string with single label (no AND needed)', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_labels: [1],
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      await searchTools.searchTasks(input, userContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/tasks/all',
        expect.objectContaining({
          filter: 'labels = 1',
        }),
        'test-token'
      );
    });

    it('should generate filter string with three labels (AND logic)', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_labels: [1, 2, 3],
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      await searchTools.searchTasks(input, userContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/tasks/all',
        expect.objectContaining({
          filter: 'labels = 1 && labels = 2 && labels = 3',
        }),
        'test-token'
      );
    });

    it('should combine done and labels filters correctly', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_done: false,
        filter_labels: [10, 20],
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      await searchTools.searchTasks(input, userContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/tasks/all',
        expect.objectContaining({
          filter: 'done = false && labels = 10 && labels = 20',
        }),
        'test-token'
      );
    });

    it('should handle empty assignees array (no filter)', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_assignees: [],
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      await searchTools.searchTasks(input, userContext);

      const callArgs = vi.mocked(mockClient.get).mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty('filter');
    });

    it('should handle empty labels array (no filter)', async () => {
      const input = {
        query: 'test',
        page: 1,
        filter_labels: [],
      };

      vi.mocked(mockClient.get).mockResolvedValue([mockTask]);

      await searchTools.searchTasks(input, userContext);

      const callArgs = vi.mocked(mockClient.get).mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty('filter');
    });
  });
});
