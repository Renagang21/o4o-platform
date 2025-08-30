/**
 * Standard Button Block
 * 표준 템플릿 기반의 버튼 블록
 */

import { useState, useCallback } from 'react';
import { 
  MousePointer,
  Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { RichText } from '../../gutenberg/RichText';
import { cn } from '@/lib/utils';

interface ButtonBlockProps extends StandardBlockProps {
  content: string;
  attributes?: {
    text?: string;
    url?: string;
    linkTarget?: '_self' | '_blank';
    rel?: string;
    style?: 'fill' | 'outline' | 'text' | 'ghost';
    size?: 'sm' | 'default' | 'lg' | 'xl';
    width?: 'auto' | 'full';
    borderRadius?: number;
    fontSize?: number;
    fontWeight?: number;
    textColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    paddingX?: number;
    paddingY?: number;
    icon?: string;
    iconPosition?: 'left' | 'right';
    align?: 'left' | 'center' | 'right';
  };
}

const buttonConfig: StandardBlockConfig = {
  type: 'button',
  icon: MousePointer,
  category: 'design',
  title: 'Button',
  description: 'Prompt visitors to take action with a custom button.',
  keywords: ['button', 'link', 'cta', 'call to action'],
  supports: {
    align: true,
    color: true,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const BUTTON_STYLES = [
  { value: 'fill', label: 'Filled', preview: 'bg-blue-600 text-white' },
  { value: 'outline', label: 'Outline', preview: 'border-2 border-blue-600 text-blue-600' },
  { value: 'text', label: 'Text Only', preview: 'text-blue-600' },
  { value: 'ghost', label: 'Ghost', preview: 'bg-gray-100 text-gray-900' }
];

const BUTTON_SIZES = [
  { value: 'sm', label: 'Small', class: 'px-3 py-1.5 text-sm' },
  { value: 'default', label: 'Default', class: 'px-4 py-2' },
  { value: 'lg', label: 'Large', class: 'px-6 py-3 text-lg' },
  { value: 'xl', label: 'Extra Large', class: 'px-8 py-4 text-xl' }
];

const StandardButtonBlock: React.FC<ButtonBlockProps> = (props) => {
  const { onChange, attributes = {}, isSelected } = props;
  const {
    text = 'Click me',
    url = '',
    linkTarget = '_self',
    style = 'fill',
    size = 'default',
    width = 'auto',
    borderRadius = 6,
    fontSize,
    fontWeight = 500,
    textColor,
    backgroundColor,
    borderColor,
    paddingX,
    paddingY,
    align = 'left'
  } = attributes;

  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [tempUrl, setTempUrl] = useState(url);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(text, { ...attributes, [key]: value });
  }, [onChange, text, attributes]);

  // Apply link
  const applyLink = () => {
    updateAttribute('url', tempUrl);
    setShowLinkPopover(false);
  };

  // Get button classes
  const getButtonClasses = () => {
    const sizeData = BUTTON_SIZES.find(s => s.value === size);
    const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer";
    
    let styleClasses = '';
    switch (style) {
      case 'fill':
        styleClasses = 'bg-blue-600 text-white hover:bg-blue-700';
        break;
      case 'outline':
        styleClasses = 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50';
        break;
      case 'text':
        styleClasses = 'text-blue-600 hover:text-blue-700 hover:bg-blue-50';
        break;
      case 'ghost':
        styleClasses = 'bg-gray-100 text-gray-900 hover:bg-gray-200';
        break;
    }

    return cn(
      baseClasses,
      styleClasses,
      sizeData?.class,
      width === 'full' && 'w-full'
    );
  };

  // Get button styles
  const getButtonStyles = () => ({
    borderRadius: `${borderRadius}px`,
    fontSize: fontSize ? `${fontSize}px` : undefined,
    fontWeight: fontWeight,
    color: textColor || undefined,
    backgroundColor: backgroundColor || undefined,
    borderColor: borderColor || undefined,
    paddingLeft: paddingX ? `${paddingX}px` : undefined,
    paddingRight: paddingX ? `${paddingX}px` : undefined,
    paddingTop: paddingY ? `${paddingY}px` : undefined,
    paddingBottom: paddingY ? `${paddingY}px` : undefined
  });

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
        <PopoverTrigger>
          <Button variant="ghost" size="sm" className="h-9 px-2">
            <Link2 className="h-4 w-4 mr-1" />
            <span className="text-xs">Link</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Button Link</h4>
            <div>
              <Input
                placeholder="https://example.com"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyLink()}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Open in new tab</Label>
              <Switch
                checked={linkTarget === '_blank'}
                onCheckedChange={(checked) => 
                  updateAttribute('linkTarget', checked ? '_blank' : '_self')
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLinkPopover(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={applyLink}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Button Style</Label>
        <div className="mt-2 space-y-2">
          <div>
            <Label className="text-xs text-gray-600">Style</Label>
            <Select value={style} onValueChange={(value) => updateAttribute('style', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_STYLES.map((styleOption) => (
                  <SelectItem key={styleOption.value} value={styleOption.value}>
                    {styleOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-600">Size</Label>
            <Select value={size} onValueChange={(value) => updateAttribute('size', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_SIZES.map((sizeOption) => (
                  <SelectItem key={sizeOption.value} value={sizeOption.value}>
                    {sizeOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-600">Width</Label>
            <Select value={width} onValueChange={(value) => updateAttribute('width', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="full">Full Width</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Colors</Label>
        <div className="mt-2 space-y-2">
          <div>
            <Label className="text-xs text-gray-600">Text Color</Label>
            <div className="grid grid-cols-6 gap-2 mt-1">
              {['#ffffff', '#000000', '#3b82f6', '#ef4444', '#10b981', '#f59e0b'].map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                  style={{ backgroundColor: color }}
                  onClick={() => updateAttribute('textColor', color)}
                />
              ))}
            </div>
          </div>
          
          <div>
            <Label className="text-xs text-gray-600">Background Color</Label>
            <div className="grid grid-cols-6 gap-2 mt-1">
              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                  style={{ backgroundColor: color }}
                  onClick={() => updateAttribute('backgroundColor', color)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Advanced</Label>
        <div className="mt-2 space-y-2">
          <div>
            <Label htmlFor="borderRadius" className="text-xs text-gray-600">Border Radius</Label>
            <Input
              id="borderRadius"
              type="number"
              min="0"
              max="50"
              value={borderRadius}
              onChange={(e) => updateAttribute('borderRadius', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Button content
  const ButtonContent = () => {
    const buttonElement = (
      <button
        className={getButtonClasses()}
        style={getButtonStyles()}
        type="button"
        onClick={(e) => {
          if (url && !isSelected) {
            if (linkTarget === '_blank') {
              window.open(url, '_blank', 'noopener,noreferrer');
            } else {
              window.location.href = url;
            }
          }
          e.preventDefault();
        }}
      >
        <RichText
          tagName="span"
          value={text}
          onChange={(value) => updateAttribute('text', value)}
          placeholder="Button text..."
          className="outline-none"
          allowedFormats={[]}
        />
      </button>
    );

    return (
      <div className={cn(
        "w-full",
        align === 'center' && 'text-center',
        align === 'right' && 'text-right'
      )}>
        {buttonElement}
      </div>
    );
  };

  return (
    <StandardBlockTemplate
      {...props}
      config={buttonConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <ButtonContent />
    </StandardBlockTemplate>
  );
};

export default StandardButtonBlock;