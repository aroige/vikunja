import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { mapVikunjaError } from '../utils/errors.js';

/**
 * Retry configuration
 */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Check if error is retryable
 */
function isRetryableError(error: AxiosError): boolean {
  // Don't retry 4xx errors (client errors)
  if (error.response && error.response.status >= 400 && error.response.status < 500) {
    return false;
  }
  // Retry network errors and 5xx errors
  return true;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Vikunja API client with connection pooling and retries
 */
export class VikunjaClient {
  private readonly axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({
      baseURL: config.vikunjaApiUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
      // Enable connection pooling
      httpAgent: new HttpAgent({ keepAlive: true }),
      httpsAgent: new HttpsAgent({ keepAlive: true }),
    });

    // Request interceptor for logging
    this.axios.interceptors.request.use(
      (config) => {
        logger.debug(`Vikunja API request: ${config.method?.toUpperCase()} ${config.url ?? ''}`);
        return config;
      },
      (error: AxiosError) => {
        logger.error('Vikunja API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.axios.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug(
          `Vikunja API response: ${response.status} ${response.config.url ?? ''}`
        );
        return response;
      },
      (error: AxiosError) => {
        logger.error('Vikunja API response error', {
          status: error.response?.status,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set authentication token (deprecated - use token parameter in API methods instead)
   * @deprecated This method causes race conditions in concurrent requests. Pass token to each API method instead.
   */
  setToken(_token: string): void {
    logger.warn('setToken() is deprecated and should not be used. Pass token to API methods instead.');
  }

  /**
   * Get request config with auth header
   */
  private getConfig(token?: string, config?: AxiosRequestConfig): AxiosRequestConfig {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return { ...config, headers };
  }

  /**
   * Perform request with retries
   */
  private async requestWithRetries<T>(
    fn: () => Promise<AxiosResponse<T>>,
    retriesLeft = MAX_RETRIES
  ): Promise<T> {
    try {
      const response = await fn();
      return response.data;
    } catch (error) {
      if (error instanceof Error && 'isAxiosError' in error) {
        const axiosError = error as AxiosError;

        // If retryable and retries left, try again
        if (isRetryableError(axiosError) && retriesLeft > 0) {
          const delay = RETRY_DELAY_MS * (MAX_RETRIES - retriesLeft + 1);
          logger.warn(
            `Retrying Vikunja API request in ${delay}ms (${retriesLeft} retries left)`
          );
          await sleep(delay);
          return this.requestWithRetries(fn, retriesLeft - 1);
        }

        // Map to MCP error
        throw mapVikunjaError({
          response: axiosError.response
            ? {
                status: axiosError.response.status,
                data: axiosError.response.data as { message?: string; code?: number },
              }
            : undefined,
          message: axiosError.message,
        });
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, params?: Record<string, unknown>, token?: string): Promise<T> {
    return this.requestWithRetries(() =>
      this.axios.get<T>(path, this.getConfig(token, { params }))
    );
  }

  /**
   * POST request
   */
  async post<T>(path: string, data?: unknown, token?: string): Promise<T> {
    return this.requestWithRetries(() =>
      this.axios.post<T>(path, data, this.getConfig(token))
    );
  }

  /**
   * PUT request
   */
  async put<T>(path: string, data?: unknown, token?: string): Promise<T> {
    return this.requestWithRetries(() =>
      this.axios.put<T>(path, data, this.getConfig(token))
    );
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, token?: string): Promise<T> {
    return this.requestWithRetries(() =>
      this.axios.delete<T>(path, this.getConfig(token))
    );
  }

  /**
   * Check Vikunja API version compatibility
   * Logs warning if version mismatch detected, continues with best-effort compatibility
   * 
   * @param token - Authentication token (optional for public /info endpoint)
   */
  async checkVersion(token?: string): Promise<void> {
    try {
      interface VikunjaInfo {
        version: string;
        [key: string]: unknown;
      }
      
      const info = await this.get<VikunjaInfo>('/api/v1/info', undefined, token);
      const expectedVersion = '0.24'; // Update as needed
      
      if (!info.version.startsWith(expectedVersion)) {
        logger.warn(
          `Vikunja API version mismatch: expected ${expectedVersion}.x, got ${info.version}. ` +
          `Some features may not work correctly.`
        );
      } else {
        logger.info(`Connected to Vikunja API ${info.version}`);
      }
    } catch (error) {
      logger.error('Failed to check Vikunja version', { error });
      // Continue anyway - version check is best-effort
    }
  }

  /**
   * Create task relation
   * 
   * Creates a relationship between two tasks.
   * Vikunja automatically creates the bidirectional inverse relation.
   * Hierarchical relations (subtask/parenttask) are validated for cycles on the server.
   * 
   * @param taskId - ID of the first task
   * @param otherTaskId - ID of the second task
   * @param relationKind - Type of relationship
   * @param token - Authentication token
   */
  async createTaskRelation(
    taskId: number,
    otherTaskId: number,
    relationKind: string,
    token?: string
  ): Promise<import('./types.js').RelationOperationResult> {
    const result = await this.put<{ message: string }>(
      `/api/v1/tasks/${taskId}/relations`,
      {
        other_task_id: otherTaskId,
        relation_kind: relationKind,
      },
      token
    );

    return {
      success: true,
      task_id: taskId,
      other_task_id: otherTaskId,
      relation_kind: relationKind as import('./types.js').RelationKind,
      message: result.message || 'Task relation created successfully. Bidirectional relation also created automatically.',
    };
  }

  /**
   * Get task relations
   * 
   * Retrieves all relations for a task, grouped by relation kind.
   * Returns both outgoing and incoming relations.
   * 
   * @param taskId - ID of the task
   * @param token - Authentication token
   */
  async getTaskRelations(
    taskId: number,
    token?: string
  ): Promise<import('./types.js').GetRelationsResponse> {
    const relations = await this.get<import('./types.js').RelationsGrouped>(
      `/api/v1/tasks/${taskId}/relations`,
      undefined,
      token
    );

    // Count total relations across all groups
    const total_count = Object.values(relations).reduce(
      (sum, group) => sum + (Array.isArray(group) ? group.length : 0),
      0
    );

    return {
      task_id: taskId,
      relations,
      total_count,
    };
  }

  /**
   * Delete task relation
   * 
   * Removes a relationship between two tasks.
   * Vikunja automatically removes the bidirectional inverse relation.
   * 
   * @param taskId - ID of the first task
   * @param otherTaskId - ID of the second task
   * @param relationKind - Type of relationship to delete
   * @param token - Authentication token
   */
  async deleteTaskRelation(
    taskId: number,
    otherTaskId: number,
    relationKind: string,
    token?: string
  ): Promise<import('./types.js').RelationOperationResult> {
    const result = await this.delete<{ message: string }>(
      `/api/v1/tasks/${taskId}/relations/${otherTaskId}/${relationKind}`,
      token
    );

    return {
      success: true,
      task_id: taskId,
      other_task_id: otherTaskId,
      relation_kind: relationKind as import('./types.js').RelationKind,
      message: result.message || 'Task relation deleted successfully. Bidirectional relation also removed automatically.',
    };
  }

  /**
   * Add comment to task
   * 
   * Creates a new comment on the specified task.
   * The comment author is determined by the authentication token.
   * 
   * @param taskId - ID of the task to comment on
   * @param commentText - Comment text content
   * @param token - Authentication token
   */
  async addTaskComment(
    taskId: number,
    commentText: string,
    token?: string
  ): Promise<import('./types.js').AddCommentResponse> {
    const comment = await this.put<import('./types.js').TaskComment>(
      `/api/v1/tasks/${taskId}/comments`,
      { comment: commentText },
      token
    );

    return {
      success: true,
      comment,
      message: 'Comment added successfully',
    };
  }

  /**
   * Get task comments
   * 
   * Retrieves all comments for a task with pagination support.
   * Comments are returned in chronological order.
   * 
   * @param taskId - ID of the task
   * @param page - Page number (default: 1)
   * @param pageSize - Number of comments per page (default: 50, max: 100)
   * @param token - Authentication token
   */
  async getTaskComments(
    taskId: number,
    page: number = 1,
    pageSize: number = 50,
    token?: string
  ): Promise<import('./types.js').GetCommentsResponse> {
    const comments = await this.get<import('./types.js').TaskComment[]>(
      `/api/v1/tasks/${taskId}/comments`,
      { page: page.toString(), per_page: pageSize.toString() },
      token
    );

    // Calculate pagination metadata
    const total = comments.length; // Note: Vikunja API may return total in headers or separate field
    const totalPages = Math.ceil(total / pageSize);

    return {
      task_id: taskId,
      comments: Array.isArray(comments) ? comments : [],
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
  }

  /**
   * Update task comment
   * 
   * Modifies the text of an existing comment.
   * Users can only update their own comments unless they have admin permissions.
   * 
   * @param taskId - ID of the task containing the comment
   * @param commentId - ID of the comment to update
   * @param commentText - New comment text
   * @param token - Authentication token
   */
  async updateTaskComment(
    taskId: number,
    commentId: number,
    commentText: string,
    token?: string
  ): Promise<import('./types.js').UpdateCommentResponse> {
    const comment = await this.post<import('./types.js').TaskComment>(
      `/api/v1/tasks/${taskId}/comments/${commentId}`,
      { comment: commentText },
      token
    );

    return {
      success: true,
      comment,
      message: 'Comment updated successfully',
    };
  }

  /**
   * Delete task comment
   * 
   * Removes a comment from a task.
   * Users can only delete their own comments unless they have admin permissions.
   * 
   * @param taskId - ID of the task containing the comment
   * @param commentId - ID of the comment to delete
   * @param token - Authentication token
   */
  async deleteTaskComment(
    taskId: number,
    commentId: number,
    token?: string
  ): Promise<import('./types.js').DeleteCommentResponse> {
    await this.delete<{ message: string }>(
      `/api/v1/tasks/${taskId}/comments/${commentId}`,
      token
    );

    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  }

  /**
   * Get all labels
   * 
   * Retrieves all labels visible to the user.
   * User sees labels on accessible tasks + labels they created.
   * Labels are project-independent (global scope).
   * 
   * @param page - Page number (default: 1)
   * @param pageSize - Number of labels per page (default: 50, max: 100)
   * @param search - Optional search filter for label title
   * @param token - Authentication token
   */
  async getAllLabels(
    page = 1,
    pageSize = 50,
    search?: string,
    token?: string
  ): Promise<import('./types.js').GetLabelsResponse> {
    const params: Record<string, string> = {
      page: page.toString(),
      per_page: pageSize.toString(),
    };

    if (search) {
      params['s'] = search;
    }

    const labels = await this.get<import('./types.js').Label[]>(
      '/api/v1/labels',
      params,
      token
    );

    const total = Array.isArray(labels) ? labels.length : 0;
    const hasNextPage = total === pageSize;

    return {
      labels: Array.isArray(labels) ? labels : [],
      total,
      page,
      page_size: pageSize,
      has_next_page: hasNextPage,
    };
  }

  /**
   * Get label details
   * 
   * Retrieves full details of a specific label by ID.
   * 
   * @param labelId - ID of the label to retrieve
   * @param token - Authentication token
   */
  async getLabel(
    labelId: number,
    token?: string
  ): Promise<import('./types.js').GetLabelResponse> {
    const label = await this.get<import('./types.js').Label>(
      `/api/v1/labels/${labelId}`,
      undefined,
      token
    );

    return {
      label,
    };
  }

  /**
   * Update label
   * 
   * Modifies label properties (title, description, hex_color).
   * Only the label creator can update it.
   * 
   * @param labelId - ID of the label to update
   * @param updates - Fields to update (at least one required)
   * @param token - Authentication token
   */
  async updateLabel(
    labelId: number,
    updates: {
      title?: string;
      description?: string;
      hex_color?: string;
    },
    token?: string
  ): Promise<import('./types.js').UpdateLabelResponse> {
    const label = await this.post<import('./types.js').Label>(
      `/api/v1/labels/${labelId}`,
      updates,
      token
    );

    return {
      success: true,
      label,
      message: 'Label updated successfully',
    };
  }

  /**
   * Delete label
   * 
   * Removes a label and detaches it from all tasks.
   * Only the label creator can delete it.
   * 
   * @param labelId - ID of the label to delete
   * @param token - Authentication token
   */
  async deleteLabel(
    labelId: number,
    token?: string
  ): Promise<import('./types.js').DeleteLabelResponse> {
    await this.delete<{ message: string }>(
      `/api/v1/labels/${labelId}`,
      token
    );

    return {
      success: true,
      label_id: labelId,
      message: 'Label deleted successfully and removed from all tasks',
    };
  }

  /**
   * Get task labels
   * 
   * Retrieves all labels attached to a specific task.
   * 
   * @param taskId - ID of the task to retrieve labels for
   * @param token - Authentication token
   */
  async getTaskLabels(
    taskId: number,
    token?: string
  ): Promise<import('./types.js').GetTaskLabelsResponse> {
    const task = await this.get<import('./types.js').VikunjaTask>(
      `/api/v1/tasks/${taskId}`,
      undefined,
      token
    );

    const labels = task.labels || [];

    return {
      task_id: taskId,
      labels,
      total_count: labels.length,
    };
  }

  /**
   * Get task attachments
   * 
   * Retrieves metadata for all files attached to a task.
   * Returns attachment details (filename, size, MIME type) without file content.
   * Used by AI agents to understand task context without downloading files.
   * 
   * @param taskId - ID of the task to retrieve attachments for
   * @param token - Authentication token
   */
  async getTaskAttachments(
    taskId: number,
    token?: string
  ): Promise<import('./types.js').GetTaskAttachmentsResponse> {
    const attachments = await this.get<import('./types.js').TaskAttachment[]>(
      `/api/v1/tasks/${taskId}/attachments`,
      undefined,
      token
    );

    return {
      success: true,
      attachments: Array.isArray(attachments) ? attachments : [],
      count: Array.isArray(attachments) ? attachments.length : 0,
    };
  }
}

