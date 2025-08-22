/**
 * InspectorControls Component
 * 구텐베르그 스타일 사이드바 설정 패널
 * WordPress Gutenberg 패턴 완전 모방
 */

import { FC, ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InspectorControlsProps {
  children: ReactNode;
}

export const InspectorControls: FC<InspectorControlsProps> = ({ children }) => {
  return (
    <div className="block-editor-inspector-controls">
      {children}
    </div>
  );
};

// 패널 바디 컴포넌트
export const PanelBody: FC<{
  title?: string;
  initialOpen?: boolean;
  children: ReactNode;
  className?: string;
}> = ({ title, initialOpen = true, children, className }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div className={cn('components-panel__body', className)}>
      {title && (
        <button
          className="components-panel__body-toggle w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-200"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-sm font-medium">{title}</span>
          {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
      )}
      {isOpen && (
        <div className="components-panel__body-content p-4 border-b border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

// 토글 컨트롤 컴포넌트
export const ToggleControl: FC<{
  label: string;
  help?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}> = ({ label, help, checked = false, onChange }) => {
  return (
    <div className="components-toggle-control mb-4">
      <div className="flex items-center justify-between">
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {help && <span className="text-xs text-gray-500 mt-1">{help}</span>}
        </label>
        <button
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            checked ? 'bg-blue-600' : 'bg-gray-200'
          )}
          onClick={() => onChange?.(!checked)}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    </div>
  );
};

// 폰트 사이즈 피커 컴포넌트
export const FontSizePicker: FC<{
  value?: string;
  onChange?: (size: string) => void;
}> = ({ value = 'default', onChange }) => {
  const sizes = [
    { name: 'Small', slug: 'small', size: '13px' },
    { name: 'Default', slug: 'default', size: '16px' },
    { name: 'Medium', slug: 'medium', size: '20px' },
    { name: 'Large', slug: 'large', size: '24px' },
    { name: 'X-Large', slug: 'x-large', size: '30px' },
  ];

  return (
    <div className="components-font-size-picker mb-4">
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Font Size
      </label>
      <select
        className="w-full p-2 border border-gray-300 rounded-sm"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {sizes.map((size) => (
          <option key={size.slug} value={size.slug}>
            {size.name} ({size.size})
          </option>
        ))}
      </select>
    </div>
  );
};

// 색상 팔레트 컴포넌트
export const ColorPalette: FC<{
  value?: string;
  onChange?: (color: string) => void;
  colors?: Array<{ name: string; color: string }>;
}> = ({ value, onChange, colors }) => {
  const defaultColors = colors || [
    { name: 'Black', color: '#000000' },
    { name: 'White', color: '#ffffff' },
    { name: 'Gray', color: '#808080' },
    { name: 'Red', color: '#ff0000' },
    { name: 'Blue', color: '#0000ff' },
    { name: 'Green', color: '#00ff00' },
  ];

  return (
    <div className="components-color-palette mb-4">
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Color
      </label>
      <div className="flex flex-wrap gap-2">
        {defaultColors.map((color) => (
          <button
            key={color.color}
            className={cn(
              'w-8 h-8 rounded-full border-2',
              value === color.color ? 'border-blue-500' : 'border-gray-300'
            )}
            style={{ backgroundColor: color.color }}
            onClick={() => onChange?.(color.color)}
            title={color.name}
          />
        ))}
        <input
          type="color"
          className="w-8 h-8 rounded-full cursor-pointer"
          value={value || '#000000'}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    </div>
  );
};

// 패널 색상 설정 컴포넌트
export const PanelColorSettings: FC<{
  title?: string;
  colorSettings: Array<{
    value?: string;
    onChange?: (color: string) => void;
    label: string;
  }>;
}> = ({ title = 'Color', colorSettings }) => {
  return (
    <PanelBody title={title} initialOpen={false}>
      {colorSettings.map((setting, index) => (
        <div key={index} className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            {setting.label}
          </label>
          <ColorPalette value={setting.value} onChange={setting.onChange} />
        </div>
      ))}
    </PanelBody>
  );
};

// Range Control 컴포넌트
export const RangeControl: FC<{
  label: string;
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
}> = ({ label, value = 0, onChange, min = 0, max = 100, step = 1, help }) => {
  return (
    <div className="components-range-control mb-4">
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          className="flex-1"
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
        />
        <input
          type="number"
          className="w-16 p-1 border border-gray-300 rounded-sm text-sm"
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
        />
      </div>
      {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
};