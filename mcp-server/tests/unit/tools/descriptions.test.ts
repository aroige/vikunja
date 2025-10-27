import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../../../src/tools/registry.js';
import { VikunjaClient } from '../../../src/vikunja/client.js';
import { RateLimiter } from '../../../src/ratelimit/limiter.js';
import { logger } from '../../../src/utils/logger.js';

// Mock dependencies
const mockClient = {
  get: async () => ({}),
  post: async () => ({}),
  put: async () => ({}),
  delete: async () => ({}),
} as unknown as VikunjaClient;

const mockRateLimiter = {
  checkLimit: async () => true,
} as unknown as RateLimiter;

describe('Tool Description Quality Tests (US1)', () => {
  it('should ensure all tools have comprehensive descriptions with required elements (FR-001)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();

    // Verify we have all expected tools (25+ including get_project, get_all_projects, get_task, get_user_info from 010-mcp-missing-tools)
    expect(tools.length).toBeGreaterThanOrEqual(25);

    // Track validation results
    const validationResults: Array<{ name: string; issues: string[] }> = [];

    tools.forEach((tool) => {
      const issues: string[] = [];

      // FR-001: Check for one-line purpose (description should start with clear action verb)
      if (!tool.description || tool.description.length < 20) {
        issues.push('Description too short (should be at least 20 characters) - FR-001');
      }

      // FR-001: Check for when to use scenario or expected outcome
      // Good descriptions should mention "when", "use this", "returns", or similar guidance
      const hasGuidance = 
        tool.description.toLowerCase().includes('use this') ||
        tool.description.toLowerCase().includes('when ') ||
        tool.description.toLowerCase().includes('returns ') ||
        tool.description.toLowerCase().includes('retrieves ') ||
        tool.description.toLowerCase().includes('creates ');
      
      if (!hasGuidance) {
        issues.push('Description lacks use case or outcome guidance - FR-001');
      }

      // FR-001: Check that parameters have descriptions with examples or constraints
      if (tool.inputSchema?.properties) {
        const properties = tool.inputSchema.properties as Record<string, { description?: string }>;
        Object.entries(properties).forEach(([paramName, paramDef]) => {
          if (!paramDef.description || paramDef.description.length < 10) {
            issues.push(`Parameter '${paramName}' lacks adequate description - FR-001`);
          }

          // FR-003: Special check for repeat_after and repeat_mode (recurring task parameters)
          if (paramName === 'repeat_after' && paramDef.description) {
            const hasSecondsNote = paramDef.description.toLowerCase().includes('second');
            const hasExamples = 
              paramDef.description.includes('86400') || // daily
              paramDef.description.includes('604800') || // weekly
              paramDef.description.includes('example');
            
            if (!hasSecondsNote) {
              issues.push(`Parameter 'repeat_after' should specify unit (seconds) - FR-003`);
            }
            if (!hasExamples) {
              issues.push(`Parameter 'repeat_after' should include examples (e.g., 86400=1day) - FR-003`);
            }
          }

          // FR-003: Check repeat_mode parameter
          if (paramName === 'repeat_mode' && paramDef.description) {
            const hasModeExplanations = 
              paramDef.description.includes('0') &&
              paramDef.description.includes('1') &&
              paramDef.description.includes('2');
            
            if (!hasModeExplanations) {
              issues.push(`Parameter 'repeat_mode' should explain modes 0, 1, and 2 - FR-003`);
            }
          }

          // FR-003: Check priority parameter (0-5 scale)
          if (paramName === 'priority' && paramDef.description) {
            const hasScaleExplanation = 
              paramDef.description.includes('0') &&
              (paramDef.description.includes('5') || paramDef.description.includes('scale'));
            
            if (!hasScaleExplanation) {
              issues.push(`Parameter 'priority' should explain 0-5 scale - FR-003`);
            }
          }

          // FR-003: Check relation_kind parameter (all 10 types)
          if (paramName === 'relation_kind' && paramDef.description) {
            const relationTypes = [
              'subtask', 'parenttask', 'related', 'duplicates', 'duplicateof',
              'blocking', 'blocked', 'precedes', 'follows', 'copiedfrom', 'copiedto'
            ];
            const mentionedTypes = relationTypes.filter(type => 
              paramDef.description!.toLowerCase().includes(type)
            );
            
            if (mentionedTypes.length < 5) {
              issues.push(`Parameter 'relation_kind' should list relation types with examples - FR-003 (found ${mentionedTypes.length}/10 types)`);
            }
          }

          // FR-003: Check hex_color parameter
          if (paramName === 'hex_color' && paramDef.description) {
            const hasFormatExplanation = 
              (paramDef.description.includes('6') && paramDef.description.includes('character')) ||
              paramDef.description.toLowerCase().includes('without #') ||
              paramDef.description.toLowerCase().includes('without the #');
            
            if (!hasFormatExplanation) {
              issues.push(`Parameter 'hex_color' should explain 6-character format without # - FR-003`);
            }
          }
        });
      }

      // FR-004: Check for Vikunja terminology explanations where needed
      // Project-related tools should clarify Vikunja's "Project" terminology
      if (tool.name.includes('project') && !tool.name.includes('search')) {
        const mentionsVikunjaTerminology = 
          tool.description.toLowerCase().includes('project') ||
          tool.description.toLowerCase().includes('workspace') ||
          tool.description.toLowerCase().includes('list');
        
        if (!mentionsVikunjaTerminology) {
          logger.warn(`Tool '${tool.name}' may benefit from Vikunja terminology clarification - FR-004`);
        }
      }

      if (issues.length > 0) {
        validationResults.push({ name: tool.name, issues });
      }
    });

    // Fail test if any tools have issues
    if (validationResults.length > 0) {
      const errorMessage = validationResults
        .map(({ name, issues }) => `\n${name}:\n  - ${issues.join('\n  - ')}`)
        .join('\n');
      
      throw new Error(`Tool description quality check failed for ${validationResults.length} tool(s):${errorMessage}`);
    }
  });

  it('should verify create_task has comprehensive recurring task parameter descriptions', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();
    const createTask = tools.find((t) => t.name === 'create_task');

    expect(createTask).toBeDefined();
    expect(createTask?.inputSchema?.properties).toBeDefined();

    const properties = createTask?.inputSchema?.properties as Record<string, { description?: string }>;

    // Check repeat_after parameter
    if (properties.repeat_after) {
      const repeatAfterDesc = properties.repeat_after.description || '';
      
      // Should mention seconds
      expect(repeatAfterDesc.toLowerCase()).toContain('second');
      
      // Should have examples
      expect(
        repeatAfterDesc.includes('86400') || 
        repeatAfterDesc.includes('604800') ||
        repeatAfterDesc.toLowerCase().includes('example')
      ).toBe(true);
    }

    // Check repeat_mode parameter
    if (properties.repeat_mode) {
      const repeatModeDesc = properties.repeat_mode.description || '';
      
      // Should explain modes 0, 1, 2
      expect(repeatModeDesc).toContain('0');
      expect(repeatModeDesc).toContain('1');
      expect(repeatModeDesc).toContain('2');
    }
  });

  it('should verify all tools have parameter descriptions', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();

    tools.forEach((tool) => {
      if (tool.inputSchema?.properties) {
        const properties = tool.inputSchema.properties as Record<string, { description?: string }>;
        Object.entries(properties).forEach(([paramName, paramDef]) => {
          expect(paramDef.description, 
            `Tool '${tool.name}' parameter '${paramName}' should have a description`
          ).toBeDefined();
          
          expect(paramDef.description!.length, 
            `Tool '${tool.name}' parameter '${paramName}' description should be at least 10 characters`
          ).toBeGreaterThanOrEqual(10);
        });
      }
    });
  });

  it('should verify label-related tools mention hex_color format', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();
    
    const labelTools = tools.filter((t) => 
      t.name === 'create_label' || t.name === 'update_label'
    );

    labelTools.forEach((tool) => {
      if (tool.inputSchema?.properties) {
        const properties = tool.inputSchema.properties as Record<string, { description?: string }>;
        
        if (properties.hex_color) {
          const hexColorDesc = properties.hex_color.description || '';
          
          // Should explain format (6-char without #)
          expect(
            hexColorDesc.includes('6') ||
            hexColorDesc.includes('without #') ||
            hexColorDesc.toLowerCase().includes('format')
          ).toBe(true);
        }
      }
    });
  });

  it('should verify task relation tools have comprehensive descriptions (US2)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();
    
    // Find relation tools
    const createRelation = tools.find((t) => t.name === 'create_task_relation');
    const getRelations = tools.find((t) => t.name === 'get_task_relations');
    const deleteRelation = tools.find((t) => t.name === 'delete_task_relation');

    // All three relation tools should exist
    expect(createRelation, 'create_task_relation tool should exist').toBeDefined();
    expect(getRelations, 'get_task_relations tool should exist').toBeDefined();
    expect(deleteRelation, 'delete_task_relation tool should exist').toBeDefined();

    // Check create_task_relation description
    const createDesc = createRelation?.description || '';
    expect(createDesc.length, 'create_task_relation should have description').toBeGreaterThan(20);
    
    // Should mention bidirectional relations
    expect(
      createDesc.toLowerCase().includes('bidirectional') ||
      createDesc.toLowerCase().includes('automatically'),
      'create_task_relation description should mention automatic bidirectional relations'
    ).toBe(true);
    
    // Should mention cycle prevention
    expect(
      createDesc.toLowerCase().includes('hierarchical') ||
      createDesc.toLowerCase().includes('prevent') ||
      createDesc.toLowerCase().includes('cycle'),
      'create_task_relation description should mention cycle prevention for hierarchical relations'
    ).toBe(true);
    
    // Should mention use cases (dependencies, hierarchies, associations)
    expect(
      createDesc.toLowerCase().includes('dependencies') ||
      createDesc.toLowerCase().includes('hierarchies') ||
      createDesc.toLowerCase().includes('associations'),
      'create_task_relation description should mention use cases'
    ).toBe(true);

    // Check get_task_relations description
    const getDesc = getRelations?.description || '';
    expect(getDesc.length, 'get_task_relations should have description').toBeGreaterThan(20);
    
    // Should mention grouped output by relation type
    expect(
      getDesc.toLowerCase().includes('grouped') ||
      getDesc.toLowerCase().includes('group') ||
      getDesc.toLowerCase().includes('type'),
      'get_task_relations description should mention grouped output by relation type'
    ).toBe(true);

    // Check delete_task_relation description
    const deleteDesc = deleteRelation?.description || '';
    expect(deleteDesc.length, 'delete_task_relation should have description').toBeGreaterThan(20);
    
    // Should mention bidirectional deletion
    expect(
      deleteDesc.toLowerCase().includes('bidirectional') ||
      deleteDesc.toLowerCase().includes('inverse') ||
      deleteDesc.toLowerCase().includes('both') ||
      deleteDesc.toLowerCase().includes('automatically'),
      'delete_task_relation description should mention automatic bidirectional deletion'
    ).toBe(true);
  });

  it('should verify related tool descriptions explain alternatives (FR-002)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();

    // Test create_task vs bulk_create_tasks differentiation
    const createTask = tools.find((t) => t.name === 'create_task');
    const bulkCreateTasks = tools.find((t) => t.name === 'bulk_create_tasks');

    if (createTask && bulkCreateTasks) {
      const bulkDesc = bulkCreateTasks.description || '';
      
      // Bulk tool should mention when to use vs single create
      expect(
        bulkDesc.toLowerCase().includes('multiple') ||
        bulkDesc.toLowerCase().includes('batch') ||
        bulkDesc.toLowerCase().includes('many'),
        'bulk_create_tasks should explain when to use vs create_task - FR-002'
      ).toBe(true);
    }

    // Test search_tasks vs get_my_tasks vs get_project_tasks differentiation
    const searchTasks = tools.find((t) => t.name === 'search_tasks');
    const getMyTasks = tools.find((t) => t.name === 'get_my_tasks');
    const getProjectTasks = tools.find((t) => t.name === 'get_project_tasks');

    if (searchTasks && getMyTasks) {
      const myTasksDesc = getMyTasks.description || '';
      
      // get_my_tasks should clarify its specific use case
      expect(
        myTasksDesc.toLowerCase().includes('personal') ||
        myTasksDesc.toLowerCase().includes('assigned to') ||
        myTasksDesc.toLowerCase().includes('my tasks'),
        'get_my_tasks should explain when to use vs search_tasks - FR-002'
      ).toBe(true);
    }

    if (searchTasks && getProjectTasks) {
      const projectTasksDesc = getProjectTasks.description || '';
      
      // get_project_tasks should clarify project-specific scope
      expect(
        projectTasksDesc.toLowerCase().includes('project') ||
        projectTasksDesc.toLowerCase().includes('specific project'),
        'get_project_tasks should explain project-specific scope - FR-002'
      ).toBe(true);
    }
  });

  it('should verify Vikunja terminology is documented (FR-004)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();

    const projectTools = tools.filter((t) => 
      t.name.includes('project') && !t.name.includes('search')
    );

    projectTools.forEach((tool) => {
      const desc = tool.description.toLowerCase();
      
      // Should mention "project" terminology (Vikunja's term)
      expect(
        desc.includes('project'),
        `${tool.name} should use Vikunja's "Project" terminology - FR-004`
      ).toBe(true);
    });

    // Note: Bucket, Saved Filter, done/completed checks would go here when those tools exist
  });

  it('should verify recurring task tools have comprehensive descriptions (US3)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();
    
    // Find task tools that support recurring tasks
    const createTask = tools.find((t) => t.name === 'create_task');
    const updateTask = tools.find((t) => t.name === 'update_task');

    expect(createTask, 'create_task tool should exist').toBeDefined();
    expect(updateTask, 'update_task tool should exist').toBeDefined();

    // Check create_task description mentions recurring tasks
    const createDesc = createTask?.description || '';
    expect(
      createDesc.toLowerCase().includes('recurring') ||
      createDesc.toLowerCase().includes('repeat'),
      'create_task description should mention recurring task support'
    ).toBe(true);

    // Check update_task description mentions recurring tasks
    const updateDesc = updateTask?.description || '';
    expect(
      updateDesc.toLowerCase().includes('recurring') ||
      updateDesc.toLowerCase().includes('recurrence') ||
      updateDesc.toLowerCase().includes('repeat'),
      'update_task description should mention recurring task support'
    ).toBe(true);

    // Verify parameter descriptions (already tested in detail above, but ensure they exist)
    if (createTask?.inputSchema?.properties) {
      const properties = createTask.inputSchema.properties as Record<string, { description?: string }>;
      
      // repeat_after and repeat_mode should be present (if supported)
      // These are tested in detail in the other test
      if (properties.repeat_after) {
        expect(properties.repeat_after.description?.length).toBeGreaterThan(10);
      }
      if (properties.repeat_mode) {
        expect(properties.repeat_mode.description?.length).toBeGreaterThan(10);
      }
    }
  });

  it('should verify comment tools have comprehensive descriptions (US4)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();
    
    const commentTools = [
      'add_task_comment',
      'get_task_comments', 
      'update_task_comment',
      'delete_task_comment'
    ];

    commentTools.forEach((toolName) => {
      const tool = tools.find((t) => t.name === toolName);
      expect(tool, `${toolName} should exist`).toBeDefined();
      
      const desc = tool?.description || '';
      expect(desc.length, `${toolName} should have description >20 chars`).toBeGreaterThan(20);
      
      // Should mention use cases or outcomes
      expect(
        desc.toLowerCase().includes('comment') ||
        desc.toLowerCase().includes('collaboration') ||
        desc.toLowerCase().includes('note'),
        `${toolName} description should mention comments/collaboration - FR-001`
      ).toBe(true);
    });

    // Verify get_task_comments mentions pagination
    const getComments = tools.find((t) => t.name === 'get_task_comments');
    if (getComments) {
      const desc = getComments.description.toLowerCase();
      const schema = getComments.inputSchema?.properties as Record<string, { description?: string }>;
      
      // Should mention pagination or have page_size parameter
      const hasPagination = 
        desc.includes('paginat') ||
        desc.includes('page') ||
        (schema?.page_size !== undefined);
      
      expect(hasPagination, 'get_task_comments should mention pagination support - NFR-003').toBe(true);
    }
  });

  it('should verify label tools have comprehensive descriptions (US5 - T100a)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();
    
    const labelTools = [
      'get_all_labels',
      'get_label',
      'update_label',
      'delete_label',
      'get_task_labels'
    ];

    labelTools.forEach((toolName) => {
      const tool = tools.find((t) => t.name === toolName);
      expect(tool, `${toolName} should exist - US5`).toBeDefined();
      
      const desc = tool?.description || '';
      
      // FR-001: Comprehensive description (>20 chars, mentions purpose/use cases/outcomes)
      expect(desc.length, `${toolName} should have description >20 chars - FR-001`).toBeGreaterThan(20);
      
      // Should mention labels or categorization
      expect(
        desc.toLowerCase().includes('label') ||
        desc.toLowerCase().includes('categor') ||
        desc.toLowerCase().includes('tag'),
        `${toolName} description should mention labels/categorization - FR-001`
      ).toBe(true);
    });

    // FR-003: Check hex_color parameter format explanation in update_label
    const updateLabel = tools.find((t) => t.name === 'update_label');
    if (updateLabel?.inputSchema?.properties) {
      const properties = updateLabel.inputSchema.properties as Record<string, { description?: string }>;
      
      if (properties.hex_color) {
        const hexColorDesc = properties.hex_color.description || '';
        
        // Should explain 6-character format without # prefix
        const hasFormatExplanation = 
          (hexColorDesc.includes('6') && hexColorDesc.toLowerCase().includes('character')) ||
          hexColorDesc.toLowerCase().includes('without #') ||
          hexColorDesc.toLowerCase().includes('without the #');
        
        expect(hasFormatExplanation, 
          'update_label hex_color parameter should explain 6-character format without # - FR-003'
        ).toBe(true);
        
        // Should have examples
        const hasExamples = 
          hexColorDesc.includes('FF') ||
          hexColorDesc.includes('example') ||
          hexColorDesc.toLowerCase().includes('e.g.');
        
        expect(hasExamples,
          'update_label hex_color parameter should include examples - FR-003'
        ).toBe(true);
      }
    }

    // FR-020: Check visibility rules mentioned in get_all_labels description
    const getAllLabels = tools.find((t) => t.name === 'get_all_labels');
    if (getAllLabels) {
      const desc = getAllLabels.description.toLowerCase();
      
      // Should mention visibility rules (accessible tasks + created labels)
      const mentionsVisibility = 
        desc.includes('visible') ||
        desc.includes('access') ||
        desc.includes('created') ||
        desc.includes('see');
      
      expect(mentionsVisibility, 
        'get_all_labels should mention visibility rules - FR-020'
      ).toBe(true);
      
      // Should mention project-independent (global scope)
      const mentionsScope = 
        desc.includes('project-independent') ||
        desc.includes('global') ||
        desc.includes('not confined');
      
      expect(mentionsScope,
        'get_all_labels should clarify labels are project-independent - FR-020'
      ).toBe(true);
    }

    // Verify pagination support in get_all_labels (page_size=50 default, max 100)
    const getAllLabelsSchema = getAllLabels?.inputSchema?.properties as Record<string, { description?: string }>;
    if (getAllLabelsSchema) {
      // Should have page and page_size parameters
      expect(getAllLabelsSchema.page, 'get_all_labels should have page parameter').toBeDefined();
      expect(getAllLabelsSchema.page_size, 'get_all_labels should have page_size parameter').toBeDefined();
      
      // page_size description should mention defaults
      if (getAllLabelsSchema.page_size) {
        const pageSizeDesc = getAllLabelsSchema.page_size.description || '';
        expect(
          pageSizeDesc.includes('50') && pageSizeDesc.includes('100'),
          'get_all_labels page_size should mention default (50) and max (100)'
        ).toBe(true);
      }
    }

    // Check delete_label mentions cascading consequences
    const deleteLabel = tools.find((t) => t.name === 'delete_label');
    if (deleteLabel) {
      const desc = deleteLabel.description.toLowerCase();
      
      // Should mention removal from ALL tasks
      const mentionsCascading = 
        desc.includes('all tasks') ||
        desc.includes('cascading') ||
        desc.includes('remove') ||
        desc.includes('detach');
      
      expect(mentionsCascading,
        'delete_label should mention cascading removal from all tasks - FR-001'
      ).toBe(true);
    }

    // Check update_label mentions permission requirements
    if (updateLabel) {
      const desc = updateLabel.description.toLowerCase();
      
      // Should mention permission (only creator can update)
      const mentionsPermission = 
        desc.includes('permission') ||
        desc.includes('only') ||
        desc.includes('creator') ||
        desc.includes('created');
      
      expect(mentionsPermission,
        'update_label should mention permission requirement (only creator) - FR-001'
      ).toBe(true);
    }
  });

  it('should verify attachment tool has comprehensive description (US6 - T110a)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();
    
    const attachmentTool = 'get_task_attachments';
    const tool = tools.find((t) => t.name === attachmentTool);
    
    // FR-001: Tool should exist
    expect(tool, `${attachmentTool} should exist - US6`).toBeDefined();
    
    const desc = tool?.description || '';
    
    // FR-001: Comprehensive description (>20 chars, mentions purpose/use cases/outcomes)
    expect(desc.length, `${attachmentTool} should have description >20 chars - FR-001`).toBeGreaterThan(20);
    
    // FR-001: Should mention purpose - retrieving attachment metadata
    expect(
      desc.toLowerCase().includes('metadata') ||
      desc.toLowerCase().includes('attachment') ||
      desc.toLowerCase().includes('file'),
      `${attachmentTool} description should mention attachments/metadata/files - FR-001`
    ).toBe(true);
    
    // FR-001: Should mention use case - context awareness, understanding task resources
    const hasUseCase = 
      desc.toLowerCase().includes('context') ||
      desc.toLowerCase().includes('understand') ||
      desc.toLowerCase().includes('associated') ||
      desc.toLowerCase().includes('use this');
    
    expect(hasUseCase,
      `${attachmentTool} description should mention use case (context awareness) - FR-001`
    ).toBe(true);
    
    // FR-001: Should mention outcome - returns metadata without file content
    const hasOutcome = 
      desc.toLowerCase().includes('return') ||
      desc.toLowerCase().includes('retriev') ||
      desc.toLowerCase().includes('details') ||
      desc.toLowerCase().includes('information');
    
    expect(hasOutcome,
      `${attachmentTool} description should mention expected outcome - FR-001`
    ).toBe(true);
    
    // FR-035: CRITICAL - Must clarify metadata only (no file upload/download)
    const clarifiesMetadataOnly = 
      (desc.toLowerCase().includes('metadata') && desc.toLowerCase().includes('only')) ||
      desc.toLowerCase().includes('without file content') ||
      desc.toLowerCase().includes('no file content') ||
      desc.toLowerCase().includes('does not download') ||
      desc.toLowerCase().includes('not support') ||
      (desc.toLowerCase().includes('metadata') && 
       (desc.toLowerCase().includes('without') || desc.toLowerCase().includes('no upload') || desc.toLowerCase().includes('no download')));
    
    expect(clarifiesMetadataOnly,
      `${attachmentTool} must clarify metadata only (no file upload/download) - FR-035`
    ).toBe(true);
    
    // FR-035: Should explicitly state NO upload/download support
    const explicitlyStatesNoUploadDownload = 
      desc.toLowerCase().includes('not support') ||
      desc.toLowerCase().includes('does not support') ||
      desc.toLowerCase().includes('no upload') ||
      desc.toLowerCase().includes('no download') ||
      desc.toLowerCase().includes('without downloading');
    
    expect(explicitlyStatesNoUploadDownload,
      `${attachmentTool} should explicitly state no upload/download support - FR-035`
    ).toBe(true);
    
    // Check parameter descriptions
    if (tool?.inputSchema?.properties) {
      const properties = tool.inputSchema.properties as Record<string, { description?: string }>;
      
      // task_id parameter should have adequate description
      if (properties.task_id) {
        const taskIdDesc = properties.task_id.description || '';
        
        expect(taskIdDesc.length, 
          `${attachmentTool} task_id parameter should have description >10 chars - FR-001`
        ).toBeGreaterThan(10);
        
        // Should clarify what metadata is retrieved
        const clarifiesMetadata = 
          taskIdDesc.toLowerCase().includes('metadata') ||
          taskIdDesc.toLowerCase().includes('file information') ||
          taskIdDesc.toLowerCase().includes('without download');
        
        expect(clarifiesMetadata,
          `${attachmentTool} task_id parameter should clarify metadata retrieval - FR-001`
        ).toBe(true);
      }
    }
    
    // Verify tool provides context for AI agents
    const mentionsAIContext = 
      desc.toLowerCase().includes('agent') ||
      desc.toLowerCase().includes('context') ||
      desc.toLowerCase().includes('understanding') ||
      desc.toLowerCase().includes('what files');
    
    expect(mentionsAIContext,
      `${attachmentTool} should explain usefulness for AI agents/context - FR-001`
    ).toBe(true);
  });

  it('should verify get_project and get_all_projects have comprehensive descriptions (010-mcp-missing-tools US1)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();
    
    // US1: get_project - Direct project lookup by ID
    const getProject = tools.find((t) => t.name === 'get_project');
    expect(getProject, 'get_project should exist - US1').toBeDefined();
    
    const getProjectDesc = getProject?.description || '';
    
    // FR-001: Comprehensive description (>20 chars)
    expect(getProjectDesc.length, 'get_project should have description >20 chars - FR-001').toBeGreaterThan(20);
    
    // FR-001: Should mention purpose - retrieve single project by ID
    expect(
      getProjectDesc.toLowerCase().includes('retrieve') ||
      getProjectDesc.toLowerCase().includes('get'),
      'get_project description should mention retrieval purpose - FR-001'
    ).toBe(true);
    
    expect(
      getProjectDesc.toLowerCase().includes('single') ||
      getProjectDesc.toLowerCase().includes('by id') ||
      getProjectDesc.toLowerCase().includes('project id'),
      'get_project description should mention single project by ID - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention use case - when you have the ID already
    const hasUseCase = 
      getProjectDesc.toLowerCase().includes('use this when') ||
      getProjectDesc.toLowerCase().includes('when you') ||
      getProjectDesc.toLowerCase().includes('already have') ||
      getProjectDesc.toLowerCase().includes('known');
    
    expect(hasUseCase,
      'get_project description should explain when to use this tool - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention efficiency advantage over searching
    const mentionsEfficiency = 
      getProjectDesc.toLowerCase().includes('efficient') ||
      getProjectDesc.toLowerCase().includes('direct') ||
      getProjectDesc.toLowerCase().includes('than search');
    
    expect(mentionsEfficiency,
      'get_project description should mention efficiency advantage - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention what data is returned
    const mentionsOutput = 
      getProjectDesc.toLowerCase().includes('detail') ||
      getProjectDesc.toLowerCase().includes('return') ||
      getProjectDesc.toLowerCase().includes('metadata') ||
      getProjectDesc.toLowerCase().includes('title') ||
      getProjectDesc.toLowerCase().includes('color') ||
      getProjectDesc.toLowerCase().includes('archived');
    
    expect(mentionsOutput,
      'get_project description should mention returned data - FR-001'
    ).toBe(true);
    
    // Check parameter descriptions
    if (getProject?.inputSchema?.properties) {
      const properties = getProject.inputSchema.properties as Record<string, { description?: string }>;
      
      // id parameter should have adequate description
      expect(properties.id, 'get_project should have id parameter').toBeDefined();
      
      if (properties.id) {
        const idDesc = properties.id.description || '';
        
        expect(idDesc.length, 
          'get_project id parameter should have description >10 chars - FR-001'
        ).toBeGreaterThan(10);
        
        // Should mention what is returned
        expect(
          idDesc.toLowerCase().includes('return') ||
          idDesc.toLowerCase().includes('detail') ||
          idDesc.toLowerCase().includes('full'),
          'get_project id parameter should mention returned details - FR-001'
        ).toBe(true);
      }
    }
    
    // US1: get_all_projects - List all accessible projects
    const getAllProjects = tools.find((t) => t.name === 'get_all_projects');
    expect(getAllProjects, 'get_all_projects should exist - US1').toBeDefined();
    
    const getAllProjectsDesc = getAllProjects?.description || '';
    
    // FR-001: Comprehensive description (>20 chars)
    expect(getAllProjectsDesc.length, 'get_all_projects should have description >20 chars - FR-001').toBeGreaterThan(20);
    
    // FR-001: Should mention purpose - list all projects
    expect(
      getAllProjectsDesc.toLowerCase().includes('list') ||
      getAllProjectsDesc.toLowerCase().includes('all'),
      'get_all_projects description should mention listing all projects - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention use case - discovery without search query
    const hasDiscoveryUseCase = 
      getAllProjectsDesc.toLowerCase().includes('discover') ||
      getAllProjectsDesc.toLowerCase().includes('without') ||
      getAllProjectsDesc.toLowerCase().includes('overview') ||
      getAllProjectsDesc.toLowerCase().includes('available');
    
    expect(hasDiscoveryUseCase,
      'get_all_projects description should explain discovery use case - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention filtering/pagination features
    const mentionsFeatures = 
      getAllProjectsDesc.toLowerCase().includes('pagination') ||
      getAllProjectsDesc.toLowerCase().includes('filter') ||
      getAllProjectsDesc.toLowerCase().includes('archived');
    
    expect(mentionsFeatures,
      'get_all_projects description should mention pagination/filtering - FR-001'
    ).toBe(true);
    
    // Check parameter descriptions
    if (getAllProjects?.inputSchema?.properties) {
      const properties = getAllProjects.inputSchema.properties as Record<string, { description?: string }>;
      
      // page parameter should exist and have description
      if (properties.page) {
        const pageDesc = properties.page.description || '';
        
        expect(pageDesc.length, 
          'get_all_projects page parameter should have description >10 chars - FR-001'
        ).toBeGreaterThan(10);
        
        // Should mention default and page size
        expect(
          pageDesc.includes('default') ||
          pageDesc.includes('optional'),
          'get_all_projects page parameter should mention defaults - FR-001'
        ).toBe(true);
      }
      
      // filter_archived parameter should exist and have description
      if (properties.filter_archived) {
        const filterDesc = properties.filter_archived.description || '';
        
        expect(filterDesc.length, 
          'get_all_projects filter_archived parameter should have description >10 chars - FR-001'
        ).toBeGreaterThan(10);
        
        // Should explain filtering options
        expect(
          filterDesc.toLowerCase().includes('filter') ||
          filterDesc.toLowerCase().includes('active') ||
          filterDesc.toLowerCase().includes('archived'),
          'get_all_projects filter_archived parameter should explain filtering - FR-001'
        ).toBe(true);
      }
    }
    
    // FR-002: Verify differentiation between get_project and get_all_projects
    // get_all_projects should mention when to use vs get_project
    const mentionsDifferentiation = 
      getAllProjectsDesc.toLowerCase().includes('when') ||
      getAllProjectsDesc.toLowerCase().includes('use this') ||
      getAllProjectsDesc.toLowerCase().includes('discover');
    
    expect(mentionsDifferentiation,
      'get_all_projects should explain when to use vs get_project - FR-002'
    ).toBe(true);
  });

  it('should verify get_task has comprehensive description (010-mcp-missing-tools US3)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();
    
    // US3: get_task - Direct task lookup by ID
    const getTask = tools.find((t) => t.name === 'get_task');
    expect(getTask, 'get_task should exist - US3').toBeDefined();
    
    const getTaskDesc = getTask?.description || '';
    
    // FR-001: Comprehensive description (>20 chars)
    expect(getTaskDesc.length, 'get_task should have description >20 chars - FR-001').toBeGreaterThan(20);
    
    // FR-001: Should mention purpose - retrieve single task by ID
    expect(
      getTaskDesc.toLowerCase().includes('retrieve') ||
      getTaskDesc.toLowerCase().includes('get'),
      'get_task description should mention retrieval purpose - FR-001'
    ).toBe(true);
    
    expect(
      getTaskDesc.toLowerCase().includes('single') ||
      getTaskDesc.toLowerCase().includes('by id') ||
      getTaskDesc.toLowerCase().includes('task id'),
      'get_task description should mention single task by ID - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention use case - when you have the ID already
    const hasUseCase = 
      getTaskDesc.toLowerCase().includes('use this when') ||
      getTaskDesc.toLowerCase().includes('when you') ||
      getTaskDesc.toLowerCase().includes('already have') ||
      getTaskDesc.toLowerCase().includes('known');
    
    expect(hasUseCase,
      'get_task description should explain when to use this tool - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention complete data returned (relations, assignees, labels)
    const mentionsCompleteData = 
      getTaskDesc.toLowerCase().includes('complete') ||
      getTaskDesc.toLowerCase().includes('full') ||
      getTaskDesc.toLowerCase().includes('detail') ||
      getTaskDesc.toLowerCase().includes('all');
    
    expect(mentionsCompleteData,
      'get_task description should mention complete task data - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention what specific data is included
    const mentionsSpecificData = 
      getTaskDesc.toLowerCase().includes('relation') ||
      getTaskDesc.toLowerCase().includes('assignee') ||
      getTaskDesc.toLowerCase().includes('label') ||
      getTaskDesc.toLowerCase().includes('metadata');
    
    expect(mentionsSpecificData,
      'get_task description should mention specific data included (relations/assignees/labels) - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention efficiency advantage over searching
    const mentionsEfficiency = 
      getTaskDesc.toLowerCase().includes('efficient') ||
      getTaskDesc.toLowerCase().includes('direct') ||
      getTaskDesc.toLowerCase().includes('than search');
    
    expect(mentionsEfficiency,
      'get_task description should mention efficiency advantage - FR-001'
    ).toBe(true);
    
    // Check parameter descriptions
    if (getTask?.inputSchema?.properties) {
      const properties = getTask.inputSchema.properties as Record<string, { description?: string }>;
      
      // id parameter should have adequate description
      expect(properties.id, 'get_task should have id parameter').toBeDefined();
      
      if (properties.id) {
        const idDesc = properties.id.description || '';
        
        expect(idDesc.length, 
          'get_task id parameter should have description >10 chars - FR-003'
        ).toBeGreaterThan(10);
        
        // Should mention what complete data is returned
        expect(
          idDesc.toLowerCase().includes('complete') ||
          idDesc.toLowerCase().includes('detail') ||
          idDesc.toLowerCase().includes('full') ||
          idDesc.toLowerCase().includes('relation') ||
          idDesc.toLowerCase().includes('assignee') ||
          idDesc.toLowerCase().includes('label'),
          'get_task id parameter should mention complete data with relations/assignees/labels - FR-003'
        ).toBe(true);
      }
    }
    
    // FR-002: Verify differentiation from search_tasks
    const mentionsDifferentiation = 
      getTaskDesc.toLowerCase().includes('when') ||
      getTaskDesc.toLowerCase().includes('use this') ||
      getTaskDesc.toLowerCase().includes('already have') ||
      getTaskDesc.toLowerCase().includes('known id');
    
    expect(mentionsDifferentiation,
      'get_task should explain when to use vs search_tasks - FR-002'
    ).toBe(true);
  });

  it('should verify get_user_info has comprehensive description (010-mcp-missing-tools US4)', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();
    
    // US4: get_user_info - Get authenticated user profile
    const getUserInfo = tools.find((t) => t.name === 'get_user_info');
    expect(getUserInfo, 'get_user_info should exist - US4').toBeDefined();
    
    const getUserInfoDesc = getUserInfo?.description || '';
    
    // FR-001: Comprehensive description (>20 chars)
    expect(getUserInfoDesc.length, 'get_user_info should have description >20 chars - FR-001').toBeGreaterThan(20);
    
    // FR-001: Should mention purpose - retrieve authenticated user profile
    expect(
      getUserInfoDesc.toLowerCase().includes('retrieve') ||
      getUserInfoDesc.toLowerCase().includes('get'),
      'get_user_info description should mention retrieval purpose - FR-001'
    ).toBe(true);
    
    expect(
      getUserInfoDesc.toLowerCase().includes('authenticated') ||
      getUserInfoDesc.toLowerCase().includes('current') ||
      getUserInfoDesc.toLowerCase().includes('user'),
      'get_user_info description should mention authenticated user - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention use case - AI agent context awareness
    const hasUseCase = 
      getUserInfoDesc.toLowerCase().includes('use this') ||
      getUserInfoDesc.toLowerCase().includes('context') ||
      getUserInfoDesc.toLowerCase().includes('understand') ||
      getUserInfoDesc.toLowerCase().includes('identify') ||
      getUserInfoDesc.toLowerCase().includes('agent');
    
    expect(hasUseCase,
      'get_user_info description should explain context awareness use case - FR-001'
    ).toBe(true);
    
    // FR-001: Should mention what safe fields are returned
    const mentionsSafeFields = 
      getUserInfoDesc.toLowerCase().includes('safe') ||
      getUserInfoDesc.toLowerCase().includes('profile') ||
      getUserInfoDesc.toLowerCase().includes('id') ||
      getUserInfoDesc.toLowerCase().includes('username') ||
      getUserInfoDesc.toLowerCase().includes('email') ||
      getUserInfoDesc.toLowerCase().includes('name');
    
    expect(mentionsSafeFields,
      'get_user_info description should mention safe user fields returned - FR-001'
    ).toBe(true);
    
    // FR-011: CRITICAL - Must explicitly mention sensitive field filtering
    const mentionsFiltering = 
      getUserInfoDesc.toLowerCase().includes('excluding') ||
      getUserInfoDesc.toLowerCase().includes('without') ||
      getUserInfoDesc.toLowerCase().includes('safe') ||
      getUserInfoDesc.toLowerCase().includes('filtered') ||
      getUserInfoDesc.toLowerCase().includes('no password') ||
      getUserInfoDesc.toLowerCase().includes('no token') ||
      (getUserInfoDesc.toLowerCase().includes('sensitive') && 
       (getUserInfoDesc.toLowerCase().includes('not') || getUserInfoDesc.toLowerCase().includes('without')));
    
    expect(mentionsFiltering,
      'get_user_info description must explicitly mention sensitive field filtering - FR-011'
    ).toBe(true);
    
    // FR-011: Should mention what sensitive fields are excluded
    const mentionsSensitiveFields = 
      getUserInfoDesc.toLowerCase().includes('password') ||
      getUserInfoDesc.toLowerCase().includes('token') ||
      getUserInfoDesc.toLowerCase().includes('sensitive') ||
      getUserInfoDesc.toLowerCase().includes('credential');
    
    expect(mentionsSensitiveFields,
      'get_user_info description should mention sensitive fields excluded - FR-011'
    ).toBe(true);
    
    // FR-001: Should explain value for AI agents
    const mentionsAIValue = 
      getUserInfoDesc.toLowerCase().includes('agent') ||
      getUserInfoDesc.toLowerCase().includes('context') ||
      getUserInfoDesc.toLowerCase().includes('personalize') ||
      getUserInfoDesc.toLowerCase().includes('understand who');
    
    expect(mentionsAIValue,
      'get_user_info description should explain value for AI agents - FR-001'
    ).toBe(true);
    
    // Check that schema is empty object (no parameters required)
    if (getUserInfo?.inputSchema?.properties) {
      const properties = getUserInfo.inputSchema.properties as Record<string, { description?: string }>;
      const paramCount = Object.keys(properties).length;
      
      expect(paramCount, 
        'get_user_info should have no parameters (empty schema) - uses authenticated context'
      ).toBe(0);
    }
    
    // Verify description mentions no parameters needed (uses auth context)
    const mentionsNoParams = 
      getUserInfoDesc.toLowerCase().includes('no parameter') ||
      getUserInfoDesc.toLowerCase().includes('authenticated') ||
      getUserInfoDesc.toLowerCase().includes('current user') ||
      getUserInfoDesc.toLowerCase().includes('from context');
    
    expect(mentionsNoParams,
      'get_user_info description should clarify no parameters needed (uses auth context) - FR-001'
    ).toBe(true);
  });
});
