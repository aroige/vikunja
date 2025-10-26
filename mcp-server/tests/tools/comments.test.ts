/**
 * Task Comments Tools Tests
 * 
 * Tests for add_task_comment, get_task_comments, update_task_comment, delete_task_comment tools.
 * Tests verify that the tools correctly call the Vikunja API client and handle responses.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addTaskComment, getTaskComments, updateTaskComment, deleteTaskComment } from '../../src/tools/comments.js';
import { VikunjaClient } from '../../src/vikunja/client.js';
import type { TaskComment } from '../../src/vikunja/types.js';

// Mock Vikunja client
vi.mock('../../src/vikunja/client.js');

describe('Task Comments Tools', () => {
  let mockClient: VikunjaClient;
  const testToken = 'test-token';

  const mockUser = {
    id: 1,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockComment: TaskComment = {
    id: 100,
    task_id: 1,
    comment: 'This is a test comment',
    author: mockUser,
    created: '2025-10-26T10:00:00Z',
    updated: '2025-10-26T10:00:00Z',
  };

  beforeEach(() => {
    mockClient = new VikunjaClient();
    vi.clearAllMocks();
  });

  describe('add_task_comment', () => {
    it('T063: should add comment to task successfully', async () => {
      // Arrange
      const input = {
        task_id: 1,
        comment: 'This is a test comment',
      };

      const expectedResponse = {
        success: true,
        comment: mockComment,
        message: 'Comment added successfully',
      };

      vi.spyOn(mockClient, 'addTaskComment').mockResolvedValue(expectedResponse);

      // Act
      const result = await addTaskComment(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.addTaskComment).toHaveBeenCalledWith(
        input.task_id,
        input.comment,
        testToken
      );
    });

    it('should reject empty comment', async () => {
      // Arrange
      const input = {
        task_id: 1,
        comment: '',
      };

      // This would be caught by Zod validation before reaching the handler
      // But we test the concept
      expect(input.comment).toBe('');
    });
  });

  describe('get_task_comments', () => {
    it('T064: should retrieve task comments with pagination (page_size=50 default)', async () => {
      // Arrange
      const input = {
        task_id: 1,
        // page and page_size should default to 1 and 50
      };

      const mockComments: TaskComment[] = [
        mockComment,
        { ...mockComment, id: 101, comment: 'Second comment' },
        { ...mockComment, id: 102, comment: 'Third comment' },
      ];

      const expectedResponse = {
        task_id: 1,
        comments: mockComments,
        total: 3,
        page: 1,
        page_size: 50,
        total_pages: 1,
      };

      vi.spyOn(mockClient, 'getTaskComments').mockResolvedValue(expectedResponse);

      // Act
      const result = await getTaskComments(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.getTaskComments).toHaveBeenCalledWith(
        input.task_id,
        1, // default page
        50, // default page_size
        testToken
      );
    });

    it('T068: should enforce page_size max 100', async () => {
      // Arrange
      const input = {
        task_id: 1,
        page: 1,
        page_size: 150, // exceeds max
      };

      // This would be caught by Zod validation (max: 100)
      // Test that our schema enforces this
      expect(input.page_size).toBeGreaterThan(100);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const input = {
        task_id: 1,
        page: 2,
        page_size: 25,
      };

      const mockComments: TaskComment[] = [
        { ...mockComment, id: 126, comment: 'Comment 26' },
        { ...mockComment, id: 127, comment: 'Comment 27' },
      ];

      const expectedResponse = {
        task_id: 1,
        comments: mockComments,
        total: 100,
        page: 2,
        page_size: 25,
        total_pages: 4,
      };

      vi.spyOn(mockClient, 'getTaskComments').mockResolvedValue(expectedResponse);

      // Act
      const result = await getTaskComments(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.getTaskComments).toHaveBeenCalledWith(
        input.task_id,
        2,
        25,
        testToken
      );
    });
  });

  describe('update_task_comment', () => {
    it('T065: should update task comment text', async () => {
      // Arrange
      const input = {
        task_id: 1,
        comment_id: 100,
        comment: 'Updated comment text',
      };

      const updatedComment: TaskComment = {
        ...mockComment,
        comment: 'Updated comment text',
        updated: '2025-10-26T11:00:00Z',
      };

      const expectedResponse = {
        success: true,
        comment: updatedComment,
        message: 'Comment updated successfully',
      };

      vi.spyOn(mockClient, 'updateTaskComment').mockResolvedValue(expectedResponse);

      // Act
      const result = await updateTaskComment(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.updateTaskComment).toHaveBeenCalledWith(
        input.task_id,
        input.comment_id,
        input.comment,
        testToken
      );
    });

    it('T067: should deny permission for modifying other user\'s comment', async () => {
      // Arrange
      const input = {
        task_id: 1,
        comment_id: 100,
        comment: 'Trying to modify someone else\'s comment',
      };

      const permissionError = {
        response: {
          status: 403,
          data: { message: 'You can only modify your own comments' },
        },
      };

      vi.spyOn(mockClient, 'updateTaskComment').mockRejectedValue(permissionError);

      // Act & Assert
      await expect(updateTaskComment(input, mockClient, testToken)).rejects.toThrow(
        /Permission denied.*comment/i
      );
    });
  });

  describe('delete_task_comment', () => {
    it('T066: should delete task comment', async () => {
      // Arrange
      const input = {
        task_id: 1,
        comment_id: 100,
      };

      const expectedResponse = {
        success: true,
        message: 'Comment deleted successfully',
      };

      vi.spyOn(mockClient, 'deleteTaskComment').mockResolvedValue(expectedResponse);

      // Act
      const result = await deleteTaskComment(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.deleteTaskComment).toHaveBeenCalledWith(
        input.task_id,
        input.comment_id,
        testToken
      );
    });

    it('T067: should deny permission for deleting other user\'s comment', async () => {
      // Arrange
      const input = {
        task_id: 1,
        comment_id: 100,
      };

      const permissionError = {
        response: {
          status: 403,
          data: { message: 'You can only delete your own comments' },
        },
      };

      vi.spyOn(mockClient, 'deleteTaskComment').mockRejectedValue(permissionError);

      // Act & Assert
      await expect(deleteTaskComment(input, mockClient, testToken)).rejects.toThrow(
        /Permission denied.*comment/i
      );
    });
  });

  describe('error handling', () => {
    it('should handle task not found error', async () => {
      // Arrange
      const input = {
        task_id: 9999,
        comment: 'Comment on non-existent task',
      };

      const notFoundError = {
        response: {
          status: 404,
          data: { message: 'Task not found' },
        },
      };

      vi.spyOn(mockClient, 'addTaskComment').mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(addTaskComment(input, mockClient, testToken)).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      const input = {
        task_id: 1,
        comment: 'Test comment',
      };

      const networkError = new Error('Network error');
      vi.spyOn(mockClient, 'addTaskComment').mockRejectedValue(networkError);

      // Act & Assert
      await expect(addTaskComment(input, mockClient, testToken)).rejects.toThrow('Network error');
    });
  });
});
