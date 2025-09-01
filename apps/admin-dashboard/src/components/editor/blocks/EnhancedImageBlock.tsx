/**
 * EnhancedImageBlock Component
 * Complete image block with upload, toolbar, sidebar integration, and ACF support
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import { 
  Image as ImageIcon,
  Upload,
  Replace,
  Trash2,
  ExternalLink,
  FileImage
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mediaApi } from '@/services/api/postApi';

interface EnhancedImageBlockProps {
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
    url?: string;
    alt?: string;
    caption?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    size?: 'thumbnail' | 'medium' | 'large' | 'full';
    linkTo?: 'none' | 'media' | 'custom';
    linkUrl?: string;
    width?: number;
    height?: number;
    mediaId?: string;
    // ACF Integration
    dynamicSource?: {
      image?: string;
      caption?: string;
      alt?: string;
      link?: string;
    };
    useDynamicSource?: boolean;
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

const EnhancedImageBlock: React.FC<EnhancedImageBlockProps> = ({
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
  attributes = {},
  canMoveUp = true,
  canMoveDown = true,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType,
}) => {
  const {
    url = '',
    alt = '',
    caption = '',
    align = 'left',
    size = 'large',
    linkTo = 'none',
    linkUrl = '',
    width,
    height,
    dynamicSource = {},
    useDynamicSource = false
  } = attributes;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localCaption, setLocalCaption] = useState(caption);
  const [localAlt, setLocalAlt] = useState(alt);
  const [localLinkUrl, setLocalLinkUrl] = useState(linkUrl);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Sync with external changes
  useEffect(() => {
    setLocalCaption(caption);
    setLocalAlt(alt);
    setLocalLinkUrl(linkUrl);
  }, [caption, alt, linkUrl]);

  // Update attributes
  const updateAttribute = useCallback((key: string, value: any) => {
    const newContent = url || content;
    onChange(newContent, { ...attributes, [key]: value });
  }, [attributes, content, url, onChange]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      // Error log removed
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      // Error log removed
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await mediaApi.upload(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success && result.data) {
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          onChange(result.data!.url, {
            ...attributes,
            url: result.data!.url,
            alt: file.name.replace(/\.[^/.]+$/, ''),
            mediaId: result.data!.id,
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        };
        img.src = result.data.url;
      } else {
        // Error log removed
      }
    } catch (error) {
      // Error log removed
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragOver(false);
    }
  };

  const handleDragOverImage = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropImage = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  };

  // Handle alignment change
  const handleAlignChange = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    updateAttribute('align', newAlign);
  };

  // Handle caption change
  const handleCaptionChange = (newCaption: string) => {
    setLocalCaption(newCaption);
    updateAttribute('caption', newCaption);
  };

  // Handle alt text change
  const handleAltChange = (newAlt: string) => {
    setLocalAlt(newAlt);
    updateAttribute('alt', newAlt);
  };

  // Handle link change
  const handleLinkChange = (newLink: string) => {
    setLocalLinkUrl(newLink);
    updateAttribute('linkUrl', newLink);
    updateAttribute('linkTo', newLink ? 'custom' : 'none');
  };

  // Handle replace image
  const handleReplaceImage = () => {
    fileInputRef.current?.click();
  };

  // Handle image deletion
  const handleDeleteImage = () => {
    onChange('', {
      ...attributes,
      url: '',
      alt: '',
      caption: '',
      mediaId: undefined,
      width: undefined,
      height: undefined
    });
  };

  // Get image size class
  const getImageSizeClass = () => {
    switch (size) {
      case 'thumbnail': return 'max-w-32';
      case 'medium': return 'max-w-md';
      case 'large': return 'max-w-2xl';
      case 'full': return 'w-full';
      default: return 'max-w-lg';
    }
  };

  // Get alignment class
  const getAlignmentClass = () => {
    switch (align) {
      case 'center': return 'mx-auto text-center';
      case 'right': return 'ml-auto text-right';
      case 'justify': return 'w-full';
      default: return 'text-left';
    }
  };

  // Render image content
  const renderImage = () => {
    if (!url) return null;

    const imageElement = (
      <img
        src={url}
        alt={localAlt}
        className={cn(
          'block h-auto rounded',
          getImageSizeClass()
        )}
        style={{
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
        }}
        onLoad={(e) => {
          const img = e.target as HTMLImageElement;
          if (!width || !height) {
            updateAttribute('width', img.naturalWidth);
            updateAttribute('height', img.naturalHeight);
          }
        }}
      />
    );

    // Wrap with link if specified
    if (linkTo === 'media') {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
          {imageElement}
        </a>
      );
    } else if (linkTo === 'custom' && localLinkUrl) {
      return (
        <a href={localLinkUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
          {imageElement}
        </a>
      );
    }

    return imageElement;
  };

  // Custom toolbar content for image-specific controls
  const customToolbarContent = isSelected && url ? (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleReplaceImage}
        className="h-7 px-2 text-xs"
      >
        <Replace className="h-3 w-3 mr-1" />
        Replace
      </Button>
      
      <div className="w-px h-4 bg-gray-300" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('linkTo', linkTo === 'media' ? 'none' : 'media')}
        className={cn("h-7 px-2 text-xs", linkTo === 'media' && "bg-blue-100")}
      >
        <ExternalLink className="h-3 w-3 mr-1" />
        Link to Media
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDeleteImage}
        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Remove
      </Button>
    </div>
  ) : null;

  // Custom sidebar content for image settings
  const customSidebarContent = isSelected ? (
    <div className="space-y-4">
      {/* Dynamic Sources Toggle */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Dynamic Sources</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAttribute('useDynamicSource', !useDynamicSource)}
            className={cn(
              "h-6 px-2 text-xs",
              useDynamicSource ? "bg-blue-100 text-blue-700" : "text-gray-600"
            )}
          >
            {useDynamicSource ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
        {useDynamicSource && (
          <p className="text-xs text-gray-500 mt-1">
            Bind image properties to ACF fields
          </p>
        )}
      </div>

      {useDynamicSource ? (
        /* ACF Field Binding Interface */
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Image Field</Label>
            <select
              value={dynamicSource.image || ''}
              onChange={(e) => updateAttribute('dynamicSource', { ...dynamicSource, image: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select ACF Image Field</option>
              <option value="featured_image">Featured Image</option>
              <option value="gallery_image">Gallery Image</option>
              <option value="hero_image">Hero Image</option>
              <option value="product_image">Product Image</option>
              <option value="custom_image">Custom Image</option>
            </select>
          </div>

          <div>
            <Label className="text-sm font-medium">Caption Field</Label>
            <select
              value={dynamicSource.caption || ''}
              onChange={(e) => updateAttribute('dynamicSource', { ...dynamicSource, caption: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select ACF Text Field</option>
              <option value="image_caption">Image Caption</option>
              <option value="photo_description">Photo Description</option>
              <option value="media_title">Media Title</option>
              <option value="custom_caption">Custom Caption</option>
            </select>
          </div>

          <div>
            <Label className="text-sm font-medium">Alt Text Field</Label>
            <select
              value={dynamicSource.alt || ''}
              onChange={(e) => updateAttribute('dynamicSource', { ...dynamicSource, alt: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select ACF Text Field</option>
              <option value="image_alt">Image Alt Text</option>
              <option value="accessibility_text">Accessibility Text</option>
              <option value="screen_reader_text">Screen Reader Text</option>
              <option value="custom_alt">Custom Alt Text</option>
            </select>
          </div>

          <div>
            <Label className="text-sm font-medium">Link Field</Label>
            <select
              value={dynamicSource.link || ''}
              onChange={(e) => updateAttribute('dynamicSource', { ...dynamicSource, link: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select ACF URL/Link Field</option>
              <option value="image_link">Image Link</option>
              <option value="external_url">External URL</option>
              <option value="product_link">Product Link</option>
              <option value="custom_link">Custom Link</option>
            </select>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              ACF fields will override manual settings when available
            </p>
          </div>
        </div>
      ) : (
        /* Manual Settings Interface */
        <div className="space-y-4">
          <div>
            <Label htmlFor="image-alt" className="text-sm font-medium">Alt Text</Label>
            <Input
              id="image-alt"
              value={localAlt}
              onChange={(e) => handleAltChange(e.target.value)}
              placeholder="Describe this image..."
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="image-caption" className="text-sm font-medium">Caption</Label>
            <Input
              id="image-caption"
              value={localCaption}
              onChange={(e) => handleCaptionChange(e.target.value)}
              placeholder="Add a caption..."
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="image-link" className="text-sm font-medium">Link URL</Label>
            <Input
              id="image-link"
              value={localLinkUrl}
              onChange={(e) => handleLinkChange(e.target.value)}
              placeholder="https://example.com"
              className="mt-1"
            />
          </div>

          {width && height && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="image-width" className="text-sm font-medium">Width</Label>
                <Input
                  id="image-width"
                  type="number"
                  value={width}
                  onChange={(e) => updateAttribute('width', parseInt(e.target.value) || undefined)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="image-height" className="text-sm font-medium">Height</Label>
                <Input
                  id="image-height"
                  type="number"
                  value={height}
                  onChange={(e) => updateAttribute('height', parseInt(e.target.value) || undefined)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  ) : null;

  return (
    <EnhancedBlockWrapper
      id={id}
      type="image"
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
      onAlignChange={handleAlignChange}
      currentAlign={align}
      onChangeType={onChangeType}
      currentType="core/image"
      customToolbarContent={customToolbarContent}
      customSidebarContent={customSidebarContent}
    >
      <div className={cn('image-block', getAlignmentClass())}>
        {!url ? (
          // Upload area
          <div
            ref={dropZoneRef}
            className={cn(
              'relative border-2 border-dashed rounded-lg p-8 text-center transition-all min-h-48',
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
              isUploading && 'pointer-events-none opacity-50'
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOverImage}
            onDrop={handleDropImage}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {isUploading ? (
              <div className="space-y-4">
                <Upload className="h-16 w-16 mx-auto text-blue-500 animate-pulse" />
                <div className="w-full max-w-xs mx-auto">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <ImageIcon className="h-16 w-16 mx-auto text-gray-400" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload an image
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop an image here, or click to select
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    Supports: JPG, PNG, GIF, WebP • Maximum size: 10MB
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto"
                >
                  <FileImage className="h-4 w-4 mr-2" />
                  Select Image
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Image display
          <figure className="space-y-2">
            {renderImage()}
            
            {/* Caption */}
            {(localCaption || isSelected) && (
              <figcaption
                contentEditable={isSelected}
                suppressContentEditableWarning
                className={cn(
                  'text-sm text-gray-600 italic outline-none px-2 py-1',
                  'focus:bg-gray-50 focus:ring-2 focus:ring-blue-200 focus:ring-inset rounded',
                  !localCaption && isSelected && 'text-gray-400'
                )}
                onInput={(e) => {
                  const target = e.target as HTMLElement;
                  handleCaptionChange(target.textContent || '');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onAddBlock?.('after', 'core/paragraph');
                  }
                }}
                data-placeholder="Write a caption..."
                style={{
                  direction: 'ltr',
                  unicodeBidi: 'normal'
                }}
              >
                {localCaption}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default EnhancedImageBlock;