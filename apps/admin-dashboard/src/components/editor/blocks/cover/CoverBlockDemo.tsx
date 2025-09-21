/**
 * Cover Block Demo Component
 * Test and showcase the complete Cover Block implementation
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, Save, Eye, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EnhancedCoverBlock from '../EnhancedCoverBlock';
import { CoverBlockAttributes, DEFAULT_COVER_ATTRIBUTES } from './types';

const CoverBlockDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('demo-cover-1');
  const [showCode, setShowCode] = useState(false);

  // Demo block data
  const [demoBlocks, setDemoBlocks] = useState([
    {
      id: 'demo-cover-1',
      content: '',
      attributes: {
        ...DEFAULT_COVER_ATTRIBUTES,
        backgroundType: 'gradient' as const,
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        overlay: {
          opacity: 30,
          blendMode: 'normal' as const
        },
        layout: {
          minHeight: 500,
          aspectRatio: 'auto' as const,
          contentPosition: 'center-center' as const,
          hasParallax: false,
          allowResize: true
        },
        innerBlocks: [
          {
            id: 'heading-1',
            type: 'core/heading',
            content: 'Welcome to Our Platform',
            attributes: {
              level: 1,
              align: 'center',
              color: '#ffffff',
              fontSize: 'xx-large'
            }
          },
          {
            id: 'paragraph-1',
            type: 'core/paragraph',
            content: 'Experience the power of modern web development with our enhanced Cover Block.',
            attributes: {
              align: 'center',
              color: '#ffffff',
              fontSize: 'large'
            }
          },
          {
            id: 'button-1',
            type: 'core/button',
            content: 'Get Started',
            attributes: {
              align: 'center',
              backgroundColor: '#ffffff',
              textColor: '#667eea',
              borderRadius: 8,
              text: 'Get Started'
            }
          }
        ]
      } as CoverBlockAttributes
    },
    {
      id: 'demo-cover-2',
      content: '',
      attributes: {
        ...DEFAULT_COVER_ATTRIBUTES,
        backgroundType: 'color' as const,
        backgroundColor: '#1f2937',
        overlay: {
          opacity: 0,
          blendMode: 'normal' as const
        },
        layout: {
          minHeight: 400,
          aspectRatio: '16:9' as const,
          contentPosition: 'bottom-left' as const,
          hasParallax: false,
          allowResize: true
        },
        innerBlocks: [
          {
            id: 'heading-2',
            type: 'core/heading',
            content: 'Professional Design',
            attributes: {
              level: 2,
              align: 'left',
              color: '#ffffff',
              fontSize: 'x-large'
            }
          },
          {
            id: 'paragraph-2',
            type: 'core/paragraph',
            content: 'Clean, modern layouts that adapt to any screen size.',
            attributes: {
              align: 'left',
              color: '#d1d5db',
              fontSize: 'medium'
            }
          }
        ]
      } as CoverBlockAttributes
    }
  ]);

  // Handle block change
  const handleBlockChange = (blockId: string, content: string, attributes?: any) => {
    setDemoBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, content, attributes: attributes || block.attributes }
          : block
      )
    );
  };

  // Handle block actions
  const handleBlockSelect = (blockId: string) => {
    setSelectedBlockId(blockId);
  };

  const handleBlockDelete = (blockId: string) => {
    setDemoBlocks(blocks => blocks.filter(block => block.id !== blockId));
    setSelectedBlockId('');
  };

  const handleBlockDuplicate = (blockId: string) => {
    const blockIndex = demoBlocks.findIndex(block => block.id === blockId);
    if (blockIndex === -1) return;

    const originalBlock = demoBlocks[blockIndex];
    const newBlock = {
      ...originalBlock,
      id: `${originalBlock.id}-copy-${Date.now()}`,
    };

    setDemoBlocks(blocks => [
      ...blocks.slice(0, blockIndex + 1),
      newBlock,
      ...blocks.slice(blockIndex + 1)
    ]);
  };

  const handleBlockMove = (blockId: string, direction: 'up' | 'down') => {
    const blockIndex = demoBlocks.findIndex(block => block.id === blockId);
    if (blockIndex === -1) return;

    const newIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
    if (newIndex < 0 || newIndex >= demoBlocks.length) return;

    const newBlocks = [...demoBlocks];
    const [movedBlock] = newBlocks.splice(blockIndex, 1);
    newBlocks.splice(newIndex, 0, movedBlock);
    setDemoBlocks(newBlocks);
  };

  const handleAddBlock = (position: 'before' | 'after', type?: string) => {
    const newBlock = {
      id: `demo-cover-${Date.now()}`,
      content: '',
      attributes: {
        ...DEFAULT_COVER_ATTRIBUTES,
        backgroundType: 'color' as const,
        backgroundColor: '#374151',
        innerBlocks: [
          {
            id: `heading-${Date.now()}`,
            type: 'core/heading',
            content: 'New Cover Block',
            attributes: {
              level: 2,
              align: 'center',
              color: '#ffffff',
              fontSize: 'large'
            }
          }
        ]
      } as CoverBlockAttributes
    };

    if (position === 'after') {
      setDemoBlocks(blocks => [...blocks, newBlock]);
    } else {
      setDemoBlocks(blocks => [newBlock, ...blocks]);
    }
  };

  // Reset demo
  const resetDemo = () => {
    setDemoBlocks([
      {
        id: 'demo-cover-1',
        content: '',
        attributes: {
          ...DEFAULT_COVER_ATTRIBUTES,
          backgroundType: 'gradient' as const,
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          overlay: { opacity: 30, blendMode: 'normal' as const },
          layout: {
            minHeight: 500,
            aspectRatio: 'auto' as const,
            contentPosition: 'center-center' as const,
            hasParallax: false,
            allowResize: true
          },
          innerBlocks: [
            {
              id: 'heading-1',
              type: 'core/heading',
              content: 'Welcome to Our Platform',
              attributes: { level: 1, align: 'center', color: '#ffffff', fontSize: 'xx-large' }
            }
          ]
        } as CoverBlockAttributes
      }
    ]);
    setSelectedBlockId('demo-cover-1');
  };

  // Export demo data
  const exportDemo = () => {
    const demoData = {
      blocks: demoBlocks,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(demoData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cover-block-demo.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cover-block-demo w-full min-h-screen bg-gray-50">
      {/* Demo Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Enhanced Cover Block Demo</h1>
            <p className="text-sm text-gray-600 mt-1">
              WordPress Gutenberg-compatible Cover Block with 90% similarity
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCode(!showCode)}
            >
              <Code className="h-4 w-4 mr-2" />
              {showCode ? 'Hide' : 'Show'} Code
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportDemo}
            >
              <Save className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={resetDemo}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>

            <Button
              variant={isPlaying ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Demo Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Demo Info */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h2 className="text-sm font-medium text-blue-800 mb-2">Demo Features</h2>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Background media support (Image, Video, Color, Gradient)</li>
                <li>• Advanced overlay engine with Duotone filters and blend modes</li>
                <li>• Focal point system for precise image positioning</li>
                <li>• 3x3 positioning grid for content placement</li>
                <li>• Inner blocks support (Heading, Paragraph, Button)</li>
                <li>• Responsive design with aspect ratio controls</li>
                <li>• WordPress Gutenberg compatibility</li>
                <li>• ACF integration for dynamic content</li>
              </ul>
            </div>

            {/* Demo Blocks */}
            <div className="space-y-6">
              {demoBlocks.map((block, index) => (
                <div key={block.id} className="border border-gray-300 rounded-lg overflow-hidden">
                  <EnhancedCoverBlock
                    id={block.id}
                    content={block.content}
                    onChange={(content, attributes) => handleBlockChange(block.id, content, attributes)}
                    onDelete={() => handleBlockDelete(block.id)}
                    onDuplicate={() => handleBlockDuplicate(block.id)}
                    onMoveUp={() => handleBlockMove(block.id, 'up')}
                    onMoveDown={() => handleBlockMove(block.id, 'down')}
                    onAddBlock={handleAddBlock}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => handleBlockSelect(block.id)}
                    attributes={block.attributes}
                    canMoveUp={index > 0}
                    canMoveDown={index < demoBlocks.length - 1}
                  />
                </div>
              ))}

              {/* Add New Block */}
              <div className="text-center py-8">
                <Button
                  variant="outline"
                  onClick={() => handleAddBlock('after')}
                >
                  Add New Cover Block
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Code Preview */}
        {showCode && (
          <div className="w-96 bg-gray-900 text-green-400 font-mono text-xs overflow-y-auto">
            <div className="p-4">
              <h3 className="text-white font-bold mb-3">Block Data Structure</h3>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(
                  demoBlocks.find(block => block.id === selectedBlockId) || demoBlocks[0],
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Demo Stats */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-6">
            <span>Blocks: {demoBlocks.length}</span>
            <span>Selected: {selectedBlockId || 'None'}</span>
            <span>Status: {isPlaying ? 'Live' : 'Paused'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>Cover Block Demo v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverBlockDemo;