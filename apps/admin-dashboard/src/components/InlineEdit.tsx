import { FC, ReactNode, useState, useEffect, useRef } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  onCancel?: () => void;
  type?: 'text' | 'textarea' | 'email' | 'number' | 'url';
  placeholder?: string;
  className?: string;
  editClassName?: string;
  displayClassName?: string;
  disabled?: boolean;
  validation?: ValidationRule[];
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  showEditButton?: boolean;
  autoTrim?: boolean;
  allowEmpty?: boolean;
  renderDisplay?: (value: string) => ReactNode;
}

export const InlineEdit: FC<InlineEditProps> = ({
  value,
  onSave,
  onCancel,
  type = 'text',
  placeholder = 'Click to edit',
  className = '',
  editClassName = '',
  displayClassName = '',
  disabled = false,
  validation = [],
  required = false,
  minLength,
  maxLength,
  showEditButton = true,
  autoTrim = true,
  allowEmpty = false,
  renderDisplay,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type !== 'textarea') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const validate = (val: string): string | null => {
    const trimmedValue = autoTrim ? val.trim() : val;

    if (required && !trimmedValue) {
      return 'This field is required';
    }

    if (!allowEmpty && !trimmedValue) {
      return 'This field cannot be empty';
    }

    if (minLength && trimmedValue.length < minLength) {
      return `Minimum length is ${minLength} characters`;
    }

    if (maxLength && trimmedValue.length > maxLength) {
      return `Maximum length is ${maxLength} characters`;
    }

    if (type === 'email' && trimmedValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedValue)) {
        return 'Please enter a valid email address';
      }
    }

    if (type === 'url' && trimmedValue) {
      try {
        new URL(trimmedValue);
      } catch {
        return 'Please enter a valid URL';
      }
    }

    if (type === 'number' && trimmedValue) {
      if (isNaN(Number(trimmedValue))) {
        return 'Please enter a valid number';
      }
    }

    for (const rule of validation) {
      if (!rule.test(trimmedValue)) {
        return rule.message;
      }
    }

    return null;
  };

  const handleSave = async () => {
    const finalValue = autoTrim ? editValue.trim() : editValue;
    const validationError = validate(finalValue);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(finalValue);
      setIsEditing(false);
    } catch (error) {
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setError(null);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    const InputComponent = type === 'textarea' ? 'textarea' : 'input';
    
    return (
      <div className={cn('inline-flex flex-col gap-1 w-full', className)}>
        <div className="inline-flex items-center gap-2">
          <InputComponent
            ref={inputRef as any}
            type={type === 'textarea' ? undefined : type}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            placeholder={placeholder}
            className={cn(
              'px-2 py-1 border rounded',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500 focus:ring-red-500',
              editClassName
            )}
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 group',
        !disabled && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 -my-1',
        className
      )}
      onClick={() => !disabled && setIsEditing(true)}
    >
      <span className={cn('break-all', displayClassName)}>
        {renderDisplay ? renderDisplay(value) : (value || placeholder)}
      </span>
      {showEditButton && !disabled && (
        <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
};
