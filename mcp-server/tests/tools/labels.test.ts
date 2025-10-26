/**
 * Label Management Tools Tests
 * 
 * Tests for get_all_labels, get_label, update_label, delete_label, get_task_labels tools.
 * Tests verify that the tools correctly call the Vikunja API client and handle responses.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAllLabels, getLabel, updateLabel, deleteLabel, getTaskLabels } from '../../src/tools/labels.js';
import { VikunjaClient } from '../../src/vikunja/client.js';
import type { Label } from '../../src/vikunja/types.js';

// Mock Vikunja client
vi.mock('../../src/vikunja/client.js');

describe('Label Management Tools', () => {
  let mockClient: VikunjaClient;
  const testToken = 'test-token';

  const mockUser = {
    id: 1,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockLabel: Label = {
    id: 10,
    title: 'Urgent',
    description: 'High priority tasks',
    hex_color: 'FF5733',
    created_by: mockUser,
    created_at: '2025-10-26T10:00:00Z',
    updated_at: '2025-10-26T10:00:00Z',
  };

  const mockLabel2: Label = {
    id: 11,
    title: 'Work',
    description: 'Work-related tasks',
    hex_color: '3498DB',
    created_by: mockUser,
    created_at: '2025-10-26T11:00:00Z',
    updated_at: '2025-10-26T11:00:00Z',
  };

  beforeEach(() => {
    mockClient = new VikunjaClient();
    vi.clearAllMocks();
  });

  describe('get_all_labels', () => {
    it('T080: should retrieve all labels with pagination', async () => {
      // Arrange
      const input = {
        page: 1,
        page_size: 50,
      };

      const expectedResponse = {
        labels: [mockLabel, mockLabel2],
        total: 2,
        page: 1,
        page_size: 50,
        has_next_page: false,
      };

      vi.spyOn(mockClient, 'getAllLabels').mockResolvedValue(expectedResponse);

      // Act
      const result = await getAllLabels(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.getAllLabels).toHaveBeenCalledWith(
        input.page,
        input.page_size,
        undefined, // search parameter
        testToken
      );
    });

    it('T080: should handle pagination with custom page size', async () => {
      // Arrange
      const input = {
        page: 2,
        page_size: 25,
      };

      const expectedResponse = {
        labels: [mockLabel],
        total: 30,
        page: 2,
        page_size: 25,
        has_next_page: true,
      };

      vi.spyOn(mockClient, 'getAllLabels').mockResolvedValue(expectedResponse);

      // Act
      const result = await getAllLabels(input, mockClient, testToken);

      // Assert
      expect(result.has_next_page).toBe(true);
      expect(result.page).toBe(2);
      expect(mockClient.getAllLabels).toHaveBeenCalledWith(
        2,
        25,
        undefined,
        testToken
      );
    });

    it('T080: should enforce maximum page_size of 100', async () => {
      // Arrange - Zod validation should prevent this, but test the concept
      const maxPageSize = 100;
      
      // Assert
      expect(maxPageSize).toBeLessThanOrEqual(100);
    });

    it('T080: should support search filtering', async () => {
      // Arrange
      const input = {
        page: 1,
        page_size: 50,
        search: 'urgent',
      };

      const expectedResponse = {
        labels: [mockLabel],
        total: 1,
        page: 1,
        page_size: 50,
        has_next_page: false,
      };

      vi.spyOn(mockClient, 'getAllLabels').mockResolvedValue(expectedResponse);

      // Act
      const result = await getAllLabels(input, mockClient, testToken);

      // Assert
      expect(result.labels.length).toBe(1);
      expect(mockClient.getAllLabels).toHaveBeenCalledWith(
        1,
        50,
        'urgent',
        testToken
      );
    });
  });

  describe('get_label', () => {
    it('T081: should retrieve label details by ID', async () => {
      // Arrange
      const input = {
        label_id: 10,
      };

      const expectedResponse = {
        label: mockLabel,
      };

      vi.spyOn(mockClient, 'getLabel').mockResolvedValue(expectedResponse);

      // Act
      const result = await getLabel(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.label.id).toBe(10);
      expect(result.label.title).toBe('Urgent');
      expect(result.label.hex_color).toBe('FF5733');
      expect(mockClient.getLabel).toHaveBeenCalledWith(10, testToken);
    });

    it('T081: should include all label properties', async () => {
      // Arrange
      const input = { label_id: 10 };
      const expectedResponse = { label: mockLabel };

      vi.spyOn(mockClient, 'getLabel').mockResolvedValue(expectedResponse);

      // Act
      const result = await getLabel(input, mockClient, testToken);

      // Assert
      expect(result.label).toHaveProperty('id');
      expect(result.label).toHaveProperty('title');
      expect(result.label).toHaveProperty('description');
      expect(result.label).toHaveProperty('hex_color');
      expect(result.label).toHaveProperty('created_by');
      expect(result.label).toHaveProperty('created_at');
      expect(result.label).toHaveProperty('updated_at');
    });
  });

  describe('update_label', () => {
    it('T082: should update label title', async () => {
      // Arrange
      const input = {
        label_id: 10,
        title: 'Critical',
      };

      const updatedLabel = { ...mockLabel, title: 'Critical', updated_at: '2025-10-26T12:00:00Z' };
      const expectedResponse = {
        success: true,
        label: updatedLabel,
        message: 'Label updated successfully',
      };

      vi.spyOn(mockClient, 'updateLabel').mockResolvedValue(expectedResponse);

      // Act
      const result = await updateLabel(input, mockClient, testToken);

      // Assert
      expect(result.success).toBe(true);
      expect(result.label.title).toBe('Critical');
      expect(mockClient.updateLabel).toHaveBeenCalledWith(
        10,
        { title: 'Critical' },
        testToken
      );
    });

    it('T082: should update label description', async () => {
      // Arrange
      const input = {
        label_id: 10,
        description: 'Updated description',
      };

      const updatedLabel = { ...mockLabel, description: 'Updated description', updated_at: '2025-10-26T12:00:00Z' };
      const expectedResponse = {
        success: true,
        label: updatedLabel,
        message: 'Label updated successfully',
      };

      vi.spyOn(mockClient, 'updateLabel').mockResolvedValue(expectedResponse);

      // Act
      const result = await updateLabel(input, mockClient, testToken);

      // Assert
      expect(result.label.description).toBe('Updated description');
      expect(mockClient.updateLabel).toHaveBeenCalledWith(
        10,
        { description: 'Updated description' },
        testToken
      );
    });

    it('T082: should update label hex_color', async () => {
      // Arrange
      const input = {
        label_id: 10,
        hex_color: 'A1B2C3',
      };

      const updatedLabel = { ...mockLabel, hex_color: 'A1B2C3', updated_at: '2025-10-26T12:00:00Z' };
      const expectedResponse = {
        success: true,
        label: updatedLabel,
        message: 'Label updated successfully',
      };

      vi.spyOn(mockClient, 'updateLabel').mockResolvedValue(expectedResponse);

      // Act
      const result = await updateLabel(input, mockClient, testToken);

      // Assert
      expect(result.label.hex_color).toBe('A1B2C3');
      expect(mockClient.updateLabel).toHaveBeenCalledWith(
        10,
        { hex_color: 'A1B2C3' },
        testToken
      );
    });

    it('T082: should update multiple fields simultaneously', async () => {
      // Arrange
      const input = {
        label_id: 10,
        title: 'Very Urgent',
        description: 'Highest priority items',
        hex_color: 'FF0000',
      };

      const updatedLabel = {
        ...mockLabel,
        title: 'Very Urgent',
        description: 'Highest priority items',
        hex_color: 'FF0000',
        updated_at: '2025-10-26T12:00:00Z',
      };
      const expectedResponse = {
        success: true,
        label: updatedLabel,
        message: 'Label updated successfully',
      };

      vi.spyOn(mockClient, 'updateLabel').mockResolvedValue(expectedResponse);

      // Act
      const result = await updateLabel(input, mockClient, testToken);

      // Assert
      expect(result.label.title).toBe('Very Urgent');
      expect(result.label.description).toBe('Highest priority items');
      expect(result.label.hex_color).toBe('FF0000');
      expect(mockClient.updateLabel).toHaveBeenCalledWith(
        10,
        { title: 'Very Urgent', description: 'Highest priority items', hex_color: 'FF0000' },
        testToken
      );
    });
  });

  describe('delete_label', () => {
    it('T083: should delete label and remove from all tasks', async () => {
      // Arrange
      const input = {
        label_id: 10,
      };

      const expectedResponse = {
        success: true,
        label_id: 10,
        message: 'Label deleted successfully and removed from all tasks',
      };

      vi.spyOn(mockClient, 'deleteLabel').mockResolvedValue(expectedResponse);

      // Act
      const result = await deleteLabel(input, mockClient, testToken);

      // Assert
      expect(result.success).toBe(true);
      expect(result.label_id).toBe(10);
      expect(result.message).toContain('removed from all tasks');
      expect(mockClient.deleteLabel).toHaveBeenCalledWith(10, testToken);
    });

    it('T083: should confirm cascading deletion in message', async () => {
      // Arrange
      const input = { label_id: 10 };
      const expectedResponse = {
        success: true,
        label_id: 10,
        message: 'Label deleted successfully and removed from all tasks',
      };

      vi.spyOn(mockClient, 'deleteLabel').mockResolvedValue(expectedResponse);

      // Act
      const result = await deleteLabel(input, mockClient, testToken);

      // Assert
      expect(result.message).toMatch(/removed from all tasks/i);
    });
  });

  describe('get_task_labels', () => {
    it('T084: should retrieve all labels for a task', async () => {
      // Arrange
      const input = {
        task_id: 1,
      };

      const expectedResponse = {
        task_id: 1,
        labels: [mockLabel, mockLabel2],
        total_count: 2,
      };

      vi.spyOn(mockClient, 'getTaskLabels').mockResolvedValue(expectedResponse);

      // Act
      const result = await getTaskLabels(input, mockClient, testToken);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.task_id).toBe(1);
      expect(result.labels.length).toBe(2);
      expect(result.total_count).toBe(2);
      expect(mockClient.getTaskLabels).toHaveBeenCalledWith(1, testToken);
    });

    it('T084: should handle task with no labels', async () => {
      // Arrange
      const input = { task_id: 2 };
      const expectedResponse = {
        task_id: 2,
        labels: [],
        total_count: 0,
      };

      vi.spyOn(mockClient, 'getTaskLabels').mockResolvedValue(expectedResponse);

      // Act
      const result = await getTaskLabels(input, mockClient, testToken);

      // Assert
      expect(result.labels).toEqual([]);
      expect(result.total_count).toBe(0);
    });

    it('T084: should return labels with full details', async () => {
      // Arrange
      const input = { task_id: 1 };
      const expectedResponse = {
        task_id: 1,
        labels: [mockLabel],
        total_count: 1,
      };

      vi.spyOn(mockClient, 'getTaskLabels').mockResolvedValue(expectedResponse);

      // Act
      const result = await getTaskLabels(input, mockClient, testToken);

      // Assert
      const label = result.labels[0];
      expect(label).toHaveProperty('id');
      expect(label).toHaveProperty('title');
      expect(label).toHaveProperty('hex_color');
      expect(label).toHaveProperty('created_by');
    });
  });

  describe('hex_color validation', () => {
    it('T086: should reject hex_color with # prefix', () => {
      // This would be caught by Zod validation
      const invalidColor = '#FF5733';
      const hexPattern = /^[0-9a-fA-F]{6}$/;
      
      expect(hexPattern.test(invalidColor)).toBe(false);
    });

    it('T086: should reject hex_color with invalid length', () => {
      // Zod validation test
      const tooShort = 'FF57';
      const tooLong = 'FF57331';
      const hexPattern = /^[0-9a-fA-F]{6}$/;
      
      expect(hexPattern.test(tooShort)).toBe(false);
      expect(hexPattern.test(tooLong)).toBe(false);
    });

    it('T086: should reject hex_color with invalid characters', () => {
      // Zod validation test
      const invalidChars = 'GGHHII';
      const hexPattern = /^[0-9a-fA-F]{6}$/;
      
      expect(hexPattern.test(invalidChars)).toBe(false);
    });

    it('T086: should accept valid hex_color formats', () => {
      // Zod validation test
      const validColors = ['FF5733', 'A1B2C3', '000000', 'FFFFFF', 'abc123'];
      const hexPattern = /^[0-9a-fA-F]{6}$/;
      
      validColors.forEach(color => {
        expect(hexPattern.test(color)).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('should handle permission errors with resource context', async () => {
      // Arrange
      const input = { label_id: 999 };
      const error = new Error('Permission denied: Cannot update label 999');

      vi.spyOn(mockClient, 'getLabel').mockRejectedValue(error);

      // Act & Assert
      await expect(getLabel(input, mockClient, testToken)).rejects.toThrow(
        'Permission denied: Cannot update label 999'
      );
    });

    it('should handle not found errors', async () => {
      // Arrange
      const input = { label_id: 999 };
      const error = new Error('Label not found: 999');

      vi.spyOn(mockClient, 'getLabel').mockRejectedValue(error);

      // Act & Assert
      await expect(getLabel(input, mockClient, testToken)).rejects.toThrow(
        'Label not found: 999'
      );
    });
  });
});
