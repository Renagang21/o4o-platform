/**
 * ParagraphSettings Component
 * Settings panel for Paragraph block
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { PanelBody, SelectControl, RangeControl, ColorPicker, ToggleControl } from '../controls';
import { ButtonGroup } from '../controls/ButtonGroup';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

interface ParagraphSettingsProps {
  block: Block;
  onUpdate: (updates: { content?: any; attributes?: any }) => void;
}

export const ParagraphSettings: React.FC<ParagraphSettingsProps> = ({ block, onUpdate }) => {
  const attributes = block.attributes || {};

  return (
    <>
      <PanelBody title="Text Settings">
        <ButtonGroup
          label="Alignment"
          value={attributes.align || 'left'}
          onChange={(value) => onUpdate({ attributes: { ...attributes, align: value } })}
          options={[
            { label: 'Left', value: 'left', icon: <AlignLeft size={16} /> },
            { label: 'Center', value: 'center', icon: <AlignCenter size={16} /> },
            { label: 'Right', value: 'right', icon: <AlignRight size={16} /> },
            { label: 'Justify', value: 'justify', icon: <AlignJustify size={16} /> },
          ]}
        />

        <RangeControl
          label="Font Size"
          value={attributes.fontSize || 16}
          onChange={(value) => onUpdate({ attributes: { ...attributes, fontSize: value } })}
          min={12}
          max={72}
          step={1}
          help="Font size in pixels"
        />
      </PanelBody>

      <PanelBody title="Color Settings" initialOpen={false}>
        <ColorPicker
          label="Text Color"
          value={attributes.textColor || ''}
          onChange={(value) => onUpdate({ attributes: { ...attributes, textColor: value } })}
          help="Leave empty for default"
        />

        <ColorPicker
          label="Background Color"
          value={attributes.backgroundColor || ''}
          onChange={(value) => onUpdate({ attributes: { ...attributes, backgroundColor: value } })}
          help="Leave empty for transparent"
        />
      </PanelBody>

      <PanelBody title="Advanced" initialOpen={false}>
        <ToggleControl
          label="Drop Cap"
          checked={attributes.dropCap || false}
          onChange={(checked) => onUpdate({ attributes: { ...attributes, dropCap: checked } })}
          help="Display a large initial letter"
        />
      </PanelBody>
    </>
  );
};

export default ParagraphSettings;
