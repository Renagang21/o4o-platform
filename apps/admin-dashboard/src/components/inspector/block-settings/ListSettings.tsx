/**
 * ListSettings Component
 * Settings panel for List block
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { PanelBody, SelectControl, ToggleControl, ColorPicker, RangeControl } from '../controls';

interface ListAttributes {
  ordered?: boolean;
  indent?: number;
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
  markerColor?: string;
  reversed?: boolean;
  start?: number;
}

interface ListSettingsProps {
  block: Block;
  onUpdate: (updates: { content?: any; attributes?: any }) => void;
}

export const ListSettings: React.FC<ListSettingsProps> = ({ block, onUpdate }) => {
  const attributes = (block.attributes || {}) as ListAttributes;

  return (
    <>
      <PanelBody title="List Settings">
        <SelectControl
          label="List Style"
          value={attributes.ordered ? 'ordered' : 'unordered'}
          onChange={(value) => onUpdate({
            attributes: { ...attributes, ordered: value === 'ordered' }
          })}
          options={[
            { label: 'Unordered (Bullets)', value: 'unordered' },
            { label: 'Ordered (Numbers)', value: 'ordered' },
          ]}
        />

        <RangeControl
          label="Indent Level"
          value={attributes.indent || 0}
          onChange={(value) => onUpdate({ attributes: { ...attributes, indent: value } })}
          min={0}
          max={5}
          step={1}
          help="Indentation level for nested lists"
        />
      </PanelBody>

      <PanelBody title="Typography" initialOpen={false}>
        <RangeControl
          label="Font Size"
          value={attributes.fontSize || 16}
          onChange={(value) => onUpdate({ attributes: { ...attributes, fontSize: value } })}
          min={12}
          max={32}
          step={1}
        />

        <RangeControl
          label="Line Height"
          value={attributes.lineHeight || 1.6}
          onChange={(value) => onUpdate({ attributes: { ...attributes, lineHeight: value } })}
          min={1}
          max={3}
          step={0.1}
        />
      </PanelBody>

      <PanelBody title="Color Settings" initialOpen={false}>
        <ColorPicker
          label="Text Color"
          value={attributes.textColor || ''}
          onChange={(value) => onUpdate({ attributes: { ...attributes, textColor: value } })}
        />

        <ColorPicker
          label="Marker Color"
          value={attributes.markerColor || ''}
          onChange={(value) => onUpdate({ attributes: { ...attributes, markerColor: value } })}
          help="Color of bullets or numbers"
        />
      </PanelBody>

      <PanelBody title="Advanced" initialOpen={false}>
        <ToggleControl
          label="Reversed Order"
          checked={attributes.reversed || false}
          onChange={(checked) => onUpdate({ attributes: { ...attributes, reversed: checked } })}
          help="Only for ordered lists"
        />

        <SelectControl
          label="Start Value"
          value={attributes.start || 1}
          onChange={(value) => onUpdate({ attributes: { ...attributes, start: value } })}
          options={[
            { label: '1', value: 1 },
            { label: '2', value: 2 },
            { label: '3', value: 3 },
            { label: '5', value: 5 },
            { label: '10', value: 10 },
          ]}
          help="Starting number for ordered lists"
        />
      </PanelBody>
    </>
  );
};

export default ListSettings;
