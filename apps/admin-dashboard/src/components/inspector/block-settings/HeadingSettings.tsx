/**
 * HeadingSettings Component
 * Settings panel for Heading block
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { PanelBody, SelectControl, TextControl, ColorPicker } from '../controls';
import { ButtonGroup } from '../controls/ButtonGroup';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface HeadingAttributes {
  level?: number;
  align?: string;
  anchor?: string;
  textColor?: string;
  backgroundColor?: string;
}

interface HeadingSettingsProps {
  block: Block;
  onUpdate: (updates: { content?: any; attributes?: any }) => void;
}

export const HeadingSettings: React.FC<HeadingSettingsProps> = ({ block, onUpdate }) => {
  const attributes = (block.attributes || {}) as HeadingAttributes;

  return (
    <>
      <PanelBody title="Heading Settings">
        <SelectControl
          label="Level"
          value={attributes.level || 2}
          onChange={(value) => onUpdate({ attributes: { ...attributes, level: value } })}
          options={[
            { label: 'H1', value: 1 },
            { label: 'H2', value: 2 },
            { label: 'H3', value: 3 },
            { label: 'H4', value: 4 },
            { label: 'H5', value: 5 },
            { label: 'H6', value: 6 },
          ]}
          help="Heading hierarchy level"
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

        <TextControl
          label="Anchor"
          value={attributes.anchor || ''}
          onChange={(value) => onUpdate({ attributes: { ...attributes, anchor: value } })}
          placeholder="unique-id"
          help="HTML anchor for direct linking"
        />
      </PanelBody>

      <PanelBody title="Color Settings" initialOpen={false}>
        <ColorPicker
          label="Text Color"
          value={attributes.textColor || ''}
          onChange={(value) => onUpdate({ attributes: { ...attributes, textColor: value } })}
        />

        <ColorPicker
          label="Background Color"
          value={attributes.backgroundColor || ''}
          onChange={(value) => onUpdate({ attributes: { ...attributes, backgroundColor: value } })}
        />
      </PanelBody>
    </>
  );
};

export default HeadingSettings;
