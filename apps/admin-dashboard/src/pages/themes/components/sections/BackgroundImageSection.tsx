/**
 * BackgroundImageSection - Background image settings
 */

import React, { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Image } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BackgroundImageSettings {
  url?: string;
  preset: 'default' | 'fill' | 'fit' | 'repeat' | 'custom';
  position: string;
  size: string;
  repeat: string;
  attachment: string;
}

interface BackgroundImageSectionProps {
  settings: BackgroundImageSettings;
  onChange: (updates: Partial<BackgroundImageSettings>) => void;
}

export const BackgroundImageSection: React.FC<BackgroundImageSectionProps> = ({
  settings,
  onChange
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'background');

      const response = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      onChange({ url: data.url });
      toast.success('Background image uploaded successfully');
    } catch (error) {
      // Image upload error
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    onChange({ url: undefined });
    toast.success('Background image removed');
  };

  const presetOptions = [
    { value: 'default', label: 'Default' },
    { value: 'fill', label: 'Fill Screen' },
    { value: 'fit', label: 'Fit to Screen' },
    { value: 'repeat', label: 'Repeat' },
    { value: 'custom', label: 'Custom' }
  ];

  const handlePresetChange = (preset: string) => {
    onChange({ preset: preset as BackgroundImageSettings['preset'] });

    // Apply preset settings
    switch (preset) {
      case 'fill':
        onChange({
          preset: 'fill' as const,
          size: 'cover',
          position: 'center center',
          repeat: 'no-repeat',
          attachment: 'fixed'
        });
        break;
      case 'fit':
        onChange({
          preset: 'fit' as const,
          size: 'contain',
          position: 'center center',
          repeat: 'no-repeat',
          attachment: 'fixed'
        });
        break;
      case 'repeat':
        onChange({
          preset: 'repeat' as const,
          size: 'auto',
          position: '0 0',
          repeat: 'repeat',
          attachment: 'scroll'
        });
        break;
      default:
        onChange({
          preset: 'default' as const,
          size: 'auto',
          position: 'center center',
          repeat: 'repeat',
          attachment: 'scroll'
        });
    }
  };

  return (
    <div className="wp-section-content">
      {/* Background Image Upload */}
      <div className="form-group">
        <Label>Background Image</Label>
        
        {settings.url ? (
          <div className="bg-image-preview">
            <img 
              src={settings.url} 
              alt="Background" 
              className="w-full h-32 object-cover rounded"
            />
            <button
              onClick={removeImage}
              className="remove-image"
              aria-label="Remove background image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            <Image className="w-12 h-12 text-gray-400" />
            <p className="text-sm text-gray-600 mt-2">No image selected</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-3 w-full"
        >
          {uploading ? (
            <>Uploading...</>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Select Image
            </>
          )}
        </Button>
      </div>

      {/* Image Display Settings */}
      {settings.url && (
        <>
          {/* Preset */}
          <div className="form-group">
            <Label htmlFor="bg-preset">Preset</Label>
            <Select
              value={settings.preset}
              onValueChange={handlePresetChange}
            >
              <SelectTrigger id="bg-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presetOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Settings */}
          {settings.preset === 'custom' && (
            <>
              {/* Position */}
              <div className="form-group">
                <Label htmlFor="bg-position">Image Position</Label>
                <Select
                  value={settings.position}
                  onValueChange={(value) => onChange({ position: value })}
                >
                  <SelectTrigger id="bg-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left top">Left Top</SelectItem>
                    <SelectItem value="center top">Center Top</SelectItem>
                    <SelectItem value="right top">Right Top</SelectItem>
                    <SelectItem value="left center">Left Center</SelectItem>
                    <SelectItem value="center center">Center Center</SelectItem>
                    <SelectItem value="right center">Right Center</SelectItem>
                    <SelectItem value="left bottom">Left Bottom</SelectItem>
                    <SelectItem value="center bottom">Center Bottom</SelectItem>
                    <SelectItem value="right bottom">Right Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Size */}
              <div className="form-group">
                <Label htmlFor="bg-size">Image Size</Label>
                <Select
                  value={settings.size}
                  onValueChange={(value) => onChange({ size: value })}
                >
                  <SelectTrigger id="bg-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Original</SelectItem>
                    <SelectItem value="contain">Fit to Screen</SelectItem>
                    <SelectItem value="cover">Fill Screen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Repeat */}
              <div className="form-group">
                <Label htmlFor="bg-repeat">Repeat Background Image</Label>
                <Select
                  value={settings.repeat}
                  onValueChange={(value) => onChange({ repeat: value })}
                >
                  <SelectTrigger id="bg-repeat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-repeat">No Repeat</SelectItem>
                    <SelectItem value="repeat">Tile</SelectItem>
                    <SelectItem value="repeat-x">Tile Horizontally</SelectItem>
                    <SelectItem value="repeat-y">Tile Vertically</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Attachment */}
              <div className="form-group">
                <Label htmlFor="bg-attachment">Scroll with Page</Label>
                <Select
                  value={settings.attachment}
                  onValueChange={(value) => onChange({ attachment: value })}
                >
                  <SelectTrigger id="bg-attachment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scroll">Scroll</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default BackgroundImageSection;