import React from 'react';

interface AstraToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export const AstraToggle: React.FC<AstraToggleProps> = ({
  label,
  value,
  onChange,
  description,
  disabled = false,
}) => {
  return (
    <div className="astra-control astra-toggle">
      <div className="astra-toggle-container">
        <div className="astra-toggle-content">
          <label className="astra-control-label">{label}</label>
          {description && (
            <span className="astra-control-description">{description}</span>
          )}
        </div>
        
        <button
          onClick={() => !disabled && onChange(!value)}
          className={`astra-toggle-switch ${value ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          disabled={disabled}
          role="switch"
          aria-checked={value}
          aria-label={label}
        >
          <span className="astra-toggle-slider" />
        </button>
      </div>
    </div>
  );
};