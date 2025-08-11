import { FC, useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Type, 
  Image, 
  List, 
  Columns, 
  Code, 
  Quote,
  FileText,
  Video,
  Music,
  Download,
  Maximize2,
  Minimize2,
  Settings,
  MoreVertical,
  Move,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Search,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Link,
  Grid,
  RotateCcw
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: any;
}

interface BlockType {
  id: string;
  title: string;
  icon: React.ReactNode;
  category: string;
  description?: string;
}

const blockTypes: BlockType[] = [
  { id: 'paragraph', title: '단락', icon: <Type className="w-5 h-5" />, category: 'text', description: '텍스트 단락을 추가합니다' },
  { id: 'heading', title: '제목', icon: <Heading1 className="w-5 h-5" />, category: 'text', description: '제목을 추가합니다' },
  { id: 'image', title: '이미지', icon: <Image className="w-5 h-5" />, category: 'media', description: '이미지를 업로드하거나 선택합니다' },
  { id: 'list', title: '목록', icon: <List className="w-5 h-5" />, category: 'text', description: '순서가 있거나 없는 목록을 만듭니다' },
  { id: 'quote', title: '인용', icon: <Quote className="w-5 h-5" />, category: 'text', description: '인용문을 추가합니다' },
  { id: 'code', title: '코드', icon: <Code className="w-5 h-5" />, category: 'text', description: '코드 블록을 추가합니다' },
  { id: 'columns', title: '컬럼', icon: <Columns className="w-5 h-5" />, category: 'layout', description: '여러 컬럼 레이아웃을 만듭니다' },
  { id: 'video', title: '비디오', icon: <Video className="w-5 h-5" />, category: 'media', description: '비디오를 삽입합니다' },
  { id: 'audio', title: '오디오', icon: <Music className="w-5 h-5" />, category: 'media', description: '오디오 파일을 추가합니다' },
  { id: 'file', title: '파일', icon: <Download className="w-5 h-5" />, category: 'media', description: '다운로드 가능한 파일을 추가합니다' },
  { id: 'spacer', title: '여백', icon: <Grid className="w-5 h-5" />, category: 'layout', description: '블록 사이에 여백을 추가합니다' },
];

const categories = [
  { id: 'text', title: '텍스트' },
  { id: 'media', title: '미디어' },
  { id: 'layout', title: '레이아웃' },
];

interface GutenbergStyleEditorProps {
  initialBlocks?: Block[];
  onChange?: (blocks: Block[]) => void;
  onSave?: (blocks: Block[]) => void;
  content?: string; // For compatibility with existing forms
  onContentChange?: (content: string) => void; // For form integration
}

// Helper functions for content parsing and serialization
const parseHTMLToBlocks = (html: string): Block[] => {
  if (!html || !html.trim()) return [];
  
  // Check if content contains WordPress block comments
  const blockRegex = /<!-- wp:([a-z0-9-]+\/[a-z0-9-]+)(\s+({[^}]*}))?\s*-->([\s\S]*?)<!-- \/wp:\1 -->/g;
  const matches = [...html.matchAll(blockRegex)];
  
  if (matches.length > 0) {
    return matches.map((match, index) => {
      const blockType = match[1];
      const attributesJson = match[3];
      const blockContent = match[4].trim();
      
      let attributes = {};
      if (attributesJson) {
        try {
          attributes = JSON.parse(attributesJson);
        } catch {
          // Ignore parse errors
        }
      }
      
      // Parse content based on block type
      let content: any = {};
      if (blockType === 'core/paragraph') {
        const text = blockContent.replace(/<[^>]*>/g, '');
        content = { text };
      } else if (blockType === 'core/heading') {
        const level = blockContent.match(/<h(\d)/)?.[1];
        const text = blockContent.replace(/<[^>]*>/g, '');
        content = { text, level: level ? parseInt(level) : 2 };
      } else {
        content = { text: blockContent };
      }
      
      return {
        id: `block-${Date.now()}-${index}`,
        type: blockType === 'core/paragraph' ? 'paragraph' : 
              blockType === 'core/heading' ? 'heading' : 
              blockType.replace('core/', ''),
        content,
        attributes
      };
    });
  }
  
  // Fallback: Create paragraph block with content
  return [{
    id: `block-${Date.now()}`,
    type: 'paragraph',
    content: { text: html.replace(/<[^>]*>/g, '') }
  }];
};

const serializeBlocksToHTML = (blocks: Block[]): string => {
  return blocks.map(block => {
    const blockName = block.type === 'paragraph' ? 'core/paragraph' :
                     block.type === 'heading' ? 'core/heading' :
                     `core/${block.type}`;
    
    let html = `<!-- wp:${blockName}`;
    if (block.attributes && Object.keys(block.attributes).length > 0) {
      html += ` ${JSON.stringify(block.attributes)}`;
    }
    html += ' -->\n';
    
    if (block.type === 'paragraph') {
      html += `<p>${block.content.text || ''}</p>`;
    } else if (block.type === 'heading') {
      const level = block.content.level || 2;
      html += `<h${level}>${block.content.text || ''}</h${level}>`;
    } else if (block.type === 'list') {
      html += `<ul>${(block.content.items || []).map((item: string) => `<li>${item}</li>`).join('')}</ul>`;
    } else if (block.type === 'quote') {
      html += `<blockquote class="wp-block-quote"><p>${block.content.text || ''}</p>`;
      if (block.content.citation) {
        html += `<cite>${block.content.citation}</cite>`;
      }
      html += '</blockquote>';
    } else if (block.type === 'image') {
      html += `<figure class="wp-block-image"><img src="${block.content.url || ''}" alt="${block.content.alt || ''}"/>`;
      if (block.content.caption) {
        html += `<figcaption>${block.content.caption}</figcaption>`;
      }
      html += '</figure>';
    } else {
      html += `<div>${block.content.text || ''}</div>`;
    }
    
    html += `\n<!-- /wp:${blockName} -->\n`;
    return html;
  }).join('\n');
};

const GutenbergStyleEditor: FC<GutenbergStyleEditorProps> = ({
  initialBlocks = [],
  onChange,
  onSave,
  content,
  onContentChange
}) => {
  // Initialize blocks from content or initialBlocks
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (content) {
      return parseHTMLToBlocks(content);
    }
    return initialBlocks;
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBlockInserter, setShowBlockInserter] = useState(false);
  const [inserterPosition, setInserterPosition] = useState<{ x: number; y: number } | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Filter block types based on search and category
  const filteredBlockTypes = blockTypes.filter(block => {
    const matchesSearch = !searchTerm || 
      block.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || block.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Update blocks and trigger callbacks
  const updateBlocks = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    if (onChange) onChange(newBlocks);
    if (onContentChange) onContentChange(serializeBlocksToHTML(newBlocks));
  };

  // Add new block
  const addBlock = (type: string, index?: number) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      attributes: {}
    };

    const newBlocks = [...blocks];
    if (index !== undefined) {
      newBlocks.splice(index, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }

    updateBlocks(newBlocks);
    setShowBlockInserter(false);
    setInserterPosition(null);
    setInsertIndex(null);
    setSelectedBlockId(newBlock.id);
  };

  // Get default content for block type
  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'paragraph':
        return { text: '' };
      case 'heading':
        return { text: '', level: 2 };
      case 'image':
        return { url: '', alt: '', caption: '' };
      case 'list':
        return { items: [''], ordered: false };
      case 'quote':
        return { text: '', citation: '' };
      case 'code':
        return { code: '', language: 'javascript' };
      case 'columns':
        return { columns: 2, content: [] };
      default:
        return {};
    }
  };

  // Update block content
  const updateBlock = (blockId: string, content: any) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, content } : block
    );
    updateBlocks(newBlocks);
  };

  // Delete block
  const deleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter(block => block.id !== blockId);
    updateBlocks(newBlocks);
    setSelectedBlockId(null);
  };

  // Duplicate block
  const duplicateBlock = (blockId: string) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;

    const block = blocks[blockIndex];
    const newBlock: Block = {
      ...block,
      id: `block-${Date.now()}`,
      content: { ...block.content }
    };

    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    updateBlocks(newBlocks);
  };

  // Move block up/down
  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(index, 1);
    newBlocks.splice(newIndex, 0, removed);
    
    updateBlocks(newBlocks);
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedBlockId) return;

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    if (draggedIndex === -1) return;

    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, removed);
    
    updateBlocks(newBlocks);
    setDraggedBlockId(null);
  };

  // Show block inserter at position
  const showInserter = (e: React.MouseEvent, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setInserterPosition({ x: rect.left + rect.width / 2, y: rect.top });
    setInsertIndex(index);
    setShowBlockInserter(true);
  };

  // Block Inserter Popup
  const BlockInserterPopup = () => {
    if (!showBlockInserter) return null;

    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowBlockInserter(false)}
        />
        
        {/* Popup */}
        <div 
          className="fixed z-50 bg-white rounded-lg shadow-xl border w-80 max-h-96 overflow-hidden"
          style={{
            left: inserterPosition ? `${inserterPosition.x - 160}px` : '50%',
            top: inserterPosition ? `${inserterPosition.y + 20}px` : '50%',
            transform: !inserterPosition ? 'translate(-50%, -50%)' : undefined
          }}
        >
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="블록 검색..."
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 p-3 border-b">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                !selectedCategory ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              모두
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full transition-colors",
                  selectedCategory === cat.id ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {cat.title}
              </button>
            ))}
          </div>

          {/* Block Types */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredBlockTypes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                검색 결과가 없습니다
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredBlockTypes.map(blockType => (
                  <button
                    key={blockType.id}
                    onClick={() => addBlock(blockType.id, insertIndex ?? undefined)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <div className="text-gray-600 group-hover:text-blue-600 transition-colors">
                      {blockType.icon}
                    </div>
                    <span className="text-xs text-gray-700">{blockType.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  // Block Renderer
  const BlockRenderer: FC<{ block: Block; index: number }> = ({ block, index }) => {
    const isSelected = selectedBlockId === block.id;

    return (
      <div
        className={cn(
          "group relative transition-all",
          isSelected && "ring-2 ring-blue-500 ring-offset-2"
        )}
        onClick={() => setSelectedBlockId(block.id)}
        draggable
        onDragStart={(e) => handleDragStart(e, block.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, index)}
      >
        {/* Block Controls */}
        <div className={cn(
          "absolute -left-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
          isSelected && "opacity-100"
        )}>
          <button
            className="p-1 hover:bg-gray-200 rounded"
            onMouseDown={(e) => {
              e.preventDefault();
              handleDragStart(e as any, block.id);
            }}
          >
            <Move className="w-4 h-4" />
          </button>
          <button
            className="p-1 hover:bg-gray-200 rounded"
            onClick={() => moveBlock(block.id, 'up')}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            className="p-1 hover:bg-gray-200 rounded"
            onClick={() => moveBlock(block.id, 'down')}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Block Toolbar */}
        {isSelected && (
          <div className="absolute -top-10 left-0 flex items-center gap-1 bg-white border rounded-lg shadow-lg p-1 z-10">
            {block.type === 'paragraph' && (
              <>
                <button className="p-1.5 hover:bg-gray-100 rounded">
                  <Bold className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded">
                  <Italic className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded">
                  <Link className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-gray-300 mx-1" />
                <button className="p-1.5 hover:bg-gray-100 rounded">
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded">
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded">
                  <AlignRight className="w-4 h-4" />
                </button>
              </>
            )}
            {block.type === 'heading' && (
              <>
                <button className="p-1.5 hover:bg-gray-100 rounded">
                  <Heading1 className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded">
                  <Heading2 className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded">
                  <Heading3 className="w-4 h-4" />
                </button>
              </>
            )}
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button 
              className="p-1.5 hover:bg-gray-100 rounded"
              onClick={() => duplicateBlock(block.id)}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              className="p-1.5 hover:bg-gray-100 rounded text-red-600"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Block Content */}
        <div className="min-h-[60px] p-4 bg-white border rounded-lg">
          {block.type === 'paragraph' && (
            <div
              contentEditable
              className="outline-none"
              dangerouslySetInnerHTML={{ __html: block.content.text || '단락을 입력하세요...' }}
              onBlur={(e) => updateBlock(block.id, { text: e.currentTarget.innerHTML })}
            />
          )}
          {block.type === 'heading' && (
            <h2
              contentEditable
              className="text-2xl font-bold outline-none"
              dangerouslySetInnerHTML={{ __html: block.content.text || '제목을 입력하세요...' }}
              onBlur={(e) => updateBlock(block.id, { ...block.content, text: e.currentTarget.innerHTML })}
            />
          )}
          {block.type === 'image' && (
            <div className="text-center py-8 bg-gray-50 rounded">
              <Image className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">이미지를 업로드하거나 선택하세요</p>
              <Button variant="outline" size="sm" className="mt-2">
                미디어 라이브러리
              </Button>
            </div>
          )}
          {block.type === 'list' && (
            <ul className="list-disc list-inside">
              {block.content.items?.map((item: string, i: number) => (
                <li key={i}>{item || '목록 항목'}</li>
              ))}
            </ul>
          )}
          {block.type === 'quote' && (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic">
              <p>{block.content.text || '인용문을 입력하세요...'}</p>
              {block.content.citation && (
                <cite className="text-sm text-gray-600">— {block.content.citation}</cite>
              )}
            </blockquote>
          )}
          {block.type === 'code' && (
            <pre className="bg-gray-900 text-white p-4 rounded overflow-x-auto">
              <code>{block.content.code || '// 코드를 입력하세요'}</code>
            </pre>
          )}
        </div>

        {/* Add block button between blocks */}
        <div 
          className="relative h-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            showInserter(e, index + 1);
          }}
        >
          <button className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "gutenberg-editor flex h-screen bg-gray-50",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBlockInserter(!showBlockInserter)}
              className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="w-px h-8 bg-gray-300 mx-2" />
            <button className="p-2 hover:bg-gray-100 rounded">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSave && onSave(blocks)}
            >
              저장
            </Button>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Title */}
            <input
              type="text"
              placeholder="제목을 입력하세요"
              className="w-full text-4xl font-bold mb-8 outline-none bg-transparent"
            />

            {/* Blocks */}
            <div className="space-y-2 relative" ref={editorRef}>
              {blocks.length === 0 ? (
                <div 
                  className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => setShowBlockInserter(true)}
                >
                  <Plus className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">블록을 추가하려면 클릭하세요</p>
                  <p className="text-sm text-gray-500 mt-2">또는 "/" 를 입력하여 빠르게 추가</p>
                </div>
              ) : (
                blocks.map((block, index) => (
                  <BlockRenderer key={block.id} block={block} index={index} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">블록 설정</h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {selectedBlockId ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  선택된 블록: {blocks.find(b => b.id === selectedBlockId)?.type}
                </p>
                {/* Block specific settings would go here */}
              </div>
            ) : (
              <p className="text-sm text-gray-500">블록을 선택하여 설정을 편집하세요</p>
            )}
          </div>
        </div>
      )}

      {/* Block Inserter Popup */}
      <BlockInserterPopup />
    </div>
  );
};

export default GutenbergStyleEditor;