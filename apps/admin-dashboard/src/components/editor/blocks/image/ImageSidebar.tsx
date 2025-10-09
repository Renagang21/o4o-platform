/**
 * ImageSidebar Component
 * 이미지 블록 사이드바 설정
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DynamicSource {
  image?: string;
  caption?: string;
  alt?: string;
  link?: string;
}

interface ImageSidebarProps {
  useDynamicSource: boolean;
  dynamicSource: DynamicSource;
  alt: string;
  caption: string;
  linkUrl: string;
  width?: number;
  height?: number;
  onToggleDynamicSource: () => void;
  onDynamicSourceChange: (key: string, value: string) => void;
  onAltChange: (alt: string) => void;
  onCaptionChange: (caption: string) => void;
  onLinkChange: (link: string) => void;
  onDimensionChange: (dimension: 'width' | 'height', value: number) => void;
}

const ImageSidebar: React.FC<ImageSidebarProps> = ({
  useDynamicSource,
  dynamicSource,
  alt,
  caption,
  linkUrl,
  width,
  height,
  onToggleDynamicSource,
  onDynamicSourceChange,
  onAltChange,
  onCaptionChange,
  onLinkChange,
  onDimensionChange
}) => {
  return (
    <div className="space-y-4">
      {/* Dynamic Sources Toggle */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Dynamic Sources</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDynamicSource}
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
              onChange={(e) => onDynamicSourceChange('image', e.target.value)}
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
              onChange={(e) => onDynamicSourceChange('caption', e.target.value)}
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
              onChange={(e) => onDynamicSourceChange('alt', e.target.value)}
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
              onChange={(e) => onDynamicSourceChange('link', e.target.value)}
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
              value={alt}
              onChange={(e) => onAltChange(e.target.value)}
              placeholder="Describe this image..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="image-caption" className="text-sm font-medium">Caption</Label>
            <Input
              id="image-caption"
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Add a caption..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="image-link" className="text-sm font-medium">Link URL</Label>
            <Input
              id="image-link"
              value={linkUrl}
              onChange={(e) => onLinkChange(e.target.value)}
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
                  onChange={(e) => onDimensionChange('width', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="image-height" className="text-sm font-medium">Height</Label>
                <Input
                  id="image-height"
                  type="number"
                  value={height}
                  onChange={(e) => onDimensionChange('height', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageSidebar;
