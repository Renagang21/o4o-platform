/**
 * ButtonBlockToolbar Component
 * Toolbar for button blocks
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Palette,
} from 'lucide-react';

interface ButtonBlockToolbarProps {
  blockId: string;
  blockType: string;
  onUpdate?: (updates: any) => void;
}

const ButtonBlockToolbar: React.FC<ButtonBlockToolbarProps> = ({
  blockId,
  blockType,
  onUpdate,
}) => {
  const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);
  const [isLinkMenuOpen, setIsLinkMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const alignMenuRef = useRef<HTMLDivElement>(null);
  const linkMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alignMenuRef.current && !alignMenuRef.current.contains(e.target as Node)) {
        setIsAlignMenuOpen(false);
      }
      if (linkMenuRef.current && !linkMenuRef.current.contains(e.target as Node)) {
        setIsLinkMenuOpen(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setIsColorMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAlignment = (align: 'left' | 'center' | 'right') => {
    onUpdate?.({ attributes: { align } });
    setIsAlignMenuOpen(false);
  };

  const applyLink = () => {
    if (linkUrl) {
      onUpdate?.({ attributes: { url: linkUrl } });
      setLinkUrl('');
      setIsLinkMenuOpen(false);
    }
  };

  const handleColor = (color: string) => {
    onUpdate?.({ attributes: { backgroundColor: color } });
    setIsColorMenuOpen(false);
  };

  // Button colors - more vibrant for buttons
  const colors = [
    '#000000', '#374151', '#6b7280', '#9ca3af',
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  ];

  return (
    <>
      {/* Separator */}
      <div className="block-toolbar-separator" />

      <div className="block-toolbar-group block-toolbar-button">
        {/* Alignment */}
        <div className="block-toolbar-dropdown" ref={alignMenuRef}>
          <button
            className="block-toolbar-button"
            title="Alignment"
            aria-label="Alignment"
            onClick={() => setIsAlignMenuOpen(!isAlignMenuOpen)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <AlignLeft size={18} />
          </button>

          {isAlignMenuOpen && (
            <div className="block-toolbar-menu">
              <div className="block-toolbar-menu-header">
                Button Alignment
              </div>
              <button
                className="block-toolbar-menu-item"
                onClick={() => handleAlignment('left')}
              >
                <AlignLeft size={16} />
                <span>Align Left</span>
              </button>
              <button
                className="block-toolbar-menu-item"
                onClick={() => handleAlignment('center')}
              >
                <AlignCenter size={16} />
                <span>Align Center</span>
              </button>
              <button
                className="block-toolbar-menu-item"
                onClick={() => handleAlignment('right')}
              >
                <AlignRight size={16} />
                <span>Align Right</span>
              </button>
            </div>
          )}
        </div>

        {/* Link URL */}
        <div className="block-toolbar-dropdown" ref={linkMenuRef}>
          <button
            className="block-toolbar-button"
            title="Link URL"
            aria-label="Link URL"
            onClick={() => setIsLinkMenuOpen(!isLinkMenuOpen)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <LinkIcon size={18} />
          </button>

          {isLinkMenuOpen && (
            <div className="block-toolbar-menu block-toolbar-menu-wide">
              <div className="block-toolbar-menu-header">
                Button Link
              </div>
              <div className="block-toolbar-link-form">
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyLink();
                    } else if (e.key === 'Escape') {
                      setIsLinkMenuOpen(false);
                    }
                  }}
                  autoFocus
                  className="block-toolbar-link-input"
                />
                <button
                  className="block-toolbar-link-submit"
                  onClick={applyLink}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Button Color */}
        <div className="block-toolbar-dropdown" ref={colorMenuRef}>
          <button
            className="block-toolbar-button"
            title="Button Color"
            aria-label="Button Color"
            onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Palette size={18} />
          </button>

          {isColorMenuOpen && (
            <div className="block-toolbar-menu block-toolbar-color-menu">
              <div className="block-toolbar-menu-header">
                Button Color
              </div>
              <div className="block-toolbar-color-grid">
                {colors.map(color => (
                  <button
                    key={color}
                    className="block-toolbar-color-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => handleColor(color)}
                    title={color}
                    aria-label={`Color ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ButtonBlockToolbar;
