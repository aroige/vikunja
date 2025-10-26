/**
 * Vikunja API type definitions
 */

export interface VikunjaUser {
  id: number;
  username: string;
  email: string;
  name: string;
  created: string;
  updated: string;
}

export interface VikunjaProject {
  id: number;
  title: string;
  description: string;
  owner: VikunjaUser;
  created: string;
  updated: string;
  is_archived: boolean;
  hex_color: string;
  parent_project_id: number;
}

export interface VikunjaTask {
  id: number;
  title: string;
  description: string;
  done: boolean;
  done_at: string | null;
  due_date: string | null;
  priority: number;
  labels: VikunjaLabel[];
  assignees: VikunjaUser[];
  project_id: number;
  created: string;
  updated: string;
  created_by: VikunjaUser;
}

export interface VikunjaLabel {
  id: number;
  title: string;
  description: string;
  hex_color: string;
  created: string;
  updated: string;
}

export interface VikunjaComment {
  id: number;
  comment: string;
  author: VikunjaUser;
  task_id: number;
  created: string;
  updated: string;
}

export interface VikunjaTeam {
  id: number;
  name: string;
  description: string;
  members: VikunjaUser[];
  created: string;
  updated: string;
}

export interface VikunjaBucket {
  id: number;
  title: string;
  project_id: number;
  limit: number;
  position: number;
  created: string;
  updated: string;
}

/**
 * Pagination Parameters
 * Optional pagination with sensible defaults
 */
export interface PaginationParams {
  page?: number;      // Page number (default: 1, minimum: 1)
  page_size?: number; // Items per page (default: 50, minimum: 1, maximum: 100)
}

/**
 * Paginated Response Wrapper
 * Generic type for paginated collections
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
}

/**
 * Relation Kind Enum
 * All possible relationship types between tasks
 */
export type RelationKind =
  | 'subtask'      // Task A is a subtask of task B (hierarchical)
  | 'parenttask'   // Task A is parent of task B (inverse of subtask)
  | 'related'      // Tasks are loosely associated (symmetric)
  | 'duplicateof'  // Task A duplicates task B
  | 'duplicates'   // Task A is duplicated by task B (inverse of duplicateof)
  | 'blocking'     // Task A blocks task B
  | 'blocked'      // Task A is blocked by task B (inverse of blocking)
  | 'precedes'     // Task A must happen before task B
  | 'follows'      // Task A follows task B (inverse of precedes)
  | 'copiedfrom'   // Task A was copied from task B
  | 'copiedto';    // Task A was copied to task B (inverse of copiedfrom)

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
  copiedto: 'copiedfrom',
};

/**
 * Hierarchical relation types that must prevent cycles
 */
export const HIERARCHICAL_RELATIONS: RelationKind[] = ['subtask', 'parenttask'];

/**
 * Task Relation
 * Represents a relationship between two tasks
 */
export interface TaskRelation {
  task_id: number;
  other_task_id: number;
  relation_kind: RelationKind;
  created_by: VikunjaUser;
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
 * Get Relations Response
 */
export interface GetRelationsResponse {
  task_id: number;
  relations: RelationsGrouped;
  total_count: number;
}

/**
 * Relation Operation Result
 */
export interface RelationOperationResult {
  success: boolean;
  task_id: number;
  other_task_id: number;
  relation_kind: RelationKind;
  message: string;
}
