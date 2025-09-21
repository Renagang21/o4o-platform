/**
 * QuoteStyleSwitcher Component
 * Quote와 Pullquote 스타일 간 전환 컨트롤
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Quote, Maximize2, ArrowRight } from 'lucide-react';

interface QuoteStyleSwitcherProps {
  currentStyle: 'default' | 'large' | 'pullquote';
  onStyleChange: (style: 'default' | 'large' | 'pullquote') => void;
}

const QUOTE_STYLES = [
  {
    value: 'default',
    label: 'Default Quote',
    description: 'Standard quote with left border',
    icon: Quote,
    preview: 'Regular blockquote style'
  },
  {
    value: 'large',
    label: 'Large Quote',
    description: 'Emphasized quote with larger text',
    icon: Quote,
    preview: 'Larger, emphasized quote'
  },
  {
    value: 'pullquote',
    label: 'Pullquote',
    description: 'Full-width highlighted quote',
    icon: Maximize2,
    preview: 'Full-width standout quote'
  }
] as const;

export const QuoteStyleSwitcher: React.FC<QuoteStyleSwitcherProps> = ({
  currentStyle,
  onStyleChange,
}) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Quote className="h-4 w-4" />
        <Label className="text-sm font-medium">Quote Style</Label>
      </div>

      {/* Style Options */}
      <div className="space-y-3">
        {QUOTE_STYLES.map((style) => {
          const Icon = style.icon;
          return (
            <div
              key={style.value}
              className={`
                relative cursor-pointer rounded-lg border-2 p-3 transition-all
                ${currentStyle === style.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
              onClick={() => onStyleChange(style.value)}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <Icon className="h-4 w-4 text-gray-600" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{style.label}</h4>
                  <p className="text-xs text-gray-500">{style.description}</p>
                </div>
                {currentStyle === style.value && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>

              {/* Preview */}
              <div className="text-xs text-gray-600 bg-gray-100 rounded p-2">
                {style.preview}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Switch Buttons */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant={currentStyle === 'default' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStyleChange('default')}
          className="flex-1 text-xs"
        >
          <Quote className="h-3 w-3 mr-1" />
          Quote
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const currentIndex = QUOTE_STYLES.findIndex(s => s.value === currentStyle);
            const nextIndex = (currentIndex + 1) % QUOTE_STYLES.length;
            onStyleChange(QUOTE_STYLES[nextIndex].value);
          }}
          className="px-2"
          title="Switch to next style"
        >
          <ArrowRight className="h-3 w-3" />
        </Button>
        <Button
          variant={currentStyle === 'pullquote' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStyleChange('pullquote')}
          className="flex-1 text-xs"
        >
          <Maximize2 className="h-3 w-3 mr-1" />
          Pullquote
        </Button>
      </div>

      {/* Tips */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
        <p><strong>Quote:</strong> Standard blockquote with citation</p>
        <p><strong>Pullquote:</strong> Full-width attention-grabbing quote</p>
        <p><strong>Tip:</strong> Use pullquotes to highlight key insights</p>
      </div>
    </div>
  );
};

export default QuoteStyleSwitcher;