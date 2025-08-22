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
import { Input } from '@/components/ui/input';
import BlockWrapper from './BlockWrapper';
import { RichText } from '../gutenberg/RichText';
import { BlockControls, ToolbarGroup, ToolbarButton } from '../gutenberg/BlockControls';
import { 
  InspectorControls, 
  PanelBody, 
  ToggleControl,
  RangeControl,
  ColorPalette
} from '../gutenberg/InspectorControls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    rel = '',
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

      {/* Inspector Controls - Sidebar Settings */}
      {isSelected && (
        <InspectorControls>
          {/* Link Settings */}
          <PanelBody title="Link Settings" initialOpen={true}>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                URL
              </label>
              <Input
                value={localUrl}
                onChange={(e) => {
                  setLocalUrl(e.target.value);
                  updateAttribute('url', e.target.value);
                }}
                placeholder="https://example.com"
              />
            </div>

            <ToggleControl
              label="Open in new tab"
              checked={linkTarget === '_blank'}
              onChange={(checked) => {
                updateAttribute('linkTarget', checked ? '_blank' : '');
                if (checked) {
                  updateAttribute('rel', 'noopener noreferrer');
                } else {
                  updateAttribute('rel', '');
                }
              }}
            />

            {linkTarget === '_blank' && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Link Rel
                </label>
                <Input
                  value={rel}
                  onChange={(e) => updateAttribute('rel', e.target.value)}
                  placeholder="noopener noreferrer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Describes the relationship between the current document and the linked document
                </p>
              </div>
            )}
          </PanelBody>

          {/* Button Style */}
          <PanelBody title="Button Style" initialOpen={false}>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Button Style
              </label>
              <Select value={style} onValueChange={(value) => updateAttribute('style', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fill">Fill</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <RangeControl
              label="Border Radius"
              value={borderRadius}
              onChange={(value) => updateAttribute('borderRadius', value)}
              min={0}
              max={50}
              step={1}
              help="Rounded corners (px)"
            />

            {style === 'outline' && (
              <RangeControl
                label="Border Width"
                value={borderWidth}
                onChange={(value) => updateAttribute('borderWidth', value)}
                min={1}
                max={5}
                step={1}
                help="Border thickness (px)"
              />
            )}

            <RangeControl
              label="Button Width"
              value={width}
              onChange={(value) => updateAttribute('width', value)}
              min={0}
              max={100}
              step={5}
              help="0 = auto width, 100 = full width (%)"
            />
          </PanelBody>

          {/* Typography */}
          <PanelBody title="Typography" initialOpen={false}>
            <RangeControl
              label="Font Size"
              value={fontSize}
              onChange={(value) => updateAttribute('fontSize', value)}
              min={12}
              max={48}
              step={1}
              help="Text size (px)"
            />
          </PanelBody>

          {/* Spacing */}
          <PanelBody title="Spacing" initialOpen={false}>
            <RangeControl
              label="Horizontal Padding"
              value={paddingX}
              onChange={(value) => updateAttribute('paddingX', value)}
              min={0}
              max={100}
              step={4}
              help="Left and right padding (px)"
            />

            <RangeControl
              label="Vertical Padding"
              value={paddingY}
              onChange={(value) => updateAttribute('paddingY', value)}
              min={0}
              max={50}
              step={2}
              help="Top and bottom padding (px)"
            />
          </PanelBody>

          {/* Color Settings */}
          <PanelBody title="Color Settings" initialOpen={false}>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Text Color
              </label>
              <ColorPalette
                value={textColor}
                onChange={(color) => updateAttribute('textColor', color)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Background Color
              </label>
              <ColorPalette
                value={backgroundColor}
                onChange={(color) => updateAttribute('backgroundColor', color)}
              />
            </div>
          </PanelBody>
        </InspectorControls>
      )}

      {/* Block Content */}
      <BlockWrapper
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
      </BlockWrapper>
    </>
  );
};

export default ButtonBlock;