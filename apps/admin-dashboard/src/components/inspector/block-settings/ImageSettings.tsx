/**
 * ImageSettings Component
 * Settings panel for Image block
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { PanelBody, TextControl, RangeControl, ToggleControl, SelectControl } from '../controls';
import { ButtonGroup } from '../controls/ButtonGroup';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface ImageSettingsProps {
  block: Block;
  onUpdate: (updates: { content?: any; attributes?: any }) => void;
}

export const ImageSettings: React.FC<ImageSettingsProps> = ({ block, onUpdate }) => {
  const attributes = block.attributes || {};
  const content = block.content || {};

  return (
    <>
      <PanelBody title="Image Settings">
        <TextControl
          label="Alt Text"
          value={attributes.alt || ''}
          onChange={(value) => onUpdate({ attributes: { ...attributes, alt: value } })}
          placeholder="Describe the image"
          help="Alternative text for accessibility"
        />

        <ButtonGroup
          label="Alignment"
          value={attributes.align || 'center'}
          onChange={(value) => onUpdate({ attributes: { ...attributes, align: value } })}
          options={[
            { label: 'Left', value: 'left', icon: <AlignLeft size={16} /> },
            { label: 'Center', value: 'center', icon: <AlignCenter size={16} /> },
            { label: 'Right', value: 'right', icon: <AlignRight size={16} /> },
          ]}
        />

        <RangeControl
          label="Width"
          value={attributes.width || 100}
          onChange={(value) => onUpdate({ attributes: { ...attributes, width: value } })}
          min={25}
          max={100}
          step={5}
          help="Width as percentage"
        />
      </PanelBody>

      <PanelBody title="Link Settings" initialOpen={false}>
        <TextControl
          label="Link URL"
          type="url"
          value={attributes.href || ''}
          onChange={(value) => onUpdate({ attributes: { ...attributes, href: value } })}
          placeholder="https://example.com"
          help="Make the image clickable"
        />

        <ToggleControl
          label="Open in New Tab"
          checked={attributes.linkTarget === '_blank'}
          onChange={(checked) => onUpdate({
            attributes: { ...attributes, linkTarget: checked ? '_blank' : '_self' }
          })}
        />
      </PanelBody>

      <PanelBody title="Advanced" initialOpen={false}>
        <SelectControl
          label="Image Size"
          value={attributes.sizeSlug || 'large'}
          onChange={(value) => onUpdate({ attributes: { ...attributes, sizeSlug: value } })}
          options={[
            { label: 'Thumbnail', value: 'thumbnail' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
            { label: 'Full Size', value: 'full' },
          ]}
        />

        <ToggleControl
          label="Rounded Corners"
          checked={attributes.rounded || false}
          onChange={(checked) => onUpdate({ attributes: { ...attributes, rounded: checked } })}
        />

        <ToggleControl
          label="Add Border"
          checked={attributes.border || false}
          onChange={(checked) => onUpdate({ attributes: { ...attributes, border: checked } })}
        />
      </PanelBody>
    </>
  );
};

export default ImageSettings;
