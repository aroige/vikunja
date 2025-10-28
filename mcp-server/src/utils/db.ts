import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config/index.js';
import { logger } from './logger.js';

/**
 * PostgreSQL connection pool for n8n memory database
 */
class DatabaseClient {
  private pool: Pool | null = null;
  private isConnected = false;

  /**
   * Initialize the connection pool
   */
  async connect(): Promise<void> {
    if (this.pool) {
      logger.warn('Database pool already initialized');
      return;
    }

    try {
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.user,
        password: config.database.password,
        max: config.database.maxConnections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info('PostgreSQL connection pool initialized', {
        host: config.database.host,
        database: config.database.database,
      });
    } catch (error) {
      logger.error('Failed to initialize PostgreSQL connection pool', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }

    try {
      const result = await this.pool.query<T>(text, params);
      return result;
    } catch (error) {
      logger.error('Database query failed', {
        error: error instanceof Error ? error.message : String(error),
        query: text,
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }

    return this.pool.connect();
  }

  /**
   * Check if database is connected
   */
  isReady(): boolean {
    return this.isConnected && this.pool !== null;
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info('PostgreSQL connection pool closed');
    }
  }
}

/**
 * Singleton database client instance
 */
export const db = new DatabaseClient();

/**
 * Tool execution log entry
 */
export interface ToolExecutionLog {
  id?: string;
  trace_id: string;
  tool_name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  status: 'success' | 'error' | 'needs_clarification';
  agent_type: 'supervisor' | 'vikunja_specialist' | 'calendar_specialist';
  user_id: string;
  latency_ms: number;
  tokens_used?: number;
  timestamp?: Date;
}

/**
 * Insert a tool execution log entry
 */
export async function logToolExecution(log: ToolExecutionLog): Promise<void> {
  if (!db.isReady()) {
    // Graceful degradation - log to Winston instead of failing
    logger.warn('Database not ready, logging to Winston only', { log });
    return;
  }

  const query = `
    INSERT INTO tool_execution_logs (
      trace_id, tool_name, args, result, status, 
      agent_type, user_id, latency_ms, tokens_used
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `;

  const params = [
    log.trace_id,
    log.tool_name,
    JSON.stringify(log.args),
    JSON.stringify(log.result),
    log.status,
    log.agent_type,
    log.user_id,
    log.latency_ms,
    log.tokens_used ?? null,
  ];

  try {
    await db.query(query, params);
  } catch (error) {
    // Don't throw - tool execution should never fail because of logging
    logger.error('Failed to write tool execution log to database', {
      error: error instanceof Error ? error.message : String(error),
      log,
    });
  }
}

/**
 * Wrapper for tool execution that automatically logs to database
 * 
 * Example usage:
 * ```typescript
 * return await withToolLogging(
 *   'search_tasks',
 *   'vikunja_specialist',
 *   userId,
 *   traceId,
 *   args,
 *   async () => {
 *     // Your tool implementation
 *     return result;
 *   }
 * );
 * ```
 */
export async function withToolLogging<T>(
  toolName: string,
  agentType: 'supervisor' | 'vikunja_specialist' | 'calendar_specialist',
  userId: string,
  traceId: string,
  args: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let status: 'success' | 'error' | 'needs_clarification' = 'success';
  let result: T | undefined;
  let error: Error | null = null;

  try {
    result = await fn();
    
    // Detect needs_clarification from result if it's a ToolResult
    if (
      result &&
      typeof result === 'object' &&
      'type' in result &&
      (result as { type: string }).type === 'needs_clarification'
    ) {
      status = 'needs_clarification';
    }

    return result;
  } catch (err) {
    status = 'error';
    error = err instanceof Error ? err : new Error(String(err));
    throw err;
  } finally {
    const latencyMs = Date.now() - startTime;

    // Fire-and-forget logging
    logToolExecution({
      trace_id: traceId,
      tool_name: toolName,
      args,
      result: error
        ? { error: error.message }
        : result !== undefined
        ? (result as unknown as Record<string, unknown>)
        : {},
      status,
      agent_type: agentType,
      user_id: userId,
      latency_ms: latencyMs,
    }).catch(() => {
      // Already logged in logToolExecution, just swallow
    });
  }
}

/**
 * Query tool execution logs
 */
export async function queryToolExecutionLogs(filters: {
  userId?: string;
  toolName?: string;
  agentType?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<ToolExecutionLog[]> {
  if (!db.isReady()) {
    throw new Error('Database not ready');
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(filters.userId);
  }

  if (filters.toolName) {
    conditions.push(`tool_name = $${paramIndex++}`);
    params.push(filters.toolName);
  }

  if (filters.agentType) {
    conditions.push(`agent_type = $${paramIndex++}`);
    params.push(filters.agentType);
  }

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.startDate) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    params.push(filters.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 100;

  const query = `
    SELECT * FROM tool_execution_logs
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT $${paramIndex}
  `;

  params.push(limit);

  const result = await db.query(query, params);
  return result.rows as unknown as ToolExecutionLog[];
}

/**
 * Get token usage statistics
 */
export async function getTokenUsageStats(filters: {
  userId?: string;
  agentType?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalTokens: number;
  toolCount: number;
  avgLatencyMs: number;
}> {
  if (!db.isReady()) {
    throw new Error('Database not ready');
  }

  const conditions: string[] = ['tokens_used IS NOT NULL'];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(filters.userId);
  }

  if (filters.agentType) {
    conditions.push(`agent_type = $${paramIndex++}`);
    params.push(filters.agentType);
  }

  if (filters.startDate) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    params.push(filters.endDate);
  }

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT 
      COALESCE(SUM(tokens_used), 0) as total_tokens,
      COUNT(*) as tool_count,
      COALESCE(AVG(latency_ms), 0) as avg_latency_ms
    FROM tool_execution_logs
    WHERE ${whereClause}
  `;

  const result = await db.query<{
    total_tokens: string;
    tool_count: string;
    avg_latency_ms: string;
  }>(query, params);

  const row = result.rows[0];
  return {
    totalTokens: parseInt(row?.total_tokens ?? '0', 10),
    toolCount: parseInt(row?.tool_count ?? '0', 10),
    avgLatencyMs: parseFloat(row?.avg_latency_ms ?? '0'),
  };
}
