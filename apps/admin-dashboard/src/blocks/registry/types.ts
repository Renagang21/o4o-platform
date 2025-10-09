/**
 * Block Registry Type Definitions
 * Central type system for the unified block architecture
 */

import { ComponentType, ReactElement } from 'react';

/**
 * Block category types
 */
export type BlockCategory =
  | 'text'
  | 'media'
  | 'layout'
  | 'widgets'
  | 'embed'
  | 'design'
  | 'dynamic'
  | 'common';

/**
 * Attribute type definitions
 */
export type AttributeType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null';

/**
 * Attribute schema definition
 */
export interface AttributeSchema {
  type: AttributeType;
  default?: unknown;
  source?: 'attribute' | 'text' | 'html' | 'query' | 'meta';
  selector?: string;
  attribute?: string;
  query?: Record<string, AttributeSchema>;
}

/**
 * Block supports configuration
 */
export interface BlockSupports {
  align?: boolean | string[];
  anchor?: boolean;
  className?: boolean;
  html?: boolean;
  customClassName?: boolean;
  inserter?: boolean;
  multiple?: boolean;
  reusable?: boolean;
  lock?: boolean;
  color?: {
    background?: boolean;
    text?: boolean;
    link?: boolean;
    gradients?: boolean;
  };
  spacing?: {
    margin?: boolean | string[];
    padding?: boolean | string[];
  };
  typography?: {
    fontSize?: boolean;
    lineHeight?: boolean;
  };
}

/**
 * Common block props that all blocks receive
 */
export interface BlockProps {
  id?: string;
  content?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  setAttributes?: (attributes: unknown) => void;
  onChange?: (content: unknown, attributes?: unknown) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

/**
 * Block component type
 */
export type BlockComponent = ComponentType<BlockProps>;

/**
 * Block definition structure
 */
export interface BlockDefinition {
  /**
   * Unique block identifier (e.g., 'o4o/slide', 'core/paragraph')
   */
  name: string;

  /**
   * Display title for the block
   */
  title: string;

  /**
   * Block category
   */
  category: BlockCategory;

  /**
   * Block icon (React element or lucide-react icon name)
   */
  icon: ReactElement | string;

  /**
   * Block description
   */
  description?: string;

  /**
   * Keywords for search
   */
  keywords?: string[];

  /**
   * React component to render the block
   */
  component: BlockComponent;

  /**
   * Block content schema
   */
  content?: Record<string, AttributeSchema>;

  /**
   * Block attributes schema
   */
  attributes?: Record<string, AttributeSchema>;

  /**
   * Block supports configuration
   */
  supports?: BlockSupports;

  /**
   * Parent blocks (if block can only be used inside specific parents)
   */
  parent?: string[];

  /**
   * Ancestor blocks (block must have one of these as ancestor)
   */
  ancestor?: string[];

  /**
   * Example configuration for block preview
   */
  example?: {
    attributes?: Record<string, unknown>;
    innerBlocks?: unknown[];
  };

  /**
   * Transforms configuration
   */
  transforms?: {
    from?: {
      type: string;
      blocks?: string[];
      transform?: (attributes: unknown) => unknown;
    }[];
    to?: {
      type: string;
      blocks?: string[];
      transform?: (attributes: unknown) => unknown;
    }[];
  };
}

/**
 * Block registry entry (internal use)
 */
export interface BlockRegistryEntry extends BlockDefinition {
  registeredAt: Date;
}

/**
 * Block search result
 */
export interface BlockSearchResult {
  block: BlockDefinition;
  score: number;
}
