/**
 * tool-result.ts
 * 
 * Base types for MCP tool execution results with structured status codes
 * and user-friendly messages for agent handling.
 * 
 * Created: 2025-10-28
 * Feature: 011-ai-agent-architecture
 */

/**
 * Tool execution status codes
 */
export type ToolStatus =
  | 'success'           // Operation completed successfully
  | 'error'             // System/API error occurred
  | 'needs_clarification'  // User input ambiguous or missing context
  | 'confirm_required'  // Confirmation needed before execution
  | 'preview_required'; // Preview/approval needed (bulk operations)

/**
 * Base result interface for all MCP tool executions
 * 
 * @template T - Type of the data payload (tool-specific)
 */
export interface ToolResult<T = any> {
  /** Execution status code for agent decision-making */
  status: ToolStatus;
  
  /** User-friendly message for the agent to relay to the user */
  message: string;
  
  /** Tool-specific result data (optional) */
  data?: T;
  
  /** Suggested next steps for user (shown on errors/clarifications) */
  suggestedActions?: string[];
  
  /** Trace ID for request correlation and debugging */
  traceId: string;
  
  /** Additional metadata for confirmations and state management */
  metadata?: {
    taskId?: number;
    taskIds?: number[];
    confirmationToken?: string;
    expiresAt?: number; // Unix timestamp (ms)
    count?: number;
    [key: string]: any;
  };
}

/**
 * Error result with suggested recovery actions
 */
export interface ErrorResult extends ToolResult<never> {
  status: 'error';
  suggestedActions: string[];
}

/**
 * Result requiring user clarification (no match, multiple matches)
 */
export interface ClarificationResult<T = any> extends ToolResult<T> {
  status: 'needs_clarification';
  suggestedActions: string[];
}

/**
 * Result requiring confirmation before execution
 */
export interface ConfirmationResult<T = any> extends ToolResult<T> {
  status: 'confirm_required';
  metadata: {
    taskId: number;
    confirmationToken: string;
    expiresAt: number;
  };
}

/**
 * Result requiring preview/approval for bulk operations
 */
export interface PreviewResult<T = any> extends ToolResult<T> {
  status: 'preview_required';
  metadata: {
    taskIds: number[];
    count: number;
    confirmationToken: string;
    expiresAt: number;
  };
}

/**
 * Successful operation result
 */
export interface SuccessResult<T = any> extends ToolResult<T> {
  status: 'success';
  data: T;
}

/**
 * Type guard: Check if result needs clarification
 */
export function needsClarification(result: ToolResult): result is ClarificationResult {
  return result.status === 'needs_clarification';
}

/**
 * Type guard: Check if result requires confirmation
 */
export function needsConfirmation(result: ToolResult): result is ConfirmationResult {
  return result.status === 'confirm_required';
}

/**
 * Type guard: Check if result requires preview
 */
export function needsPreview(result: ToolResult): result is PreviewResult {
  return result.status === 'preview_required';
}

/**
 * Type guard: Check if result is an error
 */
export function isError(result: ToolResult): result is ErrorResult {
  return result.status === 'error';
}

/**
 * Type guard: Check if result is successful
 */
export function isSuccess(result: ToolResult): result is SuccessResult {
  return result.status === 'success';
}
