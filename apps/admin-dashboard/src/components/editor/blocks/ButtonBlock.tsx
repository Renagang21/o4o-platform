/**
 * ButtonBlock Component
 * Gutenberg-style button block with BlockControls and InspectorControls
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Link2,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Settings,
  Layers,
  Star,
  X
} from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { RichText } from '../gutenberg/RichText';
import { BlockControls, ToolbarGroup, ToolbarButton } from '../gutenberg/BlockControls';
import { GradientEditor } from './button/GradientEditor';
import { ShadowEditor } from './button/ShadowEditor';
import { IconInserter } from './button/IconInserter';
import { Button } from '@/components/ui/button';

interface ButtonBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    text?: string;
    url?: string;
    style?: 'fill' | 'outline';
    width?: number;
    align?: 'left' | 'center' | 'right' | 'wide' | 'full';
    textColor?: string;
    backgroundColor?: string;
    borderRadius?: number;
    borderWidth?: number;
    linkTarget?: string;
    rel?: string;
    fontSize?: number;
    paddingX?: number;
    paddingY?: number;
    // Gradient attributes
    gradientEnabled?: boolean;
    gradientType?: 'linear' | 'radial';
    gradientAngle?: number;
    gradientStops?: Array<{
      color: string;
      position: number;
    }>;
    gradientShape?: 'circle' | 'ellipse';
    gradientPosition?: string;
    // Shadow attributes
    shadowEnabled?: boolean;
    shadowHorizontal?: number;
    shadowVertical?: number;
    shadowBlur?: number;
    shadowSpread?: number;
    shadowColor?: string;
    shadowOpacity?: number;
    shadowInset?: boolean;
    // Icon attributes
    iconEnabled?: boolean;
    iconName?: string;
    iconPosition?: 'left' | 'right';
    iconSize?: number;
    iconGap?: number;
    iconColor?: string;
  };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
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
  const [localText, setLocalText] = useState(attributes.text || 'Click here');
  const [localUrl, setLocalUrl] = useState(attributes.url || '#');
  const [showGradientSettings, setShowGradientSettings] = useState(false);
  const [showShadowSettings, setShowShadowSettings] = useState(false);
  const [showIconSettings, setShowIconSettings] = useState(false);

  const {
    text = 'Click here',
    url = '#',
    style = 'fill',
    width = 0,
    align = 'center',
    textColor = '#ffffff',
    backgroundColor = '#007cba',
    borderRadius = 2,
    borderWidth = 2,
    linkTarget = '',
    // rel = '',  // Currently unused
    fontSize = 16,
    paddingX = 24,
    paddingY = 12,
    // Gradient defaults
    gradientEnabled = false,
    gradientType = 'linear',
    gradientAngle = 45,
    gradientStops = [
      { color: '#667eea', position: 0 },
      { color: '#764ba2', position: 100 }
    ],
    gradientShape = 'circle',
    gradientPosition = 'center',
    // Shadow defaults
    shadowEnabled = false,
    shadowHorizontal = 0,
    shadowVertical = 2,
    shadowBlur = 4,
    shadowSpread = 0,
    shadowColor = '#000000',
    shadowOpacity = 25,
    shadowInset = false,
    // Icon defaults
    iconEnabled = false,
    iconName = 'star',
    iconPosition = 'left',
    iconSize = 16,
    iconGap = 8,
    iconColor
  } = attributes;

  // Sync text and URL changes
  useEffect(() => {
    setLocalText(text);
    setLocalUrl(url);
  }, [text, url]);

  // Update attribute
  const updateAttribute = (key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  };

  // Handle text change
  const handleTextChange = (newText: string) => {
    // Extract plain text from HTML
    const plainText = newText.replace(/<[^>]*>/g, '');
    setLocalText(plainText);
    updateAttribute('text', plainText);
  };

  // Generate gradient CSS
  const generateGradientCSS = (): string => {
    if (!gradientEnabled || !gradientStops || gradientStops.length < 2) {
      return '';
    }

    const stopsString = gradientStops
      .sort((a, b) => a.position - b.position)
      .map(stop => `${stop.color} ${stop.position}%`)
      .join(', ');

    if (gradientType === 'linear') {
      return `linear-gradient(${gradientAngle}deg, ${stopsString})`;
    } else {
      const shape = gradientShape || 'circle';
      const position = gradientPosition || 'center';
      return `radial-gradient(${shape} at ${position}, ${stopsString})`;
    }
  };

  // Generate shadow CSS
  const generateShadowCSS = (): string => {
    if (!shadowEnabled) return 'none';

    // Convert color to rgba with opacity
    const hexToRgba = (hex: string, alpha: number): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
    };

    const shadowColorRgba = hexToRgba(shadowColor, shadowOpacity);
    const insetKeyword = shadowInset ? 'inset ' : '';

    return `${insetKeyword}${shadowHorizontal}px ${shadowVertical}px ${shadowBlur}px ${shadowSpread}px ${shadowColorRgba}`;
  };

  // Get icon component
  const getIconComponent = () => {
    if (!iconEnabled || !iconName) return null;

    // Import icon libraries - we'll use a simple mapping for common icons
    const iconMap: { [key: string]: any } = {
      'star': Star,
      'heart': Star, // We'll use Star as fallback for now
      'home': Star,
      'user': Star,
      'settings': Settings,
      'search': Star,
      'mail': Star,
      'phone': Star,
      'download': Star,
      'upload': Star,
      'arrow-right': Star,
      'arrow-left': Star,
      'plus': Star,
      'check': Star,
      'x': X,
      'external-link': ExternalLink,
      'link': Link2
    };

    const IconComponent = iconMap[iconName] || Star;

    return (
      <IconComponent
        size={iconSize}
        style={{
          color: iconColor || 'inherit',
          flexShrink: 0
        }}
      />
    );
  };

  // Get button styles
  const getButtonStyles = () => {
    const styles: React.CSSProperties = {
      fontSize: `${fontSize}px`,
      paddingLeft: `${paddingX}px`,
      paddingRight: `${paddingX}px`,
      paddingTop: `${paddingY}px`,
      paddingBottom: `${paddingY}px`,
      borderRadius: `${borderRadius}px`,
      width: width ? `${width}%` : 'auto',
      // Add shadow
      boxShadow: generateShadowCSS()
    };

    if (style === 'fill') {
      // Use gradient if enabled, otherwise use solid background
      if (gradientEnabled && gradientStops && gradientStops.length >= 2) {
        styles.background = generateGradientCSS();
      } else {
        styles.backgroundColor = backgroundColor;
      }
      styles.color = textColor;
      styles.border = 'none';
    } else {
      styles.backgroundColor = 'transparent';
      // For outline style, use gradient border if enabled
      if (gradientEnabled && gradientStops && gradientStops.length >= 2) {
        styles.borderImage = `${generateGradientCSS()} 1`;
        styles.borderImageSlice = 1;
        styles.borderWidth = `${borderWidth}px`;
        styles.borderStyle = 'solid';
        styles.color = gradientStops[0]?.color || backgroundColor;
      } else {
        styles.color = backgroundColor;
        styles.border = `${borderWidth}px solid ${backgroundColor}`;
      }
    }

    return styles;
  };

  // Get wrapper alignment class
  const getAlignmentClass = () => {
    switch (align) {
      case 'left': return 'text-left';
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      case 'wide': return 'w-full max-w-4xl mx-auto';
      case 'full': return 'w-full';
      default: return 'text-center';
    }
  };

  return (
    <>
      {/* Block Controls - Floating Toolbar */}
      {isSelected && (
        <BlockControls>
          {/* Link Settings */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Link2 className="h-4 w-4" />}
              label="Edit Link"
              onClick={() => {
                const newUrl = prompt('Enter URL:', localUrl);
                if (newUrl !== null) {
                  setLocalUrl(newUrl);
                  updateAttribute('url', newUrl);
                }
              }}
            />
            {localUrl && localUrl !== '#' && (
              <ToolbarButton
                icon={<ExternalLink className="h-4 w-4" />}
                label="Open in New Tab"
                isActive={linkTarget === '_blank'}
                onClick={() => {
                  updateAttribute('linkTarget', linkTarget === '_blank' ? '' : '_blank');
                  if (linkTarget !== '_blank') {
                    updateAttribute('rel', 'noopener noreferrer');
                  }
                }}
              />
            )}
          </ToolbarGroup>

          {/* Alignment */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<AlignLeft className="h-4 w-4" />}
              label="Align left"
              isActive={align === 'left'}
              onClick={() => updateAttribute('align', 'left')}
            />
            <ToolbarButton
              icon={<AlignCenter className="h-4 w-4" />}
              label="Align center"
              isActive={align === 'center'}
              onClick={() => updateAttribute('align', 'center')}
            />
            <ToolbarButton
              icon={<AlignRight className="h-4 w-4" />}
              label="Align right"
              isActive={align === 'right'}
              onClick={() => updateAttribute('align', 'right')}
            />
            <ToolbarButton
              icon={<AlignJustify className="h-4 w-4" />}
              label="Full width"
              isActive={align === 'full'}
              onClick={() => updateAttribute('align', align === 'full' ? 'center' : 'full')}
            />
          </ToolbarGroup>

          {/* Gradient Controls */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Palette className="h-4 w-4" />}
              label="Gradient Background"
              isActive={gradientEnabled}
              onClick={() => updateAttribute('gradientEnabled', !gradientEnabled)}
            />
          </ToolbarGroup>
        </BlockControls>
      )}

      {/* Inspector Controls removed - now handled by GutenbergSidebar */}

      {/* Block Content */}
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
        className="wp-block wp-block-button"
        customToolbarContent={
          isSelected ? (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Style Quick Selector */}
              <div className="flex gap-1">
                <Button
                  variant={style === 'fill' ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateAttribute('style', 'fill')}
                  className="h-7 px-3 text-xs"
                >
                  Fill
                </Button>
                <Button
                  variant={style === 'outline' ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateAttribute('style', 'outline')}
                  className="h-7 px-3 text-xs"
                >
                  Outline
                </Button>
              </div>

              <div className="w-px h-4 bg-gray-300" />

              {/* Settings Buttons */}
              <Button
                variant={showGradientSettings ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowGradientSettings(!showGradientSettings)}
              >
                <Palette className="h-3 w-3 mr-1" />
                Gradient
              </Button>

              <Button
                variant={showShadowSettings ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowShadowSettings(!showShadowSettings)}
              >
                <Layers className="h-3 w-3 mr-1" />
                Shadow
              </Button>

              <Button
                variant={showIconSettings ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowIconSettings(!showIconSettings)}
              >
                <Star className="h-3 w-3 mr-1" />
                Icon
              </Button>

              {/* Indicators */}
              {gradientEnabled && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Gradient On
                </div>
              )}
              {shadowEnabled && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Shadow On
                </div>
              )}
              {iconEnabled && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Icon On
                </div>
              )}
            </div>
          ) : null
        }
      >
        <div className={cn('wp-block-button__wrapper', getAlignmentClass())}>
          <div className="wp-block-button__link-wrapper inline-block">
            <div
              className={cn(
                'wp-block-button__link',
                'inline-flex items-center cursor-pointer transition-all',
                'hover:opacity-90'
              )}
              style={{
                ...getButtonStyles(),
                gap: iconEnabled ? `${iconGap}px` : undefined
              }}
            >
              {/* Left Icon */}
              {iconEnabled && iconPosition === 'left' && getIconComponent()}

              {/* Button Text */}
              <RichText
                tagName="span"
                value={localText}
                onChange={handleTextChange}
                placeholder="Add text..."
                className="outline-none"
                allowedFormats={['core/bold', 'core/italic']}
                style={{ background: 'none', border: 'none', padding: 0 }}
              />

              {/* Right Icon */}
              {iconEnabled && iconPosition === 'right' && getIconComponent()}
            </div>
          </div>
        </div>

        {/* Gradient Settings Panel */}
        {isSelected && showGradientSettings && (
          <div className="mt-4">
            <GradientEditor
              currentGradient={gradientEnabled ? {
                type: gradientType,
                angle: gradientAngle,
                stops: gradientStops,
                shape: gradientShape,
                position: gradientPosition
              } : undefined}
              isEnabled={gradientEnabled}
              onGradientChange={(gradient) => {
                if (gradient) {
                  updateAttribute('gradientType', gradient.type);
                  updateAttribute('gradientAngle', gradient.angle);
                  updateAttribute('gradientStops', gradient.stops);
                  updateAttribute('gradientShape', gradient.shape);
                  updateAttribute('gradientPosition', gradient.position);
                } else {
                  updateAttribute('gradientEnabled', false);
                }
              }}
              onToggleGradient={(enabled) => updateAttribute('gradientEnabled', enabled)}
            />
          </div>
        )}

        {/* Shadow Settings Panel */}
        {isSelected && showShadowSettings && (
          <div className="mt-4">
            <ShadowEditor
              currentShadow={{
                enabled: shadowEnabled,
                horizontal: shadowHorizontal,
                vertical: shadowVertical,
                blur: shadowBlur,
                spread: shadowSpread,
                color: shadowColor,
                opacity: shadowOpacity,
                inset: shadowInset
              }}
              onShadowChange={(shadow) => {
                updateAttribute('shadowEnabled', shadow.enabled);
                updateAttribute('shadowHorizontal', shadow.horizontal);
                updateAttribute('shadowVertical', shadow.vertical);
                updateAttribute('shadowBlur', shadow.blur);
                updateAttribute('shadowSpread', shadow.spread);
                updateAttribute('shadowColor', shadow.color);
                updateAttribute('shadowOpacity', shadow.opacity);
                updateAttribute('shadowInset', shadow.inset);
              }}
            />
          </div>
        )}

        {/* Icon Settings Panel */}
        {isSelected && showIconSettings && (
          <div className="mt-4">
            <IconInserter
              currentIcon={{
                enabled: iconEnabled,
                iconName: iconName,
                position: iconPosition,
                size: iconSize,
                gap: iconGap,
                color: iconColor
              }}
              buttonText={localText}
              onIconChange={(icon) => {
                updateAttribute('iconEnabled', icon.enabled);
                updateAttribute('iconName', icon.iconName);
                updateAttribute('iconPosition', icon.position);
                updateAttribute('iconSize', icon.size);
                updateAttribute('iconGap', icon.gap);
                updateAttribute('iconColor', icon.color);
              }}
            />
          </div>
        )}
      </EnhancedBlockWrapper>
    </>
  );
};

export default ButtonBlock;