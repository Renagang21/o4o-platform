/**
 * ColorPicker Component
 * Color selection control for Inspector sidebar
 */

import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  help,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`inspector-control inspector-color-control ${className}`} ref={pickerRef}>
      <label className="inspector-label">{label}</label>
      <div className="inspector-color-preview">
        <button
          type="button"
          className="inspector-color-swatch"
          style={{ backgroundColor: value || 'transparent' }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Pick color"
        />
        <span className="inspector-color-value">{value || 'transparent'}</span>
      </div>

      {isOpen && (
        <div className="absolute mt-2 p-3 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-32 cursor-pointer"
          />
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="inspector-input text-xs flex-1"
              placeholder="#000000"
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {help && <p className="inspector-help text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
};

export default ColorPicker;
