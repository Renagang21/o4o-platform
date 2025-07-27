import { useState, useEffect, useRef } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  onCancel?: () => void;
  type?: 'text' | 'number' | 'email' | 'select';
  options?: { value: string; label: string }[]; // For select type
  placeholder?: string;
  className?: string;
  editIconClassName?: string;
  inputClassName?: string;
  validation?: (value: string) => boolean;
  emptyText?: string;
  showEditIcon?: boolean;
}

const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onSave,
  onCancel,
  type = 'text',
  options = [],
  placeholder = 'Click to edit',
  className = '',
  editIconClassName = '',
  inputClassName = '',
  validation,
  emptyText = 'Click to add',
  showEditIcon = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = async () => {
    if (validation && !validation(editValue)) {
      return;
    }

    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "inline-flex items-center gap-2 group cursor-pointer",
          "hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 -mx-2 -my-1 rounded transition-colors",
          className
        )}
        onClick={handleEdit}
      >
        <span className={cn(
          value ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400 italic"
        )}>
          {value || emptyText}
        </span>
        {showEditIcon && (
          <Edit2 
            className={cn(
              "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity",
              "text-gray-400 dark:text-gray-500",
              editIconClassName
            )}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="inline-flex items-center gap-2">
      {type === 'select' ? (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className={cn(
            "px-2 py-1 text-sm rounded border transition-colors",
            "bg-white dark:bg-gray-800",
            "border-gray-300 dark:border-gray-600",
            "text-gray-700 dark:text-gray-300",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
            inputClassName
          )}
          autoFocus
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            "px-2 py-1 text-sm rounded border transition-colors",
            "bg-white dark:bg-gray-800",
            "border-gray-300 dark:border-gray-600",
            "text-gray-700 dark:text-gray-300",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
            inputClassName
          )}
        />
      )}
      <button
        onClick={handleSave}
        disabled={isLoading}
        className={cn(
          "p-1 rounded transition-colors",
          "text-success-600 hover:bg-success-100 dark:text-success-400 dark:hover:bg-success-900/20",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        title="Save"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={handleCancel}
        disabled={isLoading}
        className={cn(
          "p-1 rounded transition-colors",
          "text-error-600 hover:bg-error-100 dark:text-error-400 dark:hover:bg-error-900/20",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        title="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default InlineEdit;