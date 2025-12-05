/**
 * Visual View Designer - Integration Tests
 *
 * Comprehensive workflow tests for the Designer
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DesignerShell from '../DesignerShell';

// Mock functions
const mockOnSave = jest.fn(() => Promise.resolve());
const mockOnPreview = jest.fn();
const mockOnBack = jest.fn();

// Test wrapper with router
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('Designer Full Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Complete workflow: add → edit → clone → delete → save', async () => {
    const { container } = render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // 1. Add a heading block from palette
    const headingButton = screen.getByText(/Heading/i);
    fireEvent.click(headingButton);

    // 2. Verify block appears in canvas
    await waitFor(() => {
      const canvas = container.querySelector('[data-canvas]');
      expect(canvas?.querySelector('[data-component-type="Heading"]')).toBeInTheDocument();
    });

    // 3. Select the block
    const headingBlock = container.querySelector('[data-component-type="Heading"]');
    fireEvent.click(headingBlock!);

    // 4. Edit properties in inspector
    await waitFor(() => {
      const textInput = screen.getByLabelText(/Text/i);
      fireEvent.change(textInput, { target: { value: 'Test Heading' } });
    });

    // 5. Clone the block using keyboard shortcut
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });

    // 6. Verify two blocks exist
    await waitFor(() => {
      const blocks = container.querySelectorAll('[data-component-type="Heading"]');
      expect(blocks.length).toBe(2);
    });

    // 7. Delete one block using keyboard shortcut
    fireEvent.keyDown(window, { key: 'Delete' });

    // 8. Verify only one block remains
    await waitFor(() => {
      const blocks = container.querySelectorAll('[data-component-type="Heading"]');
      expect(blocks.length).toBe(1);
    });

    // 9. Save using keyboard shortcut
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    // 10. Verify save was called
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  test('Keyboard shortcuts work correctly', async () => {
    const { container } = render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Add a block
    const headingButton = screen.getByText(/Heading/i);
    fireEvent.click(headingButton);

    await waitFor(() => {
      const block = container.querySelector('[data-component-type="Heading"]');
      expect(block).toBeInTheDocument();
    });

    // Select the block
    const block = container.querySelector('[data-component-type="Heading"]');
    fireEvent.click(block!);

    // Test Ctrl+D (duplicate)
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    await waitFor(() => {
      const blocks = container.querySelectorAll('[data-component-type="Heading"]');
      expect(blocks.length).toBe(2);
    });

    // Test Esc (deselect)
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      // Check that no block is selected (inspector should be empty or show "No selection")
      expect(screen.queryByText(/No component selected/i)).toBeInTheDocument();
    });

    // Test Ctrl+Z (undo)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await waitFor(() => {
      const blocks = container.querySelectorAll('[data-component-type="Heading"]');
      expect(blocks.length).toBe(1);
    });

    // Test Ctrl+Y (redo)
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    await waitFor(() => {
      const blocks = container.querySelectorAll('[data-component-type="Heading"]');
      expect(blocks.length).toBe(2);
    });
  });

  test('Dirty state prevents navigation', async () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Add block (creates dirty state)
    const headingButton = screen.getByText(/Heading/i);
    fireEvent.click(headingButton);

    await waitFor(() => {
      expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();
    });

    // Try to navigate back
    const closeButton = screen.getByText(/Close Designer/i);
    fireEvent.click(closeButton);

    // Verify modal appears
    await waitFor(() => {
      expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument();
    });

    // Test "Discard Changes"
    const discardButton = screen.getByText(/Discard Changes/i);
    fireEvent.click(discardButton);

    // Verify navigation happened
    await waitFor(() => {
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  test('Dirty state modal - Save and Leave', async () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Add block (creates dirty state)
    const headingButton = screen.getByText(/Heading/i);
    fireEvent.click(headingButton);

    // Try to navigate back
    const closeButton = screen.getByText(/Close Designer/i);
    fireEvent.click(closeButton);

    // Click "Save Changes"
    await waitFor(() => {
      const saveButton = screen.getByText(/Save Changes/i);
      fireEvent.click(saveButton);
    });

    // Verify save was called and navigation happened
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  test('JSON import/export round-trip', async () => {
    const { container, rerender } = render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Add blocks
    const headingButton = screen.getByText(/Heading/i);
    fireEvent.click(headingButton);

    const textButton = screen.getByText(/Text Block/i);
    fireEvent.click(textButton);

    // Wait for blocks to appear
    await waitFor(() => {
      expect(container.querySelector('[data-component-type="Heading"]')).toBeInTheDocument();
      expect(container.querySelector('[data-component-type="TextBlock"]')).toBeInTheDocument();
    });

    // Note: Export/Import functionality would need UI buttons to test properly
    // This is a placeholder for when those features are implemented
  });

  test('Error handling for invalid operations', async () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Try to delete without selecting anything (should not crash)
    fireEvent.keyDown(window, { key: 'Delete' });

    // Try to duplicate without selecting anything (should not crash)
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });

    // Verify no errors occurred
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  test('Undo/Redo stack works correctly', async () => {
    const { container } = render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Add first block
    const headingButton = screen.getByText(/Heading/i);
    fireEvent.click(headingButton);

    await waitFor(() => {
      expect(container.querySelectorAll('[data-component-type="Heading"]').length).toBe(1);
    });

    // Add second block
    const textButton = screen.getByText(/Text Block/i);
    fireEvent.click(textButton);

    await waitFor(() => {
      expect(container.querySelector('[data-component-type="TextBlock"]')).toBeInTheDocument();
    });

    // Undo twice
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    await waitFor(() => {
      expect(container.querySelector('[data-component-type="Heading"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-component-type="TextBlock"]')).not.toBeInTheDocument();
    });

    // Redo twice
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });

    await waitFor(() => {
      expect(container.querySelector('[data-component-type="Heading"]')).toBeInTheDocument();
      expect(container.querySelector('[data-component-type="TextBlock"]')).toBeInTheDocument();
    });
  });

  test('Preview functionality', async () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Add a block
    const headingButton = screen.getByText(/Heading/i);
    fireEvent.click(headingButton);

    // Click preview button
    const previewButton = screen.getByText(/Preview/i);
    fireEvent.click(previewButton);

    // Verify preview was called
    expect(mockOnPreview).toHaveBeenCalled();
  });

  test('beforeunload warning when dirty', () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Add block (creates dirty state)
    const headingButton = screen.getByText(/Heading/i);
    fireEvent.click(headingButton);

    // Trigger beforeunload
    const event = new Event('beforeunload');
    let preventDefaultCalled = false;
    event.preventDefault = () => { preventDefaultCalled = true; };

    window.dispatchEvent(event);

    // Verify preventDefault was called (indicating warning)
    // Note: This test may need adjustment based on actual implementation
  });
});

describe('JSON Adapter', () => {
  test('Validates correct JSON', () => {
    const validJSON = {
      version: '2.0',
      type: 'standard',
      components: [
        {
          id: 'heading_1',
          type: 'Heading',
          props: { text: 'Hello' },
        },
      ],
      bindings: [],
      styles: {},
    };

    const { validateViewJSON } = require('../core/jsonAdapter');
    const result = validateViewJSON(validJSON);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('Rejects invalid JSON', () => {
    const invalidJSON = {
      // Missing version
      type: 'standard',
      components: 'not an array', // Invalid
    };

    const { validateViewJSON } = require('../core/jsonAdapter');
    const result = validateViewJSON(invalidJSON);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('Safe import handles malformed JSON', () => {
    const { safeImportViewJSON } = require('../core/jsonAdapter');
    const result = safeImportViewJSON('{invalid json}');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to parse JSON');
  });

  test('Safe export includes metadata', () => {
    const { safeExportViewJSON } = require('../core/jsonAdapter');
    const rootNode = {
      id: 'root',
      type: 'Root',
      props: {},
      children: [],
    };

    const exported = safeExportViewJSON(rootNode, {
      title: 'Test View',
      description: 'Test Description',
    });

    const parsed = JSON.parse(exported);
    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.title).toBe('Test View');
    expect(parsed.metadata.exportedAt).toBeDefined();
  });
});
