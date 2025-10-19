/**
 * LinkInlineEditor Component
 *
 * Gutenberg-style inline link editor that appears near the selected text.
 * Allows users to:
 * - Enter URL
 * - Toggle "Open in new tab" (target="_blank")
 * - Apply or remove link
 */

import React, { useEffect, useRef, useState } from 'react';
import { Editor, Range } from 'slate';
import { ReactEditor, useSlate } from 'slate-react';
import { cn } from '@/lib/utils';
import { Link as LinkIcon, ExternalLink, X } from 'lucide-react';

interface LinkInlineEditorProps {
  onApply: (url: string, target?: '_blank' | '_self') => void;
  onRemove: () => void;
  onClose: () => void;
  initialUrl?: string;
  initialTarget?: '_blank' | '_self';
  position?: { top: number; left: number } | null;
}

const LinkInlineEditor: React.FC<LinkInlineEditorProps> = ({
  onApply,
  onRemove,
  onClose,
  initialUrl = '',
  initialTarget,
  position,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [openInNewTab, setOpenInNewTab] = useState(initialTarget === '_blank');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  useEffect(() => {
    // Handle clicks outside
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      const target = openInNewTab ? '_blank' : '_self';
      onApply(url.trim(), target);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!position) return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[320px]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onKeyDown={handleKeyDown}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* URL Input */}
        <div className="flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste URL or type to search"
            className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* New Tab Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="link-new-tab"
            checked={openInNewTab}
            onChange={(e) => setOpenInNewTab(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="link-new-tab" className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer">
            <ExternalLink className="w-3 h-3" />
            Open in new tab
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!url.trim()}
              className={cn(
                'px-3 py-1 text-sm font-medium text-white rounded',
                url.trim()
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-300 cursor-not-allowed'
              )}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>

          {initialUrl && (
            <button
              type="button"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="px-2 py-1 text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
              title="Remove link"
            >
              <X className="w-4 h-4" />
              Remove
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default LinkInlineEditor;
