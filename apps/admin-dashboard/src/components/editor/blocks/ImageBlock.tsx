/**
 * ImageBlock Component
 * Drag-and-drop image upload with inline caption editing
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Image as ImageIcon,
  Upload,
  Link2,
  Settings,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Expand,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Slider } from '@/components/ui/slider';
import BlockWrapper from './BlockWrapper';

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
    align?: 'left' | 'center' | 'right' | 'wide' | 'full';
    size?: 'thumbnail' | 'medium' | 'large' | 'full';
    linkTo?: 'none' | 'media' | 'custom';
    linkUrl?: string;
    width?: number;
    height?: number;
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
  const [captionEditing, setCaptionEditing] = useState(false);
  const [localCaption, setLocalCaption] = useState(attributes.caption || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const {
    url = '',
    alt = '',
    caption = '',
    align = 'center',
    size = 'large',
    linkTo = 'none',
    linkUrl = '',
    width,
    height
  } = attributes;

  // Sync caption changes
  useEffect(() => {
    setLocalCaption(caption);
  }, [caption]);

  // Focus caption on edit
  useEffect(() => {
    if (captionEditing && captionRef.current) {
      captionRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(captionRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [captionEditing]);

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
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // TODO: Replace with actual upload endpoint
      // const response = await fetch('/api/upload', {
      //   method: 'POST',
      //   body: formData
      // });
      // const data = await response.json();

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

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  // Handle URL input
  const handleUrlInput = (newUrl: string) => {
    onChange('', { ...attributes, url: newUrl });
  };

  // Update attribute
  const updateAttribute = (key: string, value: any) => {
    onChange('', { ...attributes, [key]: value });
  };

  // Handle caption change
  const handleCaptionChange = () => {
    if (!captionRef.current) return;
    const newCaption = captionRef.current.innerText;
    setLocalCaption(newCaption);
    updateAttribute('caption', newCaption);
  };

  // Handle caption key down
  const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setCaptionEditing(false);
      captionRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setCaptionEditing(false);
      captionRef.current?.blur();
    }
  };

  // Get alignment classes
  const getAlignmentClasses = () => {
    switch (align) {
      case 'left':
        return 'mr-auto';
      case 'center':
        return 'mx-auto';
      case 'right':
        return 'ml-auto';
      case 'wide':
        return 'w-full max-w-4xl mx-auto';
      case 'full':
        return 'w-full';
      default:
        return 'mx-auto';
    }
  };

  // Get size dimensions
  const getSizeDimensions = () => {
    switch (size) {
      case 'thumbnail':
        return { maxWidth: '150px', maxHeight: '150px' };
      case 'medium':
        return { maxWidth: '300px', maxHeight: '300px' };
      case 'large':
        return { maxWidth: '640px', maxHeight: '640px' };
      case 'full':
        return {};
      default:
        return { maxWidth: '640px' };
    }
  };

  return (
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
    >
      {/* Toolbar - shows when selected */}
      {isSelected && url && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
          {/* Alignment */}
          <div className="flex gap-1">
            <Button
              variant={align === 'left' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateAttribute('align', 'left')}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={align === 'center' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateAttribute('align', 'center')}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={align === 'right' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateAttribute('align', 'right')}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              variant={align === 'full' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateAttribute('align', 'full')}
            >
              <Expand className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Size selector */}
          <Select value={size} onValueChange={(v) => updateAttribute('size', v)}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thumbnail">Thumbnail</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
              <SelectItem value="full">Full Size</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-gray-300" />

          {/* Settings */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                {/* Alt text */}
                <div>
                  <Label htmlFor="alt">Alt Text</Label>
                  <Textarea
                    id="alt"
                    value={alt}
                    onChange={(e) => updateAttribute('alt', e.target.value)}
                    placeholder="Describe the image..."
                    className="mt-1"
                    rows={2}
                  />
                </div>

                {/* Link settings */}
                <div>
                  <Label htmlFor="linkTo">Link To</Label>
                  <Select value={linkTo} onValueChange={(v) => updateAttribute('linkTo', v)}>
                    <SelectTrigger id="linkTo" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="media">Media File</SelectItem>
                      <SelectItem value="custom">Custom URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {linkTo === 'custom' && (
                  <div>
                    <Label htmlFor="linkUrl">URL</Label>
                    <Input
                      id="linkUrl"
                      value={linkUrl}
                      onChange={(e) => updateAttribute('linkUrl', e.target.value)}
                      placeholder="https://example.com"
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Replace image */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace Image
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Image display or upload area */}
      {url ? (
        <figure className={cn('image-block', getAlignmentClasses())}>
          <div className="relative group">
            {/* Image */}
            <img
              src={url}
              alt={alt}
              className="block w-full h-auto rounded"
              style={getSizeDimensions()}
              onClick={() => {
                if (linkTo === 'media') {
                  window.open(url, '_blank');
                } else if (linkTo === 'custom' && linkUrl) {
                  window.open(linkUrl, '_blank');
                }
              }}
            />

            {/* Overlay controls when selected */}
            {isSelected && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Replace
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Caption */}
          <figcaption
            ref={captionRef}
            contentEditable={captionEditing}
            suppressContentEditableWarning
            className={cn(
              'mt-2 text-sm text-gray-600 text-center outline-none',
              captionEditing && 'ring-2 ring-blue-500 ring-offset-2 rounded px-2 py-1',
              !localCaption && !captionEditing && 'text-gray-400 italic'
            )}
            onClick={() => setCaptionEditing(true)}
            onBlur={() => setCaptionEditing(false)}
            onInput={handleCaptionChange}
            onKeyDown={handleCaptionKeyDown}
          >
            {localCaption || (captionEditing ? '' : '이미지 캡션 추가...')}
          </figcaption>
        </figure>
      ) : (
        <div
          ref={dropZoneRef}
          className={cn(
            'image-upload-zone border-2 border-dashed rounded-lg p-8',
            'flex flex-col items-center justify-center min-h-[200px]',
            'transition-all cursor-pointer',
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
            isUploading && 'pointer-events-none opacity-50'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">업로드 중... {uploadProgress}%</p>
              <div className="w-48 h-2 bg-gray-200 rounded-full mt-2">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-base font-medium text-gray-700 mb-2">
                이미지를 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-sm text-gray-500 mb-4">
                JPG, PNG, GIF, WebP (최대 10MB)
              </p>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  파일 선택
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Link2 className="h-4 w-4 mr-2" />
                      URL 입력
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input
                          id="imageUrl"
                          placeholder="https://example.com/image.jpg"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              if (input.value) {
                                handleUrlInput(input.value);
                              }
                            }
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById('imageUrl') as HTMLInputElement;
                          if (input?.value) {
                            handleUrlInput(input.value);
                          }
                        }}
                      >
                        Add Image
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </BlockWrapper>
  );
};

export default ImageBlock;