/**
 * ImageBlockToolbar Component
 * Toolbar for image blocks
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Maximize,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

interface ImageBlockToolbarProps {
  blockId: string;
  blockType: string;
  onUpdate?: (updates: any) => void;
}

const ImageBlockToolbar: React.FC<ImageBlockToolbarProps> = ({
  blockId,
  blockType,
  onUpdate,
}) => {
  const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);
  const [isLinkMenuOpen, setIsLinkMenuOpen] = useState(false);
  const [isAltMenuOpen, setIsAltMenuOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [altText, setAltText] = useState('');
  const alignMenuRef = useRef<HTMLDivElement>(null);
  const linkMenuRef = useRef<HTMLDivElement>(null);
  const altMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alignMenuRef.current && !alignMenuRef.current.contains(e.target as Node)) {
        setIsAlignMenuOpen(false);
      }
      if (linkMenuRef.current && !linkMenuRef.current.contains(e.target as Node)) {
        setIsLinkMenuOpen(false);
      }
      if (altMenuRef.current && !altMenuRef.current.contains(e.target as Node)) {
        setIsAltMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAlignment = (align: 'left' | 'center' | 'right' | 'wide' | 'full') => {
    onUpdate?.({ attributes: { align } });
    setIsAlignMenuOpen(false);
  };

  const applyLink = () => {
    if (linkUrl) {
      onUpdate?.({ attributes: { linkUrl } });
      setLinkUrl('');
      setIsLinkMenuOpen(false);
    }
  };

  const applyAlt = () => {
    if (altText) {
      onUpdate?.({ attributes: { alt: altText } });
      setAltText('');
      setIsAltMenuOpen(false);
    }
  };

  const handleReplaceImage = () => {
    // TODO: Integrate with media library
    // For now, prompt for URL
    const newUrl = prompt('Enter new image URL:');
    if (newUrl) {
      onUpdate?.({ attributes: { url: newUrl } });
    }
  };

  return (
    <>
      {/* Separator */}
      <div className="block-toolbar-separator" />

      <div className="block-toolbar-group block-toolbar-image">
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
                Image Alignment
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
              <div className="block-toolbar-menu-separator" />
              <button
                className="block-toolbar-menu-item"
                onClick={() => handleAlignment('wide')}
              >
                <Maximize2 size={16} />
                <span>Wide Width</span>
              </button>
              <button
                className="block-toolbar-menu-item"
                onClick={() => handleAlignment('full')}
              >
                <Maximize size={16} />
                <span>Full Width</span>
              </button>
            </div>
          )}
        </div>

        {/* Link URL */}
        <div className="block-toolbar-dropdown" ref={linkMenuRef}>
          <button
            className="block-toolbar-button"
            title="Add Link"
            aria-label="Add Link"
            onClick={() => setIsLinkMenuOpen(!isLinkMenuOpen)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <LinkIcon size={18} />
          </button>

          {isLinkMenuOpen && (
            <div className="block-toolbar-menu block-toolbar-menu-wide">
              <div className="block-toolbar-menu-header">
                Image Link
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

        {/* Alt Text */}
        <div className="block-toolbar-dropdown" ref={altMenuRef}>
          <button
            className="block-toolbar-button"
            title="Alt Text"
            aria-label="Alt Text"
            onClick={() => setIsAltMenuOpen(!isAltMenuOpen)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <FileText size={18} />
          </button>

          {isAltMenuOpen && (
            <div className="block-toolbar-menu block-toolbar-menu-wide">
              <div className="block-toolbar-menu-header">
                Alt Text
              </div>
              <div className="block-toolbar-link-form">
                <input
                  type="text"
                  placeholder="Describe this image..."
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyAlt();
                    } else if (e.key === 'Escape') {
                      setIsAltMenuOpen(false);
                    }
                  }}
                  autoFocus
                  className="block-toolbar-link-input"
                />
                <button
                  className="block-toolbar-link-submit"
                  onClick={applyAlt}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Replace Image */}
        <button
          className="block-toolbar-button"
          title="Replace Image"
          aria-label="Replace Image"
          onClick={handleReplaceImage}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ImageIcon size={18} />
        </button>
      </div>
    </>
  );
};

export default ImageBlockToolbar;
