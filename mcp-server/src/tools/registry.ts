import { z } from 'zod';
import { ProjectTools, CreateProjectSchema, UpdateProjectSchema, DeleteProjectSchema, ArchiveProjectSchema } from './projects.js';
import { TaskTools, CreateTaskSchema, UpdateTaskSchema, CompleteTaskSchema, DeleteTaskSchema, MoveTaskSchema } from './tasks.js';
import { AssignmentTools, AssignTaskSchema, UnassignTaskSchema, AddLabelSchema, RemoveLabelSchema, CreateLabelSchema } from './assignments.js';
import { SearchTools, SearchTasksSchema, SearchProjectsSchema, GetMyTasksSchema, GetProjectTasksSchema } from './search.js';
import { BulkTools, BulkUpdateTasksSchema, BulkCompleteTasksSchema, BulkAssignTasksSchema, BulkAddLabelsSchema } from './bulk.js';
import { createTaskRelation, getTaskRelations, deleteTaskRelation, CreateTaskRelationSchema, GetTaskRelationsSchema, DeleteTaskRelationSchema } from './relations.js';
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

  private readonly tools: Map<string, MCPTool>;
  private readonly executors: Map<string, ToolExecutor>;

  constructor(client: VikunjaClient, rateLimiter: RateLimiter) {
    this.client = client;
    this.projectTools = new ProjectTools(client, rateLimiter);
    this.taskTools = new TaskTools(client, rateLimiter);
    this.assignmentTools = new AssignmentTools(client, rateLimiter);
    this.searchTools = new SearchTools(client, rateLimiter);
    this.bulkTools = new BulkTools(client, rateLimiter);

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
      'Create a new project (workspace/list) in Vikunja. Use this when starting a new area of work or organizing tasks. In Vikunja, "Project" is the term for what other tools call "workspace" or "list". Returns the created project with its ID.',
      CreateProjectSchema,
      async (args, ctx) => this.projectTools.createProject(args as z.infer<typeof CreateProjectSchema>, ctx)
    );

    this.registerTool(
      'update_project',
      'Update an existing project\'s properties (title, description, color, parent). Use this to rename projects, change organization, or update visual settings. Returns the updated project details.',
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
      'Archive or unarchive a project to hide/show it without deleting. Use this when a project is complete or temporarily inactive. Archived projects don\'t show in default lists but can be restored. Returns the updated project.',
      ArchiveProjectSchema,
      async (args, ctx) => this.projectTools.archiveProject(args as z.infer<typeof ArchiveProjectSchema>, ctx)
    );

    // Task Tools
    this.registerTool(
      'create_task',
      'Create a new task in a project. Use this for single task creation (for multiple tasks, use bulk_create_tasks for better performance). Supports recurring tasks via repeat_after (seconds) and repeat_mode (0=from due date, 1=monthly same date, 2=from completion). Examples: Weekly meeting (repeat_after=604800, repeat_mode=0), Monthly report on 1st (repeat_after=0, repeat_mode=1), Water plants every 3 days after completion (repeat_after=259200, repeat_mode=2). Returns the created task with its ID.',
      CreateTaskSchema,
      async (args, ctx) => this.taskTools.createTask(args as z.infer<typeof CreateTaskSchema>, ctx)
    );

    this.registerTool(
      'update_task',
      'Update an existing task\'s properties. Use this to modify any task field (title, description, priority, due date, etc.). For completing only, consider complete_task. For moving projects, consider move_task. Supports updating recurrence settings: change repeat_after interval or repeat_mode behavior. Changing repeat_mode affects how the next occurrence is calculated. Returns the updated task.',
      UpdateTaskSchema,
      async (args, ctx) => this.taskTools.updateTask(args as z.infer<typeof UpdateTaskSchema>, ctx)
    );

    this.registerTool(
      'complete_task',
      'Mark a task as complete/done. Use this instead of update_task when you only want to complete a task without other changes. For recurring tasks, this creates the next occurrence automatically. Returns the updated task.',
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

    // Assignment Tools
    this.registerTool(
      'assign_task',
      'Assign a user to a task for collaboration. Use this to delegate work or indicate responsibility. The user must have access to the parent project. Users receive notifications of assignment. Returns success confirmation.',
      AssignTaskSchema,
      async (args, ctx) => this.assignmentTools.assignTask(args as z.infer<typeof AssignTaskSchema>, ctx)
    );

    this.registerTool(
      'unassign_task',
      'Remove a user assignment from a task. Use this when work is reassigned or no longer needed. Returns success confirmation.',
      UnassignTaskSchema,
      async (args, ctx) => this.assignmentTools.unassignTask(args as z.infer<typeof UnassignTaskSchema>, ctx)
    );

    this.registerTool(
      'add_label',
      'Add a label to a task for categorization and filtering. Use this to tag tasks with topics, priorities, or custom categories. The label must already exist (create with create_label first). Returns success confirmation.',
      AddLabelSchema,
      async (args, ctx) => this.assignmentTools.addLabel(args as z.infer<typeof AddLabelSchema>, ctx)
    );

    this.registerTool(
      'remove_label',
      'Remove a label from a task. Use this to uncategorize or change task organization. The label itself is not deleted, only the association. Returns success confirmation.',
      RemoveLabelSchema,
      async (args, ctx) => this.assignmentTools.removeLabel(args as z.infer<typeof RemoveLabelSchema>, ctx)
    );

    this.registerTool(
      'create_label',
      'Create a new label for task categorization. Labels are project-independent and can be used across all tasks you can access. Specify hex_color as 6-character hex code without # (e.g., "FF5733" for orange-red). Returns the created label with its ID.',
      CreateLabelSchema,
      async (args, ctx) => this.assignmentTools.createLabel(args as z.infer<typeof CreateLabelSchema>, ctx)
    );

    // Search Tools
    this.registerTool(
      'search_tasks',
      'Search for tasks by query string with advanced filtering. Use this when you need flexible text search with filters. For all user\'s tasks, use get_my_tasks. For project-specific tasks, use get_project_tasks. Supports pagination and filtering by done status, priority, labels (AND logic), and assignees. Returns matching tasks.',
      SearchTasksSchema,
      async (args, ctx) => this.searchTools.searchTasks(args as z.infer<typeof SearchTasksSchema>, ctx)
    );

    this.registerTool(
      'search_projects',
      'Search for projects by query string. Use this to find projects by name or description. Supports filtering by archived status and pagination. Returns matching projects.',
      SearchProjectsSchema,
      async (args, ctx) => this.searchTools.searchProjects(args as z.infer<typeof SearchProjectsSchema>, ctx)
    );

    this.registerTool(
      'get_my_tasks',
      'Get all tasks assigned to the current user across all projects. Use this for personal task list views. Supports pagination and filtering by done status and priority. Returns tasks sorted by due date. This is the primary tool for "what are my tasks?" queries.',
      GetMyTasksSchema,
      async (args, ctx) => this.searchTools.getMyTasks(args as z.infer<typeof GetMyTasksSchema>, ctx)
    );

    this.registerTool(
      'get_project_tasks',
      'Get all tasks in a specific project. Use this for project-specific queries and views. Supports pagination and filtering by done status and priority. Returns tasks in the specified project, useful for "what needs to be done in project X?" queries.',
      GetProjectTasksSchema,
      async (args, ctx) => this.searchTools.getProjectTasks(args as z.infer<typeof GetProjectTasksSchema>, ctx)
    );

    // Bulk Tools
    this.registerTool(
      'bulk_update_tasks',
      'Update multiple tasks at once with the same changes (max 100 tasks). Use this instead of individual update_task calls for better performance when applying identical changes to many tasks. Example: Mark 20 tasks as high priority. Returns array of updated tasks.',
      BulkUpdateTasksSchema,
      async (args, ctx) => this.bulkTools.bulkUpdateTasks(args as z.infer<typeof BulkUpdateTasksSchema>, ctx)
    );

    this.registerTool(
      'bulk_complete_tasks',
      'Mark multiple tasks as complete at once (max 100 tasks). Use this for batch completion operations. More efficient than calling complete_task multiple times. Returns array of completed tasks.',
      BulkCompleteTasksSchema,
      async (args, ctx) => this.bulkTools.bulkCompleteTasks(args as z.infer<typeof BulkCompleteTasksSchema>, ctx)
    );

    this.registerTool(
      'bulk_assign_tasks',
      'Assign a user to multiple tasks at once (max 100 tasks). Use this for batch delegation. More efficient than calling assign_task multiple times. Returns success confirmation with count.',
      BulkAssignTasksSchema,
      async (args, ctx) => this.bulkTools.bulkAssignTasks(args as z.infer<typeof BulkAssignTasksSchema>, ctx)
    );

    this.registerTool(
      'bulk_add_labels',
      'Add a label to multiple tasks at once (max 100 tasks). Use this for batch categorization. Example: Tag all Q4 tasks with "urgent" label. More efficient than calling add_label multiple times. Returns success confirmation with count.',
      BulkAddLabelsSchema,
      async (args, ctx) => this.bulkTools.bulkAddLabels(args as z.infer<typeof BulkAddLabelsSchema>, ctx)
    );

    // Task Relation Tools
    this.registerTool(
      'create_task_relation',
      'Create a relationship between two tasks (subtask, blocker, related, etc.). Bidirectional relations created automatically. Hierarchical relations (subtask/parenttask) prevent cycles. Use this for task dependencies, hierarchies, or associations.',
      CreateTaskRelationSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof CreateTaskRelationSchema>;
        return createTaskRelation(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'get_task_relations',
      'Retrieve all relationships for a task, grouped by relation type (subtasks, parenttasks, blocking, etc.). Returns total count and metadata. Use this to understand task context, dependencies, and hierarchy.',
      GetTaskRelationsSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof GetTaskRelationsSchema>;
        return getTaskRelations(validatedArgs, this.client, ctx.token);
      }
    );

    this.registerTool(
      'delete_task_relation',
      'Remove a relationship between two tasks. Bidirectional inverse relation also removed automatically. Must specify exact relation_kind. Use this to remove dependencies, unlink tasks, or clean up incorrect relations.',
      DeleteTaskRelationSchema,
      async (args, ctx) => {
        const validatedArgs = args as z.infer<typeof DeleteTaskRelationSchema>;
        return deleteTaskRelation(validatedArgs, this.client, ctx.token);
      }
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
