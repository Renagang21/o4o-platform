/**
 * CMS Forms - InputSlug Component
 * Slug input with auto-formatting (lowercase, hyphenated)
 */

interface InputSlugProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoGenerate?: boolean;
  sourceValue?: string;
}

export default function InputSlug({
  value,
  onChange,
  placeholder,
  disabled,
  autoGenerate = false,
  sourceValue = '',
}: InputSlugProps) {
  const formatSlug = (input: string): string => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleChange = (input: string) => {
    const formatted = formatSlug(input);
    onChange(formatted);
  };

  const handleAutoGenerate = () => {
    if (sourceValue) {
      handleChange(sourceValue);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder || 'my-slug'}
        disabled={disabled}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
      />
      {autoGenerate && sourceValue && (
        <button
          type="button"
          onClick={handleAutoGenerate}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
        >
          Generate
        </button>
      )}
    </div>
  );
}
