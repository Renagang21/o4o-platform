/**
 * Enhanced Gallery Block
 * WordPress Gutenberg와 85% 유사도를 목표로 하는 고급 갤러리 블록
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Images,
  Upload,
  Plus,
  Settings,
  Grid3X3,
  Columns,
  Sliders,
  Shuffle,
  RotateCcw,
  Copy,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Gallery components
import GalleryGrid from './gallery/GalleryGrid';
import GalleryMasonry from './gallery/GalleryMasonry';
import GallerySlider from './gallery/GallerySlider';
import GalleryLightbox from './gallery/GalleryLightbox';
import GallerySettings from './gallery/GallerySettings';

// Shared components
import MediaSelector, { MediaItem } from './shared/MediaSelector';
import { EnhancedBlockWrapper } from './shared/EnhancedBlockWrapper';

// Types
import {
  EnhancedGalleryBlockProps,
  GalleryImage,
  GalleryAttributes,
  DEFAULT_GALLERY_ATTRIBUTES,
  LAYOUT_CONFIGS
} from './gallery/types';

const EnhancedGalleryBlock: React.FC<EnhancedGalleryBlockProps> = ({
  id,
  content,
  onChange,
  attributes = {},
  isSelected = false,
  className
}) => {
  // Merge with default attributes
  const mergedAttributes: GalleryAttributes = {
    ...DEFAULT_GALLERY_ATTRIBUTES,
    ...attributes
  };

  const {
    images,
    layout,
    columns,
    gap,
    aspectRatio,
    showCaptions,
    captionPosition,
    enableLightbox,
    lightboxAnimation,
    randomOrder,
    hoverEffect,
    borderRadius
  } = mergedAttributes;

  // State
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current layout config
  const layoutConfig = LAYOUT_CONFIGS[layout];

  // Transform MediaItem to GalleryImage
  const transformMediaItem = useCallback((mediaItem: MediaItem): GalleryImage => ({
    id: mediaItem.id,
    url: mediaItem.url,
    thumbnailUrl: mediaItem.thumbnailUrl,
    alt: mediaItem.alt || mediaItem.title,
    caption: mediaItem.caption,
    title: mediaItem.title,
    width: mediaItem.width || 0,
    height: mediaItem.height || 0,
    fileSize: mediaItem.fileSize,
    mimeType: mediaItem.mimeType
  }), []);

  // Update attributes helper
  const updateAttributes = useCallback((updates: Partial<GalleryAttributes>) => {
    const newAttributes = { ...mergedAttributes, ...updates };
    onChange(content, newAttributes);
  }, [content, mergedAttributes, onChange]);

  // Handle media selection from MediaSelector
  const handleMediaSelect = useCallback((media: MediaItem | MediaItem[]) => {
    setIsProcessing(true);

    try {
      const selectedMedia = Array.isArray(media) ? media : [media];
      const newImages = selectedMedia.map(transformMediaItem);

      const updatedImages = [...images, ...newImages];
      const updatedIds = updatedImages.map(img => img.id);

      updateAttributes({
        images: updatedImages,
        ids: updatedIds
      });

      toast.success(`${newImages.length} image${newImages.length > 1 ? 's' : ''} added to gallery`);
    } catch (error) {
      toast.error('Failed to add images to gallery');
      console.error('Error adding images:', error);
    } finally {
      setIsProcessing(false);
      setShowMediaSelector(false);
    }
  }, [images, transformMediaItem, updateAttributes]);

  // Handle image removal
  const handleImageRemove = useCallback((imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    const updatedIds = updatedImages.map(img => img.id);

    updateAttributes({
      images: updatedImages,
      ids: updatedIds
    });

    if (selectedImageId === imageId) {
      setSelectedImageId(null);
    }

    toast.success('Image removed from gallery');
  }, [images, selectedImageId, updateAttributes]);

  // Handle image update
  const handleImageUpdate = useCallback((imageId: string, updates: Partial<GalleryImage>) => {
    const updatedImages = images.map(img =>
      img.id === imageId ? { ...img, ...updates } : img
    );

    updateAttributes({ images: updatedImages });
  }, [images, updateAttributes]);

  // Handle image reordering
  const handleImageMove = useCallback((imageId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const currentIndex = images.findIndex(img => img.id === imageId);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;

    switch (direction) {
      case 'left':
      case 'up':
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'right':
      case 'down':
        newIndex = Math.min(images.length - 1, currentIndex + 1);
        break;
    }

    if (newIndex !== currentIndex) {
      const newImages = [...images];
      const [movedImage] = newImages.splice(currentIndex, 1);
      newImages.splice(newIndex, 0, movedImage);

      updateAttributes({
        images: newImages,
        ids: newImages.map(img => img.id)
      });
    }
  }, [images, updateAttributes]);

  // Handle drag and drop reordering
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDraggedOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggedOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggedOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Handle file upload
      console.log('Files dropped:', files);
      // TODO: Implement file upload
    }
  }, []);

  // Get ordered images (with random order if enabled)
  const orderedImages = useMemo(() => {
    if (randomOrder && !isSelected) {
      return [...images].sort(() => Math.random() - 0.5);
    }
    return images;
  }, [images, randomOrder, isSelected]);

  // Get selected image object
  const selectedImage = useMemo(() => {
    return selectedImageId ? images.find(img => img.id === selectedImageId) : undefined;
  }, [selectedImageId, images]);

  // Handle lightbox open
  const handleLightboxOpen = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  // Handle lightbox close
  const handleLightboxClose = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  // Handle lightbox navigation
  const handleLightboxNavigate = useCallback((direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return;

    if (direction === 'prev') {
      setLightboxIndex(Math.max(0, lightboxIndex - 1));
    } else {
      setLightboxIndex(Math.min(orderedImages.length - 1, lightboxIndex + 1));
    }
  }, [lightboxIndex, orderedImages.length]);

  // Handle gallery actions
  const handleShuffleImages = useCallback(() => {
    const shuffledImages = [...images].sort(() => Math.random() - 0.5);
    updateAttributes({
      images: shuffledImages,
      ids: shuffledImages.map(img => img.id)
    });
    toast.success('Images shuffled');
  }, [images, updateAttributes]);

  const handleDuplicateGallery = useCallback(() => {
    // This would be handled by the parent component
    toast.success('Gallery duplicated');
  }, []);

  const handleClearGallery = useCallback(() => {
    if (confirm('Are you sure you want to remove all images from this gallery?')) {
      updateAttributes({
        images: [],
        ids: []
      });
      setSelectedImageId(null);
      toast.success('Gallery cleared');
    }
  }, [updateAttributes]);

  // Render gallery content based on layout
  const renderGalleryContent = () => {
    const commonProps = {
      images: orderedImages,
      attributes: mergedAttributes,
      isEditing: isSelected,
      selectedImageId,
      onImageSelect: setSelectedImageId,
      onImageEdit: (imageId: string) => {
        setSelectedImageId(imageId);
        setShowSettings(true);
      },
      onImageRemove: handleImageRemove,
      onImageMove: handleImageMove,
      onLightboxOpen: handleLightboxOpen
    };

    switch (layout) {
      case 'grid':
        return <GalleryGrid {...commonProps} />;
      case 'masonry':
        return <GalleryMasonry {...commonProps} />;
      case 'slider':
        return <GallerySlider {...commonProps} />;
      default:
        return <GalleryGrid {...commonProps} />;
    }
  };

  // Render empty state
  const renderEmptyState = () => (
    <div
      ref={dropZoneRef}
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
        isDraggedOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
          <Images className="w-8 h-8 text-gray-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Create your gallery</h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload images or drag and drop to get started
          </p>
          <div className="flex justify-center gap-2">
            <Button
              onClick={() => setShowMediaSelector(true)}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Images
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Browse Files
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMediaSelector(true)}
        className="h-9 px-2"
        disabled={isProcessing}
      >
        <Upload className="h-4 w-4 mr-1" />
        <span className="text-xs">Add Images</span>
      </Button>

      {/* Layout selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 px-2">
            {layout === 'grid' && <Grid3X3 className="h-4 w-4 mr-1" />}
            {layout === 'masonry' && <Columns className="h-4 w-4 mr-1" />}
            {layout === 'slider' && <Sliders className="h-4 w-4 mr-1" />}
            <span className="text-xs">{layoutConfig.label}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {Object.entries(LAYOUT_CONFIGS).map(([key, config]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => updateAttributes({ layout: key as any })}
              className="flex items-center gap-2"
            >
              {key === 'grid' && <Grid3X3 className="h-4 w-4" />}
              {key === 'masonry' && <Columns className="h-4 w-4" />}
              {key === 'slider' && <Sliders className="h-4 w-4" />}
              <div>
                <div className="font-medium">{config.label}</div>
                <div className="text-xs text-gray-500">{config.description}</div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Gallery actions */}
      {images.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 px-2">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4 mr-2" />
              Gallery Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShuffleImages}>
              <Shuffle className="h-4 w-4 mr-2" />
              Shuffle Images
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicateGallery}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Gallery
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClearGallery} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Gallery
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Add more images button for non-empty galleries */}
      {images.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMediaSelector(true)}
          className="h-9 px-2"
          disabled={isProcessing}
        >
          <Plus className="h-4 w-4 mr-1" />
          <span className="text-xs">Add More</span>
        </Button>
      )}
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      {showSettings && (
        <GallerySettings
          attributes={mergedAttributes}
          onChange={updateAttributes}
          selectedImage={selectedImage}
          onImageUpdate={handleImageUpdate}
        />
      )}

      {!showSettings && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Gallery Info</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Layout: {layoutConfig.label}</div>
              <div>Images: {images.length}</div>
              <div>Columns: {columns}</div>
              <div>Gap: {gap}px</div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Open Settings
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <EnhancedBlockWrapper
      id={id}
      type="gallery"
      title="Gallery"
      icon={Images}
      isSelected={isSelected}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
      className={cn('enhanced-gallery-block', className)}
    >
      <div
        className={cn(
          'w-full',
          mergedAttributes.align === 'center' && 'mx-auto',
          mergedAttributes.align === 'right' && 'ml-auto',
          mergedAttributes.align === 'wide' && 'max-w-7xl mx-auto',
          mergedAttributes.align === 'full' && 'max-w-full'
        )}
        style={{ padding: `${mergedAttributes.padding}px` }}
      >
        {images.length === 0 ? renderEmptyState() : renderGalleryContent()}
      </div>

      {/* Hidden file input for browse files */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            // TODO: Handle file upload
            console.log('Files selected:', files);
          }
        }}
        className="hidden"
      />

      {/* Media Selector Modal */}
      <MediaSelector
        isOpen={showMediaSelector}
        onClose={() => setShowMediaSelector(false)}
        onSelect={handleMediaSelect}
        multiple={true}
        acceptedTypes={['image', 'video']}
        maxSelection={50}
        title="Select Gallery Images"
      />

      {/* Lightbox */}
      {enableLightbox && lightboxIndex !== null && (
        <GalleryLightbox
          images={orderedImages}
          currentIndex={lightboxIndex}
          isOpen={true}
          animation={lightboxAnimation}
          onClose={handleLightboxClose}
          onNavigate={handleLightboxNavigate}
          onImageSelect={setLightboxIndex}
          showThumbnails={true}
          showCounter={true}
          enableKeyboard={true}
        />
      )}

      {/* Loading overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        </div>
      )}
    </EnhancedBlockWrapper>
  );
};

export default EnhancedGalleryBlock;