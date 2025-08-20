import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

const Edit: React.FC<any> = ({ attributes, setAttributes }) => {
  const { height } = attributes;
  
  const updateHeight = (newHeight: number) => {
    setAttributes({ height: newHeight });
  };
  
  return (
    <div>
      <div className="block-editor-block-toolbar">
        <label>
          Height: 
          <input 
            type="number" 
            value={height || 100} 
            onChange={(e) => updateHeight(Number(e.target.value))}
            min="1"
            max="500"
          /> px
        </label>
      </div>
      <div 
        className="wp-block-spacer" 
        style={{ height: `${height || 100}px` }}
        aria-hidden="true"
      />
    </div>
  );
};

const Save: React.FC<any> = ({ attributes }) => {
  const { height } = attributes;
  
  return (
    <div 
      className="wp-block-spacer" 
      style={{ height: `${height || 100}px` }}
      aria-hidden="true"
    />
  );
};

const SpacerBlock: BlockDefinition = {
  name: 'o4o/spacer',
  title: 'Spacer',
  category: 'layout',
  icon: 'image-flip-vertical',
  description: 'Add white space between blocks.',
  keywords: ['spacer', 'space', 'gap', 'margin'],
  
  attributes: {
    height: {
      type: 'number',
      default: 100
    }
  },
  
  supports: {
    anchor: true,
    className: true
  },
  
  edit: Edit,
  save: Save
};

export default SpacerBlock;