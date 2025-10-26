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
  it('should ensure all tools have comprehensive descriptions with required elements', () => {
    const registry = new ToolRegistry(mockClient, mockRateLimiter);
    const tools = registry.getTools();

    // Verify we have all expected tools
    expect(tools.length).toBeGreaterThanOrEqual(21);

    // Track validation results
    const validationResults: Array<{ name: string; issues: string[] }> = [];

    tools.forEach((tool) => {
      const issues: string[] = [];

      // 1. Check for one-line purpose (description should start with clear action verb)
      if (!tool.description || tool.description.length < 20) {
        issues.push('Description too short (should be at least 20 characters)');
      }

      // 2. Check for when to use scenario or expected outcome
      // Good descriptions should mention "when", "use this", "returns", or similar guidance
      const hasGuidance = 
        tool.description.toLowerCase().includes('use this') ||
        tool.description.toLowerCase().includes('when ') ||
        tool.description.toLowerCase().includes('returns ') ||
        tool.description.toLowerCase().includes('retrieves ') ||
        tool.description.toLowerCase().includes('creates ');
      
      if (!hasGuidance) {
        issues.push('Description lacks use case or outcome guidance');
      }

      // 3. Check that parameters have descriptions with examples or constraints
      if (tool.inputSchema?.properties) {
        const properties = tool.inputSchema.properties as Record<string, { description?: string }>;
        Object.entries(properties).forEach(([paramName, paramDef]) => {
          if (!paramDef.description || paramDef.description.length < 10) {
            issues.push(`Parameter '${paramName}' lacks adequate description`);
          }

          // Special check for repeat_after and repeat_mode (recurring task parameters)
          if (paramName === 'repeat_after' && paramDef.description) {
            const hasSecondsNote = paramDef.description.toLowerCase().includes('second');
            const hasExamples = 
              paramDef.description.includes('86400') || // daily
              paramDef.description.includes('604800') || // weekly
              paramDef.description.includes('example');
            
            if (!hasSecondsNote) {
              issues.push(`Parameter 'repeat_after' should specify unit (seconds)`);
            }
            if (!hasExamples) {
              issues.push(`Parameter 'repeat_after' should include examples (e.g., 86400=1day)`);
            }
          }

          if (paramName === 'repeat_mode' && paramDef.description) {
            const hasModeExplanations = 
              paramDef.description.includes('0') &&
              paramDef.description.includes('1') &&
              paramDef.description.includes('2');
            
            if (!hasModeExplanations) {
              issues.push(`Parameter 'repeat_mode' should explain modes 0, 1, and 2`);
            }
          }
        });
      }

      // 4. Check for Vikunja terminology explanations where needed
      // Project-related tools should clarify Vikunja's "Project" terminology
      if (tool.name.includes('project') && !tool.name.includes('search')) {
        const mentionsVikunjaTerminology = 
          tool.description.toLowerCase().includes('project') ||
          tool.description.toLowerCase().includes('workspace') ||
          tool.description.toLowerCase().includes('list');
        
        if (!mentionsVikunjaTerminology) {
          logger.warn(`Tool '${tool.name}' may benefit from Vikunja terminology clarification`);
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
});
