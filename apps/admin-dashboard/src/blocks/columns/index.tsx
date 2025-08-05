/**
 * Columns Block
 * Multi-column layout block with individual column containers
 */

import { registerBlockType, createBlock } from '@wordpress/blocks';
import { 
  InnerBlocks, 
  useBlockProps, 
  InspectorControls,
  BlockControls,
  BlockVerticalAlignmentToolbar
} from '@wordpress/block-editor';
import { 
  PanelBody, 
  RangeControl, 
  SelectControl,
  ToggleControl,
  ToolbarGroup,
  ToolbarButton
} from '@wordpress/components';
import { Columns as ColumnsIcon, Plus, Minus } from 'lucide-react';
import { useSelect, useDispatch } from '@wordpress/data';

// Columns block attributes
interface ColumnsBlockAttributes {
  columns: number;
  verticalAlignment?: 'top' | 'center' | 'bottom';
  isStackedOnMobile: boolean;
  gap: number;
}

// Column block attributes
interface ColumnBlockAttributes {
  width?: number;
  verticalAlignment?: 'top' | 'center' | 'bottom' | 'stretch';
}

// Register the Columns container block
registerBlockType('o4o/columns', {
  title: 'Columns',
  description: 'Display content in multiple columns',
  category: 'design',
  icon: ColumnsIcon as any,
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    html: false,
    color: {
      background: true,
      gradients: true
    }
  },
  attributes: {
    columns: {
      type: 'number',
      default: 2
    },
    verticalAlignment: {
      type: 'string',
      default: undefined
    },
    isStackedOnMobile: {
      type: 'boolean',
      default: true
    },
    gap: {
      type: 'number',
      default: 20
    }
  },

  edit: ({ attributes, setAttributes, clientId }: any) => {
    const { columns, verticalAlignment, isStackedOnMobile, gap } = attributes;
    const { insertBlock, removeBlock } = useDispatch('core/block-editor') as any;
    
    const innerBlocks = useSelect(
      (select: any) => select('core/block-editor').getBlocks(clientId),
      [clientId]
    );

    const blockProps = useBlockProps({
      className: `o4o-columns-block columns-${columns}`,
      style: {
        display: 'flex',
        gap: `${gap}px`,
        alignItems: verticalAlignment === 'center' ? 'center' : 
                   verticalAlignment === 'bottom' ? 'flex-end' : 
                   'flex-start'
      }
    });

    // Update columns count
    const updateColumns = (newColumns: number) => {
      const currentColumns = innerBlocks.length;
      
      if (newColumns > currentColumns) {
        // Add columns
        for (let i = currentColumns; i < newColumns; i++) {
          const newColumn = createBlock('o4o/column', {
            width: Math.floor(100 / newColumns)
          });
          insertBlock(newColumn, i, clientId);
        }
      } else if (newColumns < currentColumns) {
        // Remove columns from the end
        for (let i = currentColumns - 1; i >= newColumns; i--) {
          removeBlock(innerBlocks[i].clientId);
        }
      }
      
      // Update widths of remaining columns
      innerBlocks.slice(0, newColumns).forEach((block: any) => {
        const newWidth = Math.floor(100 / newColumns);
        if (block.attributes.width !== newWidth) {
          block.attributes.width = newWidth;
        }
      });
      
      setAttributes({ columns: newColumns });
    };

    return (
      <>
        <BlockControls>
          <ToolbarGroup>
            <ToolbarButton
              icon={<Minus className="w-4 h-4" />}
              label="Remove column"
              onClick={() => updateColumns(Math.max(1, columns - 1))}
              disabled={columns <= 1}
            />
            <ToolbarButton
              icon={<Plus className="w-4 h-4" />}
              label="Add column"
              onClick={() => updateColumns(Math.min(6, columns + 1))}
              disabled={columns >= 6}
            />
          </ToolbarGroup>
          <BlockVerticalAlignmentToolbar
            onChange={(value: any) => setAttributes({ verticalAlignment: value })}
            value={verticalAlignment}
          />
        </BlockControls>

        <InspectorControls>
          <PanelBody title="Columns Settings" initialOpen={true}>
            <RangeControl
              label="Columns"
              value={columns}
              onChange={(value) => value !== undefined && updateColumns(value)}
              min={1}
              max={6}
            />
            
            <RangeControl
              label="Gap between columns"
              value={gap}
              onChange={(value) => setAttributes({ gap: value })}
              min={0}
              max={100}
              step={5}
            />
            
            <ToggleControl
              label="Stack on Mobile"
              checked={isStackedOnMobile}
              onChange={(value) => setAttributes({ isStackedOnMobile: value })}
              help="Stack columns vertically on mobile devices"
            />
          </PanelBody>
        </InspectorControls>

        <div {...blockProps}>
          <InnerBlocks
            allowedBlocks={['o4o/column']}
            template={Array(columns).fill(['o4o/column', { width: Math.floor(100 / columns) }])}
            templateLock="all"
            orientation="horizontal"
          />
        </div>

        <style>{`
          .o4o-columns-block {
            flex-wrap: wrap;
          }
          
          @media (max-width: 768px) {
            .o4o-columns-block.stack-on-mobile {
              flex-direction: column !important;
            }
          }
        `}</style>
      </>
    );
  },

  save: ({ attributes }: { attributes: ColumnsBlockAttributes }) => {
    const { columns, verticalAlignment, isStackedOnMobile, gap } = attributes;
    
    const blockProps = useBlockProps.save({
      className: `o4o-columns-block columns-${columns} ${isStackedOnMobile ? 'stack-on-mobile' : ''}`,
      style: {
        display: 'flex',
        gap: `${gap}px`,
        alignItems: verticalAlignment === 'center' ? 'center' : 
                   verticalAlignment === 'bottom' ? 'flex-end' : 
                   'flex-start'
      }
    });

    return (
      <div {...blockProps}>
        <InnerBlocks.Content />
      </div>
    );
  }
});

// Register the individual Column block
registerBlockType('o4o/column', {
  title: 'Column',
  description: 'A single column within a columns block',
  category: 'design',
  parent: ['o4o/columns'],
  icon: 'column' as any,
  supports: {
    reusable: false,
    html: false,
    inserter: false,
    color: {
      background: true,
      text: true
    },
    spacing: {
      padding: true
    }
  },
  attributes: {
    width: {
      type: 'number',
      default: 50
    },
    verticalAlignment: {
      type: 'string',
      default: undefined
    }
  },

  edit: ({ attributes, setAttributes }: { attributes: ColumnBlockAttributes; setAttributes: (attrs: Partial<ColumnBlockAttributes>) => void }) => {
    const { width, verticalAlignment } = attributes;
    
    const blockProps = useBlockProps({
      className: 'o4o-column-block',
      style: {
        flexBasis: `${width}%`,
        alignSelf: verticalAlignment === 'center' ? 'center' :
                   verticalAlignment === 'bottom' ? 'flex-end' :
                   verticalAlignment === 'stretch' ? 'stretch' :
                   'flex-start'
      }
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title="Column Settings" initialOpen={true}>
            <RangeControl
              label="Width (%)"
              value={width || 50}
              onChange={(value) => setAttributes({ width: value })}
              min={10}
              max={100}
              step={1}
            />
            
            <SelectControl
              label="Vertical Alignment"
              value={verticalAlignment}
              options={[
                { label: 'Default', value: '' },
                { label: 'Top', value: 'top' },
                { label: 'Center', value: 'center' },
                { label: 'Bottom', value: 'bottom' },
                { label: 'Stretch', value: 'stretch' }
              ]}
              onChange={(value) => setAttributes({ verticalAlignment: value as any })}
            />
          </PanelBody>
        </InspectorControls>

        <div {...blockProps}>
          <InnerBlocks
            templateLock={false}
            renderAppender={InnerBlocks.ButtonBlockAppender}
          />
        </div>
      </>
    );
  },

  save: ({ attributes }: { attributes: ColumnBlockAttributes }) => {
    const { width, verticalAlignment } = attributes;
    
    const blockProps = useBlockProps.save({
      className: 'o4o-column-block',
      style: {
        flexBasis: `${width}%`,
        alignSelf: verticalAlignment === 'center' ? 'center' :
                   verticalAlignment === 'bottom' ? 'flex-end' :
                   verticalAlignment === 'stretch' ? 'stretch' :
                   'flex-start'
      }
    });

    return (
      <div {...blockProps}>
        <InnerBlocks.Content />
      </div>
    );
  }
});