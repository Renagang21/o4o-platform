/**
 * TextControl Component
 * Text input control for Inspector sidebar
 */

import React from 'react';

interface TextControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
  type?: 'text' | 'email' | 'url' | 'number';
  className?: string;
}

export const TextControl: React.FC<TextControlProps> = ({
  label,
  value,
  onChange,
  placeholder,
  help,
  type = 'text',
  className = '',
}) => {
  return (
    <div className={`inspector-control ${className}`}>
      <label className="inspector-label">{label}</label>
      <input
        type={type}
        className="inspector-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {help && <p className="inspector-help text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
};

export default TextControl;
