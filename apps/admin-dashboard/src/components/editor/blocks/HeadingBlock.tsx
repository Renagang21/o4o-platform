/**
 * HeadingBlock Component
 * Standardized heading block using EnhancedBlockWrapper
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { RichText } from '../gutenberg/RichText';

interface HeadingBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    align?: 'left' | 'center' | 'right';
    anchor?: string;
    isTableOfContents?: boolean;
    textColor?: string;
    backgroundColor?: string;
    fontSize?: number;
  };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
}

const HeadingBlock: React.FC<HeadingBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  canMoveUp = true,
  canMoveDown = true,
  isDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType
}) => {
  const [localContent, setLocalContent] = useState(content);

  const {
    level = 2,
    align = 'left',
    anchor = '',
    textColor = '',
    backgroundColor = '',
    fontSize = 0
  } = attributes;

  // Sync content changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent);
    onChange(newContent, attributes);
  };

  // Update attribute
  const updateAttribute = (key: string, value: any) => {
    onChange(localContent, { ...attributes, [key]: value });
  };

  // Handle alignment change
  const handleAlignChange = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    updateAttribute('align', newAlign);
  };

  // Get heading icon based on level
  const getHeadingIcon = () => {
    switch (level) {
      case 1: return <Heading1 className="h-4 w-4" />;
      case 2: return <Heading2 className="h-4 w-4" />;
      case 3: return <Heading3 className="h-4 w-4" />;
      case 4: return <Heading4 className="h-4 w-4" />;
      case 5: return <Heading5 className="h-4 w-4" />;
      case 6: return <Heading6 className="h-4 w-4" />;
      default: return <Heading2 className="h-4 w-4" />;
    }
  };

  // Level selector dropdown for toolbar
  const LevelSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm" className="h-9 px-2">
          {getHeadingIcon()}
          <span className="ml-1 text-xs">H{level}</span>
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {[1, 2, 3, 4, 5, 6].map((l) => {
          const Icon = [Heading1, Heading2, Heading3, Heading4, Heading5, Heading6][l - 1];
          return (
            <DropdownMenuItem
              key={l}
              onClick={() => updateAttribute('level', l)}
              className={level === l ? 'bg-gray-100' : ''}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>Heading {l}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Custom toolbar content
  const customToolbarContent = (
    <div className="flex items-center gap-1">
      <LevelSelector />
    </div>
  );

  // Get heading element class based on level
  const getHeadingClass = () => {
    const baseClass = "block-editor-rich-text__editable outline-none";
    const levelClasses = {
      1: "text-4xl font-bold",
      2: "text-3xl font-bold", 
      3: "text-2xl font-bold",
      4: "text-xl font-semibold",
      5: "text-lg font-semibold",
      6: "text-base font-semibold"
    };
    
    return cn(
      baseClass,
      levelClasses[level as keyof typeof levelClasses],
      align === 'center' && 'text-center',
      align === 'right' && 'text-right'
    );
  };

  const HeadingElement = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <EnhancedBlockWrapper
      id={id}
      type="heading"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      onCopy={onCopy}
      onPaste={onPaste}
      isDragging={isDragging}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      customToolbarContent={customToolbarContent}
      onAlignChange={handleAlignChange}
      currentAlign={align}
      onChangeType={onChangeType}
      currentType="heading"
    >
      <HeadingElement
        className={getHeadingClass()}
        style={{
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined,
          fontSize: fontSize ? `${fontSize}px` : undefined,
          textAlign: align,
        }}
        id={anchor || undefined}
      >
        <RichText
          tagName={HeadingElement}
          value={localContent}
          onChange={handleContentChange}
          placeholder={`Heading ${level}...`}
          className="w-full"
          allowedFormats={['core/bold', 'core/italic', 'core/link']}
          onSplit={onAddBlock ? () => onAddBlock('after') : undefined}
        />
      </HeadingElement>
    </EnhancedBlockWrapper>
  );
};

export default HeadingBlock;