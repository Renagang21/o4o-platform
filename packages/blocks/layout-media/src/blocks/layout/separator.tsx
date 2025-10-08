import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface SeparatorBlockProps {
  attributes: {
    style: string;
    color: string;
  };
  setAttributes: (attrs: Partial<SeparatorBlockProps['attributes']>) => void;
}

const Edit: React.FC<SeparatorBlockProps> = ({ attributes, setAttributes }) => {
  const { style, color } = attributes;
  
  const updateStyle = (newStyle: string) => {
    setAttributes({ style: newStyle });
  };
  
  const classNames = [
    'wp-block-separator',
    style && `is-style-${style}`,
    color && `has-${color}-color`,
  ].filter(Boolean).join(' ');
  
  return (
    <div>
      <div className="block-editor-block-toolbar">
        <select value={style || 'default'} onChange={(e) => updateStyle(e.target.value)}>
          <option value="default">Default</option>
          <option value="wide">Wide Line</option>
          <option value="dots">Dots</option>
        </select>
      </div>
      <hr className={classNames} />
    </div>
  );
};

const Save: React.FC<Pick<SeparatorBlockProps, 'attributes'>> = ({ attributes }) => {
  const { style, color } = attributes;
  
  const classNames = [
    'wp-block-separator',
    style && `is-style-${style}`,
    color && `has-${color}-color`,
  ].filter(Boolean).join(' ');
  
  return <hr className={classNames} />;
};

const SeparatorBlock: BlockDefinition = {
  name: 'o4o/separator',
  title: 'Separator',
  category: 'layout',
  icon: 'minus',
  description: 'Create a break between sections.',
  keywords: ['separator', 'divider', 'line', 'hr'],
  
  attributes: {
    style: {
      type: 'string',
      default: 'default'
    },
    color: {
      type: 'string',
      default: ''
    }
  },
  
  supports: {
    align: ['center', 'wide', 'full'],
    anchor: true,
    className: true,
    color: {
      background: false,
      text: false
    }
  },
  
  edit: Edit,
  save: Save
};

export default SeparatorBlock;