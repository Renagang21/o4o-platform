/**
 * Drag and Drop Types for Visual Designer
 */

// Drag item types
export const DND_ITEM_TYPES = {
  PALETTE_COMPONENT: 'PALETTE_COMPONENT',
  CANVAS_NODE: 'CANVAS_NODE',
} as const;

// Palette drag item
export interface PaletteDragItem {
  type: typeof DND_ITEM_TYPES.PALETTE_COMPONENT;
  componentType: string;
  label: string;
  icon: string;
}

// Canvas node drag item
export interface CanvasNodeDragItem {
  type: typeof DND_ITEM_TYPES.CANVAS_NODE;
  nodeId: string;
  nodeType: string;
}

// Drop result
export interface DropResult {
  targetNodeId: string;
  position?: 'before' | 'after' | 'inside';
}
