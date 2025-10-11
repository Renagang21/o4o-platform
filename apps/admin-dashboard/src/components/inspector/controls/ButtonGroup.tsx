/**
 * ButtonGroup Component
 * Button group control for Inspector sidebar (e.g., alignment options)
 */

import React, { ReactNode } from 'react';

interface ButtonGroupOption {
  label: string | ReactNode;
  value: string | number;
  icon?: ReactNode;
}

interface ButtonGroupProps {
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: ButtonGroupOption[];
  help?: string;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  label,
  value,
  onChange,
  options,
  help,
  className = '',
}) => {
  return (
    <div className={`inspector-control ${className}`}>
      {label && <label className="inspector-label">{label}</label>}
      <div className="inspector-button-group">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`inspector-button ${value === option.value ? 'is-active' : ''}`}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.icon && <span className="inline-flex items-center">{option.icon}</span>}
            {!option.icon && option.label}
          </button>
        ))}
      </div>
      {help && <p className="inspector-help text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
};

export default ButtonGroup;
