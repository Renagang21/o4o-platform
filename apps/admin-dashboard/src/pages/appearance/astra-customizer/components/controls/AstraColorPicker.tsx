import React, { useState, useRef, useEffect } from 'react';
import { X, Pipette } from 'lucide-react';
import { ColorState } from '../../types/customizer-types';

interface AstraColorPickerProps {
  label: string;
  value: string | ColorState;
  onChange: (value: string | ColorState) => void;
  description?: string;
  hasHover?: boolean;
  clearable?: boolean;
}

export const AstraColorPicker: React.FC<AstraColorPickerProps> = ({
  label,
  value,
  onChange,
  description,
  hasHover = false,
  clearable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'normal' | 'hover'>('normal');
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // Convert value to ColorState format
  const colorState: ColorState = typeof value === 'string' 
    ? { normal: value, hover: undefined }
    : value;
  
  const handleColorChange = (color: string, state: 'normal' | 'hover') => {
    if (hasHover) {
      onChange({
        ...colorState,
        [state]: color,
      });
    } else {
      onChange(color);
    }
  };
  
  const handleClear = (state: 'normal' | 'hover') => {
    if (hasHover) {
      onChange({
        ...colorState,
        [state]: state === 'hover' ? undefined : '',
      });
    } else {
      onChange('');
    }
  };
  
  // Predefined color palette
  const colorPalette = [
    '#000000', '#FFFFFF', '#F44336', '#E91E63', '#9C27B0',
    '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B',
    '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E',
  ];
  
  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const renderColorInput = (state: 'normal' | 'hover') => {
    const currentColor = state === 'normal' ? colorState.normal : colorState.hover;
    
    return (
      <div className="astra-color-input-group">
        <div className="astra-color-input-wrapper">
          <input
            type="text"
            value={currentColor || ''}
            onChange={(e) => handleColorChange(e.target.value, state)}
            placeholder="#000000"
            className="astra-color-input"
          />
          <input
            type="color"
            value={currentColor || '#000000'}
            onChange={(e) => handleColorChange(e.target.value, state)}
            className="astra-color-native-picker"
          />
        </div>
        
        {clearable && currentColor && (
          <button
            onClick={() => handleClear(state)}
            className="astra-color-clear"
            title="Clear color"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  };
  
  return (
    <div className="astra-control astra-color-picker">
      <div className="astra-control-header">
        <label className="astra-control-label">{label}</label>
        {description && (
          <span className="astra-control-description">{description}</span>
        )}
      </div>
      
      <div className="astra-color-picker-container" ref={pickerRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="astra-color-preview-button"
          style={{
            background: hasHover && activeTab === 'hover' 
              ? colorState.hover || 'transparent'
              : colorState.normal || 'transparent',
          }}
        >
          <Pipette size={16} />
        </button>
        
        {isOpen && (
          <div className="astra-color-picker-dropdown">
            {hasHover && (
              <div className="astra-color-tabs">
                <button
                  onClick={() => setActiveTab('normal')}
                  className={`astra-color-tab ${activeTab === 'normal' ? 'active' : ''}`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setActiveTab('hover')}
                  className={`astra-color-tab ${activeTab === 'hover' ? 'active' : ''}`}
                >
                  Hover
                </button>
              </div>
            )}
            
            <div className="astra-color-picker-content">
              {renderColorInput(hasHover ? activeTab : 'normal')}
              
              <div className="astra-color-palette">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color, hasHover ? activeTab : 'normal')}
                    className="astra-color-palette-item"
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};