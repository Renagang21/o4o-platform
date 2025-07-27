import { useState, FC } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Move, 
  Copy, 
  Trash2,
  Type,
  Image,
  Layout,
  Columns,
  Grid,
  Heart,
  Star,
  FileText,
  Code,
  List,
  Quote,
  Table,
  Video,
  Music,
  Map,
  ShoppingCart,
  Users
} from 'lucide-react';
import { clsx } from 'clsx';

// Spectra block types
const SPECTRA_BLOCKS = [
  { id: 'uagb/advanced-heading', name: 'Advanced Heading', icon: Type, category: 'text' },
  { id: 'uagb/info-box', name: 'Info Box', icon: FileText, category: 'layout' },
  { id: 'uagb/testimonial', name: 'Testimonial', icon: Quote, category: 'text' },
  { id: 'uagb/team', name: 'Team', icon: Users, category: 'layout' },
  { id: 'uagb/social-share', name: 'Social Share', icon: Heart, category: 'social' },
  { id: 'uagb/google-map', name: 'Google Map', icon: Map, category: 'embed' },
  { id: 'uagb/icon-list', name: 'Icon List', icon: List, category: 'text' },
  { id: 'uagb/price-list', name: 'Price List', icon: ShoppingCart, category: 'layout' },
  { id: 'uagb/post-carousel', name: 'Post Carousel', icon: Grid, category: 'layout' },
  { id: 'uagb/table-of-contents', name: 'Table of Contents', icon: List, category: 'text' },
  { id: 'uagb/timeline', name: 'Timeline', icon: FileText, category: 'layout' },
  { id: 'uagb/blockquote', name: 'Blockquote', icon: Quote, category: 'text' },
  { id: 'uagb/call-to-action', name: 'Call To Action', icon: Star, category: 'layout' },
  { id: 'uagb/columns', name: 'Advanced Columns', icon: Columns, category: 'layout' },
  { id: 'uagb/section', name: 'Section', icon: Layout, category: 'layout' }
];

// Core WordPress blocks
const CORE_BLOCKS = [
  { id: 'core/paragraph', name: 'Paragraph', icon: Type, category: 'text' },
  { id: 'core/heading', name: 'Heading', icon: Type, category: 'text' },
  { id: 'core/list', name: 'List', icon: List, category: 'text' },
  { id: 'core/quote', name: 'Quote', icon: Quote, category: 'text' },
  { id: 'core/code', name: 'Code', icon: Code, category: 'text' },
  { id: 'core/image', name: 'Image', icon: Image, category: 'media' },
  { id: 'core/gallery', name: 'Gallery', icon: Grid, category: 'media' },
  { id: 'core/video', name: 'Video', icon: Video, category: 'media' },
  { id: 'core/audio', name: 'Audio', icon: Music, category: 'media' },
  { id: 'core/columns', name: 'Columns', icon: Columns, category: 'design' },
  { id: 'core/group', name: 'Group', icon: Layout, category: 'design' },
  { id: 'core/table', name: 'Table', icon: Table, category: 'text' }
];

interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: any;
}

interface GutenbergEditorProps {
  initialBlocks?: Block[];
  onChange?: (blocks: Block[]) => void;
}

const GutenbergEditor: FC<GutenbergEditorProps> = ({ 
  initialBlocks = [], 
  onChange 
}) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [showBlockInserter, setShowBlockInserter] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const allBlocks = [...CORE_BLOCKS, ...SPECTRA_BLOCKS];
  const categories = ['all', 'text', 'media', 'design', 'layout', 'social', 'embed'];

  const filteredBlocks = activeCategory === 'all' 
    ? allBlocks 
    : allBlocks.filter(block => block.category === activeCategory);

  const addBlock = (blockType: string) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type: blockType,
      content: getDefaultContent(blockType),
      attributes: {}
    };
    
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    setShowBlockInserter(false);
    onChange?.(newBlocks);
  };

  const getDefaultContent = (blockType: string) => {
    switch (blockType) {
      case 'core/paragraph':
        return { text: 'Start writing or type / to choose a block' };
      case 'core/heading':
        return { text: 'Heading', level: 2 };
      case 'uagb/advanced-heading':
        return { text: 'Advanced Heading', level: 2, alignment: 'center' };
      default:
        return {};
    }
  };

  const deleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter(block => block.id !== blockId);
    setBlocks(newBlocks);
    onChange?.(newBlocks);
  };

  const duplicateBlock = (blockId: string) => {
    const blockIndex = blocks.findIndex(block => block.id === blockId);
    if (blockIndex !== -1) {
      const blockToDuplicate = blocks[blockIndex];
      const newBlock = {
        ...blockToDuplicate,
        id: `block-${Date.now()}`
      };
      const newBlocks = [
        ...blocks.slice(0, blockIndex + 1),
        newBlock,
        ...blocks.slice(blockIndex + 1)
      ];
      setBlocks(newBlocks);
      onChange?.(newBlocks);
    }
  };

  const renderBlock = (block: Block) => {
    const Icon = allBlocks.find(b => b.id === block.type)?.icon || FileText;
    
    return (
      <div
        key={block.id}
        className={clsx(
          'group relative border-2 rounded-lg p-4 mb-4 transition-all',
          selectedBlockId === block.id
            ? 'border-modern-primary bg-modern-primary-alpha'
            : 'border-transparent hover:border-modern-border-primary'
        )}
        onClick={() => setSelectedBlockId(block.id)}
      >
        {/* Block Toolbar */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 bg-modern-bg-card border border-modern-border-primary rounded-lg shadow-modern-shadow p-1">
            <button className="p-1 hover:bg-modern-bg-hover rounded">
              <Move className="w-4 h-4 text-modern-text-secondary" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                duplicateBlock(block.id);
              }}
              className="p-1 hover:bg-modern-bg-hover rounded"
            >
              <Copy className="w-4 h-4 text-modern-text-secondary" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                deleteBlock(block.id);
              }}
              className="p-1 hover:bg-modern-bg-hover rounded"
            >
              <Trash2 className="w-4 h-4 text-modern-error" />
            </button>
            <button className="p-1 hover:bg-modern-bg-hover rounded">
              <MoreVertical className="w-4 h-4 text-modern-text-secondary" />
            </button>
          </div>
        </div>

        {/* Block Content */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-modern-bg-tertiary rounded flex items-center justify-center">
            <Icon className="w-4 h-4 text-modern-text-secondary" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-modern-text-tertiary mb-1">
              {allBlocks.find(b => b.id === block.type)?.name}
            </div>
            {block.type.includes('heading') && (
              <h2 className="text-2xl font-bold text-modern-text-primary">
                {block.content.text}
              </h2>
            )}
            {block.type.includes('paragraph') && (
              <p className="text-modern-text-primary">
                {block.content.text}
              </p>
            )}
            {/* Add more block type renderers as needed */}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="gutenberg-editor bg-modern-bg-card rounded-lg">
      {/* Editor Toolbar */}
      <div className="border-b border-modern-border-primary p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-modern-text-primary">Block Editor</h3>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm border border-modern-border-primary rounded hover:bg-modern-bg-hover">
              Preview
            </button>
            <button className="px-3 py-1.5 text-sm bg-modern-primary text-white rounded hover:bg-modern-primary-hover">
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-8 min-h-[400px]">
        {blocks.map(renderBlock)}
        
        {/* Add Block Button */}
        <div className="relative">
          <button
            onClick={() => setShowBlockInserter(!showBlockInserter)}
            className={clsx(
              'w-full py-4 border-2 border-dashed rounded-lg transition-all',
              'hover:border-modern-primary hover:bg-modern-primary-alpha',
              'flex items-center justify-center gap-2',
              showBlockInserter 
                ? 'border-modern-primary bg-modern-primary-alpha' 
                : 'border-modern-border-secondary'
            )}
          >
            <Plus className="w-5 h-5 text-modern-text-secondary" />
            <span className="text-modern-text-secondary">Add block</span>
          </button>

          {/* Block Inserter Panel */}
          {showBlockInserter && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-modern-bg-card border border-modern-border-primary rounded-lg shadow-modern-shadow-xl z-50">
              <div className="p-4">
                {/* Category Tabs */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-modern-border-primary">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={clsx(
                        'px-3 py-1.5 text-sm rounded transition-colors capitalize',
                        activeCategory === category
                          ? 'bg-modern-primary text-white'
                          : 'text-modern-text-secondary hover:bg-modern-bg-hover'
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Block Grid */}
                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {filteredBlocks.map(block => {
                    const Icon = block.icon;
                    return (
                      <button
                        key={block.id}
                        onClick={() => addBlock(block.id)}
                        className="flex flex-col items-center gap-2 p-4 border border-modern-border-primary rounded-lg hover:border-modern-primary hover:bg-modern-bg-hover transition-all"
                      >
                        <Icon className="w-6 h-6 text-modern-text-secondary" />
                        <span className="text-xs text-modern-text-secondary text-center">
                          {block.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GutenbergEditor;