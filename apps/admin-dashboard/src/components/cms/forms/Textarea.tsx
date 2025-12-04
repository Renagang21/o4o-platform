/**
 * CMS Forms - Textarea Component
 * Multi-line text input
 */

interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
}

export default function Textarea({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 4,
  maxLength,
}: TextareaProps) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-y"
      />
      {maxLength && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  );
}
