/**
 * GroupBlock Component
 * Container block that groups multiple blocks together with layout options
 */

import React, { useCallback } from 'react';
import { Block } from '@/types/post.types';
import { InnerBlocks } from '../InnerBlocks';
import { BlockProps } from '@/blocks/registry/types';
import { LayoutGrid, LayoutList, Rows3 } from 'lucide-react';

interface GroupBlockProps extends BlockProps {
  attributes?: {
    layout?: 'flow' | 'flex' | 'grid';
    tagName?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer';
    backgroundColor?: string;
    textColor?: string;
    padding?: { top: number; right: number; bottom: number; left: number };
    margin?: { top: number; right: number; bottom: number; left: number };
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    // Flex layout
    flexDirection?: 'row' | 'column';
    flexWrap?: 'nowrap' | 'wrap';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
    alignItems?: 'stretch' | 'flex-start' | 'center' | 'flex-end';
    gap?: number;
    // Grid layout
    gridColumns?: number;
    gridRows?: number;
    minHeight?: number;
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

const GroupBlock: React.FC<GroupBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
  onChange,
}) => {
  const {
    layout = 'flow',
    tagName = 'div',
    backgroundColor = '',
    textColor = '',
    padding = { top: 0, right: 0, bottom: 0, left: 0 },
    margin = { top: 0, right: 0, bottom: 0, left: 0 },
    borderRadius = 0,
    borderWidth = 0,
    borderColor = '',
    flexDirection = 'row',
    flexWrap = 'nowrap',
    justifyContent = 'flex-start',
    alignItems = 'stretch',
    gap = 16,
    gridColumns = 2,
    gridRows = 1,
    minHeight = 0,
  } = attributes;

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: 'flow' | 'flex' | 'grid') => {
    if (onChange) {
      onChange(null, { ...attributes, layout: newLayout });
    }
  }, [attributes, onChange]);

  // Get layout-specific styles
  const getLayoutStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      backgroundColor: backgroundColor || undefined,
      color: textColor || undefined,
      padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
      margin: `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`,
      borderRadius: borderRadius ? `${borderRadius}px` : undefined,
      border: borderWidth ? `${borderWidth}px solid ${borderColor || '#ddd'}` : undefined,
      minHeight: minHeight ? `${minHeight}px` : undefined,
    };

    switch (layout) {
      case 'flex':
        return {
          ...baseStyles,
          display: 'flex',
          flexDirection,
          flexWrap,
          justifyContent,
          alignItems,
          gap: `${gap}px`,
        };
      case 'grid':
        return {
          ...baseStyles,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gridTemplateRows: gridRows > 1 ? `repeat(${gridRows}, 1fr)` : undefined,
          gap: `${gap}px`,
        };
      default: // flow
        return baseStyles;
    }
  };

  // Handle inner blocks change
  const handleInnerBlocksChange = useCallback((newBlocks: Block[]) => {
    if (onInnerBlocksChange) {
      onInnerBlocksChange(newBlocks);
    }
  }, [onInnerBlocksChange]);

  // Create element based on tagName
  const TagName = tagName as keyof JSX.IntrinsicElements;

  return (
    <TagName
      className={`wp-block-group wp-block-group--layout-${layout}`}
      style={getLayoutStyles()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {/* Toolbar when selected */}
      {isSelected && (
        <div className="group-toolbar" style={{
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
            className={`toolbar-button ${layout === 'flow' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('flow')}
            title="Flow Layout"
            style={{
              padding: '6px',
              border: 'none',
              background: layout === 'flow' ? '#0073aa' : 'transparent',
              color: layout === 'flow' ? '#fff' : '#000',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            <LayoutList size={16} />
          </button>
          <button
            className={`toolbar-button ${layout === 'flex' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('flex')}
            title="Flex Layout"
            style={{
              padding: '6px',
              border: 'none',
              background: layout === 'flex' ? '#0073aa' : 'transparent',
              color: layout === 'flex' ? '#fff' : '#000',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            <Rows3 size={16} />
          </button>
          <button
            className={`toolbar-button ${layout === 'grid' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('grid')}
            title="Grid Layout"
            style={{
              padding: '6px',
              border: 'none',
              background: layout === 'grid' ? '#0073aa' : 'transparent',
              color: layout === 'grid' ? '#fff' : '#000',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      )}

      {/* Inner blocks container */}
      <InnerBlocks
        parentBlockId={id || 'group'}
        blocks={innerBlocks}
        onBlocksChange={handleInnerBlocksChange}
        selectedBlockId={isSelected ? id : null}
        placeholder="Add blocks to this group..."
        renderAppender={true}
        orientation={layout === 'flex' && flexDirection === 'row' ? 'horizontal' : 'vertical'}
        className="group-inner-blocks"
        currentDepth={2}
      />
    </TagName>
  );
};

export default GroupBlock;
