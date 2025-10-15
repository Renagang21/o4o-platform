/**
 * EnhancedQuoteBlock Component
 * 고급 Quote/Pullquote 블록 with 인용 출처 고급 스타일링
 */

import React, { useState, useRef, useEffect } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { QuoteStyleSwitcher } from './quote/QuoteStyleSwitcher';
import { CitationEditor } from './quote/CitationEditor';
import { QuoteIconSelector } from './quote/QuoteIconSelector';
import { cn } from '@/lib/utils';
import { Quote, Settings, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './quote/quote-styles.css';

interface EnhancedQuoteBlockProps {
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
    citationUrl?: string;
    author?: string;
    source?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    style?: 'default' | 'large' | 'pullquote';
    citationPosition?: 'left' | 'center' | 'right';
    citationStyle?: 'normal' | 'italic' | 'bold';
    citationPrefix?: 'dash' | 'quote' | 'none';
    iconStyle?: 'quotes1' | 'quotes2' | 'quotes3' | 'quotes4' | 'quotes5';
    iconSize?: number;
    iconColor?: string;
    iconPosition?: 'left' | 'right' | 'none';
    showIcon?: boolean;
    theme?: 'default' | 'blue' | 'green' | 'purple' | 'red' | 'orange';
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

const EnhancedQuoteBlock: React.FC<EnhancedQuoteBlockProps> = ({
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
  // Parse attributes with defaults
  const {
    quote: initialQuote,
    citation: initialCitation,
    citationUrl = '',
    author = '',
    source = '',
    align = 'left',
    style = 'default',
    citationPosition = 'right',
    citationStyle = 'italic',
    citationPrefix = 'dash',
    iconStyle = 'quotes1',
    iconSize = 48,
    iconColor = '#6b7280',
    iconPosition = 'left',
    showIcon = false,
    theme = 'default'
  } = attributes;

  // Parse content if needed
  const parseContent = (contentStr: string) => {
    if (!contentStr) return { quote: '', citation: '' };

    try {
      const parsed = JSON.parse(contentStr);
      return { quote: parsed.quote || '', citation: parsed.citation || '' };
    } catch {
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
  const [showStyleSettings, setShowStyleSettings] = useState(false);
  const [showCitationSettings, setShowCitationSettings] = useState(false);
  const [showIconSettings, setShowIconSettings] = useState(false);

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

  // Update attributes helper
  const updateAttributes = (updates: Partial<typeof attributes>) => {
    const newContent = JSON.stringify({ quote: localQuote, citation: localCitation });
    onChange(newContent, { ...attributes, ...updates });
  };

  // Handle quote change
  const handleQuoteChange = (newQuote: string) => {
    setLocalQuote(newQuote);
    const newContent = JSON.stringify({ quote: newQuote, citation: localCitation });
    onChange(newContent, {
      ...attributes,
      quote: newQuote,
      citation: localCitation
    });
  };

  // Handle citation change
  const handleCitationChange = (newCitation: string) => {
    setLocalCitation(newCitation);
    const newContent = JSON.stringify({ quote: localQuote, citation: newCitation });
    onChange(newContent, {
      ...attributes,
      quote: localQuote,
      citation: newCitation
    });
  };

  // Handle key events
  const handleQuoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (localCitation === '') {
        citationRef.current?.focus();
      } else {
        onAddBlock?.('after', 'o4o/paragraph');
      }
    }

    if (e.key === 'Backspace' && localQuote === '' && localCitation === '') {
      e.preventDefault();
      onDelete();
    }
  };

  const handleCitationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAddBlock?.('after', 'o4o/paragraph');
    }

    if (e.key === 'Backspace' && localCitation === '') {
      e.preventDefault();
      quoteRef.current?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Get quote icon character
  const getIconCharacter = () => {
    const iconMap = {
      quotes1: '"',
      quotes2: '"',
      quotes3: '«',
      quotes4: '\'',
      quotes5: '❝'
    };
    return iconMap[iconStyle] || '"';
  };

  // Format citation text
  const formatCitation = () => {
    const parts = [];
    if (author) parts.push(author);
    if (source) parts.push(source);
    if (!author && !source && localCitation) parts.push(localCitation);

    const fullCitation = parts.join(', ');

    switch (citationPrefix) {
      case 'dash':
        return `— ${fullCitation}`;
      case 'quote':
        return `" ${fullCitation}`;
      case 'none':
      default:
        return fullCitation;
    }
  };

  // Get block classes
  const getBlockClasses = () => {
    return cn(
      'enhanced-quote-block',
      `quote-style-${style}`,
      `theme-${theme}`,
      align === 'center' && 'text-center',
      align === 'right' && 'text-right',
      align === 'justify' && 'text-justify'
    );
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
      onChangeType={onChangeType}
      currentType="core/quote"
      customToolbarContent={
        isSelected ? (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Style Quick Selector */}
            <div className="flex gap-1">
              {['default', 'large', 'pullquote'].map((styleOption) => (
                <Button
                  key={styleOption}
                  variant={style === styleOption ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateAttributes({ style: styleOption as any })}
                  className="h-7 px-3 text-xs capitalize"
                >
                  {styleOption}
                </Button>
              ))}
            </div>

            <div className="w-px h-4 bg-gray-300" />

            {/* Settings Buttons */}
            <Button
              variant={showStyleSettings ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowStyleSettings(!showStyleSettings)}
            >
              <Quote className="h-3 w-3 mr-1" />
              Style
            </Button>

            <Button
              variant={showCitationSettings ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowCitationSettings(!showCitationSettings)}
            >
              <Settings className="h-3 w-3 mr-1" />
              Citation
            </Button>

            <Button
              variant={showIconSettings ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowIconSettings(!showIconSettings)}
            >
              <Palette className="h-3 w-3 mr-1" />
              Icon
            </Button>
          </div>
        ) : null
      }
    >
      <div className={getBlockClasses()}>
        {/* Quote Icon */}
        {showIcon && iconPosition !== 'none' && (
          <div
            className={cn('quote-icon', `position-${iconPosition}`)}
            style={{
              fontSize: `${iconSize}px`,
              color: iconColor,
            }}
          >
            {getIconCharacter()}
          </div>
        )}

        {/* Quote content */}
        <div
          ref={quoteRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'quote-content outline-none',
            !localQuote && 'text-gray-400'
          )}
          onInput={(e) => {
            const target = e.target as HTMLDivElement;
            handleQuoteChange(target.textContent || '');
          }}
          onKeyDown={handleQuoteKeyDown}
          onPaste={handlePaste}
          data-placeholder="Write your quote here..."
        >
          {localQuote}
        </div>

        {/* Citation */}
        {(localCitation || author || source || isSelected) && (
          <div
            ref={citationRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(
              'quote-citation outline-none',
              `style-${citationStyle}`,
              `position-${citationPosition}`,
              `prefix-${citationPrefix}`,
              !localCitation && !author && !source && 'text-gray-400'
            )}
            onInput={(e) => {
              const target = e.target as HTMLDivElement;
              handleCitationChange(target.textContent || '');
            }}
            onKeyDown={handleCitationKeyDown}
            onPaste={handlePaste}
            data-placeholder="Add citation..."
          >
            {citationUrl ? (
              <a href={citationUrl} target="_blank" rel="noopener noreferrer">
                {formatCitation()}
              </a>
            ) : (
              formatCitation()
            )}
          </div>
        )}
      </div>

      {/* Style Settings Panel */}
      {isSelected && showStyleSettings && (
        <div className="mt-4">
          <QuoteStyleSwitcher
            currentStyle={style}
            onStyleChange={(newStyle) => updateAttributes({ style: newStyle })}
          />
        </div>
      )}

      {/* Citation Settings Panel */}
      {isSelected && showCitationSettings && (
        <div className="mt-4">
          <CitationEditor
            citation={localCitation}
            citationUrl={citationUrl}
            author={author}
            source={source}
            position={citationPosition}
            style={citationStyle}
            prefix={citationPrefix}
            onCitationChange={handleCitationChange}
            onCitationUrlChange={(url) => updateAttributes({ citationUrl: url })}
            onAuthorChange={(newAuthor) => updateAttributes({ author: newAuthor })}
            onSourceChange={(newSource) => updateAttributes({ source: newSource })}
            onPositionChange={(position) => updateAttributes({ citationPosition: position })}
            onStyleChange={(style) => updateAttributes({ citationStyle: style })}
            onPrefixChange={(prefix) => updateAttributes({ citationPrefix: prefix })}
          />
        </div>
      )}

      {/* Icon Settings Panel */}
      {isSelected && showIconSettings && (
        <div className="mt-4">
          <QuoteIconSelector
            iconStyle={iconStyle}
            iconSize={iconSize}
            iconColor={iconColor}
            iconPosition={iconPosition}
            showIcon={showIcon}
            onIconStyleChange={(style) => updateAttributes({ iconStyle: style })}
            onIconSizeChange={(size) => updateAttributes({ iconSize: size })}
            onIconColorChange={(color) => updateAttributes({ iconColor: color })}
            onIconPositionChange={(position) => updateAttributes({ iconPosition: position })}
            onToggleIcon={(show) => updateAttributes({ showIcon: show })}
            onReset={() => updateAttributes({
              iconStyle: 'quotes1',
              iconSize: 48,
              iconColor: '#6b7280',
              iconPosition: 'left',
              showIcon: false
            })}
          />
        </div>
      )}
    </EnhancedBlockWrapper>
  );
};

export default EnhancedQuoteBlock;