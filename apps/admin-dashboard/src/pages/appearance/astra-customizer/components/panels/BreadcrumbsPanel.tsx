/**
 * Breadcrumbs Panel Component
 * Customizer의 Breadcrumbs 설정 패널
 */

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BreadcrumbsSettings } from '../../types/customizer-types';
import { Navigation, Palette, Type, Settings } from 'lucide-react';

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

  const handleResponsiveChange = (field: 'fontSize', value: number) => {
    onChange({
      ...settings,
      [field]: {
        ...settings[field],
        [device]: value
      }
    });
  };

  const renderColorInput = (
    label: string,
    value: string,
    field: keyof BreadcrumbsSettings
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-16 h-10 p-1 cursor-pointer"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
    </div>
  );

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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Navigation size={16} />
                General
              </TabsTrigger>
              <TabsTrigger value="colors" className="flex items-center gap-2">
                <Palette size={16} />
                Colors
              </TabsTrigger>
              <TabsTrigger value="typography" className="flex items-center gap-2">
                <Type size={16} />
                Typography
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings size={16} />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-6">
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

              {/* Options */}
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
            </TabsContent>

            <TabsContent value="colors" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                {renderColorInput('Link Color', settings.linkColor, 'linkColor')}
                {renderColorInput('Current Page Color', settings.currentPageColor, 'currentPageColor')}
                {renderColorInput('Separator Color', settings.separatorColor, 'separatorColor')}
                {renderColorInput('Hover Color', settings.hoverColor, 'hoverColor')}
              </div>
            </TabsContent>

            <TabsContent value="typography" className="space-y-6 mt-6">
              {/* Device Switcher */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded">
                {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    className={`flex-1 px-3 py-1 text-sm rounded transition-colors ${
                      device === d ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                    }`}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Font Size ({device})</Label>
                  <Input
                    type="number"
                    min="10"
                    max="24"
                    value={settings.fontSize[device]}
                    onChange={(e) => handleResponsiveChange('fontSize', parseInt(e.target.value) || 14)}
                  />
                </div>

                <div>
                  <Label>Font Weight</Label>
                  <Select
                    value={settings.fontWeight.toString()}
                    onValueChange={(value) => handleChange('fontWeight', parseInt(value) as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Light (300)</SelectItem>
                      <SelectItem value="400">Normal (400)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="600">Semi Bold (600)</SelectItem>
                      <SelectItem value="700">Bold (700)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Text Transform</Label>
                  <Select
                    value={settings.textTransform}
                    onValueChange={(value) => handleChange('textTransform', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="uppercase">UPPERCASE</SelectItem>
                      <SelectItem value="lowercase">lowercase</SelectItem>
                      <SelectItem value="capitalize">Capitalize</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <Label>
                    Item Spacing
                    <span className="ml-2 text-sm text-gray-500">
                      {settings.itemSpacing}px
                    </span>
                  </Label>
                  <Slider
                    value={[settings.itemSpacing]}
                    onValueChange={([value]) => handleChange('itemSpacing', value)}
                    min={4}
                    max={20}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>
                    Margin Top
                    <span className="ml-2 text-sm text-gray-500">
                      {settings.marginTop}px
                    </span>
                  </Label>
                  <Slider
                    value={[settings.marginTop]}
                    onValueChange={([value]) => handleChange('marginTop', value)}
                    min={0}
                    max={40}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>
                    Margin Bottom
                    <span className="ml-2 text-sm text-gray-500">
                      {settings.marginBottom}px
                    </span>
                  </Label>
                  <Slider
                    value={[settings.marginBottom]}
                    onValueChange={([value]) => handleChange('marginBottom', value)}
                    min={0}
                    max={40}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Max Characters per Item</Label>
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={settings.maxLength}
                    onChange={(e) => handleChange('maxLength', parseInt(e.target.value) || 30)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Long breadcrumb items will be truncated
                  </p>
                </div>
              </div>
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