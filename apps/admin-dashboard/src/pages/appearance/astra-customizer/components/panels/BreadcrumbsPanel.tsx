/**
 * Breadcrumbs Panel Component
 * Customizer의 Breadcrumbs 설정 패널
 * Refactored to use sub-components for better organization
 */

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BreadcrumbsSettings } from '../../types/customizer-types';
import { Navigation, Palette, Type, Settings } from 'lucide-react';
import { BreadcrumbGeneralSettings } from './breadcrumbs/BreadcrumbGeneralSettings';
import { BreadcrumbStylingSettings } from './breadcrumbs/BreadcrumbStylingSettings';
import { BreadcrumbAdvancedSettings } from './breadcrumbs/BreadcrumbAdvancedSettings';

interface BreadcrumbsPanelProps {
  settings?: BreadcrumbsSettings;
  onChange: (settings: BreadcrumbsSettings) => void;
}

const defaultSettings: BreadcrumbsSettings = {
  enabled: true,
  position: 'above-content',
  homeText: 'Home',
  separator: '>',
  showCurrentPage: true,
  showOnHomepage: false,
  linkColor: '#0073e6',
  currentPageColor: '#333333',
  separatorColor: '#999999',
  hoverColor: '#005bb5',
  fontSize: { desktop: 14, tablet: 13, mobile: 12 },
  fontWeight: 400,
  textTransform: 'none',
  itemSpacing: 8,
  marginTop: 0,
  marginBottom: 16,
  maxLength: 30,
  showIcons: false,
  mobileHidden: false
};

export const BreadcrumbsPanel: React.FC<BreadcrumbsPanelProps> = ({
  settings: propSettings,
  onChange
}) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const settings = { ...defaultSettings, ...propSettings };

  const handleChange = <K extends keyof BreadcrumbsSettings>(
    field: K,
    value: BreadcrumbsSettings[K]
  ) => {
    onChange({
      ...settings,
      [field]: value
    });
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Breadcrumbs Settings</h3>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="breadcrumbs-enabled" className="text-base font-medium">
              Enable Breadcrumbs
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Show navigation breadcrumbs on pages
            </p>
          </div>
          <Switch
            id="breadcrumbs-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>

        {/* Preview */}
        {settings.enabled && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">Preview</p>
            <div
              className="breadcrumb-preview"
              style={{
                fontSize: `${settings.fontSize[device]}px`,
                fontWeight: settings.fontWeight,
                textTransform: settings.textTransform,
                display: 'flex',
                alignItems: 'center',
                gap: `${settings.itemSpacing}px`
              }}
            >
              <span style={{ color: settings.linkColor }}>{settings.homeText}</span>
              <span style={{ color: settings.separatorColor }}>{settings.separator}</span>
              <span style={{ color: settings.linkColor }}>Category</span>
              <span style={{ color: settings.separatorColor }}>{settings.separator}</span>
              {settings.showCurrentPage && (
                <span style={{ color: settings.currentPageColor }}>Current Page</span>
              )}
            </div>
          </div>
        )}

        {settings.enabled && (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Navigation size={16} />
                General
              </TabsTrigger>
              <TabsTrigger value="styling" className="flex items-center gap-2">
                <Palette size={16} />
                Styling
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings size={16} />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-6">
              <BreadcrumbGeneralSettings settings={settings} onChange={onChange} />
            </TabsContent>

            <TabsContent value="styling" className="space-y-6 mt-6">
              <BreadcrumbStylingSettings
                settings={settings}
                onChange={onChange}
                device={device}
                setDevice={setDevice}
              />
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-6">
              <BreadcrumbAdvancedSettings settings={settings} onChange={onChange} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
        <strong>Note:</strong> Breadcrumbs will automatically generate based on your page structure.
        They provide SEO benefits and improve user navigation.
      </div>
    </div>
  );
};

export default BreadcrumbsPanel;
