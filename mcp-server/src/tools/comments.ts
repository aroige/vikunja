import { z } from 'zod';
import { VikunjaClient } from '../vikunja/client.js';
import { formatPermissionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { 
  AddCommentResponse, 
  GetCommentsResponse, 
  UpdateCommentResponse, 
  DeleteCommentResponse 
} from '../vikunja/types.js';

/**
 * Input schemas for task comment tools
 */

export const AddTaskCommentSchema = z.object({
  task_id: z.number().int().positive()
    .describe('ID of the task to add comment to. You must have read access to the task to add comments.'),
  comment: z.string().min(1)
    .describe('Comment text content (required, non-empty). Supports plain text. The comment author is determined by your authentication token.'),
});

export const GetTaskCommentsSchema = z.object({
  task_id: z.number().int().positive()
    .describe('ID of the task to retrieve comments for. Returns comments in chronological order with author information.'),
  page: z.number().int().positive().optional().default(1)
    .describe('Page number for pagination (default: 1, minimum: 1). Use this for tasks with many comments.'),
  page_size: z.number().int().min(1).max(100).optional().default(50)
    .describe('Number of comments per page (default: 50, minimum: 1, maximum: 100). Adjust based on expected comment count.'),
});

export const UpdateTaskCommentSchema = z.object({
  task_id: z.number().int().positive()
    .describe('ID of the task containing the comment.'),
  comment_id: z.number().int().positive()
    .describe('ID of the comment to update. You can only update your own comments unless you have admin permissions.'),
  comment: z.string().min(1)
    .describe('New comment text content (required, non-empty). Completely replaces the existing comment text.'),
});

export const DeleteTaskCommentSchema = z.object({
  task_id: z.number().int().positive()
    .describe('ID of the task containing the comment.'),
  comment_id: z.number().int().positive()
    .describe('ID of the comment to delete. You can only delete your own comments unless you have admin permissions.'),
});

export type AddTaskCommentInput = z.infer<typeof AddTaskCommentSchema>;
export type GetTaskCommentsInput = z.infer<typeof GetTaskCommentsSchema>;
export type UpdateTaskCommentInput = z.infer<typeof UpdateTaskCommentSchema>;
export type DeleteTaskCommentInput = z.infer<typeof DeleteTaskCommentSchema>;

/**
 * Add task comment
 * 
 * **Purpose**: Add a text comment to a task for team collaboration and context sharing.
 * 
 * **When to use**:
 * - Providing updates or progress notes on a task
 * - Asking questions or requesting clarification
 * - Documenting decisions or changes related to the task
 * - Collaborating with team members asynchronously
 * - As an AI agent: Annotating tasks with context, reasoning, or status updates
 * 
 * **Expected outcome**:
 * - Comment created with current timestamp
 * - Author set to authenticated user (from token)
 * - Comment appears in task's comment list
 * - Returns full comment object with id, author, created/updated timestamps
 * 
 * **Error scenarios**:
 * - Task not found (invalid task_id)
 * - Permission denied (need read access to task)
 * - Empty comment text (validation error)
 * 
 * **Note**: The comment author is automatically set based on your authentication token.
 * When used by an AI agent, comments will be attributed to the agent's user account.
 */
export async function addTaskComment(
  input: AddTaskCommentInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<AddCommentResponse> {
  try {
    logger.info('Adding task comment', {
      task_id: input.task_id,
      comment_length: input.comment.length,
    });

    const result = await vikunjaClient.addTaskComment(
      input.task_id,
      input.comment,
      token
    );

    logger.info('Task comment added successfully', { 
      task_id: input.task_id,
      comment_id: result.comment.id,
    });
    return result;
  } catch (error) {
    logger.error('Failed to add task comment', { error, input });
    
    // Format permission errors with resource context
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        throw new Error(formatPermissionError('comment', input.task_id, 'add'));
      }
      if (axiosError.response?.status === 404) {
        throw new Error(`Task ${input.task_id} not found`);
      }
    }
    
    throw error;
  }
}

/**
 * Get task comments
 * 
 * **Purpose**: Retrieve all comments for a task with optional pagination support.
 * 
 * **When to use**:
 * - Viewing team discussion and updates on a task
 * - Understanding task history and context
 * - Checking for recent comments or questions
 * - As an AI agent: Gathering context before taking action on a task
 * - Tasks with 50+ comments: Use pagination to manage response size
 * 
 * **Expected outcome**:
 * - Comments returned in chronological order (oldest first)
 * - Each comment includes: id, text, author (username, name, email), created/updated timestamps
 * - Pagination metadata: total count, current page, page size, total pages
 * - Empty array if task has no comments
 * 
 * **Pagination guidance**:
 * - Default: page=1, page_size=50 (suitable for most tasks)
 * - For quick scans: page_size=10-25
 * - For batch processing: page_size=100 (maximum)
 * - Check `has_next_page` or compare page vs total_pages to detect more data
 * 
 * **Error scenarios**:
 * - Task not found (invalid task_id)
 * - Permission denied (need read access to task)
 * - Invalid pagination parameters (page < 1, page_size > 100)
 */
export async function getTaskComments(
  input: GetTaskCommentsInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<GetCommentsResponse> {
  try {
    const page = input.page ?? 1;
    const pageSize = input.page_size ?? 50;

    logger.info('Retrieving task comments', {
      task_id: input.task_id,
      page,
      page_size: pageSize,
    });

    const result = await vikunjaClient.getTaskComments(
      input.task_id,
      page,
      pageSize,
      token
    );

    logger.info('Task comments retrieved successfully', { 
      task_id: input.task_id,
      count: result.comments.length,
      total: result.total,
    });
    return result;
  } catch (error) {
    logger.error('Failed to retrieve task comments', { error, input });
    
    // Format permission errors with resource context
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        throw new Error(formatPermissionError('comment', input.task_id, 'view'));
      }
      if (axiosError.response?.status === 404) {
        throw new Error(`Task ${input.task_id} not found`);
      }
    }
    
    throw error;
  }
}

/**
 * Update task comment
 * 
 * **Purpose**: Modify the text of an existing comment on a task.
 * 
 * **When to use**:
 * - Correcting typos or mistakes in a comment
 * - Adding additional information to an existing comment
 * - Clarifying or revising a previous statement
 * - Updating status or progress notes
 * 
 * **Expected outcome**:
 * - Comment text replaced with new content
 * - `updated` timestamp reflects modification time
 * - Comment retains original id, author, and created timestamp
 * - Returns updated comment object
 * 
 * **Permission requirements**:
 * - You can only update YOUR OWN comments (created by your user account)
 * - Task admins may be able to update any comment (Vikunja permission dependent)
 * - Attempting to update another user's comment will return permission denied
 * 
 * **Error scenarios**:
 * - Comment not found (invalid comment_id)
 * - Permission denied (not your comment, or no task access)
 * - Task not found (invalid task_id)
 * - Empty comment text (validation error)
 * 
 * **Use update vs delete+create**:
 * - Use update when: Correcting or enhancing your own comment
 * - Use delete+create when: Completely replacing comment or different author
 */
export async function updateTaskComment(
  input: UpdateTaskCommentInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<UpdateCommentResponse> {
  try {
    logger.info('Updating task comment', {
      task_id: input.task_id,
      comment_id: input.comment_id,
      new_comment_length: input.comment.length,
    });

    const result = await vikunjaClient.updateTaskComment(
      input.task_id,
      input.comment_id,
      input.comment,
      token
    );

    logger.info('Task comment updated successfully', { 
      task_id: input.task_id,
      comment_id: input.comment_id,
    });
    return result;
  } catch (error) {
    logger.error('Failed to update task comment', { error, input });
    
    // Format permission errors with resource context
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        const message = axiosError.response?.data?.message || 'You can only update your own comments';
        throw new Error(`${formatPermissionError('comment', input.comment_id, 'update')}. ${message}`);
      }
      if (axiosError.response?.status === 404) {
        throw new Error(`Comment ${input.comment_id} not found on task ${input.task_id}`);
      }
    }
    
    throw error;
  }
}

/**
 * Delete task comment
 * 
 * **Purpose**: Remove a comment from a task permanently.
 * 
 * **When to use**:
 * - Removing outdated or incorrect information
 * - Deleting duplicate or spam comments
 * - Cleaning up test or placeholder comments
 * - Removing sensitive information accidentally posted
 * 
 * **Expected outcome**:
 * - Comment permanently deleted from task
 * - Comment no longer appears in task's comment list
 * - Action cannot be undone
 * - Returns success confirmation
 * 
 * **Permission requirements**:
 * - You can only delete YOUR OWN comments (created by your user account)
 * - Task admins may be able to delete any comment (Vikunja permission dependent)
 * - Attempting to delete another user's comment will return permission denied
 * 
 * **Error scenarios**:
 * - Comment not found (invalid comment_id or already deleted)
 * - Permission denied (not your comment, or no task access)
 * - Task not found (invalid task_id)
 * 
 * **Caution**: Deletion is permanent. Consider updating the comment to "[Removed]" if you need to preserve comment history.
 */
export async function deleteTaskComment(
  input: DeleteTaskCommentInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<DeleteCommentResponse> {
  try {
    logger.info('Deleting task comment', {
      task_id: input.task_id,
      comment_id: input.comment_id,
    });

    const result = await vikunjaClient.deleteTaskComment(
      input.task_id,
      input.comment_id,
      token
    );

    logger.info('Task comment deleted successfully', { 
      task_id: input.task_id,
      comment_id: input.comment_id,
    });
    return result;
  } catch (error) {
    logger.error('Failed to delete task comment', { error, input });
    
    // Format permission errors with resource context
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        const message = axiosError.response?.data?.message || 'You can only delete your own comments';
        throw new Error(`${formatPermissionError('comment', input.comment_id, 'delete')}. ${message}`);
      }
      if (axiosError.response?.status === 404) {
        throw new Error(`Comment ${input.comment_id} not found on task ${input.task_id}`);
      }
    }
    
    throw error;
  }
}
