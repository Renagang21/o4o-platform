/**
 * BlockTransforms Component
 * Unified block transformation system for Image ↔ Cover ↔ Gallery conversions
 * Provides seamless data migration and metadata preservation
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Image as ImageIcon,
  Layers,
  Grid3X3,
  ArrowRightLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Type definitions for block attributes
interface ImageAttributes {
  type: 'o4o/image';
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  mediaId?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  size?: 'thumbnail' | 'medium' | 'large' | 'full';
  linkTo?: 'none' | 'media' | 'custom';
  linkUrl?: string;
  focalPoint?: { x: number; y: number };
  filters?: any;
  rotation?: number;
  cropData?: any;
  decorative?: boolean;
  title?: string;
}

interface CoverAttributes {
  type: 'o4o/cover';
  backgroundType: 'image' | 'video' | 'color' | 'gradient';
  backgroundImage?: string;
  backgroundVideo?: string;
  backgroundColor?: string;
  gradient?: string;
  focalPoint?: { x: number; y: number };
  overlayColor?: string;
  overlayOpacity: number;
  duotoneFilter?: string;
  blendMode?: string;
  contentPosition: string;
  minHeight: number;
  aspectRatio?: string;
  hasParallax: boolean;
  innerBlocks?: any[];
}

interface GalleryAttributes {
  type: 'o4o/gallery';
  images: GalleryImage[];
  ids: string[];
  layout: 'grid' | 'masonry' | 'slider';
  columns: number;
  gap: number;
  aspectRatio: 'auto' | 'square' | '16:9' | '4:3' | '3:2';
  imageCrop: boolean;
  linkTo: 'none' | 'media' | 'attachment';
  showCaptions: boolean;
  captionPosition: 'below' | 'overlay' | 'hover';
  enableLightbox: boolean;
}

interface GalleryImage {
  id: string;
  url: string;
  fullUrl: string;
  alt: string;
  caption?: string;
  title?: string;
  width: number;
  height: number;
  focalPoint?: { x: number; y: number };
  filters?: any;
  rotation?: number;
  cropData?: any;
}

export interface BlockTransformProps {
  currentType: 'o4o/image' | 'o4o/cover' | 'o4o/gallery';
  currentAttributes: ImageAttributes | CoverAttributes | GalleryAttributes;
  onTransform: (newType: string, newAttributes: any, newContent?: string) => void;
  className?: string;
}

/**
 * Transform Image Block to Cover Block
 */
export const transformImageToCover = (imageAttributes: ImageAttributes): CoverAttributes => {
  return {
    type: 'o4o/cover',
    backgroundType: 'image',
    backgroundImage: imageAttributes.url,
    focalPoint: imageAttributes.focalPoint || { x: 50, y: 50 },
    overlayColor: '#000000',
    overlayOpacity: 0,
    duotoneFilter: imageAttributes.filters?.duotone,
    blendMode: 'normal',
    contentPosition: 'center-center',
    minHeight: Math.max(imageAttributes.height || 400, 300),
    hasParallax: false,
    innerBlocks: [
      {
        name: 'o4o/paragraph',
        attributes: {
          content: imageAttributes.caption || '',
          align: 'center',
          style: {
            typography: {
              fontSize: '1.25rem',
              fontWeight: '600'
            },
            color: {
              text: '#ffffff'
            }
          }
        }
      }
    ]
  };
};

/**
 * Transform Image Block to Gallery Block
 */
export const transformImageToGallery = (imageAttributes: ImageAttributes): GalleryAttributes => {
  const galleryImage: GalleryImage = {
    id: imageAttributes.mediaId || '',
    url: imageAttributes.url,
    fullUrl: imageAttributes.url,
    alt: imageAttributes.alt || '',
    caption: imageAttributes.caption,
    title: imageAttributes.title,
    width: imageAttributes.width || 0,
    height: imageAttributes.height || 0,
    focalPoint: imageAttributes.focalPoint,
    filters: imageAttributes.filters,
    rotation: imageAttributes.rotation,
    cropData: imageAttributes.cropData
  };

  return {
    type: 'o4o/gallery',
    images: [galleryImage],
    ids: [imageAttributes.mediaId || ''],
    layout: 'grid',
    columns: 1,
    gap: 16,
    aspectRatio: 'auto',
    imageCrop: false,
    linkTo: imageAttributes.linkTo === 'media' ? 'media' : 'none',
    showCaptions: Boolean(imageAttributes.caption),
    captionPosition: 'below',
    enableLightbox: true
  };
};

/**
 * Transform Cover Block to Image Block
 */
export const transformCoverToImage = (coverAttributes: CoverAttributes): ImageAttributes => {
  // Extract text content from inner blocks
  const textContent = coverAttributes.innerBlocks
    ?.filter(block => block.name === 'o4o/paragraph' || block.name === 'o4o/heading')
    .map(block => block.attributes?.content || '')
    .join(' ')
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .trim();

  return {
    type: 'o4o/image',
    url: coverAttributes.backgroundImage || '',
    alt: textContent ? `Cover image: ${textContent.substring(0, 100)}` : 'Cover image',
    caption: textContent || '',
    align: 'center',
    size: 'large',
    linkTo: 'none',
    focalPoint: coverAttributes.focalPoint || { x: 50, y: 50 },
    filters: {
      duotone: coverAttributes.duotoneFilter
    },
    decorative: false
  };
};

/**
 * Transform Cover Block to Gallery Block
 */
export const transformCoverToGallery = (coverAttributes: CoverAttributes): GalleryAttributes => {
  if (!coverAttributes.backgroundImage) {
    throw new Error('Cover block must have a background image to convert to gallery');
  }

  // Extract text content from inner blocks
  const textContent = coverAttributes.innerBlocks
    ?.filter(block => block.name === 'o4o/paragraph' || block.name === 'o4o/heading')
    .map(block => block.attributes?.content || '')
    .join(' ')
    .replace(/<[^>]*>/g, '')
    .trim();

  const galleryImage: GalleryImage = {
    id: '', // Will need to be resolved
    url: coverAttributes.backgroundImage,
    fullUrl: coverAttributes.backgroundImage,
    alt: textContent ? `Cover: ${textContent.substring(0, 100)}` : 'Cover image',
    caption: textContent || '',
    title: '',
    width: 0, // Will be resolved from image
    height: 0, // Will be resolved from image
    focalPoint: coverAttributes.focalPoint
  };

  return {
    type: 'o4o/gallery',
    images: [galleryImage],
    ids: [''],
    layout: 'grid',
    columns: 1,
    gap: 16,
    aspectRatio: coverAttributes.aspectRatio as any || 'auto',
    imageCrop: false,
    linkTo: 'none',
    showCaptions: Boolean(textContent),
    captionPosition: 'below',
    enableLightbox: true
  };
};

/**
 * Transform Gallery Block to Image Block (uses first image)
 */
export const transformGalleryToImage = (galleryAttributes: GalleryAttributes): ImageAttributes => {
  const firstImage = galleryAttributes.images[0];
  if (!firstImage) {
    throw new Error('Gallery must have at least one image to convert to image block');
  }

  return {
    type: 'o4o/image',
    url: firstImage.url,
    alt: firstImage.alt || '',
    caption: firstImage.caption || '',
    width: firstImage.width,
    height: firstImage.height,
    mediaId: firstImage.id,
    align: 'center',
    size: 'large',
    linkTo: galleryAttributes.linkTo === 'media' ? 'media' : 'none',
    focalPoint: firstImage.focalPoint || { x: 50, y: 50 },
    filters: firstImage.filters,
    rotation: firstImage.rotation,
    cropData: firstImage.cropData,
    decorative: false
  };
};

/**
 * Transform Gallery Block to Cover Block (uses first image)
 */
export const transformGalleryToCover = (galleryAttributes: GalleryAttributes): CoverAttributes => {
  const firstImage = galleryAttributes.images[0];
  if (!firstImage) {
    throw new Error('Gallery must have at least one image to convert to cover block');
  }

  return {
    type: 'o4o/cover',
    backgroundType: 'image',
    backgroundImage: firstImage.url,
    focalPoint: firstImage.focalPoint || { x: 50, y: 50 },
    overlayColor: '#000000',
    overlayOpacity: 0,
    duotoneFilter: firstImage.filters?.duotone,
    blendMode: 'normal',
    contentPosition: 'center-center',
    minHeight: Math.max(firstImage.height || 400, 300),
    aspectRatio: galleryAttributes.aspectRatio === 'auto' ? undefined : galleryAttributes.aspectRatio,
    hasParallax: false,
    innerBlocks: firstImage.caption ? [
      {
        name: 'o4o/paragraph',
        attributes: {
          content: firstImage.caption,
          align: 'center',
          style: {
            typography: {
              fontSize: '1.25rem',
              fontWeight: '600'
            },
            color: {
              text: '#ffffff'
            }
          }
        }
      }
    ] : []
  };
};

/**
 * Main BlockTransforms Component
 */
export const BlockTransforms: React.FC<BlockTransformProps> = ({
  currentType,
  currentAttributes,
  onTransform,
  className
}) => {
  const handleTransform = (targetType: string) => {
    try {
      let newAttributes: any;
      let newContent = '';

      // Determine transformation based on current and target types
      if (currentType === 'o4o/image' && targetType === 'o4o/cover') {
        newAttributes = transformImageToCover(currentAttributes as ImageAttributes);
        newContent = newAttributes.backgroundImage || '';
      } else if (currentType === 'o4o/image' && targetType === 'o4o/gallery') {
        newAttributes = transformImageToGallery(currentAttributes as ImageAttributes);
        newContent = newAttributes.images[0]?.url || '';
      } else if (currentType === 'o4o/cover' && targetType === 'o4o/image') {
        newAttributes = transformCoverToImage(currentAttributes as CoverAttributes);
        newContent = newAttributes.url || '';
      } else if (currentType === 'o4o/cover' && targetType === 'o4o/gallery') {
        newAttributes = transformCoverToGallery(currentAttributes as CoverAttributes);
        newContent = newAttributes.images[0]?.url || '';
      } else if (currentType === 'o4o/gallery' && targetType === 'o4o/image') {
        newAttributes = transformGalleryToImage(currentAttributes as GalleryAttributes);
        newContent = newAttributes.url || '';
      } else if (currentType === 'o4o/gallery' && targetType === 'o4o/cover') {
        newAttributes = transformGalleryToCover(currentAttributes as GalleryAttributes);
        newContent = newAttributes.backgroundImage || '';
      } else {
        throw new Error(`Unsupported transformation: ${currentType} → ${targetType}`);
      }

      onTransform(targetType, newAttributes, newContent);
    } catch (error) {
      alert(`Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getAvailableTransforms = () => {
    const transforms = [];

    if (currentType === 'o4o/image') {
      // Check if image exists for cover transformation
      const imageAttrs = currentAttributes as ImageAttributes;
      if (imageAttrs.url) {
        transforms.push({ type: 'o4o/cover', label: 'Cover', icon: Layers });
        transforms.push({ type: 'o4o/gallery', label: 'Gallery', icon: Grid3X3 });
      }
    } else if (currentType === 'o4o/cover') {
      const coverAttrs = currentAttributes as CoverAttributes;
      if (coverAttrs.backgroundImage) {
        transforms.push({ type: 'o4o/image', label: 'Image', icon: ImageIcon });
        transforms.push({ type: 'o4o/gallery', label: 'Gallery', icon: Grid3X3 });
      }
    } else if (currentType === 'o4o/gallery') {
      const galleryAttrs = currentAttributes as GalleryAttributes;
      if (galleryAttrs.images.length > 0) {
        transforms.push({ type: 'o4o/image', label: 'Image', icon: ImageIcon });
        transforms.push({ type: 'o4o/cover', label: 'Cover', icon: Layers });
      }
    }

    return transforms;
  };

  const availableTransforms = getAvailableTransforms();

  if (availableTransforms.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-xs text-gray-600 mr-2">
        <ArrowRightLeft className="inline h-3 w-3 mr-1" />
        Transform to:
      </span>
      {availableTransforms.map(({ type, label, icon: Icon }) => (
        <Button
          key={type}
          variant="outline"
          size="sm"
          onClick={() => handleTransform(type)}
          className="h-7 px-2 text-xs"
          title={`Transform to ${label} Block`}
        >
          <Icon className="h-3 w-3 mr-1" />
          {label}
        </Button>
      ))}
    </div>
  );
};

/**
 * Utility function to validate block transformation
 */
export const canTransformBlock = (
  fromType: string,
  toType: string,
  attributes: any
): boolean => {
  if (fromType === toType) return false;

  try {
    if (fromType === 'o4o/image' && toType === 'o4o/cover') {
      return Boolean(attributes.url);
    } else if (fromType === 'o4o/image' && toType === 'o4o/gallery') {
      return Boolean(attributes.url);
    } else if (fromType === 'o4o/cover' && toType === 'o4o/image') {
      return Boolean(attributes.backgroundImage);
    } else if (fromType === 'o4o/cover' && toType === 'o4o/gallery') {
      return Boolean(attributes.backgroundImage);
    } else if (fromType === 'o4o/gallery' && toType === 'o4o/image') {
      return Boolean(attributes.images?.length > 0);
    } else if (fromType === 'o4o/gallery' && toType === 'o4o/cover') {
      return Boolean(attributes.images?.length > 0);
    }
  } catch (error) {
    return false;
  }

  return false;
};

export default BlockTransforms;