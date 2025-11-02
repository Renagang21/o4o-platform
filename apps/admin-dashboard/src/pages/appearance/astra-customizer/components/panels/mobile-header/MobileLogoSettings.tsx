/**
 * Mobile Logo Settings Component
 * Logo upload and sizing for mobile header
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MobileHeaderSettings } from '../../../types/customizer-types';
import { Upload, Smartphone } from 'lucide-react';
import { handleMobileHeaderChange } from './utils';

interface MobileLogoSettingsProps {
  settings: MobileHeaderSettings;
  onChange: (settings: MobileHeaderSettings) => void;
}

export const MobileLogoSettings: React.FC<MobileLogoSettingsProps> = ({
  settings,
  onChange
}) => {
  const handleChange = <K extends keyof MobileHeaderSettings>(
    field: K,
    value: MobileHeaderSettings[K]
  ) => handleMobileHeaderChange(settings, onChange, field, value);

  const handleLogoUpload = () => {
    // In a real implementation, this would open a media library
    const mockUrl = prompt('Enter mobile logo URL:');
    if (mockUrl) {
      handleChange('mobileLogoUrl', mockUrl);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium flex items-center gap-2">
        <Smartphone size={18} />
        Mobile Logo
      </h4>

      <div className="space-y-3">
        <div>
          <Label>Mobile Logo</Label>
          {settings.mobileLogoUrl ? (
            <div className="mt-2 p-4 border rounded bg-gray-50">
              <img
                src={settings.mobileLogoUrl}
                alt="Mobile Logo"
                className="max-h-12 mx-auto"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => handleChange('mobileLogoUrl', '')}
              >
                Remove Logo
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={handleLogoUpload}
            >
              <Upload size={16} className="mr-2" />
              Upload Mobile Logo
            </Button>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Optional: Different logo for mobile devices
          </p>
        </div>

        <div>
          <Label htmlFor="logo-width">Logo Width (px)</Label>
          <Input
            id="logo-width"
            type="number"
            min="50"
            max="200"
            value={settings.mobileLogoWidth}
            onChange={(e) => handleChange('mobileLogoWidth', parseInt(e.target.value) || 120)}
          />
        </div>
      </div>
    </div>
  );
};
