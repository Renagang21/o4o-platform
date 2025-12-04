/**
 * CMS Forms - JSONEditor Component
 * JSON editor with syntax highlighting and validation
 */

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface JSONEditorProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  minHeight?: string;
}

export default function JSONEditor({
  value,
  onChange,
  disabled,
  minHeight = '400px',
}: JSONEditorProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  // Initialize text from value
  useEffect(() => {
    try {
      const formatted = JSON.stringify(value, null, 2);
      setText(formatted);
      setError(null);
      setIsValid(true);
    } catch (err) {
      console.error('Failed to format JSON:', err);
    }
  }, [value]);

  const handleChange = (newText: string) => {
    setText(newText);

    // Try to parse JSON
    try {
      const parsed = JSON.parse(newText);
      setError(null);
      setIsValid(true);
      onChange(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
      setIsValid(false);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      setText(formatted);
      onChange(parsed);
      setError(null);
      setIsValid(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isValid ? (
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Valid JSON</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Invalid JSON</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleFormat}
          disabled={disabled || !isValid}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Format
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          font-mono text-sm resize-y
          ${error ? 'border-red-300' : 'border-gray-300'}
        `}
        style={{ minHeight }}
        spellCheck={false}
      />

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-600 font-mono">{error}</p>
        </div>
      )}
    </div>
  );
}
