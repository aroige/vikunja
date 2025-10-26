/**
 * Labels Contract
 * 
 * Zod schemas and TypeScript types for label management operations.
 * Labels are project-independent tags that can be attached to tasks.
 */

import { z } from 'zod';

/**
 * Hex Color Validation Pattern
 * 6-character hexadecimal without # prefix
 */
const HEX_COLOR_PATTERN = /^[0-9a-fA-F]{6}$/;

/**
 * Get All Labels Input Schema
 */
export const GetAllLabelsSchema = z.object({
  page: z.number().int().positive().optional().default(1)
    .describe("Page number for pagination (default: 1, minimum: 1)"),
  page_size: z.number().int().min(1).max(100).optional().default(50)
    .describe("Number of labels per page (default: 50, minimum: 1, maximum: 100)"),
  search: z.string().optional()
    .describe("Search filter for label title (optional, case-insensitive partial match)")
});

export type GetAllLabelsInput = z.infer<typeof GetAllLabelsSchema>;

/**
 * Get Label Input Schema
 */
export const GetLabelSchema = z.object({
  label_id: z.number().int().positive()
    .describe("ID of the label to retrieve")
});

export type GetLabelInput = z.infer<typeof GetLabelSchema>;

/**
 * Update Label Input Schema
 */
export const UpdateLabelSchema = z.object({
  label_id: z.number().int().positive()
    .describe("ID of the label to update"),
  title: z.string().min(1).optional()
    .describe("New label title (optional, non-empty if provided)"),
  description: z.string().optional()
    .describe("New label description (optional, can be empty string to clear)"),
  hex_color: z.string().regex(HEX_COLOR_PATTERN).optional()
    .describe("New label color as 6-character hex without # prefix (e.g., 'FF5733', 'a1b2c3'). Optional.")
}).refine(
  (data) => data.title !== undefined || data.description !== undefined || data.hex_color !== undefined,
  { message: "At least one field (title, description, or hex_color) must be provided for update" }
);

export type UpdateLabelInput = z.infer<typeof UpdateLabelSchema>;

/**
 * Delete Label Input Schema
 */
export const DeleteLabelSchema = z.object({
  label_id: z.number().int().positive()
    .describe("ID of the label to delete")
});

export type DeleteLabelInput = z.infer<typeof DeleteLabelSchema>;

/**
 * Get Task Labels Input Schema
 */
export const GetTaskLabelsSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task to retrieve labels for")
});

export type GetTaskLabelsInput = z.infer<typeof GetTaskLabelsSchema>;

/**
 * User Info (embedded in label responses)
 */
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

/**
 * Label Response (from Vikunja API)
 */
export interface Label {
  id: number;
  title: string;
  description?: string;
  hex_color: string;  // 6-character hex without # prefix
  created_by: User;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Get Labels Response (with pagination)
 */
export interface GetLabelsResponse {
  labels: Label[];
  total: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
}

/**
 * Get Label Response
 */
export interface GetLabelResponse {
  label: Label;
}

/**
 * Update Label Response
 */
export interface UpdateLabelResponse {
  success: boolean;
  label: Label;
  message: string;
}

/**
 * Delete Label Response
 */
export interface DeleteLabelResponse {
  success: boolean;
  label_id: number;
  message: string;
}

/**
 * Get Task Labels Response
 */
export interface GetTaskLabelsResponse {
  task_id: number;
  labels: Label[];
  total_count: number;
}
