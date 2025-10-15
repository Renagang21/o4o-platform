/**
 * ParagraphBlock Component
 * WordPress Gutenberg Paragraph 블록 완전 모방
 * 가장 기본적인 텍스트 입력 블록
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { RichText } from '../gutenberg/RichText';

interface ParagraphBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    align?: 'left' | 'center' | 'right' | 'justify';
    dropCap?: boolean;
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
  };
}

const ParagraphBlock: React.FC<ParagraphBlockProps> = ({
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
  const {
    align = 'left',
    dropCap = false,
    fontSize = 16,
    textColor = '#1e293b',
    backgroundColor = '',
  } = attributes;

  const [localContent, setLocalContent] = useState(content);
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync content
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Update attribute
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(localContent, { ...attributes, [key]: value });
  }, [onChange, localContent, attributes]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setLocalContent(newContent);
    onChange(newContent, attributes);
  }, [onChange, attributes]);

  // Handle Enter key for block split
  const handleSplit = useCallback((value: string, isOriginal?: boolean) => {
    if (isOriginal) {
      onChange(value, attributes);
    }
    onAddBlock?.('after', 'paragraph');
  }, [onChange, attributes, onAddBlock]);

  // Handle backspace on empty block
  const handleRemove = useCallback(() => {
    if (!localContent || localContent === '' || localContent === '<br>') {
      onDelete();
    }
  }, [localContent, onDelete]);

  // Get alignment class
  const getAlignmentClass = () => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      case 'justify': return 'text-justify';
      default: return 'text-left';
    }
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="paragraph"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      className="wp-block-paragraph"
      customToolbarContent={(
        <>
          {/* Text Alignment */}
          <button
            onClick={() => updateAttribute('align', 'left')}
            className={cn(
              "p-1 rounded hover:bg-gray-100",
              align === 'left' && "bg-blue-100 text-blue-600"
            )}
            title="Align Left"
          >
            <AlignLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => updateAttribute('align', 'center')}
            className={cn(
              "p-1 rounded hover:bg-gray-100",
              align === 'center' && "bg-blue-100 text-blue-600"
            )}
            title="Align Center"
          >
            <AlignCenter className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => updateAttribute('align', 'right')}
            className={cn(
              "p-1 rounded hover:bg-gray-100",
              align === 'right' && "bg-blue-100 text-blue-600"
            )}
            title="Align Right"
          >
            <AlignRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => updateAttribute('align', 'justify')}
            className={cn(
              "p-1 rounded hover:bg-gray-100",
              align === 'justify' && "bg-blue-100 text-blue-600"
            )}
            title="Justify"
          >
            <AlignJustify className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Text Formatting - handled by RichText */}
          <button
            onClick={() => document.execCommand('bold')}
            className="p-1 rounded hover:bg-gray-100"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => document.execCommand('italic')}
            className="p-1 rounded hover:bg-gray-100"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => {
              const url = prompt('Enter URL:');
              if (url) document.execCommand('createLink', false, url);
            }}
            className="p-1 rounded hover:bg-gray-100"
            title="Link (Ctrl+K)"
          >
            <Link2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </>
      )}
    >
      <div
        ref={editorRef}
        className={cn(
          'paragraph-content min-h-[1.5em]',
          getAlignmentClass(),
          dropCap && 'first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none'
        )}
        style={{
          fontSize: `${fontSize}px`,
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined,
        }}
      >
        <RichText
          tagName="p"
          value={localContent}
          onChange={handleContentChange}
          onSplit={handleSplit}
          onRemove={handleRemove}
          placeholder="Start writing or type / to choose a block"
          allowedFormats={[
            'core/bold',
            'core/italic',
            'core/link',
          ]}
        />
      </div>
    </EnhancedBlockWrapper>
  );
};

export default ParagraphBlock;
