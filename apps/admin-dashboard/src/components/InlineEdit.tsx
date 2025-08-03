import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  onCancel?: () => void;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  disabled?: boolean;
}

export const InlineEdit: FC<InlineEditProps> = ({
  value: initialValue,
  onSave,
  onCancel,
  className,
  inputClassName,
  multiline = false,
  placeholder = 'Click to edit...',
  required = false,
  maxLength,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      } else if (!multiline && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  const handleSave = () => {
    if (required && !value.trim()) {
      setError('This field is required');
      return;
    }

    if (maxLength && value.length > maxLength) {
      setError(`Maximum ${maxLength} characters allowed`);
      return;
    }

    onSave(value);
    setIsEditing(false);
    setError('');
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
    setError('');
    onCancel?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        className={cn(
          'group relative inline-flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        onClick={() => !disabled && setIsEditing(true)}
      >
        <span className={cn('text-sm', !initialValue && 'text-gray-500')}>
          {initialValue || placeholder}
        </span>
        {!disabled && (
          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-start gap-2', className)}>
      <div className="flex-1">
        {multiline ? (
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e: any) => {
              setValue(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'min-h-[60px] resize-none',
              error && 'border-red-500',
              inputClassName
            )}
            maxLength={maxLength}
          />
        ) : (
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e: any) => {
              setValue(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              error && 'border-red-500',
              inputClassName
            )}
            maxLength={maxLength}
          />
        )}
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleSave}
        >
          <Check className="w-4 h-4 text-green-600" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleCancel}
        >
          <X className="w-4 h-4 text-red-600" />
        </Button>
      </div>
    </div>
  );
};

export default InlineEdit;
