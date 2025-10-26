/**
 * Task Relations Contract
 * 
 * Zod schemas and TypeScript types for task relationship operations.
 * Implements bidirectional relations with cycle prevention for hierarchical types.
 */

import { z } from 'zod';

/**
 * Relation Kind Enum
 * All possible relationship types between tasks
 */
export const RelationKindSchema = z.enum([
  'subtask',      // Task A is a subtask of task B (hierarchical)
  'parenttask',   // Task A is parent of task B (inverse of subtask)
  'related',      // Tasks are loosely associated (symmetric)
  'duplicateof',  // Task A duplicates task B
  'duplicates',   // Task A is duplicated by task B (inverse of duplicateof)
  'blocking',     // Task A blocks task B
  'blocked',      // Task A is blocked by task B (inverse of blocking)
  'precedes',     // Task A must happen before task B
  'follows',      // Task A follows task B (inverse of precedes)
  'copiedfrom',   // Task A was copied from task B
  'copiedto'      // Task A was copied to task B (inverse of copiedfrom)
]);

export type RelationKind = z.infer<typeof RelationKindSchema>;

/**
 * Bidirectional relation mapping
 * When creating A→B with kind X, system automatically creates B→A with inverse kind
 */
export const RELATION_INVERSES: Record<RelationKind, RelationKind> = {
  subtask: 'parenttask',
  parenttask: 'subtask',
  related: 'related',        // Symmetric relation
  duplicateof: 'duplicates',
  duplicates: 'duplicateof',
  blocking: 'blocked',
  blocked: 'blocking',
  precedes: 'follows',
  follows: 'precedes',
  copiedfrom: 'copiedto',
  copiedto: 'copiedfrom'
};

/**
 * Hierarchical relation types that must prevent cycles
 */
export const HIERARCHICAL_RELATIONS: RelationKind[] = ['subtask', 'parenttask'];

/**
 * Create Task Relation Input Schema
 */
export const CreateTaskRelationSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the first task in the relationship"),
  other_task_id: z.number().int().positive()
    .describe("ID of the second task in the relationship"),
  relation_kind: RelationKindSchema
    .describe("Type of relationship. subtask/parenttask = hierarchical (prevents cycles), related = loose association, blocking/blocked = dependency, duplicates/duplicateof = same work, precedes/follows = sequence, copiedfrom/copiedto = cloned task tracking")
}).refine(
  (data) => data.task_id !== data.other_task_id,
  { message: "Cannot create relation between task and itself" }
);

export type CreateTaskRelationInput = z.infer<typeof CreateTaskRelationSchema>;

/**
 * Get Task Relations Input Schema
 */
export const GetTaskRelationsSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the task to retrieve relations for")
});

export type GetTaskRelationsInput = z.infer<typeof GetTaskRelationsSchema>;

/**
 * Delete Task Relation Input Schema
 */
export const DeleteTaskRelationSchema = z.object({
  task_id: z.number().int().positive()
    .describe("ID of the first task in the relationship"),
  other_task_id: z.number().int().positive()
    .describe("ID of the second task in the relationship"),
  relation_kind: RelationKindSchema
    .describe("Type of relationship to delete")
});

export type DeleteTaskRelationInput = z.infer<typeof DeleteTaskRelationSchema>;

/**
 * Task Relation Response (from Vikunja API)
 */
export interface TaskRelation {
  task_id: number;
  other_task_id: number;
  relation_kind: RelationKind;
  created_by: {
    id: number;
    username: string;
    name: string;
    email: string;
  };
  created_at: string; // ISO 8601
}

/**
 * Relations Grouped by Kind
 * Used when retrieving all relations for a task
 */
export interface RelationsGrouped {
  subtasks?: TaskRelation[];
  parenttasks?: TaskRelation[];
  related?: TaskRelation[];
  duplicates?: TaskRelation[];
  duplicateof?: TaskRelation[];
  blocking?: TaskRelation[];
  blocked?: TaskRelation[];
  precedes?: TaskRelation[];
  follows?: TaskRelation[];
  copiedfrom?: TaskRelation[];
  copiedto?: TaskRelation[];
}

/**
 * Operation Result
 */
export interface RelationOperationResult {
  success: boolean;
  task_id: number;
  other_task_id: number;
  relation_kind: RelationKind;
  message: string;
}

/**
 * Get Relations Response
 */
export interface GetRelationsResponse {
  task_id: number;
  relations: RelationsGrouped;
  total_count: number;
}
