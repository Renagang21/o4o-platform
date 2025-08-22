/**
 * ParagraphBlock Component
 * Gutenberg-style paragraph block with RichText, BlockControls, and InspectorControls
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Bold, 
  Italic, 
  Link2, 
  Strikethrough,
  Code
} from 'lucide-react';
import BlockWrapper from './BlockWrapper';
import { RichText } from '../gutenberg/RichText';
import { BlockControls, ToolbarGroup, ToolbarButton, AlignmentToolbar } from '../gutenberg/BlockControls';
import { 
  InspectorControls, 
  PanelBody, 
  ToggleControl, 
  FontSizePicker,
  PanelColorSettings,
  RangeControl
} from '../gutenberg/InspectorControls';

interface ParagraphBlockProps {
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
    align?: 'left' | 'center' | 'right' | 'justify';
    dropCap?: boolean;
    fontSize?: string;
    textColor?: string;
    backgroundColor?: string;
    padding?: number;
    letterSpacing?: number;
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
  const [localContent, setLocalContent] = useState(content);

  const {
    align = 'left',
    dropCap = false,
    fontSize = 'default',
    textColor = '',
    backgroundColor = '',
    padding = 0,
    letterSpacing = 0
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
      // Update current block with the content before cursor
      onChange(value, attributes);
    }
    // Create new block after this one
    onAddBlock?.('after');
  };

  // Handle block merge
  const handleMerge = () => {
    // This would merge with adjacent blocks
    // Implementation depends on parent component
  };

  // Handle block removal
  const handleRemove = () => {
    if (!localContent || localContent === '') {
      onDelete();
    }
  };

  // Get font size style
  const getFontSizeStyle = () => {
    const sizeMap: { [key: string]: string } = {
      'small': '13px',
      'default': '16px',
      'medium': '20px',
      'large': '24px',
      'x-large': '30px'
    };
    return sizeMap[fontSize] || '16px';
  };

  return (
    <>
      {/* Block Controls - Floating Toolbar */}
      {isSelected && (
        <BlockControls>
          {/* Text Formatting */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Bold className="h-4 w-4" />}
              label="Bold"
              onClick={() => document.execCommand('bold')}
            />
            <ToolbarButton
              icon={<Italic className="h-4 w-4" />}
              label="Italic"
              onClick={() => document.execCommand('italic')}
            />
            <ToolbarButton
              icon={<Link2 className="h-4 w-4" />}
              label="Link"
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) document.execCommand('createLink', false, url);
              }}
            />
            <ToolbarButton
              icon={<Strikethrough className="h-4 w-4" />}
              label="Strikethrough"
              onClick={() => document.execCommand('strikeThrough')}
            />
            <ToolbarButton
              icon={<Code className="h-4 w-4" />}
              label="Inline Code"
              onClick={() => {
                // Wrap selection in <code> tags
                const selection = window.getSelection();
                if (selection && selection.toString()) {
                  document.execCommand('insertHTML', false, `<code>${selection.toString()}</code>`);
                }
              }}
            />
          </ToolbarGroup>

          {/* Alignment */}
          <AlignmentToolbar
            value={align}
            onChange={(newAlign) => updateAttribute('align', newAlign)}
          />
        </BlockControls>
      )}

      {/* Inspector Controls - Sidebar Settings */}
      {isSelected && (
        <InspectorControls>
          {/* Typography Settings */}
          <PanelBody title="Typography" initialOpen={true}>
            <FontSizePicker
              value={fontSize}
              onChange={(size) => updateAttribute('fontSize', size)}
            />
            
            <ToggleControl
              label="Drop Cap"
              help="Show large initial letter"
              checked={dropCap}
              onChange={(checked) => updateAttribute('dropCap', checked)}
            />

            <RangeControl
              label="Letter Spacing"
              value={letterSpacing}
              onChange={(value) => updateAttribute('letterSpacing', value)}
              min={-5}
              max={10}
              step={0.1}
              help="Adjust space between letters (em)"
            />
          </PanelBody>

          {/* Color Settings */}
          <PanelColorSettings
            title="Color"
            colorSettings={[
              {
                value: textColor,
                onChange: (color) => updateAttribute('textColor', color),
                label: 'Text Color'
              },
              {
                value: backgroundColor,
                onChange: (color) => updateAttribute('backgroundColor', color),
                label: 'Background Color'
              }
            ]}
          />

          {/* Spacing Settings */}
          <PanelBody title="Spacing" initialOpen={false}>
            <RangeControl
              label="Padding"
              value={padding}
              onChange={(value) => updateAttribute('padding', value)}
              min={0}
              max={100}
              step={5}
              help="Inner spacing (px)"
            />
          </PanelBody>
        </InspectorControls>
      )}

      {/* Block Content */}
      <BlockWrapper
        id={id}
        type="paragraph"
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onAddBlock={onAddBlock}
        className="wp-block wp-block-paragraph"
      >
        <div
          className={cn(
            'paragraph-block-content',
            dropCap && 'has-drop-cap'
          )}
          style={{
            padding: padding ? `${padding}px` : undefined,
            backgroundColor: backgroundColor || undefined
          }}
        >
          <RichText
            tagName="p"
            value={localContent}
            onChange={handleContentChange}
            onSplit={handleSplit}
            onMerge={handleMerge}
            onRemove={handleRemove}
            placeholder="Start writing or type / to choose a block"
            className={cn(
              'paragraph-text',
              align === 'center' && 'text-center',
              align === 'right' && 'text-right',
              align === 'justify' && 'text-justify'
            )}
            style={{
              fontSize: getFontSizeStyle(),
              color: textColor || undefined,
              letterSpacing: letterSpacing ? `${letterSpacing}em` : undefined
            }}
            allowedFormats={[
              'core/bold',
              'core/italic',
              'core/link',
              'core/strikethrough',
              'core/code'
            ]}
          />
        </div>
      </BlockWrapper>
    </>
  );
};

export default ParagraphBlock;