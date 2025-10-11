/**
 * TextBlockToolbar Component
 * Toolbar for text blocks (Paragraph, Heading, Quote, List)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Underline, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, Palette } from 'lucide-react';

interface TextBlockToolbarProps {
  blockId: string;
  blockType: string;
  onUpdate?: (updates: any) => void;
}

const TextBlockToolbar: React.FC<TextBlockToolbarProps> = ({
  blockId,
  blockType,
  onUpdate,
}) => {
  const [isLinkMenuOpen, setIsLinkMenuOpen] = useState(false);
  const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkMenuRef = useRef<HTMLDivElement>(null);
  const alignMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (linkMenuRef.current && !linkMenuRef.current.contains(e.target as Node)) {
        setIsLinkMenuOpen(false);
      }
      if (alignMenuRef.current && !alignMenuRef.current.contains(e.target as Node)) {
        setIsAlignMenuOpen(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setIsColorMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
  };

  const handleLink = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setIsLinkMenuOpen(true);
    } else {
      alert('Please select text to create a link');
    }
  };

  const applyLink = () => {
    if (linkUrl) {
      document.execCommand('createLink', false, linkUrl);
      setLinkUrl('');
      setIsLinkMenuOpen(false);
    }
  };

  const handleAlignment = (align: 'left' | 'center' | 'right') => {
    onUpdate?.({ attributes: { align } });
    setIsAlignMenuOpen(false);
  };

  const handleColor = (color: string) => {
    document.execCommand('foreColor', false, color);
    setIsColorMenuOpen(false);
  };

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

      <div className="block-toolbar-group block-toolbar-text">
        {/* Bold */}
        <button
          className="block-toolbar-button"
          title="Bold (Cmd+B)"
          aria-label="Bold"
          onClick={() => handleFormat('bold')}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Bold size={18} />
        </button>

        {/* Italic */}
        <button
          className="block-toolbar-button"
          title="Italic (Cmd+I)"
          aria-label="Italic"
          onClick={() => handleFormat('italic')}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Italic size={18} />
        </button>

        {/* Underline */}
        <button
          className="block-toolbar-button"
          title="Underline (Cmd+U)"
          aria-label="Underline"
          onClick={() => handleFormat('underline')}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Underline size={18} />
        </button>

        {/* Link */}
        <div className="block-toolbar-dropdown" ref={linkMenuRef}>
          <button
            className="block-toolbar-button"
            title="Link (Cmd+K)"
            aria-label="Link"
            onClick={handleLink}
            onMouseDown={(e) => e.preventDefault()}
          >
            <LinkIcon size={18} />
          </button>

          {isLinkMenuOpen && (
            <div className="block-toolbar-menu block-toolbar-menu-wide">
              <div className="block-toolbar-menu-header">
                Insert Link
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

        {/* Separator */}
        <div className="block-toolbar-separator" />

        {/* Alignment */}
        <div className="block-toolbar-dropdown" ref={alignMenuRef}>
          <button
            className="block-toolbar-button"
            title="Align"
            aria-label="Align"
            onClick={() => setIsAlignMenuOpen(!isAlignMenuOpen)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <AlignLeft size={18} />
          </button>

          {isAlignMenuOpen && (
            <div className="block-toolbar-menu">
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

        {/* Text Color */}
        <div className="block-toolbar-dropdown" ref={colorMenuRef}>
          <button
            className="block-toolbar-button"
            title="Text Color"
            aria-label="Text Color"
            onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Palette size={18} />
          </button>

          {isColorMenuOpen && (
            <div className="block-toolbar-menu block-toolbar-color-menu">
              <div className="block-toolbar-menu-header">
                Text Color
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

export default TextBlockToolbar;
