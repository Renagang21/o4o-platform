/**
 * Visual View Designer - Main Shell
 *
 * Main layout combining Palette, Canvas, Inspector, and Toolbar
 */

import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DesignerProvider, useDesigner } from './state/DesignerContext';
import Palette from './components/Palette';
import Canvas from './components/Canvas';
import Inspector from './components/Inspector';
import Toolbar from './components/Toolbar';

interface DesignerShellProps {
  initialView?: any;
  viewId?: string;
  onSave: (viewJSON: any) => Promise<void>;
  onPreview: () => void;
  onBack?: () => void;
}

export default function DesignerShell({
  initialView,
  viewId,
  onSave,
  onPreview,
  onBack,
}: DesignerShellProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <DesignerProvider initialView={initialView}>
        <DesignerShellContent
          viewId={viewId}
          onSave={onSave}
          onPreview={onPreview}
          onBack={onBack}
        />
      </DesignerProvider>
    </DndProvider>
  );
}

function DesignerShellContent({
  viewId,
  onSave,
  onPreview,
  onBack,
}: {
  viewId?: string;
  onSave: (viewJSON: any) => Promise<void>;
  onPreview: () => void;
  onBack?: () => void;
}) {
  const { state, undo, redo, deleteNode, cloneNode, selectNode, clearDirty } = useDesigner();
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [showGrid, setShowGrid] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Pass the rootNode to parent - it will be converted to CMS View JSON in ViewDesigner
      await onSave(state.rootNode);
      clearDirty(); // Clear dirty flag after successful save
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleBackClick = () => {
    if (state.isDirty) {
      setShowUnsavedModal(true);
    } else {
      if (onBack) onBack();
    }
  };

  const handleDiscardAndLeave = () => {
    setShowUnsavedModal(false);
    if (onBack) onBack();
  };

  const handleSaveAndLeave = async () => {
    await handleSave();
    setShowUnsavedModal(false);
    if (onBack) onBack();
  };

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect Mac vs Windows/Linux
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ignore shortcuts when typing in input fields
      const isInputField =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true';

      // Save: Ctrl/Cmd + S
      if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Undo: Ctrl/Cmd + Z
      if (cmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl/Cmd + Y (Windows) or Ctrl/Cmd + Shift + Z (Mac)
      if (cmdOrCtrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate: Ctrl/Cmd + D
      if (cmdOrCtrl && e.key.toLowerCase() === 'd' && state.selectedNodeId) {
        e.preventDefault();
        cloneNode(state.selectedNodeId);
        return;
      }

      // Don't process Delete/Esc when typing
      if (isInputField) return;

      // Delete: Delete or Backspace (when block selected)
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedNodeId) {
        e.preventDefault();
        deleteNode(state.selectedNodeId);
        return;
      }

      // Deselect: Escape
      if (e.key === 'Escape' && state.selectedNodeId) {
        e.preventDefault();
        selectNode(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedNodeId, handleSave, undo, redo, deleteNode, cloneNode, selectNode]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <Toolbar
        viewId={viewId}
        onSave={handleSave}
        onPreview={onPreview}
        onBackClick={handleBackClick}
        saving={saving}
        zoom={zoom}
        onZoomChange={setZoom}
        showGrid={showGrid}
        onGridToggle={() => setShowGrid(!showGrid)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Palette */}
        <Palette />

        {/* Center: Canvas */}
        <Canvas zoom={zoom} showGrid={showGrid} />

        {/* Right: Inspector */}
        <Inspector />
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Unsaved Changes</h3>
            <p className="text-gray-600 mb-6">
              You have unsaved changes. Do you want to save before leaving?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardAndLeave}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSaveAndLeave}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
