/**
 * T012: Confirmation Token Generation (JWT)
 * 
 * Generates JWT-based confirmation tokens for sensitive operations like task completion.
 * Tokens expire after 5 minutes (300 seconds) to prevent replay attacks.
 * 
 * Used for search-before-action workflow:
 * 1. complete_task returns search results + confirmation token
 * 2. User confirms ("yes")
 * 3. confirm_complete_task validates token and executes action
 */

import * as jwt from 'jsonwebtoken';

/**
 * Payload structure for confirmation tokens
 */
export interface ConfirmationTokenPayload {
  /** User ID performing the action */
  userId: string;
  /** Tool name being confirmed */
  toolName: string;
  /** Original tool arguments (e.g., taskId to complete) */
  args: Record<string, unknown>;
  /** Trace ID for correlation */
  traceId: string;
  /** Token expiration timestamp */
  exp?: number;
  /** Token issued at timestamp */
  iat?: number;
}

/**
 * Configuration for JWT tokens
 */
const TOKEN_CONFIG = {
  /** Token expiration time in seconds (5 minutes) */
  EXPIRY_SECONDS: 300,
  /** JWT algorithm */
  ALGORITHM: 'HS256' as const,
} as const;

/**
 * Get JWT secret from environment or use default (development only)
 */
function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  
  if (!secret) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    // Development fallback
    return 'development-secret-change-in-production';
  }
  
  return secret;
}

/**
 * Generate a confirmation token for a pending action
 * 
 * @param payload - Token payload containing userId, toolName, args, traceId
 * @returns Signed JWT token (expires in 5 minutes)
 * @throws Error if required fields are missing
 */
export function generateConfirmationToken(
  payload: Omit<ConfirmationTokenPayload, 'exp' | 'iat'>
): string {
  // Validate required fields
  if (!payload.userId || typeof payload.userId !== 'string') {
    throw new Error('userId is required and must be a string');
  }
  
  if (!payload.toolName || typeof payload.toolName !== 'string') {
    throw new Error('toolName is required and must be a string');
  }
  
  if (!payload.traceId || typeof payload.traceId !== 'string') {
    throw new Error('traceId is required and must be a string');
  }
  
  if (!payload.args || typeof payload.args !== 'object') {
    throw new Error('args is required and must be an object');
  }

  const secret = getJwtSecret();
  
  const token = jwt.sign(
    payload,
    secret,
    {
      algorithm: TOKEN_CONFIG.ALGORITHM,
      expiresIn: TOKEN_CONFIG.EXPIRY_SECONDS,
    }
  );
  
  return token;
}

/**
 * Verify and decode a confirmation token
 * 
 * @param token - JWT token to verify
 * @returns Decoded payload if valid
 * @throws Error if token is invalid, expired, or malformed
 */
export function verifyConfirmationToken(token: string): ConfirmationTokenPayload {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is required and must be a string');
  }

  const secret = getJwtSecret();
  
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: [TOKEN_CONFIG.ALGORITHM],
    }) as ConfirmationTokenPayload;
    
    // Validate decoded payload structure
    if (!decoded.userId || !decoded.toolName || !decoded.args || !decoded.traceId) {
      throw new Error('Invalid token payload: missing required fields');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Confirmation token has expired (tokens are valid for 5 minutes)');
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`Invalid confirmation token: ${error.message}`);
    }
    
    if (error instanceof Error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
    
    throw new Error('Token verification failed with unknown error');
  }
}

/**
 * Check if a token is expired without throwing an error
 * 
 * @param token - JWT token to check
 * @returns true if expired, false if valid, null if invalid format
 */
export function isTokenExpired(token: string): boolean | null {
  try {
    verifyConfirmationToken(token);
    return false;
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) {
      return true;
    }
    return null; // Invalid token
  }
}

/**
 * Decode a token without verification (for debugging/logging only)
 * 
 * ⚠️ WARNING: Never use this for security decisions!
 * 
 * @param token - JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export function decodeTokenUnsafe(token: string): ConfirmationTokenPayload | null {
  try {
    const decoded = jwt.decode(token) as ConfirmationTokenPayload | null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get remaining time until token expires
 * 
 * @param token - JWT token to check
 * @returns Seconds until expiration, or -1 if expired/invalid
 */
export function getTokenExpirySeconds(token: string): number {
  const decoded = decodeTokenUnsafe(token);
  
  if (!decoded || !decoded.exp) {
    return -1;
  }
  
  const now = Math.floor(Date.now() / 1000);
  const remaining = decoded.exp - now;
  
  return remaining > 0 ? remaining : -1;
}
