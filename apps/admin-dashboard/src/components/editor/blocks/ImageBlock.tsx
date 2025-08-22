/**
 * ImageBlock Component
 * Gutenberg-style image block with BlockControls and InspectorControls
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Image as ImageIcon,
  Upload,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Expand,
  Maximize,
  Edit2,
  Replace
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BlockWrapper from './BlockWrapper';
import { RichText } from '../gutenberg/RichText';
import { BlockControls, ToolbarGroup, ToolbarButton } from '../gutenberg/BlockControls';
import { 
  InspectorControls, 
  PanelBody, 
  ToggleControl,
  RangeControl
} from '../gutenberg/InspectorControls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ImageBlockProps {
  id: string;
  onChange: (content: any, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    url?: string;
    alt?: string;
    caption?: string;
    align?: 'none' | 'left' | 'center' | 'right' | 'wide' | 'full';
    size?: 'thumbnail' | 'medium' | 'large' | 'full';
    linkTo?: 'none' | 'media' | 'attachment' | 'custom';
    linkUrl?: string;
    width?: number;
    height?: number;
    sizeSlug?: string;
    lightbox?: boolean;
    rounded?: number;
  };
}

const ImageBlock: React.FC<ImageBlockProps> = ({
  id,
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
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localCaption, setLocalCaption] = useState(attributes.caption || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const {
    url = '',
    alt = '',
    caption = '',
    align = 'none',
    size = 'large',
    linkTo = 'none',
    linkUrl = '',
    width,
    height,
    sizeSlug = 'large',
    lightbox = false,
    rounded = 0
  } = attributes;

  // Sync caption changes
  useEffect(() => {
    setLocalCaption(caption);
  }, [caption]);

  // Update attribute
  const updateAttribute = (key: string, value: any) => {
    onChange('', { ...attributes, [key]: value });
  };

  // Handle caption change
  const handleCaptionChange = (newCaption: string) => {
    setLocalCaption(newCaption);
    updateAttribute('caption', newCaption);
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // For demo, use local file URL
      const fileUrl = URL.createObjectURL(file);
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        onChange('', {
          ...attributes,
          url: fileUrl,
          alt: file.name.replace(/\.[^/.]+$/, ''),
          width: img.width,
          height: img.height
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      };
      img.src = fileUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  // Get align class
  const getAlignClass = () => {
    switch (align) {
      case 'left': return 'float-left mr-4';
      case 'right': return 'float-right ml-4';
      case 'center': return 'mx-auto';
      case 'wide': return 'w-full max-w-4xl mx-auto';
      case 'full': return 'w-full';
      default: return '';
    }
  };

  // Get image size styles
  const getImageStyles = () => {
    const styles: React.CSSProperties = {};
    
    if (width) styles.width = width;
    if (height) styles.height = height;
    if (rounded) styles.borderRadius = `${rounded}px`;
    
    return styles;
  };

  // Render image with link wrapper if needed
  const renderImage = () => {
    const img = (
      <img
        src={url}
        alt={alt}
        className={cn(
          'block',
          size === 'thumbnail' && 'max-w-xs',
          size === 'medium' && 'max-w-md',
          size === 'large' && 'max-w-2xl',
          size === 'full' && 'w-full'
        )}
        style={getImageStyles()}
      />
    );

    if (linkTo === 'media') {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {img}
        </a>
      );
    } else if (linkTo === 'custom' && linkUrl) {
      return (
        <a href={linkUrl} target="_blank" rel="noopener noreferrer">
          {img}
        </a>
      );
    }
    
    return img;
  };

  return (
    <>
      {/* Block Controls - Floating Toolbar */}
      {isSelected && url && (
        <BlockControls>
          {/* Replace Image */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Replace className="h-4 w-4" />}
              label="Replace"
              onClick={() => fileInputRef.current?.click()}
            />
          </ToolbarGroup>

          {/* Alignment */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<AlignLeft className="h-4 w-4" />}
              label="Align left"
              isActive={align === 'left'}
              onClick={() => updateAttribute('align', align === 'left' ? 'none' : 'left')}
            />
            <ToolbarButton
              icon={<AlignCenter className="h-4 w-4" />}
              label="Align center"
              isActive={align === 'center'}
              onClick={() => updateAttribute('align', align === 'center' ? 'none' : 'center')}
            />
            <ToolbarButton
              icon={<AlignRight className="h-4 w-4" />}
              label="Align right"
              isActive={align === 'right'}
              onClick={() => updateAttribute('align', align === 'right' ? 'none' : 'right')}
            />
            <ToolbarButton
              icon={<Expand className="h-4 w-4" />}
              label="Wide width"
              isActive={align === 'wide'}
              onClick={() => updateAttribute('align', align === 'wide' ? 'none' : 'wide')}
            />
            <ToolbarButton
              icon={<Maximize className="h-4 w-4" />}
              label="Full width"
              isActive={align === 'full'}
              onClick={() => updateAttribute('align', align === 'full' ? 'none' : 'full')}
            />
          </ToolbarGroup>

          {/* Edit Alt Text */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Edit2 className="h-4 w-4" />}
              label="Edit Alt Text"
              onClick={() => {
                const newAlt = prompt('Enter alt text:', alt);
                if (newAlt !== null) {
                  updateAttribute('alt', newAlt);
                }
              }}
            />
          </ToolbarGroup>

          {/* Link */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Link2 className="h-4 w-4" />}
              label="Add Link"
              isActive={linkTo !== 'none'}
              onClick={() => {
                if (linkTo !== 'none') {
                  updateAttribute('linkTo', 'none');
                  updateAttribute('linkUrl', '');
                } else {
                  const url = prompt('Enter URL:');
                  if (url) {
                    updateAttribute('linkTo', 'custom');
                    updateAttribute('linkUrl', url);
                  }
                }
              }}
            />
          </ToolbarGroup>
        </BlockControls>
      )}

      {/* Inspector Controls - Sidebar Settings */}
      {isSelected && url && (
        <InspectorControls>
          {/* Image Settings */}
          <PanelBody title="Image Settings" initialOpen={true}>
            {/* Alt Text */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Alt Text (Alternative Text)
              </label>
              <Textarea
                value={alt}
                onChange={(e) => updateAttribute('alt', e.target.value)}
                placeholder="Describe the purpose of the image"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if the image is purely decorative.
              </p>
            </div>

            {/* Image Size */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Image Size
              </label>
              <Select value={sizeSlug} onValueChange={(value) => updateAttribute('sizeSlug', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thumbnail">Thumbnail</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="full">Full Size</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Width
                </label>
                <Input
                  type="number"
                  value={width || ''}
                  onChange={(e) => updateAttribute('width', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Auto"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Height
                </label>
                <Input
                  type="number"
                  value={height || ''}
                  onChange={(e) => updateAttribute('height', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Auto"
                />
              </div>
            </div>

            {/* Border Radius */}
            <RangeControl
              label="Rounded Corners"
              value={rounded}
              onChange={(value) => updateAttribute('rounded', value)}
              min={0}
              max={50}
              step={1}
              help="Add rounded corners to the image"
            />
          </PanelBody>

          {/* Link Settings */}
          <PanelBody title="Link Settings" initialOpen={false}>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Link To
              </label>
              <Select value={linkTo} onValueChange={(value) => updateAttribute('linkTo', value)}>
                <SelectTrigger>
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

            {linkTo === 'custom' && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  URL
                </label>
                <Input
                  value={linkUrl}
                  onChange={(e) => updateAttribute('linkUrl', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            )}

            {/* Lightbox */}
            <ToggleControl
              label="Open in Lightbox"
              help="Display image in fullscreen overlay when clicked"
              checked={lightbox}
              onChange={(checked) => updateAttribute('lightbox', checked)}
            />
          </PanelBody>
        </InspectorControls>
      )}

      {/* Block Content */}
      <BlockWrapper
        id={id}
        type="image"
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onAddBlock={onAddBlock}
        className={cn('wp-block wp-block-image', align && `align${align}`)}
      >
        {!url ? (
          // Upload Area
          <div
            ref={dropZoneRef}
            className={cn(
              'relative border-2 border-dashed rounded-lg p-8 text-center transition-all',
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
              isUploading && 'pointer-events-none opacity-50'
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {isUploading ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto">
                  <Upload className="w-full h-full text-gray-400 animate-pulse" />
                </div>
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
              <>
                <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium mb-2">
                  Drop image here or click to upload
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  JPG, PNG, GIF, WebP • Max 10MB
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto"
                >
                  Select Image
                </Button>
              </>
            )}
          </div>
        ) : (
          // Image Display
          <figure className={cn('wp-block-image', getAlignClass())}>
            {renderImage()}
            
            {/* Caption */}
            {(caption || isSelected) && (
              <RichText
                tagName="figcaption"
                value={localCaption}
                onChange={handleCaptionChange}
                placeholder="Write caption..."
                className="wp-element-caption text-center text-sm text-gray-600 mt-2"
                allowedFormats={['core/bold', 'core/italic', 'core/link']}
              />
            )}
          </figure>
        )}

        {/* Hidden file input for replace */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </BlockWrapper>
    </>
  );
};

export default ImageBlock;