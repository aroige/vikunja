import { z } from 'zod';
import { VikunjaClient } from '../vikunja/client.js';
import { formatPermissionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { GetTaskAttachmentsResponse } from '../vikunja/types.js';

/**
 * Input schema for task attachment tools
 */

export const GetTaskAttachmentsSchema = z.object({
  task_id: z.number().int().positive()
    .describe('ID of the task to retrieve attachment metadata for. Returns file information without downloading file content.'),
});

export type GetTaskAttachmentsInput = z.infer<typeof GetTaskAttachmentsSchema>;

/**
 * Get task attachments
 * 
 * **Purpose**: Retrieve metadata for all files attached to a task (filename, size, MIME type, upload info).
 * 
 * **When to use**:
 * - Understanding what files are associated with a task for context awareness
 * - Checking if a task has supporting documentation or resources
 * - Listing file details before suggesting file-related actions
 * - As an AI agent: Building comprehensive task context without downloading large files
 * 
 * **What you get**:
 * - List of attachment metadata objects, each containing:
 *   - filename: Original file name
 *   - size: File size in bytes
 *   - mime_type: File type (e.g., 'application/pdf', 'image/png', 'text/plain')
 *   - created_by: User who uploaded the file
 *   - created: Upload timestamp (ISO 8601)
 * - Empty array if task has no attachments
 * 
 * **Expected outcome**:
 * - Returns attachment metadata only (no file content/downloads)
 * - Count of total attachments
 * - Provides context about task resources without bandwidth overhead
 * 
 * **Important clarification**:
 * - This tool retrieves METADATA ONLY (filenames, sizes, types)
 * - It does NOT download or return file content
 * - It does NOT support file upload operations
 * - File upload/download is out of scope for MCP server
 * 
 * **Error scenarios**:
 * - Task not found (invalid task_id)
 * - Permission denied (need read access to task)
 * - Returns empty list if no attachments (not an error)
 * 
 * **Example use case**:
 * - Agent: "Let me check if this bug report has any screenshots attached"
 * - Agent retrieves metadata: "Found 2 attachments: error-screenshot.png (145KB), debug-log.txt (3KB)"
 * - Agent: "I see there's a screenshot and debug log attached for investigation"
 */
export async function getTaskAttachments(
  input: GetTaskAttachmentsInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    logger.info('Retrieving task attachments metadata', {
      task_id: input.task_id,
    });

    const result: GetTaskAttachmentsResponse = await vikunjaClient.getTaskAttachments(
      input.task_id,
      token
    );

    logger.info('Task attachments retrieved successfully', {
      task_id: input.task_id,
      count: result.count,
    });

    // Format response for MCP
    let responseText = `Found ${result.count} attachment(s) for task #${input.task_id}\n\n`;

    if (result.count === 0) {
      responseText += 'No attachments found for this task.';
    } else {
      responseText += 'Attachments (metadata only - no file content):\n\n';
      result.attachments.forEach((attachment, index) => {
        responseText += `${index + 1}. ${attachment.filename}\n`;
        responseText += `   - ID: ${attachment.id}\n`;
        responseText += `   - File ID: ${attachment.file_id}\n`;
        responseText += `   - Size: ${attachment.size} bytes (${(attachment.size / 1024).toFixed(2)} KB)\n`;
        responseText += `   - MIME Type: ${attachment.mime_type}\n`;
        responseText += `   - Uploaded by: ${attachment.created_by.username} (${attachment.created_by.name})\n`;
        responseText += `   - Uploaded: ${attachment.created}\n\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error: any) {
    logger.error('Failed to retrieve task attachments', {
      task_id: input.task_id,
      error: error.message,
    });

    // Add resource context to permission errors
    if (error.code === 403 || error.message?.includes('permission')) {
      throw new Error(formatPermissionError('task', input.task_id, 'view attachments for'));
    }

    throw error;
  }
}

// MCP tool definition
export const getTaskAttachmentsTool = {
  name: 'get_task_attachments',
  description: 'Retrieve metadata for all files attached to a task (filename, size, MIME type, upload info). Returns attachment details without downloading file content. Use this to understand what files are associated with a task for context awareness. Does NOT support file upload/download operations.',
  inputSchema: GetTaskAttachmentsSchema,
  handler: getTaskAttachments,
};
