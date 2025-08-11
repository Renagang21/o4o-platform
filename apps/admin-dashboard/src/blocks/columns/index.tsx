/**
 * Columns Block
 * Multi-column layout block with individual column containers
 */

import { Columns as ColumnsIcon, Plus, Minus } from 'lucide-react';

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

// Lazy registration to ensure WordPress polyfill is loaded
export const registerColumnsBlock = () => {
  if (!window.wp?.blocks?.registerBlockType) {
    console.warn('[Columns Block] WordPress blocks API not available yet');
    return;
  }
  
  const { registerBlockType, createBlock } = window.wp.blocks as any;
  const { 
    InnerBlocks, 
    useBlockProps, 
    InspectorControls,
    BlockControls,
    BlockVerticalAlignmentToolbar
  } = window.wp.blockEditor as any;
  const { 
    PanelBody, 
    RangeControl, 
    SelectControl,
    ToggleControl,
    ToolbarGroup,
    ToolbarButton
  } = window.wp.components as any;
  const { useSelect, useDispatch } = window.wp.data as any;
  
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
        text: true
      },
      spacing: {
        padding: true,
        margin: true
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

    edit: function ColumnsEdit({ attributes, setAttributes, clientId }: any) {
      const { columns, verticalAlignment, isStackedOnMobile, gap } = attributes;
      
      const { insertBlock, removeBlock } = useDispatch('core/block-editor');
      const innerBlocks = useSelect(
        (select: any) => {
          const { getBlock } = select('core/block-editor');
          return getBlock(clientId)?.innerBlocks || [];
        },
        [clientId]
      );

      const updateColumns = (newColumns: number) => {
        const currentColumns = innerBlocks.length;
        
        if (newColumns > currentColumns) {
          // Add columns
          for (let i = currentColumns; i < newColumns; i++) {
            const columnBlock = createBlock('o4o/column', {
              width: 100 / newColumns
            });
            insertBlock(columnBlock, i, clientId, false);
          }
        } else if (newColumns < currentColumns) {
          // Remove columns from the end
          for (let i = currentColumns - 1; i >= newColumns; i--) {
            if (innerBlocks[i]) {
              removeBlock(innerBlocks[i].clientId, false);
            }
          }
        }
        
        // Update widths for all columns
        innerBlocks.slice(0, newColumns).forEach((block: any) => {
          block.attributes.width = 100 / newColumns;
        });
        
        setAttributes({ columns: newColumns });
      };

      const blockProps = useBlockProps({
        className: `o4o-columns-block ${isStackedOnMobile ? 'stack-on-mobile' : ''}`,
        style: {
          display: 'flex',
          gap: `${gap}px`,
          alignItems: verticalAlignment === 'center' ? 'center' : 
                      verticalAlignment === 'bottom' ? 'flex-end' : 'flex-start'
        }
      });

      return (
        <>
          <BlockControls>
            <BlockVerticalAlignmentToolbar
              onChange={(value: any) => setAttributes({ verticalAlignment: value })}
              value={verticalAlignment}
            />
            <ToolbarGroup>
              <ToolbarButton
                icon={Minus as any}
                title="Remove column"
                onClick={() => columns > 1 && updateColumns(columns - 1)}
                disabled={columns <= 1}
              />
              <ToolbarButton
                icon={Plus as any}
                title="Add column"
                onClick={() => columns < 6 && updateColumns(columns + 1)}
                disabled={columns >= 6}
              />
            </ToolbarGroup>
          </BlockControls>

          <InspectorControls>
            <PanelBody title="Columns Settings" initialOpen={true}>
              <RangeControl
                label="Number of Columns"
                value={columns}
                onChange={(value?: number) => value && updateColumns(value)}
                min={1}
                max={6}
                step={1}
              />
              
              <RangeControl
                label="Gap between columns"
                value={gap}
                onChange={(value?: number) => setAttributes({ gap: value || 0 })}
                min={0}
                max={100}
                step={5}
              />
              
              <SelectControl
                label="Vertical Alignment"
                value={verticalAlignment || ''}
                options={[
                  { label: 'Default', value: '' },
                  { label: 'Top', value: 'top' },
                  { label: 'Center', value: 'center' },
                  { label: 'Bottom', value: 'bottom' }
                ]}
                onChange={(value: string) => setAttributes({ 
                  verticalAlignment: value === '' ? undefined : value 
                })}
              />
              
              <ToggleControl
                label="Stack on Mobile"
                checked={isStackedOnMobile}
                onChange={(value: boolean) => setAttributes({ isStackedOnMobile: value })}
                disabled={false}
                className=""
                __nextHasNoMarginBottom={false}
              />
            </PanelBody>
          </InspectorControls>

          <div {...blockProps}>
            <InnerBlocks
              allowedBlocks={['o4o/column']}
              template={Array(columns).fill(['o4o/column', { width: 100 / columns }])}
              templateLock={false}
              renderAppender={false as any}
            />
          </div>
        </>
      );
    },

    save: ({ attributes }: { attributes: ColumnsBlockAttributes }) => {
      const { verticalAlignment, isStackedOnMobile, gap } = attributes;

      const blockProps = useBlockProps.save({
        className: `o4o-columns-block ${isStackedOnMobile ? 'stack-on-mobile' : ''}`,
        style: {
          display: 'flex',
          gap: `${gap}px`,
          alignItems: verticalAlignment === 'center' ? 'center' : 
                      verticalAlignment === 'bottom' ? 'flex-end' : 'flex-start'
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
    supports: {
      reusable: false,
      html: false,
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
        default: undefined
      },
      verticalAlignment: {
        type: 'string',
        default: undefined
      }
    },

    edit: function ColumnEdit({ attributes, setAttributes }: any) {
      const { width, verticalAlignment } = attributes;

      const blockProps = useBlockProps({
        className: 'o4o-column-block',
        style: {
          flexBasis: width ? `${width}%` : undefined,
          alignSelf: verticalAlignment === 'center' ? 'center' :
                     verticalAlignment === 'bottom' ? 'flex-end' :
                     verticalAlignment === 'stretch' ? 'stretch' : 'flex-start'
        }
      });

      return (
        <>
          <InspectorControls>
            <PanelBody title="Column Settings" initialOpen={true}>
              <RangeControl
                label="Width (%)"
                value={width || 0}
                onChange={(value?: number) => setAttributes({ width: value })}
                min={10}
                max={100}
                step={1}
              />
              
              <SelectControl
                label="Vertical Alignment"
                value={verticalAlignment || ''}
                options={[
                  { label: 'Default', value: '' },
                  { label: 'Top', value: 'top' },
                  { label: 'Center', value: 'center' },
                  { label: 'Bottom', value: 'bottom' },
                  { label: 'Stretch', value: 'stretch' }
                ]}
                onChange={(value: string) => setAttributes({ 
                  verticalAlignment: value === '' ? undefined : value 
                })}
              />
            </PanelBody>
          </InspectorControls>

          <div {...blockProps}>
            <InnerBlocks
              allowedBlocks={true as any}
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
          flexBasis: width ? `${width}%` : undefined,
          alignSelf: verticalAlignment === 'center' ? 'center' :
                     verticalAlignment === 'bottom' ? 'flex-end' :
                     verticalAlignment === 'stretch' ? 'stretch' : 'flex-start'
        }
      });

      return (
        <div {...blockProps}>
          <InnerBlocks.Content />
        </div>
      );
    }
  });
};

// Try to register immediately if WordPress is available
if (window.wp?.blocks?.registerBlockType) {
  registerColumnsBlock();
} else {
  // Otherwise wait for DOM ready
  document.addEventListener('DOMContentLoaded', registerColumnsBlock);
}