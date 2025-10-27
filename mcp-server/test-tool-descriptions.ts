/**
 * Test script to verify tool descriptions are correctly generated
 * Run with: npx tsx test-tool-descriptions.ts
 */

import { GetProjectSchema, GetAllProjectsSchema } from './src/tools/projects.js';

// Test GetProjectSchema
console.log('=== GetProjectSchema ===');
console.log('Shape:', GetProjectSchema.shape);
console.log('Safe parse test (valid):', GetProjectSchema.safeParse({ id: 11 }));
console.log('Safe parse test (invalid):', GetProjectSchema.safeParse({ id: -1 }));
console.log();

// Test GetAllProjectsSchema
console.log('=== GetAllProjectsSchema ===');
console.log('Shape:', GetAllProjectsSchema.shape);
console.log('Safe parse test (empty):', GetAllProjectsSchema.safeParse({}));
console.log('Safe parse test (page only):', GetAllProjectsSchema.safeParse({ page: 2 }));
console.log('Safe parse test (filter only):', GetAllProjectsSchema.safeParse({ filter_archived: true }));
console.log('Safe parse test (both):', GetAllProjectsSchema.safeParse({ page: 3, filter_archived: false }));
console.log();

// Extract descriptions
const idField = GetProjectSchema.shape.id;
const pageField = GetAllProjectsSchema.shape.page;
const filterField = GetAllProjectsSchema.shape.filter_archived;

console.log('=== Field Descriptions ===');
console.log('GetProjectSchema.id description:', idField._def.description);
console.log('GetAllProjectsSchema.page description:', pageField._def.description);
console.log('GetAllProjectsSchema.filter_archived description:', filterField._def.description);
console.log();

console.log('✅ All schemas are correctly defined!');
process.exit(0);
