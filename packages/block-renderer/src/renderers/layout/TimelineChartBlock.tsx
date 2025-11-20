/**
 * TimelineChart Block Renderer
 * Visual timeline component for displaying step-by-step processes
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export interface TimelineStep {
  title: string;
  description?: string;
  icon?: string;
}

const DEFAULT_STEPS: TimelineStep[] = [
  { title: '1단계', description: '프로세스를 시작합니다' },
  { title: '2단계', description: '작업을 진행합니다' },
  { title: '3단계', description: '완료합니다' },
];

export const TimelineChartBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const steps = getBlockData(block, 'steps', DEFAULT_STEPS) as TimelineStep[];
  const variant = getBlockData(block, 'variant', 'vertical') as 'vertical' | 'horizontal';
  const iconStyle = getBlockData(block, 'iconStyle', 'circle') as 'circle' | 'square' | 'none';
  const lineStyle = getBlockData(block, 'lineStyle', 'solid') as 'solid' | 'dashed';
  const primaryColor = getBlockData(block, 'primaryColor', '#0073aa') as string;
  const secondaryColor = getBlockData(block, 'secondaryColor', '#6c757d') as string;
  const align = getBlockData(block, 'align', 'left') as 'left' | 'center' | 'right';
  const className = getBlockData(block, 'className', '');

  // Container classes
  const containerClasses = clsx(
    'timeline-chart',
    `timeline-${variant}`,
    `align-${align}`,
    className
  );

  // Vertical timeline
  if (variant === 'vertical') {
    return (
      <div className={containerClasses} style={{ maxWidth: '800px', margin: align === 'center' ? '0 auto' : undefined }}>
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-4">
              {/* Icon */}
              {iconStyle !== 'none' && (
                <div className="flex flex-col items-center">
                  <div
                    className={clsx(
                      'flex items-center justify-center text-white font-semibold z-10 flex-shrink-0',
                      iconStyle === 'circle' ? 'rounded-full' : 'rounded-sm',
                      'w-10 h-10'
                    )}
                    style={{ backgroundColor: primaryColor }}
                  >
                    {index + 1}
                  </div>
                  {/* Connecting line */}
                  {index < steps.length - 1 && (
                    <div
                      className="w-0.5 flex-1 my-2"
                      style={{
                        backgroundColor: secondaryColor,
                        borderStyle: lineStyle,
                        minHeight: '40px',
                      }}
                    />
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 pb-8">
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: primaryColor }}
                >
                  {step.title}
                </h3>
                {step.description && (
                  <p className="text-gray-600">{step.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Horizontal timeline
  return (
    <div className={containerClasses}>
      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center min-w-[200px]">
            {/* Icon */}
            {iconStyle !== 'none' && (
              <div className="flex items-center w-full">
                <div
                  className={clsx(
                    'flex items-center justify-center text-white font-semibold text-sm flex-shrink-0',
                    iconStyle === 'circle' ? 'rounded-full' : 'rounded-sm',
                    'w-8 h-8'
                  )}
                  style={{ backgroundColor: primaryColor }}
                >
                  {index + 1}
                </div>
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div
                    className="h-0.5 flex-1 mx-2"
                    style={{
                      backgroundColor: secondaryColor,
                      borderStyle: lineStyle,
                    }}
                  />
                )}
              </div>
            )}

            {/* Content */}
            <div className="text-center mt-4">
              <h3
                className="text-base font-semibold mb-1"
                style={{ color: primaryColor }}
              >
                {step.title}
              </h3>
              {step.description && (
                <p className="text-sm text-gray-600">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineChartBlock;
