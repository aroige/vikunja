/**
 * T011: Trace ID Generation Utility
 * 
 * Generates unique trace IDs for request correlation across agent conversations,
 * tool executions, and logging systems.
 * 
 * Format: {userId}-{timestamp}-{uuid}
 * Example: user123-1730123456789-a1b2c3d4-e5f6-7890-abcd-ef1234567890
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique trace ID for request correlation
 * 
 * @param userId - Vikunja user ID for the request
 * @returns Trace ID in format: {userId}-{timestamp}-{uuid}
 */
export function generateTraceId(userId: string): string {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('userId is required and must be a non-empty string');
  }

  const timestamp = Date.now();
  const uuid = randomUUID();

  return `${userId}-${timestamp}-${uuid}`;
}

/**
 * Parse a trace ID into its components
 * 
 * @param traceId - Trace ID to parse
 * @returns Object containing userId, timestamp, and uuid
 * @throws Error if trace ID format is invalid
 */
export function parseTraceId(traceId: string): {
  userId: string;
  timestamp: number;
  uuid: string;
} {
  if (!traceId || typeof traceId !== 'string') {
    throw new Error('traceId must be a non-empty string');
  }

  // Expected format: userId-timestamp-uuid
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (5 segments)
  const parts = traceId.split('-');
  
  if (parts.length < 7) { // userId, timestamp, and 5 UUID parts
    throw new Error('Invalid trace ID format. Expected: userId-timestamp-uuid');
  }

  // Reconstruct components
  const userId = parts[0];
  const timestampStr = parts[1];
  
  if (!userId || !timestampStr) {
    throw new Error('Invalid trace ID format: missing userId or timestamp');
  }
  
  const uuid = parts.slice(2).join('-'); // Rejoin UUID parts

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    throw new Error('Invalid timestamp in trace ID');
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error('Invalid UUID in trace ID');
  }

  return {
    userId,
    timestamp,
    uuid,
  };
}

/**
 * Validate a trace ID format
 * 
 * @param traceId - Trace ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidTraceId(traceId: string): boolean {
  try {
    parseTraceId(traceId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract user ID from a trace ID without full parsing
 * 
 * @param traceId - Trace ID to extract from
 * @returns User ID or null if invalid
 */
export function extractUserIdFromTraceId(traceId: string): string | null {
  try {
    const { userId } = parseTraceId(traceId);
    return userId;
  } catch {
    return null;
  }
}

/**
 * Generate a short trace ID for logging (first 8 chars of UUID)
 * 
 * @param traceId - Full trace ID
 * @returns Shortened trace ID for display
 */
export function shortenTraceId(traceId: string): string {
  try {
    const { userId, uuid } = parseTraceId(traceId);
    const shortUuid = uuid.substring(0, 8);
    return `${userId}-${shortUuid}`;
  } catch {
    return traceId.substring(0, 20) + '...';
  }
}
