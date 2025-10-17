/**
 * DynamicRenderer - Automatic block rendering based on registry
 * Replaces manual switch-case with registry-based dynamic rendering
 */

import React from 'react';
import { blockRegistry } from './BlockRegistry';
import { BlockProps } from './types';
import { Block } from '@/types/post.types';
import { AlertCircle } from 'lucide-react';

interface DynamicRendererProps {
  block: Block;
  // Block interaction callbacks
  onChange?: (content: unknown, attributes?: unknown) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  onSelect?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
  // InnerBlocks support
  onInnerBlocksChange?: (innerBlocks: Block[]) => void;
  // Block state
  isSelected?: boolean;
  isDragging?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

/**
 * Fallback component for unregistered blocks
 */
const UnregisteredBlockFallback: React.FC<{ blockType: string }> = ({ blockType }) => {
  return (
    <div className="p-4 border-2 border-dashed border-orange-300 bg-orange-50 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
        <div>
          <h4 className="font-semibold text-orange-900 mb-1">Unregistered Block</h4>
          <p className="text-sm text-orange-700">
            Block type <code className="px-1.5 py-0.5 bg-orange-100 rounded">{blockType}</code> is not registered in the block registry.
          </p>
          <p className="text-xs text-orange-600 mt-2">
            Register this block in <code>apps/admin-dashboard/src/blocks/index.ts</code>
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Error boundary for block rendering errors
 */
class BlockErrorBoundary extends React.Component<
  { children: React.ReactNode; blockType: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; blockType: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error rendering block ${this.props.blockType}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border-2 border-red-300 bg-red-50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">Block Rendering Error</h4>
              <p className="text-sm text-red-700">
                Failed to render block type <code className="px-1.5 py-0.5 bg-red-100 rounded">{this.props.blockType}</code>
              </p>
              {this.state.error && (
                <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-24">
                  {this.state.error.message}
                </pre>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Normalize block type name
 * Handles legacy block types without namespace prefix
 */
function normalizeBlockType(type: string): string {
  // If already has a namespace, return as-is
  if (type.includes('/')) {
    return type;
  }

  // Map of legacy block types to namespaced types
  const legacyBlockMap: Record<string, string> = {
    // Core blocks
    'paragraph': 'o4o/paragraph',
    'heading': 'o4o/heading',
    'image': 'o4o/image',
    'list': 'o4o/list',
    'quote': 'o4o/quote',
    'code': 'o4o/code',
    'video': 'o4o/video',
    'audio': 'o4o/audio',
    'file': 'o4o/file',
    'gallery': 'o4o/gallery',
    'cover': 'o4o/cover',
    'button': 'o4o/button',
    'buttons': 'core/buttons',
    'columns': 'o4o/columns',
    'column': 'o4o/column',
    'group': 'o4o/group',
    'separator': 'o4o/separator',
    'spacer': 'o4o/spacer',
    'table': 'o4o/table',
    'shortcode': 'o4o/shortcode',
    'social-links': 'core/social-links',

    // O4O custom blocks
    'slide': 'o4o/slide',
    'youtube': 'o4o/youtube',
  };

  // Return mapped type or add 'core/' prefix as default
  return legacyBlockMap[type] || `core/${type}`;
}

/**
 * DynamicRenderer Component
 * Automatically renders blocks based on registry lookup
 */
export const DynamicRenderer: React.FC<DynamicRendererProps> = ({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType,
  onInnerBlocksChange,
  isSelected,
  isDragging,
  canMoveUp,
  canMoveDown,
}) => {
  // Normalize block type (handle legacy types without namespace)
  const normalizedType = normalizeBlockType(block.type);

  // Get block definition from registry
  const blockDefinition = blockRegistry.get(normalizedType);

  // Handle unregistered blocks
  if (!blockDefinition) {
    console.warn(`Block type "${block.type}" (normalized: "${normalizedType}") not found in registry`);
    return <UnregisteredBlockFallback blockType={`${block.type} → ${normalizedType}`} />;
  }

  // Get the component from the definition
  const BlockComponent = blockDefinition.component;

  // Prepare props for the block component
  const blockProps: BlockProps = {
    id: block.id,
    content: block.content,
    attributes: block.attributes || {},
    setAttributes: (newAttributes: unknown) => {
      if (onChange) {
        onChange(block.content, newAttributes);
      }
    },
    onChange,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onAddBlock,
    isSelected,
    onSelect,
    isDragging,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    onCopy,
    onPaste,
    onChangeType,
    canMoveUp,
    canMoveDown,
    // InnerBlocks support
    innerBlocks: block.innerBlocks || [],
    onInnerBlocksChange: onInnerBlocksChange ? (newInnerBlocks: unknown[]) => {
      onInnerBlocksChange(newInnerBlocks as Block[]);
    } : undefined,
  };

  // Render the block with error boundary
  return (
    <BlockErrorBoundary blockType={normalizedType}>
      <BlockComponent {...blockProps} />
    </BlockErrorBoundary>
  );
};

export default DynamicRenderer;
