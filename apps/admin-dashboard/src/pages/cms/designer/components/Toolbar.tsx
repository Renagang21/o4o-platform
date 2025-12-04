/**
 * Visual View Designer - Toolbar
 *
 * Top toolbar with save, preview, undo, redo actions
 */

import { Save, Eye, Undo, Redo, X, Plus, Grid, ZoomIn, ZoomOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesigner } from '../state/DesignerContext';

interface ToolbarProps {
  viewId?: string;
  onSave: () => Promise<void>;
  onPreview: () => void;
  saving?: boolean;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  showGrid?: boolean;
  onGridToggle?: () => void;
}

export default function Toolbar({
  viewId,
  onSave,
  onPreview,
  saving,
  zoom = 1.0,
  onZoomChange,
  showGrid = false,
  onGridToggle
}: ToolbarProps) {
  const navigate = useNavigate();
  const { undo, redo, canUndo, canRedo, state, addNode } = useDesigner();

  const handleBack = () => {
    if (state.isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  const handleAddRow = () => {
    const parentId = state.selectedNodeId || 'root';
    addNode(parentId, 'Row');
  };

  const handleAddColumn = () => {
    // Check if selected node is a Row
    const selectedNode = state.selectedNodeId ? state.rootNode : null;
    if (selectedNode && state.selectedNodeId) {
      addNode(state.selectedNodeId, 'Column');
    } else {
      alert('Please select a Row component first');
    }
  };

  const handleZoomIn = () => {
    if (onZoomChange && zoom < 1.5) {
      onZoomChange(Math.min(zoom + 0.25, 1.5));
    }
  };

  const handleZoomOut = () => {
    if (onZoomChange && zoom > 0.5) {
      onZoomChange(Math.max(zoom - 0.25, 0.5));
    }
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left: Back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <X className="w-5 h-5" />
          <span className="font-medium">Close Designer</span>
        </button>

        {state.isDirty && (
          <span className="text-xs text-orange-600 font-medium">● Unsaved changes</span>
        )}
      </div>

      {/* Center: Title */}
      <div className="text-center">
        <h1 className="text-lg font-semibold text-gray-900">Visual View Designer</h1>
        {viewId && <p className="text-xs text-gray-500">View ID: {viewId}</p>}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Add Row */}
        <button
          onClick={handleAddRow}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Add Row"
        >
          <Plus className="w-4 h-4" />
          <span className="ml-1 text-xs">Row</span>
        </button>

        {/* Add Column */}
        <button
          onClick={handleAddColumn}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Add Column (select a Row first)"
        >
          <Plus className="w-4 h-4" />
          <span className="ml-1 text-xs">Col</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom Level */}
        <span className="px-2 text-xs text-gray-600 font-mono min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 1.5}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Grid Toggle */}
        <button
          onClick={onGridToggle}
          className={`p-2 rounded transition-colors ${
            showGrid
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Toggle Grid"
        >
          <Grid className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-5 h-5" />
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Preview */}
        <button
          onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span className="font-medium">Preview</span>
        </button>

        {/* Save */}
        <button
          onClick={onSave}
          disabled={saving || !state.isDirty}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save (Ctrl+S)"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="font-medium">Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span className="font-medium">Save</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
