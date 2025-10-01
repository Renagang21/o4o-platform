import React, { useState, useCallback } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { ResponsiveValue, PreviewDevice } from '../../types/customizer-types';

type Unit = 'px' | 'em' | 'rem' | '%' | 'vh' | 'vw';

interface AstraSliderProps {
  label: string;
  value: number | ResponsiveValue<number>;
  onChange: (value: number | ResponsiveValue<number>) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: Unit | Unit[];
  description?: string;
  responsive?: boolean;
  defaultUnit?: Unit;
  previewDevice?: PreviewDevice; // Context 대신 props로 받기
}

export const AstraSlider: React.FC<AstraSliderProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = 'px',
  description,
  responsive = false,
  defaultUnit = 'px',
  previewDevice = 'desktop',
}) => {
  const currentDevice = previewDevice;
  
  const [selectedUnit, setSelectedUnit] = useState<Unit>(defaultUnit);
  const [linkedDevices, setLinkedDevices] = useState(true);
  
  const units = Array.isArray(unit) ? unit : [unit];
  
  // Get value for current device
  const getCurrentValue = (): number => {
    if (typeof value === 'number') {
      return value;
    }
    return value[currentDevice];
  };
  
  // Handle value change
  const handleChange = (newValue: number, device?: PreviewDevice) => {
    if (!responsive || typeof value === 'number') {
      onChange(newValue);
      return;
    }
    
    const targetDevice = device || currentDevice;
    const responsiveValue = value as ResponsiveValue<number>;
    
    if (linkedDevices) {
      // Update all devices with the same value
      onChange({
        desktop: newValue,
        tablet: newValue,
        mobile: newValue,
      });
    } else {
      // Update only the target device
      onChange({
        ...responsiveValue,
        [targetDevice]: newValue,
      });
    }
  };
  
  // Get max value based on unit
  const getMaxValue = (): number => {
    switch (selectedUnit) {
      case '%':
      case 'vh':
      case 'vw':
        return 100;
      case 'em':
      case 'rem':
        return 10;
      default:
        return max;
    }
  };
  
  // Get step based on unit
  const getStep = (): number => {
    switch (selectedUnit) {
      case 'em':
      case 'rem':
        return 0.1;
      default:
        return step;
    }
  };
  
  const renderDeviceControls = () => {
    if (!responsive || typeof value === 'number') return null;
    
    const responsiveValue = value as ResponsiveValue<number>;
    
    return (
      <div className="astra-slider-devices">
        <div className="astra-device-buttons">
          <button
            className={`astra-device-button ${currentDevice === 'desktop' ? 'active' : ''}`}
            onClick={() => handleChange(responsiveValue.desktop, 'desktop')}
            title="Desktop"
          >
            <Monitor size={14} />
          </button>
          <button
            className={`astra-device-button ${currentDevice === 'tablet' ? 'active' : ''}`}
            onClick={() => handleChange(responsiveValue.tablet, 'tablet')}
            title="Tablet"
          >
            <Tablet size={14} />
          </button>
          <button
            className={`astra-device-button ${currentDevice === 'mobile' ? 'active' : ''}`}
            onClick={() => handleChange(responsiveValue.mobile, 'mobile')}
            title="Mobile"
          >
            <Smartphone size={14} />
          </button>
        </div>
        
        <button
          onClick={() => setLinkedDevices(!linkedDevices)}
          className={`astra-link-button ${linkedDevices ? 'linked' : ''}`}
          title={linkedDevices ? 'Unlink values' : 'Link values'}
        >
          🔗
        </button>
      </div>
    );
  };
  
  const currentValue = getCurrentValue();
  const maxValue = getMaxValue();
  const stepValue = getStep();
  
  return (
    <div className="astra-control astra-slider">
      <div className="astra-control-header">
        <label className="astra-control-label">{label}</label>
        {renderDeviceControls()}
      </div>
      
      {description && (
        <span className="astra-control-description">{description}</span>
      )}
      
      <div className="astra-slider-container">
        <div className="astra-slider-track-wrapper">
          <input
            type="range"
            min={min}
            max={maxValue}
            step={stepValue}
            value={currentValue}
            onChange={(e) => handleChange(parseFloat(e.target.value))}
            className="astra-slider-track"
            style={{
              background: `linear-gradient(to right, #0073aa 0%, #0073aa ${
                ((currentValue - min) / (maxValue - min)) * 100
              }%, #ddd ${((currentValue - min) / (maxValue - min)) * 100}%, #ddd 100%)`,
            }}
          />
        </div>
        
        <div className="astra-slider-input-group">
          <input
            type="number"
            min={min}
            max={maxValue}
            step={stepValue}
            value={currentValue}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            className="astra-slider-input"
          />
          
          {units.length > 1 ? (
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value as Unit)}
              className="astra-slider-unit"
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          ) : (
            <span className="astra-slider-unit-label">{units[0]}</span>
          )}
        </div>
      </div>
      
      {responsive && typeof value !== 'number' && !linkedDevices && (
        <div className="astra-slider-values">
          <span>D: {value.desktop}{selectedUnit}</span>
          <span>T: {value.tablet}{selectedUnit}</span>
          <span>M: {value.mobile}{selectedUnit}</span>
        </div>
      )}
    </div>
  );
};