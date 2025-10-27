import { z } from 'zod';
import { ProjectTools, CreateProjectSchema, UpdateProjectSchema, DeleteProjectSchema, ArchiveProjectSchema, GetProjectSchema, GetAllProjectsSchema, ListProjectMembersSchema } from './projects.js';
import { TaskTools, CreateTaskSchema, UpdateTaskSchema, CompleteTaskSchema, DeleteTaskSchema, MoveTaskSchema, GetTaskSchema } from './tasks.js';
import { AssignmentTools, AssignTaskSchema, UnassignTaskSchema, AddLabelSchema, RemoveLabelSchema, CreateLabelSchema } from './assignments.js';
import { SearchTools, SearchTasksSchema, SearchProjectsSchema, GetMyTasksSchema, GetProjectTasksSchema } from './search.js';
import { BulkTools, BulkUpdateTasksSchema, BulkCompleteTasksSchema, BulkAssignTasksSchema, BulkAddLabelsSchema } from './bulk.js';
import { UserTools, GetUserInfoSchema } from './user.js';
import { createTaskRelation, getTaskRelations, deleteTaskRelation, CreateTaskRelationSchema, GetTaskRelationsSchema, DeleteTaskRelationSchema } from './relations.js';
import { addTaskComment, getTaskComments, updateTaskComment, deleteTaskComment, AddTaskCommentSchema, GetTaskCommentsSchema, UpdateTaskCommentSchema, DeleteTaskCommentSchema } from './comments.js';
import { getAllLabels, getLabel, updateLabel, deleteLabel, getTaskLabels, GetAllLabelsSchema, GetLabelSchema, UpdateLabelSchema, DeleteLabelSchema, GetTaskLabelsSchema } from './labels.js';
import { getTaskAttachments, GetTaskAttachmentsSchema } from './attachments.js';
import { VikunjaClient } from '../vikunja/client.js';
import { RateLimiter } from '../ratelimit/limiter.js';
import { UserContext } from '../auth/types.js';

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Tool execution function type
 */
export type ToolExecutor = (
  args: Record<string, unknown>,
  userContext: UserContext
) => Promise<unknown>;

/**
 * Tool registry for MCP server
 */
export class ToolRegistry {
  private readonly client: VikunjaClient;
  private readonly projectTools: ProjectTools;
  private readonly taskTools: TaskTools;
  private readonly assignmentTools: AssignmentTools;
  private readonly searchTools: SearchTools;
  private readonly bulkTools: BulkTools;
  private readonly userTools: UserTools;

  private readonly tools: Map<string, MCPTool>;
  private readonly executors: Map<string, ToolExecutor>;

  constructor(client: VikunjaClient, rateLimiter: RateLimiter) {
    this.client = client;
    this.projectTools = new ProjectTools(client, rateLimiter);
    this.taskTools = new TaskTools(client, rateLimiter);
    this.assignmentTools = new AssignmentTools(client, rateLimiter);
    this.searchTools = new SearchTools(client, rateLimiter);
    this.bulkTools = new BulkTools(client, rateLimiter);
    this.userTools = new UserTools(client, rateLimiter);

    this.tools = new Map();
    this.executors = new Map();

    this.registerAllTools();
  }

  /**
   * Register all tools with their schemas and executors
   */
  public registerAllTools(): void {
    // Project Tools
    this.registerTool(
      'create_project',
      'Create a new project (workspace/list) in Vikunja. Use this when starting a new area of work or organizing tasks. In Vikunja, "Project" is the term for what other tools call "workspace" or "list". Requires authentication (no specific project permission needed for creation). Returns the created project with its ID.',
      CreateProjectSchema,
      async (args, ctx) => this.projectTools.createProject(args as z.infer<typeof CreateProjectSchema>, ctx)
    );

    this.registerTool(
      'update_project',
      'Update an existing project\'s properties (title, description, color, parent). Use this to rename projects, change organization, or update visual settings. Requires write access to the project. Returns the updated project details.',
      UpdateProjectSchema,
      async (args, ctx) => this.projectTools.updateProject(args as z.infer<typeof UpdateProjectSchema>, ctx)
    );

    this.registerTool(
      'delete_project',
      'Permanently delete a project and all its tasks. Use this when you need to completely remove a project and cannot recover it later. This action cannot be undone. Use archive_project instead if you want to hide the project while preserving data. Requires admin permission on the project.',
      DeleteProjectSchema,
      async (args, ctx) => this.projectTools.deleteProject(args as z.infer<typeof DeleteProjectSchema>, ctx)
    );

    this.registerTool(
      'archive_project',
      'Archive or unarchive a project to hide/show it without deleting. Use this when a project is complete or temporarily inactive. Archived projects don\'t show in default lists but can be restored. Requires write access to the project. Returns the updated project.',
      ArchiveProjectSchema,
      async (args, ctx) => this.projectTools.archiveProject(args as z.infer<typeof ArchiveProjectSchema>, ctx)
    );

    this.registerTool(
      'get_project',
      'Retrieve a single project by its ID. Use this when you need complete project details (title, description, color, parent, archived status) for a known project ID. Requires read access to the project. This is more efficient than searching when you already have the ID (direct ID lookup vs text search). Use search_projects if you don\'t know the project ID. Returns the full project entity with metadata.',
      GetProjectSchema,
      async (args, ctx) => this.projectTools.getProject(args as z.infer<typeof GetProjectSchema>, ctx)
    );

    this.registerTool(
      'get_all_projects',
      'List all accessible projects without requiring a search query. Use this to discover available projects or get an overview of all workspaces. Supports pagination (page parameter, default page 1) and filtering by archived status (filter_archived: true for only archived, false for only active, omit for all). Use get_project for detailed information about a specific project when you know its ID. Returns an array of projects with pagination metadata (total, page, hasMore).',
      GetAllProjectsSchema,
      async (args, ctx) => this.projectTools.getAllProjects(args as z.infer<typeof GetAllProjectsSchema>, ctx)
    );

    this.registerTool(
      'list_project_members',
      'List all users who have access to a specific project. Use this to discover who can be assigned to tasks in the project or to understand project collaboration. Returns array of members with user details (id, username, email, name) and their access level (0=read, 1=write, 2=admin). Requires read access to the project. Use this before assign_task to see available assignees.',
      ListProjectMembersSchema,
      async (args, ctx) => this.projectTools.listProjectMembers(args as z.infer<typeof ListProjectMembersSchema>, ctx)
    );

    // Task Tools
    this.registerTool(
      'create_task',
      'Create a new task in a project. Use this for single task creation (for multiple tasks, use bulk_create_tasks for better performance). Supports recurring tasks via repeat_after (seconds) and repeat_mode (0=from due date, 1=monthly same date, 2=from completion). Examples: Weekly meeting (repeat_after=604800, repeat_mode=0), Monthly report on 1st (repeat_after=0, repeat_mode=1), Water plants every 3 days after completion (repeat_after=259200, repeat_mode=2). Requires write access to the parent project. Use update_task to modify after creation. Returns the created task with its ID.',
      CreateTaskSchema,
      async (args, ctx) => this.taskTools.createTask(args as z.infer<typeof CreateTaskSchema>, ctx)
    );

    this.registerTool(
      'update_task',
      'Update an existing task\'s properties. Use this to modify any task field (title, description, priority, due date, etc.). Priority values: 0=unset (default), 1=low, 2=medium, 3=high, 4=urgent, 5=critical. For completing only, consider complete_task. For moving projects, consider move_task. Supports updating recurrence settings: change repeat_after interval or repeat_mode behavior. Changing repeat_mode affects how the next occurrence is calculated. Requires write access to the parent project. Returns the updated task.',
      UpdateTaskSchema,
      async (args, ctx) => this.taskTools.updateTask(args as z.infer<typeof UpdateTaskSchema>, ctx)
    );

    this.registerTool(
      'complete_task',
      'Mark a task as complete/done. Use this instead of update_task when you only want to complete a task without other changes. For recurring tasks, this creates the next occurrence automatically. Requires write access to the parent project. Returns the updated task.',
      CompleteTaskSchema,
      async (args, ctx) => this.taskTools.completeTask(args as z.infer<typeof CompleteTaskSchema>, ctx)
    );

    this.registerTool(
      'delete_task',
      'Permanently delete a task. This action cannot be undone. The task is removed from all projects, relations, and user assignments. Requires write permission on the parent project. Returns success confirmation.',
      DeleteTaskSchema,
      async (args, ctx) => this.taskTools.deleteTask(args as z.infer<typeof DeleteTaskSchema>, ctx)
    );

    this.registerTool(
      'move_task',
      'Move a task to a different project. Use this to reorganize tasks across projects. The task keeps its properties (title, description, labels, etc.) but changes its parent project. Requires write permission on both projects. Returns the updated task.',
      MoveTaskSchema,
      async (args, ctx) => this.taskTools.moveTask(args as z.infer<typeof MoveTaskSchema>, ctx)
    );

    this.registerTool(
      'get_task',
      'Retrieve a single task by its ID. Use this when you need complete task details (title, description, priority, assignees, labels, relations) for a known task ID. Requires read access to the task. This is more efficient than searching when you already have the ID (direct ID lookup vs text search). Use search_tasks if you need flexible text search or filtering. Returns the full task entity with all relationships as expanded objects: related tasks (subtasks, parent tasks, blocking, duplicates, etc. with full task details), labels (with title, color, description), and assignees (with username, email, name).',
      GetTaskSchema,
      async (args, ctx) => this.taskTools.getTask(args as z.infer<typeof GetTaskSchema>, ctx)
    );

    // Assignment Tools
    this.registerTool(
      'assign_task',
      'Assign a user to a task for collaboration. Use this to delegate work or indicate responsibility. The user must have access to the parent project. Users receive notifications of assignment. Use list_project_members to see available assignees for a project. Requires write access to the task. Returns success confirmation.',
      AssignTaskSchema,
      async (args, ctx) => this.assignmentTools.assignTask(args as z.infer<typeof AssignTaskSchema>, ctx)
    );

    this.registerTool(
      'unassign_task',
      'Remove a user assignment from a task. Use this when work is reassigned or no longer needed. Requires write access to the task. Returns success confirmation.',
      UnassignTaskSchema,
      async (args, ctx) => this.assignmentTools.unassignTask(args as z.infer<typeof UnassignTaskSchema>, ctx)
    );

    this.registerTool(
      'add_label',
      'Add a label to a task for categorization and filtering. Use this to tag tasks with topics, priorities, or custom categories. The label must already exist (create with create_label first). Use get_all_labels to discover available labels. Requires write access to the task. Returns success confirmation.',
      AddLabelSchema,
      async (args, ctx) => this.assignmentTools.addLabel(args as z.infer<typeof AddLabelSchema>, ctx)
    );

    this.registerTool(
      'remove_label',
      'Remove a label from a task. Use this to uncategorize or change task organization. The label itself is not deleted, only the association. Use delete_label to permanently remove the label from ALL tasks. Requires write access to the task. Returns success confirmation.',
      RemoveLabelSchema,
      async (args, ctx) => this.assignmentTools.removeLabel(args as z.infer<typeof RemoveLabelSchema>, ctx)
    );

    this.registerTool(
      'create_label',
      'Create a new label for task categorization. Labels are project-independent and can be used across all tasks you can access. Specify hex_color as 6-character hex code without # prefix (e.g., "FF5733" for orange-red, "3498DB" for blue). Requires authentication (no specific project permission needed). Returns the created label with its ID.',
      CreateLabelSchema,
      async (args, ctx) => this.assignmentTools.createLabel(args as z.infer<typeof CreateLabelSchema>, ctx)
    );

    // Search Tools
    this.registerTool(
      'search_tasks',
      'Search for tasks by query string with advanced filtering. Use this when you need flexible text search with filters. For all user\'s tasks, use get_my_tasks. For project-specific tasks, use get_project_tasks. For single task by ID, use get_task. Supports pagination (page parameter, default page 1) and filtering by done status (filter_done: true/false), priority (filter_priority: 0-5 where 0=unset, 1=low, 5=critical), labels by ID (filter_labels, AND logic), labels by title (filter_label_titles for user-friendly search, e.g., ["@Computer", "@Home"], also AND logic), and assignees. Returns matching tasks with basic details. Note: Use filter_label_titles when you only know label names; it automatically looks up IDs by exact title match (case-insensitive).',
      SearchTasksSchema,
      async (args, ctx) => this.searchTools.searchTasks(args as z.infer<typeof SearchTasksSchema>, ctx)
    );

    this.registerTool(
      'search_projects',
      'Search for projects by query string. Use this to find projects by name or description when you don\'t know the exact ID. For direct access by ID, use get_project. For listing all projects, use get_all_projects. Supports filtering by archived status (filter_archived: true to show only archived, false for only active, omit for all) and pagination (page parameter, default page 1). Returns matching projects with basic details.',
      SearchProjectsSchema,
      async (args, ctx) => this.searchTools.searchProjects(args as z.infer<typeof SearchProjectsSchema>, ctx)
    );

    this.registerTool(
      'get_my_tasks',
      'Get all tasks assigned to the current user across all projects. Use this for personal task list views and "what are my tasks?" queries. Supports pagination (page parameter, default page 1) and filtering by done status (filter_done: true/false) and priority (filter_priority: 0-5). Returns tasks sorted by due date with basic details.',
      GetMyTasksSchema,
      async (args, ctx) => this.searchTools.getMyTasks(args as z.infer<typeof GetMyTasksSchema>, ctx)
    );

    this.registerTool(
      'get_project_tasks',
      'Get all tasks in a specific project. Use this for project-specific queries and "what needs to be done in project X?" views. Requires read access to the project. Supports pagination (page parameter, default page 1) and filtering by done status (filter_done: true/false) and priority (filter_priority: 0-5). Returns tasks in the specified project with basic details.',
      GetProjectTasksSchema,
      async (args, ctx) => this.searchTools.getProjectTasks(args as z.infer<typeof GetProjectTasksSchema>, ctx)
    );

    // Bulk Tools
    this.registerTool(
      'bulk_update_tasks',
      'Update multiple tasks at once with the same changes (max 100 tasks per call). Use this instead of individual update_task calls for better performance when applying identical changes to many tasks. Example: Mark 20 tasks as high priority (priority=3). Priority values: 0=unset, 1=low, 2=medium, 3=high, 4=urgent, 5=critical. Requires write access to all affected tasks. Returns array of updated tasks.',
      BulkUpdateTasksSchema,
      async (args, ctx) => this.bulkTools.bulkUpdateTasks(args as z.infer<typeof BulkUpdateTasksSchema>, ctx)
    );

    this.registerTool(
      'bulk_complete_tasks',
      'Mark multiple tasks as complete at once (max 100 tasks per call). Use this for batch completion operations. More efficient than calling complete_task multiple times. Requires write access to all affected tasks. Returns array of completed tasks.',
      BulkCompleteTasksSchema,
      async (args, ctx) => this.bulkTools.bulkCompleteTasks(args as z.infer<typeof BulkCompleteTasksSchema>, ctx)
    );

    this.registerTool(
      'bulk_assign_tasks',
      'Assign a user to multiple tasks at once (max 100 tasks per call). Use this for batch delegation. More efficient than calling assign_task multiple times. Requires write access to all affected tasks. Returns success confirmation with count.',
      BulkAssignTasksSchema,
      async (args, ctx) => this.bulkTools.bulkAssignTasks(args as z.infer<typeof BulkAssignTasksSchema>, ctx)
    );

    this.registerTool(
      'bulk_add_labels',
      'Add a label to multiple tasks at once (max 100 tasks per call). Use this for batch categorization. Example: Tag all Q4 tasks with "urgent" label. More efficient than calling add_label multiple times. Requires write access to all affected tasks. Returns success confirmation with count.',
      BulkAddLabelsSchema,
      async (args, ctx) => this.bulkTools.bulkAddLabels(args as z.infer<typeof BulkAddLabelsSchema>, ctx)
    );

    // Task Relation Tools
    this.registerTool(
      'create_task_relation',
      'Create a relationship between two tasks (subtask, blocker, related, etc.). Relation kinds: "subtask" (hierarchical child), "parenttask" (hierarchical parent), "related" (loose association), "duplicates" (same task), "blocking" (dependency: this blocks other), "blocked" (dependency: other blocks this), "precedes" (order: this before other), "follows" (order: this after other), "copiedfrom" (clone source), "copiedto" (clone target). Bidirectional relations created automatically (e.g., subtask creates inverse parenttask). Hierarchical relations (subtask/parenttask) prevent cycles. Use this for task dependencies, hierarchies, or associations. Requires write access to both tasks. Returns the created relation.',
      CreateTaskRelationSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof CreateTaskRelationSchema>;
        return createTaskRelation(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'get_task_relations',
      'Retrieve all relationships for a task, grouped by relation type (subtasks, parenttasks, blocking, etc.). Returns total count and metadata. Use this to understand task context, dependencies, and hierarchy. Requires read access to the task. Returns organized relation data.',
      GetTaskRelationsSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof GetTaskRelationsSchema>;
        return getTaskRelations(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'delete_task_relation',
      'Remove a relationship between two tasks. Bidirectional inverse relation also removed automatically. Must specify exact relation_kind. Use this to remove dependencies, unlink tasks, or clean up incorrect relations. Requires write access to both tasks. Returns success confirmation.',
      DeleteTaskRelationSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof DeleteTaskRelationSchema>;
        return deleteTaskRelation(validatedArgs, this.client, ctx.token);
      }
    );

    // Task Comment Tools
    this.registerTool(
      'add_task_comment',
      'Add a text comment to a task for team collaboration. Use this for progress notes, questions, decisions, or AI agent annotations. Comment author set from authentication token. Requires read access to the task. Returns created comment with id and timestamp.',
      AddTaskCommentSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof AddTaskCommentSchema>;
        return addTaskComment(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'get_task_comments',
      'Retrieve all comments for a task with pagination (page parameter, default page 1, page_size defaults to 50, max 100 per page). Comments in chronological order with author info (username, name, email). Use this to understand task history and team discussion before taking action. Requires read access to the task. Returns comments array with pagination metadata.',
      GetTaskCommentsSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof GetTaskCommentsSchema>;
        return getTaskComments(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'update_task_comment',
      'Modify an existing comment text. Use this to correct typos or add information. You can only update YOUR OWN comments unless admin. Returns updated comment with new timestamp.',
      UpdateTaskCommentSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof UpdateTaskCommentSchema>;
        return updateTaskComment(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'delete_task_comment',
      'Permanently remove a comment from a task. Use for outdated info or cleanup. You can only delete YOUR OWN comments unless admin. Cannot be undone. Returns success confirmation.',
      DeleteTaskCommentSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof DeleteTaskCommentSchema>;
        return deleteTaskComment(validatedArgs, this.client, ctx.token);
      }
    );

    // Label Management Tools
    this.registerTool(
      'get_all_labels',
      'List all labels visible to you with optional search (query parameter for text search) and pagination (page parameter, default page 1, page_size defaults to 50, max 100 per page). Labels are project-independent tags for categorizing tasks. Visibility: labels on accessible tasks + labels you created. Use this to discover available labels or search by title. Returns array of label objects with full details.',
      GetAllLabelsSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof GetAllLabelsSchema>;
        return getAllLabels(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'get_label',
      'Retrieve full details of a specific label by ID. Use this to check label properties (title, description, hex_color, creator) before using. Use get_all_labels to search by title if you don\'t know the ID. Returns label object with metadata.',
      GetLabelSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof GetLabelSchema>;
        return getLabel(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'update_label',
      'Modify label properties (title, description, hex_color). You can ONLY update labels YOU created. Hex color must be 6 characters WITHOUT # prefix (e.g., "FF5733" for orange-red, "3498DB" for blue). Changes affect all tasks using this label. Returns updated label.',
      UpdateLabelSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof UpdateLabelSchema>;
        return updateLabel(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'delete_label',
      'Permanently delete a label and remove from ALL tasks. You can ONLY delete labels YOU created. Deletion is permanent and cannot be undone. Use remove_label to detach from ONE task only. Returns success confirmation.',
      DeleteLabelSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof DeleteLabelSchema>;
        return deleteLabel(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'get_task_labels',
      'Retrieve all labels currently attached to a specific task. Use this to understand task categorization and metadata before modification. Requires read access to the task. Returns array of label objects with full details (title, color, creator).',
      GetTaskLabelsSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof GetTaskLabelsSchema>;
        return getTaskLabels(validatedArgs, this.client, ctx.token);
      }
    );

    // Task Attachment Tools
    this.registerTool(
      'get_task_attachments',
      'Retrieve metadata for all files attached to a task (filename, size, MIME type, upload info). Returns attachment details WITHOUT downloading file content. Use this to understand what files are associated with a task for context awareness. Requires read access to the task. Does NOT support file upload/download operations. Returns array of attachment metadata.',
      GetTaskAttachmentsSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof GetTaskAttachmentsSchema>;
        return getTaskAttachments(validatedArgs, this.client, ctx.token);
      }
    );

    // User Tools
    this.registerTool(
      'get_user_info',
      'Retrieve authenticated user profile information. Use this to understand the current user context for personalized responses or to display user details. Returns safe user fields (id, username, email, name, created, updated, language, timezone, overdue_tasks_reminders_enabled) while explicitly filtering sensitive data (passwords, tokens, secrets). No parameters required - uses authenticated session.',
      GetUserInfoSchema,
      async (args, ctx) => this.userTools.getUserInfo(args as z.infer<typeof GetUserInfoSchema>, ctx)
    );
  }

  /**
   * Register a single tool with its schema and executor
   */
  private registerTool(
    name: string,
    description: string,
    schema: z.ZodType,
    executor: ToolExecutor
  ): void {
    // Convert Zod schema to JSON Schema for MCP
    const inputSchema = this.zodToJsonSchema(schema);

    this.tools.set(name, {
      name,
      description,
      inputSchema,
    });

    // Wrap executor with validation
    this.executors.set(name, async (args, ctx) => {
      // Validate args with Zod schema
      const validatedArgs = schema.parse(args);
      return executor(validatedArgs as Record<string, unknown>, ctx);
    });
  }

  /**
   * Convert Zod schema to JSON Schema (simplified version)
   */
  private zodToJsonSchema(schema: z.ZodType): {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  } {
    // Get the schema shape if it's a ZodObject
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const zodType = value as z.ZodType;
        properties[key] = this.zodTypeToJsonSchema(zodType);

        // Check if field is required (not optional or nullable)
        if (!zodType.isOptional() && !zodType.isNullable()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        ...(required.length > 0 && { required }),
      };
    }

    // Fallback for non-object schemas
    return {
      type: 'object',
      properties: {},
    };
  }

  /**
   * Convert a Zod type to JSON Schema type
   */
  private zodTypeToJsonSchema(zodType: z.ZodType): Record<string, unknown> {
    // First, try to get description from the outermost type (handles .describe().optional())
    const outerDescription = (zodType as unknown as { _def?: { description?: string } })._def?.description;
    
    // Unwrap optional and nullable
    let type = zodType;
    const isOptional = type.isOptional();
    
    if (isOptional) {
      type = (type as z.ZodOptional<z.ZodType>)._def.innerType;
    }

    // Extract description from inner type if outer didn't have one
    const description = outerDescription || (type as unknown as { _def?: { description?: string } })._def?.description;
    const result: Record<string, unknown> = {};
    
    if (description) {
      result['description'] = description;
    }

    // Handle different Zod types
    if (type instanceof z.ZodString) {
      result['type'] = 'string';
      
      // Check for regex validation (for hex colors, etc.)
      const checks = (type)._def.checks;
      if (checks) {
        for (const check of checks) {
          if (check.kind === 'regex') {
            result['pattern'] = check.regex.source;
          } else if (check.kind === 'min') {
            result['minLength'] = check.value;
          } else if (check.kind === 'max') {
            result['maxLength'] = check.value;
          }
        }
      }
      
      return result;
    }

    if (type instanceof z.ZodNumber) {
      result['type'] = 'number';
      
      const checks = (type)._def.checks;
      if (checks) {
        for (const check of checks) {
          if (check.kind === 'min') {
            result['minimum'] = check.value;
          } else if (check.kind === 'max') {
            result['maximum'] = check.value;
          } else if (check.kind === 'int') {
            result['type'] = 'integer';
          }
        }
      }
      
      return result;
    }

    if (type instanceof z.ZodBoolean) {
      result['type'] = 'boolean';
      return result;
    }

    if (type instanceof z.ZodArray) {
      const itemType = (type as z.ZodArray<z.ZodType>)._def.type;
      result['type'] = 'array';
      result['items'] = this.zodTypeToJsonSchema(itemType);
      return result;
    }

    if (type instanceof z.ZodObject) {
      // For objects, merge the description with the schema
      const objectSchema = this.zodToJsonSchema(type);
      return description ? { ...objectSchema, description } : objectSchema;
    }

    if (type instanceof z.ZodLiteral) {
      result['type'] = typeof (type as z.ZodLiteral<unknown>)._def.value;
      result['const'] = (type as z.ZodLiteral<unknown>)._def.value;
      return result;
    }

    // Default fallback
    result['type'] = 'string';
    return result;
  }

  /**
   * Get all registered tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>,
    userContext: UserContext
  ): Promise<unknown> {
    const executor = this.executors.get(name);
    if (!executor) {
      throw new Error(`Tool not found: ${name}`);
    }

    return executor(args, userContext);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}
