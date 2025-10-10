/**
 * SelectControl Component
 * Dropdown select control for Inspector sidebar
 */

import React from 'react';

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectControlProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  help?: string;
  className?: string;
}

export const SelectControl: React.FC<SelectControlProps> = ({
  label,
  value,
  onChange,
  options,
  help,
  className = '',
}) => {
  return (
    <div className={`inspector-control ${className}`}>
      <label className="inspector-label">{label}</label>
      <select
        className="inspector-select"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          // Try to parse as number if it looks like a number
          const parsedVal = !isNaN(Number(val)) && val !== '' ? Number(val) : val;
          onChange(parsedVal);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {help && <p className="inspector-help text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
};

export default SelectControl;
