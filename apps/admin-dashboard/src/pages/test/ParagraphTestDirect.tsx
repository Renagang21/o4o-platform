import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ParagraphTestBlock from '@/components/editor/blocks/ParagraphTestBlock';
import '@/styles/paragraph-test-block.css';

const ParagraphTestDirect = () => {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState([
    {
      id: 'block-1',
      type: 'core/paragraph-test',
      content: { text: 'This is the ParagraphTestBlock with all Gutenberg features!' },
      attributes: {
        fontSize: 'medium',
        textAlign: 'left',
        dropCap: false
      }
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">ParagraphTestBlock Direct Test</h1>
        </div>
        <div className="text-sm text-gray-500">
          Version 1.1.0 - Build: index-Br4Xyr6O.js
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            ✅ ParagraphTestBlock is working if you can see and interact with the block below:
          </h2>
          
          {/* Render ParagraphTestBlock directly */}
          {blocks.map((block) => (
            <ParagraphTestBlock
              key={block.id}
              id={block.id}
              content={block.content.text}
              onChange={(content, attrs) => {
                setBlocks(blocks.map(b => 
                  b.id === block.id 
                    ? { ...b, content: { text: content }, attributes: { ...b.attributes, ...attrs } }
                    : b
                ));
              }}
              onDelete={() => {
                setBlocks(blocks.filter(b => b.id !== block.id));
              }}
              onDuplicate={() => {
                const newBlock = {
                  ...block,
                  id: `block-${Date.now()}`,
                };
                setBlocks([...blocks, newBlock]);
              }}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
              onAddBlock={() => {
                const newBlock = {
                  id: `block-${Date.now()}`,
                  type: 'core/paragraph-test',
                  content: { text: '' },
                  attributes: {}
                };
                setBlocks([...blocks, newBlock]);
              }}
              isSelected={true}
              onSelect={() => {}}
              attributes={block.attributes}
            />
          ))}
          
          <div className="mt-8 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Features to test:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Click to edit text inline</li>
              <li>Hover to see floating toolbar</li>
              <li>Use formatting buttons (Bold, Italic, Link)</li>
              <li>Check settings panel on the right</li>
              <li>Test keyboard shortcuts (Ctrl+B, Ctrl+I)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParagraphTestDirect;