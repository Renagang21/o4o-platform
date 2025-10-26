/**
 * Save/Undo/Redo Shortcuts
 */

export interface SaveShortcutsOptions {
  handleSave: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
}

export function createSaveShortcuts(options: SaveShortcutsOptions) {
  const { handleSave, handleUndo, handleRedo } = options;

  return (e: KeyboardEvent): boolean => {
    const isModKey = e.ctrlKey || e.metaKey;
    if (!isModKey) return false;

    // Save: Ctrl/Cmd + S
    if (e.key === 's') {
      e.preventDefault();
      handleSave();
      return true;
    }

    // Undo: Ctrl/Cmd + Z (without Shift)
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return true;
    }

    // Redo: Ctrl/Cmd + Shift + Z
    if (e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      handleRedo();
      return true;
    }

    return false;
  };
}
