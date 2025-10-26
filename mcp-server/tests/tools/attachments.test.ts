/**
 * Task Attachments Tools Tests
 * 
 * Tests for get_task_attachments tool.
 * Tests verify that the tool correctly calls the Vikunja API client and handles responses.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTaskAttachments } from '../../src/tools/attachments.js';
import { VikunjaClient } from '../../src/vikunja/client.js';
import type { TaskAttachment } from '../../src/vikunja/types.js';

// Mock Vikunja client
vi.mock('../../src/vikunja/client.js');

describe('Task Attachments Tools', () => {
  let mockClient: VikunjaClient;
  const testToken = 'test-token';

  const mockUser = {
    id: 1,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockAttachment1: TaskAttachment = {
    id: 100,
    task_id: 1,
    file_id: 50,
    filename: 'report.pdf',
    size: 1024000,
    mime_type: 'application/pdf',
    created_by: mockUser,
    created: '2025-10-26T10:00:00Z',
  };

  const mockAttachment2: TaskAttachment = {
    id: 101,
    task_id: 1,
    file_id: 51,
    filename: 'screenshot.png',
    size: 512000,
    mime_type: 'image/png',
    created_by: mockUser,
    created: '2025-10-26T11:00:00Z',
  };

  beforeEach(() => {
    mockClient = new VikunjaClient();
    vi.clearAllMocks();
  });

  describe('get_task_attachments', () => {
    it('T101: should return list of attachment metadata', async () => {
      // Arrange
      const input = {
        task_id: 1,
      };

      const expectedResponse = {
        success: true,
        attachments: [mockAttachment1, mockAttachment2],
        count: 2,
      };

      vi.spyOn(mockClient, 'getTaskAttachments').mockResolvedValue(expectedResponse);

      // Act
      const result = await getTaskAttachments(input, mockClient, testToken);

      // Assert
      expect(mockClient.getTaskAttachments).toHaveBeenCalledWith(1, testToken);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Found 2 attachment(s)'),
          },
        ],
      });
      expect(result.content[0].text).toContain('report.pdf');
      expect(result.content[0].text).toContain('screenshot.png');
    });

    it('T102: should return metadata with all required fields', async () => {
      // Arrange
      const input = {
        task_id: 1,
      };

      const expectedResponse = {
        success: true,
        attachments: [mockAttachment1],
        count: 1,
      };

      vi.spyOn(mockClient, 'getTaskAttachments').mockResolvedValue(expectedResponse);

      // Act
      const result = await getTaskAttachments(input, mockClient, testToken);

      // Assert - check that all required metadata fields are present in output
      expect(result.content[0].text).toContain('report.pdf'); // filename
      expect(result.content[0].text).toContain('Size:'); // size label
      expect(result.content[0].text).toContain('1024000'); // size value
      expect(result.content[0].text).toContain('MIME Type:'); // mime_type label
      expect(result.content[0].text).toContain('application/pdf'); // mime_type value
      expect(result.content[0].text).toContain('Uploaded by:'); // created_by label
      expect(result.content[0].text).toContain('testuser'); // created_by username
      expect(result.content[0].text).toContain('Uploaded:'); // created label
      expect(result.content[0].text).toContain('2025-10-26T10:00:00Z'); // created timestamp
    });

    it('T103: should return empty array when task has no attachments', async () => {
      // Arrange
      const input = {
        task_id: 1,
      };

      const expectedResponse = {
        success: true,
        attachments: [],
        count: 0,
      };

      vi.spyOn(mockClient, 'getTaskAttachments').mockResolvedValue(expectedResponse);

      // Act
      const result = await getTaskAttachments(input, mockClient, testToken);

      // Assert
      expect(mockClient.getTaskAttachments).toHaveBeenCalledWith(1, testToken);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Found 0 attachment(s)'),
          },
        ],
      });
      expect(result.content[0].text).toContain('No attachments found');
    });

    it('should handle permission errors with task context', async () => {
      // Arrange
      const input = {
        task_id: 1,
      };

      const permissionError = new Error('Permission denied');
      (permissionError as any).code = 403;

      vi.spyOn(mockClient, 'getTaskAttachments').mockRejectedValue(permissionError);

      // Act & Assert
      await expect(getTaskAttachments(input, mockClient, testToken)).rejects.toThrow(
        'Permission denied: cannot view attachments for task 1'
      );
    });

    it('should validate task_id parameter', async () => {
      // Arrange
      const invalidInput = {
        task_id: -1,
      };

      // Act & Assert
      await expect(getTaskAttachments(invalidInput, mockClient, testToken)).rejects.toThrow();
    });
  });
});
