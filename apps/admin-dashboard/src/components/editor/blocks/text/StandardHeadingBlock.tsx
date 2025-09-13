/**
 * Standard Heading Block
 * 표준 템플릿 기반의 헤딩 블록
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  ChevronDown,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { RichText } from '../../gutenberg/RichText';

interface HeadingBlockProps extends StandardBlockProps {
  content: string;
  attributes?: {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    anchor?: string;
    fontSize?: number;
    fontWeight?: number;
    textColor?: string;
    align?: 'left' | 'center' | 'right';
  };
}

const headingConfig: StandardBlockConfig = {
  type: 'heading',
  icon: Heading2,
  category: 'text',
  title: 'Heading',
  description: 'Introduce new sections and organize content to help visitors scan your page.',
  keywords: ['title', 'subtitle', 'heading', 'h1', 'h2', 'h3'],
  supports: {
    align: true,
    color: true,
    spacing: true,
    border: false,
    customClassName: true
  }
};

const HEADING_LEVELS = [
  { level: 1, icon: Heading1, label: 'Heading 1', size: 'text-4xl' },
  { level: 2, icon: Heading2, label: 'Heading 2', size: 'text-3xl' },
  { level: 3, icon: Heading3, label: 'Heading 3', size: 'text-2xl' },
  { level: 4, icon: Heading4, label: 'Heading 4', size: 'text-xl' },
  { level: 5, icon: Heading5, label: 'Heading 5', size: 'text-lg' },
  { level: 6, icon: Heading6, label: 'Heading 6', size: 'text-base' }
] as const;

const StandardHeadingBlock: React.FC<HeadingBlockProps> = (props) => {
  const { content, onChange, attributes = {} } = props;
  const [localContent, setLocalContent] = useState(content);

  const {
    level = 2,
    anchor = '',
    fontSize,
    fontWeight = 700,
    textColor,
    align = 'left'
  } = attributes;

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

  // Get heading icon
  const getCurrentLevelData = () => {
    return HEADING_LEVELS.find(h => h.level === level) || HEADING_LEVELS[1];
  };

  const currentLevelData = getCurrentLevelData();

  // Level selector dropdown
  const LevelSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm" className="h-9 px-2">
          <currentLevelData.icon className="h-4 w-4 mr-1" />
          <span className="text-xs">H{level}</span>
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {HEADING_LEVELS.map((levelData) => (
          <DropdownMenuItem
            key={levelData.level}
            onClick={() => updateAttribute('level', levelData.level)}
            className={level === levelData.level ? 'bg-gray-100' : ''}
          >
            <levelData.icon className="mr-2 h-4 w-4" />
            <span>{levelData.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <LevelSelector />
      
      {/* Anchor link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const anchorId = localContent.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          updateAttribute('anchor', anchorId);
        }}
        className="h-9 px-2"
        title="Generate anchor link"
      >
        <Hash className="h-4 w-4" />
      </Button>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Heading Settings</Label>
        <div className="mt-2 space-y-2">
          <div>
            <Label htmlFor="anchor" className="text-xs text-gray-600">Anchor (HTML ID)</Label>
            <Input
              id="anchor"
              placeholder="my-heading"
              value={anchor}
              onChange={(e) => updateAttribute('anchor', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for direct linking to this heading
            </p>
          </div>
          
          <div>
            <Label htmlFor="fontSize" className="text-xs text-gray-600">Font Size (px)</Label>
            <Input
              id="fontSize"
              type="number"
              placeholder="Auto"
              value={fontSize || ''}
              onChange={(e) => updateAttribute('fontSize', parseInt(e.target.value) || undefined)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="fontWeight" className="text-xs text-gray-600">Font Weight</Label>
            <select
              id="fontWeight"
              value={fontWeight}
              onChange={(e) => updateAttribute('fontWeight', parseInt(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value={300}>Light (300)</option>
              <option value={400}>Normal (400)</option>
              <option value={500}>Medium (500)</option>
              <option value={600}>Semibold (600)</option>
              <option value={700}>Bold (700)</option>
              <option value={800}>Extra Bold (800)</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Typography</Label>
        <div className="mt-2">
          <div className="grid grid-cols-6 gap-2">
            {['#000000', '#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db'].map((color) => (
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

  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <StandardBlockTemplate
      {...props}
      config={headingConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <HeadingTag
        id={anchor || undefined}
        className={`${currentLevelData.size} font-bold leading-tight`}
        style={{
          fontSize: fontSize ? `${fontSize}px` : undefined,
          fontWeight: fontWeight,
          color: textColor || undefined,
          textAlign: align
        }}
      >
        <RichText
          tagName={HeadingTag}
          value={localContent}
          onChange={handleContentChange}
          placeholder={`Heading ${level}...`}
          className="w-full outline-none"
          allowedFormats={['core/bold', 'core/italic', 'core/link']}
          onSplit={() => props.onAddBlock?.('after')}
        />
      </HeadingTag>
    </StandardBlockTemplate>
  );
};

export default StandardHeadingBlock;