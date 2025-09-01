/**
 * SiteIdentitySection - Site logo, title, and tagline settings
 */

import React, { useState, useRef } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';

interface SiteIdentitySettings {
  logo?: string;
  siteTitle: string;
  tagline: string;
  favicon?: string;
}

interface SiteIdentitySectionProps {
  settings: SiteIdentitySettings;
  onChange: (updates: Partial<SiteIdentitySettings>) => void;
}

export const SiteIdentitySection: React.FC<SiteIdentitySectionProps> = ({
  settings,
  onChange
}) => {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setUploadingLogo(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      // Upload to server
      const response = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      onChange({ logo: data.url });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (ico, png, svg)
    const validTypes = ['image/x-icon', 'image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an ICO, PNG, or SVG file');
      return;
    }

    // Validate file size (max 100KB for favicon)
    if (file.size > 100 * 1024) {
      toast.error('Favicon size should be less than 100KB');
      return;
    }

    setUploadingFavicon(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'favicon');

      const response = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      onChange({ favicon: data.url });
      toast.success('Favicon uploaded successfully');
    } catch (error) {
      console.error('Favicon upload error:', error);
      toast.error('Failed to upload favicon');
    } finally {
      setUploadingFavicon(false);
      if (faviconInputRef.current) {
        faviconInputRef.current.value = '';
      }
    }
  };

  const removeLogo = () => {
    onChange({ logo: undefined });
    toast.success('Logo removed');
  };

  const removeFavicon = () => {
    onChange({ favicon: undefined });
    toast.success('Favicon removed');
  };

  return (
    <div className="wp-section-content">
      {/* Logo */}
      <div className="form-group">
        <Label htmlFor="site-logo">Logo</Label>
        <div className="logo-upload-area">
          {settings.logo ? (
            <div className="logo-preview">
              <img 
                src={settings.logo} 
                alt="Site logo" 
                className="max-h-20 max-w-full"
              />
              <button
                onClick={removeLogo}
                className="remove-logo"
                aria-label="Remove logo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="upload-placeholder">
              <Image className="w-12 h-12 text-gray-400" />
              <p className="text-sm text-gray-600 mt-2">No logo selected</p>
            </div>
          )}
          
          <input
            ref={logoInputRef}
            type="file"
            id="logo-upload"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            className="mt-3"
          >
            {uploadingLogo ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Select Logo
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Suggested image dimensions: 250 × 60 pixels
        </p>
      </div>

      {/* Site Title */}
      <div className="form-group">
        <Label htmlFor="site-title">Site Title</Label>
        <Input
          id="site-title"
          type="text"
          value={settings.siteTitle}
          onChange={(e) => onChange({ siteTitle: e.target.value })}
          placeholder="My Website"
        />
      </div>

      {/* Tagline */}
      <div className="form-group">
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          type="text"
          value={settings.tagline}
          onChange={(e) => onChange({ tagline: e.target.value })}
          placeholder="Just another website"
        />
        <p className="text-xs text-gray-500 mt-1">
          In a few words, explain what this site is about.
        </p>
      </div>

      {/* Site Icon (Favicon) */}
      <div className="form-group">
        <Label htmlFor="site-icon">Site Icon</Label>
        <div className="favicon-upload-area">
          {settings.favicon ? (
            <div className="favicon-preview">
              <img 
                src={settings.favicon} 
                alt="Site icon" 
                className="w-8 h-8"
              />
              <button
                onClick={removeFavicon}
                className="remove-favicon"
                aria-label="Remove favicon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="upload-placeholder small">
              <Image className="w-8 h-8 text-gray-400" />
            </div>
          )}
          
          <input
            ref={faviconInputRef}
            type="file"
            id="favicon-upload"
            accept=".ico,.png,.svg"
            onChange={handleFaviconUpload}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => faviconInputRef.current?.click()}
            disabled={uploadingFavicon}
            className="ml-3"
          >
            {uploadingFavicon ? (
              <>Uploading...</>
            ) : (
              <>Select Icon</>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Site Icon should be square and at least 512 × 512 pixels.
        </p>
      </div>

      {/* Display Site Title and Tagline */}
      <div className="form-group">
        <Label className="flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            defaultChecked
          />
          Display Site Title and Tagline
        </Label>
        <p className="text-xs text-gray-500 mt-1">
          Site Title and Tagline will be hidden if a logo is selected.
        </p>
      </div>
    </div>
  );
};

export default SiteIdentitySection;