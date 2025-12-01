/**
 * JSX Editor Component
 * Text area for JSX code input with syntax highlighting (basic)
 */

import { FC } from 'react';

interface JsxEditorProps {
  value: string;
  onChange: (value: string) => void;
  onConvert: () => void;
  isConverting?: boolean;
}

export const JsxEditor: FC<JsxEditorProps> = ({
  value,
  onChange,
  onConvert,
  isConverting = false,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">JSX Code</h2>
        <button
          onClick={onConvert}
          disabled={isConverting || !value.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isConverting ? 'Converting...' : 'Convert to Blocks'}
        </button>
      </div>

      <div className="flex-1 border border-gray-300 rounded-md overflow-hidden">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your JSX code here...

Example:
export default function MyComponent() {
  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-3xl font-bold'>Hello World</h1>
      <p className='text-gray-600'>Welcome to O4O Page Generator</p>
    </div>
  );
}"
          className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          spellCheck={false}
        />
      </div>

      <div className="mt-2 text-sm text-gray-500">
        Lines: {value.split('\n').length} | Characters: {value.length}
      </div>
    </div>
  );
};
