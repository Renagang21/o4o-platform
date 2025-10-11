/**
 * RangeControl Component
 * Slider control for Inspector sidebar
 */

import React from 'react';

interface RangeControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  showValue?: boolean;
  className?: string;
}

export const RangeControl: React.FC<RangeControlProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  help,
  showValue = true,
  className = '',
}) => {
  return (
    <div className={`inspector-control inspector-range-control ${className}`}>
      <div className="inspector-range-header">
        <label className="inspector-label">{label}</label>
        {showValue && <span className="inspector-range-value">{value}</span>}
      </div>
      <input
        type="range"
        className="inspector-range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
      />
      {help && <p className="inspector-help text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
};

export default RangeControl;
