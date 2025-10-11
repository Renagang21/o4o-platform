/**
 * Link Field Input Component
 * Allows users to input URL, Title, and Target for a link
 */

import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import type { LinkValue } from '../../types/acf.types';

interface LinkFieldInputProps {
  value?: LinkValue | null;
  onChange?: (value: LinkValue | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const LinkFieldInput: React.FC<LinkFieldInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter URL',
  required = false,
  disabled = false,
}) => {
  const [linkData, setLinkData] = useState<LinkValue>({
    url: value?.url || '',
    title: value?.title || '',
    target: value?.target || '_self',
  });

  // Sync with external value changes
  useEffect(() => {
    if (value) {
      setLinkData({
        url: value.url || '',
        title: value.title || '',
        target: value.target || '_self',
      });
    }
  }, [value]);

  const handleUrlChange = (url: string) => {
    const newValue = { ...linkData, url };
    setLinkData(newValue);
    onChange?.(url ? newValue : null);
  };

  const handleTitleChange = (title: string) => {
    const newValue = { ...linkData, title };
    setLinkData(newValue);
    onChange?.(linkData.url ? newValue : null);
  };

  const handleTargetChange = (target: '_blank' | '_self') => {
    const newValue = { ...linkData, target };
    setLinkData(newValue);
    onChange?.(linkData.url ? newValue : null);
  };

  return (
    <div className="space-y-3">
      {/* URL Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type="url"
            value={linkData.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className="
              w-full px-3 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
              pr-10
            "
          />
          <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Title Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Link Title (Optional)
        </label>
        <input
          type="text"
          value={linkData.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Enter link title"
          disabled={disabled}
          className="
            w-full px-3 py-2 border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
          "
        />
        <p className="mt-1 text-xs text-gray-500">
          If empty, the URL will be used as the title
        </p>
      </div>

      {/* Target Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Open Link In
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="_self"
              checked={linkData.target === '_self'}
              onChange={(e) => handleTargetChange(e.target.value as '_self')}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Same Window</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="_blank"
              checked={linkData.target === '_blank'}
              onChange={(e) => handleTargetChange(e.target.value as '_blank')}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">New Tab</span>
          </label>
        </div>
      </div>

      {/* Preview */}
      {linkData.url && (
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Preview:</p>
          <a
            href={linkData.url}
            target={linkData.target}
            rel={linkData.target === '_blank' ? 'noopener noreferrer' : undefined}
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm inline-flex items-center gap-1"
          >
            {linkData.title || linkData.url}
            {linkData.target === '_blank' && <ExternalLink className="w-3 h-3" />}
          </a>
        </div>
      )}
    </div>
  );
};

export default LinkFieldInput;
