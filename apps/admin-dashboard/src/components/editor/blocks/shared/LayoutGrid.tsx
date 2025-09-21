import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDownIcon, GridIcon, LayoutIcon, SlidersIcon } from 'lucide-react';

// Type definitions
export type CoverPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center-center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface GalleryLayout {
  type: 'grid' | 'masonry' | 'slider';
  columns: number;
  gap: number;
  aspectRatio: string;
}

export interface LayoutGridProps {
  mode: 'cover-position' | 'gallery-layout';

  // Cover Block용 포지션 그리드
  currentPosition?: CoverPosition;
  onPositionChange?: (position: CoverPosition) => void;
  showGrid?: boolean;

  // Gallery Block용 레이아웃
  layoutType?: 'grid' | 'masonry' | 'slider';
  columns?: number;
  gap?: number;
  aspectRatio?: 'auto' | 'square' | '16:9' | '4:3' | '3:2';
  onLayoutChange?: (layout: GalleryLayout) => void;

  // 공통 props
  className?: string;
  disabled?: boolean;
}

// Utility functions
export const getPositionClassName = (position: CoverPosition): string => {
  const classMap: Record<CoverPosition, string> = {
    'top-left': 'justify-start items-start',
    'top-center': 'justify-center items-start',
    'top-right': 'justify-end items-start',
    'center-left': 'justify-start items-center',
    'center-center': 'justify-center items-center',
    'center-right': 'justify-end items-center',
    'bottom-left': 'justify-start items-end',
    'bottom-center': 'justify-center items-end',
    'bottom-right': 'justify-end items-end',
  };
  return `flex ${classMap[position]}`;
};

export const generateGridStyles = (layout: GalleryLayout): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    gap: `${layout.gap}px`,
  };

  switch (layout.type) {
    case 'grid':
      return {
        ...baseStyles,
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
      };
    case 'masonry':
      return {
        ...baseStyles,
        columnCount: layout.columns,
        columnGap: `${layout.gap}px`,
      };
    case 'slider':
      return {
        ...baseStyles,
        display: 'flex',
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
      };
    default:
      return baseStyles;
  }
};

export const getAspectRatioValue = (ratio: string): string => {
  const ratioMap: Record<string, string> = {
    'auto': 'auto',
    'square': '1 / 1',
    '16:9': '16 / 9',
    '4:3': '4 / 3',
    '3:2': '3 / 2',
  };
  return ratioMap[ratio] || 'auto';
};

// Cover Position Grid Component
const CoverPositionGrid: React.FC<{
  currentPosition: CoverPosition;
  onPositionChange: (position: CoverPosition) => void;
  showGrid: boolean;
  disabled?: boolean;
}> = ({ currentPosition, onPositionChange, showGrid, disabled = false }) => {
  const [draggedPosition, setDraggedPosition] = useState<CoverPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const positions: CoverPosition[] = [
    'top-left', 'top-center', 'top-right',
    'center-left', 'center-center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ];

  const positionLabels: Record<CoverPosition, string> = {
    'top-left': '좌상단',
    'top-center': '상단',
    'top-right': '우상단',
    'center-left': '좌측',
    'center-center': '중앙',
    'center-right': '우측',
    'bottom-left': '좌하단',
    'bottom-center': '하단',
    'bottom-right': '우하단',
  };

  const handleDragStart = (e: React.DragEvent, position: CoverPosition) => {
    if (disabled) return;
    setDraggedPosition(position);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPosition(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPosition: CoverPosition) => {
    e.preventDefault();
    if (disabled || !draggedPosition) return;

    if (draggedPosition !== targetPosition) {
      onPositionChange(targetPosition);
    }
    setDraggedPosition(null);
    setIsDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, position: CoverPosition) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPositionChange(position);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">컨텐츠 위치</h3>
        <button
          type="button"
          onClick={() => {}}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          그리드 {showGrid ? '숨기기' : '보이기'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg">
        {positions.map((position, index) => {
          const isSelected = currentPosition === position;
          const isDraggedOver = draggedPosition === position;

          return (
            <div
              key={position}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, position)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, position)}
              onClick={() => !disabled && onPositionChange(position)}
              onKeyDown={(e) => handleKeyDown(e, position)}
              tabIndex={disabled ? -1 : 0}
              role="button"
              aria-label={`포지션: ${positionLabels[position]}`}
              aria-pressed={isSelected}
              className={`
                h-12 border-2 rounded cursor-pointer transition-all duration-200
                flex items-center justify-center relative
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isSelected
                  ? 'border-blue-500 bg-blue-100 text-blue-700'
                  : 'border-gray-300 bg-white hover:border-gray-400'
                }
                ${isDraggedOver ? 'border-green-500 bg-green-100' : ''}
                ${isDragging && draggedPosition === position ? 'opacity-50' : ''}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
              `}
            >
              {isSelected && (
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              )}
              <span className="sr-only">{positionLabels[position]}</span>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-600">
        선택된 위치: <span className="font-medium">{positionLabels[currentPosition]}</span>
      </div>
    </div>
  );
};

// Gallery Layout Controls Component
const GalleryLayoutControls: React.FC<{
  layoutType: 'grid' | 'masonry' | 'slider';
  columns: number;
  gap: number;
  aspectRatio: string;
  onLayoutChange: (layout: GalleryLayout) => void;
  disabled?: boolean;
}> = ({ layoutType, columns, gap, aspectRatio, onLayoutChange, disabled = false }) => {
  const layoutTypes = [
    { value: 'grid', label: '그리드', icon: GridIcon },
    { value: 'masonry', label: '메이슨리', icon: LayoutIcon },
    { value: 'slider', label: '슬라이더', icon: SlidersIcon },
  ] as const;

  const aspectRatios = [
    { value: 'auto', label: '자동' },
    { value: 'square', label: '정사각형 (1:1)' },
    { value: '16:9', label: '와이드 (16:9)' },
    { value: '4:3', label: '표준 (4:3)' },
    { value: '3:2', label: '사진 (3:2)' },
  ];

  const handleChange = (updates: Partial<GalleryLayout>) => {
    if (disabled) return;

    const newLayout: GalleryLayout = {
      type: layoutType,
      columns,
      gap,
      aspectRatio,
      ...updates,
    };
    onLayoutChange(newLayout);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">레이아웃 타입</h3>
        <div className="grid grid-cols-3 gap-2">
          {layoutTypes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleChange({ type: value })}
              disabled={disabled}
              className={`
                p-3 border-2 rounded-lg transition-all duration-200
                flex flex-col items-center gap-2 text-sm
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${layoutType === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white hover:border-gray-400'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            열 개수
          </label>
          <input
            type="range"
            min="1"
            max="8"
            value={columns}
            onChange={(e) => handleChange({ columns: parseInt(e.target.value) })}
            disabled={disabled || layoutType === 'slider'}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span className="font-medium">{columns}</span>
            <span>8</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            간격 (px)
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={gap}
            onChange={(e) => handleChange({ gap: parseInt(e.target.value) })}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span className="font-medium">{gap}px</span>
            <span>50</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          종횡비
        </label>
        <select
          value={aspectRatio}
          onChange={(e) => handleChange({ aspectRatio: e.target.value })}
          disabled={disabled || layoutType === 'masonry'}
          className={`
            w-full px-3 py-2 border border-gray-300 rounded-md text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${disabled || layoutType === 'masonry' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          `}
        >
          {aspectRatios.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Preview Grid */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">미리보기</h4>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[120px]"
          style={generateGridStyles({ type: layoutType, columns, gap, aspectRatio })}
        >
          {Array.from({ length: Math.min(columns * 2, 8) }).map((_, index) => (
            <div
              key={index}
              className="bg-gray-200 rounded aspect-square flex items-center justify-center text-xs text-gray-500"
              style={{
                aspectRatio: layoutType === 'masonry' ? 'auto' : getAspectRatioValue(aspectRatio),
                height: layoutType === 'masonry' ? `${60 + (index % 3) * 20}px` : undefined,
                minWidth: layoutType === 'slider' ? '120px' : undefined,
                scrollSnapAlign: layoutType === 'slider' ? 'start' : undefined,
              }}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main LayoutGrid Component
export const LayoutGrid: React.FC<LayoutGridProps> = ({
  mode,
  currentPosition = 'center-center',
  onPositionChange,
  showGrid = true,
  layoutType = 'grid',
  columns = 3,
  gap = 16,
  aspectRatio = 'auto',
  onLayoutChange,
  className = '',
  disabled = false,
}) => {
  if (mode === 'cover-position') {
    if (!onPositionChange) {
      throw new Error('onPositionChange is required for cover-position mode');
    }

    return (
      <div className={`layout-grid-cover ${className}`}>
        <CoverPositionGrid
          currentPosition={currentPosition}
          onPositionChange={onPositionChange}
          showGrid={showGrid}
          disabled={disabled}
        />
      </div>
    );
  }

  if (mode === 'gallery-layout') {
    if (!onLayoutChange) {
      throw new Error('onLayoutChange is required for gallery-layout mode');
    }

    return (
      <div className={`layout-grid-gallery ${className}`}>
        <GalleryLayoutControls
          layoutType={layoutType}
          columns={columns}
          gap={gap}
          aspectRatio={aspectRatio}
          onLayoutChange={onLayoutChange}
          disabled={disabled}
        />
      </div>
    );
  }

  return null;
};

// Hook for responsive breakpoints
export const useResponsiveLayoutGrid = () => {
  const [breakpoint, setBreakpoint] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint('sm');
      else if (width < 768) setBreakpoint('md');
      else if (width < 1024) setBreakpoint('lg');
      else setBreakpoint('xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  const getResponsiveColumns = (baseColumns: number): number => {
    const responsiveMap = {
      sm: Math.min(baseColumns, 2),
      md: Math.min(baseColumns, 3),
      lg: Math.min(baseColumns, 4),
      xl: baseColumns,
    };
    return responsiveMap[breakpoint];
  };

  const getResponsiveGap = (baseGap: number): number => {
    const gapMultiplier = {
      sm: 0.75,
      md: 0.85,
      lg: 0.95,
      xl: 1,
    };
    return Math.round(baseGap * gapMultiplier[breakpoint]);
  };

  return {
    breakpoint,
    getResponsiveColumns,
    getResponsiveGap,
  };
};

export default LayoutGrid;