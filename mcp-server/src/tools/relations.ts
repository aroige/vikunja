import { z } from 'zod';
import { VikunjaClient } from '../vikunja/client.js';
import { formatPermissionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { GetRelationsResponse, RelationOperationResult } from '../vikunja/types.js';

/**
 * Input schemas for task relation tools
 */

// Relation kind enum for Zod validation
const RelationKindEnum = z.enum([
  'subtask',
  'parenttask',
  'related',
  'duplicateof',
  'duplicates',
  'blocking',
  'blocked',
  'precedes',
  'follows',
  'copiedfrom',
  'copiedto',
]);

export const CreateTaskRelationSchema = z.object({
  task_id: z.number().int().positive()
    .describe('ID of the first task in the relationship. This is the "source" task from which the relation originates.'),
  other_task_id: z.number().int().positive()
    .describe('ID of the second task in the relationship. This is the "target" task that the relation points to.'),
  relation_kind: RelationKindEnum
    .describe(`Type of relationship between tasks. Available relation kinds:

**Hierarchical Relations (prevent cycles):**
- subtask: Task A is a subtask of task B (creates parent-child hierarchy)
- parenttask: Task A is parent of task B (inverse of subtask)

**Dependency Relations:**
- blocking: Task A blocks task B (B cannot start until A is done)
- blocked: Task A is blocked by task B (inverse of blocking)
- precedes: Task A must happen before task B (sequence dependency)
- follows: Task A follows task B (inverse of precedes)

**Association Relations:**
- related: Tasks are loosely associated (symmetric, no hierarchy)
- duplicateof: Task A duplicates task B (same work, different tasks)
- duplicates: Task A is duplicated by task B (inverse of duplicateof)
- copiedfrom: Task A was copied from task B (clone tracking)
- copiedto: Task A was copied to task B (inverse of copiedfrom)

**Bidirectional Creation:** Creating relation A→B automatically creates inverse relation B→A (e.g., creating "subtask" also creates "parenttask" in reverse).

**Cycle Prevention:** Hierarchical relations (subtask/parenttask) prevent circular dependencies. Creating a cycle will return an error.`),
}).refine(
  (data) => data.task_id !== data.other_task_id,
  { message: 'Cannot create relation between task and itself' }
);

export const GetTaskRelationsSchema = z.object({
  task_id: z.number().int().positive()
    .describe('ID of the task to retrieve relations for. Returns all relations grouped by type (subtasks, parenttasks, blocking, etc.).'),
});

export const DeleteTaskRelationSchema = z.object({
  task_id: z.number().int().positive()
    .describe('ID of the first task in the relationship to delete.'),
  other_task_id: z.number().int().positive()
    .describe('ID of the second task in the relationship to delete.'),
  relation_kind: RelationKindEnum
    .describe(`Type of relationship to delete. Must match the exact relation kind that was created. Deleting relation A→B automatically deletes inverse relation B→A. 

**Valid relation types:**
- subtask/parenttask (hierarchical)
- related (association)
- duplicateof/duplicates (duplication)
- blocking/blocked (dependency)
- precedes/follows (sequence)
- copiedfrom/copiedto (clone tracking)

Example: To delete "Task 1 is subtask of Task 2", specify task_id=1, other_task_id=2, relation_kind="subtask". The inverse relation (Task 2 is parenttask of Task 1) is automatically deleted.`),
});

export type CreateTaskRelationInput = z.infer<typeof CreateTaskRelationSchema>;
export type GetTaskRelationsInput = z.infer<typeof GetTaskRelationsSchema>;
export type DeleteTaskRelationInput = z.infer<typeof DeleteTaskRelationSchema>;

/**
 * Create task relation
 * 
 * **Purpose**: Establish a relationship between two tasks to represent dependencies, hierarchies, or associations.
 * 
 * **When to use**:
 * - Creating subtasks for larger tasks (task A is subtask of task B)
 * - Marking blockers/dependencies (task A blocks task B)
 * - Linking related work (task A related to task B)
 * - Tracking duplicates or copied tasks
 * 
 * **Expected outcome**:
 * - Relation created successfully
 * - Bidirectional inverse relation also created automatically
 * - For hierarchical relations, cycle detection prevents circular dependencies
 * 
 * **Error scenarios**:
 * - Permission denied (need write access to both tasks)
 * - Cycle detected (hierarchical relations only)
 * - Task not found (invalid task IDs)
 * - Relation already exists
 */
export async function createTaskRelation(
  input: CreateTaskRelationInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<RelationOperationResult> {
  try {
    logger.info('Creating task relation', {
      task_id: input.task_id,
      other_task_id: input.other_task_id,
      relation_kind: input.relation_kind,
    });

    const result = await vikunjaClient.createTaskRelation(
      input.task_id,
      input.other_task_id,
      input.relation_kind,
      token
    );

    logger.info('Task relation created successfully', { result });
    return result;
  } catch (error) {
    logger.error('Failed to create task relation', { error, input });
    
    // Format permission errors with resource context
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        throw new Error(formatPermissionError('task relation', undefined, 'create'));
      }
    }
    
    throw error;
  }
}

/**
 * Get task relations
 * 
 * **Purpose**: Retrieve all relationships for a task, grouped by relation type.
 * 
 * **When to use**:
 * - View task's subtasks and parent tasks (hierarchy)
 * - Check task blockers and dependencies
 * - Find related or duplicate tasks
 * - Understand task context before making changes
 * 
 * **Expected outcome**:
 * - Relations grouped by kind (subtasks[], parenttasks[], blocking[], etc.)
 * - Total count of all relations
 * - Empty groups omitted from response
 * - Includes metadata (created_by, created_at) for each relation
 * 
 * **Output format**:
 * ```json
 * {
 *   "task_id": 123,
 *   "relations": {
 *     "subtasks": [...],
 *     "blocking": [...],
 *     "related": [...]
 *   },
 *   "total_count": 5
 * }
 * ```
 * 
 * **Error scenarios**:
 * - Permission denied (need read access to task)
 * - Task not found
 */
export async function getTaskRelations(
  input: GetTaskRelationsInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<GetRelationsResponse> {
  try {
    logger.info('Getting task relations', { task_id: input.task_id });

    const result = await vikunjaClient.getTaskRelations(
      input.task_id,
      token
    );

    logger.info('Task relations retrieved successfully', { 
      task_id: input.task_id,
      total_count: result.total_count,
    });
    
    return result;
  } catch (error) {
    logger.error('Failed to get task relations', { error, input });
    
    // Format permission errors with resource context
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        throw new Error(formatPermissionError('task relation', input.task_id, 'read'));
      }
    }
    
    throw error;
  }
}

/**
 * Delete task relation
 * 
 * **Purpose**: Remove a relationship between two tasks.
 * 
 * **When to use**:
 * - Task is no longer a subtask of parent
 * - Blocker is resolved or no longer relevant
 * - Incorrect relation was created
 * - Cleaning up task relationships
 * 
 * **Expected outcome**:
 * - Relation removed successfully
 * - Bidirectional inverse relation also removed automatically
 * - Task hierarchy/dependencies updated
 * 
 * **Note**: You must specify the exact relation_kind that was created. For example, if you created a "subtask" relation, delete with relation_kind="subtask" (not "parenttask").
 * 
 * **Error scenarios**:
 * - Permission denied (need write access to both tasks)
 * - Relation not found (already deleted or never existed)
 * - Task not found
 */
export async function deleteTaskRelation(
  input: DeleteTaskRelationInput,
  vikunjaClient: VikunjaClient,
  token: string
): Promise<RelationOperationResult> {
  try {
    logger.info('Deleting task relation', {
      task_id: input.task_id,
      other_task_id: input.other_task_id,
      relation_kind: input.relation_kind,
    });

    const result = await vikunjaClient.deleteTaskRelation(
      input.task_id,
      input.other_task_id,
      input.relation_kind,
      token
    );

    logger.info('Task relation deleted successfully', { result });
    return result;
  } catch (error) {
    logger.error('Failed to delete task relation', { error, input });
    
    // Format permission errors with resource context
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError.response?.status === 403) {
        throw new Error(formatPermissionError('task relation', input.task_id, 'delete'));
      }
    }
    
    throw error;
  }
}

/**
 * Export tool definitions for MCP server
 */
export const relationTools = {
  create_task_relation: {
    description: 'Create a relationship between two tasks (subtask, blocker, related, etc.). Bidirectional relations created automatically. Hierarchical relations (subtask/parenttask) prevent cycles.',
    inputSchema: CreateTaskRelationSchema,
    handler: createTaskRelation,
  },
  get_task_relations: {
    description: 'Retrieve all relationships for a task, grouped by relation type (subtasks, parenttasks, blocking, etc.). Returns total count and metadata.',
    inputSchema: GetTaskRelationsSchema,
    handler: getTaskRelations,
  },
  delete_task_relation: {
    description: 'Remove a relationship between two tasks. Bidirectional inverse relation also removed automatically. Must specify exact relation_kind.',
    inputSchema: DeleteTaskRelationSchema,
    handler: deleteTaskRelation,
  },
};
