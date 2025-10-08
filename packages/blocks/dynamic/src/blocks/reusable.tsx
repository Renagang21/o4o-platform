import React, { useState, useEffect } from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface ReusableBlockAttributes {
  ref: number | null;
}

interface ReusableBlockData {
  id: number;
  title: string;
  content: string;
}

interface BlockEditProps {
  attributes: ReusableBlockAttributes;
  setAttributes: (attrs: Partial<ReusableBlockAttributes>) => void;
}

interface BlockSaveProps {
  attributes: ReusableBlockAttributes;
}

const Edit: React.FC<BlockEditProps> = ({ attributes, setAttributes }) => {
  const { ref } = attributes;
  const [reusableBlocks, setReusableBlocks] = useState<ReusableBlockData[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ReusableBlockData | null>(null);
  
  useEffect(() => {
    // Simulated fetching of reusable blocks
    setReusableBlocks([
      { id: 1, title: 'Header Template', content: 'Reusable header content' },
      { id: 2, title: 'Call to Action', content: 'Reusable CTA content' },
      { id: 3, title: 'Footer Template', content: 'Reusable footer content' },
    ]);
  }, []);
  
  useEffect(() => {
    if (ref) {
      const block = reusableBlocks.find(b => b.id === ref);
      setSelectedBlock(block || null);
    }
  }, [ref, reusableBlocks]);

  const handleSelect = (blockId: number) => {
    setAttributes({ ref: blockId });
    const block = reusableBlocks.find(b => b.id === blockId);
    setSelectedBlock(block || null);
  };
  
  if (!ref) {
    return (
      <div className="wp-block-reusable-placeholder">
        <p>Choose a reusable block:</p>
        <select onChange={(e) => handleSelect(Number(e.target.value))}>
          <option value="">Select a block...</option>
          {reusableBlocks.map(block => (
            <option key={block.id} value={block.id}>
              {block.title}
            </option>
          ))}
        </select>
      </div>
    );
  }
  
  return (
    <div className="wp-block-reusable">
      <div className="reusable-block-header">
        <span>Reusable Block: {selectedBlock?.title}</span>
        <button onClick={() => setAttributes({ ref: null })}>Change</button>
      </div>
      <div className="reusable-block-content">
        {selectedBlock?.content || 'Loading...'}
      </div>
    </div>
  );
};

const Save: React.FC<BlockSaveProps> = ({ attributes }) => {
  const { ref } = attributes;
  
  // Server-side rendering
  return (
    <div className="wp-block-reusable" data-ref={ref}>
      {/* Content will be rendered server-side */}
    </div>
  );
};

const ReusableBlock: BlockDefinition = {
  name: 'o4o/reusable',
  title: 'Reusable Block',
  category: 'dynamic',
  icon: 'block-default',
  description: 'Insert a reusable block.',
  keywords: ['reusable', 'template', 'pattern'],
  
  attributes: {
    ref: {
      type: 'number'
    }
  },
  
  supports: {
    align: true,
    anchor: true,
    className: true
  },
  
  edit: Edit,
  save: Save
};

export default ReusableBlock;