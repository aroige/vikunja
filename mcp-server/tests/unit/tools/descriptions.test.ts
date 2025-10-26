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

    // Verify we have all expected tools
    expect(tools.length).toBeGreaterThanOrEqual(21);

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
});
