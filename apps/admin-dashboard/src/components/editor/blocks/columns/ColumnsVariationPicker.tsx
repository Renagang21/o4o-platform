/**
 * ColumnsVariationPicker Component
 * 구텐베르크 스타일 컬럼 프리셋 선택 UI
 */

import React from 'react';
import { COLUMNS_VARIATIONS, ColumnVariation } from '@/blocks/variations/columns-variations';
import { cn } from '@/lib/utils';

interface ColumnsVariationPickerProps {
  onSelect: (variation: ColumnVariation) => void;
  onSkip?: () => void;
}

export const ColumnsVariationPicker: React.FC<ColumnsVariationPickerProps> = ({
  onSelect,
  onSkip,
}) => {
  return (
    <div className="columns-variation-picker p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Choose a layout
        </h3>
        <p className="text-sm text-gray-600">
          Select a column pattern to start with, or skip to create a custom layout
        </p>
      </div>

      {/* Variation Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {COLUMNS_VARIATIONS.map((variation) => (
          <button
            key={variation.name}
            onClick={() => onSelect(variation)}
            className={cn(
              'variation-option',
              'flex flex-col items-center justify-center',
              'p-4 border-2 border-gray-300 rounded-lg',
              'hover:border-blue-500 hover:bg-white',
              'transition-all duration-200',
              'cursor-pointer group'
            )}
            title={variation.description}
          >
            {/* Icon */}
            <div className="mb-3 text-gray-600 group-hover:text-blue-600 transition-colors">
              {variation.icon}
            </div>

            {/* Title */}
            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
              {variation.title}
            </div>

            {/* Description */}
            <div className="text-xs text-gray-500 mt-1 text-center">
              {variation.description}
            </div>
          </button>
        ))}
      </div>

      {/* Skip button */}
      {onSkip && (
        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Skip and create custom layout
          </button>
        </div>
      )}
    </div>
  );
};

export default ColumnsVariationPicker;
