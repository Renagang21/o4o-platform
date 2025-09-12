import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

interface AstraSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[] | string[];
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export const AstraSelect: React.FC<AstraSelectProps> = ({
  label,
  value,
  onChange,
  options,
  description,
  placeholder = 'Select an option',
  disabled = false,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const selectRef = React.useRef<HTMLDivElement>(null);
  
  // Normalize options to SelectOption format
  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );
  
  // Group options if groups are present
  const groupedOptions = normalizedOptions.reduce((acc, option) => {
    const group = option.group || 'default';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(option);
    return acc;
  }, {} as Record<string, SelectOption[]>);
  
  // Filter options based on search
  const filteredOptions = searchTerm
    ? normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : normalizedOptions;
  
  // Get current label
  const currentOption = normalizedOptions.find((opt) => opt.value === value);
  const currentLabel = currentOption?.label || placeholder;
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  const renderOptions = () => {
    if (Object.keys(groupedOptions).length === 1 && groupedOptions.default) {
      // No groups, render flat list
      return filteredOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => handleSelect(option.value)}
          className={`astra-select-option ${
            option.value === value ? 'selected' : ''
          } ${option.disabled ? 'disabled' : ''}`}
          disabled={option.disabled}
        >
          {option.label}
        </button>
      ));
    }
    
    // Render grouped options
    return Object.entries(groupedOptions).map(([group, groupOptions]) => (
      <div key={group} className="astra-select-group">
        {group !== 'default' && (
          <div className="astra-select-group-label">{group}</div>
        )}
        {groupOptions
          .filter((opt) => !searchTerm || filteredOptions.includes(opt))
          .map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`astra-select-option ${
                option.value === value ? 'selected' : ''
              } ${option.disabled ? 'disabled' : ''}`}
              disabled={option.disabled}
            >
              {option.label}
            </button>
          ))}
      </div>
    ));
  };
  
  return (
    <div className="astra-control astra-select" ref={selectRef}>
      <div className="astra-control-header">
        <label className="astra-control-label">{label}</label>
        {description && (
          <span className="astra-control-description">{description}</span>
        )}
      </div>
      
      <div className="astra-select-container">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`astra-select-trigger ${isOpen ? 'open' : ''} ${
            disabled ? 'disabled' : ''
          }`}
          disabled={disabled}
        >
          <span className="astra-select-value">{currentLabel}</span>
          <ChevronDown size={16} className="astra-select-icon" />
        </button>
        
        {isOpen && (
          <div className="astra-select-dropdown">
            {searchable && (
              <div className="astra-select-search">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="astra-select-search-input"
                  autoFocus
                />
              </div>
            )}
            
            <div className="astra-select-options">
              {filteredOptions.length > 0 ? (
                renderOptions()
              ) : (
                <div className="astra-select-empty">No options found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};