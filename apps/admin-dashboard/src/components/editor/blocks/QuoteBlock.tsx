/**
 * QuoteBlock Component
 * Quote block with citation support and styling
 */

import React, { useState, useRef, useEffect } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';

interface QuoteBlockProps {
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
    quote?: string;
    citation?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    style?: 'default' | 'large' | 'pullquote';
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

const QuoteBlock: React.FC<QuoteBlockProps> = ({
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
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType,
}) => {
  const { quote: initialQuote, citation: initialCitation, align = 'left', style = 'default' } = attributes;
  
  // Parse content if needed
  const parseContent = (contentStr: string) => {
    if (!contentStr) return { quote: '', citation: '' };
    
    // Try to parse JSON format first
    try {
      const parsed = JSON.parse(contentStr);
      return { quote: parsed.quote || '', citation: parsed.citation || '' };
    } catch {
      // Fallback to plain text
      const parts = contentStr.split('\n---\n');
      return {
        quote: parts[0] || '',
        citation: parts[1] || ''
      };
    }
  };

  const contentData = parseContent(content);
  const [localQuote, setLocalQuote] = useState(initialQuote || contentData.quote || '');
  const [localCitation, setLocalCitation] = useState(initialCitation || contentData.citation || '');
  
  const quoteRef = useRef<HTMLDivElement>(null);
  const citationRef = useRef<HTMLDivElement>(null);

  // Sync with external content changes
  useEffect(() => {
    if (initialQuote !== undefined && initialCitation !== undefined) {
      setLocalQuote(initialQuote);
      setLocalCitation(initialCitation);
    } else if (content) {
      const parsed = parseContent(content);
      setLocalQuote(parsed.quote);
      setLocalCitation(parsed.citation);
    }
  }, [content, initialQuote, initialCitation]);

  // Handle quote change
  const handleQuoteChange = (newQuote: string) => {
    setLocalQuote(newQuote);
    const newContent = JSON.stringify({ quote: newQuote, citation: localCitation });
    onChange(newContent, { 
      ...attributes, 
      quote: newQuote, 
      citation: localCitation,
      align,
      style
    });
  };

  // Handle citation change
  const handleCitationChange = (newCitation: string) => {
    setLocalCitation(newCitation);
    const newContent = JSON.stringify({ quote: localQuote, citation: newCitation });
    onChange(newContent, { 
      ...attributes, 
      quote: localQuote, 
      citation: newCitation,
      align,
      style
    });
  };

  // Handle alignment change
  const handleAlignChange = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    const newContent = JSON.stringify({ quote: localQuote, citation: localCitation });
    onChange(newContent, { 
      ...attributes, 
      quote: localQuote, 
      citation: localCitation,
      align: newAlign,
      style
    });
  };

  // Handle key events
  const handleQuoteKeyDown = (e: React.KeyboardEvent) => {
    // Enter key - move to citation or create new paragraph
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (localCitation === '') {
        // Move focus to citation
        citationRef.current?.focus();
      } else {
        // Create new paragraph block after
        onAddBlock?.('after', 'core/paragraph');
      }
    }
    
    // Backspace on empty quote - delete block
    if (e.key === 'Backspace' && localQuote === '' && localCitation === '') {
      e.preventDefault();
      onDelete();
    }
  };

  const handleCitationKeyDown = (e: React.KeyboardEvent) => {
    // Enter key - create new paragraph
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAddBlock?.('after', 'core/paragraph');
    }
    
    // Backspace on empty citation - move back to quote
    if (e.key === 'Backspace' && localCitation === '') {
      e.preventDefault();
      quoteRef.current?.focus();
    }
  };

  // Handle paste - plain text only
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="quote"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      isDragging={isDragging}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onCopy={onCopy}
      onPaste={onPaste}
      onAlignChange={handleAlignChange}
      currentAlign={align}
      onChangeType={onChangeType}
      currentType="core/quote"
    >
      <div className={cn(
        'quote-block border-l-4 border-gray-300 pl-4 py-2',
        align === 'center' && 'text-center border-l-0 border-t-4 pt-4 pl-0',
        align === 'right' && 'text-right',
        align === 'justify' && 'text-justify'
      )}>
        {/* Quote content */}
        <div
          ref={quoteRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'quote-text outline-none text-lg italic text-gray-700 min-h-[2em] px-2 py-1',
            !localQuote && 'text-gray-400'
          )}
          onInput={(e) => {
            const target = e.target as HTMLDivElement;
            handleQuoteChange(target.textContent || '');
          }}
          onKeyDown={handleQuoteKeyDown}
          onPaste={handlePaste}
          data-placeholder="Write quote..."
          style={{
            direction: 'ltr',
            unicodeBidi: 'normal'
          }}
        >
          {localQuote}
        </div>

        {/* Citation */}
        <div
          ref={citationRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'citation-text outline-none text-sm text-gray-500 mt-3 min-h-[1.5em] px-2 py-1',
            !localCitation && 'text-gray-400'
          )}
          onInput={(e) => {
            const target = e.target as HTMLDivElement;
            handleCitationChange(target.textContent || '');
          }}
          onKeyDown={handleCitationKeyDown}
          onPaste={handlePaste}
          data-placeholder="Add citation (optional)..."
          style={{
            direction: 'ltr',
            unicodeBidi: 'normal'
          }}
        >
          {localCitation && `— ${localCitation}`}
        </div>
      </div>
    </EnhancedBlockWrapper>
  );
};

export default QuoteBlock;