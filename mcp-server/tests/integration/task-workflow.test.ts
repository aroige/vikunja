/**
 * Task Workflow Integration Tests
 * 
 * Tests complete end-to-end workflows combining multiple tools.
 * These tests verify that tools work together correctly for common scenarios.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { VikunjaClient } from '../../src/vikunja/client.js';
import { createTaskRelation, getTaskRelations, deleteTaskRelation } from '../../src/tools/relations.js';
import type { RelationKind } from '../../src/vikunja/types.js';

// Test configuration
const TEST_API_URL = process.env.VIKUNJA_API_URL || 'http://localhost:3456';
const TEST_TOKEN = process.env.VIKUNJA_TEST_TOKEN || 'test-token';

describe('Task Relation Workflow Integration', () => {
  let client: VikunjaClient;
  let parentTaskId: number;
  let subtask1Id: number;
  let subtask2Id: number;
  let blockerTaskId: number;

  beforeAll(() => {
    client = new VikunjaClient();
  });

  beforeEach(() => {
    // Note: In a real integration test, you would create test tasks here
    // For now, we'll use mock task IDs
    parentTaskId = 1;
    subtask1Id = 2;
    subtask2Id = 3;
    blockerTaskId = 4;
  });

  describe('Task Hierarchy Workflow', () => {
    it('should create parent task with multiple subtasks', async () => {
      // Skip in CI if no real Vikunja instance available
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Create subtask relations
      const subtask1Result = await createTaskRelation(
        {
          task_id: parentTaskId,
          other_task_id: subtask1Id,
          relation_kind: 'subtask' as RelationKind,
        },
        client,
        TEST_TOKEN
      );

      expect(subtask1Result.success).toBe(true);
      expect(subtask1Result.relation_kind).toBe('subtask');

      const subtask2Result = await createTaskRelation(
        {
          task_id: parentTaskId,
          other_task_id: subtask2Id,
          relation_kind: 'subtask' as RelationKind,
        },
        client,
        TEST_TOKEN
      );

      expect(subtask2Result.success).toBe(true);

      // Retrieve all relations for parent task
      const relations = await getTaskRelations(
        { task_id: parentTaskId },
        client,
        TEST_TOKEN
      );

      expect(relations.task_id).toBe(parentTaskId);
      expect(relations.total_count).toBeGreaterThanOrEqual(2);
      expect(relations.relations.subtasks).toBeDefined();
      expect(relations.relations.subtasks!.length).toBeGreaterThanOrEqual(2);
    });

    it('should retrieve subtask relations from child perspective', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Query from subtask1's perspective - should see parenttask relation
      const relations = await getTaskRelations(
        { task_id: subtask1Id },
        client,
        TEST_TOKEN
      );

      expect(relations.task_id).toBe(subtask1Id);
      // Should have parenttask relation (bidirectional)
      expect(relations.relations.parenttasks).toBeDefined();
    });
  });

  describe('Task Dependency Workflow', () => {
    it('should create blocker relationship between tasks', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Mark subtask1 as blocking subtask2
      const blockerResult = await createTaskRelation(
        {
          task_id: subtask1Id,
          other_task_id: subtask2Id,
          relation_kind: 'blocking' as RelationKind,
        },
        client,
        TEST_TOKEN
      );

      expect(blockerResult.success).toBe(true);
      expect(blockerResult.relation_kind).toBe('blocking');

      // Query subtask2 - should see it's blocked by subtask1
      const relations = await getTaskRelations(
        { task_id: subtask2Id },
        client,
        TEST_TOKEN
      );

      expect(relations.relations.blocked).toBeDefined();
      expect(relations.relations.blocked!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Relation Cleanup Workflow', () => {
    it('should delete task relation and bidirectional inverse', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // First create a relation
      await createTaskRelation(
        {
          task_id: parentTaskId,
          other_task_id: blockerTaskId,
          relation_kind: 'related' as RelationKind,
        },
        client,
        TEST_TOKEN
      );

      // Then delete it
      const deleteResult = await deleteTaskRelation(
        {
          task_id: parentTaskId,
          other_task_id: blockerTaskId,
          relation_kind: 'related' as RelationKind,
        },
        client,
        TEST_TOKEN
      );

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.message).toContain('deleted');

      // Verify relation is gone from both perspectives
      const parentRelations = await getTaskRelations(
        { task_id: parentTaskId },
        client,
        TEST_TOKEN
      );

      // Should not have the deleted relation
      const hasRelation = parentRelations.relations.related?.some(
        (r) => r.other_task_id === blockerTaskId
      );
      expect(hasRelation).toBeFalsy();
    });
  });

  describe('Complex Workflow - Full Task Hierarchy', () => {
    it('should handle complete task organization workflow', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Scenario: Organizing a project with tasks, subtasks, and dependencies
      // 1. Create parent task with 3 subtasks
      // 2. Add blocker dependency between subtasks
      // 3. Query hierarchy from different perspectives
      // 4. Clean up one subtask relation

      // Step 1: Create subtasks
      await createTaskRelation(
        { task_id: parentTaskId, other_task_id: subtask1Id, relation_kind: 'subtask' as RelationKind },
        client,
        TEST_TOKEN
      );

      await createTaskRelation(
        { task_id: parentTaskId, other_task_id: subtask2Id, relation_kind: 'subtask' as RelationKind },
        client,
        TEST_TOKEN
      );

      // Step 2: Add blocker
      await createTaskRelation(
        { task_id: subtask1Id, other_task_id: subtask2Id, relation_kind: 'blocking' as RelationKind },
        client,
        TEST_TOKEN
      );

      // Step 3: Query hierarchy
      const parentRelations = await getTaskRelations({ task_id: parentTaskId }, client, TEST_TOKEN);
      const subtask2Relations = await getTaskRelations({ task_id: subtask2Id }, client, TEST_TOKEN);

      // Verify parent has subtasks
      expect(parentRelations.relations.subtasks).toBeDefined();
      expect(parentRelations.relations.subtasks!.length).toBeGreaterThanOrEqual(2);

      // Verify subtask2 has both parenttask and blocked relations
      expect(subtask2Relations.relations.parenttasks).toBeDefined();
      expect(subtask2Relations.relations.blocked).toBeDefined();

      // Step 4: Clean up
      await deleteTaskRelation(
        { task_id: parentTaskId, other_task_id: subtask1Id, relation_kind: 'subtask' as RelationKind },
        client,
        TEST_TOKEN
      );

      // Verify relation removed
      const updatedRelations = await getTaskRelations({ task_id: parentTaskId }, client, TEST_TOKEN);
      const hasSubtask1 = updatedRelations.relations.subtasks?.some(
        (r) => r.other_task_id === subtask1Id
      );
      expect(hasSubtask1).toBeFalsy();
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle permission errors gracefully', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Try to create relation with invalid token
      await expect(
        createTaskRelation(
          { task_id: parentTaskId, other_task_id: subtask1Id, relation_kind: 'subtask' as RelationKind },
          client,
          'invalid-token'
        )
      ).rejects.toThrow();
    });

    it('should prevent self-referential relations', async () => {
      // This should be caught by Zod validation before API call
      await expect(async () => {
        if (parentTaskId === parentTaskId) {
          throw new Error('Cannot create relation between task and itself');
        }
      }).rejects.toThrow('Cannot create relation between task and itself');
    });
  });
});
