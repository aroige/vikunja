/**
 * User Tools Tests
 * 
 * Tests for get_user_info tool.
 * Tests verify that the tool correctly retrieves user info and filters sensitive fields.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserTools } from '../../src/tools/user.js';
import { VikunjaClient } from '../../src/vikunja/client.js';
import { RateLimiter } from '../../src/ratelimit/limiter.js';
import { UserContext } from '../../src/auth/types.js';
import type { VikunjaUser } from '../../src/vikunja/types.js';

// Mock dependencies
vi.mock('../../src/vikunja/client.js');
vi.mock('../../src/ratelimit/limiter.js');

describe('User Tools - get_user_info', () => {
  let userTools: UserTools;
  let mockClient: VikunjaClient;
  let mockRateLimiter: RateLimiter;
  let userContext: UserContext;

  // Mock user data with both safe and sensitive fields
  const mockFullUserData: any = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-10-27T00:00:00Z',
    language: 'en',
    timezone: 'America/New_York',
    overdue_tasks_reminders_enabled: true,
    // Sensitive fields that should be filtered out
    password: '$2a$10$hashedpassword',
    totp_secret: 'TOTP_SECRET_KEY',
    email_confirm_token: 'email_confirm_token_value',
    password_reset_token: 'password_reset_token_value',
  };

  // Expected safe fields only
  const expectedSafeUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-10-27T00:00:00Z',
    language: 'en',
    timezone: 'America/New_York',
    overdue_tasks_reminders_enabled: true,
  };

  beforeEach(() => {
    mockClient = new VikunjaClient();
    mockRateLimiter = new RateLimiter(null as any);
    userTools = new UserTools(mockClient, mockRateLimiter);
    
    userContext = {
      token: 'test-token-123',
      userId: 1,
      username: 'testuser',
      email: 'test@example.com',
      permissions: [],
      validatedAt: new Date(),
    };

    vi.clearAllMocks();
    
    // Mock rate limiter to always pass
    vi.spyOn(mockRateLimiter, 'checkLimit').mockResolvedValue(undefined);
  });

  // T039: Write unit test for getUserInfo success case
  it('should retrieve user info successfully', async () => {
    // Arrange
    const input = {}; // No parameters needed
    vi.spyOn(mockClient, 'get').mockResolvedValue(mockFullUserData);

    // Act
    const result = await userTools.getUserInfo(input, userContext);

    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toContain('retrieved');
    expect(result.user).toBeDefined();
    expect(result.user?.id).toBe(1);
    expect(result.user?.username).toBe('testuser');
    expect(result.user?.email).toBe('test@example.com');
    expect(result.user?.name).toBe('Test User');
    expect(mockClient.get).toHaveBeenCalledWith(
      '/api/v1/user',
      undefined,
      userContext.token
    );
    expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(userContext.token);
  });

  // T040: Write unit test verifying sensitive fields are filtered
  it('should filter out sensitive fields from user data', async () => {
    // Arrange
    const input = {};
    vi.spyOn(mockClient, 'get').mockResolvedValue(mockFullUserData);

    // Act
    const result = await userTools.getUserInfo(input, userContext);

    // Assert
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    
    // Verify safe fields are present
    expect(result.user?.id).toBe(1);
    expect(result.user?.username).toBe('testuser');
    expect(result.user?.email).toBe('test@example.com');
    expect(result.user?.name).toBe('Test User');
    expect(result.user?.created).toBe('2025-01-01T00:00:00Z');
    expect(result.user?.updated).toBe('2025-10-27T00:00:00Z');
    expect((result.user as any)?.language).toBe('en');
    expect((result.user as any)?.timezone).toBe('America/New_York');
    expect((result.user as any)?.overdue_tasks_reminders_enabled).toBe(true);
    
    // Verify sensitive fields are NOT present
    expect((result.user as any)?.password).toBeUndefined();
    expect((result.user as any)?.totp_secret).toBeUndefined();
    expect((result.user as any)?.email_confirm_token).toBeUndefined();
    expect((result.user as any)?.password_reset_token).toBeUndefined();
    
    // Verify result matches expected safe user structure
    expect(result.user).toEqual(expectedSafeUser);
  });

  // T041: Write unit test for getUserInfo UNAUTHORIZED error
  it('should handle UNAUTHORIZED error when token is invalid', async () => {
    // Arrange
    const input = {};
    const unauthorizedError = new Error('Unauthorized');
    (unauthorizedError as any).response = { status: 401 };
    vi.spyOn(mockClient, 'get').mockRejectedValue(unauthorizedError);

    // Act
    const result = await userTools.getUserInfo(input, userContext);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unauthorized');
    expect(result.error).toBeDefined();
    expect(result.user).toBeUndefined();
  });

  // T042: Write unit test for getUserInfo with API error
  it('should handle general API errors gracefully', async () => {
    // Arrange
    const input = {};
    const apiError = new Error('Internal server error');
    (apiError as any).response = { status: 500 };
    vi.spyOn(mockClient, 'get').mockRejectedValue(apiError);

    // Act
    const result = await userTools.getUserInfo(input, userContext);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to retrieve user information');
    expect(result.error).toBeDefined();
    expect(result.user).toBeUndefined();
  });

  // Additional test: Verify no parameters required
  it('should not require any input parameters', async () => {
    // Arrange
    const input = {};
    vi.spyOn(mockClient, 'get').mockResolvedValue(mockFullUserData);

    // Act
    const result = await userTools.getUserInfo(input, userContext);

    // Assert
    expect(result.success).toBe(true);
    // GetUserInfoSchema is empty object, so any empty object should be valid
  });
});
