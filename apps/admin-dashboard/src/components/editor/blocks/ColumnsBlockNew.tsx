/**
 * ColumnsBlock Component (New InnerBlocks-based)
 * Container for multiple Column blocks with InnerBlocks support
 */

import React, { useCallback } from 'react';
import { Block } from '@/types/post.types';
import { BlockProps } from '@/blocks/registry/types';
import { Plus, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from 'lucide-react';
import ColumnBlock from './ColumnBlock';

interface ColumnsBlockProps extends BlockProps {
  attributes?: {
    columnCount?: number;
    verticalAlignment?: 'top' | 'center' | 'bottom';
    isStackedOnMobile?: boolean;
    gap?: number;
    backgroundColor?: string;
    padding?: number;
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

const ColumnsBlockNew: React.FC<ColumnsBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
  onChange,
}) => {
  const {
    columnCount = 2,
    verticalAlignment = 'top',
    isStackedOnMobile = true,
    gap = 20,
    backgroundColor = '',
    padding = 0,
  } = attributes;

  // Initialize columns if empty (only for manually created blocks, not AI-generated)
  const hasInitializedRef = React.useRef(false);

  React.useEffect(() => {
    // Skip initialization if:
    // 1. Already initialized
    // 2. innerBlocks already exist (AI-generated or loaded from saved content)
    // 3. No onInnerBlocksChange callback
    if (hasInitializedRef.current || innerBlocks.length > 0 || !onInnerBlocksChange) {
      return;
    }

    // Only initialize empty columns for new, manually created columns blocks
    hasInitializedRef.current = true;
    const initialColumns: Block[] = Array.from({ length: columnCount }, (_, i) => ({
      id: `column-${Date.now()}-${i}`,
      clientId: `client-column-${Date.now()}-${i}`,
      type: 'o4o/column',
      content: {},
      attributes: {
        width: 100 / columnCount,
      },
      innerBlocks: [],
    }));
    onInnerBlocksChange(initialColumns);
  }, [innerBlocks.length, columnCount, onInnerBlocksChange]);

  // Handle adding a new column
  const handleAddColumn = useCallback(() => {
    const newColumnCount = innerBlocks.length + 1;
    const newWidth = 100 / newColumnCount;

    // Update existing columns width
    const updatedColumns = innerBlocks.map(col => ({
      ...col,
      attributes: {
        ...col.attributes,
        width: newWidth,
      },
    }));

    // Add new column
    const newColumn: Block = {
      id: `column-${Date.now()}`,
      clientId: `client-column-${Date.now()}`,
      type: 'o4o/column',
      content: {},
      attributes: {
        width: newWidth,
      },
      innerBlocks: [],
    };

    if (onInnerBlocksChange) {
      onInnerBlocksChange([...updatedColumns, newColumn]);
    }

    // Update columnCount attribute
    if (onChange) {
      onChange(null, { ...attributes, columnCount: newColumnCount });
    }
  }, [innerBlocks, attributes, onChange, onInnerBlocksChange]);

  // Handle removing a column
  const handleRemoveColumn = useCallback((columnId: string) => {
    if (innerBlocks.length <= 1) return;

    const updatedColumns = innerBlocks.filter(col => col.id !== columnId);
    const newWidth = 100 / updatedColumns.length;

    // Recalculate widths
    const rebalancedColumns = updatedColumns.map(col => ({
      ...col,
      attributes: {
        ...col.attributes,
        width: newWidth,
      },
    }));

    if (onInnerBlocksChange) {
      onInnerBlocksChange(rebalancedColumns);
    }

    if (onChange) {
      onChange(null, { ...attributes, columnCount: rebalancedColumns.length });
    }
  }, [innerBlocks, attributes, onChange, onInnerBlocksChange]);

  // Handle vertical alignment change
  const handleAlignmentChange = useCallback((alignment: 'top' | 'center' | 'bottom') => {
    if (onChange) {
      onChange(null, { ...attributes, verticalAlignment: alignment });
    }
  }, [attributes, onChange]);

  // Get alignment styles
  const getAlignmentClass = () => {
    switch (verticalAlignment) {
      case 'center': return 'items-center';
      case 'bottom': return 'items-end';
      default: return 'items-start';
    }
  };

  return (
    <div
      className={`wp-block-columns ${getAlignmentClass()}`}
      style={{
        backgroundColor: backgroundColor || undefined,
        padding: padding ? `${padding}px` : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {/* Toolbar when selected */}
      {isSelected && (
        <div className="columns-toolbar" style={{
          position: 'absolute',
          top: '-40px',
          left: '0',
          display: 'flex',
          gap: '8px',
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          zIndex: 100,
        }}>
          <button
            className="toolbar-button"
            onClick={handleAddColumn}
            title="Add Column"
            style={{
              padding: '6px 12px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={16} />
            <span className="text-sm">Add Column</span>
          </button>
          <div style={{ width: '1px', background: '#ddd' }} />
          <button
            className={`toolbar-button ${verticalAlignment === 'top' ? 'active' : ''}`}
            onClick={() => handleAlignmentChange('top')}
            title="Align Top"
            style={{
              padding: '6px',
              border: 'none',
              background: verticalAlignment === 'top' ? '#0073aa' : 'transparent',
              color: verticalAlignment === 'top' ? '#fff' : '#000',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            <AlignVerticalJustifyStart size={16} />
          </button>
          <button
            className={`toolbar-button ${verticalAlignment === 'center' ? 'active' : ''}`}
            onClick={() => handleAlignmentChange('center')}
            title="Align Center"
            style={{
              padding: '6px',
              border: 'none',
              background: verticalAlignment === 'center' ? '#0073aa' : 'transparent',
              color: verticalAlignment === 'center' ? '#fff' : '#000',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            <AlignVerticalJustifyCenter size={16} />
          </button>
          <button
            className={`toolbar-button ${verticalAlignment === 'bottom' ? 'active' : ''}`}
            onClick={() => handleAlignmentChange('bottom')}
            title="Align Bottom"
            style={{
              padding: '6px',
              border: 'none',
              background: verticalAlignment === 'bottom' ? '#0073aa' : 'transparent',
              color: verticalAlignment === 'bottom' ? '#fff' : '#000',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            <AlignVerticalJustifyEnd size={16} />
          </button>
        </div>
      )}

      {/* Columns container */}
      <div
        className={`columns-wrapper ${isStackedOnMobile ? 'stack-on-mobile' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: `${gap}px`,
          width: '100%',
        }}
      >
        {innerBlocks.map((column, index) => (
          <div
            key={column.clientId || column.id}
            className="column-wrapper"
            style={{
              flex: `0 0 ${column.attributes?.width || 100 / innerBlocks.length}%`,
              maxWidth: `${column.attributes?.width || 100 / innerBlocks.length}%`,
              position: 'relative',
            }}
          >
            {/* Column remove button */}
            {isSelected && innerBlocks.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveColumn(column.id);
                }}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  zIndex: 10,
                  padding: '4px 8px',
                  background: '#cc1818',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
                title="Remove Column"
              >
                Remove
              </button>
            )}

            <ColumnBlock
              {...column}
              id={column.id}
              content={column.content}
              attributes={column.attributes}
              innerBlocks={column.innerBlocks}
              onInnerBlocksChange={(newInnerBlocks) => {
                const updatedColumns = innerBlocks.map(col =>
                  col.id === column.id
                    ? { ...col, innerBlocks: newInnerBlocks as Block[] }
                    : col
                );
                if (onInnerBlocksChange) {
                  onInnerBlocksChange(updatedColumns);
                }
              }}
              isSelected={isSelected}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {innerBlocks.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          border: '2px dashed #ddd',
          borderRadius: '4px',
        }}>
          <p style={{ color: '#757575', marginBottom: '16px' }}>No columns yet</p>
          <button
            onClick={handleAddColumn}
            style={{
              padding: '8px 16px',
              background: '#0073aa',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Add First Column
          </button>
        </div>
      )}
    </div>
  );
};

export default ColumnsBlockNew;
