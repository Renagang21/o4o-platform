/**
 * InlineImageInserter Component
 * 텍스트 중간에 인라인 이미지 삽입 기능
 */

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Image,
  Upload,
  Link as LinkIcon,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InlineImageInserterProps {
  onInsert: (imageData: InlineImageData) => void;
}

export interface InlineImageData {
  src: string;
  alt: string;
  size: 'small' | 'medium' | 'large';
  align: 'baseline' | 'middle' | 'top' | 'bottom';
  textWrap: boolean;
  width?: number;
  height?: number;
}

const IMAGE_SIZES = [
  { value: 'small', label: 'Small', width: 32, height: 32 },
  { value: 'medium', label: 'Medium', width: 64, height: 64 },
  { value: 'large', label: 'Large', width: 96, height: 96 },
] as const;

const IMAGE_ALIGNMENTS = [
  { value: 'baseline', label: 'Baseline', icon: AlignLeft },
  { value: 'middle', label: 'Middle', icon: AlignCenter },
  { value: 'top', label: 'Top', icon: AlignRight },
  { value: 'bottom', label: 'Bottom', icon: AlignLeft },
] as const;

export const InlineImageInserter: React.FC<InlineImageInserterProps> = ({
  onInsert,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [align, setAlign] = useState<'baseline' | 'middle' | 'top' | 'bottom'>('middle');
  const [textWrap, setTextWrap] = useState(true);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setUploadError('');

    // Create data URL for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageUrl(result);
      setAltText(file.name.replace(/\.[^/.]+$/, ''));
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setUploadError('');

    // Try to extract filename for alt text
    try {
      const urlObj = new URL(url);
      const filename = urlObj.pathname.split('/').pop() || '';
      setAltText(filename.replace(/\.[^/.]+$/, ''));
    } catch (e) {
      // Invalid URL, ignore
    }
  };

  const handleInsert = () => {
    if (!imageUrl) return;

    const sizeData = IMAGE_SIZES.find(s => s.value === size);

    const imageData: InlineImageData = {
      src: imageUrl,
      alt: altText || 'Inline image',
      size,
      align,
      textWrap,
      width: sizeData?.width,
      height: sizeData?.height,
    };

    onInsert(imageData);

    // Reset form
    setImageUrl('');
    setAltText('');
    setSize('medium');
    setAlign('middle');
    setTextWrap(true);
    setUploadError('');
    setIsOpen(false);
  };

  const handleReset = () => {
    setImageUrl('');
    setAltText('');
    setSize('medium');
    setAlign('middle');
    setTextWrap(true);
    setUploadError('');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-2"
          title="Insert Inline Image"
        >
          <Image className="h-4 w-4" />
          Image
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-4" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Insert Inline Image</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Image Source Tabs */}
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="text-xs">
                <LinkIcon className="h-3 w-3 mr-1" />
                URL
              </TabsTrigger>
              <TabsTrigger value="upload" className="text-xs">
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-gray-700">Image URL</Label>
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-gray-700">Upload Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mt-1 h-8 text-xs"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Choose Image File
                </Button>
                {uploadError && (
                  <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Alt Text */}
          <div>
            <Label className="text-xs font-medium text-gray-700">Alt Text</Label>
            <Input
              placeholder="Describe the image"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          {/* Size */}
          <div>
            <Label className="text-xs font-medium text-gray-700">Size</Label>
            <Select value={size} onValueChange={(value: any) => setSize(value)}>
              <SelectTrigger className="w-full mt-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_SIZES.map((sizeOption) => (
                  <SelectItem key={sizeOption.value} value={sizeOption.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="border border-gray-300 bg-gray-100"
                        style={{
                          width: Math.min(sizeOption.width / 2, 16),
                          height: Math.min(sizeOption.height / 2, 16),
                        }}
                      />
                      <span>{sizeOption.label} ({sizeOption.width}×{sizeOption.height})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alignment */}
          <div>
            <Label className="text-xs font-medium text-gray-700">Vertical Alignment</Label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {IMAGE_ALIGNMENTS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={align === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAlign(value as any)}
                  className="h-8 text-xs"
                  title={label}
                >
                  <Icon className="h-3 w-3" />
                </Button>
              ))}
            </div>
          </div>

          {/* Text Wrap */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-gray-700">Text Wrapping</Label>
            <Button
              variant={textWrap ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTextWrap(!textWrap)}
              className="h-8 text-xs"
            >
              {textWrap ? 'On' : 'Off'}
            </Button>
          </div>

          {/* Preview */}
          {imageUrl && (
            <div>
              <Label className="text-xs font-medium text-gray-700">Preview</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded border">
                <p className="text-sm leading-relaxed">
                  This is sample text with an{' '}
                  <img
                    src={imageUrl}
                    alt={altText}
                    style={{
                      width: IMAGE_SIZES.find(s => s.value === size)?.width,
                      height: IMAGE_SIZES.find(s => s.value === size)?.height,
                      verticalAlign: align,
                      display: textWrap ? 'inline' : 'inline-block',
                    }}
                    className="mx-1"
                  />{' '}
                  inline image inserted in the middle of the paragraph.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleInsert}
              disabled={!imageUrl}
              className="text-xs"
            >
              Insert Image
            </Button>
          </div>

          {/* Tips */}
          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
            <p><strong>Tip:</strong> Position cursor where you want the image</p>
            <p><strong>Sizes:</strong> Small for icons, Medium for emphasis, Large for illustration</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InlineImageInserter;