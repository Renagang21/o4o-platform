/**
 * Standard Paragraph Block
 * 표준 템플릿 기반의 단락 블록
 */

import { useState, useEffect, useCallback } from 'react';
import { Type, Bold, Italic, Link2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { RichText } from '../../gutenberg/RichText';

interface ParagraphBlockProps extends StandardBlockProps {
  content: string;
}

const paragraphConfig: StandardBlockConfig = {
  type: 'paragraph',
  icon: Type,
  category: 'text',
  title: 'Paragraph',
  description: 'Start with the basic building block of all narrative.',
  keywords: ['text', 'paragraph', 'content'],
  supports: {
    align: true,
    color: true,
    spacing: true,
    border: false,
    customClassName: true
  }
};

const StandardParagraphBlock: React.FC<ParagraphBlockProps> = (props) => {
  const { content, onChange, attributes = {}, isSelected } = props;
  const [localContent, setLocalContent] = useState(content);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Sync content changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setLocalContent(newContent);
    onChange(newContent, attributes);
  }, [onChange, attributes]);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(localContent, { ...attributes, [key]: value });
  }, [onChange, localContent, attributes]);

  // Apply text formatting
  const applyFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
  }, []);

  // Insert link
  const insertLink = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setShowLinkPopover(true);
    }
  };

  const applyLink = () => {
    if (linkUrl) {
      applyFormat('createLink', linkUrl);
      setShowLinkPopover(false);
      setLinkUrl('');
    }
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      {/* Text formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => applyFormat('bold')}
        className="h-9 px-2"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => applyFormat('italic')}
        className="h-9 px-2"
      >
        <Italic className="h-4 w-4" />
      </Button>

      {/* Link */}
      <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
        <PopoverTrigger>
          <Button
            variant="ghost"
            size="sm"
            onClick={insertLink}
            className="h-9 px-2"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Add Link</h4>
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyLink()}
            />
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
        <Label className="text-sm font-medium">Text Settings</Label>
        <div className="mt-2 space-y-2">
          <div>
            <Label htmlFor="fontSize" className="text-xs text-gray-600">Font Size</Label>
            <Input
              id="fontSize"
              type="number"
              placeholder="16"
              value={attributes.fontSize || ''}
              onChange={(e) => updateAttribute('fontSize', parseInt(e.target.value) || 16)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="lineHeight" className="text-xs text-gray-600">Line Height</Label>
            <Input
              id="lineHeight"
              type="number"
              step="0.1"
              placeholder="1.6"
              value={attributes.lineHeight || ''}
              onChange={(e) => updateAttribute('lineHeight', parseFloat(e.target.value) || 1.6)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Colors</Label>
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-6 gap-2">
            {['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff'].map((color) => (
              <button
                key={color}
                className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                style={{ backgroundColor: color }}
                onClick={() => updateAttribute('textColor', color)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StandardBlockTemplate
      {...props}
      config={paragraphConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <RichText
        tagName="p"
        value={localContent}
        onChange={handleContentChange}
        placeholder="Start writing..."
        className="w-full min-h-[1.5em] outline-none"
        style={{
          fontSize: attributes.fontSize ? `${attributes.fontSize}px` : undefined,
          lineHeight: attributes.lineHeight || undefined,
          color: attributes.textColor || undefined
        }}
        allowedFormats={['core/bold', 'core/italic', 'core/link', 'core/strikethrough']}
        onSplit={() => props.onAddBlock?.('after')}
      />
    </StandardBlockTemplate>
  );
};

export default StandardParagraphBlock;