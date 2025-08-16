/**
 * GutenbergBlockEditor Component
 * Complete WYSIWYG editor with inline editing for all blocks
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Plus,
  Save,
  Eye,
  Maximize2,
  Settings,
  Type,
  Heading1,
  Image,
  List,
  Code,
  Quote,
  Video,
  Table,
  Columns,
  FileText,
  MousePointer,
  MinusSquare,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Import block components
import ParagraphBlock from './blocks/ParagraphBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ImageBlock from './blocks/ImageBlock';
import ButtonBlock from './blocks/ButtonBlock';
import ListBlock from './blocks/ListBlock';

interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: any;
}

interface GutenbergBlockEditorProps {
  initialBlocks?: Block[];
  title?: string;
  onChange?: (blocks: Block[]) => void;
  onTitleChange?: (title: string) => void;
  onSave?: () => void;
  autoSave?: boolean;
  showInspector?: boolean;
  fullScreen?: boolean;
}

const GutenbergBlockEditor: React.FC<GutenbergBlockEditorProps> = ({
  initialBlocks = [],
  title = '',
  onChange,
  onTitleChange,
  onSave,
  autoSave = true,
  showInspector = false,
  fullScreen = false
}) => {
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks.length > 0 ? initialBlocks : [
      { id: '1', type: 'paragraph', content: '', attributes: {} }
    ]
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBlockInserter, setShowBlockInserter] = useState(false);
  const [inserterPosition, setInserterPosition] = useState<{ x: number; y: number } | null>(null);
  const [inserterTargetId, setInserterTargetId] = useState<string | null>(null);
  const [inserterTargetPosition, setInserterTargetPosition] = useState<'before' | 'after'>('after');
  const [documentTitle, setDocumentTitle] = useState(title);
  const [isFullScreen, setIsFullScreen] = useState(fullScreen);
  const [showSettings, setShowSettings] = useState(showInspector);
  const editorRef = useRef<HTMLDivElement>(null);

  // Auto-save timer
  useEffect(() => {
    if (!autoSave) return;

    const timer = setTimeout(() => {
      onSave?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [blocks, documentTitle, autoSave, onSave]);

  // Update blocks
  const updateBlock = (blockId: string, content: any, attributes?: any) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId
        ? { ...block, content, attributes: attributes || block.attributes }
        : block
    );
    setBlocks(newBlocks);
    onChange?.(newBlocks);
  };

  // Add block
  const addBlock = (type: string, position: 'before' | 'after', targetId?: string) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: type === 'image' ? {} : '',
      attributes: getDefaultAttributes(type)
    };

    if (targetId) {
      const index = blocks.findIndex(b => b.id === targetId);
      const newBlocks = [...blocks];
      
      if (position === 'before') {
        newBlocks.splice(index, 0, newBlock);
      } else {
        newBlocks.splice(index + 1, 0, newBlock);
      }
      
      setBlocks(newBlocks);
      onChange?.(newBlocks);
      setSelectedBlockId(newBlock.id);
    } else {
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      onChange?.(newBlocks);
      setSelectedBlockId(newBlock.id);
    }

    setShowBlockInserter(false);
  };

  // Get default attributes for block type
  const getDefaultAttributes = (type: string) => {
    switch (type) {
      case 'heading':
        return { level: 2, align: 'left' };
      case 'list':
        return { type: 'unordered', items: [{ id: '1', content: '', level: 0 }] };
      case 'button':
        return { text: '버튼 텍스트', url: '#', style: 'fill', size: 'medium' };
      case 'image':
        return { align: 'center', size: 'large' };
      default:
        return {};
    }
  };

  // Delete block
  const deleteBlock = (blockId: string) => {
    if (blocks.length === 1) {
      // Don't delete the last block, just clear it
      const newBlocks = [{ id: blockId, type: 'paragraph', content: '', attributes: {} }];
      setBlocks(newBlocks);
      onChange?.(newBlocks);
    } else {
      const newBlocks = blocks.filter(b => b.id !== blockId);
      setBlocks(newBlocks);
      onChange?.(newBlocks);
    }
  };

  // Duplicate block
  const duplicateBlock = (blockId: string) => {
    const blockToDuplicate = blocks.find(b => b.id === blockId);
    if (!blockToDuplicate) return;

    const newBlock: Block = {
      ...blockToDuplicate,
      id: Date.now().toString()
    };

    const index = blocks.findIndex(b => b.id === blockId);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    
    setBlocks(newBlocks);
    onChange?.(newBlocks);
    setSelectedBlockId(newBlock.id);
  };

  // Move block
  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    
    setBlocks(newBlocks);
    onChange?.(newBlocks);
  };

  // Open block inserter
  const openBlockInserter = (targetId: string, position: 'before' | 'after', event?: React.MouseEvent) => {
    setInserterTargetId(targetId);
    setInserterTargetPosition(position);
    
    if (event) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setInserterPosition({ x: rect.left, y: rect.bottom + 5 });
    }
    
    setShowBlockInserter(true);
  };

  // Handle slash command
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && selectedBlockId) {
        const block = blocks.find(b => b.id === selectedBlockId);
        if (block && block.type === 'paragraph' && !block.content) {
          e.preventDefault();
          openBlockInserter(selectedBlockId, 'after');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, blocks]);

  // Render block component
  const renderBlock = (block: Block) => {
    const commonProps = {
      id: block.id,
      isSelected: selectedBlockId === block.id,
      onSelect: () => setSelectedBlockId(block.id),
      onDelete: () => deleteBlock(block.id),
      onDuplicate: () => duplicateBlock(block.id),
      onMoveUp: () => moveBlock(block.id, 'up'),
      onMoveDown: () => moveBlock(block.id, 'down'),
      onAddBlock: (position: 'before' | 'after') => openBlockInserter(block.id, position),
      onChange: (content: any, attributes?: any) => updateBlock(block.id, content, attributes)
    };

    switch (block.type) {
      case 'paragraph':
        return (
          <ParagraphBlock
            {...commonProps}
            content={block.content}
            attributes={block.attributes}
          />
        );
      
      case 'heading':
        return (
          <HeadingBlock
            {...commonProps}
            content={block.content}
            attributes={block.attributes}
          />
        );
      
      case 'image':
        return (
          <ImageBlock
            {...commonProps}
            attributes={block.attributes}
          />
        );
      
      case 'button':
        return (
          <ButtonBlock
            {...commonProps}
            content={block.content}
            attributes={block.attributes}
          />
        );
      
      case 'list':
        return (
          <ListBlock
            {...commonProps}
            attributes={block.attributes}
          />
        );
      
      default:
        return (
          <div className="p-4 border border-gray-300 rounded bg-gray-50">
            Unknown block type: {block.type}
          </div>
        );
    }
  };

  // Block inserter menu
  const BlockInserterMenu = () => {
    const blockTypes = [
      { type: 'paragraph', icon: Type, label: '문단' },
      { type: 'heading', icon: Heading1, label: '제목' },
      { type: 'image', icon: Image, label: '이미지' },
      { type: 'button', icon: MousePointer, label: '버튼' },
      { type: 'list', icon: List, label: '리스트' },
      { type: 'quote', icon: Quote, label: '인용구' },
      { type: 'code', icon: Code, label: '코드' },
      { type: 'table', icon: Table, label: '표' },
      { type: 'columns', icon: Columns, label: '컬럼' },
      { type: 'separator', icon: MinusSquare, label: '구분선' },
      { type: 'video', icon: Video, label: '비디오' },
      { type: 'file', icon: FileText, label: '파일' }
    ];

    return (
      <div className="bg-white rounded-lg shadow-lg border p-2 w-64 max-h-96 overflow-y-auto">
        <div className="text-xs text-gray-500 mb-2 px-2">블록 선택</div>
        <div className="grid grid-cols-2 gap-1">
          {blockTypes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              className="flex flex-col items-center justify-center p-3 hover:bg-gray-100 rounded transition-colors"
              onClick={() => {
                if (inserterTargetId) {
                  addBlock(type, inserterTargetPosition, inserterTargetId);
                }
              }}
            >
              <Icon className="h-6 w-6 mb-1 text-gray-600" />
              <span className="text-xs text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      'gutenberg-editor flex flex-col h-full bg-white',
      isFullScreen && 'fixed inset-0 z-50'
    )}>
      {/* Editor Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4 flex-1">
          {/* Title input */}
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => {
              setDocumentTitle(e.target.value);
              onTitleChange?.(e.target.value);
            }}
            placeholder="제목 입력..."
            className="text-2xl font-bold outline-none flex-1"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Block inserter */}
          <Popover open={showBlockInserter} onOpenChange={setShowBlockInserter}>
            <PopoverTrigger>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                블록 추가
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto">
              <BlockInserterMenu />
            </PopoverContent>
          </Popover>

          {/* Save button */}
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-1" />
            저장
          </Button>

          {/* View options */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsFullScreen(!isFullScreen)}>
                <Maximize2 className="h-4 w-4 mr-2" />
                {isFullScreen ? '전체화면 종료' : '전체화면'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSettings(!showSettings)}>
                <Settings className="h-4 w-4 mr-2" />
                {showSettings ? '설정 숨기기' : '설정 보기'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                미리보기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <div 
          ref={editorRef}
          className="max-w-4xl mx-auto p-8"
          onClick={(e) => {
            // Deselect block if clicking on empty space
            if (e.target === e.currentTarget) {
              setSelectedBlockId(null);
            }
          }}
        >
          {/* Blocks */}
          <div className="space-y-4">
            {blocks.map((block) => (
              <div key={block.id} className="block-container">
                {renderBlock(block)}
              </div>
            ))}
          </div>

          {/* Add block button at the end */}
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addBlock('paragraph', 'after', blocks[blocks.length - 1]?.id)}
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <Plus className="h-4 w-4 mr-1" />
              블록 추가
            </Button>
          </div>
        </div>
      </div>

      {/* Block inserter popover */}
      {showBlockInserter && inserterPosition && (
        <div
          className="fixed z-50"
          style={{ left: inserterPosition.x, top: inserterPosition.y }}
        >
          <BlockInserterMenu />
        </div>
      )}
    </div>
  );
};

export default GutenbergBlockEditor;