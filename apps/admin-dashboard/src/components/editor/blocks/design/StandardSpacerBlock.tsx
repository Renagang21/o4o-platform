/**
 * Standard Spacer Block
 * 조정 가능한 높이의 여백 블록
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { 
  Maximize,
  Minimize,
  ArrowUpDown,
  Ruler,
  Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { cn } from '@/lib/utils';

interface SpacerBlockProps extends StandardBlockProps {
  attributes?: {
    height?: number;
    unit?: 'px' | 'rem' | 'em' | 'vh' | '%';
    minHeight?: number;
    maxHeight?: number;
    responsive?: {
      mobile?: number;
      tablet?: number;
      desktop?: number;
    };
    showGuides?: boolean;
    guideColor?: string;
    guideStyle?: 'solid' | 'dashed' | 'dotted';
    backgroundColor?: string;
    opacity?: number;
  };
}

const spacerConfig: StandardBlockConfig = {
  type: 'spacer',
  icon: ArrowUpDown,
  category: 'design',
  title: 'Spacer',
  description: 'Add white space between blocks.',
  keywords: ['spacer', 'space', 'gap', 'margin', 'padding', 'white space'],
  supports: {
    align: false,
    color: true,
    spacing: false,
    border: false,
    customClassName: true
  }
};

const QUICK_HEIGHTS = [
  { value: 25, label: 'Small (25px)' },
  { value: 50, label: 'Medium (50px)' },
  { value: 100, label: 'Large (100px)' },
  { value: 150, label: 'Extra Large (150px)' }
];

const UNITS = [
  { value: 'px', label: 'Pixels (px)' },
  { value: 'rem', label: 'Root Em (rem)' },
  { value: 'em', label: 'Em (em)' },
  { value: 'vh', label: 'Viewport Height (vh)' },
  { value: '%', label: 'Percent (%)' }
];

const StandardSpacerBlock: React.FC<SpacerBlockProps> = (props) => {
  const { onChange, attributes = {}, isSelected } = props;
  const {
    height = 50,
    unit = 'px',
    minHeight = 10,
    maxHeight = 500,
    responsive = {},
    showGuides = true,
    guideColor = '#e5e7eb',
    guideStyle = 'dashed',
    backgroundColor = 'transparent',
    opacity = 1
  } = attributes;

  const [isResizing, setIsResizing] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(height);
  const spacerRef = useRef<HTMLDivElement>(null);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(null, { ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Update responsive height
  const updateResponsiveHeight = useCallback((breakpoint: string, value: number) => {
    updateAttribute('responsive', { ...responsive, [breakpoint]: value });
  }, [responsive, updateAttribute]);

  // Handle mouse drag for resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelected) return;
    
    setIsResizing(true);
    setDragStartY(e.clientY);
    setDragStartHeight(height);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartY;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, dragStartHeight + deltaY));
      updateAttribute('height', Math.round(newHeight));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, dragStartY, dragStartHeight, minHeight, maxHeight, updateAttribute]);

  // Convert height to string with unit
  const getHeightString = (value: number = height, customUnit: string = unit) => {
    if (customUnit === 'rem') {
      return `${value / 16}${customUnit}`;
    }
    return `${value}${customUnit}`;
  };

  // Get spacer styles
  const getSpacerStyles = () => ({
    height: getHeightString(),
    minHeight: unit === 'px' ? `${minHeight}px` : undefined,
    maxHeight: unit === 'px' ? `${maxHeight}px` : undefined,
    backgroundColor: backgroundColor === 'transparent' ? 'transparent' : backgroundColor,
    opacity: opacity,
    position: 'relative' as const,
    cursor: isSelected ? 'ns-resize' : 'default'
  });

  // Get guide styles
  const getGuideStyles = () => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: showGuides && isSelected ? `1px ${guideStyle} ${guideColor}` : 'none',
    borderTop: showGuides ? `2px ${guideStyle} ${guideColor}` : 'none',
    borderBottom: showGuides ? `2px ${guideStyle} ${guideColor}` : 'none',
    pointerEvents: 'none' as const
  });

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      {QUICK_HEIGHTS.map((preset) => (
        <Button
          key={preset.value}
          variant={height === preset.value && unit === 'px' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => {
            updateAttribute('height', preset.value);
            updateAttribute('unit', 'px');
          }}
          className="h-9 px-2"
          title={preset.label}
        >
          {preset.value}
        </Button>
      ))}

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('height', Math.max(minHeight, height - 10))}
        className="h-9 px-2"
        title="Decrease height"
      >
        <Minimize className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('height', Math.min(maxHeight, height + 10))}
        className="h-9 px-2"
        title="Increase height"
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Height</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={unit === 'px' ? minHeight : 0}
              max={unit === 'px' ? maxHeight : 100}
              step={unit === 'px' ? 1 : 0.5}
              value={height}
              onChange={(e) => updateAttribute('height', parseFloat(e.target.value) || 0)}
              className="flex-1"
            />
            <Select value={unit} onValueChange={(value) => updateAttribute('unit', value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {unit === 'px' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-600">Visual Adjustment</Label>
                <span className="text-xs text-gray-500">{height}px</span>
              </div>
              <Slider
                value={[height]}
                onValueChange={([value]) => updateAttribute('height', value)}
                min={minHeight}
                max={maxHeight}
                step={5}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Quick Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_HEIGHTS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={height === preset.value && unit === 'px' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    updateAttribute('height', preset.value);
                    updateAttribute('unit', 'px');
                  }}
                  className="w-full"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {unit === 'px' && (
        <div>
          <Label className="text-sm font-medium">Constraints</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="minHeight" className="text-xs text-gray-600">Min Height (px)</Label>
              <Input
                id="minHeight"
                type="number"
                min="0"
                value={minHeight}
                onChange={(e) => updateAttribute('minHeight', parseInt(e.target.value) || 10)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="maxHeight" className="text-xs text-gray-600">Max Height (px)</Label>
              <Input
                id="maxHeight"
                type="number"
                min="0"
                value={maxHeight}
                onChange={(e) => updateAttribute('maxHeight', parseInt(e.target.value) || 500)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <Label className="text-sm font-medium">Responsive Heights</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="mobileHeight" className="text-xs text-gray-600">Mobile (&lt; 768px)</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="mobileHeight"
                type="number"
                min="0"
                value={responsive.mobile || height}
                onChange={(e) => updateResponsiveHeight('mobile', parseInt(e.target.value) || height)}
                className="flex-1"
              />
              <span className="text-xs text-gray-500">{unit}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="tabletHeight" className="text-xs text-gray-600">Tablet (768px - 1024px)</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="tabletHeight"
                type="number"
                min="0"
                value={responsive.tablet || height}
                onChange={(e) => updateResponsiveHeight('tablet', parseInt(e.target.value) || height)}
                className="flex-1"
              />
              <span className="text-xs text-gray-500">{unit}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="desktopHeight" className="text-xs text-gray-600">Desktop (&gt; 1024px)</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="desktopHeight"
                type="number"
                min="0"
                value={responsive.desktop || height}
                onChange={(e) => updateResponsiveHeight('desktop', parseInt(e.target.value) || height)}
                className="flex-1"
              />
              <span className="text-xs text-gray-500">{unit}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Visual Guides</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="showGuides" className="text-xs text-gray-600">Show Guides</Label>
            <input
              id="showGuides"
              type="checkbox"
              checked={showGuides}
              onChange={(e) => updateAttribute('showGuides', e.target.checked)}
              className="rounded"
            />
          </div>

          {showGuides && (
            <>
              <div>
                <Label htmlFor="guideStyle" className="text-xs text-gray-600">Guide Style</Label>
                <Select value={guideStyle} onValueChange={(value) => updateAttribute('guideStyle', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="guideColor" className="text-xs text-gray-600">Guide Color</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="guideColor"
                    type="color"
                    value={guideColor}
                    onChange={(e) => updateAttribute('guideColor', e.target.value)}
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <Input
                    value={guideColor}
                    onChange={(e) => updateAttribute('guideColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Appearance</Label>
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
            <Label htmlFor="opacity" className="text-xs text-gray-600">Opacity</Label>
            <div className="mt-1 flex items-center gap-2">
              <Slider
                value={[opacity]}
                onValueChange={([value]) => updateAttribute('opacity', value)}
                min={0}
                max={1}
                step={0.1}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-10">{(opacity * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Spacer content
  const SpacerContent = () => (
    <div
      ref={spacerRef}
      className={cn(
        "spacer-block relative",
        isSelected && "ring-2 ring-blue-500 ring-offset-2",
        isResizing && "cursor-ns-resize"
      )}
      style={getSpacerStyles()}
      onMouseDown={handleMouseDown}
    >
      {/* Visual guides */}
      <div style={getGuideStyles()} />

      {/* Height indicator */}
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-900 bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
            <Ruler className="inline-block w-4 h-4 mr-1" />
            {getHeightString()}
          </div>
        </div>
      )}

      {/* Resize handle */}
      {isSelected && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-500 hover:bg-opacity-20 transition-colors">
            <Move className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-4 text-gray-400" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-500 hover:bg-opacity-20 transition-colors">
            <Move className="absolute top-0 left-1/2 transform -translate-x-1/2 rotate-180 w-4 h-4 text-gray-400" />
          </div>
        </>
      )}
    </div>
  );

  return (
    <StandardBlockTemplate
      {...props}
      config={spacerConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <SpacerContent />
    </StandardBlockTemplate>
  );
};

export default StandardSpacerBlock;