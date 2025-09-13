/**
 * Standard Group Block
 * 여러 블록을 하나의 컨테이너로 묶는 그룹 블록
 */

import { useCallback, useState } from 'react';
import { 
  Folder,
  Plus,
  Settings,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2
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
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { cn } from '@/lib/utils';

interface GroupBlockProps extends StandardBlockProps {
  innerBlocks?: any[];
  attributes?: {
    backgroundColor?: string;
    textColor?: string;
    gradient?: string;
    padding?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    margin?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    border?: {
      width: number;
      style: string;
      color: string;
      radius: number;
    };
    boxShadow?: string;
    minHeight?: number;
    maxWidth?: number;
    layout?: 'default' | 'flex' | 'grid';
    flexDirection?: 'row' | 'column';
    justifyContent?: string;
    alignItems?: string;
    gap?: number;
    gridColumns?: number;
    gridGap?: number;
    isCollapsible?: boolean;
    isCollapsed?: boolean;
    tagName?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'main';
    anchor?: string;
    className?: string;
  };
}

const groupConfig: StandardBlockConfig = {
  type: 'group',
  icon: Folder,
  category: 'design',
  title: 'Group',
  description: 'Gather blocks in a container.',
  keywords: ['group', 'container', 'wrapper', 'section', 'div'],
  supports: {
    align: true,
    color: true,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const LAYOUT_OPTIONS = [
  { value: 'default', label: 'Default', description: 'Standard block flow' },
  { value: 'flex', label: 'Flex', description: 'Flexible box layout' },
  { value: 'grid', label: 'Grid', description: 'Grid layout' }
];

const TAG_OPTIONS = [
  { value: 'div', label: 'Div' },
  { value: 'section', label: 'Section' },
  { value: 'article', label: 'Article' },
  { value: 'aside', label: 'Aside' },
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
  { value: 'main', label: 'Main' }
];

const SHADOW_PRESETS = [
  { value: 'none', label: 'None', shadow: 'none' },
  { value: 'sm', label: 'Small', shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  { value: 'md', label: 'Medium', shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  { value: 'lg', label: 'Large', shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
  { value: 'xl', label: 'Extra Large', shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }
];

const StandardGroupBlock: React.FC<GroupBlockProps> = (props) => {
  const { innerBlocks = [], onChange, attributes = {} } = props;
  const {
    backgroundColor = 'transparent',
    textColor = 'inherit',
    gradient = '',
    padding = { top: 20, right: 20, bottom: 20, left: 20 },
    margin = { top: 0, right: 0, bottom: 0, left: 0 },
    border = { width: 0, style: 'solid', color: '#e5e7eb', radius: 0 },
    boxShadow = 'none',
    minHeight = 0,
    maxWidth = 0,
    layout = 'default',
    flexDirection = 'row',
    justifyContent = 'flex-start',
    alignItems = 'stretch',
    gap = 20,
    gridColumns = 2,
    gridGap = 20,
    isCollapsible = false,
    isCollapsed = false,
    tagName = 'div',
    anchor = '',
    className = ''
  } = attributes;

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(innerBlocks, { ...attributes, [key]: value });
  }, [onChange, innerBlocks, attributes]);

  // Update spacing (padding/margin)
  const updateSpacing = useCallback((type: 'padding' | 'margin', side: string, value: number) => {
    const current = attributes[type] || { top: 0, right: 0, bottom: 0, left: 0 };
    updateAttribute(type, { ...current, [side]: value });
  }, [attributes, updateAttribute]);

  // Update border
  const updateBorder = useCallback((key: string, value: any) => {
    updateAttribute('border', { ...border, [key]: value });
  }, [border, updateAttribute]);

  // Toggle collapse
  const toggleCollapse = () => {
    updateAttribute('isCollapsed', !isCollapsed);
  };

  // Get container styles
  const getContainerStyles = () => {
    const styles: any = {
      backgroundColor: gradient || backgroundColor,
      color: textColor,
      padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
      margin: `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`,
      borderWidth: `${border.width}px`,
      borderStyle: border.style,
      borderColor: border.color,
      borderRadius: `${border.radius}px`,
      boxShadow: boxShadow,
      minHeight: minHeight ? `${minHeight}px` : undefined,
      maxWidth: maxWidth ? `${maxWidth}px` : undefined,
      width: maxWidth ? undefined : '100%'
    };

    if (layout === 'flex') {
      styles.display = 'flex';
      styles.flexDirection = flexDirection;
      styles.justifyContent = justifyContent;
      styles.alignItems = alignItems;
      styles.gap = `${gap}px`;
    } else if (layout === 'grid') {
      styles.display = 'grid';
      styles.gridTemplateColumns = `repeat(${gridColumns}, 1fr)`;
      styles.gap = `${gridGap}px`;
    }

    return styles;
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Select value={layout} onValueChange={(value) => updateAttribute('layout', value)}>
        <SelectTrigger className="h-9 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LAYOUT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isCollapsible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="h-9 px-2"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className={cn("h-9 px-2", showAdvanced && "bg-blue-100")}
        title="Advanced settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Layout</Label>
        <div className="mt-2 space-y-3">
          <Select value={layout} onValueChange={(value) => updateAttribute('layout', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAYOUT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {layout === 'flex' && (
            <>
              <div>
                <Label htmlFor="flexDirection" className="text-xs text-gray-600">Direction</Label>
                <Select value={flexDirection} onValueChange={(value) => updateAttribute('flexDirection', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="row">Row</SelectItem>
                    <SelectItem value="column">Column</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="justifyContent" className="text-xs text-gray-600">Justify Content</Label>
                <Select value={justifyContent} onValueChange={(value) => updateAttribute('justifyContent', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flex-start">Start</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="flex-end">End</SelectItem>
                    <SelectItem value="space-between">Space Between</SelectItem>
                    <SelectItem value="space-around">Space Around</SelectItem>
                    <SelectItem value="space-evenly">Space Evenly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="alignItems" className="text-xs text-gray-600">Align Items</Label>
                <Select value={alignItems} onValueChange={(value) => updateAttribute('alignItems', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stretch">Stretch</SelectItem>
                    <SelectItem value="flex-start">Start</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="flex-end">End</SelectItem>
                    <SelectItem value="baseline">Baseline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gap" className="text-xs text-gray-600">Gap (px)</Label>
                <Input
                  id="gap"
                  type="number"
                  min="0"
                  max="100"
                  value={gap}
                  onChange={(e) => updateAttribute('gap', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </>
          )}

          {layout === 'grid' && (
            <>
              <div>
                <Label htmlFor="gridColumns" className="text-xs text-gray-600">Columns</Label>
                <Input
                  id="gridColumns"
                  type="number"
                  min="1"
                  max="12"
                  value={gridColumns}
                  onChange={(e) => updateAttribute('gridColumns', parseInt(e.target.value) || 2)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="gridGap" className="text-xs text-gray-600">Gap (px)</Label>
                <Input
                  id="gridGap"
                  type="number"
                  min="0"
                  max="100"
                  value={gridGap}
                  onChange={(e) => updateAttribute('gridGap', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Colors</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="backgroundColor" className="text-xs text-gray-600">Background Color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="backgroundColor"
                type="color"
                value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
                onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                placeholder="transparent"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="textColor" className="text-xs text-gray-600">Text Color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="textColor"
                type="color"
                value={textColor === 'inherit' ? '#000000' : textColor}
                onChange={(e) => updateAttribute('textColor', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={textColor}
                onChange={(e) => updateAttribute('textColor', e.target.value)}
                placeholder="inherit"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Padding (px)</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="paddingTop" className="text-xs text-gray-600">Top</Label>
            <Input
              id="paddingTop"
              type="number"
              min="0"
              value={padding.top}
              onChange={(e) => updateSpacing('padding', 'top', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="paddingRight" className="text-xs text-gray-600">Right</Label>
            <Input
              id="paddingRight"
              type="number"
              min="0"
              value={padding.right}
              onChange={(e) => updateSpacing('padding', 'right', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="paddingBottom" className="text-xs text-gray-600">Bottom</Label>
            <Input
              id="paddingBottom"
              type="number"
              min="0"
              value={padding.bottom}
              onChange={(e) => updateSpacing('padding', 'bottom', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="paddingLeft" className="text-xs text-gray-600">Left</Label>
            <Input
              id="paddingLeft"
              type="number"
              min="0"
              value={padding.left}
              onChange={(e) => updateSpacing('padding', 'left', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Margin (px)</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="marginTop" className="text-xs text-gray-600">Top</Label>
            <Input
              id="marginTop"
              type="number"
              value={margin.top}
              onChange={(e) => updateSpacing('margin', 'top', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="marginRight" className="text-xs text-gray-600">Right</Label>
            <Input
              id="marginRight"
              type="number"
              value={margin.right}
              onChange={(e) => updateSpacing('margin', 'right', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="marginBottom" className="text-xs text-gray-600">Bottom</Label>
            <Input
              id="marginBottom"
              type="number"
              value={margin.bottom}
              onChange={(e) => updateSpacing('margin', 'bottom', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="marginLeft" className="text-xs text-gray-600">Left</Label>
            <Input
              id="marginLeft"
              type="number"
              value={margin.left}
              onChange={(e) => updateSpacing('margin', 'left', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Border</Label>
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="borderWidth" className="text-xs text-gray-600">Width (px)</Label>
              <Input
                id="borderWidth"
                type="number"
                min="0"
                max="20"
                value={border.width}
                onChange={(e) => updateBorder('width', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="borderRadius" className="text-xs text-gray-600">Radius (px)</Label>
              <Input
                id="borderRadius"
                type="number"
                min="0"
                max="50"
                value={border.radius}
                onChange={(e) => updateBorder('radius', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>

          {border.width > 0 && (
            <>
              <div>
                <Label htmlFor="borderStyle" className="text-xs text-gray-600">Style</Label>
                <Select value={border.style} onValueChange={(value) => updateBorder('style', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="borderColor" className="text-xs text-gray-600">Color</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="borderColor"
                    type="color"
                    value={border.color}
                    onChange={(e) => updateBorder('color', e.target.value)}
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <Input
                    value={border.color}
                    onChange={(e) => updateBorder('color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Effects</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="boxShadow" className="text-xs text-gray-600">Box Shadow</Label>
            <Select value={boxShadow} onValueChange={(value) => updateAttribute('boxShadow', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHADOW_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.shadow}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Dimensions</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="minHeight" className="text-xs text-gray-600">Min Height (px, 0 = auto)</Label>
            <Input
              id="minHeight"
              type="number"
              min="0"
              value={minHeight}
              onChange={(e) => updateAttribute('minHeight', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="maxWidth" className="text-xs text-gray-600">Max Width (px, 0 = full)</Label>
            <Input
              id="maxWidth"
              type="number"
              min="0"
              value={maxWidth}
              onChange={(e) => updateAttribute('maxWidth', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {showAdvanced && (
        <div>
          <Label className="text-sm font-medium">Advanced</Label>
          <div className="mt-2 space-y-3">
            <div>
              <Label htmlFor="tagName" className="text-xs text-gray-600">HTML Tag</Label>
              <Select value={tagName} onValueChange={(value) => updateAttribute('tagName', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_OPTIONS.map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="anchor" className="text-xs text-gray-600">HTML Anchor</Label>
              <Input
                id="anchor"
                value={anchor}
                onChange={(e) => updateAttribute('anchor', e.target.value)}
                placeholder="unique-id"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="className" className="text-xs text-gray-600">Additional CSS Class</Label>
              <Input
                id="className"
                value={className}
                onChange={(e) => updateAttribute('className', e.target.value)}
                placeholder="custom-class"
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isCollapsible" className="text-xs text-gray-600">Collapsible</Label>
              <Switch
                id="isCollapsible"
                checked={isCollapsible}
                onCheckedChange={(checked) => updateAttribute('isCollapsible', checked)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Group content
  const GroupContent = () => {
    const Tag = tagName as keyof JSX.IntrinsicElements;
    
    return (
      <Tag
        id={anchor}
        className={cn("group-block", className)}
        style={getContainerStyles()}
      >
        {isCollapsible && (
          <div className="flex items-center justify-between mb-3 pb-3 border-b">
            <span className="text-sm font-medium text-gray-600">
              {isCollapsed ? 'Group (Collapsed)' : 'Group'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-6 w-6 p-0"
            >
              {isCollapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {!isCollapsed && (
          <div className="group-inner-blocks">
            {innerBlocks.length > 0 ? (
              <div className="min-h-[50px]">
                {/* Inner blocks would be rendered here by the parent editor */}
                <div className="text-gray-500 text-sm">
                  {innerBlocks.length} block{innerBlocks.length !== 1 ? 's' : ''} inside
                </div>
              </div>
            ) : (
              <div className="min-h-[100px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                <div className="text-center">
                  <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click to add blocks to this group</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Tag>
    );
  };

  return (
    <StandardBlockTemplate
      {...props}
      config={groupConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <GroupContent />
    </StandardBlockTemplate>
  );
};

export default StandardGroupBlock;