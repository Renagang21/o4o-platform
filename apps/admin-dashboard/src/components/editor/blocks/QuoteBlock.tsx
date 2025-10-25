/**
 * QuoteBlock Component
 * Simple quote block with quote text and citation
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';

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
    align?: 'left' | 'center' | 'right';
  };
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
}) => {
  const { quote: initialQuote = '', citation: initialCitation = '', align = 'left' } = attributes;

  const [localQuote, setLocalQuote] = useState(initialQuote);
  const [localCitation, setLocalCitation] = useState(initialCitation);

  // Sync with external changes
  useEffect(() => {
    if (initialQuote !== undefined) {
      setLocalQuote(initialQuote);
    }
    if (initialCitation !== undefined) {
      setLocalCitation(initialCitation);
    }
  }, [initialQuote, initialCitation]);

  // Handle quote change
  const handleQuoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newQuote = e.target.value;
    setLocalQuote(newQuote);
    onChange(JSON.stringify({ quote: newQuote, citation: localCitation }), {
      ...attributes,
      quote: newQuote,
      citation: localCitation,
    });
  };

  // Handle citation change
  const handleCitationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCitation = e.target.value;
    setLocalCitation(newCitation);
    onChange(JSON.stringify({ quote: localQuote, citation: newCitation }), {
      ...attributes,
      quote: localQuote,
      citation: newCitation,
    });
  };

  // Handle Enter key
  const handleQuoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Move to citation or add new block
      if (localCitation === '') {
        // Focus citation field
        const citationInput = document.querySelector(`#quote-citation-${id}`) as HTMLInputElement;
        citationInput?.focus();
      } else {
        // Add new paragraph block
        onAddBlock?.('after', 'o4o/paragraph');
      }
    }
  };

  const handleCitationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Add new paragraph block
      onAddBlock?.('after', 'o4o/paragraph');
    }
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
      className="wp-block-quote"
    >
      <blockquote
        className={cn(
          'border-l-4 border-gray-300 pl-4 py-2 my-4',
          align === 'center' && 'mx-auto text-center border-l-0 border-t-4 pt-4 pl-0',
          align === 'right' && 'ml-auto text-right border-l-0 border-r-4 pr-4 pl-0'
        )}
      >
        {/* Quote Text */}
        <textarea
          value={localQuote}
          onChange={handleQuoteChange}
          onKeyDown={handleQuoteKeyDown}
          placeholder="Write quote..."
          className={cn(
            'w-full resize-none border-0 outline-none bg-transparent',
            'text-lg italic text-gray-700',
            'placeholder:text-gray-400',
            'min-h-[3em]'
          )}
          rows={3}
        />

        {/* Citation */}
        {(isSelected || localCitation) && (
          <div className="mt-2">
            <input
              id={`quote-citation-${id}`}
              type="text"
              value={localCitation}
              onChange={handleCitationChange}
              onKeyDown={handleCitationKeyDown}
              placeholder="Add citation..."
              className={cn(
                'w-full border-0 outline-none bg-transparent',
                'text-sm text-gray-600',
                'placeholder:text-gray-400'
              )}
            />
          </div>
        )}
      </blockquote>
    </EnhancedBlockWrapper>
  );
};

export default QuoteBlock;
