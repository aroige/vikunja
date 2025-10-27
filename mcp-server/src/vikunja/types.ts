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

/**
 * Recurring task repeat modes (used with repeat_after parameter).
 * 
 * @enum {number}
 */
export enum RepeatMode {
  /**
   * DEFAULT mode (0): Repeat from the task's due date.
   * Best for: Regular scheduled tasks like weekly meetings, daily standups.
   * Example: Weekly meeting due Monday 10am repeats every Monday at 10am.
   */
  DEFAULT = 0,

  /**
   * MONTHLY mode (1): Repeat on the same calendar date each month.
   * Best for: Monthly bills, reports due on specific dates (1st, 15th, etc.).
   * Note: Use repeat_after=0 with this mode.
   * Example: Bill due on 1st of each month always repeats on the 1st.
   */
  MONTHLY = 1,

  /**
   * FROM_CURRENT mode (2): Repeat from the completion date.
   * Best for: Flexible recurring tasks that depend on when the previous one finished.
   * Example: "Water plants every 3 days" - creates new task 3 days after you complete it.
   */
  FROM_CURRENT = 2,

  /**
   * WEEKDAYS mode (3): Repeat only on weekdays (Monday-Friday).
   * Best for: Work-related tasks that only occur on business days.
   * Skips weekends automatically - completing a Friday task creates Monday recurrence.
   * Example: "Daily standup" repeats Monday-Friday, skips weekends.
   */
  WEEKDAYS = 3,

  /**
   * WEEKENDS mode (4): Repeat only on weekends (Saturday-Sunday).
   * Best for: Personal tasks that only occur on weekends.
   * Skips weekdays automatically - completing a Sunday task creates Saturday recurrence.
   * Example: "Clean house" repeats Saturday-Sunday only.
   */
  WEEKENDS = 4,
}

export interface VikunjaLabel {
  id: number;
  title: string;
  description: string;
  hex_color: string;
  created_by: VikunjaUser;
  created: string;
  updated: string;
}

/**
 * Label Type Alias
 * Used for consistency across the codebase
 */
export type Label = VikunjaLabel;

export interface VikunjaComment {
  id: number;
  comment: string;
  author: VikunjaUser;
  task_id: number;
  created: string;
  updated: string;
}

/**
 * Task Comment Type Alias
 * Used for consistency across the codebase
 */
export type TaskComment = VikunjaComment;

/**
 * Task Attachment
 * Represents file metadata attached to a task (no file content)
 */
export interface TaskAttachment {
  id: number;
  task_id: number;
  file_id: number;
  filename: string;
  size: number;           // File size in bytes
  mime_type: string;      // MIME type (e.g., 'application/pdf', 'image/png')
  created_by: VikunjaUser;
  created: string;        // ISO 8601
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
  total_pages: number;
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
  message: string;
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

/**
 * Get Task Attachments Response
 */
export interface GetTaskAttachmentsResponse {
  success: boolean;
  attachments: TaskAttachment[];
  count: number;
}
