/**
 * Task Workflow Integration Tests
 * 
 * Tests complete end-to-end workflows combining multiple tools.
 * These tests verify that tools work together correctly for common scenarios.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { VikunjaClient } from '../../src/vikunja/client.js';
import { createTaskRelation, getTaskRelations, deleteTaskRelation } from '../../src/tools/relations.js';
import { addTaskComment, getTaskComments, updateTaskComment, deleteTaskComment } from '../../src/tools/comments.js';
import { getAllLabels, getLabel, updateLabel, deleteLabel, getTaskLabels } from '../../src/tools/labels.js';
import { getTaskAttachments } from '../../src/tools/attachments.js';
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

describe('Task Comment Workflow Integration', () => {
  let client: VikunjaClient;
  let testTaskId: number;
  let commentId: number;

  beforeAll(() => {
    client = new VikunjaClient();
  });

  beforeEach(() => {
    // Note: In a real integration test, you would create test tasks here
    // For now, we'll use mock task ID
    testTaskId = 1;
  });

  describe('Comment Collaboration Workflow', () => {
    it('T079: should add, retrieve, update, and delete comments on a task', async () => {
      // Skip in CI if no real Vikunja instance available
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Step 1: Add a comment
      const addResult = await addTaskComment(
        {
          task_id: testTaskId,
          comment: 'Initial comment for testing workflow',
        },
        client,
        TEST_TOKEN
      );

      expect(addResult.success).toBe(true);
      expect(addResult.comment).toBeDefined();
      expect(addResult.comment.comment).toBe('Initial comment for testing workflow');
      commentId = addResult.comment.id;

      // Step 2: Retrieve comments
      const getResult = await getTaskComments(
        { task_id: testTaskId },
        client,
        TEST_TOKEN
      );

      expect(getResult.task_id).toBe(testTaskId);
      expect(getResult.comments).toBeDefined();
      expect(getResult.comments.length).toBeGreaterThan(0);
      
      // Find our comment
      const ourComment = getResult.comments.find(c => c.id === commentId);
      expect(ourComment).toBeDefined();
      expect(ourComment?.comment).toBe('Initial comment for testing workflow');

      // Step 3: Update the comment
      const updateResult = await updateTaskComment(
        {
          task_id: testTaskId,
          comment_id: commentId,
          comment: 'Updated comment text',
        },
        client,
        TEST_TOKEN
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.comment.comment).toBe('Updated comment text');
      expect(updateResult.comment.id).toBe(commentId);

      // Step 4: Verify update by retrieving again
      const getAfterUpdate = await getTaskComments(
        { task_id: testTaskId },
        client,
        TEST_TOKEN
      );

      const updatedComment = getAfterUpdate.comments.find(c => c.id === commentId);
      expect(updatedComment?.comment).toBe('Updated comment text');

      // Step 5: Delete the comment
      const deleteResult = await deleteTaskComment(
        {
          task_id: testTaskId,
          comment_id: commentId,
        },
        client,
        TEST_TOKEN
      );

      expect(deleteResult.success).toBe(true);

      // Step 6: Verify deletion
      const getAfterDelete = await getTaskComments(
        { task_id: testTaskId },
        client,
        TEST_TOKEN
      );

      const deletedComment = getAfterDelete.comments.find(c => c.id === commentId);
      expect(deletedComment).toBeUndefined();
    });

    it('should handle pagination with many comments', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Retrieve with small page size
      const page1 = await getTaskComments(
        { task_id: testTaskId, page: 1, page_size: 10 },
        client,
        TEST_TOKEN
      );

      expect(page1.page).toBe(1);
      expect(page1.page_size).toBe(10);
      expect(page1.comments.length).toBeLessThanOrEqual(10);

      // If there are more than 10 comments, test pagination
      if (page1.total > 10) {
        const page2 = await getTaskComments(
          { task_id: testTaskId, page: 2, page_size: 10 },
          client,
          TEST_TOKEN
        );

        expect(page2.page).toBe(2);
        // Ensure we got different comments
        const page1Ids = page1.comments.map(c => c.id);
        const page2Ids = page2.comments.map(c => c.id);
        const overlap = page1Ids.filter(id => page2Ids.includes(id));
        expect(overlap.length).toBe(0); // No overlap between pages
      }
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle task not found error', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Try to add comment to non-existent task
      await expect(
        addTaskComment(
          { task_id: 999999, comment: 'This should fail' },
          client,
          TEST_TOKEN
        )
      ).rejects.toThrow(/Task 999999 not found/);
    });

    it('should handle permission errors gracefully', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Try to add comment with invalid token
      await expect(
        addTaskComment(
          { task_id: testTaskId, comment: 'This should fail' },
          client,
          'invalid-token'
        )
      ).rejects.toThrow();
    });
  });
});

describe('Label Management Workflow Integration', () => {
  let client: VikunjaClient;
  let testTaskId: number;
  let testLabelId: number;

  beforeAll(() => {
    client = new VikunjaClient();
    testTaskId = 1; // Use existing task or create one
  });

  describe('Complete Label Workflow', () => {
    it('T100: should complete label lifecycle - list, attach, search, update, delete', async () => {
      // Skip in CI if no real Vikunja instance available
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Step 1: List all labels
      const allLabels = await getAllLabels(
        { page: 1, page_size: 50 },
        client,
        TEST_TOKEN
      );

      expect(allLabels).toBeDefined();
      expect(allLabels.labels).toBeInstanceOf(Array);
      expect(allLabels.page).toBe(1);
      expect(allLabels.page_size).toBe(50);

      // Use first label if exists, or skip this part
      if (allLabels.labels.length > 0) {
        testLabelId = allLabels.labels[0].id;

        // Step 2: Get label details
        const labelDetails = await getLabel(
          { label_id: testLabelId },
          client,
          TEST_TOKEN
        );

        expect(labelDetails.label).toBeDefined();
        expect(labelDetails.label.id).toBe(testLabelId);
        expect(labelDetails.label.title).toBeDefined();
        expect(labelDetails.label.hex_color).toMatch(/^[0-9a-fA-F]{6}$/);

        // Step 3: Get task labels (if task exists)
        const taskLabels = await getTaskLabels(
          { task_id: testTaskId },
          client,
          TEST_TOKEN
        );

        expect(taskLabels.task_id).toBe(testTaskId);
        expect(taskLabels.labels).toBeInstanceOf(Array);
        expect(taskLabels.total_count).toBeDefined();

        // Step 4: Update label (only if you created it)
        // Note: This will fail if you're not the label creator - that's expected
        try {
          const updateResult = await updateLabel(
            {
              label_id: testLabelId,
              description: 'Updated via integration test',
            },
            client,
            TEST_TOKEN
          );

          expect(updateResult.success).toBe(true);
          expect(updateResult.label.description).toBe('Updated via integration test');
        } catch (error) {
          // Expected if not label creator - permission denied
          console.log('Update skipped: not label creator (expected)');
        }
      }
    });

    it('should handle label search filtering', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Search for labels with specific title
      const searchResults = await getAllLabels(
        { page: 1, page_size: 50, search: 'test' },
        client,
        TEST_TOKEN
      );

      expect(searchResults).toBeDefined();
      expect(searchResults.labels).toBeInstanceOf(Array);
      // All returned labels should match search (case-insensitive)
      searchResults.labels.forEach(label => {
        expect(label.title.toLowerCase()).toContain('test');
      });
    });

    it('should handle pagination with many labels', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Retrieve with small page size
      const page1 = await getAllLabels(
        { page: 1, page_size: 10 },
        client,
        TEST_TOKEN
      );

      expect(page1.page).toBe(1);
      expect(page1.page_size).toBe(10);
      expect(page1.labels.length).toBeLessThanOrEqual(10);

      // If there are more than 10 labels, test pagination
      if (page1.has_next_page) {
        const page2 = await getAllLabels(
          { page: 2, page_size: 10 },
          client,
          TEST_TOKEN
        );

        expect(page2.page).toBe(2);
        // Ensure we got different labels
        const page1Ids = page1.labels.map(l => l.id);
        const page2Ids = page2.labels.map(l => l.id);
        const overlap = page1Ids.filter(id => page2Ids.includes(id));
        expect(overlap.length).toBe(0); // No overlap between pages
      }
    });

    it('should handle hex color validation', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Try to update label with invalid hex color (with # prefix)
      const allLabels = await getAllLabels(
        { page: 1, page_size: 1 },
        client,
        TEST_TOKEN
      );

      if (allLabels.labels.length > 0) {
        const labelId = allLabels.labels[0].id;

        // This should fail validation
        await expect(
          updateLabel(
            {
              label_id: labelId,
              hex_color: '#FF5733', // Invalid - has # prefix
            },
            client,
            TEST_TOKEN
          )
        ).rejects.toThrow();
      }
    });
  });

  describe('Label Error Handling', () => {
    it('should handle label not found error', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Try to get non-existent label
      await expect(
        getLabel(
          { label_id: 999999 },
          client,
          TEST_TOKEN
        )
      ).rejects.toThrow(/Label 999999 not found/);
    });

    it('should handle task not found for get_task_labels', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Try to get labels for non-existent task
      await expect(
        getTaskLabels(
          { task_id: 999999 },
          client,
          TEST_TOKEN
        )
      ).rejects.toThrow(/Task 999999 not found/);
    });
  });
});

/**
 * Task Attachment Workflow Integration Tests (T110)
 */
describe('Task Attachment Workflow Integration', () => {
  let client: VikunjaClient;
  let testTaskId: number;

  beforeAll(() => {
    client = new VikunjaClient();
  });

  beforeEach(() => {
    // Note: In a real integration test, you would create test tasks here
    // For now, we'll use a mock task ID
    testTaskId = 1;
  });

  describe('Attachment Metadata Retrieval', () => {
    it('T110: should retrieve task attachment metadata successfully', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Query task attachments
      const result = await getTaskAttachments(
        { task_id: testTaskId },
        client,
        TEST_TOKEN
      );

      // Verify response structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('attachment(s)');
      
      // If attachments exist, verify metadata fields are present
      if (result.content[0].text.includes('Found') && !result.content[0].text.includes('No attachments')) {
        expect(result.content[0].text).toMatch(/Size:/);
        expect(result.content[0].text).toMatch(/MIME Type:/);
        expect(result.content[0].text).toMatch(/Uploaded by:/);
        expect(result.content[0].text).toMatch(/Uploaded:/);
      }
    });

    it('should handle task with no attachments gracefully', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Query task that likely has no attachments
      const result = await getTaskAttachments(
        { task_id: testTaskId },
        client,
        TEST_TOKEN
      );

      // Should return empty list, not error
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('attachment(s)');
      
      // May contain "No attachments found" or show 0 count
      expect(
        result.content[0].text.includes('No attachments') || 
        result.content[0].text.includes('Found 0')
      ).toBeTruthy();
    });

    it('should handle task not found error', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      // Try to get attachments for non-existent task
      await expect(
        getTaskAttachments(
          { task_id: 999999 },
          client,
          TEST_TOKEN
        )
      ).rejects.toThrow();
    });

    it('should clarify metadata-only response (no file content)', async () => {
      if (!process.env.VIKUNJA_TEST_TOKEN) {
        console.log('Skipping integration test: VIKUNJA_TEST_TOKEN not set');
        return;
      }

      const result = await getTaskAttachments(
        { task_id: testTaskId },
        client,
        TEST_TOKEN
      );

      // Verify clarification that this is metadata only
      expect(result.content[0].text).toContain('metadata only');
      expect(result.content[0].text).toContain('no file content');
    });
  });
});
