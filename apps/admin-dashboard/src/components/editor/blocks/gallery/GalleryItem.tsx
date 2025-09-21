/**
 * Gallery Item Component
 * 개별 갤러리 이미지 아이템을 렌더링하는 컴포넌트
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Edit3,
  Trash2,
  Move,
  ExternalLink,
  Eye,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RichText } from '../../gutenberg/RichText';
import { cn } from '@/lib/utils';
import { GalleryItemProps, GalleryImage } from './types';

const GalleryItem: React.FC<GalleryItemProps> = ({
  image,
  index,
  layout,
  aspectRatio,
  showCaption,
  captionPosition,
  enableLightbox,
  hoverEffect,
  borderRadius,
  isSelected = false,
  isEditing = false,
  onSelect,
  onEdit,
  onRemove,
  onMove,
  onLightboxOpen,
  className
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [localCaption, setLocalCaption] = useState(image.caption || '');
  const dragRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!isEditing) return;

    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', image.id);

    // Create drag preview
    if (imageRef.current) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 100;
      canvas.height = 100;

      if (ctx && imageRef.current.complete) {
        ctx.drawImage(imageRef.current, 0, 0, 100, 100);
        e.dataTransfer.setDragImage(canvas, 50, 50);
      }
    }
  }, [isEditing, image.id]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle caption save
  const handleCaptionSave = useCallback((newCaption: string) => {
    setLocalCaption(newCaption);
    setIsEditingCaption(false);
    // Note: In real implementation, this would call onImageUpdate
    // onImageUpdate?.(image.id, { caption: newCaption });
  }, [image.id]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isEditing) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.();
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        onRemove?.();
        break;
      case 'ArrowUp':
        e.preventDefault();
        onMove?.('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        onMove?.('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onMove?.('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        onMove?.('right');
        break;
      case 'e':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onEdit?.();
        }
        break;
    }
  }, [isEditing, onSelect, onRemove, onMove, onEdit]);

  // Get image styles based on layout and settings
  const getImageStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {
      borderRadius: `${borderRadius}px`,
      overflow: 'hidden'
    };

    // Apply aspect ratio for grid and slider layouts
    if ((layout === 'grid' || layout === 'slider') && aspectRatio !== 'auto') {
      const ratios: Record<string, string> = {
        square: '1 / 1',
        '4:3': '4 / 3',
        '16:9': '16 / 9',
        '3:2': '3 / 2'
      };
      styles.aspectRatio = ratios[aspectRatio];
    }

    // Apply image filters if any
    if (image.filters) {
      const filters = [];
      if (image.filters.brightness !== undefined) filters.push(`brightness(${image.filters.brightness}%)`);
      if (image.filters.contrast !== undefined) filters.push(`contrast(${image.filters.contrast}%)`);
      if (image.filters.saturation !== undefined) filters.push(`saturate(${image.filters.saturation}%)`);
      if (image.filters.blur !== undefined) filters.push(`blur(${image.filters.blur}px)`);
      if (image.filters.sepia) filters.push('sepia(1)');
      if (image.filters.grayscale) filters.push('grayscale(1)');
      if (filters.length > 0) styles.filter = filters.join(' ');
    }

    // Apply rotation
    if (image.rotation) {
      styles.transform = `rotate(${image.rotation}deg)`;
    }

    return styles;
  };

  // Get container classes
  const containerClasses = cn(
    'relative group cursor-pointer transition-all duration-300',
    {
      // Layout specific classes
      'break-inside-avoid mb-4': layout === 'masonry',
      'flex-shrink-0': layout === 'slider',

      // Selection state
      'ring-2 ring-blue-500 ring-offset-2': isSelected,
      'opacity-50': isDragging,

      // Hover effects
      'hover:scale-105': hoverEffect === 'zoom' && !isEditing,
      'hover:opacity-80': hoverEffect === 'fade' && !isEditing,
      'hover:shadow-lg hover:-translate-y-1': hoverEffect === 'lift' && !isEditing,

      // Editing state
      'cursor-grab': isEditing && !isDragging,
      'cursor-grabbing': isEditing && isDragging,
    },
    className
  );

  // Render image element
  const renderImage = () => (
    <img
      ref={imageRef}
      src={image.thumbnailUrl || image.url}
      alt={image.alt}
      title={image.title}
      className="w-full h-full object-cover"
      style={getImageStyles()}
      loading="lazy"
      draggable={false}
      onClick={(e) => {
        if (isEditing) {
          e.preventDefault();
          onSelect?.();
        } else if (enableLightbox) {
          e.preventDefault();
          onLightboxOpen?.(index);
        }
      }}
    />
  );

  // Render caption based on position
  const renderCaption = () => {
    if (!showCaption || !localCaption) return null;

    const captionContent = (
      <div
        className={cn(
          'text-sm transition-opacity',
          {
            'text-white': captionPosition === 'overlay',
            'text-gray-700': captionPosition === 'below',
            'opacity-0 group-hover:opacity-100': captionPosition === 'hover'
          }
        )}
      >
        {isEditing && isEditingCaption ? (
          <RichText
            value={localCaption}
            onChange={setLocalCaption}
            onBlur={() => handleCaptionSave(localCaption)}
            placeholder="Add a caption..."
            className="w-full bg-transparent border-none outline-none"
            multiline={false}
          />
        ) : (
          <span
            onClick={(e) => {
              if (isEditing) {
                e.stopPropagation();
                setIsEditingCaption(true);
              }
            }}
            className={cn(
              isEditing && 'cursor-text hover:bg-gray-100 px-1 rounded'
            )}
          >
            {localCaption}
          </span>
        )}
      </div>
    );

    if (captionPosition === 'below') {
      return <div className="mt-2 px-1">{captionContent}</div>;
    }

    if (captionPosition === 'overlay' || captionPosition === 'hover') {
      return (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 p-3',
            {
              'bg-gradient-to-t from-black/70 to-transparent': captionPosition === 'overlay',
              'bg-black/50': captionPosition === 'hover'
            }
          )}
        >
          {captionContent}
        </div>
      );
    }

    return null;
  };

  // Render editing controls
  const renderEditingControls = () => {
    if (!isEditing) return null;

    return (
      <>
        {/* Selection indicator */}
        <div className="absolute top-2 left-2">
          <div
            className={cn(
              'w-6 h-6 rounded-full border-2 transition-all',
              isSelected
                ? 'bg-blue-500 border-blue-500'
                : 'bg-white/80 border-white/80 hover:bg-blue-100 hover:border-blue-300'
            )}
          >
            {isSelected && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-6 w-6 p-0 bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              title="Edit image"
            >
              <Edit3 className="h-3 w-3" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 w-6 p-0 bg-white/90 hover:bg-white"
                  title="More options"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onMove?.('up')}>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Move Up
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMove?.('down')}>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Move Down
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMove?.('left')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Move Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMove?.('right')}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Move Right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Drag handle */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            className="w-6 h-6 bg-white/90 rounded cursor-move flex items-center justify-center"
            title="Drag to reorder"
          >
            <Move className="h-3 w-3 text-gray-600" />
          </div>
        </div>
      </>
    );
  };

  // Render preview mode controls
  const renderPreviewControls = () => {
    if (isEditing) return null;

    return (
      <>
        {/* Lightbox trigger */}
        {enableLightbox && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              className="h-6 w-6 p-0 bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                onLightboxOpen?.(index);
              }}
              title="View fullscreen"
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* External link indicator */}
        {image.linkTo === 'custom' && image.customLink && (
          <div className="absolute bottom-2 right-2">
            <div className="w-4 h-4 bg-white/90 rounded-full flex items-center justify-center">
              <ExternalLink className="h-2 w-2 text-gray-600" />
            </div>
          </div>
        )}
      </>
    );
  };

  const imageElement = (
    <div
      ref={dragRef}
      className={containerClasses}
      draggable={isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onKeyDown={handleKeyDown}
      tabIndex={isEditing ? 0 : -1}
      role={isEditing ? 'button' : undefined}
      aria-label={isEditing ? `Image ${index + 1}: ${image.alt}` : undefined}
      aria-selected={isSelected}
    >
      {renderImage()}
      {renderCaption()}
      {renderEditingControls()}
      {renderPreviewControls()}

      {/* Loading overlay */}
      {!imageRef.current?.complete && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      )}
    </div>
  );

  // Wrap with caption below if needed
  if (showCaption && captionPosition === 'below' && localCaption) {
    return (
      <div className="gallery-item-with-caption">
        {imageElement}
        {renderCaption()}
      </div>
    );
  }

  return imageElement;
};

export default GalleryItem;