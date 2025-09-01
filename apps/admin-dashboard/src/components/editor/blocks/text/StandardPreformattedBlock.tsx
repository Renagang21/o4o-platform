/**
 * Standard Preformatted Block
 * 표준 템플릿 기반의 사전 포맷된 텍스트 블록
 */

import { useCallback, useRef } from 'react';
import { 
  FileText,
  Copy,
  Check,
  Type,
  Palette
} from 'lucide-react';
import { useState } from 'react';
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
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { cn } from '@/lib/utils';

interface PreformattedBlockProps extends StandardBlockProps {
  content: string;
  attributes?: {
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
    textColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    padding?: number;
    showCopyButton?: boolean;
    preserveWhitespace?: boolean;
    wordWrap?: boolean;
    tabSize?: number;
    align?: 'left' | 'center' | 'right';
    maxHeight?: number;
  };
}

const preformattedConfig: StandardBlockConfig = {
  type: 'preformatted',
  icon: FileText,
  category: 'text',
  title: 'Preformatted',
  description: 'Add text that respects your spacing and tabs.',
  keywords: ['preformatted', 'pre', 'text', 'whitespace', 'monospace'],
  supports: {
    align: true,
    color: true,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const FONT_FAMILIES = [
  { value: 'Monaco, Consolas, "Lucida Console", monospace', label: 'Monaco' },
  { value: '"Fira Code", monospace', label: 'Fira Code' },
  { value: '"Source Code Pro", monospace', label: 'Source Code Pro' },
  { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
  { value: 'Consolas, monospace', label: 'Consolas' },
  { value: '"Courier New", monospace', label: 'Courier New' },
  { value: 'monospace', label: 'System Monospace' }
];

const StandardPreformattedBlock: React.FC<PreformattedBlockProps> = (props) => {
  const { content, onChange, attributes = {}, isSelected } = props;
  const {
    fontSize = 14,
    fontFamily = 'Monaco, Consolas, "Lucida Console", monospace',
    lineHeight = 1.5,
    textColor = '#24292e',
    backgroundColor = '#f6f8fa',
    borderColor = '#e1e4e8',
    borderWidth = 1,
    borderRadius = 6,
    padding = 16,
    showCopyButton = true,
    preserveWhitespace = true,
    wordWrap = false,
    tabSize = 4,
    align = 'left',
    maxHeight = 0
  } = attributes;

  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  }, [onChange, content, attributes]);

  // Copy text to clipboard
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Error log removed
    }
  };

  // Handle tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = ' '.repeat(tabSize);
      
      const newContent = content.substring(0, start) + spaces + content.substring(end);
      onChange(newContent, attributes);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + tabSize;
      }, 0);
    }
  };

  // Get container styles
  const getContainerStyles = () => ({
    backgroundColor: backgroundColor,
    color: textColor,
    border: borderWidth ? `${borderWidth}px solid ${borderColor}` : 'none',
    borderRadius: `${borderRadius}px`,
    padding: `${padding}px`,
    fontSize: `${fontSize}px`,
    fontFamily: fontFamily,
    lineHeight: lineHeight,
    textAlign: align as any,
    maxHeight: maxHeight ? `${maxHeight}px` : undefined,
    overflow: maxHeight ? 'auto' : 'visible'
  });

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Select value={fontFamily} onValueChange={(value) => updateAttribute('fontFamily', value)}>
        <SelectTrigger className="h-9 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('preserveWhitespace', !preserveWhitespace)}
        className={cn("h-9 px-2", preserveWhitespace && "bg-blue-100")}
        title="Preserve whitespace"
      >
        <span className="text-xs">⎵</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('wordWrap', !wordWrap)}
        className={cn("h-9 px-2", wordWrap && "bg-blue-100")}
        title="Word wrap"
      >
        <span className="text-xs">↩</span>
      </Button>

      {showCopyButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={copyText}
          className="h-9 px-2"
          title="Copy text"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Typography</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="fontFamily" className="text-xs text-gray-600">Font Family</Label>
            <Select value={fontFamily} onValueChange={(value) => updateAttribute('fontFamily', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="fontSize" className="text-xs text-gray-600">Font Size (px)</Label>
              <Input
                id="fontSize"
                type="number"
                min="8"
                max="32"
                value={fontSize}
                onChange={(e) => updateAttribute('fontSize', parseInt(e.target.value) || 14)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lineHeight" className="text-xs text-gray-600">Line Height</Label>
              <Input
                id="lineHeight"
                type="number"
                step="0.1"
                min="1"
                max="3"
                value={lineHeight}
                onChange={(e) => updateAttribute('lineHeight', parseFloat(e.target.value) || 1.5)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tabSize" className="text-xs text-gray-600">Tab Size (spaces)</Label>
            <Select 
              value={tabSize.toString()} 
              onValueChange={(value) => updateAttribute('tabSize', parseInt(value))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 spaces</SelectItem>
                <SelectItem value="4">4 spaces</SelectItem>
                <SelectItem value="8">8 spaces</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Text Formatting</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="preserveWhitespace" className="text-xs text-gray-600">Preserve Whitespace</Label>
            <Switch
              id="preserveWhitespace"
              checked={preserveWhitespace}
              onCheckedChange={(checked) => updateAttribute('preserveWhitespace', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="wordWrap" className="text-xs text-gray-600">Word Wrap</Label>
            <Switch
              id="wordWrap"
              checked={wordWrap}
              onCheckedChange={(checked) => updateAttribute('wordWrap', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showCopyButton" className="text-xs text-gray-600">Show Copy Button</Label>
            <Switch
              id="showCopyButton"
              checked={showCopyButton}
              onCheckedChange={(checked) => updateAttribute('showCopyButton', checked)}
            />
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
                value={textColor}
                onChange={(e) => updateAttribute('textColor', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={textColor}
                onChange={(e) => updateAttribute('textColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="backgroundColor" className="text-xs text-gray-600">Background Color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="backgroundColor"
                type="color"
                value={backgroundColor}
                onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

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
        <Label className="text-sm font-medium">Layout</Label>
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="borderWidth" className="text-xs text-gray-600">Border Width (px)</Label>
              <Input
                id="borderWidth"
                type="number"
                min="0"
                max="10"
                value={borderWidth}
                onChange={(e) => updateAttribute('borderWidth', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="borderRadius" className="text-xs text-gray-600">Border Radius (px)</Label>
              <Input
                id="borderRadius"
                type="number"
                min="0"
                max="20"
                value={borderRadius}
                onChange={(e) => updateAttribute('borderRadius', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="padding" className="text-xs text-gray-600">Padding (px)</Label>
            <Input
              id="padding"
              type="number"
              min="0"
              max="60"
              value={padding}
              onChange={(e) => updateAttribute('padding', parseInt(e.target.value) || 16)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="maxHeight" className="text-xs text-gray-600">Max Height (px, 0 = auto)</Label>
            <Input
              id="maxHeight"
              type="number"
              min="0"
              max="1000"
              value={maxHeight}
              onChange={(e) => updateAttribute('maxHeight', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Preformatted content
  const PreformattedContent = () => (
    <div className="relative w-full">
      {isSelected ? (
        // Editable textarea when selected
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value, attributes)}
          onKeyDown={handleKeyDown}
          className="w-full resize-none outline-none"
          style={{
            ...getContainerStyles(),
            whiteSpace: preserveWhitespace ? (wordWrap ? 'pre-wrap' : 'pre') : 'normal',
            tabSize: tabSize,
            minHeight: '120px'
          }}
          placeholder="Enter preformatted text here..."
          spellCheck={false}
        />
      ) : (
        // Read-only display when not selected
        <pre
          className="w-full m-0"
          style={{
            ...getContainerStyles(),
            whiteSpace: preserveWhitespace ? (wordWrap ? 'pre-wrap' : 'pre') : 'normal',
            tabSize: tabSize
          }}
        >
          {content || 'Enter preformatted text here...'}
        </pre>
      )}

      {/* Copy button overlay */}
      {showCopyButton && content && !isSelected && (
        <Button
          variant="secondary"
          size="sm"
          onClick={copyText}
          className="absolute top-2 right-2 h-6 px-2 text-xs opacity-0 hover:opacity-100 transition-opacity"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      )}
    </div>
  );

  return (
    <StandardBlockTemplate
      {...props}
      config={preformattedConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <PreformattedContent />
    </StandardBlockTemplate>
  );
};

export default StandardPreformattedBlock;