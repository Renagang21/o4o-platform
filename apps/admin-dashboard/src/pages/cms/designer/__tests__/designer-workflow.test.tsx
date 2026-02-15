/**
 * Visual View Designer - Integration Tests
 *
 * Tests for DesignerShell rendering, toolbar actions, palette, and JSON adapter
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DesignerShell from '../DesignerShell';
import { validateViewJSON, safeImportViewJSON, safeExportViewJSON } from '../core/jsonAdapter';

// Mock functions
const mockOnSave = vi.fn(() => Promise.resolve());
const mockOnPreview = vi.fn();
const mockOnBack = vi.fn();

// Test wrapper with router
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('Designer Shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Renders with toolbar and palette', () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Close Designer')).toBeInTheDocument();
    expect(screen.getByText('Visual View Designer')).toBeInTheDocument();
    expect(screen.getByText('Components')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  test('Close Designer calls onBack when not dirty', () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Close Designer'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  test('Preview button triggers callback', () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Preview'));
    expect(mockOnPreview).toHaveBeenCalled();
  });

  test('Ctrl+S triggers save', async () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  test('Keyboard shortcuts do not crash without selection', () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Fire various shortcuts without any block selected — none should crash
    fireEvent.keyDown(window, { key: 'Delete' });
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Escape' });

    // No error = success
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  test('Palette contains component categories and items', () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Category tab exists
    expect(screen.getByText('Basic')).toBeInTheDocument();

    // Component descriptions are visible
    expect(screen.getByText('H1-H6 heading elements')).toBeInTheDocument();
    expect(screen.getByText('Simple paragraph text')).toBeInTheDocument();
  });

  test('Adding palette item creates dirty state', async () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Click the Heading palette button (identified by unique description text)
    const headingButton = screen.getByRole('button', { name: /H1-H6 heading/i });
    fireEvent.click(headingButton);

    // Should show unsaved changes indicator in toolbar
    await waitFor(() => {
      expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();
    });
  });

  test('Dirty state shows unsaved modal on close', async () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Make dirty by adding a block
    const headingButton = screen.getByRole('button', { name: /H1-H6 heading/i });
    fireEvent.click(headingButton);

    await waitFor(() => {
      expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();
    });

    // Click Close Designer — should show modal instead of navigating
    fireEvent.click(screen.getByText('Close Designer'));

    await waitFor(() => {
      expect(screen.getByText(/Do you want to save before leaving/i)).toBeInTheDocument();
    });

    // Click Discard Changes
    fireEvent.click(screen.getByText('Discard Changes'));

    await waitFor(() => {
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  test('beforeunload event is handled without crash', () => {
    render(
      <TestWrapper>
        <DesignerShell
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onBack={mockOnBack}
        />
      </TestWrapper>
    );

    // Dispatch beforeunload event (when not dirty, should not prevent)
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    // No crash — component still rendered
    expect(screen.getByText('Close Designer')).toBeInTheDocument();
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

    const result = validateViewJSON(invalidJSON);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('Safe import handles malformed JSON', () => {
    const result = safeImportViewJSON('{invalid json}');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to parse JSON');
  });

  test('Safe export includes metadata', () => {
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
