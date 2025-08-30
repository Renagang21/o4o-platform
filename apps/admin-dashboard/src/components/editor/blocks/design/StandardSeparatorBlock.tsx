/**
 * Standard Separator Block
 * 표준 템플릿 기반의 구분선 블록
 */

import { useCallback } from 'react';
import { 
  Minus,
  MoreHorizontal,
  Circle,
  Square,
  Star,
  Diamond
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { cn } from '@/lib/utils';

interface SeparatorBlockProps extends StandardBlockProps {
  attributes?: {
    style?: 'line' | 'dots' | 'dashes' | 'double' | 'thick' | 'decorative';
    width?: number;
    height?: number;
    color?: string;
    opacity?: number;
    align?: 'left' | 'center' | 'right';
    marginTop?: number;
    marginBottom?: number;
    symbol?: 'none' | 'circle' | 'square' | 'star' | 'diamond';
    symbolColor?: string;
  };
}

const separatorConfig: StandardBlockConfig = {
  type: 'separator',
  icon: Minus,
  category: 'design',
  title: 'Separator',
  description: 'Create a break between ideas or sections with a separator.',
  keywords: ['separator', 'divider', 'line', 'break', 'hr'],
  supports: {
    align: true,
    color: false,
    spacing: true,
    border: false,
    customClassName: true
  }
};

const SEPARATOR_STYLES = [
  { value: 'line', label: 'Solid Line', preview: '────────' },
  { value: 'dots', label: 'Dotted', preview: '• • • • • • • •' },
  { value: 'dashes', label: 'Dashed', preview: '─ ─ ─ ─ ─ ─ ─' },
  { value: 'double', label: 'Double Line', preview: '═══════' },
  { value: 'thick', label: 'Thick Line', preview: '━━━━━━━━' },
  { value: 'decorative', label: 'Decorative', preview: '❋ ❋ ❋ ❋ ❋' }
];

const SYMBOLS = [
  { value: 'none', label: 'None', icon: null },
  { value: 'circle', label: 'Circle', icon: Circle },
  { value: 'square', label: 'Square', icon: Square },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'diamond', label: 'Diamond', icon: Diamond }
];

const StandardSeparatorBlock: React.FC<SeparatorBlockProps> = (props) => {
  const { onChange, attributes = {} } = props;
  const {
    style = 'line',
    width = 100,
    height = 1,
    color = '#e5e7eb',
    opacity = 100,
    align = 'center',
    marginTop = 24,
    marginBottom = 24,
    symbol = 'none',
    symbolColor = '#6b7280'
  } = attributes;

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange('', { ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Style selector
  const StyleSelector = () => (
    <div className="flex items-center gap-1">
      {SEPARATOR_STYLES.slice(0, 4).map((styleOption) => (
        <Button
          key={styleOption.value}
          variant={style === styleOption.value ? "default" : "ghost"}
          size="sm"
          onClick={() => updateAttribute('style', styleOption.value)}
          className="h-9 px-2"
          title={styleOption.label}
        >
          <span className="text-xs font-mono">{styleOption.preview.slice(0, 4)}</span>
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('style', style === 'thick' ? 'decorative' : 'thick')}
        className="h-9 px-2"
        title="More styles"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <StyleSelector />
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Separator Style</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="style" className="text-xs text-gray-600">Style Type</Label>
            <Select value={style} onValueChange={(value) => updateAttribute('style', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEPARATOR_STYLES.map((styleOption) => (
                  <SelectItem key={styleOption.value} value={styleOption.value}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{styleOption.preview}</span>
                      <span>{styleOption.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="width" className="text-xs text-gray-600">Width (%)</Label>
              <Input
                id="width"
                type="number"
                min="10"
                max="100"
                value={width}
                onChange={(e) => updateAttribute('width', parseInt(e.target.value) || 100)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="height" className="text-xs text-gray-600">Thickness (px)</Label>
              <Input
                id="height"
                type="number"
                min="1"
                max="20"
                value={height}
                onChange={(e) => updateAttribute('height', parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Appearance</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="color" className="text-xs text-gray-600">Color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="color"
                type="color"
                value={color}
                onChange={(e) => updateAttribute('color', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => updateAttribute('color', e.target.value)}
                placeholder="#e5e7eb"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="opacity" className="text-xs text-gray-600">Opacity (%)</Label>
            <Input
              id="opacity"
              type="number"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => updateAttribute('opacity', parseInt(e.target.value) || 100)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Symbol</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="symbol" className="text-xs text-gray-600">Center Symbol</Label>
            <Select value={symbol} onValueChange={(value) => updateAttribute('symbol', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((sym) => (
                  <SelectItem key={sym.value} value={sym.value}>
                    <div className="flex items-center gap-2">
                      {sym.icon && <sym.icon className="h-4 w-4" />}
                      <span>{sym.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {symbol !== 'none' && (
            <div>
              <Label htmlFor="symbolColor" className="text-xs text-gray-600">Symbol Color</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="symbolColor"
                  type="color"
                  value={symbolColor}
                  onChange={(e) => updateAttribute('symbolColor', e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  value={symbolColor}
                  onChange={(e) => updateAttribute('symbolColor', e.target.value)}
                  placeholder="#6b7280"
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Spacing</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="marginTop" className="text-xs text-gray-600">Top Margin (px)</Label>
            <Input
              id="marginTop"
              type="number"
              min="0"
              max="100"
              value={marginTop}
              onChange={(e) => updateAttribute('marginTop', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="marginBottom" className="text-xs text-gray-600">Bottom Margin (px)</Label>
            <Input
              id="marginBottom"
              type="number"
              min="0"
              max="100"
              value={marginBottom}
              onChange={(e) => updateAttribute('marginBottom', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Get separator styles
  const getSeparatorStyles = () => {
    const baseStyle = {
      marginTop: `${marginTop}px`,
      marginBottom: `${marginBottom}px`,
      opacity: opacity / 100
    };

    if (symbol !== 'none') {
      return {
        ...baseStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: align
      };
    }

    return baseStyle;
  };

  // Get line styles
  const getLineStyles = (): React.CSSProperties => {
    let borderStyle: 'solid' | 'dotted' | 'dashed' | 'double' = 'solid';
    let borderWidth = `${height}px`;
    
    switch (style) {
      case 'dots':
        borderStyle = 'dotted';
        borderWidth = `${Math.max(height, 2)}px`;
        break;
      case 'dashes':
        borderStyle = 'dashed';
        break;
      case 'double':
        borderStyle = 'double';
        borderWidth = `${Math.max(height, 3)}px`;
        break;
      case 'thick':
        borderWidth = `${Math.max(height, 4)}px`;
        break;
      case 'decorative':
        return {
          height: `${height * 2}px`,
          background: `repeating-linear-gradient(90deg, transparent, transparent 10px, ${color} 10px, ${color} 15px)`,
          border: 'none'
        };
    }

    return {
      height: '0',
      borderTop: `${borderWidth} ${borderStyle} ${color}`,
      border: 'none'
    };
  };

  // Separator content
  const SeparatorContent = () => {
    const SymbolIcon = symbol !== 'none' ? SYMBOLS.find(s => s.value === symbol)?.icon : null;

    if (SymbolIcon) {
      return (
        <div
          className={cn(
            "flex items-center w-full",
            align === 'center' && 'justify-center',
            align === 'right' && 'justify-end'
          )}
          style={getSeparatorStyles()}
        >
          <div 
            className="flex-1" 
            style={{ 
              ...getLineStyles(),
              maxWidth: `${(width / 2) - 5}%`
            }} 
          />
          <div 
            className="mx-3 flex-shrink-0"
            style={{ color: symbolColor }}
          >
            <SymbolIcon className="h-5 w-5" />
          </div>
          <div 
            className="flex-1" 
            style={{ 
              ...getLineStyles(),
              maxWidth: `${(width / 2) - 5}%`
            }} 
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "w-full",
          align === 'center' && 'mx-auto',
          align === 'right' && 'ml-auto'
        )}
        style={{
          ...getSeparatorStyles(),
          ...getLineStyles(),
          width: `${width}%`
        }}
      />
    );
  };

  return (
    <StandardBlockTemplate
      {...props}
      config={separatorConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <div className="w-full py-2">
        <SeparatorContent />
      </div>
    </StandardBlockTemplate>
  );
};

export default StandardSeparatorBlock;