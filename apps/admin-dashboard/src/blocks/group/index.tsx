/**
 * Group Block
 * Container block that groups other blocks together
 */

import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks, useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, RangeControl, ToggleControl } from '@wordpress/components';
import { Group } from 'lucide-react';

// Block attributes
interface GroupBlockAttributes {
  align?: 'left' | 'center' | 'right' | 'wide' | 'full';
  backgroundColor?: string;
  textColor?: string;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  layout?: 'default' | 'flex' | 'grid';
  verticalAlignment?: 'top' | 'center' | 'bottom';
  isStackedOnMobile?: boolean;
}

// Register the Group block
registerBlockType('o4o/group', {
  title: 'Group',
  description: 'Group blocks together in a container',
  category: 'design',
  icon: Group as any,
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    html: false,
    color: {
      background: true,
      text: true,
      gradients: true
    },
    spacing: {
      padding: true,
      margin: true
    }
  },
  attributes: {
    align: {
      type: 'string',
      default: undefined
    },
    backgroundColor: {
      type: 'string',
      default: undefined
    },
    textColor: {
      type: 'string',
      default: undefined
    },
    padding: {
      type: 'number',
      default: 20
    },
    margin: {
      type: 'number',
      default: 0
    },
    borderRadius: {
      type: 'number',
      default: 0
    },
    layout: {
      type: 'string',
      default: 'default'
    },
    verticalAlignment: {
      type: 'string',
      default: 'top'
    },
    isStackedOnMobile: {
      type: 'boolean',
      default: true
    }
  },

  edit: ({ attributes, setAttributes }: { attributes: GroupBlockAttributes; setAttributes: (attrs: Partial<GroupBlockAttributes>) => void }) => {
    const { 
      backgroundColor, 
      textColor, 
      padding, 
      margin, 
      borderRadius, 
      layout,
      verticalAlignment,
      isStackedOnMobile 
    } = attributes;

    const blockProps = useBlockProps({
      className: `o4o-group-block ${layout === 'flex' ? 'flex' : ''} ${layout === 'grid' ? 'grid' : ''}`,
      style: {
        backgroundColor,
        color: textColor,
        padding: `${padding}px`,
        margin: `${margin}px`,
        borderRadius: `${borderRadius}px`,
        ...(layout === 'flex' && {
          display: 'flex',
          flexDirection: (isStackedOnMobile ? 'column' : 'row') as 'column' | 'row',
          alignItems: verticalAlignment === 'center' ? 'center' : verticalAlignment === 'bottom' ? 'flex-end' : 'flex-start',
          gap: '20px'
        }),
        ...(layout === 'grid' && {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        })
      }
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title="Layout Settings" initialOpen={true}>
            <SelectControl
              label="Layout"
              value={layout}
              options={[
                { label: 'Default', value: 'default' },
                { label: 'Flex', value: 'flex' },
                { label: 'Grid', value: 'grid' }
              ]}
              onChange={(value: string) => setAttributes({ layout: value as 'default' | 'flex' | 'grid' })}
            />
            
            {layout === 'flex' && (
              <>
                <SelectControl
                  label="Vertical Alignment"
                  value={verticalAlignment}
                  options={[
                    { label: 'Top', value: 'top' },
                    { label: 'Center', value: 'center' },
                    { label: 'Bottom', value: 'bottom' }
                  ]}
                  onChange={(value: string) => setAttributes({ verticalAlignment: value as 'top' | 'center' | 'bottom' })}
                />
                
                <ToggleControl
                  label="Stack on Mobile"
                  checked={isStackedOnMobile}
                  onChange={(value: boolean) => setAttributes({ isStackedOnMobile: value })}
                  disabled={false}
                  className=""
                  __nextHasNoMarginBottom={false}
                />
              </>
            )}
          </PanelBody>

          <PanelBody title="Spacing" initialOpen={false}>
            <RangeControl
              label="Padding"
              value={padding}
              onChange={(value?: number) => setAttributes({ padding: value || 0 })}
              min={0}
              max={100}
              step={5}
            />
            
            <RangeControl
              label="Margin"
              value={margin}
              onChange={(value?: number) => setAttributes({ margin: value || 0 })}
              min={0}
              max={100}
              step={5}
            />
            
            <RangeControl
              label="Border Radius"
              value={borderRadius}
              onChange={(value?: number) => setAttributes({ borderRadius: value || 0 })}
              min={0}
              max={50}
              step={1}
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

  save: ({ attributes }: { attributes: GroupBlockAttributes }) => {
    const { 
      backgroundColor, 
      textColor, 
      padding, 
      margin, 
      borderRadius, 
      layout,
      verticalAlignment,
      isStackedOnMobile 
    } = attributes;

    const blockProps = useBlockProps.save({
      className: `o4o-group-block ${layout === 'flex' ? 'flex' : ''} ${layout === 'grid' ? 'grid' : ''}`,
      style: {
        backgroundColor,
        color: textColor,
        padding: `${padding}px`,
        margin: `${margin}px`,
        borderRadius: `${borderRadius}px`,
        ...(layout === 'flex' && {
          display: 'flex',
          flexDirection: (isStackedOnMobile ? 'column' : 'row') as 'column' | 'row',
          alignItems: verticalAlignment === 'center' ? 'center' : verticalAlignment === 'bottom' ? 'flex-end' : 'flex-start',
          gap: '20px'
        }),
        ...(layout === 'grid' && {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        })
      }
    });

    return (
      <div {...blockProps}>
        <InnerBlocks.Content />
      </div>
    );
  }
});