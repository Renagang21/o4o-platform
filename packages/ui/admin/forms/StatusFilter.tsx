import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

interface StatusFilterProps {
  value: string[];
  onChange: (values: string[]) => void;
  options: StatusOption[];
  placeholder?: string;
  className?: string;
  multiple?: boolean;
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select status",
  className = "",
  multiple = true,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOptionClick = (optionValue: string) => {
    if (multiple) {
      const newValue = value.includes(optionValue)
        ? value.filter(v => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    } else {
      onChange([optionValue]);
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const option = options.find(opt => opt.value === value[0]);
      return option?.label || value[0];
    }
    return `${value.length} selected`;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm flex items-center justify-between"
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown className="h-5 w-5 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 max-h-60 overflow-auto">
            <div className="py-1">
              {options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => handleOptionClick(option.value)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      {option.color && (
                        <div
                          className="w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <span className="text-gray-900 dark:text-gray-100">
                        {option.label}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};