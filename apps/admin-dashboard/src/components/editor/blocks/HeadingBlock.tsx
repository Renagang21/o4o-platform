/**
 * HeadingBlock Component
 * Gutenberg-style heading block with RichText, BlockControls, and InspectorControls
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
  Hash,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import BlockWrapper from './BlockWrapper';
import { RichText } from '../gutenberg/RichText';
import { BlockControls, ToolbarGroup, ToolbarButton, AlignmentToolbar } from '../gutenberg/BlockControls';

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
  attributes = {}
}) => {
  const [localContent, setLocalContent] = useState(content);

  const {
    level = 2,
    align = 'left',
    anchor = '',
    // isTableOfContents = true,  // Currently unused
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

  // Handle Enter key for block split
  const handleSplit = (value: string, isOriginal?: boolean) => {
    if (isOriginal) {
      onChange(value, attributes);
    }
    // Create new paragraph block after heading
    onAddBlock?.('after');
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

  return (
    <>
      {/* Block Controls - Floating Toolbar */}
      {isSelected && (
        <BlockControls>
          {/* Level Selector */}
          <ToolbarGroup>
            <LevelSelector />
          </ToolbarGroup>

          {/* Alignment */}
          <AlignmentToolbar
            value={align}
            onChange={(newAlign) => updateAttribute('align', newAlign)}
          />

          {/* HTML Anchor */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Hash className="h-4 w-4" />}
              label="HTML Anchor"
              onClick={() => {
                const newAnchor = prompt('Enter HTML anchor (ID):', anchor);
                if (newAnchor !== null) {
                  updateAttribute('anchor', newAnchor);
                }
              }}
            />
          </ToolbarGroup>
        </BlockControls>
      )}

      {/* Inspector Controls removed - now handled by InspectorPanel in sidebar */}

      {/* Block Content */}
      <BlockWrapper
        id={id}
        type="heading"
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onAddBlock={onAddBlock}
        className={`wp-block wp-block-heading wp-block-heading-h${level}`}
      >
        <div
          id={anchor || undefined}
          style={{
            backgroundColor: backgroundColor || undefined
          }}
        >
          <RichText
            tagName={`h${level}`}
            value={localContent}
            onChange={handleContentChange}
            onSplit={handleSplit}
            placeholder={`Heading ${level}`}
            className={cn(
              'heading-text',
              align === 'center' && 'text-center',
              align === 'right' && 'text-right',
              level === 1 && 'text-4xl font-bold',
              level === 2 && 'text-3xl font-bold',
              level === 3 && 'text-2xl font-semibold',
              level === 4 && 'text-xl font-semibold',
              level === 5 && 'text-lg font-medium',
              level === 6 && 'text-base font-medium'
            )}
            style={{
              color: textColor || undefined,
              fontSize: fontSize ? `${fontSize}px` : undefined
            }}
            allowedFormats={[
              'core/bold',
              'core/italic',
              'core/link',
              'core/strikethrough'
            ]}
          />
        </div>
      </BlockWrapper>
    </>
  );
};

export default HeadingBlock;