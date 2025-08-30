/**
 * Standard Gallery Block
 * 표준 템플릿 기반의 갤러리 블록
 */

import { useState, useRef, useCallback } from 'react';
import { 
  Images,
  Upload,
  Plus,
  Trash2,
  Grid,
  Columns,
  Link2,
  Settings,
  Move,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { RichText } from '../../gutenberg/RichText';
import { cn } from '@/lib/utils';

interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
  link?: string;
  width?: number;
  height?: number;
}

interface GalleryBlockProps extends StandardBlockProps {
  attributes?: {
    images?: GalleryImage[];
    columns?: number;
    gap?: number;
    layout?: 'grid' | 'masonry' | 'carousel' | 'tiled';
    imageCrop?: boolean;
    aspectRatio?: 'square' | '4:3' | '16:9' | '3:2' | 'original';
    linkTo?: 'none' | 'media' | 'attachment' | 'custom';
    lightbox?: boolean;
    captions?: boolean;
    randomOrder?: boolean;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    captionStyle?: 'overlay' | 'below' | 'hover';
    captionBackground?: string;
    captionColor?: string;
    captionFontSize?: number;
    align?: 'left' | 'center' | 'right' | 'wide' | 'full';
  };
}

const galleryConfig: StandardBlockConfig = {
  type: 'gallery',
  icon: Images,
  category: 'media',
  title: 'Gallery',
  description: 'Display multiple images in a rich gallery.',
  keywords: ['gallery', 'images', 'photos', 'grid', 'masonry', 'carousel'],
  supports: {
    align: true,
    color: false,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid', description: 'Uniform grid layout' },
  { value: 'masonry', label: 'Masonry', description: 'Pinterest-style layout' },
  { value: 'carousel', label: 'Carousel', description: 'Sliding carousel' },
  { value: 'tiled', label: 'Tiled', description: 'Mosaic tile layout' }
];

const ASPECT_RATIOS = [
  { value: 'square', label: 'Square (1:1)', ratio: 1 },
  { value: '4:3', label: 'Standard (4:3)', ratio: 4/3 },
  { value: '16:9', label: 'Widescreen (16:9)', ratio: 16/9 },
  { value: '3:2', label: 'Classic (3:2)', ratio: 3/2 },
  { value: 'original', label: 'Original', ratio: null }
];

const StandardGalleryBlock: React.FC<GalleryBlockProps> = (props) => {
  const { onChange, attributes = {}, isSelected } = props;
  const {
    images = [],
    columns = 3,
    gap = 10,
    layout = 'grid',
    imageCrop = true,
    aspectRatio = 'square',
    linkTo = 'none',
    lightbox = true,
    captions = true,
    randomOrder = false,
    borderRadius = 0,
    borderWidth = 0,
    borderColor = '#e5e7eb',
    captionStyle = 'overlay',
    captionBackground = 'rgba(0, 0, 0, 0.5)',
    captionColor = '#ffffff',
    captionFontSize = 14,
    align = 'center'
  } = attributes;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange('', { ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: GalleryImage[] = [];
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          newImages.push({
            id: `img-${Date.now()}-${Math.random()}`,
            url: objectUrl,
            alt: file.name.replace(/\.[^/.]+$/, ""),
            width: img.naturalWidth,
            height: img.naturalHeight
          });
          
          if (newImages.length === files.length) {
            updateAttribute('images', [...images, ...newImages]);
          }
        };
        img.src = objectUrl;
      }
    });
  };

  // Remove image
  const removeImage = (imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    updateAttribute('images', updatedImages);
    if (selectedImage === imageId) {
      setSelectedImage(null);
    }
  };

  // Update image property
  const updateImage = (imageId: string, property: string, value: any) => {
    const updatedImages = images.map(img =>
      img.id === imageId ? { ...img, [property]: value } : img
    );
    updateAttribute('images', updatedImages);
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    setDraggedImageId(imageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();
    if (!draggedImageId || draggedImageId === targetImageId) return;

    const draggedIndex = images.findIndex(img => img.id === draggedImageId);
    const targetIndex = images.findIndex(img => img.id === targetImageId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedImage);

    updateAttribute('images', newImages);
    setDraggedImageId(null);
  };

  // Open lightbox
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Navigate lightbox
  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
    } else {
      setLightboxIndex((prev) => (prev + 1) % images.length);
    }
  };

  // Navigate carousel
  const navigateCarousel = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCarouselIndex((prev) => Math.max(0, prev - columns));
    } else {
      setCarouselIndex((prev) => Math.min(images.length - columns, prev + columns));
    }
  };

  // Get ordered images
  const getOrderedImages = () => {
    if (randomOrder && !isSelected) {
      return [...images].sort(() => Math.random() - 0.5);
    }
    return images;
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="h-9 px-2"
      >
        <Upload className="h-4 w-4 mr-1" />
        <span className="text-xs">Add Images</span>
      </Button>

      <Select value={layout} onValueChange={(value) => updateAttribute('layout', value)}>
        <SelectTrigger className="h-9 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LAYOUT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('lightbox', !lightbox)}
        className={cn("h-9 px-2", lightbox && "bg-blue-100")}
        title="Toggle lightbox"
      >
        <Maximize className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="sm" className="h-9 px-2">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => updateAttribute('randomOrder', !randomOrder)}>
            Random Order: {randomOrder ? 'On' : 'Off'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateAttribute('captions', !captions)}>
            Captions: {captions ? 'On' : 'Off'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => {
              if (confirm('Remove all images?')) {
                updateAttribute('images', []);
              }
            }}
            className="text-red-600"
          >
            Clear Gallery
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Gallery Layout</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="layout" className="text-xs text-gray-600">Layout Type</Label>
            <Select value={layout} onValueChange={(value) => updateAttribute('layout', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div>{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="columns" className="text-xs text-gray-600">Columns ({columns})</Label>
            <Slider
              id="columns"
              min={1}
              max={8}
              step={1}
              value={[columns]}
              onValueChange={([value]) => updateAttribute('columns', value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="gap" className="text-xs text-gray-600">Gap ({gap}px)</Label>
            <Slider
              id="gap"
              min={0}
              max={30}
              step={5}
              value={[gap]}
              onValueChange={([value]) => updateAttribute('gap', value)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Image Settings</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="imageCrop" className="text-xs text-gray-600">Crop Images</Label>
            <Switch
              id="imageCrop"
              checked={imageCrop}
              onCheckedChange={(checked) => updateAttribute('imageCrop', checked)}
            />
          </div>

          {imageCrop && (
            <div>
              <Label htmlFor="aspectRatio" className="text-xs text-gray-600">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={(value) => updateAttribute('aspectRatio', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="linkTo" className="text-xs text-gray-600">Link To</Label>
            <Select value={linkTo} onValueChange={(value) => updateAttribute('linkTo', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="media">Media File</SelectItem>
                <SelectItem value="attachment">Attachment Page</SelectItem>
                <SelectItem value="custom">Custom URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="lightbox" className="text-xs text-gray-600">Enable Lightbox</Label>
            <Switch
              id="lightbox"
              checked={lightbox}
              onCheckedChange={(checked) => updateAttribute('lightbox', checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Caption Settings</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="captions" className="text-xs text-gray-600">Show Captions</Label>
            <Switch
              id="captions"
              checked={captions}
              onCheckedChange={(checked) => updateAttribute('captions', checked)}
            />
          </div>

          {captions && (
            <>
              <div>
                <Label htmlFor="captionStyle" className="text-xs text-gray-600">Caption Style</Label>
                <Select value={captionStyle} onValueChange={(value) => updateAttribute('captionStyle', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overlay">Overlay</SelectItem>
                    <SelectItem value="below">Below Image</SelectItem>
                    <SelectItem value="hover">On Hover</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="captionFontSize" className="text-xs text-gray-600">Caption Font Size</Label>
                <Input
                  id="captionFontSize"
                  type="number"
                  min="10"
                  max="24"
                  value={captionFontSize}
                  onChange={(e) => updateAttribute('captionFontSize', parseInt(e.target.value) || 14)}
                  className="mt-1"
                />
              </div>

              {captionStyle === 'overlay' && (
                <div>
                  <Label htmlFor="captionBackground" className="text-xs text-gray-600">Caption Background</Label>
                  <Input
                    id="captionBackground"
                    value={captionBackground}
                    onChange={(e) => updateAttribute('captionBackground', e.target.value)}
                    placeholder="rgba(0, 0, 0, 0.5)"
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="captionColor" className="text-xs text-gray-600">Caption Color</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="captionColor"
                    type="color"
                    value={captionColor}
                    onChange={(e) => updateAttribute('captionColor', e.target.value)}
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <Input
                    value={captionColor}
                    onChange={(e) => updateAttribute('captionColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Appearance</Label>
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="borderRadius" className="text-xs text-gray-600">Border Radius</Label>
              <Input
                id="borderRadius"
                type="number"
                min="0"
                max="30"
                value={borderRadius}
                onChange={(e) => updateAttribute('borderRadius', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="borderWidth" className="text-xs text-gray-600">Border Width</Label>
              <Input
                id="borderWidth"
                type="number"
                min="0"
                max="10"
                value={borderWidth}
                onChange={(e) => updateAttribute('borderWidth', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>

          {borderWidth > 0 && (
            <div>
              <Label htmlFor="borderColor" className="text-xs text-gray-600">Border Color</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="borderColor"
                  type="color"
                  value={borderColor}
                  onChange={(e) => updateAttribute('borderColor', e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  value={borderColor}
                  onChange={(e) => updateAttribute('borderColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="randomOrder" className="text-xs text-gray-600">Random Order</Label>
            <Switch
              id="randomOrder"
              checked={randomOrder}
              onCheckedChange={(checked) => updateAttribute('randomOrder', checked)}
            />
          </div>
        </div>
      </div>

      {selectedImage && (
        <div>
          <Label className="text-sm font-medium">Selected Image</Label>
          <div className="mt-2 space-y-3">
            <div>
              <Label htmlFor="imageAlt" className="text-xs text-gray-600">Alt Text</Label>
              <Input
                id="imageAlt"
                placeholder="Describe the image"
                value={images.find(img => img.id === selectedImage)?.alt || ''}
                onChange={(e) => updateImage(selectedImage, 'alt', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="imageCaption" className="text-xs text-gray-600">Caption</Label>
              <Textarea
                id="imageCaption"
                placeholder="Add a caption"
                value={images.find(img => img.id === selectedImage)?.caption || ''}
                onChange={(e) => updateImage(selectedImage, 'caption', e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>

            {linkTo === 'custom' && (
              <div>
                <Label htmlFor="imageLink" className="text-xs text-gray-600">Custom Link</Label>
                <Input
                  id="imageLink"
                  placeholder="https://example.com"
                  value={images.find(img => img.id === selectedImage)?.link || ''}
                  onChange={(e) => updateImage(selectedImage, 'link', e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeImage(selectedImage)}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Image
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Get image styles
  const getImageStyles = () => {
    const ratioData = ASPECT_RATIOS.find(r => r.value === aspectRatio);
    return {
      borderRadius: `${borderRadius}px`,
      border: borderWidth ? `${borderWidth}px solid ${borderColor}` : undefined,
      aspectRatio: imageCrop && ratioData?.ratio ? ratioData.ratio : undefined,
      objectFit: imageCrop ? 'cover' as const : 'contain' as const
    };
  };

  // Gallery placeholder
  const GalleryPlaceholder = () => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
      <Images className="mx-auto h-16 w-16 text-gray-400 mb-4" />
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">Create your gallery</h3>
        <p className="text-sm text-gray-600">Upload images or drag and drop</p>
        <Button 
          onClick={() => fileInputRef.current?.click()}
          className="mt-4"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Images
        </Button>
      </div>
    </div>
  );

  // Render single image
  const renderImage = (image: GalleryImage, index: number) => {
    const imageElement = (
      <div
        key={image.id}
        className={cn(
          "relative group cursor-pointer overflow-hidden",
          selectedImage === image.id && "ring-2 ring-blue-500"
        )}
        style={getImageStyles()}
        onClick={() => setSelectedImage(image.id)}
        onDragStart={(e) => handleDragStart(e, image.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, image.id)}
        draggable={isSelected}
      >
        <img
          src={image.url}
          alt={image.alt || ''}
          className="w-full h-full object-cover"
          onClick={(e) => {
            if (!isSelected && lightbox) {
              e.stopPropagation();
              openLightbox(index);
            }
          }}
        />

        {/* Caption overlay */}
        {captions && image.caption && (
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 p-2 text-white",
              captionStyle === 'overlay' && "bg-black bg-opacity-50",
              captionStyle === 'hover' && "opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50"
            )}
            style={{
              fontSize: `${captionFontSize}px`,
              color: captionColor,
              background: captionStyle === 'overlay' ? captionBackground : undefined
            }}
          >
            {image.caption}
          </div>
        )}

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                removeImage(image.id);
              }}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );

    // Caption below style
    if (captions && image.caption && captionStyle === 'below') {
      return (
        <div key={image.id}>
          {imageElement}
          <div
            className="mt-2 text-center"
            style={{
              fontSize: `${captionFontSize}px`,
              color: captionColor
            }}
          >
            {image.caption}
          </div>
        </div>
      );
    }

    return imageElement;
  };

  // Render gallery based on layout
  const renderGallery = () => {
    const orderedImages = getOrderedImages();

    if (orderedImages.length === 0) {
      return <GalleryPlaceholder />;
    }

    switch (layout) {
      case 'grid':
        return (
          <div
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: `${gap}px`
            }}
          >
            {orderedImages.map((image, index) => renderImage(image, index))}
          </div>
        );

      case 'masonry':
        return (
          <div
            className="columns-1 sm:columns-2 md:columns-3 lg:columns-4"
            style={{
              columnCount: columns,
              columnGap: `${gap}px`
            }}
          >
            {orderedImages.map((image, index) => (
              <div key={image.id} className="break-inside-avoid mb-4">
                {renderImage(image, index)}
              </div>
            ))}
          </div>
        );

      case 'carousel':
        return (
          <div className="relative">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-300"
                style={{
                  transform: `translateX(-${carouselIndex * (100 / columns)}%)`,
                  gap: `${gap}px`
                }}
              >
                {orderedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="flex-shrink-0"
                    style={{ width: `calc(${100 / columns}% - ${gap}px)` }}
                  >
                    {renderImage(image, index)}
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel controls */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateCarousel('prev')}
              disabled={carouselIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateCarousel('next')}
              disabled={carouselIndex >= orderedImages.length - columns}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        );

      case 'tiled':
        // Create a tiled mosaic layout
        return (
          <div className="grid grid-cols-6 gap-2" style={{ gap: `${gap}px` }}>
            {orderedImages.map((image, index) => {
              // Determine tile size based on index pattern
              const isLarge = index % 5 === 0;
              const isTall = index % 7 === 2;
              const isWide = index % 8 === 4;

              return (
                <div
                  key={image.id}
                  className={cn(
                    "relative",
                    isLarge && "col-span-3 row-span-2",
                    isTall && "col-span-2 row-span-2",
                    isWide && "col-span-3",
                    !isLarge && !isTall && !isWide && "col-span-2"
                  )}
                >
                  {renderImage(image, index)}
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  // Lightbox modal
  const Lightbox = () => {
    if (!lightboxOpen || images.length === 0) return null;

    const currentImage = images[lightboxIndex];

    return (
      <div
        className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
        onClick={() => setLightboxOpen(false)}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxOpen(false);
          }}
          className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20"
        >
          <X className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigateLightbox('prev');
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigateLightbox('next');
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>

        <div className="max-w-7xl max-h-screen p-8">
          <img
            src={currentImage.url}
            alt={currentImage.alt || ''}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {currentImage.caption && (
            <div className="text-white text-center mt-4">
              {currentImage.caption}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Gallery content
  const GalleryContent = () => (
    <div className={cn(
      "w-full",
      align === 'center' && 'mx-auto',
      align === 'right' && 'ml-auto',
      align === 'wide' && 'max-w-7xl mx-auto',
      align === 'full' && 'max-w-full'
    )}>
      {renderGallery()}
      
      {/* Add images section when selected */}
      {isSelected && images.length > 0 && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add More Images
          </Button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Lightbox */}
      {lightbox && <Lightbox />}
    </div>
  );

  return (
    <StandardBlockTemplate
      {...props}
      config={galleryConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <GalleryContent />
    </StandardBlockTemplate>
  );
};

export default StandardGalleryBlock;