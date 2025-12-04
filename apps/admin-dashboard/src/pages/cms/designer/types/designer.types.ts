/**
 * Visual View Designer - Type Definitions
 *
 * Core types for the drag & drop view builder
 */

/**
 * Designer Node - Internal representation of a component in the designer
 */
export interface DesignerNode {
  id: string;
  type: string;
  props: Record<string, any>;
  children: DesignerNode[];
  parentId?: string;
}

/**
 * Component Definition - Available components in the palette
 */
export interface ComponentDefinition {
  type: string;
  label: string;
  category: 'Layout' | 'Basic' | 'Media' | 'CMS' | 'Marketing';
  icon: string;
  defaultProps: Record<string, any>;
  propSchema: PropSchemaItem[];
}

/**
 * Property Schema Item - Defines how to edit a property
 */
export interface PropSchemaItem {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'json';
  defaultValue?: any;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  helpText?: string;
}

/**
 * Designer State - Complete state of the designer
 */
export interface DesignerState {
  rootNode: DesignerNode;
  selectedNodeId: string | null;
  undoStack: DesignerNode[];
  redoStack: DesignerNode[];
  isDirty: boolean;
}

/**
 * Drop Target - Information about where a component is being dropped
 */
export interface DropTarget {
  targetNodeId: string;
  position: 'before' | 'after' | 'inside';
}

/**
 * Drag Item - Information about what is being dragged
 */
export interface DragItem {
  type: string;
  nodeId?: string; // If dragging existing node (for reordering)
  componentType?: string; // If dragging from palette
}
