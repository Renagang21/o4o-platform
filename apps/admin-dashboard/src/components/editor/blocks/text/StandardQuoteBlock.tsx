/**
 * Standard Quote Block
 * 표준 템플릿 기반의 인용 블록
 */

import { useState, useCallback } from 'react';
import { 
  Quote,
  User,
  Link2,
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

interface QuoteBlockProps extends StandardBlockProps {
  content: string;
  attributes?: {
    citation?: string;
    citationUrl?: string;
    style?: 'default' | 'large' | 'pullquote' | 'bordered' | 'colored';
    fontSize?: number;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    textColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderPosition?: 'left' | 'top' | 'all';
    padding?: number;
    borderRadius?: number;
    align?: 'left' | 'center' | 'right';
    showQuotationMarks?: boolean;
    quotationMarkColor?: string;
  };
}

const quoteConfig: StandardBlockConfig = {
  type: 'quote',
  icon: Quote,
  category: 'text',
  title: 'Quote',
  description: 'Give quoted text visual emphasis. Great for testimonials.',
  keywords: ['quote', 'blockquote', 'citation', 'testimonial'],
  supports: {
    align: true,
    color: true,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const QUOTE_STYLES = [
  { value: 'default', label: 'Default', description: 'Simple quote with left border' },
  { value: 'large', label: 'Large', description: 'Emphasized quote with larger text' },
  { value: 'pullquote', label: 'Pull Quote', description: 'Centered quote for highlighting' },
  { value: 'bordered', label: 'Bordered', description: 'Quote with full border' },
  { value: 'colored', label: 'Colored', description: 'Quote with background color' }
];

const StandardQuoteBlock: React.FC<QuoteBlockProps> = (props) => {
  const { content, onChange, attributes = {}, isSelected } = props;
  const {
    citation = '',
    citationUrl = '',
    style = 'default',
    fontSize = 18,
    fontWeight = 400,
    fontStyle = 'italic',
    textColor,
    backgroundColor,
    borderColor = '#e5e7eb',
    borderWidth = 4,
    borderPosition = 'left',
    padding = 24,
    borderRadius = 0,
    align = 'left',
    showQuotationMarks = false,
    quotationMarkColor = '#9ca3af'
  } = attributes;

  const [showCitationPopover, setShowCitationPopover] = useState(false);
  const [tempCitation, setTempCitation] = useState(citation);
  const [tempCitationUrl, setTempCitationUrl] = useState(citationUrl);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  }, [onChange, content, attributes]);

  // Apply citation
  const applyCitation = () => {
    updateAttribute('citation', tempCitation);
    updateAttribute('citationUrl', tempCitationUrl);
    setShowCitationPopover(false);
  };

  // Get quote container classes
  const getQuoteClasses = () => {
    const baseClasses = "relative w-full transition-all duration-200";
    
    switch (style) {
      case 'large':
        return cn(baseClasses, "text-2xl font-medium");
      case 'pullquote':
        return cn(baseClasses, "text-xl text-center max-w-2xl mx-auto");
      case 'bordered':
        return cn(baseClasses, "border-2");
      case 'colored':
        return cn(baseClasses, "rounded");
      default:
        return baseClasses;
    }
  };

  // Get quote container styles
  const getQuoteStyles = () => {
    const baseStyles = {
      fontSize: `${fontSize}px`,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      color: textColor || undefined,
      padding: `${padding}px`,
      borderRadius: borderRadius ? `${borderRadius}px` : undefined,
      textAlign: align as any
    };

    switch (style) {
      case 'colored':
        return {
          ...baseStyles,
          backgroundColor: backgroundColor || '#f8fafc',
          border: borderWidth ? `${borderWidth}px solid ${borderColor}` : undefined
        };
      case 'bordered':
        return {
          ...baseStyles,
          border: `${borderWidth}px solid ${borderColor}`
        };
      case 'pullquote':
        return {
          ...baseStyles,
          borderTop: `${borderWidth}px solid ${borderColor}`,
          borderBottom: `${borderWidth}px solid ${borderColor}`
        };
      default:
        const borderStyle = borderPosition === 'all' 
          ? `${borderWidth}px solid ${borderColor}`
          : undefined;
        const leftBorder = borderPosition === 'left' 
          ? `${borderWidth}px solid ${borderColor}`
          : undefined;
        const topBorder = borderPosition === 'top' 
          ? `${borderWidth}px solid ${borderColor}`
          : undefined;

        return {
          ...baseStyles,
          border: borderStyle,
          borderLeft: leftBorder,
          borderTop: topBorder
        };
    }
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Select value={style} onValueChange={(value) => updateAttribute('style', value)}>
        <SelectTrigger className="h-9 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {QUOTE_STYLES.map((styleOption) => (
            <SelectItem key={styleOption.value} value={styleOption.value}>
              {styleOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={showCitationPopover} onOpenChange={setShowCitationPopover}>
        <PopoverTrigger>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-9 px-2", citation && "bg-blue-100")}
          >
            <User className="h-4 w-4 mr-1" />
            <span className="text-xs">Citation</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Quote Attribution</h4>
            <div>
              <Label htmlFor="citation" className="text-xs text-gray-600">Author/Source</Label>
              <Input
                id="citation"
                placeholder="Author name or source"
                value={tempCitation}
                onChange={(e) => setTempCitation(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="citationUrl" className="text-xs text-gray-600">Source URL (optional)</Label>
              <Input
                id="citationUrl"
                placeholder="https://example.com"
                value={tempCitationUrl}
                onChange={(e) => setTempCitationUrl(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCitationPopover(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={applyCitation}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('showQuotationMarks', !showQuotationMarks)}
        className={cn("h-9 px-2", showQuotationMarks && "bg-blue-100")}
        title="Toggle quotation marks"
      >
        <Quote className="h-4 w-4" />
      </Button>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Quote Style</Label>
        <div className="mt-2 space-y-3">
          {QUOTE_STYLES.map((styleOption) => (
            <div key={styleOption.value} className="flex items-start space-x-3">
              <input
                type="radio"
                id={`style-${styleOption.value}`}
                name="quoteStyle"
                value={styleOption.value}
                checked={style === styleOption.value}
                onChange={() => updateAttribute('style', styleOption.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor={`style-${styleOption.value}`} className="text-sm font-medium cursor-pointer">
                  {styleOption.label}
                </Label>
                <p className="text-xs text-gray-600 mt-1">{styleOption.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Typography</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="fontSize" className="text-xs text-gray-600">Font Size (px)</Label>
            <Input
              id="fontSize"
              type="number"
              min="12"
              max="48"
              value={fontSize}
              onChange={(e) => updateAttribute('fontSize', parseInt(e.target.value) || 18)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="fontWeight" className="text-xs text-gray-600">Font Weight</Label>
            <Select 
              value={fontWeight.toString()} 
              onValueChange={(value) => updateAttribute('fontWeight', parseInt(value))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">Light (300)</SelectItem>
                <SelectItem value="400">Normal (400)</SelectItem>
                <SelectItem value="500">Medium (500)</SelectItem>
                <SelectItem value="600">Semibold (600)</SelectItem>
                <SelectItem value="700">Bold (700)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="fontStyle" className="text-xs text-gray-600">Font Style</Label>
            <Select value={fontStyle} onValueChange={(value) => updateAttribute('fontStyle', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="italic">Italic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Colors</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="textColor" className="text-xs text-gray-600">Text Color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="textColor"
                type="color"
                value={textColor || '#000000'}
                onChange={(e) => updateAttribute('textColor', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={textColor || ''}
                onChange={(e) => updateAttribute('textColor', e.target.value)}
                placeholder="Auto"
                className="flex-1"
              />
            </div>
          </div>

          {(style === 'colored' || style === 'bordered') && (
            <div>
              <Label htmlFor="backgroundColor" className="text-xs text-gray-600">Background Color</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor || '#f8fafc'}
                  onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  value={backgroundColor || ''}
                  onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                  placeholder="#f8fafc"
                  className="flex-1"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="borderColor" className="text-xs text-gray-600">Border Color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="borderColor"
                type="color"
                value={borderColor}
                onChange={(e) => updateAttribute('borderColor', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={borderColor}
                onChange={(e) => updateAttribute('borderColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Border Settings</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="borderPosition" className="text-xs text-gray-600">Border Position</Label>
            <Select value={borderPosition} onValueChange={(value) => updateAttribute('borderPosition', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="all">All Sides</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="borderWidth" className="text-xs text-gray-600">Border Width (px)</Label>
              <Input
                id="borderWidth"
                type="number"
                min="0"
                max="20"
                value={borderWidth}
                onChange={(e) => updateAttribute('borderWidth', parseInt(e.target.value) || 4)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="padding" className="text-xs text-gray-600">Padding (px)</Label>
              <Input
                id="padding"
                type="number"
                min="0"
                max="60"
                value={padding}
                onChange={(e) => updateAttribute('padding', parseInt(e.target.value) || 24)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="borderRadius" className="text-xs text-gray-600">Border Radius (px)</Label>
            <Input
              id="borderRadius"
              type="number"
              min="0"
              max="30"
              value={borderRadius}
              onChange={(e) => updateAttribute('borderRadius', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Quotation Marks</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="showQuotes" className="text-xs text-gray-600">Show Quotation Marks</Label>
            <Switch
              id="showQuotes"
              checked={showQuotationMarks}
              onCheckedChange={(checked) => updateAttribute('showQuotationMarks', checked)}
            />
          </div>

          {showQuotationMarks && (
            <div>
              <Label htmlFor="quoteMarkColor" className="text-xs text-gray-600">Quote Mark Color</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="quoteMarkColor"
                  type="color"
                  value={quotationMarkColor}
                  onChange={(e) => updateAttribute('quotationMarkColor', e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  value={quotationMarkColor}
                  onChange={(e) => updateAttribute('quotationMarkColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Quote content
  const QuoteContent = () => (
    <div className={cn(
      "w-full",
      align === 'center' && 'text-center',
      align === 'right' && 'text-right'
    )}>
      <blockquote
        className={getQuoteClasses()}
        style={getQuoteStyles()}
      >
        {showQuotationMarks && (
          <span 
            className="absolute text-6xl font-bold leading-none opacity-20 pointer-events-none"
            style={{ 
              color: quotationMarkColor,
              top: '-10px',
              left: style === 'pullquote' ? '50%' : '0',
              transform: style === 'pullquote' ? 'translateX(-50%)' : 'none'
            }}
          >
            "
          </span>
        )}

        <div className="relative z-10">
          <RichText
            tagName="p"
            value={content}
            onChange={(value) => onChange(value, attributes)}
            placeholder="Write quote..."
            className="outline-none mb-0"
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              fontStyle: fontStyle,
              color: textColor || undefined
            }}
            allowedFormats={['core/bold', 'core/italic', 'core/link']}
            onSplit={() => props.onAddBlock?.('after')}
          />

          {(citation || isSelected) && (
            <div className="mt-4">
              <cite className="block text-sm not-italic opacity-75">
                {citationUrl && citation ? (
                  <a 
                    href={citationUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    — {citation}
                  </a>
                ) : citation ? (
                  `— ${citation}`
                ) : isSelected ? (
                  <RichText
                    tagName="span"
                    value={citation}
                    onChange={(value) => updateAttribute('citation', value)}
                    placeholder="Add citation..."
                    className="outline-none"
                    allowedFormats={[]}
                  />
                ) : null}
              </cite>
            </div>
          )}
        </div>

        {showQuotationMarks && (
          <span 
            className="absolute text-6xl font-bold leading-none opacity-20 pointer-events-none"
            style={{ 
              color: quotationMarkColor,
              bottom: '-30px',
              right: style === 'pullquote' ? '50%' : '0',
              transform: style === 'pullquote' ? 'translateX(50%)' : 'none'
            }}
          >
            "
          </span>
        )}
      </blockquote>
    </div>
  );

  return (
    <StandardBlockTemplate
      {...props}
      config={quoteConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <QuoteContent />
    </StandardBlockTemplate>
  );
};

export default StandardQuoteBlock;