import { z } from 'zod';
import { VikunjaClient } from '../vikunja/client.js';
import { RateLimiter } from '../ratelimit/limiter.js';
import { UserContext } from '../auth/types.js';
import { VikunjaUser } from '../vikunja/types.js';
import { logger } from '../utils/logger.js';

/**
 * Input schemas for user tools
 */
export const GetUserInfoSchema = z.object({});

export type GetUserInfoInput = z.infer<typeof GetUserInfoSchema>;

/**
 * Tool result for user operations
 */
export interface UserToolResult {
  success: boolean;
  message: string;
  user?: Partial<VikunjaUser>;
  error?: string;
}

/**
 * User information tools for MCP protocol
 */
export class UserTools {
  constructor(
    private client: VikunjaClient,
    private rateLimiter: RateLimiter
  ) {}

  /**
   * Get authenticated user information
   * Returns safe user profile fields, excluding sensitive data
   */
  async getUserInfo(
    _input: GetUserInfoInput,
    userContext: UserContext
  ): Promise<UserToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Retrieve user info from Vikunja API
      const user = await this.client.get<any>(
        '/api/v1/user',
        undefined,
        userContext.token
      );

      logger.info('User info retrieved', {
        userId: userContext.userId,
      });

      // Filter to only safe fields - explicitly exclude sensitive data
      const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        created: user.created,
        updated: user.updated,
        // Optional settings fields
        ...(user.language !== undefined && { language: user.language }),
        ...(user.timezone !== undefined && { timezone: user.timezone }),
        ...(user.overdue_tasks_reminders_enabled !== undefined && {
          overdue_tasks_reminders_enabled: user.overdue_tasks_reminders_enabled,
        }),
      };

      return {
        success: true,
        message: `User information retrieved for ${user.username}`,
        user: safeUser,
      };
    } catch (error) {
      logger.error('Failed to get user info', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: userContext.userId,
      });

      // Handle specific error cases
      let message = 'Failed to retrieve user information';
      if (error instanceof Error) {
        const statusCode = (error as any).response?.status;
        if (statusCode === 401) {
          message = 'Unauthorized - invalid or expired token';
        }
      }

      return {
        success: false,
        message,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
