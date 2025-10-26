/**
 * Task Attachments Contract
 * 
 * Zod schemas and TypeScript types for task attachment metadata operations.
 * Note: File upload/download handled by Vikunja API, MCP server provides metadata only.
 */

import { z } from 'zod';

/**
 * Get Task Attachments Input Schema
 */
export const GetTaskAttachmentsSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task to retrieve attachment metadata for")
});

export type GetTaskAttachmentsInput = z.infer<typeof GetTaskAttachmentsSchema>;

/**
 * User Info (embedded in attachment responses)
 */
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

/**
 * Task Attachment Response (from Vikunja API)
 * Contains file metadata only, not actual file content
 */
export interface TaskAttachment {
  id: number;
  task_id: number;
  file_id: number;
  filename: string;
  size: number;        // File size in bytes
  mime_type: string;   // e.g., "image/png", "application/pdf"
  created_by: User;
  created_at: string;  // ISO 8601 timestamp
}

/**
 * Get Attachments Response
 */
export interface GetAttachmentsResponse {
  task_id: number;
  attachments: TaskAttachment[];
  total_count: number;
}
