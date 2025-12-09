# Step 25 — Phase C-3.1 Part 3: Designer Completion Work Order

**Status**: 🟢 Active
**Phase**: C-3.1 (Visual Designer — Final Polish)
**Priority**: P0 (Critical Path)
**Estimated Duration**: 45-55 minutes
**Assigned**: Claude (Immediate Execution)

---

## Executive Summary

Complete the remaining 15% of the Visual Designer to achieve **Production-Ready Status**. This work order focuses on polish, user experience enhancements, and stability verification without any structural changes.

**Current State**: 85% Complete (Core D&D, Layout Engine, Inspector, Toolbar all stable)
**Target State**: 100% Complete (Full keyboard support, unsaved changes protection, robust error handling, comprehensive tests)

**Strategic Context**: This completion is prerequisite for Phase C-3.2 (Block Library Expansion). Delaying this work increases context-switching costs and introduces integration risks.

---

## Current State Analysis

### ✅ Completed Components (85%)

**Core Architecture**:
- ✅ DesignerContext with full state management
- ✅ Drag & Drop engine with react-beautiful-dnd
- ✅ Layout Engine with grid/flex/free positioning
- ✅ Component Registry with 15+ block types
- ✅ JSON Adapter (basic import/export)

**UI Components**:
- ✅ Canvas with visual feedback
- ✅ Inspector with property editing
- ✅ Toolbar with CRUD operations
- ✅ Palette with component library
- ✅ Path Trail navigation
- ✅ Preview Frame integration

**Features**:
- ✅ Add blocks via D&D
- ✅ Clone/Delete blocks
- ✅ Select/Deselect
- ✅ Property editing
- ✅ Save/Load JSON
- ✅ Preview in iframe
- ✅ Undo/Redo (basic structure)

### 🟡 Missing Polish (15%)

**User Experience**:
- ❌ Keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, Del, Esc)
- ❌ Dirty state modal (unsaved changes warning)
- ❌ Loading states & error messages

**Robustness**:
- ❌ JSON validation & error recovery
- ❌ Edge case handling in adapter
- ❌ Integration tests for full workflow

**Developer Experience**:
- ❌ Console warnings cleanup
- ❌ TypeScript strict mode compliance
- ❌ Code documentation

---

## Objectives

### Primary Goals

1. **Keyboard Shortcuts**: Enable power-user workflows
2. **Dirty State Protection**: Prevent accidental data loss
3. **JSON Adapter Polish**: Ensure robust import/export
4. **Integration Tests**: Verify end-to-end workflows

### Success Criteria

- [ ] All keyboard shortcuts work reliably
- [ ] Dirty state modal prevents data loss
- [ ] JSON adapter handles malformed input gracefully
- [ ] Integration tests cover 80%+ of user journeys
- [ ] Zero console errors/warnings
- [ ] DoD checklist 100% complete

---

## Technical Specification

### 1. Keyboard Shortcuts

**Priority**: P0 (Essential UX)
**Duration**: 10-15 minutes

#### Requirements

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Ctrl+S` / `Cmd+S` | Save view | Global |
| `Ctrl+Z` / `Cmd+Z` | Undo | Global |
| `Ctrl+Y` / `Cmd+Y` | Redo | Global |
| `Delete` / `Backspace` | Delete selected block | When block selected |
| `Esc` | Deselect block | When block selected |
| `Ctrl+D` / `Cmd+D` | Duplicate selected block | When block selected |

#### Implementation Plan

**File**: `apps/admin-dashboard/src/pages/cms/designer/DesignerShell.tsx`

```typescript
// Add keyboard event listener
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // Prevent default for shortcuts
    if (cmdOrCtrl && ['s', 'z', 'y', 'd'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    // Save
    if (cmdOrCtrl && e.key.toLowerCase() === 's') {
      handleSave();
      return;
    }

    // Undo
    if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
      undo();
      return;
    }

    // Redo
    if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
      redo();
      return;
    }

    // Duplicate
    if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
      if (selectedId) {
        cloneComponent(selectedId);
      }
      return;
    }

    // Delete
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      // Only delete if not in input field
      if (document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        deleteComponent(selectedId);
      }
      return;
    }

    // Deselect
    if (e.key === 'Escape' && selectedId) {
      setSelectedId(null);
      return;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedId, handleSave, undo, redo, cloneComponent, deleteComponent]);
```

#### Testing Checklist

- [ ] Ctrl+S saves without page reload
- [ ] Ctrl+Z/Y undo/redo work correctly
- [ ] Delete only works when block selected
- [ ] Delete doesn't trigger in input fields
- [ ] Esc deselects current block
- [ ] Shortcuts show in UI tooltips

---

### 2. Dirty State Modal

**Priority**: P0 (Data Protection)
**Duration**: 10 minutes

#### Requirements

- Track unsaved changes in DesignerContext
- Show modal when:
  - User clicks "Back" button
  - User navigates away (beforeunload)
  - User switches to another view (router navigation guard)
- Modal options:
  - "Save Changes" → Save then navigate
  - "Discard Changes" → Navigate without saving
  - "Cancel" → Stay on page

#### Implementation Plan

**File**: `apps/admin-dashboard/src/pages/cms/designer/state/DesignerContext.tsx`

```typescript
// Add dirty state tracking
const [isDirty, setIsDirty] = useState(false);
const [lastSavedState, setLastSavedState] = useState<string>('');

// Mark dirty when components change
useEffect(() => {
  const currentState = JSON.stringify(components);
  if (lastSavedState && currentState !== lastSavedState) {
    setIsDirty(true);
  }
}, [components]);

// Clear dirty on save
const handleSave = async () => {
  // ... existing save logic ...
  setLastSavedState(JSON.stringify(components));
  setIsDirty(false);
};

// Browser navigation guard
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isDirty]);
```

**File**: `apps/admin-dashboard/src/pages/cms/designer/DesignerShell.tsx`

```typescript
// Add modal state
const [showUnsavedModal, setShowUnsavedModal] = useState(false);
const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

// Handle back button
const handleBack = () => {
  if (isDirty) {
    setShowUnsavedModal(true);
    setPendingNavigation('/admin/cms/views');
  } else {
    navigate('/admin/cms/views');
  }
};

// Modal component
{showUnsavedModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md">
      <h3 className="text-lg font-semibold mb-2">Unsaved Changes</h3>
      <p className="text-gray-600 mb-4">
        You have unsaved changes. Do you want to save before leaving?
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setShowUnsavedModal(false)}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setShowUnsavedModal(false);
            navigate(pendingNavigation!);
          }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          Discard Changes
        </button>
        <button
          onClick={async () => {
            await handleSave();
            setShowUnsavedModal(false);
            navigate(pendingNavigation!);
          }}
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
)}
```

#### Testing Checklist

- [ ] Modal shows when clicking Back with unsaved changes
- [ ] Browser warns on refresh/close with unsaved changes
- [ ] "Save Changes" saves then navigates
- [ ] "Discard Changes" navigates without saving
- [ ] "Cancel" keeps user on page
- [ ] Dirty indicator shows in UI

---

### 3. JSON Adapter Polish

**Priority**: P1 (Robustness)
**Duration**: 10 minutes

#### Requirements

- Validate JSON structure before import
- Handle malformed/missing data gracefully
- Provide clear error messages
- Ensure backward compatibility
- Add migration for old formats

#### Implementation Plan

**File**: `apps/admin-dashboard/src/pages/cms/designer/core/jsonAdapter.ts`

```typescript
// Add validation schema
interface ViewJSON {
  version: string;
  components: DesignerComponent[];
  metadata?: {
    title?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

// Validate JSON structure
export function validateViewJSON(json: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!json) {
    errors.push('JSON is null or undefined');
    return { valid: false, errors };
  }

  if (!json.version) {
    errors.push('Missing version field');
  }

  if (!Array.isArray(json.components)) {
    errors.push('components must be an array');
  } else {
    json.components.forEach((comp: any, idx: number) => {
      if (!comp.id) errors.push(`Component ${idx}: missing id`);
      if (!comp.type) errors.push(`Component ${idx}: missing type`);
      if (!comp.props) errors.push(`Component ${idx}: missing props`);
    });
  }

  return { valid: errors.length === 0, errors };
}

// Import with validation
export function importFromJSON(jsonString: string): {
  components: DesignerComponent[];
  error?: string;
} {
  try {
    const json = JSON.parse(jsonString);

    // Validate structure
    const validation = validateViewJSON(json);
    if (!validation.valid) {
      return {
        components: [],
        error: `Invalid JSON format:\n${validation.errors.join('\n')}`
      };
    }

    // Handle version migration
    if (json.version === '1.0') {
      return { components: json.components };
    } else if (json.version === '0.9') {
      // Migrate from old format
      return { components: migrateV09ToV10(json.components) };
    } else {
      return {
        components: [],
        error: `Unsupported version: ${json.version}`
      };
    }
  } catch (err) {
    return {
      components: [],
      error: `Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`
    };
  }
}

// Export with metadata
export function exportToJSON(components: DesignerComponent[], metadata?: any): string {
  const output: ViewJSON = {
    version: '1.0',
    components,
    metadata: {
      ...metadata,
      exportedAt: new Date().toISOString(),
    }
  };

  return JSON.stringify(output, null, 2);
}
```

#### Error Handling in UI

```typescript
// In DesignerShell.tsx
const handleImport = async (jsonString: string) => {
  const result = importFromJSON(jsonString);

  if (result.error) {
    toast.error(result.error);
    console.error('Import failed:', result.error);
    return;
  }

  importComponents(result.components);
  toast.success('View imported successfully');
};
```

#### Testing Checklist

- [ ] Valid JSON imports correctly
- [ ] Malformed JSON shows error message
- [ ] Missing fields handled gracefully
- [ ] Old version format migrates
- [ ] Export includes metadata
- [ ] Round-trip (export → import) preserves data

---

### 4. Integration Tests

**Priority**: P1 (Quality Assurance)
**Duration**: 20 minutes

#### Test Scenarios

**File**: `apps/admin-dashboard/src/pages/cms/designer/__tests__/designer-workflow.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DesignerProvider } from '../state/DesignerContext';
import DesignerShell from '../DesignerShell';

describe('Designer Full Workflow', () => {
  test('Complete workflow: add → edit → clone → delete → save', async () => {
    const { container } = render(
      <DesignerProvider>
        <DesignerShell />
      </DesignerProvider>
    );

    // 1. Add a heading block
    const headingButton = screen.getByText('Heading');
    fireEvent.click(headingButton);

    // 2. Verify block appears in canvas
    await waitFor(() => {
      expect(screen.getByText(/Heading/)).toBeInTheDocument();
    });

    // 3. Edit properties
    const inspector = screen.getByRole('complementary');
    const textInput = inspector.querySelector('input[name="text"]');
    fireEvent.change(textInput!, { target: { value: 'Test Heading' } });

    // 4. Clone the block
    const cloneButton = screen.getByTitle('Clone');
    fireEvent.click(cloneButton);

    // 5. Verify two blocks exist
    await waitFor(() => {
      expect(screen.getAllByText(/Heading/).length).toBe(2);
    });

    // 6. Delete one block
    const deleteButton = screen.getAllByTitle('Delete')[0];
    fireEvent.click(deleteButton);

    // 7. Save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Saved/)).toBeInTheDocument();
    });
  });

  test('Keyboard shortcuts work correctly', () => {
    render(
      <DesignerProvider>
        <DesignerShell />
      </DesignerProvider>
    );

    // Add a block
    fireEvent.click(screen.getByText('Heading'));

    // Test Delete key
    const canvas = screen.getByRole('main');
    const block = canvas.querySelector('[data-component-id]');
    fireEvent.click(block!);
    fireEvent.keyDown(window, { key: 'Delete' });

    // Verify block removed
    expect(canvas.querySelector('[data-component-id]')).not.toBeInTheDocument();
  });

  test('Dirty state prevents navigation', async () => {
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    render(
      <DesignerProvider>
        <DesignerShell />
      </DesignerProvider>
    );

    // Add block (creates dirty state)
    fireEvent.click(screen.getByText('Heading'));

    // Try to navigate
    fireEvent.click(screen.getByText('Back'));

    // Verify modal appears
    await waitFor(() => {
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    // Discard changes
    fireEvent.click(screen.getByText('Discard Changes'));

    // Verify navigation happened
    expect(mockNavigate).toHaveBeenCalledWith('/admin/cms/views');
  });

  test('JSON import/export round-trip', () => {
    render(
      <DesignerProvider>
        <DesignerShell />
      </DesignerProvider>
    );

    // Add blocks
    fireEvent.click(screen.getByText('Heading'));
    fireEvent.click(screen.getByText('Text Block'));

    // Export
    const exportButton = screen.getByText('Export JSON');
    fireEvent.click(exportButton);

    const exportedJSON = /* get from clipboard/modal */;

    // Clear canvas
    fireEvent.click(screen.getByText('Clear All'));

    // Import
    const importButton = screen.getByText('Import JSON');
    fireEvent.click(importButton);
    // Paste JSON and import

    // Verify blocks restored
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Text Block')).toBeInTheDocument();
  });

  test('Error handling for invalid JSON', () => {
    render(
      <DesignerProvider>
        <DesignerShell />
      </DesignerProvider>
    );

    const importButton = screen.getByText('Import JSON');
    fireEvent.click(importButton);

    // Try to import malformed JSON
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '{invalid json}' } });
    fireEvent.click(screen.getByText('Import'));

    // Verify error message
    expect(screen.getByText(/Failed to parse JSON/)).toBeInTheDocument();
  });
});
```

#### Testing Checklist

- [ ] All tests pass
- [ ] Coverage > 80% for designer files
- [ ] Edge cases handled
- [ ] Performance acceptable (no lag)
- [ ] No console errors/warnings

---

## Implementation Steps

### Step 1: Keyboard Shortcuts (10-15 min)

1. Add `useEffect` hook in `DesignerShell.tsx`
2. Implement keyboard event handler
3. Test each shortcut
4. Add tooltips to UI showing shortcuts
5. Verify no conflicts with browser shortcuts

### Step 2: Dirty State Modal (10 min)

1. Add `isDirty` state to `DesignerContext`
2. Track changes in `useEffect`
3. Add `beforeunload` listener
4. Implement modal component
5. Wire up "Back" button logic
6. Test all modal actions

### Step 3: JSON Adapter Polish (10 min)

1. Add validation function
2. Implement error handling
3. Add version migration
4. Update export with metadata
5. Test with various JSON inputs
6. Add error messages to UI

### Step 4: Integration Tests (20 min)

1. Set up test file structure
2. Write workflow test
3. Write keyboard shortcut test
4. Write dirty state test
5. Write JSON round-trip test
6. Run tests and fix issues

### Step 5: Verification (5 min)

1. Run full test suite
2. Manual smoke test
3. Check console for warnings
4. Verify DoD checklist
5. Document completion

---

## Definition of Done (DoD)

### Functionality

- [ ] All keyboard shortcuts work reliably
- [ ] Dirty state modal prevents data loss
- [ ] JSON adapter handles all edge cases
- [ ] Integration tests pass with >80% coverage
- [ ] Undo/Redo work correctly
- [ ] Save/Load work correctly
- [ ] Preview works correctly

### Code Quality

- [ ] Zero TypeScript errors
- [ ] Zero console warnings
- [ ] No dead code
- [ ] Consistent code style
- [ ] Comments on complex logic

### User Experience

- [ ] Visual feedback for all actions
- [ ] Loading states for async operations
- [ ] Error messages are clear
- [ ] Keyboard shortcuts in tooltips
- [ ] Smooth animations

### Documentation

- [ ] README updated with keyboard shortcuts
- [ ] API documentation for JSON format
- [ ] Test documentation
- [ ] Completion report written

### Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] Edge cases verified
- [ ] Performance acceptable

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Keyboard conflicts with browser | Low | Medium | Use Cmd on Mac, Ctrl on Windows; preventDefault |
| Dirty state false positives | Low | Medium | Debounce change detection; compare serialized state |
| JSON migration breaks old data | Low | High | Validate before migration; keep backup; version check |
| Tests flaky in CI | Medium | Low | Use waitFor; mock timers; isolate tests |
| Performance degradation | Low | Medium | Profile keyboard handler; optimize change detection |

**Overall Risk**: 🟢 Low

---

## Timeline

| Task | Duration | Cumulative |
|------|----------|------------|
| Keyboard Shortcuts | 10-15 min | 15 min |
| Dirty State Modal | 10 min | 25 min |
| JSON Adapter Polish | 10 min | 35 min |
| Integration Tests | 20 min | 55 min |
| Verification | 5 min | 60 min |

**Total**: 45-60 minutes

---

## Next Steps

After completing this work order:

1. **Immediate**: Mark Phase C-3.1 as 100% Complete
2. **Next Phase**: Phase C-3.2 — Block Library Expansion
3. **Documentation**: Write completion report
4. **Demo**: Show Designer to Rena for feedback

---

## Success Metrics

- [ ] Designer is 100% production-ready
- [ ] All DoD items checked
- [ ] Zero known bugs
- [ ] User can complete full workflow without issues
- [ ] Foundation ready for Block Library expansion

---

**Work Order Status**: 🟢 Ready for Immediate Execution
**Prepared By**: Claude
**Date**: 2025-12-04
**Phase**: C-3.1 Part 3 (Final Polish)

---

*Let's complete this and achieve 100% Designer completion.*
