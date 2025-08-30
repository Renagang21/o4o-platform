/**
 * ImageBlock Component
 * Standardized image block using EnhancedBlockWrapper
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Image as ImageIcon,
  Upload,
  Link2,
  Replace,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { RichText } from '../gutenberg/RichText';

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
  attributes = {},
  canMoveUp = true,
  canMoveDown = true,
  isDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType
}) => {
  const {
    url = '',
    alt = '',
    caption = '',
    align = 'none',
    size = 'full',
    linkTo = 'none',
    linkUrl = '',
    width,
    height,
    lightbox = false,
    rounded = 0
  } = attributes;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [tempLinkUrl, setTempLinkUrl] = useState(linkUrl);

  // Update attribute helper
  const updateAttribute = (key: string, value: any) => {
    onChange(url, { ...attributes, [key]: value });
  };

  // Handle alignment change
  const handleAlignChange = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    const imageAlign = newAlign === 'justify' ? 'center' : newAlign;
    updateAttribute('align', imageAlign);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      // Create object URL for immediate preview
      const objectUrl = URL.createObjectURL(file);
      onChange(objectUrl, { 
        ...attributes, 
        url: objectUrl,
        alt: file.name.replace(/\.[^/.]+$/, "")
      });
      setIsUploading(false);
      
      // Here you would typically upload to your server
      // For now, we'll just use the object URL
    }
  };

  // Apply link
  const applyLink = () => {
    updateAttribute('linkUrl', tempLinkUrl);
    updateAttribute('linkTo', tempLinkUrl ? 'custom' : 'none');
    setShowLinkPopover(false);
  };

  // Custom toolbar content
  const customToolbarContent = (
    <div className="flex items-center gap-1">
      {url && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-2"
          >
            <Replace className="h-4 w-4 mr-1" />
            Replace
          </Button>
          
          <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
            <PopoverTrigger>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2"
              >
                <Link2 className="h-4 w-4 mr-1" />
                Link
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Add Link</h4>
                <Input
                  placeholder="https://example.com"
                  value={tempLinkUrl}
                  onChange={(e) => setTempLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLinkPopover(false)}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={applyLink}>
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );

  // Image placeholder/uploader
  const ImagePlaceholder = () => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">Add an image</h3>
        <p className="text-sm text-gray-600">Upload an image or drag and drop</p>
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </Button>
      </div>
    </div>
  );

  // Main image content
  const ImageContent = () => {
    if (!url) {
      return <ImagePlaceholder />;
    }

    const imageElement = (
      <img
        src={url}
        alt={alt}
        className={cn(
          "max-w-full h-auto",
          rounded > 0 && `rounded-${rounded === 1 ? 'sm' : rounded === 2 ? 'md' : 'lg'}`
        )}
        style={{
          width: width || undefined,
          height: height || undefined,
        }}
        onLoad={() => {
          // Auto-set dimensions if not set
          if (!width || !height) {
            const img = new Image();
            img.onload = () => {
              onChange(url, {
                ...attributes,
                width: img.naturalWidth,
                height: img.naturalHeight
              });
            };
            img.src = url;
          }
        }}
      />
    );

    const content = linkTo === 'custom' && linkUrl ? (
      <a href={linkUrl} target="_blank" rel="noopener noreferrer">
        {imageElement}
      </a>
    ) : (
      imageElement
    );

    return (
      <div 
        className={cn(
          "relative",
          align === 'center' && 'text-center',
          align === 'right' && 'text-right'
        )}
      >
        {content}
        {caption && (
          <RichText
            tagName="figcaption"
            placeholder="Write caption..."
            value={caption}
            onChange={(value) => updateAttribute('caption', value)}
            className="mt-2 text-sm text-gray-600 italic text-center"
          />
        )}
      </div>
    );
  };

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
      onCopy={onCopy}
      onPaste={onPaste}
      isDragging={isDragging}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      customToolbarContent={customToolbarContent}
      onAlignChange={handleAlignChange}
      currentAlign={align === 'none' ? 'left' : align as any}
      onChangeType={onChangeType}
      currentType="image"
    >
      <div className="w-full">
        <ImageContent />
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        {/* Alt text input when selected */}
        {isSelected && url && (
          <div className="mt-3 space-y-2">
            <div>
              <Label htmlFor="alt-text" className="text-sm font-medium">
                Alt text
              </Label>
              <Input
                id="alt-text"
                value={alt}
                onChange={(e) => updateAttribute('alt', e.target.value)}
                placeholder="Describe the purpose of the image"
                className="mt-1"
              />
            </div>
            
            {!caption && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateAttribute('caption', '')}
                className="w-full"
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Add caption
              </Button>
            )}
          </div>
        )}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default ImageBlock;