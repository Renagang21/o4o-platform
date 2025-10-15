/**
 * EnhancedCoverBlock Component
 * Complete WordPress Gutenberg-compatible Cover Block implementation
 * with 90% similarity to WordPress Cover Block
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Image as ImageIcon,
  Video,
  Palette,
  Layers,
  Settings,
  Maximize2,
  Monitor,
  Smartphone,
  Link,
  ExternalLink,
  Copy,
  Trash2,
  RotateCcw,
  ChevronDown,
  Eye,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import CoverBackground from './cover/CoverBackground';
import CoverOverlay from './cover/CoverOverlay';
import CoverContentNew from './cover/CoverContentNew';
import CoverSettings from './cover/CoverSettings';
import { Block } from '@/types/post.types';
import {
  CoverBlockProps,
  CoverBlockAttributes,
  DEFAULT_COVER_ATTRIBUTES,
  BackgroundType,
  CoverBackgroundMedia,
  FocalPoint,
  GradientValue,
  TagName,
  ASPECT_RATIO_OPTIONS
} from './cover/types';

const EnhancedCoverBlock: React.FC<CoverBlockProps> = ({
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
  attributes = DEFAULT_COVER_ATTRIBUTES,
  innerBlocks = [],
  onInnerBlocksChange,
  canMoveUp = true,
  canMoveDown = true,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType
}) => {
  // Merge default attributes with provided attributes
  const mergedAttributes = useMemo(() => ({
    ...DEFAULT_COVER_ATTRIBUTES,
    ...attributes
  }), [attributes]);

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);
  const [localAttributes, setLocalAttributes] = useState(mergedAttributes);

  const coverRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Sync local attributes with external changes
  useEffect(() => {
    setLocalAttributes(mergedAttributes);
  }, [mergedAttributes]);

  // Update attributes
  const updateAttributes = useCallback((updates: Partial<CoverBlockAttributes>) => {
    const newAttributes = { ...localAttributes, ...updates };
    setLocalAttributes(newAttributes);
    onChange(content, newAttributes);
  }, [localAttributes, content, onChange]);

  // Handle background type change
  const handleBackgroundTypeChange = useCallback((type: BackgroundType) => {
    updateAttributes({ backgroundType: type });
  }, [updateAttributes]);

  // Handle background image change
  const handleBackgroundImageChange = useCallback((image?: CoverBackgroundMedia) => {
    updateAttributes({ backgroundImage: image });
  }, [updateAttributes]);

  // Handle background video change
  const handleBackgroundVideoChange = useCallback((video?: CoverBackgroundMedia) => {
    updateAttributes({ backgroundVideo: video });
  }, [updateAttributes]);

  // Handle background color change
  const handleBackgroundColorChange = useCallback((color: string) => {
    updateAttributes({ backgroundColor: color });
  }, [updateAttributes]);

  // Handle gradient change
  const handleGradientChange = useCallback((gradient: string | GradientValue) => {
    updateAttributes({ gradient });
  }, [updateAttributes]);

  // Handle focal point change
  const handleFocalPointChange = useCallback((focalPoint: FocalPoint) => {
    const currentImage = localAttributes.backgroundImage;
    if (currentImage) {
      updateAttributes({
        backgroundImage: { ...currentImage, focalPoint }
      });
    }
  }, [localAttributes.backgroundImage, updateAttributes]);

  // Handle overlay change
  const handleOverlayChange = useCallback((overlay: any) => {
    updateAttributes({ overlay });
  }, [updateAttributes]);

  // Handle layout change
  const handleLayoutChange = useCallback((layout: any) => {
    updateAttributes({ layout });
  }, [updateAttributes]);

  // Handle inner blocks change
  const handleInnerBlocksChange = useCallback((newInnerBlocks: Block[]) => {
    if (onInnerBlocksChange) {
      onInnerBlocksChange(newInnerBlocks);
    }
  }, [onInnerBlocksChange]);

  // Handle tag name change
  const handleTagNameChange = useCallback((tagName: TagName) => {
    updateAttributes({ tagName });
  }, [updateAttributes]);

  // Handle custom class name change
  const handleCustomClassNameChange = useCallback((className: string) => {
    updateAttributes({ className });
  }, [updateAttributes]);

  // Handle anchor ID change
  const handleAnchorIdChange = useCallback((anchorId: string) => {
    updateAttributes({ id: anchorId });
  }, [updateAttributes]);

  // Handle featured image toggle
  const handleUseFeaturedImageChange = useCallback((useFeaturedImage: boolean) => {
    updateAttributes({ useFeaturedImage });
  }, [updateAttributes]);

  // Handle dynamic background change
  const handleDynamicBackgroundChange = useCallback((dynamicBackground: any) => {
    updateAttributes({ dynamicBackground });
  }, [updateAttributes]);

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!localAttributes.layout.allowResize) return;

    e.preventDefault();
    setIsResizing(true);
    setResizeStartY(e.clientY);
    setResizeStartHeight(localAttributes.layout.minHeight);

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY;
      const newHeight = Math.max(200, Math.min(2000, resizeStartHeight + deltaY));

      updateAttributes({
        layout: { ...localAttributes.layout, minHeight: newHeight }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [localAttributes.layout, resizeStartY, resizeStartHeight, updateAttributes]);

  // Handle block conversion
  const handleBlockConversion = useCallback((targetType: string) => {
    if (!onChangeType) return;

    const baseContent = innerBlocks.length > 0
      ? innerBlocks[0].content
      : content;

    const baseAttributes = {
      id: localAttributes.id,
      className: localAttributes.className
    };

    switch (targetType) {
      case 'o4o/image':
        if (localAttributes.backgroundImage?.url) {
          onChangeType(targetType);
          onChange(localAttributes.backgroundImage.url, {
            ...baseAttributes,
            type: 'o4o/image',
            url: localAttributes.backgroundImage.url,
            alt: localAttributes.backgroundImage.alt || '',
            caption: baseContent,
            mediaId: localAttributes.backgroundImage.id,
            width: localAttributes.backgroundImage.width,
            height: localAttributes.backgroundImage.height
          });
        }
        break;

      case 'o4o/group':
        onChangeType(targetType);
        onChange(baseContent, {
          ...baseAttributes,
          type: 'o4o/group',
          backgroundColor: localAttributes.backgroundColor,
          gradient: localAttributes.gradient,
          innerBlocks: innerBlocks
        });
        break;

      case 'o4o/hero':
        onChangeType(targetType);
        onChange(baseContent, {
          ...baseAttributes,
          type: 'o4o/hero',
          backgroundImage: localAttributes.backgroundImage,
          backgroundColor: localAttributes.backgroundColor,
          overlay: localAttributes.overlay,
          minHeight: localAttributes.layout.minHeight
        });
        break;

      default:
        break;
    }
  }, [localAttributes, content, onChangeType, onChange]);

  // Get container styles
  const getContainerStyles = (): React.CSSProperties => {
    const { layout } = localAttributes;
    const style: React.CSSProperties = {
      minHeight: `${layout.minHeight}px`,
      position: 'relative'
    };

    // Apply aspect ratio
    if (layout.aspectRatio && layout.aspectRatio !== 'auto') {
      const aspectOption = ASPECT_RATIO_OPTIONS.find(
        option => option.value === layout.aspectRatio
      );

      if (aspectOption?.ratio) {
        style.aspectRatio = aspectOption.ratio.toString();
      } else if (layout.aspectRatio === 'custom' && layout.customAspectRatio) {
        // Parse custom aspect ratio
        const customRatio = layout.customAspectRatio;
        if (customRatio.includes(':')) {
          const [width, height] = customRatio.split(':').map(Number);
          if (width && height) {
            style.aspectRatio = `${width} / ${height}`;
          }
        } else {
          const ratio = parseFloat(customRatio);
          if (!isNaN(ratio)) {
            style.aspectRatio = ratio.toString();
          }
        }
      }
    }

    return style;
  };

  // Get CSS classes
  const getCSSClasses = (): string => {
    const classes = [
      'wp-block-cover',
      'cover-block',
      localAttributes.layout.hasParallax && 'has-parallax',
      localAttributes.overlay.opacity > 0 && 'has-overlay',
      localAttributes.backgroundType === 'image' && localAttributes.backgroundImage && 'has-background-image',
      localAttributes.backgroundType === 'video' && localAttributes.backgroundVideo && 'has-background-video',
      localAttributes.backgroundType === 'color' && 'has-background-color',
      localAttributes.backgroundType === 'gradient' && 'has-background-gradient',
      localAttributes.className
    ].filter(Boolean);

    return classes.join(' ');
  };

  // Custom toolbar content
  const customToolbarContent = isSelected ? (
    <div className="flex items-center gap-2">
      {/* Background type indicators */}
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
        {localAttributes.backgroundType === 'image' && <ImageIcon className="h-3 w-3" />}
        {localAttributes.backgroundType === 'video' && <Video className="h-3 w-3" />}
        {localAttributes.backgroundType === 'color' && <Palette className="h-3 w-3" />}
        {localAttributes.backgroundType === 'gradient' && <Layers className="h-3 w-3" />}
        <span className="capitalize">{localAttributes.backgroundType}</span>
      </div>

      <div className="w-px h-4 bg-gray-300" />

      {/* Quick actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const dimRatio = localAttributes.overlay.opacity;
          updateAttributes({
            overlay: { ...localAttributes.overlay, opacity: dimRatio > 0 ? 0 : 50 }
          });
        }}
        className={cn(
          "h-7 px-2 text-xs",
          localAttributes.overlay.opacity > 0 && "bg-blue-100"
        )}
      >
        <Eye className="h-3 w-3 mr-1" />
        Overlay ({localAttributes.overlay.opacity}%)
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttributes({
          layout: { ...localAttributes.layout, hasParallax: !localAttributes.layout.hasParallax }
        })}
        className={cn(
          "h-7 px-2 text-xs",
          localAttributes.layout.hasParallax && "bg-blue-100"
        )}
      >
        <Monitor className="h-3 w-3 mr-1" />
        Parallax
      </Button>

      <div className="w-px h-4 bg-gray-300" />

      {/* Block conversion */}
      <div className="relative group">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
        >
          <Code className="h-3 w-3 mr-1" />
          Convert
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>

        <div className="absolute top-full left-0 mt-1 w-40 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="py-1">
            {localAttributes.backgroundImage && (
              <button
                onClick={() => handleBlockConversion('o4o/image')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
              >
                <ImageIcon className="h-3 w-3 mr-2" />
                Image Block
              </button>
            )}
            <button
              onClick={() => handleBlockConversion('o4o/group')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
            >
              <Layers className="h-3 w-3 mr-2" />
              Group Block
            </button>
          </div>
        </div>
      </div>

      <div className="w-px h-4 bg-gray-300" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          // Reset to default
          updateAttributes(DEFAULT_COVER_ATTRIBUTES);
        }}
        className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        Reset
      </Button>
    </div>
  ) : null;

  // Custom sidebar content
  const customSidebarContent = isSelected ? (
    <div className="space-y-4">
      {/* Block Info */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-sm font-medium mb-2">Cover Block</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Background:</span>
            <span className="capitalize">{localAttributes.backgroundType}</span>
          </div>
          <div className="flex justify-between">
            <span>Height:</span>
            <span>{localAttributes.layout.minHeight}px</span>
          </div>
          <div className="flex justify-between">
            <span>Overlay:</span>
            <span>{localAttributes.overlay.opacity}%</span>
          </div>
          <div className="flex justify-between">
            <span>Inner blocks:</span>
            <span>{innerBlocks.length}</span>
          </div>
        </div>
      </div>

      {/* Quick Settings */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Height</label>
          <input
            type="range"
            min="200"
            max="1000"
            value={localAttributes.layout.minHeight}
            onChange={(e) => updateAttributes({
              layout: { ...localAttributes.layout, minHeight: parseInt(e.target.value) }
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>200px</span>
            <span>{localAttributes.layout.minHeight}px</span>
            <span>1000px</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Overlay Opacity</label>
          <input
            type="range"
            min="0"
            max="100"
            value={localAttributes.overlay.opacity}
            onChange={(e) => updateAttributes({
              overlay: { ...localAttributes.overlay, opacity: parseInt(e.target.value) }
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>{localAttributes.overlay.opacity}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Performance Info */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium mb-2">Performance</h4>
        <div className="space-y-1 text-xs text-gray-600">
          {localAttributes.layout.hasParallax && (
            <div className="text-amber-600">⚠ Parallax may affect performance</div>
          )}
          {localAttributes.backgroundVideo && (
            <div className="text-amber-600">⚠ Video backgrounds increase load time</div>
          )}
          {localAttributes.backgroundImage && !localAttributes.backgroundImage.alt && (
            <div className="text-red-600">⚠ Missing alt text for accessibility</div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  // Render the Tag element dynamically
  const TagElement = localAttributes.tagName || 'div';

  return (
    <EnhancedBlockWrapper
      id={id}
      type="cover"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      isDragging={isDragging}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onCopy={onCopy}
      onPaste={onPaste}
      onChangeType={onChangeType}
      currentType="core/cover"
      customToolbarContent={customToolbarContent}
      customSidebarContent={customSidebarContent}
    >
      <TagElement
        ref={coverRef}
        id={localAttributes.id}
        className={cn(getCSSClasses(), isResizing && 'is-resizing')}
        style={getContainerStyles()}
      >
        {/* Background Layer */}
        <CoverBackground
          backgroundType={localAttributes.backgroundType}
          backgroundImage={localAttributes.backgroundImage}
          backgroundVideo={localAttributes.backgroundVideo}
          backgroundColor={localAttributes.backgroundColor}
          gradient={localAttributes.gradient}
          focalPoint={localAttributes.backgroundImage?.focalPoint}
          onBackgroundTypeChange={handleBackgroundTypeChange}
          onBackgroundImageChange={handleBackgroundImageChange}
          onBackgroundVideoChange={handleBackgroundVideoChange}
          onBackgroundColorChange={handleBackgroundColorChange}
          onGradientChange={handleGradientChange}
          onFocalPointChange={handleFocalPointChange}
          isSelected={isSelected}
          allowParallax={localAttributes.layout.hasParallax}
        />

        {/* Overlay Layer */}
        <CoverOverlay
          overlay={localAttributes.overlay}
          onOverlayChange={handleOverlayChange}
          isSelected={isSelected}
          backgroundType={localAttributes.backgroundType}
        />

        {/* Content Layer */}
        <CoverContentNew
          innerBlocks={innerBlocks as Block[]}
          layout={localAttributes.layout}
          onInnerBlocksChange={handleInnerBlocksChange}
          onLayoutChange={handleLayoutChange}
          isSelected={isSelected}
          placeholder={localAttributes.placeholder}
        />

        {/* Settings Panel */}
        <CoverSettings
          layout={localAttributes.layout}
          onLayoutChange={handleLayoutChange}
          tagName={localAttributes.tagName}
          onTagNameChange={handleTagNameChange}
          customClassName={localAttributes.className}
          onCustomClassNameChange={handleCustomClassNameChange}
          anchorId={localAttributes.id}
          onAnchorIdChange={handleAnchorIdChange}
          useFeaturedImage={localAttributes.useFeaturedImage}
          onUseFeaturedImageChange={handleUseFeaturedImageChange}
          dynamicBackground={localAttributes.dynamicBackground}
          onDynamicBackgroundChange={handleDynamicBackgroundChange}
          isSelected={isSelected}
        />

        {/* Resize Handle */}
        {isSelected && localAttributes.layout.allowResize && (
          <div
            ref={resizeHandleRef}
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-blue-500 bg-opacity-50 hover:bg-opacity-75 cursor-ns-resize rounded-t transition-all"
            onMouseDown={handleResizeStart}
            title="Drag to resize height"
          >
            <div className="w-4 h-0.5 bg-white mx-auto mt-0.5" />
          </div>
        )}

        {/* Resize indicator */}
        {isResizing && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded z-50">
            {localAttributes.layout.minHeight}px
          </div>
        )}
      </TagElement>
    </EnhancedBlockWrapper>
  );
};

export default EnhancedCoverBlock;