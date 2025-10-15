/**
 * LinkPopover Component
 * Gutenberg 스타일 링크 편집 팝업
 */

import React, { FC, useState, useEffect, useRef } from 'react';
import { Link2, ExternalLink, Unlink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LinkPopoverProps {
  initialUrl?: string;
  initialOpenInNewTab?: boolean;
  onSave: (url: string, openInNewTab: boolean) => void;
  onRemove?: () => void;
  onClose: () => void;
  position?: { top: number; left: number };
  className?: string;
}

export const LinkPopover: FC<LinkPopoverProps> = ({
  initialUrl = '',
  initialOpenInNewTab = false,
  onSave,
  onRemove,
  onClose,
  position,
  className,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [openInNewTab, setOpenInNewTab] = useState(initialOpenInNewTab);
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // URL validation
  const validateUrl = (value: string) => {
    if (!value) return false;

    // Simple URL validation
    try {
      // Allow relative URLs
      if (value.startsWith('/') || value.startsWith('#')) {
        return true;
      }

      // Check for protocol
      if (!value.match(/^https?:\/\//)) {
        return false;
      }

      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setIsValid(validateUrl(value));
  };

  const handleSave = () => {
    if (!url || !isValid) return;

    // Auto-add https:// if missing
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('#')) {
      finalUrl = `https://${url}`;
    }

    onSave(finalUrl, openInNewTab);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={popoverRef}
      className={cn(
        'link-popover',
        'absolute z-50 w-80',
        'bg-white border border-gray-200 rounded-lg shadow-lg',
        'p-4',
        className
      )}
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <div className="space-y-3">
        {/* URL Input */}
        <div>
          <Label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            Link URL
          </Label>
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com or /page"
              className={cn(
                'pr-8',
                !isValid && url && 'border-red-500'
              )}
            />
            {isValid && url && (
              <Check className="absolute right-2 top-2.5 w-4 h-4 text-green-500" />
            )}
          </div>
          {!isValid && url && (
            <p className="text-xs text-red-500 mt-1">
              Invalid URL format
            </p>
          )}
        </div>

        {/* Open in New Tab */}
        <div className="flex items-center justify-between">
          <Label className="text-sm flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            Open in new tab
          </Label>
          <Switch
            checked={openInNewTab}
            onCheckedChange={setOpenInNewTab}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            {initialUrl && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Unlink className="w-4 h-4 mr-1" />
                Remove Link
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!url || !isValid}
            >
              <Link2 className="w-4 h-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkPopover;
