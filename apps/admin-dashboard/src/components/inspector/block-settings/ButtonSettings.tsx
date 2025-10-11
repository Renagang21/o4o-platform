/**
 * ButtonSettings Component
 * Settings panel for Button block
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { PanelBody, TextControl, SelectControl, ToggleControl, ColorPicker, RangeControl } from '../controls';
import { ButtonGroup } from '../controls/ButtonGroup';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface ButtonSettingsProps {
  block: Block;
  onUpdate: (updates: { content?: any; attributes?: any }) => void;
}

export const ButtonSettings: React.FC<ButtonSettingsProps> = ({ block, onUpdate }) => {
  const attributes = block.attributes || {};

  return (
    <>
      <PanelBody title="Button Settings">
        <TextControl
          label="Button Text"
          value={typeof block.content === 'string' ? block.content : block.content?.text || ''}
          onChange={(value) => onUpdate({ content: { text: value } })}
          placeholder="Click me"
        />

        <TextControl
          label="Link URL"
          type="url"
          value={attributes.url || ''}
          onChange={(value) => onUpdate({ attributes: { ...attributes, url: value } })}
          placeholder="https://example.com"
          help="Where the button links to"
        />

        <ToggleControl
          label="Open in New Tab"
          checked={attributes.linkTarget === '_blank'}
          onChange={(checked) => onUpdate({
            attributes: { ...attributes, linkTarget: checked ? '_blank' : '_self' }
          })}
        />

        <ButtonGroup
          label="Alignment"
          value={attributes.align || 'left'}
          onChange={(value) => onUpdate({ attributes: { ...attributes, align: value } })}
          options={[
            { label: 'Left', value: 'left', icon: <AlignLeft size={16} /> },
            { label: 'Center', value: 'center', icon: <AlignCenter size={16} /> },
            { label: 'Right', value: 'right', icon: <AlignRight size={16} /> },
          ]}
        />
      </PanelBody>

      <PanelBody title="Style Settings">
        <SelectControl
          label="Button Style"
          value={attributes.style || 'fill'}
          onChange={(value) => onUpdate({ attributes: { ...attributes, style: value } })}
          options={[
            { label: 'Fill', value: 'fill' },
            { label: 'Outline', value: 'outline' },
          ]}
        />

        <SelectControl
          label="Border Radius"
          value={attributes.borderRadius || 'rounded'}
          onChange={(value) => onUpdate({ attributes: { ...attributes, borderRadius: value } })}
          options={[
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'rounded' },
            { label: 'Large', value: 'lg' },
            { label: 'Full', value: 'full' },
          ]}
        />

        <RangeControl
          label="Width"
          value={attributes.width || 100}
          onChange={(value) => onUpdate({ attributes: { ...attributes, width: value } })}
          min={50}
          max={100}
          step={5}
          help="Button width as percentage"
        />
      </PanelBody>

      <PanelBody title="Color Settings" initialOpen={false}>
        <ColorPicker
          label="Button Color"
          value={attributes.backgroundColor || '#0073aa'}
          onChange={(value) => onUpdate({ attributes: { ...attributes, backgroundColor: value } })}
        />

        <ColorPicker
          label="Text Color"
          value={attributes.textColor || '#ffffff'}
          onChange={(value) => onUpdate({ attributes: { ...attributes, textColor: value } })}
        />
      </PanelBody>
    </>
  );
};

export default ButtonSettings;
