/**
 * TimelineChart Block - Generated Widget
 *
 * Visual timeline component for displaying step-by-step processes
 * Perfect for: How It Works, Process Flow, Journey Steps
 */

import React, { useCallback } from 'react';
import { Clock, ChevronRight, CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from '../../components/editor/blocks/EnhancedBlockWrapper';
import { BlockToolbar } from '../../components/editor/blocks/gutenberg/BlockToolbar';

export interface TimelineStep {
  title: string;
  description?: string;
  icon?: string;
}

interface TimelineChartProps {
  id: string;
  content?: Record<string, unknown>;
  attributes?: {
    steps?: TimelineStep[];
    variant?: 'vertical' | 'horizontal';
    iconStyle?: 'circle' | 'square' | 'none';
    lineStyle?: 'solid' | 'dashed';
    primaryColor?: string;
    secondaryColor?: string;
    align?: 'left' | 'center' | 'right';
  };
  onChange: (content: Record<string, unknown>, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const DEFAULT_STEPS: TimelineStep[] = [
  {
    title: '1단계',
    description: '프로세스를 시작합니다',
  },
  {
    title: '2단계',
    description: '작업을 진행합니다',
  },
  {
    title: '3단계',
    description: '완료합니다',
  },
];

const TimelineChart: React.FC<TimelineChartProps> = ({
  id,
  content = {},
  attributes = {},
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
}) => {
  const {
    steps = DEFAULT_STEPS,
    variant = 'vertical',
    iconStyle = 'circle',
    lineStyle = 'solid',
    primaryColor = '#0073aa',
    secondaryColor = '#6c757d',
    align = 'left',
  } = attributes;

  // Update attribute
  const updateAttribute = useCallback(
    (key: string, value: any) => {
      onChange(content, { ...attributes, [key]: value });
    },
    [content, attributes, onChange]
  );

  // Render icon based on iconStyle
  const renderIcon = (index: number) => {
    if (iconStyle === 'none') return null;

    const iconClasses = cn(
      'flex items-center justify-center text-white font-semibold z-10',
      iconStyle === 'circle' ? 'rounded-full' : 'rounded-sm',
      variant === 'vertical' ? 'w-10 h-10' : 'w-8 h-8 text-sm'
    );

    return (
      <div
        className={iconClasses}
        style={{ backgroundColor: primaryColor }}
      >
        {index + 1}
      </div>
    );
  };

  // Render vertical timeline
  const renderVerticalTimeline = () => {
    return (
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-4">
            {/* Icon & Line */}
            <div className="flex flex-col items-center">
              {renderIcon(index)}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 flex-1 my-2',
                    lineStyle === 'dashed' ? 'border-l-2 border-dashed' : ''
                  )}
                  style={{
                    backgroundColor: lineStyle === 'solid' ? secondaryColor : 'transparent',
                    borderColor: lineStyle === 'dashed' ? secondaryColor : undefined,
                    minHeight: '40px',
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: primaryColor }}
              >
                {step.title}
              </h3>
              {step.description && (
                <p className="text-sm" style={{ color: secondaryColor }}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render horizontal timeline
  const renderHorizontalTimeline = () => {
    return (
      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {/* Step */}
            <div className="flex flex-col items-center min-w-[150px] flex-shrink-0">
              {/* Icon */}
              <div className="mb-3">{renderIcon(index)}</div>

              {/* Content */}
              <div className="text-center">
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ color: primaryColor }}
                >
                  {step.title}
                </h3>
                {step.description && (
                  <p className="text-xs" style={{ color: secondaryColor }}>
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex items-center pt-4 flex-shrink-0">
                <div
                  className={cn(
                    'h-0.5 w-12',
                    lineStyle === 'dashed' ? 'border-t-2 border-dashed' : ''
                  )}
                  style={{
                    backgroundColor: lineStyle === 'solid' ? secondaryColor : 'transparent',
                    borderColor: lineStyle === 'dashed' ? secondaryColor : undefined,
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Get alignment class
  const getAlignmentClass = () => {
    switch (align) {
      case 'center':
        return 'mx-auto';
      case 'right':
        return 'ml-auto';
      default:
        return '';
    }
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="timeline-chart"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      className="wp-block-timeline-chart"
      showToolbar={false}
    >
      {/* Block Toolbar */}
      {isSelected && (
        <BlockToolbar
          align={align}
          onAlignChange={(newAlign) => updateAttribute('align', newAlign)}
          onDuplicate={onDuplicate}
          onInsertBefore={() => onAddBlock?.('before')}
          onInsertAfter={() => onAddBlock?.('after')}
          onRemove={onDelete}
        >
          {/* Variant selector */}
          <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300">
            <button
              onClick={() => updateAttribute('variant', 'vertical')}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                variant === 'vertical'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              )}
              title="Vertical layout"
            >
              Vertical
            </button>
            <button
              onClick={() => updateAttribute('variant', 'horizontal')}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                variant === 'horizontal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              )}
              title="Horizontal layout"
            >
              Horizontal
            </button>
          </div>

          {/* Icon style selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateAttribute('iconStyle', 'circle')}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                iconStyle === 'circle'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              )}
              title="Circle icons"
            >
              ●
            </button>
            <button
              onClick={() => updateAttribute('iconStyle', 'square')}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                iconStyle === 'square'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              )}
              title="Square icons"
            >
              ■
            </button>
            <button
              onClick={() => updateAttribute('iconStyle', 'none')}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                iconStyle === 'none'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              )}
              title="No icons"
            >
              None
            </button>
          </div>
        </BlockToolbar>
      )}

      {/* Timeline Content */}
      <div className={cn('py-6 px-4', getAlignmentClass())}>
        {variant === 'vertical' ? renderVerticalTimeline() : renderHorizontalTimeline()}
      </div>

      {/* Edit hint when selected */}
      {isSelected && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
          <Clock className="w-3 h-3 inline-block mr-1" />
          Timeline Chart • {steps.length} steps • {variant}
        </div>
      )}
    </EnhancedBlockWrapper>
  );
};

export default TimelineChart;
