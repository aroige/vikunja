import { z } from 'zod';
import { VikunjaClient } from '../vikunja/client.js';
import { RateLimiter } from '../ratelimit/limiter.js';
import { UserContext } from '../auth/types.js';
import { VikunjaProject } from '../vikunja/types.js';
import { logger } from '../utils/logger.js';

/**
 * Input schemas for project tools
 */
export const CreateProjectSchema = z.object({
  title: z.string().min(1).max(250)
    .describe('Project name (required, 1-250 characters). In Vikunja, "Project" is equivalent to what other tools call "workspace" or "list".'),
  description: z.string().optional()
    .describe('Project description (optional, supports Markdown). Use this to explain the project\'s purpose or goals.'),
  hex_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
    .describe('Project color as hex code including # (optional, e.g., "#FF5733"). Format: 6-character hex code with # prefix. Used for visual identification in the UI.'),
  parent_project_id: z.number().int().positive().optional()
    .describe('ID of parent project for nested organization (optional). Creates a sub-project hierarchy.'),
});

export const UpdateProjectSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the project to update.'),
  title: z.string().min(1).max(250).optional()
    .describe('New project name (optional, 1-250 characters).'),
  description: z.string().optional()
    .describe('New project description (optional, supports Markdown).'),
  hex_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
    .describe('New project color as hex code including # (optional, e.g., "#FF5733"). Format: 6-character hex code with # prefix.'),
  is_archived: z.boolean().optional()
    .describe('Archive status (optional). Set true to archive, false to unarchive. Consider using archive_project tool instead.'),
  parent_project_id: z.number().int().positive().optional()
    .describe('New parent project ID for reorganization (optional). Set to change project hierarchy.'),
});

export const DeleteProjectSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the project to permanently delete. All tasks in the project will also be deleted.'),
});

export const ArchiveProjectSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the project to archive or unarchive.'),
  archived: z.boolean()
    .describe('Archive status (required). Set true to archive (hide), false to unarchive (restore).'),
});

export const GetProjectSchema = z.object({
  id: z.number().int().positive()
    .describe('ID of the project to retrieve (required). Returns full project details including title, description, color, parent, and archived status.'),
});

export const GetAllProjectsSchema = z.object({
  page: z.number().int().positive().optional().default(1)
    .describe('Page number for pagination (optional, default: 1). Each page returns up to 50 projects.'),
  filter_archived: z.boolean().optional()
    .describe('Filter by archive status (optional). Set true for archived only, false for active only, omit for all.'),
});

export const ListProjectMembersSchema = z.object({
  project_id: z.number().int().positive()
    .describe('ID of the project to list members for (required). Returns all users who have access to this project with their permission levels.'),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type DeleteProjectInput = z.infer<typeof DeleteProjectSchema>;
export type ArchiveProjectInput = z.infer<typeof ArchiveProjectSchema>;
export type GetProjectInput = z.infer<typeof GetProjectSchema>;
export type GetAllProjectsInput = z.infer<typeof GetAllProjectsSchema>;
export type ListProjectMembersInput = z.infer<typeof ListProjectMembersSchema>;

/**
 * Tool result for project operations
 */
export interface ProjectToolResult {
  success: boolean;
  message: string;
  project?: VikunjaProject;
  error?: string;
}

/**
 * Project management tools for MCP protocol
 */
export class ProjectTools {
  constructor(
    private client: VikunjaClient,
    private rateLimiter: RateLimiter
  ) {}

  /**
   * Create a new project
   */
  async createProject(
    input: CreateProjectInput,
    userContext: UserContext
  ): Promise<ProjectToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Create project with token passed directly
      const project = await this.client.post<VikunjaProject>(
        '/api/v1/projects',
        input,
        userContext.token
      );

      logger.info('Project created', {
        projectId: project.id,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Project "${project.title}" created successfully with ID ${project.id}`,
        project,
      };
    } catch (error) {
      logger.error('Failed to create project', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to create project',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(
    input: UpdateProjectInput,
    userContext: UserContext
  ): Promise<ProjectToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Extract ID and update data
      const { id, ...updateData } = input;

      // Update project with token passed directly
      const project = await this.client.put<VikunjaProject>(
        `/api/v1/projects/${id}`,
        updateData,
        userContext.token
      );

      logger.info('Project updated', {
        projectId: project.id,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Project "${project.title}" updated successfully`,
        project,
      };
    } catch (error) {
      logger.error('Failed to update project', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to update project',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(
    input: DeleteProjectInput,
    userContext: UserContext
  ): Promise<ProjectToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Delete project with token passed directly
      await this.client.delete(`/api/v1/projects/${input.id}`, userContext.token);

      logger.info('Project deleted', {
        projectId: input.id,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Project with ID ${input.id} deleted successfully`,
      };
    } catch (error) {
      logger.error('Failed to delete project', { error, userId: userContext.userId });
      return {
        success: false,
        message: 'Failed to delete project',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Archive or unarchive a project
   */
  async archiveProject(
    input: ArchiveProjectInput,
    userContext: UserContext
  ): Promise<ProjectToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Archive/unarchive project with token passed directly
      const project = await this.client.put<VikunjaProject>(
        `/api/v1/projects/${input.id}`,
        { is_archived: input.archived },
        userContext.token
      );

      logger.info('Project archive status changed', {
        projectId: project.id,
        archived: input.archived,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Project "${project.title}" ${input.archived ? 'archived' : 'unarchived'} successfully`,
        project,
      };
    } catch (error) {
      logger.error('Failed to change project archive status', {
        error,
        userId: userContext.userId,
      });
      return {
        success: false,
        message: 'Failed to change project archive status',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get a single project by ID
   */
  async getProject(
    input: GetProjectInput,
    userContext: UserContext
  ): Promise<ProjectToolResult> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Retrieve project with token passed directly
      const project = await this.client.get<VikunjaProject>(
        `/api/v1/projects/${input.id}`,
        undefined, // no query params
        userContext.token
      );

      logger.info('Project retrieved', {
        projectId: project.id,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Project "${project.title}" retrieved successfully`,
        project,
      };
    } catch (error) {
      logger.error('Failed to retrieve project', {
        error,
        projectId: input.id,
        userId: userContext.userId,
      });

      // Handle specific error cases
      let message = 'Failed to retrieve project';
      if (error instanceof Error) {
        const statusCode = (error as any).response?.status;
        if (statusCode === 404) {
          message = `Project with ID ${input.id} not found`;
        } else if (statusCode === 403) {
          message = 'You do not have permission to access this project';
        }
      }

      return {
        success: false,
        message,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get all projects with optional filtering
   */
  async getAllProjects(
    input: GetAllProjectsInput,
    userContext: UserContext
  ): Promise<ProjectToolResult & { projects?: VikunjaProject[]; total?: number; page?: number; hasMore?: boolean }> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Build query parameters
      const params: Record<string, any> = {
        page: input.page || 1,
      };
      
      if (input.filter_archived !== undefined) {
        params['is_archived'] = input.filter_archived;
      }

      // Retrieve projects list with token passed directly
      const projects = await this.client.get<VikunjaProject[]>(
        `/api/v1/projects`,
        params,
        userContext.token
      );

      logger.info('Projects list retrieved', {
        count: projects.length,
        page: input.page || 1,
        userId: userContext.userId,
      });

      // Heuristic for hasMore: if we got 50 results, there might be more
      const hasMore = projects.length >= 50;
      const page = input.page || 1;

      return {
        success: true,
        message: `Found ${projects.length} projects`,
        projects,
        total: projects.length,
        page,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to retrieve projects list', {
        error,
        userId: userContext.userId,
      });

      return {
        success: false,
        message: 'Failed to retrieve projects list',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all members (users) who have access to a project
   */
  async listProjectMembers(
    input: ListProjectMembersInput,
    userContext: UserContext
  ): Promise<ProjectToolResult & { members?: Array<{ user: any; access_level: number }> }> {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(userContext.token);

      // Retrieve project members/shares
      // Vikunja API endpoint: GET /projects/{id}/projectusers
      const members = await this.client.get<Array<{ user: any; access_level: number }>>(
        `/api/v1/projects/${input.project_id}/projectusers`,
        {},
        userContext.token
      );

      logger.info('Project members retrieved', {
        projectId: input.project_id,
        memberCount: members.length,
        userId: userContext.userId,
      });

      return {
        success: true,
        message: `Found ${members.length} members for project ${input.project_id}`,
        members,
      };
    } catch (error) {
      logger.error('Failed to retrieve project members', {
        error,
        projectId: input.project_id,
        userId: userContext.userId,
      });

      return {
        success: false,
        message: `Failed to retrieve members for project ${input.project_id}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
