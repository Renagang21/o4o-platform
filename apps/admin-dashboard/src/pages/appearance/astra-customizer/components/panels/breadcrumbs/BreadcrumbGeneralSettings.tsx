/**
 * Breadcrumb General Settings Component
 * Position, separator, and display options
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BreadcrumbsSettings } from '../../../types/customizer-types';
import { handleBreadcrumbChange } from './utils';

interface BreadcrumbGeneralSettingsProps {
  settings: BreadcrumbsSettings;
  onChange: (settings: BreadcrumbsSettings) => void;
}

export const BreadcrumbGeneralSettings: React.FC<BreadcrumbGeneralSettingsProps> = ({
  settings,
  onChange
}) => {
  const handleChange = <K extends keyof BreadcrumbsSettings>(
    field: K,
    value: BreadcrumbsSettings[K]
  ) => handleBreadcrumbChange(settings, onChange, field, value);

  return (
    <div className="space-y-6">
      {/* Position */}
      <div className="space-y-2">
        <Label>Position</Label>
        <Select
          value={settings.position}
          onValueChange={(value) => handleChange('position', value as any)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="above-content">Above Content</SelectItem>
            <SelectItem value="below-header">Below Header</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Home Text */}
      <div className="space-y-2">
        <Label>Home Text</Label>
        <Input
          value={settings.homeText}
          onChange={(e) => handleChange('homeText', e.target.value)}
          placeholder="Home"
        />
      </div>

      {/* Separator */}
      <div className="space-y-2">
        <Label>Separator</Label>
        <Select
          value={settings.separator}
          onValueChange={(value) => handleChange('separator', value as any)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=">">&gt;</SelectItem>
            <SelectItem value="/">/</SelectItem>
            <SelectItem value="→">→</SelectItem>
            <SelectItem value="•">•</SelectItem>
            <SelectItem value="|">|</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Display Options */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="show-current"
            checked={settings.showCurrentPage}
            onCheckedChange={(checked) => handleChange('showCurrentPage', checked)}
          />
          <Label htmlFor="show-current">Show Current Page</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-homepage"
            checked={settings.showOnHomepage}
            onCheckedChange={(checked) => handleChange('showOnHomepage', checked)}
          />
          <Label htmlFor="show-homepage">Show on Homepage</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-icons"
            checked={settings.showIcons}
            onCheckedChange={(checked) => handleChange('showIcons', checked)}
          />
          <Label htmlFor="show-icons">Show Icons</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="mobile-hidden"
            checked={settings.mobileHidden}
            onCheckedChange={(checked) => handleChange('mobileHidden', checked)}
          />
          <Label htmlFor="mobile-hidden">Hide on Mobile</Label>
        </div>
      </div>
    </div>
  );
};
