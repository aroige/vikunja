/**
 * Task Comments Contract
 * 
 * Zod schemas and TypeScript types for task comment operations.
 * Supports pagination for tasks with many comments.
 */

import { z } from 'zod';

/**
 * Add Task Comment Input Schema
 */
export const AddTaskCommentSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task to add comment to"),
  comment: z.string().min(1)
    .describe("Comment text content (required, non-empty)")
});

export type AddTaskCommentInput = z.infer<typeof AddTaskCommentSchema>;

/**
 * Get Task Comments Input Schema
 */
export const GetTaskCommentsSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task to retrieve comments for"),
  page: z.number().int().positive().optional().default(1)
    .describe("Page number for pagination (default: 1, minimum: 1)"),
  page_size: z.number().int().min(1).max(100).optional().default(50)
    .describe("Number of comments per page (default: 50, minimum: 1, maximum: 100)")
});

export type GetTaskCommentsInput = z.infer<typeof GetTaskCommentsSchema>;

/**
 * Update Task Comment Input Schema
 */
export const UpdateTaskCommentSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task containing the comment"),
  comment_id: z.number().int().positive()
    .describe("ID of the comment to update"),
  comment: z.string().min(1)
    .describe("New comment text content (required, non-empty)")
});

export type UpdateTaskCommentInput = z.infer<typeof UpdateTaskCommentSchema>;

/**
 * Delete Task Comment Input Schema
 */
export const DeleteTaskCommentSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task containing the comment"),
  comment_id: z.number().int().positive()
    .describe("ID of the comment to delete")
});

export type DeleteTaskCommentInput = z.infer<typeof DeleteTaskCommentSchema>;

/**
 * User Info (embedded in comment responses)
 */
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

/**
 * Task Comment Response (from Vikunja API)
 */
export interface TaskComment {
  id: number;
  task_id: number;
  comment: string;
  author: User;
  created: string;  // ISO 8601 timestamp
  updated: string;  // ISO 8601 timestamp
}

/**
 * Add Comment Response
 */
export interface AddCommentResponse {
  success: boolean;
  comment: TaskComment;
  message: string;
}

/**
 * Get Comments Response (with pagination)
 */
export interface GetCommentsResponse {
  task_id: number;
  comments: TaskComment[];
  total: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
}

/**
 * Update Comment Response
 */
export interface UpdateCommentResponse {
  success: boolean;
  comment: TaskComment;
  message: string;
}

/**
 * Delete Comment Response
 */
export interface DeleteCommentResponse {
  success: boolean;
  comment_id: number;
  message: string;
}
