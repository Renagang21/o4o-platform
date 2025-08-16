/**
 * ButtonBlock Component
 * Inline editable button with style options
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Link2,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings,
  ChevronDown,
  ExternalLink,
  FileText,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import BlockWrapper from './BlockWrapper';

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
    style?: 'fill' | 'outline' | 'text';
    size?: 'small' | 'medium' | 'large';
    align?: 'left' | 'center' | 'right';
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    openInNewTab?: boolean;
    rel?: string;
    icon?: string;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
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
  const [isEditingText, setIsEditingText] = useState(false);
  const [localText, setLocalText] = useState(attributes.text || '버튼 텍스트');
  const textRef = useRef<HTMLSpanElement>(null);

  const {
    text = '버튼 텍스트',
    url = '#',
    style = 'fill',
    size = 'medium',
    align = 'center',
    color = '',
    backgroundColor = '',
    borderRadius = 4,
    openInNewTab = false,
    rel = '',
    icon = '',
    iconPosition = 'left',
    fullWidth = false
  } = attributes;

  // Sync text changes
  useEffect(() => {
    setLocalText(text);
  }, [text]);

  // Focus text on edit
  useEffect(() => {
    if (isEditingText && textRef.current) {
      textRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditingText]);

  // Handle text change
  const handleTextChange = () => {
    if (!textRef.current) return;
    const newText = textRef.current.innerText;
    setLocalText(newText);
    onChange(content, { ...attributes, text: newText });
  };

  // Handle text key down
  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditingText(false);
      textRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setIsEditingText(false);
      textRef.current?.blur();
    }
  };

  // Update attribute
  const updateAttribute = (key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  };

  // Get button classes
  const getButtonClasses = () => {
    const sizeClasses = {
      small: 'px-3 py-1.5 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg'
    };

    const styleClasses = {
      fill: 'bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600',
      outline: 'bg-transparent text-blue-600 border-2 border-blue-600 hover:bg-blue-50',
      text: 'bg-transparent text-blue-600 hover:underline border-0'
    };

    return cn(
      'inline-flex items-center justify-center font-medium transition-all',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      sizeClasses[size],
      styleClasses[style],
      fullWidth && 'w-full',
      isEditingText && 'ring-2 ring-blue-500 ring-offset-2'
    );
  };

  // Get container alignment
  const getContainerAlignment = () => {
    switch (align) {
      case 'left':
        return 'text-left';
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-center';
    }
  };

  // Get button style
  const getButtonStyle = () => {
    const customStyle: React.CSSProperties = {
      borderRadius: `${borderRadius}px`
    };

    if (style === 'fill' && backgroundColor) {
      customStyle.backgroundColor = backgroundColor;
      customStyle.borderColor = backgroundColor;
    }

    if (color) {
      customStyle.color = color;
      if (style === 'outline' || style === 'text') {
        customStyle.borderColor = color;
      }
    }

    return customStyle;
  };

  // Render icon
  const renderIcon = () => {
    if (!icon) return null;

    const iconElement = (
      <span className={cn('inline-block', iconPosition === 'left' ? 'mr-2' : 'ml-2')}>
        {icon === 'external' && <ExternalLink className="h-4 w-4" />}
        {icon === 'download' && <Download className="h-4 w-4" />}
        {icon === 'document' && <FileText className="h-4 w-4" />}
      </span>
    );

    return iconElement;
  };

  return (
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
    >
      {/* Toolbar - shows when selected */}
      {isSelected && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded flex-wrap">
          {/* Style selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Palette className="h-4 w-4" />
                {style === 'fill' ? 'Fill' : style === 'outline' ? 'Outline' : 'Text'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => updateAttribute('style', 'fill')}>
                <div className="w-20 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs">
                  Fill
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateAttribute('style', 'outline')}>
                <div className="w-20 h-6 border-2 border-blue-600 rounded flex items-center justify-center text-blue-600 text-xs">
                  Outline
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateAttribute('style', 'text')}>
                <div className="w-20 h-6 flex items-center justify-center text-blue-600 text-xs underline">
                  Text
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Size selector */}
          <Select value={size} onValueChange={(v) => updateAttribute('size', v)}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-gray-300" />

          {/* Alignment */}
          <div className="flex gap-1">
            <Button
              variant={align === 'left' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateAttribute('align', 'left')}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={align === 'center' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateAttribute('align', 'center')}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={align === 'right' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateAttribute('align', 'right')}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Link settings */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Link2 className="h-4 w-4" />
                Link
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => updateAttribute('url', e.target.value)}
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="newTab">Open in new tab</Label>
                  <Switch
                    id="newTab"
                    checked={openInNewTab}
                    onCheckedChange={(checked) => updateAttribute('openInNewTab', checked)}
                  />
                </div>

                {openInNewTab && (
                  <div>
                    <Label htmlFor="rel">Rel attribute</Label>
                    <Input
                      id="rel"
                      value={rel}
                      onChange={(e) => updateAttribute('rel', e.target.value)}
                      placeholder="noopener noreferrer"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Advanced settings */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Advanced
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                {/* Icon */}
                <div>
                  <Label>Icon</Label>
                  <div className="flex gap-2 mt-2">
                    <Select value={icon} onValueChange={(v) => updateAttribute('icon', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="external">External Link</SelectItem>
                        <SelectItem value="download">Download</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                      </SelectContent>
                    </Select>
                    {icon && (
                      <Select value={iconPosition} onValueChange={(v) => updateAttribute('iconPosition', v)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Border radius */}
                <div>
                  <Label htmlFor="radius">Border Radius: {borderRadius}px</Label>
                  <Slider
                    id="radius"
                    value={[borderRadius]}
                    onValueChange={([v]) => updateAttribute('borderRadius', v)}
                    max={50}
                    step={1}
                    className="mt-2"
                  />
                </div>

                {/* Full width */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="fullWidth">Full Width</Label>
                  <Switch
                    id="fullWidth"
                    checked={fullWidth}
                    onCheckedChange={(checked) => updateAttribute('fullWidth', checked)}
                  />
                </div>

                {/* Colors */}
                {style === 'fill' && (
                  <div>
                    <Label htmlFor="bgColor">Background Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="bgColor"
                        type="color"
                        value={backgroundColor || '#2563eb'}
                        onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                        className="w-16 h-8 p-1"
                      />
                      <Input
                        value={backgroundColor || '#2563eb'}
                        onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                        placeholder="#2563eb"
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="textColor"
                      type="color"
                      value={color || (style === 'fill' ? '#ffffff' : '#2563eb')}
                      onChange={(e) => updateAttribute('color', e.target.value)}
                      className="w-16 h-8 p-1"
                    />
                    <Input
                      value={color || (style === 'fill' ? '#ffffff' : '#2563eb')}
                      onChange={(e) => updateAttribute('color', e.target.value)}
                      placeholder={style === 'fill' ? '#ffffff' : '#2563eb'}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Button display */}
      <div className={cn('button-block-container', getContainerAlignment())}>
        <a
          href={url}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? (rel || 'noopener noreferrer') : undefined}
          className={getButtonClasses()}
          style={getButtonStyle()}
          onClick={(e) => {
            if (isSelected) {
              e.preventDefault();
            }
          }}
        >
          {iconPosition === 'left' && renderIcon()}
          <span
            ref={textRef}
            contentEditable={isEditingText}
            suppressContentEditableWarning
            className="outline-none"
            onDoubleClick={() => setIsEditingText(true)}
            onBlur={() => setIsEditingText(false)}
            onInput={handleTextChange}
            onKeyDown={handleTextKeyDown}
          >
            {localText}
          </span>
          {iconPosition === 'right' && renderIcon()}
        </a>
      </div>
    </BlockWrapper>
  );
};

export default ButtonBlock;