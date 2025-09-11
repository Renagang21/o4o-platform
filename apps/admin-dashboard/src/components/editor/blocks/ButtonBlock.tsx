/**
 * ButtonBlock Component
 * Gutenberg-style button block with BlockControls and InspectorControls
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Link2,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { RichText } from '../gutenberg/RichText';
import { BlockControls, ToolbarGroup, ToolbarButton } from '../gutenberg/BlockControls';

interface ButtonBlockProps {
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
    text?: string;
    url?: string;
    style?: 'fill' | 'outline';
    width?: number;
    align?: 'left' | 'center' | 'right' | 'wide' | 'full';
    textColor?: string;
    backgroundColor?: string;
    borderRadius?: number;
    borderWidth?: number;
    linkTarget?: string;
    rel?: string;
    fontSize?: number;
    paddingX?: number;
    paddingY?: number;
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

const ButtonBlock: React.FC<ButtonBlockProps> = ({
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
  const [localText, setLocalText] = useState(attributes.text || 'Click here');
  const [localUrl, setLocalUrl] = useState(attributes.url || '#');

  const {
    text = 'Click here',
    url = '#',
    style = 'fill',
    width = 0,
    align = 'center',
    textColor = '#ffffff',
    backgroundColor = '#007cba',
    borderRadius = 2,
    borderWidth = 2,
    linkTarget = '',
    // rel = '',  // Currently unused
    fontSize = 16,
    paddingX = 24,
    paddingY = 12
  } = attributes;

  // Sync text and URL changes
  useEffect(() => {
    setLocalText(text);
    setLocalUrl(url);
  }, [text, url]);

  // Update attribute
  const updateAttribute = (key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  };

  // Handle text change
  const handleTextChange = (newText: string) => {
    // Extract plain text from HTML
    const plainText = newText.replace(/<[^>]*>/g, '');
    setLocalText(plainText);
    updateAttribute('text', plainText);
  };

  // Get button styles
  const getButtonStyles = () => {
    const styles: React.CSSProperties = {
      fontSize: `${fontSize}px`,
      paddingLeft: `${paddingX}px`,
      paddingRight: `${paddingX}px`,
      paddingTop: `${paddingY}px`,
      paddingBottom: `${paddingY}px`,
      borderRadius: `${borderRadius}px`,
      width: width ? `${width}%` : 'auto'
    };

    if (style === 'fill') {
      styles.backgroundColor = backgroundColor;
      styles.color = textColor;
      styles.border = 'none';
    } else {
      styles.backgroundColor = 'transparent';
      styles.color = backgroundColor;
      styles.border = `${borderWidth}px solid ${backgroundColor}`;
    }

    return styles;
  };

  // Get wrapper alignment class
  const getAlignmentClass = () => {
    switch (align) {
      case 'left': return 'text-left';
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      case 'wide': return 'w-full max-w-4xl mx-auto';
      case 'full': return 'w-full';
      default: return 'text-center';
    }
  };

  return (
    <>
      {/* Block Controls - Floating Toolbar */}
      {isSelected && (
        <BlockControls>
          {/* Link Settings */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Link2 className="h-4 w-4" />}
              label="Edit Link"
              onClick={() => {
                const newUrl = prompt('Enter URL:', localUrl);
                if (newUrl !== null) {
                  setLocalUrl(newUrl);
                  updateAttribute('url', newUrl);
                }
              }}
            />
            {localUrl && localUrl !== '#' && (
              <ToolbarButton
                icon={<ExternalLink className="h-4 w-4" />}
                label="Open in New Tab"
                isActive={linkTarget === '_blank'}
                onClick={() => {
                  updateAttribute('linkTarget', linkTarget === '_blank' ? '' : '_blank');
                  if (linkTarget !== '_blank') {
                    updateAttribute('rel', 'noopener noreferrer');
                  }
                }}
              />
            )}
          </ToolbarGroup>

          {/* Alignment */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<AlignLeft className="h-4 w-4" />}
              label="Align left"
              isActive={align === 'left'}
              onClick={() => updateAttribute('align', 'left')}
            />
            <ToolbarButton
              icon={<AlignCenter className="h-4 w-4" />}
              label="Align center"
              isActive={align === 'center'}
              onClick={() => updateAttribute('align', 'center')}
            />
            <ToolbarButton
              icon={<AlignRight className="h-4 w-4" />}
              label="Align right"
              isActive={align === 'right'}
              onClick={() => updateAttribute('align', 'right')}
            />
            <ToolbarButton
              icon={<AlignJustify className="h-4 w-4" />}
              label="Full width"
              isActive={align === 'full'}
              onClick={() => updateAttribute('align', align === 'full' ? 'center' : 'full')}
            />
          </ToolbarGroup>
        </BlockControls>
      )}

      {/* Inspector Controls removed - now handled by GutenbergSidebar */}

      {/* Block Content */}
      <EnhancedBlockWrapper
        id={id}
        type="button"
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onAddBlock={onAddBlock}
        className="wp-block wp-block-button"
      >
        <div className={cn('wp-block-button__wrapper', getAlignmentClass())}>
          <div className="wp-block-button__link-wrapper inline-block">
            <RichText
              tagName="a"
              value={localText}
              onChange={handleTextChange}
              placeholder="Add text..."
              className={cn(
                'wp-block-button__link',
                'inline-block cursor-pointer transition-all',
                'hover:opacity-90'
              )}
              style={getButtonStyles()}
              allowedFormats={['core/bold', 'core/italic']}
            />
          </div>
        </div>
      </EnhancedBlockWrapper>
    </>
  );
};

export default ButtonBlock;