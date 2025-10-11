/**
 * ToggleControl Component
 * Toggle switch control for Inspector sidebar
 */

import React from 'react';

interface ToggleControlProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
  className?: string;
}

export const ToggleControl: React.FC<ToggleControlProps> = ({
  label,
  checked,
  onChange,
  help,
  className = '',
}) => {
  return (
    <div className={`inspector-control ${className}`}>
      <div className="inspector-toggle-control">
        <label className="inspector-label">{label}</label>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          className={`inspector-toggle ${checked ? 'is-checked' : ''}`}
          onClick={() => onChange(!checked)}
        />
      </div>
      {help && <p className="inspector-help text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
};

export default ToggleControl;
