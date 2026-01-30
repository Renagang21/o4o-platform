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
  category: 'Layout' | 'Basic' | 'Media' | 'CMS' | 'Marketing' | 'basic' | 'layout' | 'marketing' | 'cms' | 'forum';
  icon: string;
  description?: string;
  defaultProps: Record<string, any>;
  propSchema?: PropSchemaItem[]; // Old format (deprecated)
  inspectorConfig?: InspectorFieldConfig[]; // New format
  allowsChildren?: boolean;
  maxChildren?: number;
}

/**
 * Property Schema Item - Defines how to edit a property (Old format)
 */
export interface PropSchemaItem {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'json';
  defaultValue?: any;
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  helpText?: string;
}

/**
 * Inspector Field Config - New format for property editing
 */
export interface InspectorFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'color' | 'image';
  required?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  helpText?: string;
  rows?: number; // For textarea
  min?: number; // For number
  max?: number; // For number
  defaultValue?: any; // Default value for the field
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
