/**
 * Generate TOOLS.md documentation from tool registry
 * 
 * This script extracts all tool definitions from the registry and
 * generates comprehensive markdown documentation organized by category.
 */

import { VikunjaClient } from '../src/vikunja/client.js';
import { ToolRegistry } from '../src/tools/registry.js';
import { RateLimiter } from '../src/ratelimit/limiter.js';
import { RedisStorage } from '../src/ratelimit/storage.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Create instances for registry initialization
const client = new VikunjaClient();
const storage = new RedisStorage();
const rateLimiter = new RateLimiter(storage);
const registry = new ToolRegistry(client, rateLimiter);

// Get all tools from the registry
const tools = registry.getTools();

// Organize tools by category based on naming conventions
const categories = {
  'Project Management': tools.filter(t => t.name.includes('project')),
  'Task Management': tools.filter(t => 
    t.name.includes('task') && 
    !t.name.includes('relation') && 
    !t.name.includes('comment') && 
    !t.name.includes('attachment') &&
    !t.name.includes('label') &&
    !t.name.startsWith('bulk_') &&
    !t.name.startsWith('get_my_') &&
    !t.name.startsWith('get_project_') &&
    !t.name.startsWith('search_')
  ),
  'Task Relations': tools.filter(t => t.name.includes('relation')),
  'Comments': tools.filter(t => t.name.includes('comment')),
  'Labels': tools.filter(t => t.name.includes('label')),
  'Attachments': tools.filter(t => t.name.includes('attachment')),
  'Search & Filtering': tools.filter(t => 
    t.name.startsWith('search_') || 
    t.name.startsWith('get_my_') || 
    t.name.startsWith('get_project_')
  ),
  'Assignments': tools.filter(t => 
    t.name.includes('assign') && 
    !t.name.startsWith('bulk_')
  ),
  'Bulk Operations': tools.filter(t => t.name.startsWith('bulk_')),
};

// Generate markdown
let markdown = `# Vikunja MCP Server - Available Tools

**Auto-generated**: ${new Date().toISOString()}  
**Total Tools**: ${tools.length}

This document provides a comprehensive reference of all tools available in the Vikunja MCP server. Tools are organized by category for easy navigation.

## Table of Contents

`;

// Generate TOC
for (const [category, categoryTools] of Object.entries(categories)) {
  if (categoryTools.length > 0) {
    markdown += `- [${category}](#${category.toLowerCase().replace(/\s+&\s+/g, '--').replace(/\s+/g, '-')}) (${categoryTools.length} tools)\n`;
  }
}

markdown += `\n---\n\n`;

// Generate tool documentation by category
for (const [category, categoryTools] of Object.entries(categories)) {
  if (categoryTools.length === 0) continue;

  markdown += `## ${category}\n\n`;

  for (const tool of categoryTools) {
    markdown += `### \`${tool.name}\`\n\n`;
    markdown += `${tool.description}\n\n`;
    
    // Parameters section
    const properties = tool.inputSchema.properties;
    const required = tool.inputSchema.required || [];
    
    if (Object.keys(properties).length > 0) {
      markdown += `**Parameters:**\n\n`;
      
      for (const [paramName, paramSchema] of Object.entries(properties)) {
        const schema = paramSchema as Record<string, unknown>;
        const isRequired = required.includes(paramName);
        const requiredLabel = isRequired ? '**required**' : '*optional*';
        const typeLabel = schema.type || 'string';
        const description = schema.description || 'No description available';
        
        markdown += `- \`${paramName}\` (${typeLabel}, ${requiredLabel}): ${description}\n`;
        
        // Add additional constraints if present
        if (schema.minimum !== undefined) {
          markdown += `  - Minimum: ${schema.minimum}\n`;
        }
        if (schema.maximum !== undefined) {
          markdown += `  - Maximum: ${schema.maximum}\n`;
        }
        if (schema.minLength !== undefined) {
          markdown += `  - Min length: ${schema.minLength}\n`;
        }
        if (schema.maxLength !== undefined) {
          markdown += `  - Max length: ${schema.maxLength}\n`;
        }
        if (schema.pattern !== undefined) {
          markdown += `  - Pattern: \`${schema.pattern}\`\n`;
        }
      }
      
      markdown += `\n`;
    }
    
    markdown += `---\n\n`;
  }
}

// Add footer
markdown += `## Usage Notes

### Authentication

All tools require authentication via Vikunja API token. The token is passed through the MCP authentication header and used for all Vikunja API calls.

### Pagination

Tools that return lists support pagination with the following parameters:
- \`page\`: Page number (default: 1, min: 1)
- \`page_size\`: Items per page (default: 50, max: 100)

Paginated responses include:
- \`items\`: Array of results
- \`total\`: Total count across all pages
- \`page\`: Current page number
- \`page_size\`: Items per page
- \`has_more\`: Boolean indicating if more pages exist

### Bulk Operations

Bulk tools accept arrays of IDs with a maximum of 100 items per operation. For larger datasets, split into multiple calls.

### Error Handling

All tools return structured errors with:
- \`error\`: Error message
- \`code\`: HTTP status code
- \`resource\`: Resource type (e.g., "Task", "Project", "Label")
- \`details\`: Additional context when available

### Rate Limiting

The MCP server implements rate limiting to prevent abuse:
- HTTP transport: 100 requests per minute per user
- stdio transport: No rate limiting (trusted local client)

### Recurring Tasks

Tasks support three recurring modes via \`repeat_mode\`:
- \`0\` (Default): Next occurrence calculated from due date
- \`1\` (Monthly): Same date each month (e.g., 1st of month)
- \`2\` (From Completion): Next occurrence calculated from completion date

Set \`repeat_after\` in seconds (e.g., 604800 for weekly, 86400 for daily).

### Task Relations

Task relations support 10 types:
- \`subtask\` / \`parenttask\`: Hierarchical relations
- \`related\` / \`related\`: Bidirectional associations
- \`duplicateof\` / \`duplicates\`: Duplicate tracking
- \`blocking\` / \`blocked\`: Dependency tracking
- \`precedes\` / \`follows\`: Sequence tracking
- \`copiedfrom\` / \`copiedto\`: Copy tracking

Relations are bidirectional - creating one automatically creates the inverse.

### Label Management

Labels are project-independent and can be used across all accessible tasks. Label visibility rules:
- See labels on tasks you can access
- See labels you created
- Can only modify/delete labels you created

Hex colors must be 6 characters without # prefix (e.g., "FF5733" for orange-red).

## Development

To regenerate this documentation:

\`\`\`bash
cd mcp-server
pnpm tsx scripts/generate-tools-doc.ts
\`\`\`

This will update \`docs/TOOLS.md\` with the latest tool definitions from the registry.

---

*This documentation is auto-generated from the tool registry. For implementation details, see \`src/tools/registry.ts\`.*
`;

// Write to docs/TOOLS.md
const outputPath = join(process.cwd(), 'docs', 'TOOLS.md');
writeFileSync(outputPath, markdown, 'utf-8');

console.log(`✓ Generated TOOLS.md with ${tools.length} tools`);
console.log(`  Output: ${outputPath}`);
console.log(`\nCategory breakdown:`);
for (const [category, categoryTools] of Object.entries(categories)) {
  if (categoryTools.length > 0) {
    console.log(`  - ${category}: ${categoryTools.length} tools`);
  }
}
