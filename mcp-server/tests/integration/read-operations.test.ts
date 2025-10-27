/**
 * Integration tests for read-only operations (get_project, get_all_projects, get_task, get_user_info)
 * Tests chained operations, rate limiting, and error handling consistency
 * 
 * Feature: 010-mcp-missing-tools
 * Phase 7: Integration Testing (T049-T052)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VikunjaClient } from '../../src/vikunja/client.js';
import { ProjectTools } from '../../src/tools/projects.js';
import { TaskTools } from '../../src/tools/tasks.js';
import { UserTools } from '../../src/tools/user.js';
import { RateLimiter } from '../../src/ratelimit/limiter.js';
import type { UserContext } from '../../src/auth/types.js';

// Mock the rate limiter module
vi.mock('../../src/ratelimit/limiter.js', () => {
  return {
    RateLimiter: vi.fn().mockImplementation(() => ({
      checkLimit: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('Read Operations Integration Tests', () => {
  let client: VikunjaClient;
  let projectTools: ProjectTools;
  let taskTools: TaskTools;
  let userTools: UserTools;
  let rateLimiter: RateLimiter;
  let userContext: UserContext;

  beforeEach(() => {
    // Mock Vikunja client
    client = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    } as any;

    // Mock rate limiter (null for integration tests since vi.mock handles it)
    rateLimiter = new RateLimiter(null as any);

    // Create tool instances
    projectTools = new ProjectTools(client, rateLimiter);
    taskTools = new TaskTools(client, rateLimiter);
    userTools = new UserTools(client, rateLimiter);

    // Standard user context with all required fields
    userContext = {
      userId: 1,
      username: 'testuser',
      email: 'test@example.com',
      token: 'valid-token-123',
      permissions: ['read', 'write'],
      validatedAt: new Date(),
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('T050 - Chained Operations', () => {
    it('should successfully chain get_user_info → get_all_projects → get_project → get_task', async () => {
      // Mock API responses for the full chain
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
        language: 'en',
        timezone: 'UTC',
        overdue_tasks_reminders_enabled: true,
      };

      const mockProjects = [
        {
          id: 100,
          title: 'My Project',
          identifier: 'PROJ',
          description: 'Test project',
          owner: { id: 1, username: 'testuser' },
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-02T00:00:00Z',
          is_archived: false,
        },
      ];

      const mockProject = {
        id: 100,
        title: 'My Project',
        identifier: 'PROJ',
        description: 'Test project with details',
        owner: { id: 1, username: 'testuser' },
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
        is_archived: false,
        position: 0,
      };

      const mockTask = {
        id: 500,
        title: 'Integration Test Task',
        description: 'Task from project 100',
        done: false,
        project_id: 100,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
        created_by: { id: 1, username: 'testuser' },
        labels: [],
        assignees: [],
        related_tasks: {},
      };

      // Setup mocks with expected URLs
      (client.get as any)
        .mockResolvedValueOnce(mockUser) // get_user_info
        .mockResolvedValueOnce(mockProjects) // get_all_projects
        .mockResolvedValueOnce(mockProject) // get_project
        .mockResolvedValueOnce(mockTask); // get_task

      // Step 1: Get user info
      const userResult = await userTools.getUserInfo({}, userContext);
      expect(userResult.success).toBe(true);
      expect(userResult.user?.username).toBe('testuser');

      // Step 2: Get all projects for this user
      const projectsResult = await projectTools.getAllProjects({}, userContext);
      expect(projectsResult.success).toBe(true);
      expect(projectsResult.projects).toHaveLength(1);
      expect(projectsResult.total).toBe(1);

      // Step 3: Get specific project details
      const firstProjectId = projectsResult.projects![0].id;
      const projectResult = await projectTools.getProject({ id: firstProjectId }, userContext);
      expect(projectResult.success).toBe(true);
      expect(projectResult.project?.id).toBe(100);

      // Step 4: Get a task from that project
      const taskResult = await taskTools.getTask({ id: 500 }, userContext);
      expect(taskResult.success).toBe(true);
      expect(taskResult.task?.project_id).toBe(100);

      // Verify all API calls were made in correct order
      expect(client.get).toHaveBeenCalledTimes(4);
      expect(client.get).toHaveBeenNthCalledWith(1, '/api/v1/user', undefined, 'valid-token-123');
      expect(client.get).toHaveBeenNthCalledWith(2, '/api/v1/projects', { page: 1 }, 'valid-token-123');
      expect(client.get).toHaveBeenNthCalledWith(3, '/api/v1/projects/100', undefined, 'valid-token-123');
      expect(client.get).toHaveBeenNthCalledWith(4, '/api/v1/tasks/500', undefined, 'valid-token-123');
    });

    it('should gracefully handle failures in chained operations', async () => {
      // Ensure rate limiter mock is set up properly
      const mockRateLimiter = rateLimiter as any;
      mockRateLimiter.checkLimit = vi.fn().mockResolvedValue(undefined);

      // Mock successful user info but failed projects fetch
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
      };

      (client.get as any)
        .mockResolvedValueOnce(mockUser)
        .mockRejectedValueOnce({
          response: { status: 500 },
          message: 'Internal server error',
        });

      // Step 1: Get user info (succeeds)
      const userResult = await userTools.getUserInfo({}, userContext);
      expect(userResult.success).toBe(true);

      // Step 2: Get all projects (fails)
      const projectsResult = await projectTools.getAllProjects({}, userContext);
      expect(projectsResult.success).toBe(false);
      expect(projectsResult.message).toContain('Failed to retrieve projects list');

      // Verify subsequent operations can still proceed independently
      const mockProject = {
        id: 200,
        title: 'Direct Project Access',
        identifier: 'DIRECT',
        owner: { id: 1, username: 'testuser' },
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
        is_archived: false,
      };

      (client.get as any).mockResolvedValueOnce(mockProject);

      const directProjectResult = await projectTools.getProject({ id: 200 }, userContext);
      expect(directProjectResult.success).toBe(true);
      expect(directProjectResult.project?.id).toBe(200);
    });
  });

  describe('T051 - Rate Limiting Across Tools', () => {
    it('should enforce rate limits consistently across all read operations', async () => {
      // Mock rate limiter to throw on 5th call
      let callCount = 0;
      const mockRateLimiter = rateLimiter as any;
      mockRateLimiter.checkLimit = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount >= 5) {
          const error: any = new Error('Rate limit exceeded');
          error.statusCode = 429;
          throw error;
        }
      });

      const mockResponse = { id: 1, data: 'test' };
      (client.get as any).mockResolvedValue(mockResponse);

      // Make 4 successful calls across different tools
      await userTools.getUserInfo({}, userContext);
      await projectTools.getAllProjects({}, userContext);
      await projectTools.getProject({ id: 1 }, userContext);
      await taskTools.getTask({ id: 1 }, userContext);

      expect(callCount).toBe(4);

      // 5th call should hit rate limit - error message may vary by tool
      const result = await userTools.getUserInfo({}, userContext);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to retrieve user information');
      expect(callCount).toBe(5);
    });

    it('should allow operations after rate limit window expires', async () => {
      let callCount = 0;
      const mockRateLimiter = rateLimiter as any;
      mockRateLimiter.checkLimit = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First call hits limit
          const error: any = new Error('Rate limit exceeded');
          error.statusCode = 429;
          throw error;
        }
        // Second call succeeds (simulating expired window)
      });

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
      };

      (client.get as any).mockResolvedValue(mockUser);

      // First call hits rate limit
      const firstResult = await userTools.getUserInfo({}, userContext);
      expect(firstResult.success).toBe(false);
      expect(firstResult.message).toContain('Failed to retrieve user information');

      // Second call succeeds (window expired)
      const secondResult = await userTools.getUserInfo({}, userContext);
      expect(secondResult.success).toBe(true);
      expect(callCount).toBe(2);
    });
  });

  describe('T052 - Error Handling Consistency', () => {
    it('should handle 404 errors consistently across all tools', async () => {
      // Ensure rate limiter mock is set up properly
      const mockRateLimiter = rateLimiter as any;
      mockRateLimiter.checkLimit = vi.fn().mockResolvedValue(undefined);

      const notFoundError: any = new Error('Not found');
      notFoundError.response = { status: 404 };

      (client.get as any).mockRejectedValue(notFoundError);

      // Test 404 handling in get_project
      const projectResult = await projectTools.getProject({ id: 999 }, userContext);
      expect(projectResult.success).toBe(false);
      expect(projectResult.message).toContain('Project with ID 999 not found');

      // Test 404 handling in get_task
      const taskResult = await taskTools.getTask({ id: 888 }, userContext);
      expect(taskResult.success).toBe(false);
      expect(taskResult.message).toContain('Task with ID 888 not found');

      // get_user_info and get_all_projects don't use IDs so 404 is unexpected
      const userResult = await userTools.getUserInfo({}, userContext);
      expect(userResult.success).toBe(false);
      expect(userResult.message).toContain('Failed to retrieve user information');
    });

    it('should handle 403 errors consistently across all tools', async () => {
      // Ensure rate limiter mock is set up properly
      const mockRateLimiter = rateLimiter as any;
      mockRateLimiter.checkLimit = vi.fn().mockResolvedValue(undefined);

      const forbiddenError: any = new Error('Forbidden');
      forbiddenError.response = { status: 403 };

      (client.get as any).mockRejectedValue(forbiddenError);

      // Test 403 handling in get_project
      const projectResult = await projectTools.getProject({ id: 100 }, userContext);
      expect(projectResult.success).toBe(false);
      expect(projectResult.message).toContain('You do not have permission to access this project');

      // Test 403 handling in get_task
      const taskResult = await taskTools.getTask({ id: 200 }, userContext);
      expect(taskResult.success).toBe(false);
      expect(taskResult.message).toContain('You do not have permission to access this task');

      // Test 403 handling in get_all_projects
      const projectsResult = await projectTools.getAllProjects({}, userContext);
      expect(projectsResult.success).toBe(false);
      expect(projectsResult.message).toContain('Failed to retrieve projects list');

      // Test 403 handling in get_user_info
      const userResult = await userTools.getUserInfo({}, userContext);
      expect(userResult.success).toBe(false);
      expect(userResult.message).toContain('Failed to retrieve user information');
    });

    it('should handle 401 errors consistently across all tools', async () => {
      // Ensure rate limiter mock is set up properly
      const mockRateLimiter = rateLimiter as any;
      mockRateLimiter.checkLimit = vi.fn().mockResolvedValue(undefined);

      const unauthorizedError: any = new Error('Unauthorized');
      unauthorizedError.response = { status: 401 };

      (client.get as any).mockRejectedValue(unauthorizedError);

      // Test 401 handling in all tools
      const projectResult = await projectTools.getProject({ id: 1 }, userContext);
      expect(projectResult.success).toBe(false);
      expect(projectResult.message).toContain('Failed to retrieve project');

      const projectsResult = await projectTools.getAllProjects({}, userContext);
      expect(projectsResult.success).toBe(false);
      expect(projectsResult.message).toContain('Failed to retrieve projects list');

      const taskResult = await taskTools.getTask({ id: 1 }, userContext);
      expect(taskResult.success).toBe(false);
      expect(taskResult.message).toContain('Failed to retrieve task');

      const userResult = await userTools.getUserInfo({}, userContext);
      expect(userResult.success).toBe(false);
      // getUserInfo has specific 401 handling
      expect(userResult.message).toContain('Unauthorized - invalid or expired token');
    });

    it('should handle generic API errors consistently', async () => {
      // Ensure rate limiter mock is set up properly
      const mockRateLimiter = rateLimiter as any;
      mockRateLimiter.checkLimit = vi.fn().mockResolvedValue(undefined);

      const genericError: any = new Error('Internal server error');
      genericError.response = { status: 500 };

      (client.get as any).mockRejectedValue(genericError);

      // All tools should return generic error messages for 500 errors
      const projectResult = await projectTools.getProject({ id: 1 }, userContext);
      expect(projectResult.success).toBe(false);
      expect(projectResult.message).toContain('Failed to retrieve project');

      const projectsResult = await projectTools.getAllProjects({}, userContext);
      expect(projectsResult.success).toBe(false);
      expect(projectsResult.message).toContain('Failed to retrieve projects list');

      const taskResult = await taskTools.getTask({ id: 1 }, userContext);
      expect(taskResult.success).toBe(false);
      expect(taskResult.message).toContain('Failed to retrieve task');

      const userResult = await userTools.getUserInfo({}, userContext);
      expect(userResult.success).toBe(false);
      expect(userResult.message).toContain('Failed to retrieve user information');
    });

    it('should handle network errors consistently', async () => {
      // Ensure rate limiter mock is set up properly
      const mockRateLimiter = rateLimiter as any;
      mockRateLimiter.checkLimit = vi.fn().mockResolvedValue(undefined);

      const networkError = new Error('Network timeout');

      (client.get as any).mockRejectedValue(networkError);

      // All tools should handle network errors gracefully
      const projectResult = await projectTools.getProject({ id: 1 }, userContext);
      expect(projectResult.success).toBe(false);
      expect(projectResult.message).toContain('Failed to retrieve project');

      const projectsResult = await projectTools.getAllProjects({}, userContext);
      expect(projectsResult.success).toBe(false);
      expect(projectsResult.message).toContain('Failed to retrieve projects list');

      const taskResult = await taskTools.getTask({ id: 1 }, userContext);
      expect(taskResult.success).toBe(false);
      expect(taskResult.message).toContain('Failed to retrieve task');

      const userResult = await userTools.getUserInfo({}, userContext);
      expect(userResult.success).toBe(false);
      expect(userResult.message).toContain('Failed to retrieve user information');
    });
  });

  describe('Data Consistency', () => {
    it('should return consistent data structures across operations', async () => {
      // Ensure rate limiter mock is set up properly
      const mockRateLimiter = rateLimiter as any;
      mockRateLimiter.checkLimit = vi.fn().mockResolvedValue(undefined);

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
      };

      const mockProject = {
        id: 100,
        title: 'Test Project',
        identifier: 'TEST',
        owner: { id: 1, username: 'testuser' },
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
        is_archived: false,
      };

      const mockTask = {
        id: 200,
        title: 'Test Task',
        project_id: 100,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
        done: false,
        created_by: { id: 1, username: 'testuser' },
        labels: [],
        assignees: [],
        related_tasks: {},
      };

      (client.get as any)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce([mockProject])
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockTask);

      const userResult = await userTools.getUserInfo({}, userContext);
      const projectsResult = await projectTools.getAllProjects({}, userContext);
      const projectResult = await projectTools.getProject({ id: 100 }, userContext);
      const taskResult = await taskTools.getTask({ id: 200 }, userContext);

      // Verify user IDs are consistent
      expect(userResult.user?.id).toBe(1);
      expect(projectResult.project?.owner.id).toBe(1);
      expect(taskResult.task?.created_by.id).toBe(1);

      // Verify project IDs are consistent
      expect(projectsResult.projects?.[0].id).toBe(100);
      expect(projectResult.project?.id).toBe(100);
      expect(taskResult.task?.project_id).toBe(100);

      // Verify timestamps are present
      expect(userResult.user?.created).toBeTruthy();
      expect(projectResult.project?.created).toBeTruthy();
      expect(taskResult.task?.created).toBeTruthy();
    });
  });
});
