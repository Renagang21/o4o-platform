import { FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type SelectVariant = 'default' | 'outlined' | 'filled';
export type SelectSize = 'sm' | 'md' | 'lg';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  variant?: SelectVariant;
  size?: SelectSize;
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const Select: FC<SelectProps> = ({
  variant = 'default',
  size = 'md',
  label,
  error,
  helperText,
  options,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'w-full rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 appearance-none';
  
  const variantStyles = {
    default: 'border-gray-300 focus:border-primary focus:ring-primary',
    outlined: 'border-2 border-primary focus:ring-primary',
    filled: 'bg-gray-50 border-gray-200 focus:border-primary focus:ring-primary'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const stateStyles = {
    error: 'border-danger focus:border-danger focus:ring-danger',
    disabled: 'bg-gray-100 text-gray-500 cursor-not-allowed'
  };

  const widthStyles = fullWidth ? 'w-full' : '';

  const selectStyles = twMerge(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    error ? stateStyles.error : '',
    disabled ? stateStyles.disabled : '',
    widthStyles,
    className
  );

  return (
    <div className={`space-y-1 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        <select
          className={twMerge(
            selectStyles,
            leftIcon && 'pl-10',
            rightIcon && 'pr-10'
          )}
          disabled={disabled}
          {...props}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {rightIcon}
          </div>
        )}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {(error || helperText) && (
        <p className={`text-sm ${error ? 'text-danger' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Select; 