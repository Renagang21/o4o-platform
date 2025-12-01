/**
 * ButtonBlock Component - Gutenberg Standard
 *
 * WordPress-standard button block with:
 * - BlockToolbar: Alignment, style (fill/outline) controls
 * - InspectorControls: Color, Typography, Spacing, Border, Advanced settings
 * - Clean HTML structure: <a> tag (not div wrappers)
 * - Class-based styling (not inline styles)
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Link2,
  ExternalLink,
  Palette,
  Type,
  Maximize,
  CornerUpRight,
} from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { RichText } from '../gutenberg/RichText';
import { BlockToolbar } from './gutenberg/BlockToolbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { URLInput, normalizeURL } from '@/components/common';
import { EnhancedLinkControl, type LinkData } from '@/components/editor/controls/EnhancedLinkControl';

interface AnimationSettings {
  enabled: boolean;
  type: 'scale' | 'translate' | 'rotate' | 'glow' | 'bounce' | 'pulse' | 'shake' | 'flip';
  duration: number;
  intensity: number;
  timingFunction: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay: number;
}

interface ButtonBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    text?: string;
    url?: string;
    linkTarget?: '_self' | '_blank';
    rel?: string;
    // Style
    style?: 'fill' | 'outline';
    // Alignment
    align?: 'left' | 'center' | 'right';
    width?: number; // percentage
    // Colors
    textColor?: string;
    backgroundColor?: string;
    gradient?: string;
    // Typography
    fontSize?: number;
    fontWeight?: number;
    // Border
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    // Spacing
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    // Animation
    animation?: AnimationSettings;
  };
}

const ButtonBlock: React.FC<ButtonBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {}
}) => {
  const {
    text = 'Click here',
    url = '#',
    linkTarget = '_self',
    rel = '',
    style = 'fill',
    align = 'left',
    width = 0,
    textColor = '#ffffff',
    backgroundColor = '#007cba',
    gradient = '',
    fontSize = 16,
    fontWeight = 400,
    borderRadius = 4,
    borderWidth = 2,
    borderColor = '#007cba',
    paddingTop = 12,
    paddingRight = 24,
    paddingBottom = 12,
    paddingLeft = 24,
  } = attributes;

  const [localText, setLocalText] = useState(text);
  const [showURLPopover, setShowURLPopover] = useState(false);
  const [showEnhancedLinkControl, setShowEnhancedLinkControl] = useState(false);
  const [localUrl, setLocalUrl] = useState(url);
  const [localTarget, setLocalTarget] = useState(linkTarget);
  const [linkData, setLinkData] = useState<LinkData>({
    url: url || '#',
    type: 'url',
    target: linkTarget,
    rel: rel,
  });
  const [isHovered, setIsHovered] = useState(false);

  // Sync text when attributes change
  useEffect(() => {
    setLocalText(text);
    setLocalUrl(url);
    setLocalTarget(linkTarget);
    setLinkData({
      url: url || '#',
      type: 'url',
      target: linkTarget,
      rel: rel,
    });
  }, [text, url, linkTarget, rel]);

  // Update attribute
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  }, [content, attributes, onChange]);

  // Handle text change
  const handleTextChange = (newText: string) => {
    // Extract plain text from HTML
    const plainText = newText.replace(/<[^>]*>/g, '');
    setLocalText(plainText);
    updateAttribute('text', plainText);
  };

  // Handle URL save (legacy)
  const handleUrlSave = () => {
    const normalizedUrl = normalizeURL(localUrl);
    updateAttribute('url', normalizedUrl);
    updateAttribute('linkTarget', localTarget);
    setShowURLPopover(false);
  };

  // Handle enhanced link control apply
  const handleEnhancedLinkApply = () => {
    updateAttribute('url', linkData.url);
    updateAttribute('linkTarget', linkData.target);
    updateAttribute('rel', linkData.rel || '');
    setShowEnhancedLinkControl(false);
  };

  // Handle enhanced link control change
  const handleEnhancedLinkChange = (data: LinkData) => {
    setLinkData(data);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        return;
      }
      e.preventDefault();
      onAddBlock?.('after', 'o4o/paragraph');
    }
  };

  // Get button classes (Gutenberg-style)
  const getButtonClasses = () => {
    const classes = [
      'wp-block-button__link',
      'wp-element-button'
    ];

    if (style === 'outline') {
      classes.push('is-style-outline');
    }

    if (gradient) {
      classes.push(`has-${gradient}-gradient-background`);
    } else if (backgroundColor && style === 'fill') {
      classes.push('has-background');
    }

    if (borderRadius) {
      classes.push('has-border-radius');
    }

    return classes.join(' ');
  };

  // Get button styles
  const getButtonStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {
      fontSize: `${fontSize}px`,
      fontWeight,
      paddingTop: `${paddingTop}px`,
      paddingRight: `${paddingRight}px`,
      paddingBottom: `${paddingBottom}px`,
      paddingLeft: `${paddingLeft}px`,
      borderRadius: `${borderRadius}px`,
    };

    if (style === 'fill') {
      if (gradient) {
        // Gradient background (will be handled by class)
        styles.background = gradient;
      } else {
        styles.backgroundColor = backgroundColor;
      }
      styles.color = textColor;
      styles.border = 'none';
    } else {
      // Outline style
      styles.backgroundColor = 'transparent';
      styles.color = borderColor || backgroundColor;
      styles.border = `${borderWidth}px solid ${borderColor || backgroundColor}`;
    }

    // Add animation transition and effects if enabled
    if (attributes.animation?.enabled) {
      const { type, duration, intensity, timingFunction, delay } = attributes.animation;
      styles.transition = `all ${duration}ms ${timingFunction} ${delay}ms`;

      // Apply hover effects when hovered
      if (isHovered) {
        switch (type) {
          case 'scale':
            styles.transform = `scale(${1 + (intensity * 0.02)})`;
            break;
          case 'translate':
            styles.transform = `translateY(-${intensity}px)`;
            break;
          case 'rotate':
            styles.transform = `rotate(${intensity * 2}deg)`;
            break;
          case 'glow':
            styles.transform = 'scale(1.02)';
            styles.boxShadow = `0 0 ${intensity * 3}px rgba(59, 130, 246, 0.6)`;
            break;
          case 'bounce':
            styles.transform = 'scale(1.05)';
            break;
          case 'pulse':
            styles.transform = `scale(${1 + (intensity * 0.01)})`;
            break;
          case 'shake':
            styles.transform = `translateX(${intensity}px)`;
            break;
          case 'flip':
            styles.transform = `rotateY(${intensity * 10}deg)`;
            break;
        }
      }
    }

    return styles;
  };

  // Get wrapper alignment class
  const getWrapperClasses = () => {
    const classes = ['wp-block-button'];

    if (width > 0) {
      classes.push('has-custom-width');
    }

    return classes.join(' ');
  };

  const getAlignmentClass = () => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };


  return (
    <EnhancedBlockWrapper
      id={id}
      type="button"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      className="wp-block-button-wrapper"
      showToolbar={false}
    >
      {/* Gutenberg BlockToolbar */}
      {isSelected && (
        <BlockToolbar
          align={align}
          onAlignChange={(newAlign) => updateAttribute('align', newAlign)}
          onDuplicate={onDuplicate}
          onInsertBefore={() => onAddBlock?.('before')}
          onInsertAfter={() => onAddBlock?.('after')}
          onRemove={onDelete}
        >
          {/* Style selector: Fill / Outline */}
          <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300">
            <button
              onClick={() => updateAttribute('style', 'fill')}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                style === 'fill' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              )}
              title="Fill style"
            >
              Fill
            </button>
            <button
              onClick={() => updateAttribute('style', 'outline')}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                style === 'outline' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              )}
              title="Outline style"
            >
              Outline
            </button>
          </div>

          {/* Link button */}
          <button
            onClick={() => setShowEnhancedLinkControl(!showEnhancedLinkControl)}
            className={cn(
              'p-1.5 rounded hover:bg-gray-100 transition-colors',
              showEnhancedLinkControl && 'bg-gray-200'
            )}
            title="Edit link"
          >
            <Link2 className="w-4 h-4" />
          </button>
        </BlockToolbar>
      )}

      {/* Enhanced Link Control */}
      {showEnhancedLinkControl && isSelected && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <EnhancedLinkControl
            value={linkData}
            onChange={handleEnhancedLinkChange}
            onClose={() => setShowEnhancedLinkControl(false)}
            onApply={handleEnhancedLinkApply}
            showRecent={true}
          />
        </div>
      )}

      {/* Button Wrapper */}
      <div className={cn(getWrapperClasses(), getAlignmentClass())}>
        <a
          href={url || '#'}
          target={linkTarget}
          rel={linkTarget === '_blank' ? 'noopener noreferrer' : rel}
          className={getButtonClasses()}
          style={{
            ...getButtonStyles(),
            width: width > 0 ? `${width}%` : 'auto',
            display: 'inline-block',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.preventDefault(); // Prevent navigation in editor
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <RichText
            tagName="span"
            value={localText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Add text..."
            className="outline-none"
            allowedFormats={[]}
            style={{ background: 'none', border: 'none', padding: 0, color: 'inherit' }}
          />
        </a>
      </div>
    </EnhancedBlockWrapper>
  );
};

export default ButtonBlock;
