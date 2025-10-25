/**
 * Buttons Block Definition
 * Container for multiple button blocks
 */

import React from 'react';
import { Square } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import { BlockComponent } from '../registry/types';

/**
 * Simple Buttons Block Component
 * A container that holds multiple button blocks
 */
const ButtonsBlock: BlockComponent = ({
  innerBlocks = [],
  onInnerBlocksChange,
  attributes = {},
}) => {
  const { align = 'left', orientation = 'horizontal' } = attributes;

  const alignmentClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align] || 'justify-start';

  const orientationClass = orientation === 'vertical' ? 'flex-col' : 'flex-row';

  return (
    <div className={`flex gap-2 ${orientationClass} ${alignmentClass} flex-wrap`}>
      {innerBlocks.length === 0 ? (
        <div className="text-gray-400 text-sm italic p-4 border-2 border-dashed rounded">
          Add button blocks here
        </div>
      ) : (
        innerBlocks.map((block) => {
          // Render inner blocks (buttons)
          const DynamicRenderer = require('../registry/DynamicRenderer').DynamicRenderer;
          return (
            <DynamicRenderer
              key={block.id}
              block={block}
              onInnerBlocksChange={onInnerBlocksChange}
            />
          );
        })
      )}
    </div>
  );
};

export const buttonsBlockDefinition: BlockDefinition = {
  name: 'o4o/buttons',
  title: 'Buttons',
  category: 'design',
  icon: <Square className="w-5 h-5" />,
  description: 'A container for multiple buttons',
  keywords: ['buttons', 'cta', 'call to action'],
  component: ButtonsBlock,
  attributes: {
    align: {
      type: 'string',
      default: 'left',
    },
    orientation: {
      type: 'string',
      default: 'horizontal',
    },
  },
  supports: {
    align: ['left', 'center', 'right'],
    anchor: true,
  },
};

export default buttonsBlockDefinition;
