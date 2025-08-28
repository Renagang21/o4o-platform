/**
 * ParagraphTestDemo Component
 * Demo page for testing the new ParagraphBlock
 */

import { useState } from 'react';
import ParagraphBlock from '../ParagraphBlock';
import '@/styles/paragraph-test-block.css';

const ParagraphTestDemo = () => {
  const [blocks, setBlocks] = useState<{
    id: string;
    content: string;
    attributes: {
      align?: 'left' | 'center' | 'right' | 'justify';
      fontSize?: number;
      lineHeight?: number;
      textColor?: string;
    };
  }[]>([
    {
      id: 'block-1',
      content: '<strong>Welcome to the enhanced paragraph block!</strong> This block features improved visual feedback, better formatting options, and a more intuitive editing experience.',
      attributes: {
        fontSize: 18,
        lineHeight: 1.8,
        textColor: '#1e293b',
      }
    },
    {
      id: 'block-2',
      content: 'Try hovering over blocks to see the visual feedback. Click to select and edit. You can use <em>keyboard shortcuts</em> like <code>Ctrl+B</code> for bold, <code>Ctrl+I</code> for italic, and <code>Ctrl+K</code> to add links.',
      attributes: {
        align: 'left' as const,
        fontSize: 16,
        lineHeight: 1.6,
      }
    },
    {
      id: 'block-3',
      content: '',
      attributes: {
        align: 'center' as const,
        fontSize: 16,
      }
    }
  ]);
  
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Update block content
  const updateBlock = (id: string, content: string, attributes?: any) => {
    setBlocks(blocks.map(block => 
      block.id === id 
        ? { ...block, content, attributes: { ...block.attributes, ...attributes } }
        : block
    ));
  };

  // Delete block
  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id));
    setSelectedBlockId(null);
  };

  // Duplicate block
  const duplicateBlock = (id: string) => {
    const blockIndex = blocks.findIndex(b => b.id === id);
    const block = blocks[blockIndex];
    if (block) {
      const newBlock = {
        ...block,
        id: `block-${Date.now()}`,
      };
      const newBlocks = [...blocks];
      newBlocks.splice(blockIndex + 1, 0, newBlock);
      setBlocks(newBlocks);
    }
  };

  // Move block up
  const moveBlockUp = (id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index > 0) {
      const newBlocks = [...blocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      setBlocks(newBlocks);
    }
  };

  // Move block down
  const moveBlockDown = (id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index < blocks.length - 1) {
      const newBlocks = [...blocks];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      setBlocks(newBlocks);
    }
  };

  // Add new block
  const addBlock = (afterId: string, position: 'before' | 'after', _type = 'paragraph') => {
    const index = blocks.findIndex(b => b.id === afterId);
    const newBlock = {
      id: `block-${Date.now()}`,
      content: '',
      attributes: {
        fontSize: 16,
        lineHeight: 1.6,
      }
    };
    
    const newBlocks = [...blocks];
    const insertIndex = position === 'after' ? index + 1 : index;
    newBlocks.splice(insertIndex, 0, newBlock);
    setBlocks(newBlocks);
    
    // Auto-select new block
    setTimeout(() => setSelectedBlockId(newBlock.id), 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            Paragraph Test Block Demo
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Testing the enhanced paragraph block with Gutenberg-level features
          </p>
        </div>
      </div>

      {/* Editor Canvas */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-lg shadow-sm p-8">
            {/* Render blocks */}
            <div className="space-y-4">
              {blocks.map((block) => (
                <ParagraphBlock
                  key={block.id}
                  id={block.id}
                  content={block.content}
                  onChange={(content, attrs) => updateBlock(block.id, content, attrs)}
                  onDelete={() => deleteBlock(block.id)}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onMoveUp={() => moveBlockUp(block.id)}
                  onMoveDown={() => moveBlockDown(block.id)}
                  onAddBlock={(position, type) => addBlock(block.id, position, type)}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => setSelectedBlockId(block.id)}
                  attributes={block.attributes}
                />
              ))}
              
              {/* Add block button when no blocks */}
              {blocks.length === 0 && (
                <button
                  onClick={() => {
                    const newBlock = {
                      id: `block-${Date.now()}`,
                      content: '',
                      attributes: {}
                    };
                    setBlocks([newBlock]);
                    setSelectedBlockId(newBlock.id);
                  }}
                  className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg
                           hover:border-gray-400 hover:bg-gray-50 transition-colors
                           text-gray-500 hover:text-gray-600"
                >
                  Click to add your first paragraph
                </button>
              )}
            </div>
          </div>

          {/* Feature list */}
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Features Implemented</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Visual Feedback</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>✓ Hover state with dashed border</li>
                  <li>✓ Selected state with blue border</li>
                  <li>✓ Focus state with ring effect</li>
                  <li>✓ Empty block hint on hover</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Editing Features</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>✓ Inline text editing</li>
                  <li>✓ Rich formatting toolbar</li>
                  <li>✓ Keyboard shortcuts</li>
                  <li>✓ Link insertion with popover</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Typography Controls</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>✓ Font size adjustment</li>
                  <li>✓ Line height control</li>
                  <li>✓ Letter spacing</li>
                  <li>✓ Text transform options</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Advanced Options</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>✓ Drop cap support</li>
                  <li>✓ Text/background colors</li>
                  <li>✓ Highlight effect</li>
                  <li>✓ Padding and margins</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts guide */}
          <div className="mt-6 bg-blue-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <kbd className="px-2 py-1 bg-white rounded border border-blue-200">Ctrl+B</kbd>
                <span className="ml-2">Bold</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-white rounded border border-blue-200">Ctrl+I</kbd>
                <span className="ml-2">Italic</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-white rounded border border-blue-200">Ctrl+U</kbd>
                <span className="ml-2">Underline</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-white rounded border border-blue-200">Ctrl+K</kbd>
                <span className="ml-2">Add Link</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-white rounded border border-blue-200">Enter</kbd>
                <span className="ml-2">New Block</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-white rounded border border-blue-200">/</kbd>
                <span className="ml-2">Block Menu (empty)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParagraphTestDemo;