/**
 * QuoteBlock Component - Refactored
 *
 * Standardized quote block using StandardTextBlock template.
 * Uses Slate.js for rich text editing.
 *
 * Features:
 * - Gutenberg-style toolbar
 * - Rich text formatting (Bold, Italic)
 * - Alignment controls
 * - Quote and citation support
 * - Keyboard shortcuts
 */

import React, { useCallback } from 'react';
import { RenderElementProps } from 'slate-react';
import { cn } from '@/lib/utils';
import { StandardTextBlock } from './templates/StandardTextBlock';
import type { ParagraphElement } from '../slate/types/slate-types';

interface QuoteBlockProps {
  id: string;
  content?: string | object;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    content?: string;
    align?: 'left' | 'center' | 'right';
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
  };
}

const QuoteBlock: React.FC<QuoteBlockProps> = (props) => {
  const {
    align = 'left',
    fontSize = 18,
    textColor = '#374151',
  } = props.attributes || {};

  // Custom renderer for quote element
  const renderElement = useCallback(
    (renderProps: RenderElementProps) => {
      const element = renderProps.element as ParagraphElement;

      return (
        <blockquote
          {...renderProps.attributes}
          className={cn(
            'border-l-4 border-gray-300 pl-4 py-2',
            align === 'center' && 'mx-auto text-center border-l-0 border-t-4 pt-4 pl-0',
            align === 'right' && 'ml-auto text-right border-l-0 border-r-4 pr-4 pl-0'
          )}
          style={{
            textAlign: element.align || align,
            margin: 0,
          }}
        >
          <p
            className="text-lg italic"
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {renderProps.children}
          </p>
        </blockquote>
      );
    },
    [align]
  );

  return (
    <StandardTextBlock
      {...props}
      blockType="paragraph"
      renderElement={renderElement}
      placeholder="Write quote..."
      className="wp-block-quote"
      style={{
        fontSize: `${fontSize}px`,
        color: textColor,
      }}
    />
  );
};

export default QuoteBlock;
