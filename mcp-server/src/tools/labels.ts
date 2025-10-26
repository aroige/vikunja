import { z } from 'zod';
import { VikunjaClient } from '../vikunja/client.js';
import { formatPermissionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { 
  GetLabelsResponse, 
  GetLabelResponse, 
  UpdateLabelResponse, 
  DeleteLabelResponse,
  GetTaskLabelsResponse
} from '../vikunja/types.js';

/**
 * Hex Color Validation Pattern
 * 6-character hexadecimal without # prefix
 */
const HEX_COLOR_PATTERN = /^[0-9a-fA-F]{6}$/;

/**
 * Input schemas for label management tools
 */

export const GetAllLabelsSchema = z.object({
  page: z.number().int().positive().optional().default(1)
    .describe('Page number for pagination (default: 1, minimum: 1). Each page returns up to 50 labels by default.'),
  page_size: z.number().int().min(1).max(100).optional().default(50)
    .describe('Number of labels per page (default: 50, minimum: 1, maximum: 100). Adjust based on expected label count.'),
  search: z.string().optional()
    .describe('Search filter for label title (optional, case-insensitive partial match). Example: "urgent" matches "Urgent", "Very Urgent", etc.'),
});

export const GetLabelSchema = z.object({
  label_id: z.number().int().positive()
    .describe('ID of the label to retrieve. Returns full label details including title, description, color, and creator.'),
});

export const UpdateLabelSchema = z.object({
  label_id: z.number().int().positive()
    .describe('ID of the label to update. You can only update labels you created.'),
  title: z.string().min(1).optional()
    .describe('New label title (optional, non-empty if provided). Example: "Critical", "In Progress", "Bug".'),
  description: z.string().optional()
    .describe('New label description (optional, can be empty string to clear). Example: "High priority tasks requiring immediate attention".'),
  hex_color: z.string().regex(HEX_COLOR_PATTERN).optional()
    .describe('New label color as 6-character hex WITHOUT # prefix (optional). Examples: "FF5733" (red-orange), "3498DB" (blue), "2ECC71" (green), "000000" (black), "FFFFFF" (white). Case-insensitive: "ff5733" and "FF5733" both valid.'),
}).refine(
  (data) => data.title !== undefined || data.description !== undefined || data.hex_color !== undefined,
  { message: 'At least one field (title, description, or hex_color) must be provided for update' }
);

export const DeleteLabelSchema = z.object({
  label_id: z.number().int().positive()
    .describe('ID of the label to delete. You can only delete labels you created. Deletion removes label from ALL tasks.'),
});

export const GetTaskLabelsSchema = z.object({
  task_id: z.number().int().positive()
    .describe('ID of the task to retrieve labels for. Returns all labels currently attached to the task.'),
});

export type GetAllLabelsInput = z.infer<typeof GetAllLabelsSchema>;
export type GetLabelInput = z.infer<typeof GetLabelSchema>;
export type UpdateLabelInput = z.infer<typeof UpdateLabelSchema>;
export type DeleteLabelInput = z.infer<typeof DeleteLabelSchema>;
export type GetTaskLabelsInput = z.infer<typeof GetTaskLabelsSchema>;

/**
 * Get all labels
 * 
 * **Purpose**: List all labels visible to you with optional search filtering and pagination.
 * 
 * **When to use**:
 * - Discovering available labels before attaching to tasks
 * - Browsing label catalog to find appropriate categorization
 * - Searching for specific labels by title (e.g., "urgent", "bug")
 * - Managing large label collections (500+ labels)
 * - As an AI agent: Understanding available task categories and organization system
 * 
 * **Visibility rules** (Vikunja terminology):
 * - You see labels on tasks you have access to
 * - PLUS labels you created (even if not yet attached to tasks)
 * - Labels are project-independent (global scope, not confined to specific projects)
 * - Other users' labels only visible if attached to tasks you can access
 * 
 * **Expected outcome**:
 * - Array of label objects with: id, title, description, hex_color, created_by, created_at, updated_at
 * - Pagination metadata: total count, current page, page_size, has_next_page
 * - Empty array if no labels match criteria
 * - Results sorted alphabetically by title
 * 
 * **Pagination guidance**:
 * - Default: page=1, page_size=50 (suitable for most setups)
 * - For quick overview: page_size=10-25
 * - For complete catalog: page_size=100 (maximum)
 * - Check `has_next_page` to detect more labels
 * 
 * **Search tips**:
 * - Omit `search` parameter to list all labels
 * - Case-insensitive: "urgent" matches "Urgent", "URGENT", "urgent"
 * - Partial match: "pro" matches "Project", "In Progress", "Production"
 * 
 * **Error scenarios**:
 * - Invalid pagination parameters (page < 1, page_size > 100)
 * - Authentication failure (invalid/expired token)
 * 
 * **Alternatives**:
 * - Use `get_label` if you know the label ID and need full details
 * - Use `get_task_labels` to see labels on a specific task
 * - Use `search_tasks` with `filter_labels` to find tasks with specific labels
 */
export async function getAllLabels(
  input: GetAllLabelsInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<GetLabelsResponse> {
  try {
    logger.info('Getting all labels', {
      page: input.page,
      page_size: input.page_size,
      search: input.search,
    });

    const result = await vikunjaClient.getAllLabels(
      input.page || 1,
      input.page_size || 50,
      input.search,
      token
    );

    logger.info('Labels retrieved successfully', { 
      count: result.labels.length,
      total: result.total,
      page: result.page,
    });
    return result;
  } catch (error) {
    logger.error('Failed to get labels', { error, input });
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        throw new Error('Permission denied: Cannot list labels');
      }
    }
    
    throw error;
  }
}

/**
 * Get label
 * 
 * **Purpose**: Retrieve full details of a specific label by ID.
 * 
 * **When to use**:
 * - Checking label details before attaching to task
 * - Verifying label color and description
 * - Confirming label creator and creation date
 * - As an AI agent: Validating label exists before using in operations
 * 
 * **Expected outcome**:
 * - Label object with: id, title, description, hex_color, created_by, created_at, updated_at
 * - Creator information: user id, username, name, email
 * - Hex color without # prefix (6 characters)
 * 
 * **Error scenarios**:
 * - Label not found (invalid label_id)
 * - Permission denied (label not visible to you - not on accessible tasks, not created by you)
 * 
 * **Alternatives**:
 * - Use `get_all_labels` with search to find labels by title
 * - Use `get_task_labels` to see all labels on a specific task
 */
export async function getLabel(
  input: GetLabelInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<GetLabelResponse> {
  try {
    logger.info('Getting label', { label_id: input.label_id });

    const result = await vikunjaClient.getLabel(input.label_id, token);

    logger.info('Label retrieved successfully', { label_id: input.label_id });
    return result;
  } catch (error) {
    logger.error('Failed to get label', { error, input });
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        throw new Error(formatPermissionError('label', input.label_id, 'view'));
      }
      if (axiosError.response?.status === 404) {
        throw new Error(`Label ${input.label_id} not found`);
      }
    }
    
    throw error;
  }
}

/**
 * Update label
 * 
 * **Purpose**: Modify label properties (title, description, color).
 * 
 * **When to use**:
 * - Renaming label for clarity (e.g., "Urgent" → "Critical")
 * - Updating description to refine label meaning
 * - Changing color to improve visual organization
 * - Correcting typos or improving label consistency
 * - As an AI agent: Maintaining label taxonomy and organization system
 * 
 * **Permission requirement**:
 * - You can ONLY update labels you created
 * - Other users' labels cannot be modified (even if visible on your tasks)
 * 
 * **Hex color format** (IMPORTANT):
 * - Must be exactly 6 characters
 * - Hexadecimal digits only: 0-9, A-F, a-f
 * - WITHOUT # prefix (Vikunja requirement)
 * - Case-insensitive: "FF5733" same as "ff5733"
 * - Examples: "FF0000" (red), "00FF00" (green), "0000FF" (blue), "FFFF00" (yellow)
 * - Common colors: "F44336" (Material red), "2196F3" (Material blue), "4CAF50" (Material green)
 * 
 * **Expected outcome**:
 * - Label updated with new values
 * - Updated_at timestamp reflects modification time
 * - Changes immediately visible on all tasks using this label
 * - Returns updated label object
 * 
 * **Error scenarios**:
 * - Label not found (invalid label_id)
 * - Permission denied (you didn't create this label)
 * - Invalid hex_color format (wrong length, invalid characters, includes # prefix)
 * - All fields empty (at least one required)
 * 
 * **Alternatives**:
 * - Use `create_label` (in assignments.ts) to create a new label instead
 * - Use `delete_label` if label is no longer needed
 */
export async function updateLabel(
  input: UpdateLabelInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<UpdateLabelResponse> {
  try {
    logger.info('Updating label', { label_id: input.label_id, updates: input });

    const updates: { title?: string; description?: string; hex_color?: string } = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.hex_color !== undefined) updates.hex_color = input.hex_color;

    const result = await vikunjaClient.updateLabel(input.label_id, updates, token);

    logger.info('Label updated successfully', { label_id: input.label_id });
    return result;
  } catch (error) {
    logger.error('Failed to update label', { error, input });
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        throw new Error(formatPermissionError('label', input.label_id, 'update'));
      }
      if (axiosError.response?.status === 404) {
        throw new Error(`Label ${input.label_id} not found`);
      }
      if (axiosError.response?.status === 400) {
        throw new Error(`Invalid label data: ${axiosError.response?.data?.message || 'Check hex_color format (6 characters, no # prefix)'}`);
      }
    }
    
    throw error;
  }
}

/**
 * Delete label
 * 
 * **Purpose**: Remove a label and detach it from all tasks.
 * 
 * **When to use**:
 * - Label is obsolete or no longer needed
 * - Cleaning up duplicate or unused labels
 * - Reorganizing label taxonomy
 * - As an AI agent: Maintaining a clean, organized label system
 * 
 * **Permission requirement**:
 * - You can ONLY delete labels you created
 * - Other users' labels cannot be deleted (even if visible on your tasks)
 * 
 * **Cascading consequences** (IMPORTANT):
 * - Label removed from ALL tasks using it (across all projects)
 * - Deletion is permanent and cannot be undone
 * - Tasks retain all other labels (only this label removed)
 * - No tasks are deleted (only label associations removed)
 * 
 * **Expected outcome**:
 * - Label permanently deleted from system
 * - Label removed from all tasks that had it attached
 * - Success confirmation with label_id
 * 
 * **Error scenarios**:
 * - Label not found (invalid label_id or already deleted)
 * - Permission denied (you didn't create this label)
 * 
 * **Alternatives**:
 * - Use `remove_label` (in assignments.ts) to detach label from ONE task only
 * - Use `update_label` to rename/repurpose label instead of deleting
 * 
 * **Warning**: Deletion affects ALL tasks with this label. Consider updating the label (rename, change color) if the concept is still useful but needs refinement.
 */
export async function deleteLabel(
  input: DeleteLabelInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<DeleteLabelResponse> {
  try {
    logger.info('Deleting label', { label_id: input.label_id });

    const result = await vikunjaClient.deleteLabel(input.label_id, token);

    logger.info('Label deleted successfully', { label_id: input.label_id });
    return result;
  } catch (error) {
    logger.error('Failed to delete label', { error, input });
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        throw new Error(formatPermissionError('label', input.label_id, 'delete'));
      }
      if (axiosError.response?.status === 404) {
        throw new Error(`Label ${input.label_id} not found`);
      }
    }
    
    throw error;
  }
}

/**
 * Get task labels
 * 
 * **Purpose**: Retrieve all labels currently attached to a specific task.
 * 
 * **When to use**:
 * - Viewing task categorization and tags
 * - Understanding task context before taking action
 * - Checking if task has specific labels before filtering
 * - As an AI agent: Gathering task metadata for decision-making
 * 
 * **Expected outcome**:
 * - Array of label objects attached to task
 * - Each label includes: id, title, description, hex_color, created_by, created_at, updated_at
 * - Empty array if task has no labels
 * - Total count of labels on task
 * 
 * **Error scenarios**:
 * - Task not found (invalid task_id)
 * - Permission denied (need read access to task)
 * 
 * **Alternatives**:
 * - Use `get_task` to retrieve full task details (includes labels in response)
 * - Use `search_tasks` with `filter_labels` to find tasks with specific labels
 * - Use `get_all_labels` to list all available labels in system
 */
export async function getTaskLabels(
  input: GetTaskLabelsInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<GetTaskLabelsResponse> {
  try {
    logger.info('Getting task labels', { task_id: input.task_id });

    const result = await vikunjaClient.getTaskLabels(input.task_id, token);

    logger.info('Task labels retrieved successfully', { 
      task_id: input.task_id,
      label_count: result.total_count,
    });
    return result;
  } catch (error) {
    logger.error('Failed to get task labels', { error, input });
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        throw new Error(formatPermissionError('task', input.task_id, 'view labels'));
      }
      if (axiosError.response?.status === 404) {
        throw new Error(`Task ${input.task_id} not found`);
      }
    }
    
    throw error;
  }
}
