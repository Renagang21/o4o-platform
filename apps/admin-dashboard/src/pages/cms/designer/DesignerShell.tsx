/**
 * Visual View Designer - Main Shell
 *
 * Main layout combining Palette, Canvas, Inspector, and Toolbar
 */

import { useState } from 'react';
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
}

export default function DesignerShell({
  initialView,
  viewId,
  onSave,
  onPreview,
}: DesignerShellProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <DesignerProvider initialView={initialView}>
        <DesignerShellContent
          viewId={viewId}
          onSave={onSave}
          onPreview={onPreview}
        />
      </DesignerProvider>
    </DndProvider>
  );
}

function DesignerShellContent({
  viewId,
  onSave,
  onPreview,
}: {
  viewId?: string;
  onSave: (viewJSON: any) => Promise<void>;
  onPreview: () => void;
}) {
  const { state } = useDesigner();
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [showGrid, setShowGrid] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Pass the rootNode to parent - it will be converted to CMS View JSON in ViewDesigner
      await onSave(state.rootNode);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <Toolbar
        viewId={viewId}
        onSave={handleSave}
        onPreview={onPreview}
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
    </div>
  );
}
