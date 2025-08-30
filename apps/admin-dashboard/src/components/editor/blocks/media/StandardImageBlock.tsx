/**
 * Standard Image Block
 * 표준 템플릿 기반의 이미지 블록
 */

import { useState, useRef, useCallback } from 'react';
import { 
  Image as ImageIcon,
  Upload,
  Link2,
  Replace,
  Edit2,
  Maximize,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { RichText } from '../../gutenberg/RichText';
import { cn } from '@/lib/utils';

interface ImageBlockProps extends StandardBlockProps {
  attributes?: {
    url?: string;
    alt?: string;
    caption?: string;
    width?: number;
    height?: number;
    aspectRatio?: 'original' | '1:1' | '4:3' | '16:9' | '3:2';
    objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
    borderRadius?: number;
    linkTo?: 'none' | 'media' | 'custom';
    linkUrl?: string;
    lightbox?: boolean;
    align?: 'left' | 'center' | 'right';
  };
}

const imageConfig: StandardBlockConfig = {
  type: 'image',
  icon: ImageIcon,
  category: 'media',
  title: 'Image',
  description: 'Insert an image to make a visual statement.',
  keywords: ['image', 'photo', 'picture', 'media'],
  supports: {
    align: true,
    color: false,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const ASPECT_RATIOS = [
  { value: 'original', label: 'Original', ratio: null },
  { value: '1:1', label: 'Square (1:1)', ratio: 1 },
  { value: '4:3', label: 'Landscape (4:3)', ratio: 4/3 },
  { value: '16:9', label: 'Widescreen (16:9)', ratio: 16/9 },
  { value: '3:2', label: 'Classic (3:2)', ratio: 3/2 }
];

const StandardImageBlock: React.FC<ImageBlockProps> = (props) => {
  const { onChange, attributes = {}, isSelected } = props;
  const {
    url = '',
    alt = '',
    caption = '',
    width,
    height,
    aspectRatio = 'original',
    objectFit = 'cover',
    borderRadius = 0,
    linkTo = 'none',
    linkUrl = '',
    lightbox = false,
    align = 'center'
  } = attributes;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [tempLinkUrl, setTempLinkUrl] = useState(linkUrl);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(url, { ...attributes, [key]: value });
  }, [onChange, url, attributes]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      // Create object URL for immediate preview
      const objectUrl = URL.createObjectURL(file);
      
      // Create image to get natural dimensions
      const img = new Image();
      img.onload = () => {
        onChange(objectUrl, {
          ...attributes,
          url: objectUrl,
          alt: file.name.replace(/\.[^/.]+$/, ""),
          width: img.naturalWidth,
          height: img.naturalHeight
        });
        setIsUploading(false);
      };
      img.src = objectUrl;
    }
  };

  // Apply link
  const applyLink = () => {
    updateAttribute('linkUrl', tempLinkUrl);
    updateAttribute('linkTo', tempLinkUrl ? 'custom' : 'none');
    setShowLinkPopover(false);
  };

  // Get aspect ratio style
  const getAspectRatioStyle = () => {
    const ratioData = ASPECT_RATIOS.find(r => r.value === aspectRatio);
    if (ratioData?.ratio) {
      return { aspectRatio: ratioData.ratio };
    }
    return {};
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      {url ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-2"
          >
            <Replace className="h-4 w-4 mr-1" />
            <span className="text-xs">Replace</span>
          </Button>
          
          <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
            <PopoverTrigger>
              <Button variant="ghost" size="sm" className="h-9 px-2">
                <Link2 className="h-4 w-4 mr-1" />
                <span className="text-xs">Link</span>
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

          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAttribute('lightbox', !lightbox)}
            className={cn("h-9 px-2", lightbox && "bg-blue-100")}
            title="Toggle lightbox"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-9 px-2"
        >
          <Upload className="h-4 w-4 mr-1" />
          <span className="text-xs">{isUploading ? 'Uploading...' : 'Upload'}</span>
        </Button>
      )}
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Image Settings</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="alt" className="text-xs text-gray-600">Alt Text</Label>
            <Input
              id="alt"
              placeholder="Describe the image"
              value={alt}
              onChange={(e) => updateAttribute('alt', e.target.value)}
              className="mt-1"
            />
          </div>

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

          <div>
            <Label htmlFor="objectFit" className="text-xs text-gray-600">Object Fit</Label>
            <Select value={objectFit} onValueChange={(value) => updateAttribute('objectFit', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="fill">Fill</SelectItem>
                <SelectItem value="scale-down">Scale Down</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="borderRadius" className="text-xs text-gray-600">Border Radius</Label>
            <Input
              id="borderRadius"
              type="number"
              min="0"
              max="50"
              value={borderRadius}
              onChange={(e) => updateAttribute('borderRadius', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Link & Behavior</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="lightbox" className="text-xs text-gray-600">Enable Lightbox</Label>
            <Switch
              id="lightbox"
              checked={lightbox}
              onCheckedChange={(checked) => updateAttribute('lightbox', checked)}
            />
          </div>

          {linkTo === 'custom' && (
            <div>
              <Label htmlFor="customLink" className="text-xs text-gray-600">Custom Link</Label>
              <Input
                id="customLink"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => updateAttribute('linkUrl', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Image placeholder
  const ImagePlaceholder = () => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
      <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">Add an image</h3>
        <p className="text-sm text-gray-600">Upload an image or drag and drop</p>
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isUploading}
          className="mt-4"
        >
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
          "max-w-full h-auto transition-all duration-200",
          lightbox && "cursor-zoom-in"
        )}
        style={{
          ...getAspectRatioStyle(),
          objectFit: objectFit,
          borderRadius: borderRadius ? `${borderRadius}px` : undefined,
          width: width && aspectRatio === 'original' ? `${width}px` : undefined,
          height: height && aspectRatio === 'original' ? `${height}px` : undefined
        }}
        onClick={() => {
          if (lightbox) {
            // Open lightbox - could integrate with a lightbox library
            window.open(url, '_blank');
          }
        }}
      />
    );

    const content = linkTo === 'custom' && linkUrl ? (
      <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
        {imageElement}
      </a>
    ) : linkTo === 'media' ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
        {imageElement}
      </a>
    ) : (
      imageElement
    );

    return (
      <div className={cn(
        "relative",
        align === 'center' && 'text-center',
        align === 'right' && 'text-right'
      )}>
        {content}
        
        {(caption || isSelected) && (
          <div className="mt-2">
            <RichText
              tagName="figcaption"
              placeholder="Write caption..."
              value={caption}
              onChange={(value) => updateAttribute('caption', value)}
              className="text-sm text-gray-600 italic text-center outline-none"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <StandardBlockTemplate
      {...props}
      config={imageConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
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
      </div>
    </StandardBlockTemplate>
  );
};

export default StandardImageBlock;