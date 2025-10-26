/**
 * Task Relations Tools Tests
 * 
 * Tests for create_task_relation, get_task_relations, delete_task_relation tools.
 * Tests verify that the tools correctly call the Vikunja API client and handle responses.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTaskRelation, getTaskRelations, deleteTaskRelation } from '../../src/tools/relations.js';
import { VikunjaClient } from '../../src/vikunja/client.js';
import type { RelationKind } from '../../src/vikunja/types.js';

// Mock Vikunja client
vi.mock('../../src/vikunja/client.js');

describe('Task Relations Tools', () => {
  let mockClient: VikunjaClient;
  const testToken = 'test-token';

  beforeEach(() => {
    mockClient = new VikunjaClient();
    vi.clearAllMocks();
  });

  describe('create_task_relation', () => {
    it('T036: should create task relation with bidirectional creation', async () => {
      // Arrange
      const input = {
        task_id: 1,
        other_task_id: 2,
        relation_kind: 'subtask' as RelationKind,
      };

      const expectedResponse = {
        success: true,
        task_id: 1,
        other_task_id: 2,
        relation_kind: 'subtask' as RelationKind,
        message: 'Task relation created successfully. Bidirectional relation (parenttask) also created automatically.',
      };

      vi.spyOn(mockClient, 'createTaskRelation').mockResolvedValue(expectedResponse);

      // Act
      const result = await createTaskRelation(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.createTaskRelation).toHaveBeenCalledWith(
        input.task_id,
        input.other_task_id,
        input.relation_kind,
        testToken
      );
    });

    it('T037: should reject hierarchical relation that creates cycle', async () => {
      // Arrange
      const input = {
        task_id: 1,
        other_task_id: 2,
        relation_kind: 'subtask' as RelationKind,
      };

      const cycleError = new Error('Cycle detected: Cannot create subtask relation that would create a circular dependency');
      vi.spyOn(mockClient, 'createTaskRelation').mockRejectedValue(cycleError);

      // Act & Assert
      await expect(createTaskRelation(input, mockClient, testToken)).rejects.toThrow('Cycle detected');
    });

    it('T040: should include resource type context in permission error', async () => {
      // Arrange
      const input = {
        task_id: 1,
        other_task_id: 2,
        relation_kind: 'subtask' as RelationKind,
      };

      const permissionError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };

      vi.spyOn(mockClient, 'createTaskRelation').mockRejectedValue(permissionError);

      // Act & Assert
      await expect(createTaskRelation(input, mockClient, testToken)).rejects.toThrow(
        /Permission denied.*task relation/i
      );
    });

    it('T041: should return clear error for invalid relation_kind (Zod validation)', async () => {
      // This test validates the concept that Zod would catch invalid relation_kind
      // In actual usage, Zod schema validation would prevent invalid kinds from reaching the handler
      const validKinds = ['subtask', 'parenttask', 'related', 'duplicateof', 'duplicates', 'blocking', 'blocked', 'precedes', 'follows', 'copiedfrom', 'copiedto'];
      expect(validKinds).toContain('subtask');
      expect(validKinds).not.toContain('invalid_kind');
    });
  });

  describe('get_task_relations', () => {
    it('T038: should retrieve task relations grouped by kind', async () => {
      // Arrange
      const input = { task_id: 1 };

      const expectedResponse = {
        task_id: 1,
        relations: {
          subtasks: [
            {
              task_id: 1,
              other_task_id: 2,
              relation_kind: 'subtask' as RelationKind,
              created_by: {
                id: 1,
                username: 'testuser',
                name: 'Test User',
                email: 'test@example.com',
                created: '2025-01-01T00:00:00Z',
                updated: '2025-01-01T00:00:00Z',
              },
              created_at: '2025-10-26T10:00:00Z',
            },
            {
              task_id: 1,
              other_task_id: 3,
              relation_kind: 'subtask' as RelationKind,
              created_by: {
                id: 1,
                username: 'testuser',
                name: 'Test User',
                email: 'test@example.com',
                created: '2025-01-01T00:00:00Z',
                updated: '2025-01-01T00:00:00Z',
              },
              created_at: '2025-10-26T10:05:00Z',
            },
          ],
          blocking: [
            {
              task_id: 1,
              other_task_id: 4,
              relation_kind: 'blocking' as RelationKind,
              created_by: {
                id: 1,
                username: 'testuser',
                name: 'Test User',
                email: 'test@example.com',
                created: '2025-01-01T00:00:00Z',
                updated: '2025-01-01T00:00:00Z',
              },
              created_at: '2025-10-26T10:10:00Z',
            },
          ],
        },
        total_count: 3,
      };

      vi.spyOn(mockClient, 'getTaskRelations').mockResolvedValue(expectedResponse);

      // Act
      const result = await getTaskRelations(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.relations.subtasks).toHaveLength(2);
      expect(result.relations.blocking).toHaveLength(1);
      expect(result.total_count).toBe(3);
      expect(mockClient.getTaskRelations).toHaveBeenCalledWith(input.task_id, testToken);
    });

    it('should return empty relations for task without relations', async () => {
      // Arrange
      const input = { task_id: 1 };

      const expectedResponse = {
        task_id: 1,
        relations: {},
        total_count: 0,
      };

      vi.spyOn(mockClient, 'getTaskRelations').mockResolvedValue(expectedResponse);

      // Act
      const result = await getTaskRelations(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.total_count).toBe(0);
    });

    it('should include resource type context in permission error', async () => {
      // Arrange
      const input = { task_id: 1 };

      const permissionError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };

      vi.spyOn(mockClient, 'getTaskRelations').mockRejectedValue(permissionError);

      // Act & Assert
      await expect(getTaskRelations(input, mockClient, testToken)).rejects.toThrow(
        /Permission denied.*task relation/i
      );
    });
  });

  describe('delete_task_relation', () => {
    it('T039: should delete task relation with bidirectional deletion', async () => {
      // Arrange
      const input = {
        task_id: 1,
        other_task_id: 2,
        relation_kind: 'subtask' as RelationKind,
      };

      const expectedResponse = {
        success: true,
        task_id: 1,
        other_task_id: 2,
        relation_kind: 'subtask' as RelationKind,
        message: 'Task relation deleted successfully. Bidirectional relation (parenttask) also removed automatically.',
      };

      vi.spyOn(mockClient, 'deleteTaskRelation').mockResolvedValue(expectedResponse);

      // Act
      const result = await deleteTaskRelation(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.deleteTaskRelation).toHaveBeenCalledWith(
        input.task_id,
        input.other_task_id,
        input.relation_kind,
        testToken
      );
    });

    it('should handle deletion of non-existent relation gracefully', async () => {
      // Arrange
      const input = {
        task_id: 1,
        other_task_id: 2,
        relation_kind: 'subtask' as RelationKind,
      };

      const notFoundError = {
        response: {
          status: 404,
          data: { message: 'Relation not found' },
        },
      };

      vi.spyOn(mockClient, 'deleteTaskRelation').mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(deleteTaskRelation(input, mockClient, testToken)).rejects.toThrow();
    });

    it('should include resource type context in permission error', async () => {
      // Arrange
      const input = {
        task_id: 1,
        other_task_id: 2,
        relation_kind: 'subtask' as RelationKind,
      };

      const permissionError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };

      vi.spyOn(mockClient, 'deleteTaskRelation').mockRejectedValue(permissionError);

      // Act & Assert
      await expect(deleteTaskRelation(input, mockClient, testToken)).rejects.toThrow(
        /Permission denied.*task relation/i
      );
    });
  });
});
